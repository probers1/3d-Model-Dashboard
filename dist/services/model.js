"use strict";
/**
 * Model management service.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateModelId = generateModelId;
exports.createModel = createModel;
exports.getModel = getModel;
exports.getAllModels = getAllModels;
exports.searchModels = searchModels;
exports.updateModel = updateModel;
exports.deleteModel = deleteModel;
exports.getModelFiles = getModelFiles;
exports.addFileToModel = addFileToModel;
exports.removeFile = removeFile;
exports.isValidUuid = isValidUuid;
const node_crypto_1 = __importDefault(require("node:crypto"));
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function generateModelId() {
    return node_crypto_1.default.randomUUID();
}
/**
 * Creates a new model entry.
 */
function createModel(db, modelId, title, description, tags, createdBy, thumbnailPath) {
    try {
        db.prepare(`
      INSERT INTO models (id, title, description, tags, thumbnail_path, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run([modelId, title, description, JSON.stringify(tags), thumbnailPath, createdBy, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)]);
        return { success: true, data: null };
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { success: false, error: 'Model with this ID already exists' };
        }
        throw err;
    }
}
/**
 * Gets a model by ID.
 */
function getModel(db, id) {
    return db.prepare('SELECT id, title, description, tags, thumbnail_path, created_at FROM models WHERE id = ?').get([id]);
}
/**
 * Gets all models.
 */
function getAllModels(db) {
    return db.prepare('SELECT id, title, description, tags, thumbnail_path, created_at FROM models ORDER BY created_at DESC').all();
}
/**
 * Gets models filtered by search term (title or description).
 */
function searchModels(db, query) {
    const searchTerm = `%${query}%`;
    return db.prepare('SELECT id, title, description, tags, thumbnail_path, created_at FROM models WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC').all([searchTerm, searchTerm]);
}
/**
 * Updates a model.
 */
function updateModel(db, id, title, description, tags) {
    try {
        db.prepare('UPDATE models SET title = ?, description = ?, tags = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run([title ?? null, description ?? null, JSON.stringify(tags ?? []), id]);
        return { success: true, data: null };
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_NOTNULL') {
            return { success: false, error: 'Title is required' };
        }
        throw err;
    }
}
/**
 * Deletes a model.
 */
function deleteModel(db, id) {
    try {
        db.prepare('DELETE FROM models WHERE id = ?').run([id]);
        return { success: true, data: null };
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            return { success: false, error: 'Cannot delete model with associated files' };
        }
        throw err;
    }
}
/**
 * Gets all files for a model.
 */
function getModelFiles(db, modelId) {
    return db.prepare('SELECT * FROM model_files WHERE model_id = ? ORDER BY created_at DESC').all([modelId]);
}
/**
 * Adds a file to a model.
 */
function addFileToModel(db, modelId, filename, originalName, mimeType, fileSize, sha256) {
    try {
        const id = node_crypto_1.default.randomUUID();
        db.prepare(`
      INSERT INTO model_files (id, model_id, filename, original_name, mime_type, file_size, sha256, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run([id, modelId, filename, originalName, mimeType, fileSize, sha256 ?? null, Math.floor(Date.now() / 1000)]);
        return { success: true, data: null };
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { success: false, error: 'File already exists' };
        }
        throw err;
    }
}
/**
 * Deletes a file from a model.
 */
function removeFile(db, fileId) {
    try {
        db.prepare('DELETE FROM model_files WHERE id = ?').run([fileId]);
        return { success: true, data: null };
    }
    catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            return { success: false, error: 'Cannot delete file with associated records' };
        }
        throw err;
    }
}
/**
 * Validates UUID format.
 */
function isValidUuid(id) {
    return UUID_REGEX.test(id);
}
exports.default = {
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
//# sourceMappingURL=model.js.map