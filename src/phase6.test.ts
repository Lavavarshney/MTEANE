/**
 * Phase 6 — pure-logic unit tests
 *
 * Tests cover:
 *  - Zod cursor datetime validation (Hypothesis B)
 *  - listLogsHandler limit clamping (Hypothesis E)
 *  - nextCursor calculation logic (Hypothesis C)
 *  - getOrgStats success_rate math (Hypothesis D)
 *  - fastify-print-routes presence check (Hypothesis A)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

// ─── Inlined schemas (mirrors logs.controller.ts exactly) ───────────────────

const VALID_STATUSES = ['pending', 'success', 'failed', 'retrying', 'dead'] as const;

const listLogsQuerySchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  rule_id: z.uuid().optional(),
  cursor: z.string().datetime({ offset: true }).optional(),
  limit: z
    .string()
    .optional()
    .transform((v: string | undefined) => {
      const n = v !== undefined ? Number(v) : 20;
      return Number.isNaN(n) ? 20 : Math.min(Math.max(n, 1), 100);
    }),
});

// ─── Hypothesis B: cursor z.string().datetime() Zod v4 validation ───────────

describe('Hypothesis B — cursor datetime validation (Zod v4)', () => {
  it('accepts ISO 8601 UTC with Z suffix (pg default format)', () => {
    const r = listLogsQuerySchema.safeParse({ cursor: '2024-06-15T10:30:00.000Z' });
    assert.equal(r.success, true, 'Zod should accept Z-suffix timestamp');
  });

  it('accepts ISO 8601 with +00:00 offset notation (fixed: { offset: true })', () => {
    // Bug fixed: z.string().datetime({ offset: true }) is required — without it,
    // Zod v4 only accepts the Z suffix and rejects any +HH:MM offset notation.
    const r = listLogsQuerySchema.safeParse({ cursor: '2024-06-15T10:30:00.000+00:00' });
    assert.equal(r.success, true, 'Should accept +00:00 offset — Zod v4 needs { offset: true }');
  });

  it('accepts ISO 8601 with +05:30 offset notation', () => {
    const r = listLogsQuerySchema.safeParse({ cursor: '2024-06-15T10:30:00.000+05:30' });
    assert.equal(r.success, true, 'Should accept any valid UTC offset');
  });

  it('accepts timestamp with microsecond precision (6 decimal places)', () => {
    const r = listLogsQuerySchema.safeParse({ cursor: '2024-06-15T10:30:00.123456Z' });
    assert.equal(r.success, true, 'Zod should accept 6-digit microsecond precision');
  });

  it('accepts timestamp with millisecond precision (3 decimal places)', () => {
    const r = listLogsQuerySchema.safeParse({ cursor: '2024-06-15T10:30:00.123Z' });
    assert.equal(r.success, true, 'Zod should accept 3-digit millisecond precision');
  });

  it('accepts timestamp with no subseconds', () => {
    const r = listLogsQuerySchema.safeParse({ cursor: '2024-06-15T10:30:00Z' });
    assert.equal(r.success, true, 'Zod should accept timestamp without fractional seconds');
  });

  it('rejects a plain date string (no time component)', () => {
    const r = listLogsQuerySchema.safeParse({ cursor: '2024-06-15' });
    assert.equal(r.success, false, 'Zod should reject date-only string as cursor');
  });

  it('rejects arbitrary non-datetime string', () => {
    const r = listLogsQuerySchema.safeParse({ cursor: 'not-a-date' });
    assert.equal(r.success, false, 'Zod should reject non-datetime string');
  });

  it('omitting cursor is valid (optional field)', () => {
    const r = listLogsQuerySchema.safeParse({});
    assert.equal(r.success, true, 'cursor should be optional');
    assert.equal(r.data?.cursor, undefined);
  });
});

// ─── Hypothesis E: limit clamping ────────────────────────────────────────────

describe('Hypothesis E — limit transform and clamping', () => {
  it('defaults to 20 when limit is omitted', () => {
    const r = listLogsQuerySchema.safeParse({});
    assert.equal(r.success, true);
    assert.equal(r.data?.limit, 20);
  });

  it('clamps below 1 → becomes 1', () => {
    const r = listLogsQuerySchema.safeParse({ limit: '0' });
    assert.equal(r.success, true);
    assert.equal(r.data?.limit, 1);
  });

  it('clamps above 100 → becomes 100', () => {
    const r = listLogsQuerySchema.safeParse({ limit: '999' });
    assert.equal(r.success, true);
    assert.equal(r.data?.limit, 100);
  });

  it('passes through a valid value in range', () => {
    const r = listLogsQuerySchema.safeParse({ limit: '42' });
    assert.equal(r.success, true);
    assert.equal(r.data?.limit, 42);
  });

  it('defaults to 20 when limit is a non-numeric string', () => {
    const r = listLogsQuerySchema.safeParse({ limit: 'abc' });
    assert.equal(r.success, true);
    assert.equal(r.data?.limit, 20, 'NaN limit should default to 20');
  });

  it('exactly 1 is accepted', () => {
    const r = listLogsQuerySchema.safeParse({ limit: '1' });
    assert.equal(r.success, true);
    assert.equal(r.data?.limit, 1);
  });

  it('exactly 100 is accepted', () => {
    const r = listLogsQuerySchema.safeParse({ limit: '100' });
    assert.equal(r.success, true);
    assert.equal(r.data?.limit, 100);
  });
});

// ─── Hypothesis C: nextCursor computation ─────────────────────────────────────

describe('Hypothesis C — nextCursor calculation logic', () => {
  type FakeLog = { created_at: string | Date };

  function computeNextCursor(logs: FakeLog[], limit: number): string | Date | null {
    return logs.length === limit ? logs[logs.length - 1]?.created_at ?? null : null;
  }

  it('returns null when fewer logs than limit (last page)', () => {
    const logs: FakeLog[] = [{ created_at: '2024-01-01T00:00:00.000Z' }];
    const cursor = computeNextCursor(logs, 5);
    assert.equal(cursor, null, 'Should be null — fewer results than limit means no next page');
  });

  it('returns created_at of last item when exactly limit items returned', () => {
    const ts = '2024-01-01T00:00:00.000Z';
    const logs: FakeLog[] = Array(3).fill(null).map(() => ({ created_at: ts }));
    const cursor = computeNextCursor(logs, 3);
    assert.equal(cursor, ts);
  });

  it('returns null when no logs returned', () => {
    const cursor = computeNextCursor([], 20);
    assert.equal(cursor, null);
  });

  it('handles Date object as created_at (pg runtime type)', () => {
    const d = new Date('2024-06-15T12:00:00.000Z');
    const logs: FakeLog[] = [{ created_at: d }, { created_at: d }];
    const cursor = computeNextCursor(logs, 2);
    // When pg returns Date objects, the cursor is a Date object
    // Fastify will serialize it to ISO string in the JSON response — this is correct
    assert.ok(
      cursor instanceof Date || typeof cursor === 'string',
      'cursor should be a Date or string, not null',
    );
    // Verify it can be serialized and re-validated by Zod
    const serialized = cursor instanceof Date ? cursor.toISOString() : cursor;
    const r = listLogsQuerySchema.safeParse({ cursor: serialized });
    assert.equal(r.success, true, `ISO-serialized Date cursor "${serialized}" must pass Zod datetime() validation`);
  });
});

// ─── Hypothesis D: success_rate math ─────────────────────────────────────────

describe('Hypothesis D — success_rate calculation edge cases', () => {
  function calcSuccessRate(successCount: number, totalFired: number): number {
    return totalFired > 0 ? Math.round((successCount / totalFired) * 10000) / 100 : 0;
  }

  it('returns 0 when no actions fired (zero-division guard)', () => {
    assert.equal(calcSuccessRate(0, 0), 0);
  });

  it('returns 100 when all actions succeeded', () => {
    assert.equal(calcSuccessRate(50, 50), 100);
  });

  it('returns 50 for half success', () => {
    assert.equal(calcSuccessRate(5, 10), 50);
  });

  it('rounds to 2 decimal places (1/3 → 33.33)', () => {
    assert.equal(calcSuccessRate(1, 3), 33.33);
  });

  it('rounds correctly (2/3 → 66.67)', () => {
    assert.equal(calcSuccessRate(2, 3), 66.67);
  });

  it('returns 0 when success count is 0 but actions fired', () => {
    assert.equal(calcSuccessRate(0, 100), 0);
  });
});

// ─── Hypothesis A: fastify-print-routes presence ─────────────────────────────

describe('Hypothesis A — fastify-print-routes in api/index.ts', () => {
  it('fastify-print-routes package is present in node_modules', async () => {
    let found = true;
    try {
      await import('fastify-print-routes');
    } catch {
      found = false;
    }
    assert.equal(found, true, 'fastify-print-routes must be importable — it was a pre-existing dependency');
  });

  it('src/api/index.ts registers fastify-print-routes', async () => {
    const src = await import('node:fs/promises');
    const content = await src.readFile('./src/api/index.ts', 'utf8');
    assert.ok(
      content.includes('fastify-print-routes'),
      'src/api/index.ts should import and register fastify-print-routes (was accidentally dropped in Phase 6)',
    );
  });
});

// ─── Status enum validation ───────────────────────────────────────────────────

describe('status enum validation in listLogsQuerySchema', () => {
  it('accepts all valid status values', () => {
    for (const status of VALID_STATUSES) {
      const r = listLogsQuerySchema.safeParse({ status });
      assert.equal(r.success, true, `should accept status="${status}"`);
    }
  });

  it('rejects an invalid status value', () => {
    const r = listLogsQuerySchema.safeParse({ status: 'unknown' });
    assert.equal(r.success, false, 'should reject unknown status');
  });

  it('allows omitting status (optional)', () => {
    const r = listLogsQuerySchema.safeParse({});
    assert.equal(r.success, true);
    assert.equal(r.data?.status, undefined);
  });
});
