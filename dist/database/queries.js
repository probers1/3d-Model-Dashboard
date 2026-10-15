"use strict";
/**
 * Prepared statement wrappers for type-safe database access.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionQueries = exports.modelFileQueries = exports.modelQueries = exports.userQueries = void 0;
function createPrepared(db, sql) {
    const prepared = db.prepare(sql);
    return {
        get(args) {
            const rows = prepared.all(args);
            return rows.length > 0 ? rows[0] : null;
        },
        all(args) {
            return prepared.all(args);
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
exports.userQueries = {
    getByUsername: (db) => createPrepared(db, `SELECT id, username, role, created_at FROM users WHERE username = ?`),
    getById: (db) => createPrepared(db, `SELECT id, username, role, created_at FROM users WHERE id = ?`),
    getAll: (db) => createPrepared(db, `SELECT id, username, role, created_at FROM users ORDER BY created_at DESC`),
    getByRole: (db) => createPrepared(db, `SELECT id, username, role, created_at FROM users WHERE role = ?`),
    insert: (db) => createPrepared(db, `INSERT INTO users (id, username, role, created_at) VALUES (?, ?, ?, ?)`),
};
// -----------------------------------------------------------------------------
// Model Queries
// -----------------------------------------------------------------------------
exports.modelQueries = {
    getById: (db) => createPrepared(db, `SELECT id, title, description, tags, thumbnail_path, created_at FROM models WHERE id = ?`),
    getAll: (db) => createPrepared(db, `SELECT id, title, description, tags, thumbnail_path, created_at FROM models ORDER BY created_at DESC`),
    getByUserId: (db) => createPrepared(db, `SELECT id, title, description, tags, thumbnail_path, created_at FROM models WHERE created_by = ? ORDER BY created_at DESC`),
    insert: (db) => createPrepared(db, `INSERT INTO models (id, title, description, tags, thumbnail_path, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    update: (db) => createPrepared(db, `UPDATE models SET title = ?, description = ?, tags = ?, updated_at = strftime('%s', 'now') WHERE id = ?`),
    delete: (db) => createPrepared(db, `DELETE FROM models WHERE id = ?`),
};
// -----------------------------------------------------------------------------
// Model File Queries
// -----------------------------------------------------------------------------
exports.modelFileQueries = {
    getById: (db) => createPrepared(db, `SELECT * FROM model_files WHERE id = ? AND model_id = ?`),
    getByModelId: (db) => createPrepared(db, `SELECT * FROM model_files WHERE model_id = ? ORDER BY created_at DESC`),
    insert: (db) => createPrepared(db, `INSERT INTO model_files (id, model_id, filename, original_name, mime_type, file_size, sha256, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
};
// -----------------------------------------------------------------------------
// Session Queries
// -----------------------------------------------------------------------------
exports.sessionQueries = {
    getByUserId: (db) => createPrepared(db, `SELECT * FROM sessions WHERE user_id = ? AND expires_at > strftime('%s', 'now') ORDER BY expires_at ASC`),
    validate: (db) => createPrepared(db, `SELECT CASE WHEN id = ? AND expires_at > strftime('%s', 'now') THEN 1 ELSE 0 END FROM sessions WHERE id = ?`),
    invalidate: (db) => createPrepared(db, `DELETE FROM sessions WHERE id = ? OR user_id = ?`),
    cleanupExpired: (db) => createPrepared(db, `DELETE FROM sessions WHERE expires_at <= strftime('%s', 'now')`),
};
//# sourceMappingURL=queries.js.map