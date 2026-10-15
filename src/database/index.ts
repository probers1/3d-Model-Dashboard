/**
 * SQLite database layer with prepared statements and WAL mode.
 * 
 * Yanii Principles:
 * - Prepared statements (SQL injection prevention)
 * - WAL mode for concurrency
 * - Foreign key constraints
 * - Type-safe queries via parameterized access
 */

import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import type { Model, ModelFile, User, Session } from '../types/index.js';

export interface Database {
  prepare<T>(sql: string): PreparedStatement<T>;
  exec(sql: string): void;
}

export interface PreparedStatement<T> {
  get(args: unknown[]): T | null;
  all(args: unknown[]): T[];
  run(args: unknown[]): RunResult;
}

interface RunResult {
  lastInsertRowid?: number;
  changes: number;
}

// -----------------------------------------------------------------------------
// Database Initialization
// -----------------------------------------------------------------------------

/**
 * Creates and initializes the SQLite database with schema.
 */
export function createDatabase(dbPath: string): Database {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');

  // Create tables with proper constraints
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

  // Index for session lookup
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);');

  return db;
}