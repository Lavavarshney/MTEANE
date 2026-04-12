import type { Executor } from './types';
import { WebhookExecutor } from './webhook';
import { EmailExecutor } from './email';
import { SlackExecutor } from './slack';

export class UnknownActionTypeError extends Error {
  constructor(actionType: string) {
    super(`Unknown action type: "${actionType}". Registered types: webhook, email, slack`);
    this.name = 'UnknownActionTypeError';
  }
}

const registry = new Map<string, Executor>([
  ['webhook', new WebhookExecutor()],
  ['email', new EmailExecutor()],
  ['slack', new SlackExecutor()],
]);

/**
 * Returns the executor for the given action type.
 * Throws UnknownActionTypeError if the type is not registered.
 * Adding a new executor: instantiate it and add an entry to the Map above.
 */
export function getExecutor(actionType: string): Executor {
  const executor = registry.get(actionType);
  if (!executor) {
    throw new UnknownActionTypeError(actionType);
  }
  return executor;
}
