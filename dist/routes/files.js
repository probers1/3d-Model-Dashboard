"use strict";
/**
 * File API routes - uploads, downloads, thumbnails.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUpload = void 0;
exports.downloadFile = downloadFile;
exports.downloadAllFiles = downloadAllFiles;
exports.handleGetThumbnail = handleGetThumbnail;
const multer_1 = __importDefault(require("multer"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 50;
exports.fileUpload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const modelId = req.params.id;
            const dir = node_path_1.default.join(process.env.DATA_DIR || './data', 'models', modelId);
            node_fs_1.default.mkdirSync(dir, { recursive: true });
            cb(null, node_path_1.default.join(dir, 'files'));
        },
        filename: (req, file, cb) => {
            const ext = node_path_1.default.extname(file.originalname).toLowerCase();
            if (!['.stl', '.obj', '.3mf'].includes(ext)) {
                return cb(new Error('Invalid file type'), undefined);
            }
            cb(null, file.originalname);
        },
    }),
    limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});
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
async function handleGetThumbnail(req, res) {
    const { id } = req.params;
    if (!uuidRegex.test(id)) {
        return res.status(400).json({ error: 'Invalid model ID format' });
    }
    const thumbPath = getThumbnailPath(id);
    if (node_fs_1.default.existsSync(thumbPath)) {
        return res.sendFile(thumbPath);
    }
    // Check background job queue
    const activeJob = thumbnailQueue.get(id);
    if (activeJob) {
        try {
            await Promise.race([
                activeJob.promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Thumbnail timeout')), 25000)),
            ]);
            if (node_fs_1.default.existsSync(thumbPath)) {
                return res.sendFile(thumbPath);
            }
        }
        catch {
            // Fall through to 404
        }
    }
    const fallbackSvg = node_path_1.default.join(__dirname, '../../public/placeholder-thumb.svg');
    if (node_fs_1.default.existsSync(fallbackSvg)) {
        return res.status(404).sendFile(fallbackSvg);
    }
    res.status(404).send('Thumbnail not found');
}
//# sourceMappingURL=files.js.map