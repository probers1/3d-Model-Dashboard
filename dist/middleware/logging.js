"use strict";
/**
 * Request logging middleware.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingMiddleware = loggingMiddleware;
exports.logEntryMiddleware = logEntryMiddleware;
let logBuffer = [];
const MAX_LOG_ENTRIES = 1000;
function loggingMiddleware(req, _res, next) {
    const start = Date.now();
    req.logStart = start;
    // Capture user agent for logging
    req.userAgent = req.headers['user-agent'] || 'unknown';
    next();
}
function logEntryMiddleware(_req, res, next) {
    const entry = {
        timestamp: Date.now(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - req.logStart,
        userAgent: req.userAgent,
    };
    logBuffer.push(entry);
    // Keep only last N entries in memory
    if (logBuffer.length > MAX_LOG_ENTRIES) {
        logBuffer.shift();
    }
    next();
}
//# sourceMappingURL=logging.js.map