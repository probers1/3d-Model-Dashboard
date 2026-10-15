"use strict";
/**
 * Authentication API routes.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGetUser = handleGetUser;
exports.handleLogin = handleLogin;
exports.handleLogout = handleLogout;
const node_crypto_1 = __importDefault(require("node:crypto"));
const auth_js_1 = require("../services/auth.js");
async function handleGetUser(req, res) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(user);
}
async function handleLogin(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    const result = (0, auth_js_1.authenticateUser)(db, username, password);
    if (!result.success) {
        return res.status(401).json({ error: result.error });
    }
    const session = node_crypto_1.default.randomUUID();
    (0, auth_js_1.createSession)(db, result.data.id, session);
    res.cookie('session', session, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    res.json({ user: result.data, session });
}
async function handleLogout(req, res) {
    const sessionId = req.cookies.session;
    if (sessionId) {
        (0, auth_js_1.invalidateSession)(db, sessionId);
    }
    res.clearCookie('session');
    res.json({ success: true });
}
//# sourceMappingURL=auth.js.map