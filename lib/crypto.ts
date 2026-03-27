// SECURITY: server-only — this module must never be imported by client components.
// The `server-only` package causes a build error if accidentally bundled client-side.
import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALG = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.KEY_ENCRYPTION_SECRET;
  if (!secret || secret.length !== 64) {
    throw new Error(
      'KEY_ENCRYPTION_SECRET must be a 64-character hex string (32 bytes). ' +
        'Generate one with: openssl rand -hex 32',
    );
  }
  return Buffer.from(secret, 'hex');
}

/**
 * Encrypts a plaintext API key.
 * Returns a colon-delimited string: iv:authTag:ciphertext (all hex-encoded).
 * The GCM auth tag detects any tampering with the stored ciphertext.
 */
export function encryptKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString('hex')).join(':');
}

/**
 * Decrypts a stored ciphertext back to the plaintext API key.
 * The decrypted key should exist only in server memory during the request lifetime.
 * NEVER log, return to the client, or persist the return value.
 */
export function decryptKey(stored: string): string {
  const key = getEncryptionKey();
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Invalid stored key format');
  const [ivHex, tagHex, encHex] = parts;
  const decipher = createDecipheriv(ALG, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return (
    decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') +
    decipher.final('utf8')
  );
}
