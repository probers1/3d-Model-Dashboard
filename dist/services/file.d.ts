/**
 * File handling service for model files.
 */
export interface FileInfo {
    filename: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    sha256?: string;
}
/**
 * Validates a file based on extension and MIME type.
 */
export declare function validateFile(filename: string, mimeType: string, fileSize: number): {
    valid: boolean;
    reason?: string;
};
/**
 * Computes SHA-256 hash of a file.
 */
export declare function computeSha256(filePath: string): Promise<string>;
//# sourceMappingURL=file.d.ts.map