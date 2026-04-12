import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { dlqQueue } from '../../queue/dlqQueue';
import { reEnqueueEvent } from '../../queue/eventsQueue';
import { updateActionLogsByEventId } from '../action-logs/action-logs.model';
import { logger } from '../../utils/logger';

const retryParamsSchema = z.object({
  job_id: z.string().min(1),
});

export const listDlqHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const jobs = await dlqQueue.getJobs(['failed', 'completed', 'waiting', 'delayed', 'active']);

  const orgJobs = jobs
    .filter(job => job.data?.orgId === request.org.id)
    .map(job => ({
      id: job.id,
      eventId: job.data.eventId,
      orgId: job.data.orgId,
      eventType: job.data.eventType,
      failedReason: job.data.failedReason,
      finalAttempt: job.data.finalAttempt,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
    }));

  return reply.status(200).send({ jobs: orgJobs });
};

export const retryDlqJobHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const parsedParams = retryParamsSchema.safeParse(request.params);
  if (!parsedParams.success) {
    return reply.status(400).send({ message: 'Invalid job_id' });
  }

  const job = await dlqQueue.getJob(parsedParams.data.job_id);
  if (!job) {
    return reply.status(404).send({ message: 'DLQ job not found' });
  }

  // Verify org ownership before allowing retry
  if (job.data.orgId !== request.org.id) {
    return reply.status(403).send({ message: 'Access denied to this job' });
  }

  const { eventId, orgId, eventType } = job.data as {
    eventId: string;
    orgId: string;
    eventType: string;
  };

  // Mark action_logs as 'retrying' before re-enqueuing
  await updateActionLogsByEventId(eventId, 'retrying').catch(err =>
    logger.error(
      { event_id: eventId, error: (err as Error).message },
      'Failed to mark action logs as retrying',
    ),
  );

  // Re-enqueue into the main events queue
  await reEnqueueEvent(eventId, orgId, eventType);

  // Remove the job from DLQ now that it's been requeued
  await job.remove();

  logger.info({ event_id: eventId, dlq_job_id: job.id }, 'DLQ job re-enqueued');

  return reply.status(200).send({ message: 'Job re-enqueued successfully', eventId });
};
