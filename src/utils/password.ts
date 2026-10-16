import crypto from 'crypto';
import util from 'util';

const scryptAsync = util.promisify(crypto.scrypt);

/**
 * Hash a password using scrypt. The returned string is a hex
 * representation of the concatenated salt and derived key.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password, salt, 64);
  // Store salt and key together
  return Buffer.concat([salt, derived as Buffer]).toString('hex');
}

/**
 * Verify a password against the stored hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const buf = Buffer.from(hash, 'hex');
  const salt = buf.slice(0, 16);
  const storedKey = buf.slice(16);
  const derived = await scryptAsync(password, salt, 64);
  return crypto.timingSafeEqual(storedKey, derived as Buffer);
}
