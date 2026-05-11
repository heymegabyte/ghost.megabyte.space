# ghost.megabyte.space — Claude Code Operating Manual

<instructions>

## Product
Public-record + entropy-science project at https://ghost.megabyte.space. Anchored on radical truth, a single live GQ EMF-390 sensor, an AI hotline, a transmissions archive, and a multimedia dossier of unexplained life events.

Pillars (do not rewrite — these are stable):
1. **Public EMF sensor** — GQ EMF-390 → Home Assistant → Cloudflare-cached API. Anyone can poll, graph, audit.
2. **Entropy AI** — `/api/v1/ghost-emf/random` derives reproducible numbers from a SHA-256 hash of a snapshot window. Verifiable, not cryptographic.
3. **Multimedia dossier** — interactive tour of paranormal events, gangstalking documentation, time-traveler encounters, unexplained patterns.
4. **AI hotline** — (601) 666-6602; every call transcribed and published as public record.

Operator: Brian Zalewski. Aerospace Engineering / Applied Science background. 14+ years senior software architect. The site is disclosure on his terms.

Tone: direct, unfiltered, conspiratorial but credible. Never sanitize, never apologize. Do **not** frame as a presidential campaign — the project is a public record + entropy API, not a political run.

## Stack
Cloudflare Workers · Hono 4 + `@hono/zod-openapi` (OpenAPI 3.0 spec) + Scalar API Reference UI · Static assets via `ASSETS` binding · D1 (`EMF_DB`) for snapshots / chat / calls / newsletter · KV (`RATE_LIMIT_KV`) for per-IP counters · Workers AI (`AI`) Llama fallback · Home Assistant upstream · Twilio Voice hotline · Anthropic Claude (Sonnet web chat, Haiku voice) · TypeScript strict · pnpm + Wrangler · Playwright v1.59+ E2E.

## File Map (AI-navigable)

### `src/`
- **`src/index.ts`** — single-file Hono app. Module-level docblock at the top is the canonical route inventory. Top-level utilities: `transmissionsPageHtml` (server-rendered `/transmissions` HTML), `getTimelineData` (memoized YAML parse), `getDefaultCache` + `readCachedJson` + `writeCachedJson` (Cache API wrappers), `stripTelnet` (RFC 854 IAC stripper for `/ws/mud`). `app.onError` maps `ApiError` / `HTTPException` / everything-else → `{ error, code, details?, requestId }` envelope. `scheduled` handler wraps `persistSnapshot` in `ctx.waitUntil`.
- **`src/types.ts`** — every public interface lives here. `Env` documents every binding + var with degradation behaviour inline.
- **`src/lib/chat.ts`** — `handleChat` (D1 persistence + history + reply), `generateReply` (Anthropic primary → Workers AI Llama → static fallback), `getChatHistory` (50-message ascending replay).
- **`src/lib/twilio.ts`** — TwiML pipeline. `buildGreetingTwiml`, `handleGather` (Claude Haiku, 10-turn rolling history), `getTransmissions`, `getTransmissionCount`. XML output goes through `escapeXml` — never concatenate raw user input into TwiML.
- **`src/lib/home-assistant.ts`** — Home Assistant client + persistence. `fetchSensorReading`, `fetchCurrentReading`, `fetchAllSensors` (parallel EMF/EF/RF with swallowed individual failures), `fetchHistoryPoints` (D1 priority → mock → HA fallback), `persistSnapshot` (cron target).
- **`src/lib/snapshots.ts`** — D1 export + RNG. `fetchSnapshotRecords`, `buildSnapshotCsv` (RFC 4180), `buildSnapshotExcel` (HTML table), `buildSnapshotFilename`, `buildSnapshotExportUrl`, `buildGoogleSheetsFormula` (`=IMPORTDATA(...)`), `deriveSnapshotRandom` (SHA-256-derived BigInt mod 10^digits).
- **`src/lib/entropy.ts`** — Shannon entropy calculator. APA citation: Shannon (1948).
- **`src/lib/rate-limit.ts`** — `publicReadRateLimit` middleware. KV-backed fixed-window per-IP counter, key `rate-limit:public:<ip>:<minute-bucket>`, 120s KV TTL. No-ops when `RATE_LIMIT_KV` unbound.
- **`src/lib/test-helpers.ts`** — `/__test/reset` + `/__test/seed`. 404-cloaked unless `TEST_HELPERS_ENABLED=1`. Seeding additionally requires `MOCK_SENSOR_MODE=1`.
- **`src/lib/mock-sensor.ts`** — deterministic sin/cos-sum series for Playwright. `isMockSensorMode`, `buildMockSnapshotRecords`.
- **`src/lib/timeline-events.ts`** — `timelineAnnotations` (chart overlays) + `storyMilestones` (narrative dossier cards). NOT the primary event log — that's `src/data/timeline.yaml`.
- **`src/lib/history.ts`** — `parseHistoryWindow`, `downsamplePoints`.
- **`src/lib/headers.ts`** — `getSecurityHeaders`, `applyResponseHeaders`. CSP relaxed on `/api/docs` only.
- **`src/lib/errors.ts`** — `ApiError` + `jsonError` envelope.
- **`src/lib/config.ts`** — env-var coercion helpers + defaults.
- **`src/data/timeline.yaml`** — primary public event log. Parsed at request time, memoized in `getTimelineData`.

