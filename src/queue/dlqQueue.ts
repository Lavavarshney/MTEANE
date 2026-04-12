import { Queue } from 'bullmq';
import { getBullMQConnection } from './client';

export interface DlqJobData {
  eventId: string;
  orgId: string;
  eventType: string;
  failedReason: string;
  finalAttempt: number;
}

export const dlqQueue = new Queue('dead-letter', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    // DLQ jobs are kept indefinitely until manually retried or deleted
    removeOnComplete: false,
    removeOnFail: false,
  },
});

/** Add a job to the dead-letter queue after all retry attempts are exhausted. */
export async function addToDlq(data: DlqJobData): Promise<void> {
  await dlqQueue.add(data.eventType, data);
}

/** Close the DLQ queue connection. Call during API/worker graceful shutdown. */
export async function closeDlqQueue(): Promise<void> {
  await dlqQueue.close();
}
