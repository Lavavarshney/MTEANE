import { query } from '../../shared/db';

export interface EventRow {
  id: string;
  org_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  status: 'received';
  created_at: string;
}

type PgErrorLike = Error & { code?: string; constraint?: string };

async function findByIdempotency(
  orgId: string,
  idempotencyKey: string,
): Promise<EventRow | null> {
  const existing = await query<EventRow>(
    `SELECT id, org_id, event_type, payload, idempotency_key, status, created_at
     FROM events
     WHERE org_id = $1 AND idempotency_key = $2
     LIMIT 1`,
    [orgId, idempotencyKey],
  );

  return existing.rows[0] ?? null;
}

export async function insertEvent(
  orgId: string,
  eventType: string,
  payload: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<EventRow> {
  if (idempotencyKey) {
    const existing = await findByIdempotency(orgId, idempotencyKey);
    if (existing) {
      return existing;
    }
  }

  try {
    const result = await query<EventRow>(
      `INSERT INTO events (org_id, event_type, payload, idempotency_key)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING id, org_id, event_type, payload, idempotency_key, status, created_at`,
      [orgId, eventType, JSON.stringify(payload), idempotencyKey ?? null],
    );

    if (!result.rows[0]) {
      throw new Error('Failed to insert event');
    }

    return result.rows[0];
  } catch (error) {
    const pgError = error as PgErrorLike;
    if (
      idempotencyKey &&
      pgError.code === '23505' &&
      pgError.constraint === 'idx_events_idempotency'
    ) {
      const existing = await findByIdempotency(orgId, idempotencyKey);
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}
