const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const AdmZip = require('adm-zip');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');
const { generateThumbnail } = require('./thumbnail');

// -----------------------------------------------------------------------------
// Configuration & Environment
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const SESSION_SECRET = process.env.SESSION_SECRET || 'anti-3d-model-secret-key-default';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';

// Ensure data directory structure exists
fs.mkdirSync(path.join(DATA_DIR, 'models'), { recursive: true });

// -----------------------------------------------------------------------------
// SQLite Database Setup
// -----------------------------------------------------------------------------
const db = new DatabaseSync(path.join(DATA_DIR, 'database.sqlite'));
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    user_id TEXT,
    thumbnail_file TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS model_files (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size INTEGER NOT NULL,
    file_ext TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE
  );
`);

// -----------------------------------------------------------------------------
// Auth Utilities (crypto scrypt)
// -----------------------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

// Seed initial admin if no users exist
const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
const { count: totalUsers } = userCountStmt.get();
if (totalUsers === 0) {
  console.log(`[Auth] No users found. Seeding initial admin user: "${ADMIN_USER}"`);
  const adminId = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
    adminId,
    ADMIN_USER,
    hashPassword(ADMIN_PASSWORD),
    'admin'
  );
}

// -----------------------------------------------------------------------------
// Express App & Middleware
// -----------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(cookieParser(SESSION_SECRET));
app.use(express.static(path.join(__dirname, 'public')));

// Upload configuration (memory storage so we can handle zips or multi-files seamlessly)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 250 * 1024 * 1024 } // 250MB max file size
});

// Auth middleware: inspects session cookie
app.use((req, res, next) => {
  const sessionId = req.signedCookies.sid;
  if (!sessionId) {
    req.user = null;
    return next();
  }

  const sessionStmt = db.prepare(`
    SELECT s.id as session_id, s.expires_at, u.id, u.username, u.role
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `);
  const session = sessionStmt.get(sessionId);

  if (!session || session.expires_at < Date.now()) {
    if (session) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    }
    res.clearCookie('sid');
    req.user = null;
    return next();
  }

  req.user = { id: session.id, username: session.username, role: session.role };
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// -----------------------------------------------------------------------------
// Authentication Endpoints
// -----------------------------------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000; // 14 days
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt);

  res.cookie('sid', sessionId, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 14 * 24 * 60 * 60 * 1000
  });

  res.json({
    user: { id: user.id, username: user.username, role: user.role }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.signedCookies.sid;
  if (sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  }
  res.clearCookie('sid');
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ user: null });
  }
  res.json({ user: req.user });
});

// -----------------------------------------------------------------------------
// User Management Endpoints (Admin Only)
// -----------------------------------------------------------------------------
app.get('/api/users', requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at ASC').all();
  res.json(users);
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const assignedRole = role === 'admin' ? 'admin' : 'user';

  try {
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)').run(
      id,
      username.trim(),
      hashPassword(password),
      assignedRole
    );
    res.status(201).json({ id, username: username.trim(), role: assignedRole });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.delete('/api/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// -----------------------------------------------------------------------------
// Model Management Endpoints
// -----------------------------------------------------------------------------

// List models with optional search
app.get('/api/models', requireAuth, (req, res) => {
  const q = req.query.q ? `%${req.query.q.trim()}%` : null;
  let models;
  if (q) {
    models = db.prepare(`
      SELECT m.*, u.username as author,
        (SELECT COUNT(*) FROM model_files mf WHERE mf.model_id = m.id) as file_count
      FROM models m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.title LIKE ? OR m.description LIKE ? OR m.tags LIKE ?
      ORDER BY m.created_at DESC
    `).all(q, q, q);
  } else {
    models = db.prepare(`
      SELECT m.*, u.username as author,
        (SELECT COUNT(*) FROM model_files mf WHERE mf.model_id = m.id) as file_count
      FROM models m
      LEFT JOIN users u ON m.user_id = u.id
      ORDER BY m.created_at DESC
    `).all();
  }
  res.json(models);
});

// Get single model with its files
app.get('/api/models/:id', requireAuth, (req, res) => {
  const model = db.prepare(`
    SELECT m.*, u.username as author
    FROM models m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).get(req.params.id);

  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const files = db.prepare(`
    SELECT * FROM model_files WHERE model_id = ? ORDER BY original_name ASC
  `).all(model.id);

  res.json({ ...model, files });
});

