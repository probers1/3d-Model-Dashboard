/**
 * Model management service.
 */
import type { Database } from '../database/index.js';
import type { Model, ModelFile } from '../types/index.js';
import type { Result } from '../types/index.js';
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
export declare function generateModelId(): string;
/**
 * Creates a new model entry.
 */
export declare function createModel(db: Database, modelId: string, title: string, description: string | null, tags: string[] | null, createdBy: string, thumbnailPath?: string): Result<Model>;
/**
 * Gets a model by ID.
 */
export declare function getModel(db: Database, id: string): Model | null;
/**
 * Gets all models.
 */
export declare function getAllModels(db: Database): Model[];
/**
 * Gets models filtered by search term (title or description).
 */
export declare function searchModels(db: Database, query: string): Model[];
/**
 * Updates a model.
 */
export declare function updateModel(db: Database, id: string, title?: string | null, description?: string | null, tags?: string[] | null): Result<void>;
/**
 * Deletes a model.
 */
export declare function deleteModel(db: Database, id: string): Result<void>;
/**
 * Gets all files for a model.
 */
export declare function getModelFiles(db: Database, modelId: string): ModelFile[];
/**
 * Adds a file to a model.
 */
export declare function addFileToModel(db: Database, modelId: string, filename: string, originalName: string, mimeType: string, fileSize: number, sha256?: string): Result<ModelFile>;
/**
 * Deletes a file from a model.
 */
export declare function removeFile(db: Database, fileId: string): Result<void>;
/**
 * Validates UUID format.
 */
export declare function isValidUuid(id: string): boolean;
declare const _default: {
    generateModelId: typeof generateModelId;
    createModel: typeof createModel;
    getModel: typeof getModel;
    getAllModels: typeof getAllModels;
    searchModels: typeof searchModels;
    updateModel: typeof updateModel;
    deleteModel: typeof deleteModel;
    getModelFiles: typeof getModelFiles;
    addFileToModel: typeof addFileToModel;
    removeFile: typeof removeFile;
    isValidUuid: typeof isValidUuid;
};
export default _default;
//# sourceMappingURL=model.d.ts.map