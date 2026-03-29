import { createHash } from 'node:crypto';

/**
 * Hash an API key using SHA-256
 * This is the ONLY place in the entire codebase that does hashing.
 * Never store plaintext keys — always hash before storing or comparing.
 *
 * @param key - The plaintext API key
 * @returns SHA-256 hash in hexadecimal format
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
