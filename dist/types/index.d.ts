/**
 * Shared type definitions for PrintVault.
 *
 * Yanii Principle: Type safety from the ground up.
 */
export interface User {
    id: string;
    username: string;
    role: 'admin' | 'user';
    created_at: number;
}
export interface Model {
    id: string;
    title: string;
    description: string | null;
    tags: string[];
    thumbnail_path: string | null;
    created_by: string;
    created_at: number;
    updated_at: number;
}
export interface ModelFile {
    id: string;
    model_id: string;
    filename: string;
    original_name: string;
    mime_type: string;
    file_size: number;
    sha256?: string;
    created_at: number;
}
export interface Session {
    id: string;
    user_id: string;
    expires_at: number;
}
export interface ApiRequest<T = unknown> {
    body?: T;
    query?: Record<string, string>;
    params?: Record<string, string | number>;
    cookies?: Record<string, string>;
}
export interface ApiResponse<T = unknown> {
    ok: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface CreateModelRequest {
    title: string;
    description?: string | null;
    tags: string[];
}
export interface CreateUserRequest {
    username: string;
    password: string;
    role: 'admin' | 'user';
}
export interface UpdateModelRequest {
    title?: string | null;
    description?: string | null;
    tags?: string[] | null;
}
export interface AppConfig {
    port: number;
    dataDir: string;
    sessionSecret: string;
    adminUser: string;
    adminPassword: string;
    maxFileSizeMB: number;
    maxModelsPerUser: number;
    thumbnailQueueSize: number;
}
export type Result<T> = {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
};
export type Logger = {
    info: (msg: string, context?: Record<string, unknown>) => void;
    warn: (msg: string, context?: Record<string, unknown>) => void;
    error: (msg: string, context?: Record<string, unknown>) => void;
    debug: (msg: string, context?: Record<string, unknown>) => void;
};
//# sourceMappingURL=index.d.ts.map