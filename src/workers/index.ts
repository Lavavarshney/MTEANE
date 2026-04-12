import 'dotenv/config';
import { Worker } from 'bullmq';
import { getBullMQConnection } from '../queue/client';
import { config } from '../shared/config';
import { fetchEventWithOrg } from '../resources/events/events.model';
import { getActiveRules } from '../resources/rules/rules.model';
import type { Rule } from '../resources/rules/rules.model';
import { getCachedRules, setCachedRules } from '../cache/rules';
import { evaluate, isCondition } from '../engine';
import { getExecutor, UnknownActionTypeError } from '../engine';
import { findOrCreateActionLog, updateActionLog, updateActionLogsByEventId } from '../resources/action-logs/action-logs.model';
import { addToDlq, closeDlqQueue } from '../queue/dlqQueue';
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
				status: 'processing',
			},
			'Processing event',
		);

		// Fetch full event + org data from DB
		const event = await fetchEventWithOrg(eventId);
		if (!event) {
			logger.warn(
				{ event_id: eventId },
				'Event not found in DB — discarding job permanently',
			);
			await job.discard();
			// Return (not throw) so the job ends cleanly without emitting a failed event
			return;
		}

		// Fetch rules: try cache first (60s TTL), fall back to DB
		let rules = await getCachedRules(orgId, eventType);
		const cacheHit = rules !== null;

		if (!rules) {
			rules = await getActiveRules(orgId, eventType);
			await setCachedRules(orgId, eventType, rules);
		}

		logger.info(
			{ event_id: eventId, rules_count: rules.length, cache_hit: cacheHit },
			'Rules fetched',
		);

		// Match rules against event payload
		const matchedRules: Rule[] = [];

		for (const rule of rules) {
			try {
				if (!isCondition(rule.condition)) {
					throw new Error(`Rule ${rule.id} has a malformed condition object`);
				}
				if (evaluate(rule.condition, event.payload)) {
					matchedRules.push(rule);
				}
			} catch (err) {
				logger.error(
					{
						event_id: eventId,
						rule_id: rule.id,
						error: err instanceof Error ? err.message : String(err),
					},
					'Error evaluating rule condition — skipping rule',
				);
			}
		}

		logger.info(
			{
				event_id: eventId,
				matched: matchedRules.length,
				total: rules.length,
			},
			'Rule matching complete',
		);

		// Execute matched rules and record results in action_logs
		for (const rule of matchedRules) {
			// find-or-create: safe on BullMQ retries — same row gets reset to pending
			let actionLog: Awaited<ReturnType<typeof findOrCreateActionLog>>;
			try {
				actionLog = await findOrCreateActionLog(event.id, rule.id, orgId);
			} catch (err) {
				logger.error(
					{
						event_id: eventId,
						rule_id: rule.id,
						error: err instanceof Error ? err.message : String(err),
					},
					'Failed to find or create action log — skipping rule',
				);
				continue;
			}

			let executor;
			try {
				executor = getExecutor(rule.action_type);
			} catch (err) {
				const message = err instanceof UnknownActionTypeError
					? err.message
					: `Unexpected error getting executor: ${err instanceof Error ? err.message : String(err)}`;

				logger.error({ event_id: eventId, rule_id: rule.id, error: message }, 'Unknown action type');

				await updateActionLog(actionLog.id, {
					status: 'failed',
					error_message: message,
					executed_at: new Date(),
				}).catch(() => {});
				continue;
			}

			try {
				const result = await executor.execute(rule.action_config, event);

				if (result.success) {
					await updateActionLog(actionLog.id, {
						status: 'success',
						response_body: result.response,
						executed_at: new Date(),
					});

					logger.info(
						{ event_id: eventId, rule_id: rule.id, action_log_id: actionLog.id },
						'Action executed successfully',
					);
				} else {
					await updateActionLog(actionLog.id, {
						status: 'failed',
						error_message: result.error,
						executed_at: new Date(),
					});

					logger.warn(
						{
							event_id: eventId,
							rule_id: rule.id,
							action_log_id: actionLog.id,
							error: result.error,
						},
						'Action execution failed',
					);
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);

				await updateActionLog(actionLog.id, {
					status: 'failed',
					error_message: message,
					executed_at: new Date(),
				}).catch(() => {});

				logger.error(
					{
						event_id: eventId,
						rule_id: rule.id,
						action_log_id: actionLog.id,
						error: message,
					},
					'Unexpected error during action execution — skipping rule',
				);
			}
		}

		logger.info(
			{ event_id: eventId, status: 'completed', matched_rules: matchedRules.length },
			'Event processed',
		);
	},
	{
		connection: getBullMQConnection(),
		concurrency: config.WORKER_CONCURRENCY,
	},
);

worker.on('failed', async (job, err) => {
	const isExhausted = job != null && job.attemptsMade >= (job.opts.attempts ?? 1);

	logger.error(
		{
			event_id: job?.data?.eventId,
			error: err.message,
			attempt: job?.attemptsMade,
			exhausted: isExhausted,
			status: 'failed',
		},
		'Job failed',
	);

	if (isExhausted && job) {
		const { eventId, orgId, eventType } = job.data as {
			eventId: string;
			orgId: string;
			eventType: string;
		};

		await addToDlq({
			eventId,
			orgId,
			eventType,
			failedReason: err.message,
			finalAttempt: job.attemptsMade,
		}).catch(dlqErr =>
			logger.error({ event_id: eventId, error: (dlqErr as Error).message }, 'Failed to add job to DLQ'),
		);

		await updateActionLogsByEventId(eventId, 'dead', orgId).catch(dbErr =>
			logger.error({ event_id: eventId, error: (dbErr as Error).message }, 'Failed to mark action logs as dead'),
		);

		logger.warn({ event_id: eventId, event_type: eventType }, 'Job exhausted — moved to DLQ');
	}
});

const shutdown = async () => {
	logger.info('[worker] Shutting down gracefully — draining in-progress jobs...');
	await worker.close();
	await closeDlqQueue();
	process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('[worker] started — waiting for jobs');
