/**
 * Security regression tests — proves each vulnerability exists before fixing,
 * then serves as a permanent guard after fixes are applied.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';

import { hashApiKey } from './utils/hash.ts';
import { resolvePath } from './utils/resolvePath.ts';
import { evaluate } from './engine/evaluator.ts';
import { isPrivateUrl } from './utils/ssrf.ts';

// ─── Hypothesis A: HMAC key hashing ──────────────────────────────────────────

describe('Hypothesis A — API key hashing uses HMAC-SHA256 with a secret', () => {
  const testKey = 'test-api-key-12345';
  const secret = 'a'.repeat(32);

  it('hash output is NOT equal to raw SHA-256 (secret is not ignored)', () => {
    const rawSha256 = createHash('sha256').update(testKey).digest('hex');
    const actual = hashApiKey(testKey, secret);
    assert.notEqual(
      actual,
      rawSha256,
      'hashApiKey must use HMAC — raw SHA-256 ignores the secret and is brute-forceable',
    );
  });

  it('two different secrets produce different hashes for the same key (HMAC property)', () => {
    const secret1 = 'a'.repeat(32);
    const secret2 = 'b'.repeat(32);
    const h1 = hashApiKey(testKey, secret1);
    const h2 = hashApiKey(testKey, secret2);
    assert.notEqual(h1, h2, 'different secrets must produce different hashes');
  });

  it('matches expected HMAC-SHA256 output', () => {
    const expected = createHmac('sha256', secret).update(testKey).digest('hex');
    assert.equal(hashApiKey(testKey, secret), expected);
  });
});

// ─── Hypothesis B: Prototype pollution in resolvePath ────────────────────────

describe('Hypothesis B — resolvePath blocks __proto__ / constructor / prototype', () => {
  it('blocks __proto__ multi-segment (sub-key access)', () => {
    const obj = { user: { name: 'alice' } };
    assert.equal(resolvePath(obj, '__proto__.isAdmin'), undefined);
  });

  it('blocks __proto__ single segment (would return Object.prototype without fix)', () => {
    const obj = {} as Record<string, unknown>;
    const result = resolvePath(obj, '__proto__');
    assert.equal(result, undefined, '__proto__ must never be traversed — it resolves to Object.prototype on any plain object');
  });

  it('blocks constructor traversal', () => {
    const obj = { user: 'alice' };
    assert.equal(resolvePath(obj, 'constructor.name'), undefined);
  });

  it('blocks prototype traversal', () => {
    const obj = {} as Record<string, unknown>;
    assert.equal(resolvePath(obj, 'prototype.isAdmin'), undefined);
  });

  it('only reads own properties (no inherited property access)', () => {
    const obj = { user: { name: 'alice' } };
    // 'toString' is inherited but not an own property — must return undefined
    assert.equal(resolvePath(obj, 'toString'), undefined);
  });

  it('still resolves legitimate nested paths after fix', () => {
    const obj = { order: { amount: 250, address: { city: 'NYC' } } };
    assert.equal(resolvePath(obj, 'order.amount'), 250);
    assert.equal(resolvePath(obj, 'order.address.city'), 'NYC');
  });
});

// ─── Hypothesis C: ReDoS via regex operator ──────────────────────────────────

describe('Hypothesis C — regex operator enforces pattern length and rejects catastrophic backtracking', () => {
  it('rejects patterns exceeding 200 characters', () => {
    const longPattern = 'a'.repeat(201);
    assert.throws(
      () => evaluate({ field: 'text', operator: 'regex', value: longPattern }, { text: 'test' }),
      /too long/i,
    );
  });

  it('rejects classic catastrophic backtracking pattern (a+)+', () => {
    assert.throws(
      () => evaluate({ field: 'text', operator: 'regex', value: '(a+)+$' }, { text: 'test' }),
      /dangerous|ReDoS|nested/i,
    );
  });

  it('rejects (a*)* nested quantifier', () => {
    assert.throws(
      () => evaluate({ field: 'text', operator: 'regex', value: '(a*)*' }, { text: 'test' }),
      /dangerous|ReDoS|nested/i,
    );
  });

  it('still allows short, safe regex patterns', () => {
    assert.equal(
      evaluate({ field: 'email', operator: 'regex', value: '^[\\w.-]+@[\\w.-]+\\.[a-z]{2,}$' }, { email: 'user@example.com' }),
      true,
    );
  });

  it('still allows simple character class patterns', () => {
    assert.equal(
      evaluate({ field: 'code', operator: 'regex', value: '^[A-Z]{3}-\\d{4}$' }, { code: 'ABC-1234' }),
      true,
    );
  });
});

// ─── Hypothesis D: SSRF in webhook/slack executors ───────────────────────────

describe('Hypothesis D — SSRF guard blocks private/reserved IP addresses', () => {
  it('blocks localhost 127.0.0.1', () => {
    assert.equal(isPrivateUrl('http://127.0.0.1/internal'), true);
  });

  it('blocks IPv6 loopback [::1]', () => {
    assert.equal(isPrivateUrl('http://[::1]/internal'), true);
  });

  it('blocks RFC-1918 10.x.x.x', () => {
    assert.equal(isPrivateUrl('http://10.0.0.1/'), true);
  });

  it('blocks RFC-1918 192.168.x.x', () => {
    assert.equal(isPrivateUrl('http://192.168.1.1/'), true);
  });

  it('blocks RFC-1918 172.16.x.x – 172.31.x.x', () => {
    assert.equal(isPrivateUrl('http://172.16.0.1/'), true);
    assert.equal(isPrivateUrl('http://172.31.255.255/'), true);
  });

  it('blocks AWS metadata endpoint 169.254.169.254', () => {
    assert.equal(isPrivateUrl('http://169.254.169.254/latest/meta-data/'), true);
  });

  it('blocks 0.0.0.0', () => {
    assert.equal(isPrivateUrl('http://0.0.0.0/'), true);
  });

  it('blocks non-http schemes (file://)', () => {
    assert.equal(isPrivateUrl('file:///etc/passwd'), true);
  });

  it('allows legitimate public webhook URLs', () => {
    assert.equal(isPrivateUrl('https://webhook.site/abc-123'), false);
  });

  it('allows Slack webhook URLs', () => {
    assert.equal(isPrivateUrl('https://hooks.slack.com/services/T000/B000/abc'), false);
  });

  it('allows generic public HTTPS endpoints', () => {
    assert.equal(isPrivateUrl('https://api.example.com/hooks'), false);
  });
});

// ─── Hypothesis E: Fastify bodyLimit ─────────────────────────────────────────

describe('Hypothesis E — Fastify instance is configured with a bodyLimit', () => {
  it('src/api/index.ts includes bodyLimit option', async () => {
    const fs = await import('node:fs/promises');
    const content = await fs.readFile('./src/api/index.ts', 'utf8');
    assert.ok(
      content.includes('bodyLimit'),
      'bodyLimit must be set on Fastify to prevent large-body DoS',
    );
  });
});
