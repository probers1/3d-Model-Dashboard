"use strict";
/**
 * Model API routes - Part 1: CRUD operations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCreateModel = handleCreateModel;
exports.handleGetModels = handleGetModels;
exports.handleGetModel = handleGetModel;
exports.handleUpdateModel = handleUpdateModel;
exports.handleDeleteModel = handleDeleteModel;
exports.handleGetModelFiles = handleGetModelFiles;
const node_crypto_1 = __importDefault(require("node:crypto"));
const model_js_1 = require("../services/model.js");
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function handleCreateModel(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const { title, description, tags } = req.body;
    if (!title || title.trim().length === 0) {
        return res.status(400).json({ error: 'Title is required' });
    }
    const modelId = node_crypto_1.default.randomUUID();
    const model = await (0, model_js_1.createModel)(db, modelId, title.trim(), description?.trim() ?? null, Array.isArray(tags) ? tags : []);
    res.status(201).json({ id: modelId, title: model.title, created_at: model.created_at });
}
async function handleGetModels(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const query = req.query.search;
    let models = [];
    if (query) {
        models = (0, model_js_1.searchModels)(db, query);
    }
    else {
        models = getAllModels(db);
    }
    res.json({ models });
}
async function handleGetModel(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const model = (0, model_js_1.getModel)(db, req.params.id);
    if (!model) {
        return res.status(404).json({ error: 'Model not found' });
    }
    res.json(model);
}
async function handleUpdateModel(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const model = (0, model_js_1.getModel)(db, req.params.id);
    if (!model) {
        return res.status(404).json({ error: 'Model not found' });
    }
    const { title, description, tags } = req.body;
    const result = (0, model_js_1.updateModel)(db, req.params.id, title, description, tags);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    res.json({ success: true });
}
async function handleDeleteModel(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const model = (0, model_js_1.getModel)(db, req.params.id);
    if (!model) {
        return res.status(404).json({ error: 'Model not found' });
    }
    const result = (0, model_js_1.deleteModel)(db, req.params.id);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    res.json({ success: true });
}
async function handleGetModelFiles(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const model = (0, model_js_1.getModel)(db, req.params.id);
    if (!model) {
        return res.status(404).json({ error: 'Model not found' });
    }
    const files = (0, model_js_1.getModelFiles)(db, req.params.id);
    res.json(files);
}
//# sourceMappingURL=models.js.map