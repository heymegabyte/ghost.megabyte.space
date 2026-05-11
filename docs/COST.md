# Cost Model

> Companion to [`ARCHITECTURE.md`](./ARCHITECTURE.md). Projects monthly Cloudflare + Anthropic + Twilio spend for ghost.megabyte.space at expected steady-state traffic. Pricing is mirrored from Cloudflare and Anthropic public price lists as of 2026-05; verify before publishing any number externally.

## TL;DR

At current traffic (single sensor, ~30 daily visitors, ~3 hotline calls/week) the project runs entirely inside Cloudflare free tiers plus ~$5–15/mo of Anthropic + Twilio metered usage. Crossing into paid Workers ($5/mo) only happens if daily requests exceed 100k or CPU time exceeds 10ms/req on average.

## Cloudflare Workers — Request + CPU

Free tier ceiling: 100,000 requests/day, 10ms CPU/req. Paid tier ($5/mo) raises to 10M requests/mo + 30s CPU.

| Source | Volume | Notes |
|---|---|---|
| Cron `*/1 * * * *` → `persistSnapshot` | ~43,800/mo | Internal trigger — counts against requests on Paid plan, free on Free plan. |
| Homepage `/api/v1/sensors` poll | ~60/visitor × 30 visitors/day | ~54k/mo. 2s cache means most fan to Cache API, not Workers. |
| Public sensor API `/api/v1/ghost-emf/*` | Scraper-driven, modeled 5–20k/mo | Capped by 60 rpm per IP. |
| `/api/v1/chat` | ~50 messages/mo | Anthropic does the heavy lift. |
| `/api/v1/twilio/*` | ~9–15 turns/mo (3 calls × 3–5 turns) | TwiML generation only. |
| Static asset fallback (`ASSETS`) | ~3–5k/mo | Served by the assets binding; counted as a Worker request because `run_worker_first=true`. |

**Projected monthly Worker requests**: ~110–130k. Sits within Free tier on a typical month but spikes (a single high-traffic Hacker News post) push us over. **Recommendation**: stay on Workers Free and monitor the dashboard. Move to Paid ($5/mo) when monthly billable requests breach 80k for two consecutive months.

CPU per request: every measured route runs well under 10ms p99. The Anthropic-bound chat handler `awaits` an external fetch — that wall-clock time is NOT billed as CPU on Workers.

## Cloudflare D1 — `EMF_DB`

Free tier ceiling: 5M reads/day, 100k writes/day, 5GB storage. Paid: $0.001/1k reads, $1.00/1M writes, $0.75/GB-mo.

| Table | Volume | Cost driver |
|---|---|---|
| `emf_snapshots` | 1 INSERT/min via cron = ~43,800 writes/mo | INSERT OR IGNORE — write counts even on conflict. |
| `chat_messages` | ~100 INSERTs/mo (50 turns × 2 rows) | Two rows per turn (user + assistant). |
| `call_transmissions` | ~10–20 INSERTs/mo | One row per Twilio turn. |
| `newsletter_subscribers` | ~5–10 INSERTs/mo | Single-row append on signup. |

Reads dominated by:
- `/api/v1/ghost-emf/history` — bucketed scan of `emf_snapshots`, ~50–500 rows per request.
- `/api/v1/ghost-emf/snapshot` — raw range scan.
- `/api/v1/chat/history/:sessionId` — bounded scan of 50 messages.
- `/api/v1/transmissions*` — small recent-rows scan.

Modeled monthly reads: 100k–1M. Modeled storage growth: ~32MB/year of `emf_snapshots` (43,800 rows × ~60 bytes).

**Projected D1 cost**: $0 (free tier) for the first ~5 years of cron-only growth.

## Cloudflare KV — `RATE_LIMIT_KV`

Free tier ceiling: 100k reads/day, 1k writes/day, 1GB storage. Paid: $0.50/M reads, $5.00/M writes.

The rate-limit middleware reads + writes once per non-OPTIONS public-API request. At modeled 5–20k public API requests/mo this is 5–20k reads + 5–20k writes per month — comfortably free-tier.

Keys auto-expire in 120s (twice the window), so the namespace never grows. Total resident keys at any time: bounded by `unique_IPs_in_last_2_minutes`.

**Projected KV cost**: $0.

## Cloudflare Cache API

Free. The Cache API is a Worker primitive, not a billable surface. Cache hits short-circuit before any of the other paid surfaces, so it directly suppresses D1 reads + Home Assistant calls + Anthropic spend.

