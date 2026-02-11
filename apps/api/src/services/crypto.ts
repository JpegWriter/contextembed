/**
 * Simple AES-256-GCM encryption for WordPress application passwords.
 * 
 * Key is derived from WP_ENCRYPTION_KEY env var (or SUPABASE_SERVICE_ROLE_KEY as fallback).
 * This is symmetric encryption — the API server is the only entity that
 * encrypts/decrypts, so a shared secret is fine.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keySource = process.env.WP_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!keySource) {
    throw new Error('No encryption key available. Set WP_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY.');
  }
  // Derive a 32-byte key from the source using SHA-256
  return crypto.createHash('sha256').update(keySource).digest();
}

/**
 * Encrypt a plaintext string → base64 ciphertext
 */
export function encryptPassword(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Pack: iv (hex) + ':' + authTag (hex) + ':' + ciphertext (hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a base64 ciphertext → plaintext string
 */
export function decryptPassword(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted password format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
