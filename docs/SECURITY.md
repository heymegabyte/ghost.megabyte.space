# Security

> Companion to [`ARCHITECTURE.md`](./ARCHITECTURE.md) and [`ROUTES.md`](./ROUTES.md). Defines the production threat model, what is enforced today, and the gaps that are intentional vs. work-still-owed. The implementation lives in [`src/lib/headers.ts`](../src/lib/headers.ts), [`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts), and the global `app.onError` block in [`src/index.ts`](../src/index.ts).

## Threat model

ghost.megabyte.space is a single-tenant Cloudflare Worker fronting a public sensor + AI hotline. There is no user login, no PII collection, no payment surface. The high-value assets are:

1. **Sensor data integrity** — readings must reflect what the Home Assistant entity actually emitted; no spoofed `state` values.
2. **Cron continuity** — `*/1 * * * *` snapshots into `EMF_DB` must keep firing; gaps degrade `/history`, `/entropy`, `/random`, and `/export`.
3. **Origin protection** — Home Assistant + Anthropic + Workers AI are bandwidth- and quota-limited; every uncached read hits one of them.
4. **Phone-line abuse prevention** — `/api/v1/twilio/*` accepts arbitrary POST today (see § Twilio signature gap) and is fronted only by Twilio's own callback origin allowlist.

The primary adversaries we design against: scraper bots burning sensor cache, abusive callers gaming the AI hotline, and crawler floods burning Cache API quota on `/history`.

## Security headers (`src/lib/headers.ts`)

Every non-`/api/docs` response carries:

| Header | Value |
|---|---|
| `referrer-policy` | `strict-origin-when-cross-origin` |
| `x-content-type-options` | `nosniff` |
| `x-frame-options` | `DENY` |
| `permissions-policy` | `geolocation=(), microphone=(), camera=(), accelerometer=(self), gyroscope=(self), magnetometer=(), payment=(), usb=(), interest-cohort=()` |
| `strict-transport-security` | `max-age=63072000; includeSubDomains; preload` |
| `cross-origin-opener-policy` | `same-origin` |
| `cross-origin-resource-policy` | `same-site` |
| `origin-agent-cluster` | `?1` |
| `x-permitted-cross-domain-policies` | `none` |
| `x-dns-prefetch-control` | `on` |

## Content-Security-Policy

Two CSPs are emitted, picked by pathname.

### Strict CSP (every route except `/api/docs`)

```
default-src 'self';
base-uri 'self';
frame-ancestors 'none';
img-src 'self' data: blob: https://i.ytimg.com https://i9.ytimg.com
        https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org
        https://unpkg.com;
object-src 'none';
frame-src https://www.google.com https://maps.google.com
          https://www.google.com/maps https://www.youtube-nocookie.com
          https://www.youtube.com;
script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com
           https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
          https://cdn.jsdelivr.net;
connect-src 'self' https://cloudflareinsights.com
            https://cdn.jsdelivr.net wss:;
font-src 'self' data: https://fonts.gstatic.com;
manifest-src 'self';
```

`'unsafe-inline'` on `script-src` is a known soft-spot. The homepage ships inline chart-bootstrap blocks that depend on it. Path to nonces is tracked but not blocking — see § Known gaps.

### Relaxed CSP (`/api/docs` only)

Scalar API Reference loads jsDelivr-hosted ES modules + applies inline styles for its theme. The relaxed policy is scoped to the docs prefix exclusively and never bleeds onto adjacent routes.

```
default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval';
frame-ancestors 'none';
base-uri 'self';
```

## Rate limiting (`src/lib/rate-limit.ts`)

- **Scope**: applied as middleware to `/api/v1/ghost-emf/*` only. `/api/v1/sensors`, `/health`, `/api/v1/chat`, `/api/v1/twilio/*`, `/api/v1/transmissions*`, and the WebSocket route are intentionally exempt.
- **Algorithm**: fixed-window, per-IP, KV-backed. Key shape: `rate-limit:public:<ip>:<minute-bucket>` where `minute-bucket = floor(Date.now() / 60_000)`.
- **Budget**: `PUBLIC_API_RATE_LIMIT_PER_MINUTE=60` per IP (override via env). KV TTL is 120 s — twice the window so concurrent boundary requests can still read the prior bucket.
- **Headers exposed**: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset` (epoch seconds).
- **IP resolution order**: `cf-connecting-ip` → first entry of `x-forwarded-for` → literal `"unknown"` (defensive bucket; conservative, never permissive).
- **Degradation**: when `RATE_LIMIT_KV` is unbound the middleware is a no-op and still emits CORS headers. This is a deliberate dev-mode ergonomic.
- **CORS preflight bypass**: `OPTIONS` requests bypass the counter.
- **Limit-exceeded behavior**: throws an `ApiError("Rate limit exceeded…", 429, "RATE_LIMITED", { limit, resetAt })` which the global `onError` handler converts into the canonical JSON envelope.

The homepage chart polls `/api/v1/sensors` — that route is **deliberately** outside the rate-limit so a single visitor's polling cannot eat their quota for `/history` lookups.

## CORS

- `/api/v1/ghost-emf/*` middleware sets `access-control-allow-origin: *` + `GET, OPTIONS` methods + exposed rate-limit headers.
- A wildcard `OPTIONS /api/*` handler responds to preflight for the non-rate-limited routes.
- No credentials are accepted (`Access-Control-Allow-Credentials` is intentionally unset).

## Error envelope (no stack leakage)

`app.onError` in `src/index.ts` collapses every thrown error into:

```json
{
  "error":   "human-readable message",
  "code":    "SCREAMING_SNAKE_CASE_CODE",
  "details": "optional any",
  "requestId": "uuid-v4"
}
```

Mapping:
- `ApiError` → status + code verbatim.
- `HTTPException` → wrap as `HTTP_<status>` with the upstream message.
- Anything else → `500 INTERNAL_ERROR`. The original stack is `console.error`-logged but **never** returned in the response body.

`requestId` echoes the `x-request-id` header (server-generated UUID when absent) so an operator can correlate a client report to a single Worker log entry.

## Test helpers — 404 cloak (`TEST_HELPERS_ENABLED`)

`/__test/reset` and `/__test/seed` short-circuit to `404 NOT_FOUND` when `TEST_HELPERS_ENABLED !== "1"`. The 404 is intentional — we don't advertise the surface in production. `/__test/seed` additionally requires `MOCK_SENSOR_MODE=1` so it cannot scribble fake data on top of live Home Assistant readings.

Production wrangler vars (see [`wrangler.jsonc`](../wrangler.jsonc)) **never** set either flag. Setting them on the production environment is a deploy-time gate, not a runtime toggle.

## Twilio signature gap (known)

`/api/v1/twilio/voice`, `/api/v1/twilio/gather`, and `/api/v1/twilio/status` accept arbitrary POST today. `TWILIO_AUTH_TOKEN` is provisioned but the `X-Twilio-Signature` header is **not** verified yet. Mitigations in place:

- Twilio's own egress IPs are the only sources that know the callback URL, and the URL is not advertised publicly.
- The TwiML pipeline only produces speech output and writes to D1; there is no money path, no privilege escalation surface.
- `escapeXml` is the only legal interpolation primitive — no untrusted content reaches the TwiML stream raw.

Closing this gap means computing `HMAC-SHA1(url + sorted-body-pairs, TWILIO_AUTH_TOKEN)` per request and 403'ing on mismatch. Tracked in the project's open-work list, not blocking.

## Secrets

- Loaded via `get-secret KEY` (chezmoi + age) at the operator shell, never committed.
- Worker bindings receive them via `wrangler secret put` — they are write-only after upload.
- Deploys explicitly pass `CLOUDFLARE_EMAIL=$(get-secret CLOUDFLARE_EMAIL) CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) npx wrangler deploy`; no token is interactively typed.
- The `cfut_` token used for deploy carries Workers Scripts:Edit + Account Settings:Read; nothing else.

## Input handling

- Every query string and body is parsed through Zod (`@hono/zod-openapi` for the OpenAPI-decorated routes, `@hono/zod-validator` for the conversational + webhook routes).
- D1 access is **only** parameterized — `db.prepare(sql).bind(...)`. Search the repo for unparameterized `db.prepare(\``-interpolated literals; there are none.
- TwiML output goes through `escapeXml` on every interpolation site.

## What we do NOT do

- No cookies are set (no session storage anywhere).
- No CSRF tokens (no state-changing authenticated endpoints to protect).
- No user-content storage (chat messages are visitor input + AI output; both surface on `/api/v1/transmissions*` deliberately as public record).
- No third-party analytics injecting scripts (Cloudflare Insights is the only first-party telemetry).
- No outbound webhook calls from data we don't own.

## Known gaps (tracked, not blocking)

1. **`'unsafe-inline'` in `script-src`** — move to nonced inline scripts or hoist them to `/app.js`. Owner: site rewrite track.
2. **Twilio signature validation** — see § Twilio signature gap.
3. **Per-route rate limiting on `/api/v1/chat`** — the chat endpoint is currently unbounded. Acceptable today because Anthropic itself rate-limits the upstream key; revisit if Anthropic bills become noisy.
4. **No bot-management challenge on `/api/v1/sensors`** — by design exempt from the public rate limit; if abuse appears, the right move is a Cloudflare Bot Management rule, not in-Worker logic.

## Reporting

Security disclosures: hey@megabyte.space. Please include a request id from the failing response if available.
