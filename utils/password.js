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
    {
      keylen: HASH_LENGTH,
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
  const [saltHex, hashHex] = storedHash.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const hash = Buffer.from(hashHex, 'hex');

  const computedHash = await scryptAsync(
    Buffer.from(plaintext, 'utf8'),
    salt,
    {
      keylen: HASH_LENGTH,
      n: SCRYPT_ROUNDS,
      r: 1,
      p: 1
    }
  );

  const computedFull = Buffer.concat([salt, computedHash]);
  return crypto.timingSafeEqual(computedFull, hash);
}

module.exports = { hashPassword, verifyPassword };