"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const crypto_1 = __importDefault(require("crypto"));
const util_1 = __importDefault(require("util"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const thumbnailModule = __importStar(require("./thumbnail"));
const passwordModule = __importStar(require("./utils/password"));
const { generateThumbnail, closeBrowser } = thumbnailModule;
const { hashPassword, verifyPassword } = passwordModule;
const scryptAsync = util_1.default.promisify(crypto_1.default.scrypt);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// =============================================================================
// Thumbnail Job Queue (Decoupled Asynchronous Background Processing)
// =============================================================================
const thumbnailQueue = [];
const activeThumbnailJobs = new Map();
let isProcessingThumbnail = false;
function queueThumbnailGeneration(modelId, inputFilePath, outputImagePath) {
    let resolveJob;
    let rejectJob;
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
    if (isProcessingThumbnail || thumbnailQueue.length === 0)
        return;
    isProcessingThumbnail = true;
    while (thumbnailQueue.length > 0) {
        const job = thumbnailQueue.shift();
        try {
            console.log(`[Thumbnail Worker] Rendering 3D preview for model: ${job.modelId}`);
            await generateThumbnail(job.inputFilePath, job.outputImagePath);
            job.resolve(true);
        }
        catch (err) {
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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const envPath = path_1.default.join(process.cwd(), '.env');
if (fs_1.default.existsSync(envPath)) {
    const envContent = fs_1.default.readFileSync(envPath, 'utf8');
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
const DATA_DIR = path_1.default.resolve(process.env.DATA_DIR || './data');
// Generate random SESSION_SECRET if not provided in environment (security best practice)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto_1.default.randomBytes(32).toString('hex');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';
// Ensure data directory structure exists
fs_1.default.mkdirSync(path_1.default.join(DATA_DIR, 'models'), { recursive: true });
// -----------------------------------------------------------------------------
// SQLite Database Setup
// -----------------------------------------------------------------------------
const db = new better_sqlite3_1.default(path_1.default.join(DATA_DIR, 'database.sqlite'));
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
    const adminId = crypto_1.default.randomUUID();
    const saltBuf = crypto_1.default.randomBytes(16);
    const hashBuf = crypto_1.default.scryptSync(ADMIN_PASSWORD, saltBuf, 64, {
        n: 1024 * 1024,
        r: 1,
        p: 1,
    });
    const adminHash = Buffer.concat([saltBuf, hashBuf]).toString('hex');
    db.prepare('INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)').run(adminId, ADMIN_USER, adminHash, 'admin');
    console.log('[Admin] Initial admin account seeded. Username:', ADMIN_USER);
}
// Migration: add password_changed_at if it doesn't exist yet
try {
    db.exec(`ALTER TABLE users ADD COLUMN password_changed_at DATETIME`);
}
catch (err) {
    // Column already exists – ignore the error
}
// -----------------------------------------------------------------------------
// Middleware and Helpers
// -----------------------------------------------------------------------------
const app = (0, express_1.default)();
app.set('json spaces', 2);
app.set('trust proxy', 1);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)(SESSION_SECRET));
app.use(express_1.default.static(path_1.default.join(process.cwd(), 'public')));
// -----------------------------------------------------------------------------
// Rate Limiting Middleware
// -----------------------------------------------------------------------------
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
const RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per window
function createRateLimiter() {
    return function rateLimit(req, res, next) {
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
