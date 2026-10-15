"use strict";
/**
 * File handling service for model files.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFile = validateFile;
exports.computeSha256 = computeSha256;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const ALLOWED_MIME_TYPES = [
    'model/stl',
    'application/octet-stream',
    'application/sla',
    'application/3mf',
    'text/x-mixed-media',
];
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
/**
 * Validates a file based on extension and MIME type.
 */
function validateFile(filename, mimeType, fileSize) {
    const ext = node_path_1.default.extname(filename).toLowerCase().slice(1);
    if (!['stl', 'obj', '3mf'].includes(ext)) {
        return { valid: false, reason: `Unsupported file extension: ${ext}. Only .stl, .obj, and .3mf are allowed.` };
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            reason: `File too large: ${(fileSize / 1024 / 1024).toFixed(1)}MB exceeds max ${MAX_FILE_SIZE_MB}MB.`,
        };
    }
    return { valid: true };
}
/**
 * Computes SHA-256 hash of a file.
 */
function computeSha256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = node_crypto_1.default.createHash('sha256');
        const stream = node_fs_1.default.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}
//# sourceMappingURL=file.js.map