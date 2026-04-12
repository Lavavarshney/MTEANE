import 'dotenv/config';
import { Worker } from 'bullmq';
import { getBullMQConnection } from '../queue/client';
import { config } from '../shared/config';
import { fetchEventWithOrg } from '../resources/events/events.model';
import { getActiveRules, createActionLog, type Rule } from '../resources/rules/rules.model';
import { getCachedRules, setCachedRules } from '../cache/rules';
import { evaluate } from '../engine/evaluator';
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
			await job.discard();
			throw new Error('Event not found in DB');
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

		// Day 9-10: evaluate rules against event payload
		const matchedRules: Rule[] = [];

		for (const rule of rules) {
			try {
				const isMatched = evaluate(rule.condition as any, event.payload);
				if (isMatched) {
					matchedRules.push(rule);
				}
			} catch (err) {
				logger.error(
					{
						event_id: eventId,
						rule_id: rule.id,
						error: err instanceof Error ? err.message : String(err),
					},
					'Error evaluating rule condition — skipping rule'
				);
				// Continue to next rule instead of failing entire job
			}
		}

		logger.info(
			{
				event_id: eventId,
				matched: matchedRules.length,
				total: rules.length,
			},
			'Rule matching complete'
		);

		// Day 10: insert action_logs for matched rules with pending status
		for (const rule of matchedRules) {
			try {
				await createActionLog(eventId, rule.id, orgId, 'pending');
			} catch (err) {
				logger.error(
					{
						event_id: eventId,
						rule_id: rule.id,
						error: err instanceof Error ? err.message : String(err),
					},
					'Failed to create action log'
				);
				// Log the error but don't fail the job — action log is best-effort
			}
		}

		logger.info(
			{ event_id: eventId, status: 'completed', matched_rules: matchedRules.length },
			'Event processed'
		);
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
