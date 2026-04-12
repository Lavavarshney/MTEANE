import { resolvePath } from '../utils/resolvePath';

export interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

/**
 * Narrows an unknown value to a Condition.
 * Used in the worker to safely pass rule.condition (typed as Record<string, unknown>) to evaluate().
 */
export function isCondition(obj: unknown): obj is Condition {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Record<string, unknown>).field === 'string' &&
    typeof (obj as Record<string, unknown>).operator === 'string' &&
    'value' in (obj as object)
  );
}

/**
 * Evaluate a condition against a payload.
 * Returns true if the condition matches, false otherwise.
 * Throws if the condition is malformed or operator is unknown.
 */
export function evaluate(condition: Condition, payload: Record<string, unknown>): boolean {
  const { field, operator, value } = condition;

  if (!field || !operator) {
    throw new Error('Condition must have field and operator');
  }

  const fieldValue = resolvePath(payload, field);

  switch (operator) {
    case 'eq':
      return fieldValue === value;

    case 'neq':
      return fieldValue !== value;

    case 'gt':
      return Number(fieldValue) > Number(value);

    case 'gte':
      return Number(fieldValue) >= Number(value);

    case 'lt':
      return Number(fieldValue) < Number(value);

    case 'lte':
      return Number(fieldValue) <= Number(value);

    case 'in': {
      if (!Array.isArray(value)) {
        throw new Error('in operator requires value to be an array');
      }
      return value.includes(fieldValue);
    }

    case 'contains': {
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return fieldValue.includes(value);
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(value);
      }
      return false;
    }

    case 'startsWith': {
      if (typeof fieldValue !== 'string' || typeof value !== 'string') {
        return false;
      }
      return fieldValue.startsWith(value);
    }

    case 'endsWith': {
      if (typeof fieldValue !== 'string' || typeof value !== 'string') {
        return false;
      }
      return fieldValue.endsWith(value);
    }

    case 'exists':
      return fieldValue !== null && fieldValue !== undefined;

    case 'regex': {
      if (typeof fieldValue !== 'string' || typeof value !== 'string') {
        return false;
      }

      // Guard against ReDoS: reject patterns exceeding a safe length.
      const MAX_REGEX_LENGTH = 200;
      if (value.length > MAX_REGEX_LENGTH) {
        throw new Error(`Regex pattern too long (max ${MAX_REGEX_LENGTH} characters)`);
      }

      // Guard against catastrophic backtracking caused by nested quantifiers,
      // e.g. (a+)+ or (a*)* which produce exponential backtracking on worker threads.
      // The pattern matches: a group containing a repeating element, itself repeated.
      const NESTED_QUANTIFIER = /\([^)]*[+*{][^)]*\)\s*[+*{]/;
      if (NESTED_QUANTIFIER.test(value)) {
        throw new Error('Dangerous regex pattern detected (potential ReDoS via nested quantifiers)');
      }

      try {
        const regex = new RegExp(value);
        return regex.test(fieldValue);
      } catch {
        throw new Error(`Invalid regex pattern: ${value}`);
      }
    }

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}
