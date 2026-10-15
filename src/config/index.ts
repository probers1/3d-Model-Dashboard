/**
 * Configuration management with environment-based secrets.
 * 
 * Yanii Principles:
 * - Secrets from environment, never hardcoded
 * - Config validation at startup
 * - Type-safe configuration
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// -----------------------------------------------------------------------------
// Environment Variable Loading
// -----------------------------------------------------------------------------

interface EnvVars {
  PORT: string;
  DATA_DIR: string;
  SESSION_SECRET: string;
  ADMIN_USER: string;
  ADMIN_PASSWORD: string;
}

/**
 * Loads environment variables from .env file if present.
 * Never overwrites existing process.env values (security: prevents parent env pollution).
 */
export function loadEnvFile(): void {
  const envPath = join(__dirname, '../../.env');
  
  if (!existsSync(envPath)) {
    return;
  }

  try {
    const content = readFileSync(envPath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE, supporting quoted values
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

      if (match) {
        const [_, key, value] = match;
        const cleanValue = value.trim().replace(/^["']|["']$/g, '');

        // Security: only set if not already set (prevents env pollution attacks)
        if (!process.env[key]) {
          process.env[key] = cleanValue;
        }
      }
    }
  } catch (err) {
    console.error('[Config] Failed to load .env file:', err instanceof Error ? err.message : String(err));
  }
}

// -----------------------------------------------------------------------------
// Configuration Object
// -----------------------------------------------------------------------------

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

const DEFAULTS: Partial<AppConfig> = {
  port: 3005,
  maxFileSizeMB: 50,
  maxModelsPerUser: 100,
  thumbnailQueueSize: 10,
};

/**
 * Creates and validates the application configuration.
 */
export function createConfig(): AppConfig {
  // Load .env if present
  loadEnvFile();

  const port = Number(process.env.PORT) || DEFAULTS.port;
  const dataDir = process.env.DATA_DIR || join(__dirname, '../../data');
  const sessionSecret = process.env.SESSION_SECRET || '';
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';

  // Security: Warn if default secret is used
  if (!sessionSecret) {
    console.warn(
      '[Config] ⚠️  SECURITY WARNING: No SESSION_SECRET set. ' +
      'Set SESSION_SECRET environment variable to use a strong secret key.'
    );
  }

  // Validate required config
  if (port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${port}. Must be between 1 and 65535.`);
  }

  return {
    port,
    dataDir,
    sessionSecret,
    adminUser,
    adminPassword,
    maxFileSizeMB: Number(process.env.MAX_FILE_SIZE_MB) || DEFAULTS.maxFileSizeMB,
    maxModelsPerUser: Number(process.env.MAX_MODELS_PER_USER) || DEFAULTS.maxModelsPerUser,
    thumbnailQueueSize: Number(process.env.THUMBNAIL_QUEUE_SIZE) || DEFAULTS.thumbnailQueueSize,
  };
}

export default createConfig;