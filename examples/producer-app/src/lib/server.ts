/**
 * Server-side fetch helper.
 * Injects the TRIGGRR_API_KEY from the environment so it never
 * reaches the browser — all client-side code calls /api/* routes instead.
 */
export function triggrrFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = process.env.TRIGGRR_URL ?? 'http://localhost:3000';
  const key = process.env.TRIGGRR_API_KEY ?? '';
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      ...(init?.headers ?? {}),
    },
  });
}
