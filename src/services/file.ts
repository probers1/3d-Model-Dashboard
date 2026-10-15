/**
 * File handling service for model files.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import type { ModelFile } from '../types/index.js';

export interface FileInfo {
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  sha256?: string;
}

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
export function validateFile(
  filename: string,
  mimeType: string,
  fileSize: number
): { valid: boolean; reason?: string } {
  const ext = path.extname(filename).toLowerCase().slice(1);

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
export function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}