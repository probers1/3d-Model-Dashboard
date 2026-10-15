"use strict";
/**
 * File download handlers.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFile = downloadFile;
exports.downloadAllFiles = downloadAllFiles;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
function downloadFile(filePath) {
    if (!node_fs_1.default.existsSync(filePath)) {
        throw new Error('File not found');
    }
    const stat = node_fs_1.default.statSync(filePath);
    const filename = node_path_1.default.basename(filePath);
    return {
        filePath,
        headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': stat.size.toString(),
        },
    };
}
function downloadAllFiles(modelId) {
    const dataDir = process.env.DATA_DIR || './data';
    const modelsDir = node_path_1.default.join(dataDir, 'models', modelId);
    if (!node_fs_1.default.existsSync(modelsDir)) {
        throw new Error('Model not found');
    }
    const filesDir = node_path_1.default.join(modelsDir, 'files');
    if (!node_fs_1.default.existsSync(filesDir)) {
        throw new Error('No files found in model');
    }
    const zip = new adm_zip_1.default();
    // Find all files in the models directory
    const fileEntries = node_fs_1.default.readdirSync(filesDir);
    for (const file of fileEntries) {
        const filePath = node_path_1.default.join(filesDir, file);
        if (node_fs_1.default.statSync(filePath).isFile()) {
            zip.addLocalFile(filePath, '', file);
        }
    }
    const zipBuffer = zip.toBuffer();
    const safeTitle = modelId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
        filePath: null,
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${safeTitle}.zip"`,
            'Content-Length': zipBuffer.length.toString(),
        },
    };
}
exports.default = { downloadFile, downloadAllFiles };
//# sourceMappingURL=file-download.js.map