/**
 * Model API routes - Part 1: CRUD operations.
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { modelQueries } from '../database/queries.js';
import { createModel, getModel, searchModels, updateModel, deleteModel, getModelFiles, addFileToModel } from '../services/model.js';
import { validateFile, computeSha256, getThumbnailPath, saveFile, generateThumbnail } from '../services/file.js';
import { downloadAllFiles } from '../services/file-download.js';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleCreateModel(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, description, tags } = req.body;

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const modelId = crypto.randomUUID();
  const model = await createModel(
    db,
    modelId,
    title.trim(),
    description?.trim() ?? null,
    Array.isArray(tags) ? tags : []
  );

  res.status(201).json({ id: modelId, title: model.title, created_at: model.created_at });
}

export async function handleGetModels(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = req.query.search as string | undefined;

  let models: any[] = [];
  if (query) {
    models = searchModels(db, query);
  } else {
    models = getAllModels(db);
  }

  res.json({ models });
}

export async function handleGetModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const model = getModel(db, req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  res.json(model);
}

export async function handleUpdateModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const model = getModel(db, req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const { title, description, tags } = req.body;

  const result = updateModel(db, req.params.id, title, description, tags);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true });
}

export async function handleDeleteModel(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const model = getModel(db, req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const result = deleteModel(db, req.params.id);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true });
}

export async function handleGetModelFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const model = getModel(db, req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }

  const files = getModelFiles(db, req.params.id);
  res.json(files);
}