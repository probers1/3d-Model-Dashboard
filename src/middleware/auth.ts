/**
 * Authentication and authorization middleware.
 */

import type { Request, Response, NextFunction } from 'express';
import type { User } from '../types/index.js';

export interface AuthContext {
  user: User | null;
  authenticated: boolean;
}

export function requireAuth(
  ctx: AuthContext,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!ctx.authenticated || !ctx.user) {
    return res.status(401).json({ error: 'Unauthorized. Please authenticate.' });
  }

  // Attach user to request for downstream use
  (req as any).user = ctx.user;
  next();
}

export function requireAdmin(
  ctx: AuthContext,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!ctx.authenticated || !ctx.user) {
    return res.status(401).json({ error: 'Unauthorized. Please authenticate.' });
  }

  if (ctx.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }

  next();
}