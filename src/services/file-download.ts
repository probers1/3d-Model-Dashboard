/**
 * File download handlers.
 */

import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

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

  // Find all files in the models directory
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

export default { downloadFile, downloadAllFiles };