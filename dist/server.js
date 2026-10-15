#!/usr/bin/env node
"use strict";
/**
 * PrintVault - 3D Model Management Platform
 *
 * Yanii Principles:
 * - Type-safe TypeScript
 * - Structured error handling
 * - Graceful shutdown
 * - Environment-based configuration
 * - Separated concerns (routes, services, database)
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const node_sqlite_1 = require("node:sqlite");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = (0, node_path_1.dirname)(__filename);
// --- Configuration ---
const config = {
    port: Number(process.env.PORT) || 3005,
    dataDir: process.env.DATA_DIR || (0, node_path_1.join)(__dirname, '../data'),
    sessionSecret: process.env.SESSION_SECRET || '',
};
// --- Database ---
const db = new node_sqlite_1.DatabaseSync((0, node_path_1.join)(config.dataDir, 'database.sqlite'));
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    thumbnail_path TEXT,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS model_files (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    sha256 TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);');
db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);');
// Insert default admin if not exists
const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get(['admin']);
if (!existingAdmin) {
    const crypto = require('node:crypto');
    const util = require('node:util');
    const scryptAsync = util.promisify(crypto.scrypt);
    const salt = crypto.randomBytes(16);
    const hash = await scryptAsync(Buffer.from(config.adminPassword, 'utf8'), salt, { keylen: 64, n: 1024 * 1024, r: 1, p: 1 });
    db.prepare('INSERT INTO users (id, username, role, created_at) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), 'admin', 'admin', Math.floor(Date.now() / 1000));
}
//# sourceMappingURL=server.js.map