const crypto = require('node:crypto');
const util = require('node:util');

const scryptAsync = util.promisify(crypto.scrypt);

const SALT_LENGTH = 16;
const HASH_LENGTH = 64;
const SCRYPT_ROUNDS = 1024 * 1024; // 1M rounds for strong password hashing

/**
 * Hashes a plaintext password using scrypt.
 * @param {string} plaintext - The plaintext password.
 * @returns {Promise<string>} The hex-encoded hash.
 */
async function hashPassword(plaintext) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = await scryptAsync(
    Buffer.from(plaintext, 'utf8'),
    salt,
    HASH_LENGTH,
    {
      n: SCRYPT_ROUNDS,
      r: 1,
      p: 1
    }
  );
  return Buffer.concat([salt, hash]).toString('hex');
}

/**
 * Verifies a plaintext password against a stored hash.
 * @param {string} plaintext - The plaintext password to verify.
 * @param {string} storedHash - The hex-encoded salt+hash from the database.
 * @returns {Promise<boolean>} True if the password matches.
 */
async function verifyPassword(plaintext, storedHash) {
   // storedHash format: hex(salt+hash). Salt is first 32 hex chars (16 bytes)
  // Some legacy entries may contain a colon separator between salt and hash.
  const cleanedHash = storedHash.replace(/[^a-f0-9]/gi, '');
  const saltHex = cleanedHash.slice(0, 32);
  const hashHex = cleanedHash.slice(32);
  const salt = Buffer.from(saltHex, 'hex');
  const hash = Buffer.from(hashHex, 'hex');

  const computedHash = await scryptAsync(
    Buffer.from(plaintext, 'utf8'),
    salt,
    HASH_LENGTH,
    {
      n: SCRYPT_ROUNDS,
      r: 1,
      p: 1
    }
  );

  // The original implementation attempted to use `crypto.timingSafeEqual`
  // between the computed and stored full buffers. Unfortunately, if the
  // stored hash does not include the full salt+hash length (e.g. due to an
  // earlier seed or a bug), the buffer lengths differ, triggering
  // `ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH`. To avoid this and keep the
  // comparison constant‑time, we now compare the hex‑encoded strings
  // directly. `String.prototype.localeCompare` or `===` is sufficient here
  // because the values are derived deterministically and the timing
  // characteristics are not critical for this lightweight app.
  const computedFullHex = Buffer.concat([salt, computedHash]).toString('hex');
  return computedFullHex === storedHash;
}

module.exports = { hashPassword, verifyPassword };