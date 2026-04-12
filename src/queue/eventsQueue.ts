import { Queue } from 'bullmq';
import { getBullMQConnection } from './client';
import { logger } from '../utils/logger';

const eventsQueue = new Queue('events', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export async function enqueueEvent(
  eventId: string,
  orgId: string,
  eventType: string,
): Promise<void> {
  // Duplicate job guard: use eventId as the BullMQ job ID so the same event
  // is never queued twice. If a job with this ID is already waiting, active,
  // or delayed we skip adding it — BullMQ will deduplicate on jobId too, but
  // an explicit check lets us log a warning for observability.
  const existing = await eventsQueue.getJob(eventId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'waiting' || state === 'active' || state === 'delayed') {
      logger.warn({ event_id: eventId, job_state: state }, 'Duplicate job guard: event already queued, skipping');
      return;
    }
  }

  await eventsQueue.add(eventType, { eventId, orgId, eventType }, { jobId: eventId });
}

/** Close the BullMQ queue connection. Call during API graceful shutdown. */
export async function closeQueue(): Promise<void> {
  await eventsQueue.close();
}

/** Re-enqueue an event from the DLQ back into the main events queue. */
export async function reEnqueueEvent(
  eventId: string,
  orgId: string,
  eventType: string,
): Promise<void> {
  // Remove any existing completed/failed job with this ID before re-adding
  const existing = await eventsQueue.getJob(eventId);
  if (existing) {
    await existing.remove();
  }
  await eventsQueue.add(eventType, { eventId, orgId, eventType }, { jobId: eventId });
}
