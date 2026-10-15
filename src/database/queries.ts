/**
 * Prepared statement wrappers for type-safe database access.
 */

import type { Database } from './index.js';
import type { User, Model, ModelFile, Session } from '../types/index.js';

function createPrepared<T>(db: Database, sql: string): PreparedStatement<T> {
  const prepared = db.prepare(sql);
  
  return {
    get(args) {
      const rows = prepared.all(args);
      return rows.length > 0 ? rows[0] as T : null;
    },
    all(args) {
      return prepared.all(args) as T[];
    },
    run(args) {
      prepared.run(args);
      return { changes: prepared.changes };
    },
  };
}

// -----------------------------------------------------------------------------
// User Queries
// -----------------------------------------------------------------------------

export const userQueries = {
  getByUsername: (db: Database) => createPrepared<User>(
    db,
    `SELECT id, username, role, created_at FROM users WHERE username = ?`
  ),
  getById: (db: Database) => createPrepared<User>(
    db,
    `SELECT id, username, role, created_at FROM users WHERE id = ?`
  ),
  getAll: (db: Database) => createPrepared<User[]>(
    db,
    `SELECT id, username, role, created_at FROM users ORDER BY created_at DESC`
  ),
  getByRole: (db: Database) => createPrepared<User[]>(
    db,
    `SELECT id, username, role, created_at FROM users WHERE role = ?`
  ),
  insert: (db: Database) => createPrepared<{ lastInsertRowid: number }>(
    db,
    `INSERT INTO users (id, username, role, created_at) VALUES (?, ?, ?, ?)`
  ),
};

// -----------------------------------------------------------------------------
// Model Queries
// -----------------------------------------------------------------------------

export const modelQueries = {
  getById: (db: Database) => createPrepared<Model>(
    db,
    `SELECT id, title, description, tags, thumbnail_path, created_at FROM models WHERE id = ?`
  ),
  getAll: (db: Database) => createPrepared<Model[]>(
    db,
    `SELECT id, title, description, tags, thumbnail_path, created_at FROM models ORDER BY created_at DESC`
  ),
  getByUserId: (db: Database) => createPrepared<Model[]>(
    db,
    `SELECT id, title, description, tags, thumbnail_path, created_at FROM models WHERE created_by = ? ORDER BY created_at DESC`
  ),
  insert: (db: Database) => createPrepared<{ lastInsertRowid: number }>(
    db,
    `INSERT INTO models (id, title, description, tags, thumbnail_path, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ),
  update: (db: Database) => createPrepared<{ changes: number }>(
    db,
    `UPDATE models SET title = ?, description = ?, tags = ?, updated_at = strftime('%s', 'now') WHERE id = ?`
  ),
  delete: (db: Database) => createPrepared<{ changes: number }>(
    db,
    `DELETE FROM models WHERE id = ?`
  ),
};

// -----------------------------------------------------------------------------
// Model File Queries
// -----------------------------------------------------------------------------

export const modelFileQueries = {
  getById: (db: Database) => createPrepared<ModelFile>(
    db,
    `SELECT * FROM model_files WHERE id = ? AND model_id = ?`
  ),
  getByModelId: (db: Database) => createPrepared<ModelFile[]>(
    db,
    `SELECT * FROM model_files WHERE model_id = ? ORDER BY created_at DESC`
  ),
  insert: (db: Database) => createPrepared<{ lastInsertRowid: number }>(
    db,
    `INSERT INTO model_files (id, model_id, filename, original_name, mime_type, file_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ),
};

// -----------------------------------------------------------------------------
// Session Queries
// -----------------------------------------------------------------------------

export const sessionQueries = {
  getByUserId: (db: Database) => createPrepared<Session[]>(
    db,
    `SELECT * FROM sessions WHERE user_id = ? AND expires_at > strftime('%s', 'now') ORDER BY expires_at ASC`
  ),
  validate: (db: Database) => createPrepared<{ valid: boolean }>(
    db,
    `SELECT CASE WHEN id = ? AND expires_at > strftime('%s', 'now') THEN 1 ELSE 0 END FROM sessions WHERE id = ?`
  ),
  invalidate: (db: Database) => createPrepared<{ changes: number }>(
    db,
    `DELETE FROM sessions WHERE id = ? OR user_id = ?`
  ),
  cleanupExpired: (db: Database) => createPrepared<{ changes: number }>(
    db,
    `DELETE FROM sessions WHERE expires_at <= strftime('%s', 'now')`
  ),
};