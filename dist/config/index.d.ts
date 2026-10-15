/**
 * Configuration management with environment-based secrets.
 *
 * Yanii Principles:
 * - Secrets from environment, never hardcoded
 * - Config validation at startup
 * - Type-safe configuration
 */
/**
 * Loads environment variables from .env file if present.
 * Never overwrites existing process.env values (security: prevents parent env pollution).
 */
export declare function loadEnvFile(): void;
interface AppConfig {
    port: number;
    dataDir: string;
    sessionSecret: string;
    adminUser: string;
    adminPassword: string;
    maxFileSizeMB: number;
    maxModelsPerUser: number;
    thumbnailQueueSize: number;
}
/**
 * Creates and validates the application configuration.
 */
export declare function createConfig(): AppConfig;
export default createConfig;
//# sourceMappingURL=index.d.ts.map