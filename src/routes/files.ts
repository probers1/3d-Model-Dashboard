/**
 * File API routes - uploads, downloads, thumbnails.
 */

import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import AdmZip from 'adm-zip';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB) || 50;

export const fileUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const modelId = req.params.id;
      const dir = path.join(process.env.DATA_DIR || './data', 'models', modelId);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, path.join(dir, 'files'));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!['.stl', '.obj', '.3mf'].includes(ext)) {
        return cb(new Error('Invalid file type'), undefined);
      }
      cb(null, file.originalname);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

export function downloadFile(filePath: string): { filePath: string; headers: Record<string, string> } {
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  const stat = fs.statSync(filePath);
  const filename = path.basename(filePath);

  return {
    filePath,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': stat.size.toString(),
    },
  };
}

export function downloadAllFiles(modelId: string): { filePath: string; headers: Record<string, string> } {
  const dataDir = process.env.DATA_DIR || './data';
  const modelsDir = path.join(dataDir, 'models', modelId);

  if (!fs.existsSync(modelsDir)) {
    throw new Error('Model not found');
  }

  const filesDir = path.join(modelsDir, 'files');
  if (!fs.existsSync(filesDir)) {
    throw new Error('No files found in model');
  }

  const zip = new AdmZip();
  const fileEntries = fs.readdirSync(filesDir);

  for (const file of fileEntries) {
    const filePath = path.join(filesDir, file);
    if (fs.statSync(filePath).isFile()) {
      zip.addLocalFile(filePath, '', file);
    }
  }

  const zipBuffer = zip.toBuffer();
  const safeTitle = modelId.replace(/[^a-zA-Z0-9_-]/g, '_');

  return {
    filePath: null as unknown as string,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeTitle}.zip"`,
      'Content-Length': zipBuffer.length.toString(),
    },
  };
}

export async function handleGetThumbnail(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'Invalid model ID format' });
  }

  const thumbPath = getThumbnailPath(id);

  if (fs.existsSync(thumbPath)) {
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
      if (fs.existsSync(thumbPath)) {
        return res.sendFile(thumbPath);
      }
    } catch {
      // Fall through to 404
    }
  }

  const fallbackSvg = path.join(__dirname, '../../public/placeholder-thumb.svg');
  if (fs.existsSync(fallbackSvg)) {
    return res.status(404).sendFile(fallbackSvg);
  }

  res.status(404).send('Thumbnail not found');
}