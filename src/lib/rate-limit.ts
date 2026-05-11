/**
 * Public-API rate-limit middleware (fixed-window, per-IP, KV-backed).
 *
 * Mounted at `/api/v1/ghost-emf/*` in `src/index.ts`. Every successful request
 * increments a minute-bucketed counter in {@link Env.RATE_LIMIT_KV}; when the
 * counter exceeds {@link getPublicRateLimit}, the middleware throws a
 * `429 RATE_LIMITED` {@link ApiError} that the global `onError` handler converts
 * into the canonical error envelope.
 *
 * The middleware also injects CORS headers + `x-ratelimit-*` response headers
 * so browser clients can self-throttle.
 *
 * @packageDocumentation
 */

import { createMiddleware } from "hono/factory";

import { ApiError } from "./errors";
import { getPublicRateLimit } from "./config";
import type { AppVariables, Env } from "../types";

type Bindings = {
  Bindings: Env;
  Variables: AppVariables;
};

/**
 * Resolve the originating IP for the current request.
 *
 * Resolution order:
 *  1. `cf-connecting-ip` (set by Cloudflare on every edge request).
 *  2. First entry of `x-forwarded-for` (development / proxied environments).
 *  3. The literal string `"unknown"` (defensive fallback — KV bucket still
 *     groups these together, which is the desired conservative behavior).
 */
function getIpAddress(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * Hono middleware enforcing the public per-IP rate limit.
 *
 * Behavior:
 *  - If `RATE_LIMIT_KV` is not bound, the middleware is a no-op (still attaches
 *    CORS headers). This keeps `wrangler dev` ergonomic when KV is not wired up.
 *  - `OPTIONS` requests bypass the counter so CORS preflight is never throttled.
 *  - Counter key: `rate-limit:public:<ip>:<minute-bucket>` where
 *    `minute-bucket = floor(Date.now() / 60_000)`.
 *  - KV entries expire after 120 s — twice the window length, providing a
 *    safety margin for clock skew without growing the namespace unbounded.
 *  - Headers exposed: `x-ratelimit-limit`, `x-ratelimit-remaining`,
 *    `x-ratelimit-reset` (epoch seconds at which the bucket rolls over).
 *
 * @throws {@link ApiError} `RATE_LIMITED` (`429`) with `{ limit, resetAt }` details
 *         when the per-minute budget is exhausted.
 */
export const publicReadRateLimit = createMiddleware<Bindings>(async (c, next) => {
  if (!c.env.RATE_LIMIT_KV) {
    await next();
    c.header("access-control-allow-origin", "*");
    c.header("access-control-allow-methods", "GET, OPTIONS");
    c.header("access-control-allow-headers", "Content-Type");
    c.header("access-control-expose-headers", "X-Request-ID");
    return;
  }

  if (c.req.method === "OPTIONS") {
    await next();
    return;
  }

  const limit = getPublicRateLimit(c.env);
  const ip = getIpAddress(c.req.raw);
  const minuteBucket = Math.floor(Date.now() / 60_000);
  const resetAt = (minuteBucket + 1) * 60;
  const key = `rate-limit:public:${ip}:${minuteBucket}`;
  const current = Number.parseInt((await c.env.RATE_LIMIT_KV.get(key)) ?? "0", 10);

  if (current >= limit) {
    throw new ApiError("Rate limit exceeded. Slow down and try again in a minute.", 429, "RATE_LIMITED", {
      limit,
      resetAt,
    });
  }

  await c.env.RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: 120 });

  await next();

  c.header("access-control-allow-origin", "*");
  c.header("access-control-allow-methods", "GET, OPTIONS");
  c.header("access-control-allow-headers", "Content-Type");
  c.header("access-control-expose-headers", "X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset");
  c.header("x-ratelimit-limit", String(limit));
  c.header("x-ratelimit-remaining", String(Math.max(limit - current - 1, 0)));
  c.header("x-ratelimit-reset", String(resetAt));
});
