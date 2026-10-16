import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import AdmZip from 'adm-zip';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import util from 'util';
import fs from 'fs';
import path from 'path';
import * as thumbnailModule from './thumbnail';
import * as passwordModule from './utils/password';
const { generateThumbnail, closeBrowser } = thumbnailModule;
const { hashPassword, verifyPassword } = passwordModule;

const scryptAsync = util.promisify(crypto.scrypt);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// =============================================================================
// Thumbnail Job Queue (Decoupled Asynchronous Background Processing)
// =============================================================================
const thumbnailQueue: Array<{
  modelId: string;
  inputFilePath: string;
  outputImagePath: string;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];
const activeThumbnailJobs = new Map<string, Promise<unknown>>();
let isProcessingThumbnail = false;

function queueThumbnailGeneration(
  modelId: string,
  inputFilePath: string,
  outputImagePath: string
): Promise<unknown> {
  // Use definite assignment operator to satisfy TypeScript
  let resolveJob!: (value: unknown) => void;
  let rejectJob!: (reason?: unknown) => void;
  const jobPromise = new Promise((resolve, reject) => {
    resolveJob = resolve;
    rejectJob = reject;
  });
  activeThumbnailJobs.set(modelId, jobPromise);
  thumbnailQueue.push({
    modelId,
    inputFilePath,
    outputImagePath,
    resolve: resolveJob,
    reject: rejectJob,
  });
  processThumbnailQueue();
  return jobPromise;
}

async function processThumbnailQueue() {
  if (isProcessingThumbnail || thumbnailQueue.length === 0) return;
  isProcessingThumbnail = true;
  while (thumbnailQueue.length > 0) {
    const job = thumbnailQueue.shift()!;
    try {
      console.log(`[Thumbnail Worker] Rendering 3D preview for model: ${job.modelId}`);
      await generateThumbnail(job.inputFilePath, job.outputImagePath);
      job.resolve(true);
    } catch (err) {
      console.error(`[Thumbnail Worker] Error rendering model: ${job.modelId}`, err);
      job.reject(err);
    }
  }
  isProcessingThumbnail = false;
}

// -----------------------------------------------------------------------------
// Configuration & Environment
// -----------------------------------------------------------------------------
// Load environment variables using dotenv if available
import * as dotenv from 'dotenv';
dotenv.config();
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const key = k.trim();
      if (!process.env[key]) {
        process.env[key] = v.join('=').trim();
      }
    }
  }
}

const PORT = process.env.PORT || 3005;
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
// Generate random SESSION_SECRET if not provided in environment (security best practice)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';

// Ensure data directory structure exists
fs.mkdirSync(path.join(DATA_DIR, 'models'), { recursive: true });

// -----------------------------------------------------------------------------
// SQLite Database Setup
// -----------------------------------------------------------------------------
const db = new Database(path.join(DATA_DIR, 'database.sqlite'));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    password_changed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    thumbnail_path TEXT,
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

  CREATE INDEX IF NOT EXISTS idx_model_files_model_id ON model_files(model_id);
  CREATE INDEX IF NOT EXISTS idx_models_created_at ON models(created_at);
  CREATE INDEX IF NOT EXISTS idx_models_user_id ON models(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`);

// Auto-seed initial admin user if table empty
const adminCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
if (adminCount === 0) {
  const adminId = crypto.randomUUID();
  const saltBuf = crypto.randomBytes(16);
  const hashBuf = crypto.scryptSync(ADMIN_PASSWORD, saltBuf, 64, {
    N: 1024 * 1024,
    r: 1,
    p: 1,
  });
  const adminHash = Buffer.concat([saltBuf, hashBuf]).toString('hex');
  db.prepare(
    'INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)'
  ).run(adminId, ADMIN_USER, adminHash, 'admin');
  console.log('[Admin] Initial admin account seeded. Username:', ADMIN_USER);
}

// Migration: add password_changed_at if it doesn't exist yet
try {
  db.exec(`ALTER TABLE users ADD COLUMN password_changed_at DATETIME`);
} catch (err) {
  // Column already exists – ignore the error
}

// -----------------------------------------------------------------------------
// Middleware and Helpers
// -----------------------------------------------------------------------------
const app = express();
app.set('json spaces', 2);
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser(SESSION_SECRET));
app.use(express.static(path.join(process.cwd(), 'public')));

// -----------------------------------------------------------------------------
// Rate Limiting Middleware
// -----------------------------------------------------------------------------
const rateLimitStore = new Map<string, { windowStart: number; count: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
const RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per window

function createRateLimiter() {
  return function rateLimit(req: any, res: any, next: any) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const entry = rateLimitStore.get(ip) || { windowStart: now, count: 0 };
    if (now > entry.windowStart + RATE_LIMIT_WINDOW_MS) {
      entry.windowStart = now;
      entry.count = 0;
    }
    entry.count += 1;
    rateLimitStore.set(ip, entry);
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }
    next();
  };
}
app.use(createRateLimiter());

// -----------------------------------------------------------------------------
// Example API route (you would replace this with your actual route modules)
// -----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -----------------------------------------------------------------------------
// Start the server
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});

// Graceful shutdown of the thumbnail worker when process exits
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await closeBrowser();
  process.exit(0);
});
