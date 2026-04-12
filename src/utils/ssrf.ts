/**
 * SSRF (Server-Side Request Forgery) guard.
 *
 * Any user-controlled URL used by an executor (webhook, Slack) must pass
 * this check before a fetch() is issued. Blocking private/reserved ranges
 * prevents tenants from using Triggrr as a proxy into internal networks,
 * cloud metadata endpoints, or local services.
 *
 * Blocked ranges:
 *  - 127.0.0.0/8       — loopback
 *  - 10.0.0.0/8        — RFC 1918 private
 *  - 172.16.0.0/12     — RFC 1918 private
 *  - 192.168.0.0/16    — RFC 1918 private
 *  - 169.254.0.0/16    — link-local / AWS instance metadata (169.254.169.254)
 *  - 0.0.0.0/8         — "this" network
 *  - ::1               — IPv6 loopback
 *  - fc00::/7          — IPv6 unique-local (fd00::/8 + fc00::/8)
 *  - Non-http(s) schemes
 */

const PRIVATE_IPV4 = [
  /^127\.\d+\.\d+\.\d+$/,           // 127.0.0.0/8 loopback
  /^10\.\d+\.\d+\.\d+$/,            // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // 172.16.0.0/12
  /^192\.168\.\d+\.\d+$/,           // 192.168.0.0/16
  /^169\.254\.\d+\.\d+$/,           // link-local / metadata
  /^0\.\d+\.\d+\.\d+$/,             // 0.0.0.0/8
];

const PRIVATE_IPV6 = [
  /^::1$/,                           // loopback
  /^f[cd][0-9a-f]{2}:/i,            // fc00::/7 unique-local
  /^\[::1\]$/,                       // bracketed loopback in URLs
  /^\[f[cd][0-9a-f]{2}:/i,          // bracketed unique-local in URLs
];

/**
 * Returns true if the URL points to a private/reserved address that
 * should never be reached by an outbound executor.
 */
export function isPrivateUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    // Unparseable URLs are treated as private (deny by default).
    return true;
  }

  // Only allow http and https — block file://, ftp://, etc.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return true;
  }

  const host = parsed.hostname.toLowerCase();

  // Strip IPv6 brackets for matching
  const bare = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  for (const re of PRIVATE_IPV4) {
    if (re.test(bare)) return true;
  }

  for (const re of PRIVATE_IPV6) {
    if (re.test(bare) || re.test(host)) return true;
  }

  return false;
}
