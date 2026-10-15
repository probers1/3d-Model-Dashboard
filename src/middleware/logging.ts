/**
 * Request logging middleware.
 */

import type { Request, Response, NextFunction } from 'express';

interface LogEntry {
  timestamp: number;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userAgent?: string;
}

let logBuffer: LogEntry[] = [];
const MAX_LOG_ENTRIES = 1000;

export function loggingMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  
  req.logStart = start;

  // Capture user agent for logging
  req.userAgent = req.headers['user-agent'] || 'unknown';

  next();
}

export function logEntryMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const entry: LogEntry = {
    timestamp: Date.now(),
    method: req.method,
    path: req.path,
    status: res.statusCode,
    durationMs: Date.now() - (req as any).logStart,
    userAgent: (req as any).userAgent,
  };

  logBuffer.push(entry);

  // Keep only last N entries in memory
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }

  next();
}