"use strict";
/**
 * Authentication and authorization middleware.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
function requireAuth(ctx, req, res, next) {
    if (!ctx.authenticated || !ctx.user) {
        return res.status(401).json({ error: 'Unauthorized. Please authenticate.' });
    }
    // Attach user to request for downstream use
    req.user = ctx.user;
    next();
}
function requireAdmin(ctx, req, res, next) {
    if (!ctx.authenticated || !ctx.user) {
        return res.status(401).json({ error: 'Unauthorized. Please authenticate.' });
    }
    if (ctx.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
    next();
}
//# sourceMappingURL=auth.js.map