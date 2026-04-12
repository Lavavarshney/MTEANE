export interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

/**
 * Resolve a dot-notation path in an object.
 * Example: resolvePath({ order: { amount: 100 } }, 'order.amount') => 100
 */
function resolvePath(obj: Record<string, unknown> | undefined, path: string): unknown {
  if (obj === undefined || obj === null) {
    return undefined;
  }

  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, obj as unknown);
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
      try {
        const regex = new RegExp(value);
        return regex.test(fieldValue);
      } catch (err) {
        throw new Error(`Invalid regex pattern: ${value}`);
      }
    }

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}