## Cloudflare Workers AI — `AI` binding

Used as the second-tier chat fallback (Llama 3.x). Pricing: free tier 10,000 neurons/day; paid is per-neuron after.

Modeled chat fallback rate: 5–10% of chat requests when Anthropic is down or unkeyed. At ~50 messages/mo, this is ~3–5 Workers AI invocations. **Projected cost**: $0.

## Anthropic API — Sonnet (chat) + Haiku (voice)

| Endpoint | Model | Input ¢/MTok | Output ¢/MTok | Volume |
|---|---|---|---|---|
| `/api/v1/chat` | claude-sonnet-4-6 | $3.00 | $15.00 | ~50 msg/mo × ~1k in + ~500 out = ~75k tok |
| `/api/v1/twilio/gather` | claude-haiku-4-5 | $0.80 | $4.00 | ~15 turns/mo × ~500 in + ~200 out = ~10.5k tok |
| `/api/v1/debate` | claude-sonnet-4-6 | $3.00 | $15.00 | Demand-driven; modeled 10k tok/mo total |

**Projected Anthropic spend**: $1–5/mo at current traffic. Scales linearly with visitor engagement on the chat widget.

## Twilio — Voice hotline

Inbound voice (US): ~$0.0085/min. Speech recognition: ~$0.02/min. Per-call cost modeled at 3 minutes = ~$0.08/call. At 3 calls/week × 4 weeks = ~$0.96/mo.

Phone number rental: ~$1.15/mo for the toll-free vanity number (601) 666-6602.

**Projected Twilio spend**: ~$2–3/mo.

## Listmonk newsletter

Self-hosted at listmonk.megabyte.space. **$0 marginal cost** to this project (separate Coolify host budget).

## Home Assistant

Self-hosted on Brian's network — **$0 marginal cost** to this project. Bandwidth used per request is small (~2KB JSON) and reads are aggressively cached (current/sensors 2s, history 15s, entropy 15s), so origin pressure is bounded even under abuse.

## Monthly all-in estimate

| Line | Low | High |
|---|---|---|
| Workers (Free → Paid threshold) | $0 | $5 |
| D1 | $0 | $0 |
| KV | $0 | $0 |
| Workers AI | $0 | $0 |
| Anthropic | $1 | $5 |
| Twilio | $2 | $3 |
| **Total** | **$3** | **$13** |

## Cost-blast scenarios

What would make this expensive overnight:

1. **Anthropic token blowup on `/api/v1/chat`** — no per-IP rate limit; a single abuser sending long messages can drive the bill. Mitigation: add chat rate limiting + max-tokens cap (already enforced on the request, but max-input-length is not).
2. **Public-API scraper outside the rate limit** — `/api/v1/sensors` is exempt by design. A polite scraper hitting it 10×/s is fine because of Cache API; an impolite scraper bypassing the cache (unique query strings, novel headers) is not. Mitigation: Cloudflare Bot Management rule.
3. **Cron amplification** — if `persistSnapshot` regresses to multiple Home Assistant calls per minute, the cron line item climbs proportionally. Mitigation: snapshot path is documented in [`ARCHITECTURE.md`](./ARCHITECTURE.md) as single-fan-out only.
4. **Twilio robocall flood** — every `gather` turn costs Anthropic Haiku + Twilio speech recognition. Mitigation: Twilio carrier filtering + per-`From` rate limiting at the carrier level.

## How to validate

```sh
wrangler tail --env production --format=pretty   # live request stream
wrangler d1 info ghost-megabyte-space-emf        # row count + bytes used
wrangler kv key list --binding RATE_LIMIT_KV     # active rate-limit buckets
```

Cloudflare dashboard → Workers & Pages → ghost-megabyte-space → Metrics. Anthropic console → Usage → claude-sonnet-4-6 / claude-haiku-4-5. Twilio console → Voice → Insights.

## References

- Cloudflare Workers pricing — https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare D1 pricing — https://developers.cloudflare.com/d1/platform/pricing/
- Cloudflare KV pricing — https://developers.cloudflare.com/kv/platform/pricing/
- Cloudflare Workers AI pricing — https://developers.cloudflare.com/workers-ai/platform/pricing/
- Anthropic pricing — https://www.anthropic.com/pricing
- Twilio Voice pricing — https://www.twilio.com/voice/pricing