### `public/`
- **`public/index.html`** — single-page site: hero, EMF chart, timeline, dossier cards, mission statement, evidence, MUD terminal, newsletter, `#docs`, `#transmissions`.
- **`public/app.js`** — frontend controller: chart rendering, chat widget, MUD xterm.js bridge, countdown.
- **`public/features.js`**, `public/enhance.js`, `public/cinema.js`, `public/celestial-map.js` — progressive-enhancement modules.
- **`public/docs.html`** — legacy `/docs` HTML (redirected to `/#docs`).
- **`public/404.html`**, **`public/offline.html`** — error / PWA stubs.
- **`public/sw.js`**, **`public/site.webmanifest`** — PWA layer.
- **`public/styles.css`** — CSS cascade layers, dark theme (#060610).
- **`public/privacy.html`**, **`public/terms.html`** — policy pages.

### `migrations/`
- `0001_emf_snapshots.sql` — `emf_snapshots` table.
- `0002_chat_and_calls.sql` — `chat_messages`, `call_transmissions`, `newsletter_subscribers`.

### `tests/`
- Playwright E2E suites. Stateful + accumulating — never delete tests, only append.

## Route Map (verify against `src/index.ts` module docblock — keep in lockstep)

### Public API (rate-limited via `/api/v1/ghost-emf/*` prefix)
- `GET /health` — liveness probe.
- `GET /api/v1/ghost-emf/meta` — discovery metadata.
- `GET /api/v1/ghost-emf/current` — latest EMF reading (2s cache prod / 3s code default).
- `GET /api/v1/ghost-emf/history` — downsampled series (15s cache).
- `GET /api/v1/ghost-emf/entropy` — Shannon entropy summary (15s cache).
- `GET /api/v1/ghost-emf/snapshot` — raw snapshot rows.
- `GET /api/v1/ghost-emf/export` — CSV / Excel download.
- `GET /api/v1/ghost-emf/google-sheets` — `=IMPORTDATA(...)` cell helper.
- `GET /api/v1/ghost-emf/random` — reproducible RNG from snapshot hash.
- `GET /api/v1/ghost-emf/timeline` — narrative + technical milestones.

### Not rate-limited (deliberate exception)
- `GET /api/v1/sensors` — combined EMF + EF + RF in one call. Chart polling target.

### Conversational
- `POST /api/v1/chat` — Ghost Signal AI chat (Claude Sonnet → Workers AI Llama → static).
- `GET  /api/v1/chat/history/:sessionId` — replay (50-msg cap).
- `POST /api/v1/twilio/{voice,gather,status}` — TwiML webhooks (Claude Haiku).
- `GET  /api/v1/transmissions` — recent calls.
- `GET  /api/v1/transmissions/live` — Server-Sent Events stream.
- `GET  /api/v1/transmission-count` — chat + call sum.
- `POST /api/v1/debate` — Anthropic-backed debate endpoint.
- `POST /api/v1/newsletter/subscribe` — Listmonk passthrough.

### Static + redirect
- `GET /transmissions` → 301 → `/#transmissions`.
- `GET /docs`, `GET /docs.html` → 301 → `/#docs`.
- `GET /transmissions/:callSid.txt` — plain-text transcript dump.
- `GET /api/v1/openapi.json` — OpenAPI 3.0 spec (via `app.doc`).
- `GET /api/docs` — Scalar API Reference UI (CSP relaxed for this route).
- `OPTIONS /api/*` — CORS preflight.
- `GET *` — static asset fallback via `ASSETS`.

### Test-mode (gated by `TEST_HELPERS_ENABLED=1`)
- `GET /__test/reset` — truncate `emf_snapshots`.
- `GET /__test/seed` — deterministic mock-sensor backfill (requires `MOCK_SENSOR_MODE=1`).

### Realtime
- `GET /ws/mud` — WebSocket → TCP MUD proxy with Telnet IAC stripping.

### Scheduled
- Cron `*/1 * * * *` → `persistSnapshot(env)` via the `scheduled` export.

## Integrations
- **Home Assistant** — `HASS_SERVER` + `HASS_TOKEN`. REST `/api/states/<entity_id>`. Bearer auth. `homeAssistantFetch<T>` wraps non-200 responses as `502 HOME_ASSISTANT_UNAVAILABLE`.
- **Anthropic Claude** — `ANTHROPIC_API_KEY`. Web chat = `claude-sonnet-4-5`. Voice hotline = `claude-haiku-4-5-20251001`. Fallback chain documented in `src/lib/chat.ts`.
- **Workers AI** — `AI` binding. Model `@cf/meta/llama-3.1-8b-instruct`. Reached only when Anthropic call fails.
- **Twilio Voice** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. Three-step webhook flow: voice → gather → status. TwiML escaped via `escapeXml`.
- **Listmonk** — `LISTMONK_URL` + `LISTMONK_API_USER` + `LISTMONK_API_TOKEN` + `LISTMONK_LIST_ID`.

## Schema (D1 `EMF_DB`)
- `emf_snapshots(id PK, entity_id, state, numeric_value, unit, last_changed, last_updated, sampled_at, source)` — synthetic `id` = `<entityId>:<sampledAt>`, `INSERT OR IGNORE` on cron + `INSERT OR REPLACE` for seed.
- `chat_messages(id, sessionId, role, content, createdAt, ipAddress?)`.
- `call_transmissions(id, callSid, callerNumber, transcript, aiResponse, turnNumber, createdAt)`.
- `newsletter_subscribers(id, email, createdAt)`.

## Security Boundaries
- **Rate limiting** — only `/api/v1/ghost-emf/*` (60 rpm/IP). `/api/v1/sensors` deliberately exempt for chart polling.
- **Test helpers** — 404-cloaked when `TEST_HELPERS_ENABLED !== "1"`. Seed additionally requires `MOCK_SENSOR_MODE=1`.
- **Twilio signature** — `TWILIO_AUTH_TOKEN` is bound; signature validation is **not currently enforced**. Treat as a known gap if hardening Twilio webhooks.
- **CSP** — strict everywhere except `/api/docs` (Scalar requires inline-eval-ish resources). See `src/lib/headers.ts`.
- **Error envelope** — `{ error, code, details?, requestId }`. Stack traces never leak — `app.onError` returns a generic `INTERNAL_ERROR` body for unknown throws.
- **CORS** — preflight handled on `/api/*`.

## Verify-Before-Done Checklist
1. `pnpm check` — TypeScript clean. Note: a small set of route-shape mismatches in `src/index.ts` (`currentRoute`, `sensorsRoute`) + two `stripTelnet` strict-index issues are **pre-existing** and unrelated to documentation passes. Do not paper over them — fix root-cause if touched.
2. `pnpm test:e2e` — Playwright suites must stay GREEN at 6 breakpoints.
3. `pnpm dev` — exercise affected routes in browser; check console for CSP / JS / 404 errors. Console errors = not done.
4. `pnpm deploy` — see Deploy section below. Purge CDN. Smoke-test the affected route on the production custom domain.
5. Rollback path: `pnpm wrangler rollback`.

## Deploy
```bash
CLOUDFLARE_EMAIL=$(get-secret CLOUDFLARE_EMAIL) \
CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) \
  pnpm deploy
```
Then purge `https://ghost.megabyte.space` via the Cloudflare API. Rollback: `pnpm wrangler rollback`. Live tail: `pnpm wrangler tail --env production --format=json`.

## Routing
Skills: @~/.agentskills/_router.md · Agents: @~/.agentskills/agents/ · Rules: @~/.claude/rules/.

</instructions>

<context>
See global CLAUDE.md for full Emdash OS v6.0 policy. Project-specific overrides go here. Every export, route, integration, and schema in this file has corresponding TSDoc in source — when this file drifts from `src/` it is a bug, fix this file first.
</context>
