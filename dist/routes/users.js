"use strict";
/**
 * User management API routes (admin only).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGetUsers = handleGetUsers;
exports.handleCreateUser = handleCreateUser;
exports.handleDeleteUser = handleDeleteUser;
const queries_js_1 = require("../database/queries.js");
const auth_js_1 = require("../services/auth.js");
async function handleGetUsers(req, res) {
    const user = req.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    const users = queries_js_1.userQueries.getAll(db);
    res.json(users);
}
async function handleCreateUser(req, res) {
    const user = req.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    const { username, password, role } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    const result = (0, auth_js_1.createAdminUser)(db, username, password);
    if (!result.success) {
        return res.status(409).json({ error: result.error });
    }
    res.status(201).json({ success: true });
}
async function handleDeleteUser(req, res) {
    const user = req.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    const targetUser = queries_js_1.userQueries.getById(db, req.params.id);
    if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
    }
    // Cannot delete yourself
    if (targetUser.id === user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    queries_js_1.userQueries.delete(db, req.params.id);
    res.json({ success: true });
}
//# sourceMappingURL=users.js.map