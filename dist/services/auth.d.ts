/**
 * Authentication service handling sessions and user validation.
 */
import type { User, Session } from '../types/index.js';
import type { Database } from '../database/index.js';
import type { Result } from '../types/index.js';
/**
 * Generates a secure random session ID.
 */
declare function generateSessionId(): string;
/**
 * Creates a new session for a user.
 */
export declare function createSession(db: Database, userId: string, sessionId: string): void;
/**
 * Validates a session by its ID.
 */
export declare function validateSession(db: Database, sessionId: string): Result<Session>;
/**
 * Invalidates a session (logs out user).
 */
export declare function invalidateSession(db: Database, sessionId: string): void;
/**
 * Cleans up expired sessions.
 */
export declare function cleanupExpiredSessions(db: Database): number;
/**
 * Retrieves active sessions for a user.
 */
export declare function getActiveSessions(db: Database, userId: string): Session[];
/**
 * Validates a user's credentials against the database.
 */
export declare function authenticateUser(db: Database, username: string, password: string): Result<User>;
/**
 * Creates a new admin user (for initial setup).
 */
export declare function createAdminUser(db: Database, username: string, password: string): Result<User>;
declare const _default: {
    generateSessionId: typeof generateSessionId;
    createSession: typeof createSession;
    validateSession: typeof validateSession;
    invalidateSession: typeof invalidateSession;
    cleanupExpiredSessions: typeof cleanupExpiredSessions;
    getActiveSessions: typeof getActiveSessions;
    authenticateUser: typeof authenticateUser;
    createAdminUser: typeof createAdminUser;
};
export default _default;
//# sourceMappingURL=auth.d.ts.map