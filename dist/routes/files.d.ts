/**
 * File API routes - uploads, downloads, thumbnails.
 */
import type { Request, Response } from 'express';
import multer from 'multer';
export declare const fileUpload: multer.Multer;
export declare function downloadFile(filePath: string): {
    filePath: string;
    headers: Record<string, string>;
};
export declare function downloadAllFiles(modelId: string): {
    filePath: string;
    headers: Record<string, string>;
};
export declare function handleGetThumbnail(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=files.d.ts.map