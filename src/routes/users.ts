/**
 * User management API routes (admin only).
 */

import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { userQueries } from '../database/queries.js';
import { createAdminUser } from '../services/auth.js';

export async function handleGetUsers(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const users = userQueries.getAll(db);
  res.json(users);
}

export async function handleCreateUser(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const result = createAdminUser(db, username, password);
  if (!result.success) {
    return res.status(409).json({ error: result.error });
  }

  res.status(201).json({ success: true });
}

export async function handleDeleteUser(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const targetUser = userQueries.getById(db, req.params.id);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Cannot delete yourself
  if (targetUser.id === user.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  userQueries.delete(db, req.params.id);
  res.json({ success: true });
}