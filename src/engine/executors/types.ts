import type { EventWithOrg } from '../../resources/events/events.model';

export interface ExecutionResult {
  success: boolean;
  response?: string;
  error?: string;
}

export interface Executor {
  execute(config: unknown, event: EventWithOrg): Promise<ExecutionResult>;
}
