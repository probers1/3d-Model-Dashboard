/**
 * Rate limiting middleware to prevent DoS attacks.
 */

import type { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export function rateLimit(config?: Partial<RateLimitConfig>): (req: Request, res: Response, next: NextFunction) => void {
  const windowMs = config?.windowMs || 60_000; // 1 minute
  const maxRequests = config?.maxRequests || 100;

  const store: Map<string, { count: number; resetAt: number }> = new Map();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `ratelimit:${ip}`;

    const record = store.get(key);

    if (!record || record.resetAt <= now) {
      store.set(key, { count: 0, resetAt: now + windowMs });
    }

    const limitRecord = store.get(key)!;
    limitRecord.count += 1;

    if (limitRecord.count > maxRequests) {
      res.setHeader('Retry-After', Math.ceil((limitRecord.resetAt - now) / 1000).toString());
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    next();
  };
}