import type { EventWithOrg } from '../../resources/events/events.model';
import type { Executor, ExecutionResult } from './types';
import { isPrivateUrl } from '../../utils/ssrf';

interface SlackConfig {
  webhook_url: string;
}

function isSlackConfig(cfg: unknown): cfg is SlackConfig {
  return (
    typeof cfg === 'object' &&
    cfg !== null &&
    typeof (cfg as Record<string, unknown>).webhook_url === 'string'
  );
}

const TIMEOUT_MS = 10_000;

export class SlackExecutor implements Executor {
  async execute(rawConfig: unknown, event: EventWithOrg): Promise<ExecutionResult> {
    if (!isSlackConfig(rawConfig)) {
      return { success: false, error: 'Invalid slack config: missing webhook_url' };
    }

    if (isPrivateUrl(rawConfig.webhook_url)) {
      return { success: false, error: 'SSRF protection: Slack webhook URL must be a public HTTP/HTTPS address' };
    }

    const text = [
      `*[${event.org_name}]* New event: \`${event.event_type}\``,
      `Event ID: ${event.id}`,
      `Payload summary: \`${JSON.stringify(event.payload).slice(0, 200)}\``,
    ].join('\n');

    let response: Response;
    try {
      response = await fetch(rawConfig.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Request failed: ${message}` };
    }

    const responseBody = await response.text().catch(() => '');

    // Slack returns the plain text "ok" on success
    if (response.ok && responseBody.trim() === 'ok') {
      return { success: true, response: responseBody };
    }

    return {
      success: false,
      error: `HTTP ${response.status}: ${responseBody || response.statusText}`,
    };
  }
}
