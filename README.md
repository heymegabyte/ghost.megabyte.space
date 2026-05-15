<!-- This README has been hand-written. The ghost helped. --><div align="center">
  <center>
    <a href="https://ghost.megabyte.space">
      <img width="320" alt="Ghost Signal logo" src="https://ghost.megabyte.space/og-image.jpg" />
    </a>
  </center>
</div>
<div align="center">
  <center><h1 align="center"><i></i>Ghost Signal &mdash; Public EMF, Entropy &amp; Disclosure API<i></i></h1></center>
  <center><h4 style="color: #00E5FF;">Maintained by <a href="https://megabyte.space" target="_blank">Megabyte Labs</a> &middot; built by <a href="https://github.com/ProfessorManhattan" target="_blank">Brian Zalewski</a><i></i></h4></center>
</div>

<div align="center">
  <a href="https://ghost.megabyte.space" title="Ghost Signal homepage" target="_blank">
    <img alt="Homepage" src="https://img.shields.io/website?down_color=%23FF4136&down_message=Down&label=ghost.megabyte.space&logo=cloudflare&logoColor=white&up_color=%2300E5FF&up_message=Live&url=https%3A%2F%2Fghost.megabyte.space&style=for-the-badge" />
  </a>
  <a href="https://ghost.megabyte.space/api/docs" title="Scalar API reference UI" target="_blank">
    <img alt="OpenAPI" src="https://img.shields.io/badge/OpenAPI-3.0-6BA539?logo=openapiinitiative&logoColor=white&style=for-the-badge" />
  </a>
  <a href="https://ghost.megabyte.space/docs" title="Human-friendly docs" target="_blank">
    <img alt="Docs" src="https://img.shields.io/badge/Docs-Read%20me-7C3AED?logo=readthedocs&logoColor=white&style=for-the-badge" />
  </a>
  <a href="tel:+16016666602" title="Call the AI hotline" target="_blank">
    <img alt="Hotline" src="https://img.shields.io/badge/Hotline-(601)%20666--6602-FF1744?logo=phonepe&logoColor=white&style=for-the-badge" />
  </a>
  <a href="https://github.com/megabyte-labs/ghost.megabyte.space" title="GitHub repository" target="_blank">
    <img alt="GitHub" src="https://img.shields.io/badge/Mirror-GitHub-333333?logo=github&style=for-the-badge" />
  </a>
</div>

<div align="center">
  <a href="https://workers.cloudflare.com/" title="Cloudflare Workers" target="_blank">
    <img alt="Cloudflare Workers" src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white&style=flat-square" />
  </a>
  <a href="https://hono.dev/" title="Hono" target="_blank">
    <img alt="Hono" src="https://img.shields.io/badge/Hono-4.x-E36002?logo=hono&logoColor=white&style=flat-square" />
  </a>
  <a href="https://www.typescriptlang.org/" title="TypeScript" target="_blank">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=flat-square" />
  </a>
  <a href="https://playwright.dev/" title="Playwright" target="_blank">
    <img alt="Playwright" src="https://img.shields.io/badge/Playwright-1.59-2EAD33?logo=playwright&logoColor=white&style=flat-square" />
  </a>
  <a href="https://developers.cloudflare.com/d1/" title="Cloudflare D1" target="_blank">
    <img alt="D1" src="https://img.shields.io/badge/Cloudflare-D1-F38020?logo=cloudflare&logoColor=white&style=flat-square" />
  </a>
  <a href="https://www.home-assistant.io/" title="Home Assistant" target="_blank">
    <img alt="Home Assistant" src="https://img.shields.io/badge/Home%20Assistant-Upstream-41BDF5?logo=homeassistant&logoColor=white&style=flat-square" />
  </a>
  <a href="https://www.twilio.com/" title="Twilio Voice" target="_blank">
    <img alt="Twilio" src="https://img.shields.io/badge/Twilio-Voice%20AI-F22F46?logo=twilio&logoColor=white&style=flat-square" />
  </a>
  <a href="https://www.anthropic.com/" title="Claude by Anthropic" target="_blank">
    <img alt="Claude" src="https://img.shields.io/badge/Claude-Sonnet%20%2B%20Haiku-D97757?logo=anthropic&logoColor=white&style=flat-square" />
  </a>
  <a href="https://pnpm.io/" title="pnpm" target="_blank">
    <img alt="pnpm" src="https://img.shields.io/badge/pnpm-9-F69220?logo=pnpm&logoColor=white&style=flat-square" />
  </a>
  <a href="LICENSE" title="License">
    <img alt="License" src="https://img.shields.io/badge/License-The%20Lesson-FFD700?logo=ghostery&logoColor=black&style=flat-square" />
  </a>
