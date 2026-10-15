/**
 * Authentication API routes.
 */

import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { userQueries, sessionQueries } from '../database/queries.js';
import { authenticateUser, createSession, invalidateSession, cleanupExpiredSessions } from '../services/auth.js';

export async function handleGetUser(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json(user);
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const result = authenticateUser(db, username, password);
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  const session = crypto.randomUUID();
  createSession(db, result.data.id, session);

  res.cookie('session', session, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
  res.json({ user: result.data, session });
}

export async function handleLogout(req: Request, res: Response): Promise<void> {
  const sessionId = req.cookies.session;
  if (sessionId) {
    invalidateSession(db, sessionId);
  }
  res.clearCookie('session');
  res.json({ success: true });
}