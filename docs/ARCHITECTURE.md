# Architecture

> Companion to [`CLAUDE.md`](../CLAUDE.md) and [`README.md`](../README.md). This document is the high-level mental model — when adding a route, integration, or schema, read this first.

## One-paragraph summary

A single Cloudflare Worker (`src/index.ts`) running Hono 4 with `@hono/zod-openapi` mounts every public route, every webhook, the WebSocket MUD proxy, and the cron `scheduled` handler. Sensor reads pass through the Cloudflare global Cache API to keep Home Assistant origin traffic flat; snapshot history persists to D1; per-IP rate limits use KV; chat replies fan out across Anthropic → Workers AI → static-fallback. Static assets ship via the `ASSETS` binding directly from `public/`.

## Request lifecycle

```
                 +------------------+
   client -----> | Cloudflare Edge  |
                 |  Cache API hit?  |--YES-->  cached JSON response
                 +------------------+                |
                          | MISS                     |
                          v                          |
                 +------------------+                |
                 |  Worker (Hono)   |                |
                 |  - request-id mw |                |
                 |  - logger        |                |
                 |  - rate-limit mw |                |
                 |    (KV counters) |                |
                 |  - route handler |                |
                 +------------------+                |
                          |                          |
                          v                          |
       +------------------+------------------+       |
       |                  |                  |       |
       v                  v                  v       |
  Home Assistant      D1 EMF_DB        Workers AI    |
  REST API            snapshots /      Llama fallback|
                      chat / calls                   |
                          |                          |
                          v                          |
                   response built                    |
                          |                          |
                          v                          |
                  ctx.waitUntil(cache.put) ----------+
                          |
                          v
                       client
```

## Layered responsibilities (top → bottom)

1. **Entrypoint** — `src/index.ts`. Single file: every route, every webhook, every middleware. Module-level docblock = canonical route map.
2. **Middleware** — `hono/logger`, per-request UUID correlation id, security-header injection (`src/lib/headers.ts`), public-API rate-limit (`src/lib/rate-limit.ts`).
3. **Route handlers** — inline in `src/index.ts` for type inference. Each handler is responsible for: validating input via Zod, reading/writing the edge cache, calling lib helpers, returning JSON.
4. **Lib modules** — every external integration, every persistence concern, every shared computation. Lib modules never import `hono` types and never read from `Context` directly — they take `Env` (plus narrow args) and return data.
5. **Persistence** — D1 only. No KV-as-DB. No R2. KV is used only for rate-limit counters.
6. **Static** — `public/` served via the `ASSETS` binding as the fallback `GET *` route. The Worker is mounted with `run_worker_first=true` so the router runs before the static fallback.

## Why a single file?

Hono RPC typing collapses the moment you split route handlers across files — the `app.openapi(...)` call site is where type narrowing happens, so moving handlers into separate files breaks `hc<AppType>` for any consumer. The single-file pattern is intentional and load-bearing. Use the module-level docblock + per-handler comments to keep it navigable.

## Caching strategy

All cached responses go through `getDefaultCache()` (`caches.default`). Cache keys are the full incoming `Request` URL. Writes are wrapped in `ctx.waitUntil` so they never block the response. TTLs:

| Endpoint | TTL | Rationale |
|---|---|---|
| `/api/v1/ghost-emf/current`, `/api/v1/sensors` | 2 s (wrangler vars), 3 s (code default) | Real-time charting at 1× polling, cheap on miss |
| `/api/v1/ghost-emf/history` | 15 s | Bucketed series tolerates 15s staleness |
| `/api/v1/ghost-emf/entropy` | 15 s | Recomputed on a rolling window |
| `/api/v1/ghost-emf/timeline` | 300 s | Curated content; rarely changes |
| `/api/v1/ghost-emf/random` | 0 s | Determinism — re-derive every request |

## Persistence model

D1 (`EMF_DB`):
- `emf_snapshots` — append-only minute-rate sensor record. PK = synthetic `<entityId>:<sampledAt>` for `INSERT OR IGNORE` idempotency on the cron, `INSERT OR REPLACE` for the test-mode seed.
- `chat_messages` — sessioned visitor ↔ Ghost Signal exchange, append-only with a 50-message replay cap.
- `call_transmissions` — Twilio hotline transcripts, one row per turn.
- `newsletter_subscribers` — email + timestamp.

KV (`RATE_LIMIT_KV`):
- Per-IP fixed-window counter keys `rate-limit:public:<ip>:<minute-bucket>`. 120s TTL on each key (≥2× window so concurrent boundary requests can still read the prior bucket).

## External integrations

- **Home Assistant** — `HASS_SERVER` + `HASS_TOKEN` Bearer. Read-only access to specific entity ids. Non-200 → `502 HOME_ASSISTANT_UNAVAILABLE`.
- **Anthropic Claude** — Sonnet for web chat, Haiku for voice. Failure falls through to Workers AI Llama; Llama failure falls through to a static line.
- **Twilio Voice** — TwiML pipeline. The `escapeXml` helper is the only legal way to interpolate user content into TwiML.
- **Listmonk** — newsletter passthrough. Basic-auth credentials in env.

## Failure isolation

Every external call has a graceful-degradation path documented inline at the throw site:
- `EMF_DB` unbound → snapshot / export / random / google-sheets endpoints return `503 SNAPSHOT_STORAGE_UNAVAILABLE`. Chat + calls skip persistence.
- `RATE_LIMIT_KV` unbound → rate limiter no-ops.
- `AI` unbound + Anthropic key unset → chat returns the canonical `"static on the line"` fallback line.
- Home Assistant down → readings return `502`. Cache continues to serve stale within `stale-while-revalidate`.

## Diagrams worth keeping in your head

```
src/index.ts ──┬── src/lib/home-assistant.ts ── Home Assistant
               ├── src/lib/snapshots.ts ──────── D1.emf_snapshots
               ├── src/lib/chat.ts ─────────────┬── Anthropic
               │                                ├── Workers AI (Llama)
               │                                └── D1.chat_messages
               ├── src/lib/twilio.ts ───────────┬── Anthropic (Haiku)
               │                                └── D1.call_transmissions
               ├── src/lib/rate-limit.ts ────── KV
               ├── src/lib/entropy.ts (pure)
               ├── src/lib/history.ts (pure)
               ├── src/lib/test-helpers.ts ──── D1.emf_snapshots
               └── src/data/timeline.yaml
```

## See also

- [`ROUTES.md`](./ROUTES.md) — exhaustive verified route table.
- [`SECURITY.md`](./SECURITY.md) — CSP, rate limits, secrets, threat model.
- [`OPERATIONS.md`](./OPERATIONS.md) — deploy, purge, rollback runbook.
- [`COST.md`](./COST.md) — Workers + D1 + KV monthly estimate.
