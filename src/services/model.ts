/**
 * Model management service.
 */

import crypto from 'node:crypto';
import type { Database } from '../database/index.js';
import type { Model, ModelFile, User } from '../types/index.js';
import type { Result } from '../types/index.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CreateModelParams {
  title: string;
  description?: string | null;
  tags: string[];
}

export interface UpdateModelParams {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
}

export function generateModelId(): string {
  return crypto.randomUUID();
}

/**
 * Creates a new model entry.
 */
export function createModel(
  db: Database,
  modelId: string,
  title: string,
  description: string | null,
  tags: string[] | null,
  createdBy: string,
  thumbnailPath?: string
): Result<Model> {
  try {
    db.prepare(`
      INSERT INTO models (id, title, description, tags, thumbnail_path, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run([modelId, title, description, JSON.stringify(tags), thumbnailPath, createdBy, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]);

    return { success: true, data: null };
  } catch (err) {
    if ((err as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'Model with this ID already exists' };
    }
    throw err;
  }
}

/**
 * Gets a model by ID.
 */
export function getModel(db: Database, id: string): Model | null {
  return db.prepare('SELECT id, title, description, tags, thumbnail_path, created_at FROM models WHERE id = ?').get([id]);
}

/**
 * Gets all models.
 */
export function getAllModels(db: Database): Model[] {
  return db.prepare('SELECT id, title, description, tags, thumbnail_path, created_at FROM models ORDER BY created_at DESC').all();
}

/**
 * Gets models filtered by search term (title or description).
 */
export function searchModels(db: Database, query: string): Model[] {
  const searchTerm = `%${query}%`;
  return db.prepare('SELECT id, title, description, tags, thumbnail_path, created_at FROM models WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC').all([searchTerm, searchTerm]);
}

/**
 * Updates a model.
 */
export function updateModel(
  db: Database,
  id: string,
  title?: string | null,
  description?: string | null,
  tags?: string[] | null
): Result<void> {
  try {
    db.prepare('UPDATE models SET title = ?, description = ?, tags = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run([title ?? null, description ?? null, JSON.stringify(tags ?? []), id]);
    return { success: true, data: null };
  } catch (err) {
    if ((err as any).code === 'SQLITE_CONSTRAINT_NOTNULL') {
      return { success: false, error: 'Title is required' };
    }
    throw err;
  }
}

/**
 * Deletes a model.
 */
export function deleteModel(db: Database, id: string): Result<void> {
  try {
    db.prepare('DELETE FROM models WHERE id = ?').run([id]);
    return { success: true, data: null };
  } catch (err) {
    if ((err as any).code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return { success: false, error: 'Cannot delete model with associated files' };
    }
    throw err;
  }
}

/**
 * Gets all files for a model.
 */
export function getModelFiles(db: Database, modelId: string): ModelFile[] {
  return db.prepare('SELECT * FROM model_files WHERE model_id = ? ORDER BY created_at DESC').all([modelId]);
}

/**
 * Adds a file to a model.
 */
export function addFileToModel(
  db: Database,
  modelId: string,
  filename: string,
  originalName: string,
  mimeType: string,
  fileSize: number,
  sha256?: string
): Result<ModelFile> {
  try {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO model_files (id, model_id, filename, original_name, mime_type, file_size, sha256, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run([id, modelId, filename, originalName, mimeType, fileSize, sha256 ?? null, Math.floor(Date.now() / 1000)]);

    return { success: true, data: null };
  } catch (err) {
    if ((err as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'File already exists' };
    }
    throw err;
  }
}

/**
 * Deletes a file from a model.
 */
export function removeFile(db: Database, fileId: string): Result<void> {
  try {
    db.prepare('DELETE FROM model_files WHERE id = ?').run([fileId]);
    return { success: true, data: null };
  } catch (err) {
    if ((err as any).code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return { success: false, error: 'Cannot delete file with associated records' };
    }
    throw err;
  }
}

/**
 * Validates UUID format.
 */
export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

export default {
  generateModelId,
  createModel,
  getModel,
  getAllModels,
  searchModels,
  updateModel,
  deleteModel,
  getModelFiles,
  addFileToModel,
  removeFile,
  isValidUuid,
};