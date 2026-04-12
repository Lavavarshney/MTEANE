/**
 * Resolve a dot-notation path in an object.
 * Example: resolvePath({ order: { amount: 100 } }, 'order.amount') => 100
 */
export function resolvePath(obj: Record<string, unknown> | undefined, path: string): unknown {
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
