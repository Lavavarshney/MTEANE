import { Queue } from 'bullmq';
import { getBullMQConnection } from './client';

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
  await eventsQueue.add(eventType, { eventId, orgId, eventType });
}
