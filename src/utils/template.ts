import { resolvePath } from './resolvePath';

/**
 * Interpolate a template string with {{dot.notation}} placeholders.
 * Missing or null paths resolve to an empty string rather than "undefined".
 *
 * Example:
 *   interpolate('Hello {{org.name}}, event: {{event_type}}', ctx)
 */
export function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, rawPath: string) => {
    const path = rawPath.trim();
    const val = resolvePath(context, path);
    return val !== undefined && val !== null ? String(val) : '';
  });
}