// Create model with files or zip
app.post('/api/models', requireAuth, upload.array('files'), async (req, res) => {
  try {
    const { title, description, tags } = req.body;
    if (!title || !req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Title and at least one .stl/.obj or .zip file are required' });
    }

    const modelId = crypto.randomUUID();
    const modelDir = path.join(DATA_DIR, 'models', modelId);
    const filesDir = path.join(modelDir, 'files');
    fs.mkdirSync(filesDir, { recursive: true });

    const extractedFiles = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase().slice(1);
      if (ext === 'zip') {
        const zip = new AdmZip(file.buffer);
        const zipEntries = zip.getEntries();
        for (const entry of zipEntries) {
          if (entry.isDirectory) continue;
          // Skip macOS metadata and dotfiles
          if (entry.entryName.includes('__MACOSX') || path.basename(entry.entryName).startsWith('.')) continue;

          const entryExt = path.extname(entry.entryName).toLowerCase().slice(1);
          if (entryExt === 'stl' || entryExt === 'obj') {
            const safeName = path.basename(entry.entryName);
            const targetPath = path.join(filesDir, safeName);
            fs.writeFileSync(targetPath, entry.getData());
            extractedFiles.push({
              filename: safeName,
              original_name: safeName,
              size: entry.header.size,
              file_ext: entryExt,
              fullPath: targetPath
            });
          }
        }
      } else if (ext === 'stl' || ext === 'obj') {
        const safeName = path.basename(file.originalname);
        const targetPath = path.join(filesDir, safeName);
        fs.writeFileSync(targetPath, file.buffer);
        extractedFiles.push({
          filename: safeName,
          original_name: file.originalname,
          size: file.size,
          file_ext: ext,
          fullPath: targetPath
        });
      }
    }

    if (extractedFiles.length === 0) {
      fs.rmSync(modelDir, { recursive: true, force: true });
      return res.status(400).json({ error: 'No valid .stl or .obj files found in upload' });
    }

    // Insert model
    db.prepare(`
      INSERT INTO models (id, title, description, tags, user_id, thumbnail_file)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      modelId,
      title.trim(),
      description ? description.trim() : '',
      tags ? tags.trim() : '',
      req.user.id,
      'thumbnail.png'
    );

    // Insert files
    const insertFileStmt = db.prepare(`
      INSERT INTO model_files (id, model_id, filename, original_name, size, file_ext)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const f of extractedFiles) {
      insertFileStmt.run(crypto.randomUUID(), modelId, f.filename, f.original_name, f.size, f.file_ext);
    }

    // Generate static 3D thumbnail using first valid STL/OBJ
    const first3DFile = extractedFiles[0];
    const thumbPath = path.join(modelDir, 'thumbnail.png');
    await generateThumbnail(first3DFile.fullPath, thumbPath);

    res.status(201).json({ id: modelId, message: 'Model created successfully' });
  } catch (err) {
    console.error('Error creating model:', err);
    res.status(500).json({ error: 'Failed to create model: ' + err.message });
  }
});

// Edit model metadata
app.put('/api/models/:id', requireAuth, (req, res) => {
  const { title, description, tags } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  // Only author or admin can update
  if (req.user.role !== 'admin' && model.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  db.prepare(`
    UPDATE models
    SET title = ?, description = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title.trim(), description ? description.trim() : '', tags ? tags.trim() : '', model.id);

  res.json({ ok: true });
});

// Delete entire model
app.delete('/api/models/:id', requireAuth, (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  if (req.user.role !== 'admin' && model.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  db.prepare('DELETE FROM models WHERE id = ?').run(model.id);

  // Remove directory
  const modelDir = path.join(DATA_DIR, 'models', model.id);
  fs.rmSync(modelDir, { recursive: true, force: true });

  res.json({ ok: true });
});

// Delete individual file
app.delete('/api/models/:id/files/:fileId', requireAuth, async (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  if (req.user.role !== 'admin' && model.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const file = db.prepare('SELECT * FROM model_files WHERE id = ? AND model_id = ?').get(req.params.fileId, model.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  db.prepare('DELETE FROM model_files WHERE id = ?').run(file.id);

  const filePath = path.join(DATA_DIR, 'models', model.id, 'files', file.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Check remaining files; if none left, could delete model or re-render thumbnail from remaining file
  const remainingFiles = db.prepare('SELECT * FROM model_files WHERE model_id = ?').all(model.id);
  if (remainingFiles.length > 0) {
    const nextFile = path.join(DATA_DIR, 'models', model.id, 'files', remainingFiles[0].filename);
    const thumbPath = path.join(DATA_DIR, 'models', model.id, 'thumbnail.png');
    await generateThumbnail(nextFile, thumbPath);
  }

  res.json({ ok: true, remainingCount: remainingFiles.length });
});

// Download individual file
app.get('/api/models/:id/files/:fileId/download', requireAuth, (req, res) => {
  const file = db.prepare('SELECT * FROM model_files WHERE id = ? AND model_id = ?').get(req.params.fileId, req.params.id);
  if (!file) {
    return res.status(404).send('File not found');
  }

  const filePath = path.join(DATA_DIR, 'models', req.params.id, 'files', file.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File missing on disk');
  }

  res.download(filePath, file.original_name);
});

// Download all files as a single zip archive
app.get('/api/models/:id/download-all', requireAuth, (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!model) {
    return res.status(404).send('Model not found');
  }

  const files = db.prepare('SELECT * FROM model_files WHERE model_id = ?').all(model.id);
  if (files.length === 0) {
    return res.status(404).send('No files in model');
  }

  const zip = new AdmZip();
  for (const f of files) {
    const filePath = path.join(DATA_DIR, 'models', model.id, 'files', f.filename);
    if (fs.existsSync(filePath)) {
      zip.addLocalFile(filePath, '', f.original_name);
    }
  }

  const zipBuffer = zip.toBuffer();
  const safeTitle = model.title.replace(/[^a-zA-Z0-9_-]/g, '_');
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${safeTitle}.zip"`
  });
  res.send(zipBuffer);
});

// Serve static thumbnail image
app.get('/api/models/:id/thumbnail', (req, res) => {
  const thumbPath = path.join(DATA_DIR, 'models', req.params.id, 'thumbnail.png');
  if (fs.existsSync(thumbPath)) {
    return res.sendFile(thumbPath);
  }
  // Return a transparent 1x1 pixel or fallback
  res.status(404).send('Thumbnail not found');
});

// -----------------------------------------------------------------------------
// Start Server
// -----------------------------------------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`3D Model Management Dashboard running at:`);
  console.log(`- Local:   http://localhost:${PORT}`);
  console.log(`- Data:    ${DATA_DIR}`);
  console.log(`=======================================================`);
});
