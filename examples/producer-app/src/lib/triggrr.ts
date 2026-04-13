/**
 * Typed client for the Triggrr REST API.
 *
 * All methods target Next.js API proxy routes (/api/*) so the real
 * TRIGGRR_API_KEY never reaches the browser.
 */

// ── Shared types ──────────────────────────────────────────────────────────────

export interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

export interface Rule {
  id: string;
  name: string;
  event_type: string;
  condition: Condition;
  action_type: 'webhook' | 'email' | 'slack';
  action_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
}

export interface CreateRuleInput {
  name: string;
  event_type: string;
  condition: Condition;
  action_type: 'webhook' | 'email' | 'slack';
  action_config: Record<string, unknown>;
}

export interface ActionLog {
  id: string;
  event_id: string;
  rule_id: string;
  rule_name: string;
  rule_action_type: string;
  rule_event_type: string;
  status: 'pending' | 'success' | 'failed' | 'retrying' | 'dead';
  attempt_count: number;
  error_message: string | null;
  response_body: string | null;
  executed_at: string | null;
  created_at: string;
}

export interface TopRule {
  rule_id: string;
  rule_name: string;
  count: number;
}

export interface OrgStats {
  total: number;
  success: number;
  failed: number;
  dead: number;
  success_rate: number;
  top_rules: TopRule[];
}

export interface EventResponse {
  event_id: string;
  received_at: string;
  status: string;
}

export interface LogsResponse {
  logs: ActionLog[];
  next_cursor: string | null;
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((body as { message?: string }).message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Public API surface ────────────────────────────────────────────────────────

export const triggrr = {
  events: {
    send(eventType: string, payload: Record<string, unknown>): Promise<EventResponse> {
      return req<EventResponse>('/api/events', {
        method: 'POST',
        body: JSON.stringify({ event_type: eventType, payload }),
      });
    },
  },

  rules: {
    list(): Promise<{ rules: Rule[] }> {
      return req<{ rules: Rule[] }>('/api/rules');
    },
    create(input: CreateRuleInput): Promise<{ rule: Rule }> {
      return req<{ rule: Rule }>('/api/rules', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    toggle(id: string, is_active: boolean): Promise<{ rule: Rule }> {
      return req<{ rule: Rule }>(`/api/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active }),
      });
    },
    delete(id: string): Promise<{ message: string }> {
      return req<{ message: string }>(`/api/rules/${id}`, { method: 'DELETE' });
    },
  },

  logs: {
    list(params?: {
      status?: string;
      cursor?: string;
      limit?: number;
    }): Promise<LogsResponse> {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.cursor) qs.set('cursor', params.cursor);
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return req<LogsResponse>(`/api/logs${query ? `?${query}` : ''}`);
    },
  },

  stats: {
    get(): Promise<{ stats: OrgStats }> {
      return req<{ stats: OrgStats }>('/api/stats');
    },
  },
};
