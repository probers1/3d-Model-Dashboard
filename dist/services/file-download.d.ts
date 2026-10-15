/**
 * File download handlers.
 */
export declare function downloadFile(filePath: string): {
    filePath: string;
    headers: Record<string, string>;
};
export declare function downloadAllFiles(modelId: string): {
    filePath: string;
    headers: Record<string, string>;
};
declare const _default: {
    downloadFile: typeof downloadFile;
    downloadAllFiles: typeof downloadAllFiles;
};
export default _default;
//# sourceMappingURL=file-download.d.ts.map