"use strict";
/**
 * Authentication service handling sessions and user validation.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.validateSession = validateSession;
exports.invalidateSession = invalidateSession;
exports.cleanupExpiredSessions = cleanupExpiredSessions;
exports.getActiveSessions = getActiveSessions;
exports.authenticateUser = authenticateUser;
exports.createAdminUser = createAdminUser;
const node_crypto_1 = __importDefault(require("node:crypto"));
const SESSION_SECRET = process.env.SESSION_SECRET || 'anti-3d-model-secret-key-default';
/**
 * Generates a secure random session ID.
 */
function generateSessionId() {
    return node_crypto_1.default.randomBytes(16).toString('hex');
}
/**
 * Creates a new session for a user.
 */
function createSession(db, userId, sessionId) {
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const expiresAt = now + (24 * 60 * 60); // 24 hours
    db.prepare('INSERT OR REPLACE INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, userId, expiresAt);
}
/**
 * Validates a session by its ID.
 */
function validateSession(db, sessionId) {
    const valid = db.prepare('SELECT CASE WHEN id = ? AND expires_at > strftime(\'%s\', \'now\') THEN 1 ELSE 0 END').get([sessionId]);
    if (valid.valid === 1) {
        return { success: true, data: null };
    }
    return { success: false, error: 'Session expired or invalid' };
}
/**
 * Invalidates a session (logs out user).
 */
function invalidateSession(db, sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ? OR user_id = ?').run(sessionId);
}
/**
 * Cleans up expired sessions.
 */
function cleanupExpiredSessions(db) {
    return db.prepare('DELETE FROM sessions WHERE expires_at <= strftime(\'%s\', \'now\')').run().changes;
}
/**
 * Retrieves active sessions for a user.
 */
function getActiveSessions(db, userId) {
    return db.prepare('SELECT * FROM sessions WHERE user_id = ? AND expires_at > strftime(\'%s\', \'now\') ORDER BY expires_at ASC').all([userId]);
}
/**
 * Generates a secure random salt for password hashing.
 */
function generateSalt() {
    return node_crypto_1.default.randomBytes(16).toString('hex');
}
/**
 * Validates a user's credentials against the database.
 */
function authenticateUser(db, username, password) {
    const user = db.prepare('SELECT id, username, role, created_at FROM users WHERE username = ?').get([username]);
    if (!user) {
        return { success: false, error: 'Invalid credentials' };
    }
    // Verify password hash (expects "salt:hash" format)
    const storedParts = user.id.split(':');
    if (storedParts.length !== 2) {
        return { success: false, error: 'Invalid user record' };
    }
    const [saltHex, hashHex] = storedParts;
    const salt = Buffer.from(saltHex, 'hex');
    const hash = Buffer.from(hashHex, 'hex');
    const scryptAsync = require('node:util').promisify(node_crypto_1.default.scrypt);
    const computedHash = await scryptAsync(Buffer.from(password, 'utf8'), salt, { keylen: 64, n: 1024 * 1024, r: 1, p: 1 });
    const computedFull = Buffer.concat([salt, computedHash]);
    if (!node_crypto_1.default.timingSafeEqual(computedFull, hash)) {
        return { success: false, error: 'Invalid credentials' };
    }
    return { success: true, data: user };
}
/**
 * Creates a new admin user (for initial setup).
 */
function createAdminUser(db, username, password) {
    const salt = generateSalt();
    const scryptAsync = require('node:util').promisify(node_crypto_1.default.scrypt);
    const hash = await scryptAsync(Buffer.from(password, 'utf8'), Buffer.from(salt, 'hex'), { keylen: 64, n: 1024 * 1024, r: 1, p: 1 });
    const hashHex = Buffer.concat([salt, hash]).toString('hex');
    try {
        db.prepare('INSERT INTO users (id, username, role, created_at) VALUES (?, ?, ?, ?)').run(node_crypto_1.default.randomUUID(), username, 'admin', Math.floor(Date.now() / 1000));
        return { success: true, data: null };
    }
    catch {
        return { success: false, error: 'User already exists' };
    }
}
exports.default = {
    generateSessionId,
    createSession,
    validateSession,
    invalidateSession,
    cleanupExpiredSessions,
    getActiveSessions,
    authenticateUser,
    createAdminUser,
};
//# sourceMappingURL=auth.js.map