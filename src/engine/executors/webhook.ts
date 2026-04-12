import type { EventWithOrg } from '../../resources/events/events.model';
import type { Executor, ExecutionResult } from './types';

interface WebhookConfig {
  url: string;
}

function isWebhookConfig(config: unknown): config is WebhookConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    typeof (config as Record<string, unknown>).url === 'string'
  );
}

const MAX_RESPONSE_LENGTH = 1000;
const TIMEOUT_MS = 10_000;

export class WebhookExecutor implements Executor {
  async execute(config: unknown, event: EventWithOrg): Promise<ExecutionResult> {
    if (!isWebhookConfig(config)) {
      return { success: false, error: 'Invalid webhook config: missing url' };
    }

    let response: Response;
    try {
      response = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          event_type: event.event_type,
          org_id: event.org_id,
          payload: event.payload,
          received_at: event.created_at,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Request failed: ${message}` };
    }

    let responseBody = '';
    try {
      const raw = await response.text();
      responseBody = raw.length > MAX_RESPONSE_LENGTH ? raw.slice(0, MAX_RESPONSE_LENGTH) + '…' : raw;
    } catch {
      // Response body is best-effort
    }

    if (response.ok) {
      return { success: true, response: responseBody };
    }

    return {
      success: false,
      error: `HTTP ${response.status} ${response.statusText}`,
      response: responseBody,
    };
  }
}
