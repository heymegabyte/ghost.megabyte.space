export function applyResponseHeaders(response: Response, headers: HeadersInit): Response {
  const next = new Response(response.body, response);

  new Headers(headers).forEach((value, key) => {
    next.headers.set(key, value);
  });

  return next;
}

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
