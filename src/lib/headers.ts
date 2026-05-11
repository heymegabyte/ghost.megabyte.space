/**
 * Security + caching response-header helpers.
 *
 * Hardens every Worker response with the modern security header set
 * (HSTS, CSP, COOP, COEP-compatible CORP, Permissions-Policy) and provides
 * a non-destructive way to overlay additional headers onto an upstream Response.
 *
 * The `/api/docs` route receives a relaxed CSP (Scalar API reference loads
 * Cloudflare-hosted CDN scripts + inline styles), while every other route gets
 * the strict policy.
 *
 * @packageDocumentation
 */

/**
 * Return a fresh `Response` that copies the body + status from `response` and
 * overlays `headers` on top of the existing header set.
 *
 * Native `Response` instances are immutable — this helper is the supported way
 * to add cache-control / security headers without losing the upstream body.
 *
 * @example
 * ```ts
 * return applyResponseHeaders(assetResponse, {
 *   "cache-control": "public, max-age=31536000, immutable",
 * });
 * ```
 *
 * @param response Upstream `Response` (e.g. from `env.ASSETS.fetch(...)`).
 * @param headers  Headers to set or overwrite (case-insensitive).
 */
export function applyResponseHeaders(response: Response, headers: HeadersInit): Response {
  const next = new Response(response.body, response);

  new Headers(headers).forEach((value, key) => {
    next.headers.set(key, value);
  });

  return next;
}

/**
 * Build the canonical security-header set for a given request path.
 *
 * Routes under `/api/docs` get a relaxed CSP because the Scalar API reference
 * needs jsDelivr-hosted scripts, inline `data:` images, and `unsafe-inline`
 * styles. Every other route gets the strict CSP with explicit allowlists for
 * Cloudflare Insights, jsDelivr, Google Maps, YouTube-nocookie, OpenStreetMap
 * tiles, and Google Fonts.
 *
 * Cross-origin headers are pinned to `same-origin` (COOP) and `same-site` (CORP)
 * for the strongest cross-origin isolation that still allows static assets to load.
 *
 * @param pathname Request URL pathname (e.g. `c.req.path` or `new URL(c.req.url).pathname`).
 */
export function getSecurityHeaders(pathname: string): Headers {
  const headers = new Headers({
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "permissions-policy":
      "geolocation=(), microphone=(), camera=(), accelerometer=(self), gyroscope=(self), magnetometer=(), payment=(), usb=(), interest-cohort=()",
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-site",
    "origin-agent-cluster": "?1",
    "x-permitted-cross-domain-policies": "none",
    "x-dns-prefetch-control": "on",
  });

  if (pathname.startsWith("/api/docs")) {
    headers.set(
      "content-security-policy",
      "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; base-uri 'self';",
    );
    return headers;
  }

  headers.set(
    "content-security-policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https://i.ytimg.com https://i9.ytimg.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://unpkg.com",
      "object-src 'none'",
      "frame-src https://www.google.com https://maps.google.com https://www.google.com/maps https://www.youtube-nocookie.com https://www.youtube.com",
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "connect-src 'self' https://cloudflareinsights.com https://cdn.jsdelivr.net wss:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "manifest-src 'self'",
    ].join("; "),
  );

  return headers;
}
