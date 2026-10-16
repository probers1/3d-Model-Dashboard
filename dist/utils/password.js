"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const crypto_1 = __importDefault(require("crypto"));
const util_1 = __importDefault(require("util"));
const scryptAsync = util_1.default.promisify(crypto_1.default.scrypt);
/**
 * Hash a password using scrypt. The returned string is a hex
 * representation of the concatenated salt and derived key.
 */
async function hashPassword(password) {
    const salt = crypto_1.default.randomBytes(16);
    const derived = await scryptAsync(password, salt, 64);
    // Store salt and key together
    return Buffer.concat([salt, derived]).toString('hex');
}
/**
 * Verify a password against the stored hash.
 */
async function verifyPassword(password, hash) {
    const buf = Buffer.from(hash, 'hex');
    const salt = buf.slice(0, 16);
    const storedKey = buf.slice(16);
    const derived = await scryptAsync(password, salt, 64);
    return crypto_1.default.timingSafeEqual(storedKey, derived);
}
