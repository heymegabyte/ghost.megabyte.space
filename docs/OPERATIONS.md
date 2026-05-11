# Operations Runbook

> Companion to [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`ROUTES.md`](./ROUTES.md), [`SECURITY.md`](./SECURITY.md). Production lives at https://ghost.megabyte.space (custom domain) and https://ghost-megabyte-space.megabyte.workers.dev (workers.dev fallback). The deploy target, bindings, and triggers are pinned in [`wrangler.jsonc`](../wrangler.jsonc).

## Pre-deploy checklist

Run from the project root before every push to production:

```sh
pnpm install            # or: npm install
pnpm check              # tsc --noEmit — any new error blocks the deploy
pnpm test:e2e           # Playwright headless against wrangler dev
```

`pnpm check` may surface four pre-existing TypeScript narrowing complaints in `src/index.ts` (route response unions + a couple of "possibly undefined" cmds in the MUD proxy). They are listed in [`CLAUDE.md`](../CLAUDE.md) § Verify-Before-Done as known-pre-existing. If you touched the file, fix the root cause; if you didn't, don't paper over them.

`pnpm test:e2e` boots `wrangler dev --local --test-scheduled --persist-to .wrangler/state/e2e` with the Playwright dev vars (`.dev.vars.playwright`) and exercises the full surface. Failing tests must be triaged before deploy — they catch contract drift on the public API.

## Deploy

Production deploys use the `cfut_` token (see `MEMORY.md` § CF Workers API Token) and the chezmoi-encrypted email:

```sh
CLOUDFLARE_EMAIL=$(get-secret CLOUDFLARE_EMAIL) \
CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) \
npx wrangler deploy
```

Notes:
- `wrangler deploy` reads `wrangler.jsonc` and uses the explicit `account_id`, `name`, and `routes` block already declared there.
- Static assets ship as part of the same deploy because `wrangler.jsonc` declares the `ASSETS` binding pointing at `./public` with `run_worker_first=true`.
- Secrets (`HASS_TOKEN`, `ANTHROPIC_API_KEY`, `TWILIO_*`, `LISTMONK_API_TOKEN`) are managed separately via `wrangler secret put <NAME>` — they are NOT in `wrangler.jsonc` `vars`.

After the deploy command exits successfully, wrangler prints the new Worker Version ID. Capture it for the rollback path below.

## Cache purge

Edge caches keyed by full request URL clear on their TTL naturally. To force-purge after a deploy that changes a response shape:

```sh
CLOUDFLARE_EMAIL=$(get-secret CLOUDFLARE_EMAIL) \
CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) \
npx wrangler cache purge --everything
```

For targeted purge after a single asset rev (e.g., `public/app.js` changed):

```sh
curl -X POST \
  -H "X-Auth-Email: $(get-secret CLOUDFLARE_EMAIL)" \
  -H "X-Auth-Key: $(get-secret CLOUDFLARE_API_KEY)" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://ghost.megabyte.space/app.js"]}' \
  "https://api.cloudflare.com/client/v4/zones/$(get-secret CLOUDFLARE_ZONE_ID)/purge_cache"
```

## Smoke test (post-deploy)

```sh
curl -sS https://ghost.megabyte.space/health | jq .
curl -sS https://ghost.megabyte.space/api/v1/ghost-emf/meta | jq .
curl -sS https://ghost.megabyte.space/api/v1/sensors | jq '.emf.numericValue, .emf.unit'
curl -sS https://ghost.megabyte.space/api/v1/ghost-emf/current -i | grep -i '^x-ratelimit\|^cache-control'
```

A green smoke run shows:
- `/health` returns `{ status: "ok", version, timestamp }`.
- `/meta` returns the sensor entity-id list and `startedAt`.
- `/sensors` returns numeric values for at least `emf`.
- `/current` carries `x-ratelimit-*` headers and `cache-control: public, max-age=2`.

Then open `https://ghost.megabyte.space/api/docs` in a browser and verify the Scalar API Reference page loads (CSP relaxed for this path only).

## Rollback

`wrangler deployments list` shows the last ~10 versions. Pick the prior version hash and roll back to it:

```sh
CLOUDFLARE_EMAIL=$(get-secret CLOUDFLARE_EMAIL) \
CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) \
npx wrangler rollback --message "rolling back to <reason>"
```

Without a version argument, wrangler rolls back to the immediately-prior version. To target a specific version: `npx wrangler rollback <version-id>`.

Rollback does not affect static assets — they're uploaded fresh on every deploy, so a rolled-back Worker still serves the most recent `public/` build. If the asset shape changed, redeploy the prior commit rather than rolling back.

## Live tail

