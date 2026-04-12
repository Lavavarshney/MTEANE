import { createHmac } from 'node:crypto';

/**
 * Hash an API key using HMAC-SHA256 with the application secret.
 * The secret binds the hash to this deployment — even if the DB leaks,
 * an attacker cannot brute-force keys without also knowing the secret.
 *
 * Both storage (POST /auth/register) and comparison (auth middleware)
 * must use the same secret, making key_hash useless without API_KEY_SECRET.
 *
 * @param key    - The plaintext API key
 * @param secret - API_KEY_SECRET from config (min 32 chars)
 * @returns HMAC-SHA256 hex digest
 */
export function hashApiKey(key: string, secret: string): string {
  return createHmac('sha256', secret).update(key).digest('hex');
}
