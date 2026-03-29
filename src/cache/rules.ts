import { redis } from '../shared/queue';
import type { Rule } from '../resources/rules/rules.model';

const CACHE_TTL_SECONDS = 60;

const cacheKey = (orgId: string, eventType: string) =>
  `rules:${orgId}:${eventType}`;

export async function getCachedRules(
  orgId: string,
  eventType: string,
): Promise<Rule[] | null> {
  const cached = await redis.get(cacheKey(orgId, eventType));
  if (!cached) return null;
  return JSON.parse(cached) as Rule[];
}

export async function setCachedRules(
  orgId: string,
  eventType: string,
  rules: Rule[],
): Promise<void> {
  await redis.set(cacheKey(orgId, eventType), JSON.stringify(rules), 'EX', CACHE_TTL_SECONDS);
}

export async function invalidateRulesCache(
  orgId: string,
  eventType: string,
): Promise<void> {
  await redis.del(cacheKey(orgId, eventType));
}
