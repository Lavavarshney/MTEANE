import type { PlanType } from '../resources/auth/auth.model';

export interface PlanLimits {
  /** Maximum POST /events requests per 60-second sliding window */
  requestsPerMinute: number;
  /** Maximum number of active rules per org */
  maxRules: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free:       { requestsPerMinute: 100,   maxRules: 10   },
  pro:        { requestsPerMinute: 1000,  maxRules: 100  },
  enterprise: { requestsPerMinute: 10000, maxRules: 1000 },
};
