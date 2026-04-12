/**
 * Keys that must never be traversed — reaching Object.prototype,
 * Function.prototype, or a constructor via rule conditions would allow
 * rules to match on unexpected host-object internals and could expose
 * framework implementation details.
 */
const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * Resolve a dot-notation path in an object.
 * Example: resolvePath({ order: { amount: 100 } }, 'order.amount') => 100
 *
 * Blocked paths: any segment that is __proto__, prototype, or constructor
 * returns undefined immediately to prevent prototype-chain traversal.
 */
export function resolvePath(obj: Record<string, unknown> | undefined, path: string): unknown {
  if (obj === undefined || obj === null) {
    return undefined;
  }

  return path.split('.').reduce((current, key) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (BLOCKED_KEYS.has(key)) {
      return undefined;
    }

    if (typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, key)) {
      return (current as Record<string, unknown>)[key];
    }

    return undefined;
  }, obj as unknown);
}