```sh
CLOUDFLARE_EMAIL=$(get-secret CLOUDFLARE_EMAIL) \
CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) \
npx wrangler tail --env production --format=pretty
```

Filter to a single route: `--search "/api/v1/chat"`. Filter to a specific request id: `--search "<uuid>"` (every log line carries `requestId`).

## D1 maintenance

Inspect schema + row count:

```sh
npx wrangler d1 info ghost-megabyte-space-emf --remote
npx wrangler d1 execute ghost-megabyte-space-emf --remote \
  --command "SELECT COUNT(*) FROM emf_snapshots;"
```

Time-Travel point-in-time recovery (30-day retention):

```sh
npx wrangler d1 time-travel info ghost-megabyte-space-emf
npx wrangler d1 time-travel restore ghost-megabyte-space-emf \
  --bookmark <bookmark-id>
```

Truncate a corrupted slice (rare):

```sh
npx wrangler d1 execute ghost-megabyte-space-emf --remote \
  --command "DELETE FROM emf_snapshots WHERE sampledAt < '<iso>';"
```

## KV maintenance

```sh
npx wrangler kv key list --binding RATE_LIMIT_KV --remote   # active buckets
npx wrangler kv key delete --binding RATE_LIMIT_KV --remote "rate-limit:public:<ip>:<bucket>"
```

Keys auto-expire in 120 s, so manual deletion is rarely required — useful when un-banning a single IP during testing.

## Secret rotation

```sh
CLOUDFLARE_EMAIL=$(get-secret CLOUDFLARE_EMAIL) \
CLOUDFLARE_API_KEY=$(get-secret CLOUDFLARE_API_KEY) \
npx wrangler secret put HASS_TOKEN
# paste new value at the prompt
```

After rotating, run the smoke test — `/api/v1/sensors` and `/api/v1/ghost-emf/current` exercise the Home Assistant credential.

For `ANTHROPIC_API_KEY` rotation, `/api/v1/chat` is the canary. The fallback chain (Sonnet → Workers AI Llama → static line) means a stale key still produces a 200 — check `wrangler tail` for `anthropic.*` log entries to confirm the new key is the one being used.

## Cron health

```sh
npx wrangler d1 execute ghost-megabyte-space-emf --remote \
  --command "SELECT sampledAt FROM emf_snapshots ORDER BY sampledAt DESC LIMIT 5;"
```

The newest `sampledAt` should be within the last 90 s. A gap longer than 5 minutes means the cron stopped firing — check the dashboard's Triggers tab and verify `triggers.crons` is still `["*/1 * * * *"]` in the live config.

If the cron is firing but rows aren't appearing, `persistSnapshot` is being silently rejected — usually because the D1 PK conflicts on a backfill window. The cron path uses `INSERT OR IGNORE`, so a conflict is silent; the upstream Home Assistant fetch is the more common failure surface. Check `wrangler tail` for `persistSnapshot` log lines.

## Incident playbook

| Symptom | First action | Root cause hunt |
|---|---|---|
| `/api/v1/sensors` returns 502 | Tail for `HOME_ASSISTANT_UNAVAILABLE` | Is Brian's HA online? Is `HASS_SERVER` reachable from CF edge? |
| `/api/v1/ghost-emf/snapshot` returns 503 | Check `EMF_DB` binding | `wrangler.jsonc` `d1_databases` entry intact? |
| Chat 500s | Tail for `chat.*` errors | Is `ANTHROPIC_API_KEY` still valid? Workers AI quota? |
| Rate-limit headers missing | Confirm route is `/api/v1/ghost-emf/*` | Routes outside the prefix are exempt by design — see [`SECURITY.md`](./SECURITY.md). |
| Twilio webhook drops calls | Tail `/api/v1/twilio/*` | Is the webhook URL still pointing at `https://ghost.megabyte.space`? |
| `requestId` missing from response | New error path bypassed `onError` | Search for direct `new Response(..., { status: 5xx })` and route it through `jsonError` instead. |

For a full multi-system outage, the dashboards to open in order: Cloudflare Workers (request errors, CPU), Anthropic console (rate limit / spend), Twilio insights (call success rate), Home Assistant local UI (sensor entity availability).

## Disaster recovery

1. **Worker bricked** — `wrangler rollback`.
2. **D1 corrupted** — `wrangler d1 time-travel restore` to the latest healthy bookmark.
3. **KV stuck** — delete and recreate the namespace; the rate limiter degrades to a no-op until the new namespace is bound, which is acceptable.
4. **Custom domain DNS broken** — workers.dev URL stays live; flip clients to it while DNS is repaired.
5. **Secrets compromised** — rotate everything via `wrangler secret put` + `get-secret`, then redeploy so the runtime picks up the new values.