</div>

> <br/><h4 align="center"><strong>One sensor. One signal. One hotline. A free public API for EMF, entropy, and the unfiltered record of being followed.</strong></h4><br/>

<a href="#table-of-contents" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Table of Contents

- [Overview](#overview)
- [Why This Exists](#why-this-exists)
- [Quick Start](#quick-start)
- [The API](#the-api)
  - [Endpoints](#endpoints)
  - [Sensor Families](#sensor-families)
  - [Rate Limits &amp; Caching](#rate-limits--caching)
  - [Example Calls](#example-calls)
- [Architecture](#architecture)
  - [Request Flow](#request-flow)
  - [Cache Strategy](#cache-strategy)
  - [Bindings](#bindings)
- [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deploying](#deploying)
- [The Hotline](#the-hotline)
- [The Dossier](#the-dossier)
- [Stack](#stack)
- [References](#references)
- [Contributing](#contributing)
- [License](#license)

<a href="#overview" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Overview

Ghost Signal is a public-record + entropy-science project hosted entirely on [Cloudflare Workers](https://workers.cloudflare.com/). It exposes a single GQ EMF-390 sensor (wired into [Home Assistant](https://www.home-assistant.io/)) through a free, rate-limited, edge-cached API; a Claude-powered AI chat; a Twilio voice hotline at `(601) 666-6602`; a transmissions archive of every call; and a multimedia dossier of unexplained life events.

The project ships three pillars:

| Pillar | What it is | Why it exists |
|---|---|---|
| **Public sensor** | GQ EMF-390 streaming EMF / EF / RF readings via Home Assistant &rarr; Worker &rarr; Cache | Anyone can poll, graph, audit, or build on real environmental EM data |
| **Entropy AI** | True random numbers harvested from a living electromagnetic field | Entropy no algorithm can fake &mdash; fit for CS, physics, and AI experiments |
| **Public record** | Multimedia dossier + AI hotline + transmission archive | Disclosure on the operator's terms &mdash; facts that would surface anyway |

Ghost Signal is intended for:

1. **Researchers** who want a free, rate-limited, OpenAPI-documented public EMF feed
2. **Cryptographers and ML engineers** who need entropy that no algorithm can fake
3. **Journalists and skeptics** who want the raw, unfiltered record of an unusual life
4. **Anyone with a story** who wants their own pattern of phenomena added to the file
5. **Builders** who appreciate a working reference for Workers + Hono + D1 + KV + Twilio + Claude

<a href="#why-this-exists" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Why This Exists

The operator (Brian Zalewski, B.S. Aerospace Engineering / Applied Sciences, Rutgers '11) has spent more than a decade as a senior software architect and another decade documenting an unrelenting pattern of phenomena: orbs, cellular SSIDs renamed to taunt research subjects, time-traveler-grade coincidences, possessions, exorcisms, EMF spikes that map to events, and a hotline of voicemails that should not exist. Rather than keep the file private, the file ships as a website, a public API, and a phone number.

Every reading, transcript, and entropy byte is permanent public record. If something is happening, the data is part of the case file. If nothing is happening, that's a case file too.

<a href="#quick-start" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Quick Start

No keys. No accounts. 60 requests / minute / IP across `/api/v1/ghost-emf/*` (the combined `/api/v1/sensors` fan-out is intentionally not rate-limited).

```bash
# Read the current EMF (mG) sensor value
curl https://ghost.megabyte.space/api/v1/ghost-emf/current

# Pull the last 24h of history (60-second buckets)
curl 'https://ghost.megabyte.space/api/v1/ghost-emf/history?start=-24h&step=60'

# Combined EMF + EF + RF snapshot in one call (not rate-limited)
curl https://ghost.megabyte.space/api/v1/sensors

# Derive a reproducible random number from a snapshot window
curl 'https://ghost.megabyte.space/api/v1/ghost-emf/random?start=-1h&digits=12'

# Browse the Scalar API reference UI (OpenAPI 3.0)
open https://ghost.megabyte.space/api/docs
```

To run a local mirror against the production Worker code:

```bash
git clone https://github.com/megabyte-labs/ghost.megabyte.space.git
cd ghost.megabyte.space
pnpm install
cp .dev.vars.example .dev.vars
pnpm dev
```

<a href="#the-api" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## The API

The formal OpenAPI 3.0 spec lives at [`/api/v1/openapi.json`](https://ghost.megabyte.space/api/v1/openapi.json). The [Scalar API reference UI](https://ghost.megabyte.space/api/docs) at `/api/docs` renders it interactively. Hand-written docs are anchored at [`/#docs`](https://ghost.megabyte.space/#docs).

### Endpoints

Public-API routes under `/api/v1/ghost-emf/*` share one rate-limit prefix (60 rpm/IP). `/api/v1/sensors` is the only sensor endpoint deliberately exempt from the limit (it's the single fan-out call the chart relies on).

| Method | Path | Purpose | Cache TTL |
|---|---|---|---|
| `GET` | `/health` | Liveness + version + timestamp | none |
| `GET` | `/api/v1/ghost-emf/meta` | Sensor metadata, started-at, units, rate limit | 60s |
| `GET` | `/api/v1/ghost-emf/current` | Latest single EMF reading | 2s |
| `GET` | `/api/v1/sensors` | Combined EMF + EF + RF snapshot (not rate-limited) | 2s |
| `GET` | `/api/v1/ghost-emf/history` | Time-windowed series (`start`, `end`, `step`) | 15s |
| `GET` | `/api/v1/ghost-emf/entropy` | Shannon entropy summary (bits, bins, mean) | 15s |
| `GET` | `/api/v1/ghost-emf/snapshot` | Raw D1 snapshot rows | 15s |
| `GET` | `/api/v1/ghost-emf/export` | CSV / Excel bulk export | n/a |
| `GET` | `/api/v1/ghost-emf/google-sheets` | `=IMPORTDATA(...)` formula helper | n/a |
| `GET` | `/api/v1/ghost-emf/random` | Reproducible RNG derived from snapshot hash | n/a |
| `GET` | `/api/v1/ghost-emf/timeline` | Narrative + technical milestones | 300s |
| `GET` | `/api/v1/transmissions` | Hotline call transcript index | 60s |
| `GET` | `/api/v1/transmissions/live` | Server-sent stream of new transcripts | n/a |
| `GET` | `/api/v1/transmission-count` | Combined chat + call count | 60s |
| `POST` | `/api/v1/chat` | Ghost Signal AI chat (Claude Sonnet) | n/a |
| `GET`  | `/api/v1/chat/history/:sessionId` | Replay a chat session | n/a |
| `POST` | `/api/v1/debate` | Anthropic-backed debate endpoint | n/a |
| `POST` | `/api/v1/newsletter/subscribe` | Listmonk passthrough | n/a |
| `POST` | `/api/v1/twilio/voice` | TwiML entrypoint for incoming calls | n/a |
| `POST` | `/api/v1/twilio/gather` | TwiML speech-gather webhook | n/a |
| `POST` | `/api/v1/twilio/status` | TwiML completion / recording webhook | n/a |
| `GET`  | `/api/v1/openapi.json` | OpenAPI 3.0 document | n/a |
| `GET`  | `/api/docs` | Scalar API reference UI | n/a |
| `GET`  | `/ws/mud` | WebSocket bridge into the public MUD | n/a |

### Sensor Families

| Family | Source entity | Unit | Typical range | Description |
|---|---|---|---|---|
| **EMF** | `sensor.gq_emf390_emf_mg` | mG (milligauss) | 0&ndash;3000+ | Magnetic field strength &mdash; the headline number on the chart |
| **EF**  | `sensor.gq_emf390_ef_v_m` | V/m | 0&ndash;1000+ | Electric field strength |
| **RF**  | `sensor.gq_emf390_rf_total_density_mw_m2` | mW/m&sup2; | 0&ndash;200+ | Total radio-frequency power density |

### Rate Limits &amp; Caching

```
Rate limit:  60 requests / minute / IP   (KV-backed fixed-window, /api/v1/ghost-emf/*)
Cache:       Cloudflare Cache API at the edge (caches.default)
Headers:     x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset,
             Cache-Control: public, max-age=<TTL>, s-maxage=<TTL>, stale-while-revalidate=<2-3x TTL>
Origin:      Worker -> Home Assistant -> GQ EMF-390 (USB)
```

| Tier | Latency budget | Notes |
|---|---|---|
| Edge cache hit | &lt; 30 ms | Near-100% on `/current` and `/sensors` during steady traffic |
| Worker cold path | 50&ndash;200 ms | Fetch from Home Assistant + bundle response |
| Hotline call | 1.4&ndash;2.2 s round-trip | Twilio + Claude Haiku, optimized for voice |

### Example Calls

```bash
# Last 6 hours, 60-second buckets
curl 'https://ghost.megabyte.space/api/v1/ghost-emf/history?start=-6h&step=60'

# Entropy summary for the trailing hour
curl 'https://ghost.megabyte.space/api/v1/ghost-emf/entropy?start=-1h'

# CSV stream for spreadsheets
curl -o emf.csv 'https://ghost.megabyte.space/api/v1/ghost-emf/export?start=-24h&format=csv'

# 12-digit reproducible random number derived from the trailing hour
curl 'https://ghost.megabyte.space/api/v1/ghost-emf/random?start=-1h&digits=12'
```

```js
// JavaScript: poll /current at 3s
async function tick() {
  const r = await fetch("https://ghost.megabyte.space/api/v1/ghost-emf/current");
  const reading = await r.json();
  console.log(`${reading.sampledAt} ${reading.numericValue} ${reading.unit ?? ""}`);
}
setInterval(tick, 3000);
```

```py
# Python: bulk export to a DataFrame
import pandas as pd
df = pd.read_csv(
    "https://ghost.megabyte.space/api/v1/ghost-emf/export"
    "?start=-168h&format=csv"
)
print(df.describe())
```

<a href="#architecture" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Architecture

### Request Flow

```
                          (60 rpm / IP)
        +----------+        +-----------------+        +--------------------+
client -|  Edge    |------> | Worker (Hono)   |------> | Home Assistant     |
        |  cache   |  HIT   |  - Zod validate |  miss  |  GQ EMF-390 (USB)  |
        +----------+        |  - Rate-limit   |        +--------------------+
              ^             |  - Cache write  |                 |
              |             |  - D1 snapshot  |                 |
              +------ <-----+  - KV counters  |                 |
                            +-----------------+                 |
                                |     |                         |
                                v     v                         |
                              D1     KV                         |
                          (snapshots) (rate-limit + entropy seed)
                                                                 |
                            Twilio (voice) <-> Claude Haiku/Sonnet
                                                                 |
                            Browser (xterm.js MUD) <-> /ws/mud
```

### Cache Strategy

Caching uses the Cloudflare global Cache API (`caches.default`) — every cache write goes through `ctx.waitUntil` so it never blocks the response. Override TTLs at runtime by setting the matching `*_CACHE_TTL_SECONDS` env var (see [Environment Variables](#environment-variables)).

| Endpoint | TTL | Why |
|---|---|---|
| `/api/v1/ghost-emf/current` | 2 s | Real-time enough for charts; cheap on misses |
| `/api/v1/sensors` | 2 s | Fan-out across families needs to stay fresh |
| `/api/v1/ghost-emf/history` | 15 s | Bucketed series tolerates short staleness |
| `/api/v1/ghost-emf/entropy` | 15 s | Recomputed against trailing window |
| `/api/v1/ghost-emf/random` | 0 s | Deterministic — caching would defeat verifiability |
| `/api/v1/ghost-emf/timeline` | 300 s | Curated content, rarely changes |

### Bindings

| Binding | Type | Required | Purpose | Degradation when missing |
|---|---|---|---|---|
| `ASSETS` | Cloudflare Assets | **yes** | Static `public/` directory | Hard failure |
| `EMF_DB` | D1 | no | `emf_snapshots`, `chat_messages`, `call_transmissions`, `newsletter_subscribers` | Snapshot endpoints `503`; chat / calls skip persistence |
| `RATE_LIMIT_KV` | KV | no | Per-IP fixed-window counters on `/api/v1/ghost-emf/*` | Rate limiter no-ops (all requests pass) |
| `AI` | Workers AI | no | Llama 3.1 fallback when Anthropic is unset / down | Chat falls back to the static `"static on the line"` reply |

```jsonc
// wrangler.jsonc (excerpt)
{
  "name": "ghost-megabyte-space",
  "main": "src/index.ts",
  "compatibility_date": "2026-04-23",
  "triggers": { "crons": ["*/1 * * * *"] },
  "routes": [{ "pattern": "ghost.megabyte.space", "custom_domain": true }]
}
```

<a href="#local-development" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Local Development

```bash
# Install
pnpm install

# Configure
cp .dev.vars.example .dev.vars

# Type-check + start dev server (auto-reload on save)
pnpm check
pnpm dev
```

The dev server runs at `http://127.0.0.1:8787/`. The Worker reads from a local mock unless `EMF_SENSOR_HASS_URL` and `EMF_SENSOR_HASS_TOKEN` are set in `.dev.vars`.

### Environment Variables

The canonical schema lives in [`src/types.ts`](src/types.ts) on the `Env` interface — every binding and var carries inline TSDoc describing its degradation path. Highlights:

| Variable | Description | Default |
|---|---|---|
| `HASS_SERVER` | Home Assistant base URL (e.g. `https://hass.example.com`) | required (mock mode bypasses) |
| `HASS_TOKEN` | Home Assistant Long-Lived Access Token | required (mock mode bypasses) |
| `EMF_SENSOR_ENTITY_ID` | Primary EMF entity in Home Assistant | required |
| `EF_SENSOR_ENTITY_ID` | Electric-field entity | optional |
| `RF_SENSOR_ENTITY_ID` | RF density entity | optional |
| `EMF_SENSOR_NAME` | Friendly name override surfaced via `/meta` | falls back to HA attribute |
| `EMF_SENSOR_STARTED_AT` | ISO timestamp the public record began | unset |
| `MOCK_SENSOR_MODE` | `"1"` synthesises deterministic readings (Playwright) | unset |
| `TEST_HELPERS_ENABLED` | `"1"` exposes `/__test/reset` + `/__test/seed` | unset |
| `CURRENT_CACHE_TTL_SECONDS` | Cache TTL for `/current` and `/sensors` | `2` (wrangler vars), `3` (code fallback) |
| `HISTORY_CACHE_TTL_SECONDS` | Cache TTL for `/history` | `15` |
| `ENTROPY_CACHE_TTL_SECONDS` | Cache TTL for `/entropy` | `15` |
| `PUBLIC_API_RATE_LIMIT_PER_MINUTE` | Per-IP budget on `/api/v1/ghost-emf/*` | `60` |
| `SITE_URL` | Canonical site URL used by absolute-URL helpers | `https://ghost.megabyte.space` |
| `SITE_NAME` | Public site name in OpenAPI + UI copy | unset |
| `ANTHROPIC_API_KEY` | Claude key for chat + hotline | unset → Workers AI fallback |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | Twilio hotline credentials | unset |
| `LISTMONK_URL` / `LISTMONK_API_USER` / `LISTMONK_API_TOKEN` / `LISTMONK_LIST_ID` | Newsletter subscribe target | unset |

For the full, authoritative list, see [`src/types.ts`](src/types.ts) `Env` interface.

<a href="#testing" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Testing

```bash
# Full Playwright E2E suite (multi-feature flows, 6 breakpoints)
pnpm test:e2e

# Headed run
pnpm test:e2e:headed

# Open last HTML report
pnpm test:e2e:report
```

Local E2E uses a committed mock env at `.dev.vars.playwright`, runs the Worker in deterministic mock-sensor mode, enables dev-only `__test/seed` + `__test/reset` helpers, and writes state to `.wrangler/state/e2e`. Tests are stateful and accumulate &mdash; never deleted, only appended.

| Suite | Coverage | Breakpoints |
|---|---|---|
| `journey.spec.ts` | Full homepage walkthrough &mdash; click, type, scroll, chat | 375, 390, 768, 1024, 1280, 1920 |
| `api.spec.ts` | Every documented endpoint + error envelope shape | n/a |
| `hotline.spec.ts` | TwiML round-trip via mock Twilio webhook | n/a |
| `entropy.spec.ts` | Distribution sanity checks on `/random` | n/a |

<a href="#deploying" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Deploying

```bash
# Deploy to production (custom domain ghost.megabyte.space)
pnpm deploy

# Roll back the last deployment
pnpm wrangler rollback

# Tail live production logs
pnpm wrangler tail --env production --format=json
```

Cache purge after content changes:

```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "X-Auth-Email: $CF_EMAIL" \
  -H "X-Auth-Key: $CF_KEY" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

See [`docs/OPERATIONS.md`](docs/OPERATIONS.md) for the full runbook — first-time provisioning, secrets handling, smoke tests, rollback, D1/KV maintenance, and the incident playbook.

<a href="#the-hotline" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## The Hotline

Call `(601) 666-6602` from any phone. The call is answered by an AI persona running on Claude Haiku, recorded, transcribed, and published as a permanent transmission at [`/transmissions`](https://ghost.megabyte.space/transmissions). By calling, you consent to all of that.

| Step | What happens |
|---|---|
| 1 | Twilio answers and POSTs to `/api/v1/twilio/voice` |
| 2 | Worker streams a TwiML `<Gather input="speech">` |
| 3 | Caller's audio is transcribed by Twilio |
| 4 | Transcript is sent to Claude Haiku for the response |
| 5 | TwiML `<Say>` plays the AI reply, then re-gathers |
| 6 | On hangup, `/api/v1/twilio/status` finalizes the record + writes D1 + sends notification |

<a href="#the-dossier" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## The Dossier

Every section on the homepage is part of a public file. The dossier currently covers:

- The first 280&nbsp;mG alarm at a Rutgers nanostructures lab
- "Radiation TDR" / "Radiation TDS" cellular SSIDs broadcast by nearby cell towers
- Celestial hallucinations &mdash; orbs, parted clouds, the Atlanta layover
- The 666 rock at the lake
- Father Mark and the rejected exorcism
- St. John's Soup Kitchen &mdash; reality editing in real time
- Jungle Habitat &mdash; the dead battery in the haunted safari
- The Volume Hack and the middle-finger cursor
- Time-traveler encounters and the high-order angel saying, "Tell your story"
- The Hobbits &mdash; a monthly gathering of geniuses with `4 GONDOR` plates
- Funny Books &mdash; suspected MIB dispersal location

If you have your own pattern of phenomena, the [hotline](#the-hotline) takes calls.

<a href="#stack" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Stack

| Layer | Technology |
|---|---|
| **Edge runtime** | [Cloudflare Workers](https://workers.cloudflare.com/) |
| **Web framework** | [Hono](https://hono.dev/) + [@hono/zod-openapi](https://hono.dev/snippets/zod-openapi) (spec) + [Scalar API Reference](https://github.com/scalar/scalar) (UI at `/api/docs`) |
| **Static assets** | Cloudflare Assets (`public/`) |
| **Database** | [Cloudflare D1](https://developers.cloudflare.com/d1/) (snapshots, transcripts, newsletter, debate logs) |
| **KV** | [Cloudflare KV](https://developers.cloudflare.com/kv/) (rate limit counters + entropy seed) |
| **Sensor upstream** | [Home Assistant](https://www.home-assistant.io/) &harr; [GQ EMF-390](https://www.gqelectronicsllc.com/comersus/store/comersus_viewItem.asp?idProduct=5717) |
| **Voice / SMS** | [Twilio Voice](https://www.twilio.com/docs/voice/twiml) |
| **AI** | [Anthropic Claude](https://www.anthropic.com/api) Sonnet (chat) + Haiku (voice) with [Workers AI](https://developers.cloudflare.com/workers-ai/) fallback |
| **Frontend** | Vanilla TypeScript + [xterm.js](https://xtermjs.org/) for the in-browser MUD |
| **Newsletter** | [Resend](https://resend.com/) |
| **Build / package manager** | [pnpm](https://pnpm.io/) + [Wrangler](https://developers.cloudflare.com/workers/wrangler/) |
| **Testing** | [Playwright](https://playwright.dev/) v1.59+ multi-bp E2E |
| **Observability** | [Sentry](https://sentry.io/) + [PostHog](https://posthog.com/) + GA4 |

<a href="#references" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## References

- [Hono](https://hono.dev/) &mdash; tiny, fast Workers framework
- [@hono/zod-openapi](https://hono.dev/snippets/zod-openapi) &mdash; OpenAPI 3.0 generator from Zod schemas
- [Scalar API Reference](https://github.com/scalar/scalar) &mdash; interactive docs UI at `/api/docs`
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) &mdash; serverless edge runtime
- [Cloudflare D1](https://developers.cloudflare.com/d1/) &mdash; serverless SQLite at the edge
- [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/) &mdash; per-Worker cache control
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/) &mdash; sensor source of truth
- [GQ EMF-390](https://www.gqelectronicsllc.com/comersus/store/comersus_viewItem.asp?idProduct=5717) &mdash; the actual hardware
- [Twilio Voice TwiML](https://www.twilio.com/docs/voice/twiml) &mdash; hotline orchestration
- [Anthropic Claude](https://www.anthropic.com/api) &mdash; chat + voice persona
- [Playwright](https://playwright.dev/) &mdash; E2E harness, AI healer, multi-bp
- [xterm.js](https://xtermjs.org/) &mdash; MUD terminal in the browser

<a href="#contributing" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## Contributing

Contributions, issues, and feature requests are welcome. Open an [issue](https://github.com/megabyte-labs/ghost.megabyte.space/issues) first if the change is non-trivial. The project follows the [Emdash OS v6.0](https://github.com/heymegabyte/claude-skills) workflow &mdash; TDD, real-user E2E, deploy-then-purge, no console errors, no shortcuts. Stale docs are bugs. PRs that fix doc rot are loved.

| Channel | Where |
|---|---|
| Issues | [github.com/megabyte-labs/ghost.megabyte.space/issues](https://github.com/megabyte-labs/ghost.megabyte.space/issues) |
| Email | [hey@megabyte.space](mailto:hey@megabyte.space) |
| Hotline | [(601) 666-6602](tel:+16016666602) |
| Newsletter | [Subscribe on the homepage](https://ghost.megabyte.space/#newsletter) |

<details>
<summary><b>Sponsorship</b></summary>
<br/>
<blockquote>
<br/>
Dear Awesome Person,<br/><br/>
I create open source projects out of love. Although I have a job, shelter, and as much fast food as I can handle, it would still be pretty cool to be appreciated by the community for something I have spent a lot of time and money on. Please consider sponsoring me. Who knows? Maybe I'll be able to quit my job and publish open source full time.
<br/><br/>Sincerely,<br/><br/>

**_Brian Zalewski_**<br/><br/>

</blockquote>

<a title="Support us on GitHub" href="https://github.com/sponsors/ProfessorManhattan" target="_blank">
  <img alt="GitHub sponsors" src="https://img.shields.io/github/sponsors/ProfessorManhattan?label=GitHub%20sponsors&logo=github&style=for-the-badge" />
</a>
<a title="Support us on Open Collective" href="https://opencollective.com/megabytelabs" target="_blank">
  <img alt="Open Collective sponsors" src="https://img.shields.io/opencollective/sponsors/megabytelabs?logo=opencollective&label=OpenCollective&logoColor=white&style=for-the-badge" />
</a>
<a href="https://www.patreon.com/ProfessorManhattan" title="Support us on Patreon" target="_blank">
  <img alt="Patreon" src="https://img.shields.io/badge/Patreon-Support-052d49?logo=patreon&logoColor=white&style=for-the-badge" />
</a>

</details>

<a href="#license" style="width:100%"><img style="width:100%" src="https://gitlab.com/megabyte-labs/assets/-/raw/master/png/aqua-divider.png" /></a>

## License

Copyright &copy; 2024&ndash;2026 [Brian Zalewski](https://megabyte.space) / [Megabyte LLC](https://megabyte.space). The Lesson License &mdash; read [`LICENSE`](LICENSE) before you build on this. The signal pre-dates the software.
