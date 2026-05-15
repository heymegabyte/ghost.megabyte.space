# Routes — Verified Inventory

> Single source of truth: the module-level docblock at the top of [`src/index.ts`](../src/index.ts). This file mirrors it and adds cache + rate-limit detail. Drift between this file and `src/index.ts` is a bug — fix `src/index.ts` first if behavior changed, otherwise fix this file.

## Conventions

- `RL` column: `yes` = under `/api/v1/ghost-emf/*` rate-limit middleware (60 rpm/IP, KV-backed fixed window). `no` = exempt.
- `Cache` column: edge cache TTL via `caches.default`. `n/a` = uncached.
- `Auth` column: `public` = no auth. `webhook` = `X-Twilio-Signature` HMAC-SHA1 verified against `TWILIO_AUTH_TOKEN` (see [`SECURITY.md`](./SECURITY.md) § Twilio signature verification).

## Public API — `/api/v1/ghost-emf/*` (rate-limited)

| Method | Path | RL | Cache | Auth | Notes |
|---|---|---|---|---|---|
| GET | `/api/v1/ghost-emf/meta` | yes | n/a | public | Discovery metadata (entity ids, units, started-at). |
| GET | `/api/v1/ghost-emf/current` | yes | 2s | public | Latest EMF reading. Production override `CURRENT_CACHE_TTL_SECONDS=2`; code default `3`. |
| GET | `/api/v1/ghost-emf/history` | yes | 15s | public | Downsampled series. Query: `start`, `end`, `step` (seconds). |
| GET | `/api/v1/ghost-emf/entropy` | yes | 15s | public | Shannon entropy summary. |
| GET | `/api/v1/ghost-emf/snapshot` | yes | n/a | public | Raw `emf_snapshots` rows in `[start, end]`. Returns `503 SNAPSHOT_STORAGE_UNAVAILABLE` when `EMF_DB` unbound. |
| GET | `/api/v1/ghost-emf/export` | yes | n/a | public | CSV / Excel download. Query: `start`, `end`, `format=csv|excel`. |
| GET | `/api/v1/ghost-emf/google-sheets` | yes | n/a | public | Returns `{ importDataFormula, csvUrl }` — paste the formula into a Sheets cell. |
| GET | `/api/v1/ghost-emf/random` | yes | n/a | public | Reproducible RNG from SHA-256 over snapshot rows. `404 SNAPSHOT_EMPTY` when range has no rows. |
| GET | `/api/v1/ghost-emf/timeline` | yes | 300s | public | Narrative + technical milestones. |

## Public API — not under `/api/v1/ghost-emf/*`

| Method | Path | RL | Cache | Auth | Notes |
|---|---|---|---|---|---|
| GET | `/health` | no | n/a | public | `{ status, version, timestamp }`. |
| GET | `/api/v1/sensors` | **no** | 2s | public | Combined EMF + EF + RF fan-out. Intentionally exempt from rate-limit so the homepage chart can poll without burning quota. |

## Conversational

| Method | Path | RL | Cache | Auth | Notes |
|---|---|---|---|---|---|
| POST | `/api/v1/chat` | 20rpm/IP | n/a | public | Visitor → Ghost Signal reply (single shot). Anthropic Sonnet → Workers AI Llama → static fallback. |
| POST | `/api/v1/chat/stream` | 20rpm/IP | n/a | public | Same as `/chat` but SSE token-by-token via Anthropic `messages.stream` with `AbortSignal` propagation. |
| GET | `/api/v1/chat/history/:sessionId` | no | n/a | public | Replay 50-message ascending. |
| POST | `/api/v1/chat/feedback` | no | n/a | public | Thumbs-up/-down rating per assistant message. Idempotent on `(messageId, sessionId)`. |
| GET | `/api/v1/chat/search` | no | n/a | public | FTS5 search across `chat_messages_fts` (porter unicode61 + `snippet()`); `LIKE` fallback when virtual table absent. |
| POST | `/api/v1/twilio/voice` | no | n/a | webhook | TwiML greeting. HMAC-SHA1 signature gate via `verifyTwilioSignature`. |
| POST | `/api/v1/twilio/gather` | no | n/a | webhook | Speech-gather + Claude Haiku reply. HMAC-SHA1 signature gate. |
| POST | `/api/v1/twilio/status` | no | n/a | webhook | Call-completed write to D1. HMAC-SHA1 signature gate. |
| GET | `/api/v1/transmissions` | no | n/a | public | Recent call rows. |
| GET | `/api/v1/transmissions/live` | no | n/a | public | Server-Sent Events stream. |
| GET | `/api/v1/transmission-count` | no | n/a | public | Combined chat + call count. |
| POST | `/api/v1/debate` | no | n/a | public | Anthropic-backed debate endpoint. |
| POST | `/api/v1/newsletter/subscribe` | no | n/a | public | Listmonk passthrough. |
| POST | `/api/v1/listmonk/webhook` | no | n/a | webhook | HMAC-SHA256 signature gate (`X-Listmonk-Signature`) → `email_events` + `email_suppressions` + PostHog fan-out. |
| GET | `/api/v1/email/health` | no | n/a | public | Suppression count + 24h event volume + PostHog wiring status. |

## Static + redirect surface

| Method | Path | Behavior |
|---|---|---|
| GET | `/transmissions` | 301 → `/#transmissions`. |
| GET | `/docs`, `/docs.html` | 301 → `/#docs`. |
| GET | `/transmissions/:callSid.txt` | Plain-text transcript dump. |
| GET | `/api/v1/openapi.json` | OpenAPI 3.0 document (mounted via `app.doc`). |
| GET | `/api/docs` | Scalar API Reference UI (CSP relaxed for this route only). |
| OPTIONS | `/api/*` | CORS preflight. |
| GET | `*` | Static asset fallback via the `ASSETS` binding (`public/`). |

## Test-mode (`TEST_HELPERS_ENABLED=1`)

| Method | Path | Notes |
|---|---|---|
| GET | `/__test/reset` | Truncate `emf_snapshots`. |
| GET | `/__test/seed` | Idempotent backfill. Additionally requires `MOCK_SENSOR_MODE=1`. |

Both routes return `404 NOT_FOUND` when the flag is unset — the 404 is intentional (don't advertise the surface).

## Realtime

| Method | Path | Notes |
|---|---|---|
| GET | `/ws/mud` | WebSocket → TCP proxy with Telnet IAC stripping (`stripTelnet`). |

## Scheduled

| Trigger | Handler | Notes |
|---|---|---|
| `*/1 * * * *` | `persistSnapshot(env)` | Cron append of the current sensor reading into `emf_snapshots`. Idempotent via `INSERT OR IGNORE` keyed on `<entityId>:<sampledAt>`. |

## Error envelope (all routes)

Every non-2xx JSON response follows:

```json
{
  "error":   "human-readable message",
  "code":    "SCREAMING_SNAKE_CASE_CODE",
  "details": "optional any",
  "requestId": "uuid-v4 (echoes x-request-id header)"
}
```

Mapped by `app.onError` in `src/index.ts`. `ApiError` → use status + code verbatim. `HTTPException` → wrap as `HTTP_<status>`. Anything else → `500 INTERNAL_ERROR` and console-error the stack.
