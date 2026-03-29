import 'dotenv/config';
import { Worker, UnrecoverableError } from 'bullmq';
import { getBullMQConnection } from '../queue/client';
import { config } from '../shared/config';
import { fetchEventWithOrg } from '../resources/events/events.model';
import { getActiveRules } from '../resources/rules/rules.model';
import { getCachedRules, setCachedRules } from '../cache/rules';
import { logger } from '../utils/logger';

const worker = new Worker(
	'events',
	async job => {
		const { eventId, orgId, eventType } = job.data as {
			eventId: string;
			orgId: string;
			eventType: string;
		};

		logger.info(
			{
				event_id: eventId,
				org_id: orgId,
				event_type: eventType,
				attempt: job.attemptsMade,
				status: 'processing'
			},
			'Processing event'
		);

		// Day 6: fetch full event + org data from DB
		const event = await fetchEventWithOrg(eventId);
		if (!event) {
			logger.warn(
				{ event_id: eventId },
				'Event not found in DB — discarding job (no retry)'
			);
			throw new UnrecoverableError('Event not found in DB');
		}

		// Day 7: rules with Redis cache (60s TTL)
		let rules = await getCachedRules(orgId, eventType);
		const cacheHit = rules !== null;

		if (!rules) {
			rules = await getActiveRules(orgId, eventType);
			await setCachedRules(orgId, eventType, rules);
		}

		logger.info(
			{ event_id: eventId, rules_count: rules.length, cache_hit: cacheHit },
			'Rules fetched'
		);

		logger.info({ event_id: eventId, status: 'completed' }, 'Event processed');
	},
	{
		connection: getBullMQConnection(),
		concurrency: config.WORKER_CONCURRENCY
	}
);

worker.on('failed', (job, err) => {
	logger.error(
		{ event_id: job?.data?.eventId, error: err.message, status: 'failed' },
		'Job failed'
	);
});

const shutdown = async () => {
	logger.info(
		'[worker] Shutting down gracefully — draining in-progress jobs...'
	);
	await worker.close();
	process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('[worker] started — waiting for jobs');
