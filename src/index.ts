/**
 * Ghost Signal Worker — Cloudflare Workers entrypoint.
 *
 * Single-file Hono router wiring every public-facing route, every webhook, and
 * the scheduled cron handler. Designed as a sibling reference for future
 * Claude Code passes: every cluster of routes is grouped + commented, every
 * top-level utility carries TSDoc, and every Zod schema has an `.openapi(...)`
 * name so `/api/v1/openapi.json` stays accurate.
 *
 * ## Route map (canonical inventory — keep in sync with `docs/ROUTES.md`)
 *
 * Public API (rate-limited via {@link publicReadRateLimit} mounted on
 * `/api/v1/ghost-emf/*` — note that `/api/v1/sensors` is intentionally NOT
 * under the prefix and is NOT rate-limited):
 *  - `GET /health` — liveness probe.
 *  - `GET /api/v1/ghost-emf/meta` — discovery metadata.
 *  - `GET /api/v1/ghost-emf/current` — latest EMF reading.
 *  - `GET /api/v1/sensors` — combined EMF + EF + RF snapshot.
 *  - `GET /api/v1/ghost-emf/history` — downsampled history series.
 *  - `GET /api/v1/ghost-emf/entropy` — Shannon entropy summary.
 *  - `GET /api/v1/ghost-emf/snapshot` — raw snapshot rows.
 *  - `GET /api/v1/ghost-emf/export` — CSV / Excel download.
 *  - `GET /api/v1/ghost-emf/google-sheets` — `=IMPORTDATA(...)` helper.
 *  - `GET /api/v1/ghost-emf/random` — reproducible RNG from snapshot hash.
 *  - `GET /api/v1/ghost-emf/timeline` — narrative + technical milestones.
 *
 * Conversational surfaces (web chat + Twilio voice hotline):
 *  - `POST /api/v1/chat` — visitor → Ghost Signal reply.
 *  - `GET  /api/v1/chat/history/:sessionId` — replay a chat session.
 *  - `POST /api/v1/twilio/voice|gather|status` — TwiML webhooks for 601-666-6602.
 *  - `GET  /api/v1/transmissions` — latest call rows.
 *  - `GET  /api/v1/transmissions/live` — Server-Sent Events stream.
 *  - `GET  /api/v1/transmission-count` — combined chat + call count.
 *  - `POST /api/v1/debate` — Anthropic-backed debate endpoint.
 *  - `POST /api/v1/newsletter/subscribe` — Listmonk passthrough.
 *
 * Static + redirect surface:
 *  - `GET /transmissions` → 301 → `/#transmissions`.
 *  - `GET /docs`, `GET /docs.html` → 301 → `/#docs`.
 *  - `GET /transmissions/:callSid.txt` — plain-text transmission dump.
 *  - `GET /api/v1/openapi.json` — OpenAPI 3.0 document (mounted via `app.doc`).
 *  - `GET /api/docs` — Scalar API reference UI (relaxed CSP).
 *  - `OPTIONS /api/*` — CORS preflight.
 *
 * Test-mode (gated by `TEST_HELPERS_ENABLED=1`):
 *  - `GET /__test/reset` — truncate `emf_snapshots`.
 *  - `GET /__test/seed` — deterministic mock-sensor backfill.
 *
 * Realtime:
 *  - `GET /ws/mud` — WebSocket → TCP MUD proxy with Telnet IAC stripping.
 *
 * Fallback:
 *  - `GET *` — static assets via the `ASSETS` binding.
 *
 * Scheduled:
 *  - cron `*​/1 * * * *` → {@link persistSnapshot} via the `scheduled` export.
 *
 * @packageDocumentation
 */

import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";

import { getCurrentCacheTtl, getEntropyCacheTtl, getHistoryCacheTtl, getSensorStartedAt, getSiteUrl } from "./lib/config";
import { calculateEntropy } from "./lib/entropy";
import { ApiError, jsonError } from "./lib/errors";
import { applyResponseHeaders, getSecurityHeaders } from "./lib/headers";
import { downsamplePoints, parseHistoryWindow } from "./lib/history";
import { fetchCurrentReading, fetchAllSensors, fetchHistoryPoints, persistSnapshot } from "./lib/home-assistant";
import { areTestHelpersEnabled, resetSnapshots, seedSnapshots } from "./lib/test-helpers";
import { publicReadRateLimit } from "./lib/rate-limit";
import {
  buildGoogleSheetsFormula,
  buildSnapshotCsv,
  buildSnapshotExcel,
  buildSnapshotExportUrl,
  buildSnapshotFilename,
  deriveSnapshotRandom,
  fetchSnapshotRecords,
} from "./lib/snapshots";
import { parse as parseYaml } from "yaml";
import timelineYamlText from "./data/timeline.yaml";
import { handleChat, getChatHistory } from "./lib/chat";
import { buildGreetingTwiml, handleGather, getTransmissions, getTransmissionCount } from "./lib/twilio";
import { storyMilestones, timelineAnnotations } from "./lib/timeline-events";
import type { AppVariables, Env, TimelineData } from "./types";

type Bindings = {
  Bindings: Env;
  Variables: AppVariables;
};

const ErrorSchema = z
  .object({
    error: z.string(),
    code: z.string(),
    details: z.unknown().optional(),
    requestId: z.string(),
  })
  .openapi("ApiError");

const HealthSchema = z
  .object({
    status: z.literal("ok"),
    version: z.string(),
    timestamp: z.string(),
  })
  .openapi("Health");

const MetaSchema = z
  .object({
    entityId: z.string(),
    publicName: z.string(),
    source: z.literal("home-assistant"),
    historyMode: z.enum(["d1", "home-assistant"]),
    earliestKnownAt: z.string(),
    docsUrl: z.string(),
    openApiUrl: z.string(),
    polling: z.object({
      recommendedIntervalMs: z.number(),
      currentCacheTtlSeconds: z.number(),
      historyCacheTtlSeconds: z.number(),
      entropyCacheTtlSeconds: z.number(),
    }),
  })
  .openapi("GhostEmfMeta");

const CurrentSchema = z
  .object({
    entityId: z.string(),
    friendlyName: z.string(),
    state: z.string(),
    numericValue: z.number(),
    unit: z.string().nullable(),
    lastChanged: z.string(),
    lastUpdated: z.string(),
    source: z.literal("home-assistant"),
    sampledAt: z.string(),
    cache: z.object({
      maxAgeSeconds: z.number(),
      staleWhileRevalidateSeconds: z.number(),
      strategy: z.literal("cloudflare-cache-api"),
    }),
  })
  .openapi("GhostEmfCurrent");

const AllSensorsSchema = z
  .object({
    emf: CurrentSchema.nullable(),
    ef: CurrentSchema.nullable(),
    rf: CurrentSchema.nullable(),
    sampledAt: z.string(),
  })
  .openapi("AllSensorReadings");

const HistoryPointSchema = z
  .object({
    timestamp: z.string(),
    value: z.number(),
  })
  .openapi("GhostEmfHistoryPoint");

const HistorySchema = z
  .object({
    entityId: z.string(),
    points: z.array(HistoryPointSchema),
    start: z.string(),
    end: z.string(),
    rawPointCount: z.number(),
    displayPointCount: z.number(),
    targetPoints: z.number(),
    generatedAt: z.string(),
  })
  .openapi("GhostEmfHistory");

const TimelineAnnotationSchema = z
  .object({
    id: z.string(),
    date: z.string(),
    title: z.string(),
    subtitle: z.string(),
    kind: z.enum(["technical", "narrative"]),
  })
  .openapi("TimelineAnnotation");

const StoryMilestoneSchema = z
  .object({
    id: z.string(),
    eraLabel: z.string(),
    title: z.string(),
    subtitle: z.string(),
    body: z.string(),
  })
  .openapi("StoryMilestone");

const TimelineSchema = z
  .object({
    entityId: z.string(),
    earliestKnownAt: z.string(),
    latestKnownAt: z.string(),
    annotations: z.array(TimelineAnnotationSchema),
    milestones: z.array(StoryMilestoneSchema),
    safetyNote: z.string(),
  })
  .openapi("GhostEmfTimeline");

const EntropySchema = z
  .object({
    entropyBits: z.number(),
    sampleCount: z.number(),
    windowMinutes: z.number(),
    bins: z.number(),
    min: z.number(),
    max: z.number(),
    mean: z.number(),
    updatedAt: z.string(),
  })
  .openapi("GhostEmfEntropy");

const SnapshotRecordSchema = z
  .object({
    entityId: z.string(),
    state: z.string(),
    numericValue: z.number(),
    unit: z.string().nullable(),
    lastChanged: z.string(),
    lastUpdated: z.string(),
    sampledAt: z.string(),
    source: z.string(),
  })
  .openapi("GhostEmfSnapshotRecord");

const SnapshotSchema = z
  .object({
    entityId: z.string(),
    start: z.string(),
    end: z.string(),
    sampleCount: z.number(),
    generatedAt: z.string(),
    storage: z.literal("d1"),
    points: z.array(SnapshotRecordSchema),
  })
  .openapi("GhostEmfSnapshot");

const GoogleSheetsSchema = z
  .object({
    entityId: z.string(),
    start: z.string(),
    end: z.string(),
    csvUrl: z.string(),
    importDataFormula: z.string(),
  })
  .openapi("GhostEmfGoogleSheets");

const RandomSchema = z
  .object({
    entityId: z.string(),
    start: z.string(),
    end: z.string(),
    sampleCount: z.number(),
    digits: z.number(),
    randomNumber: z.string(),
    randomUint32: z.number(),
    randomHex: z.string(),
    seedHash: z.string(),
    derivedAt: z.string(),
  })
  .openapi("GhostEmfRandom");

const app = new OpenAPIHono<Bindings>();
const version = "0.2.0";

function transmissionsPageHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Transmission Log | Ghost Signal</title>
  <meta name="description" content="Public record of every call and chat to the Ghost Signal AI hotline. Everything shared becomes part of the signal." />
  <link rel="canonical" href="https://ghost.megabyte.space/transmissions" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#060610" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&family=Sora:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
  <style>
    .tx-layout { padding-top: 1rem; padding-bottom: 3rem; }
    .tx-hero {
      text-align: center; padding: 2rem 0 2.5rem;
      background: radial-gradient(ellipse at 50% 50%, rgba(255, 23, 68, 0.08), transparent 60%);
      border-bottom: 1px solid rgba(255, 23, 68, 0.15);
      margin-bottom: 2rem;
    }
    .tx-hero h1 {
      font-family: var(--font-display); font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 700; margin-top: 0.5rem;
    }
    .tx-stats {
      display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem;
      font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);
    }
    .tx-stat-val { color: var(--accent-cyan); font-weight: 700; font-size: 1.2rem; display: block; }
    .tx-synopsis {
      padding: 1.5rem 2rem; margin-bottom: 2rem;
      border: 1px solid rgba(124, 58, 237, 0.2);
      border-radius: var(--radius-panel);
      background: var(--bg-panel);
    }
    .tx-synopsis h2 {
      font-family: var(--font-display); font-size: 1.1rem;
      color: var(--accent-purple); margin-bottom: 0.75rem;
    }
    .tx-synopsis ul {
      list-style: none; padding: 0;
      font-size: 0.88rem; line-height: 1.8;
    }
    .tx-synopsis li::before {
      content: "◆ "; color: var(--accent-cyan); font-size: 0.7rem;
    }
    .tx-filters {
      display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap;
    }
    .tx-filter-btn {
      padding: 0.4rem 1rem; border-radius: var(--radius-button);
      border: 1px solid var(--line); background: transparent;
      color: var(--text-muted); font-family: var(--font-mono);
      font-size: 0.75rem; cursor: pointer; transition: all 0.2s;
      text-transform: uppercase; letter-spacing: 0.1em;
    }
    .tx-filter-btn:hover, .tx-filter-btn.active {
      border-color: var(--accent-cyan); color: var(--accent-cyan);
      background: rgba(0, 229, 255, 0.06);
    }
    .tx-list { display: grid; gap: 1rem; }
    .tx-card {
      padding: 1.2rem 1.5rem;
      border: 1px solid var(--line); border-radius: var(--radius-panel);
      background: var(--bg-panel); transition: border-color 0.3s;
      cursor: pointer;
    }
    .tx-card:hover { border-color: rgba(255, 23, 68, 0.3); }
    .tx-card-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 0.5rem;
    }
    .tx-card-type {
      font-family: var(--font-mono); font-size: 0.65rem;
      text-transform: uppercase; letter-spacing: 0.12em;
      padding: 0.15rem 0.5rem; border-radius: var(--radius-button);
    }
    .tx-card-type.call {
      border: 1px solid var(--accent-red); color: var(--accent-red);
    }
    .tx-card-type.chat {
      border: 1px solid var(--accent-cyan); color: var(--accent-cyan);
    }
    .tx-card-time {
      font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);
    }
    .tx-card-preview {
      font-size: 0.88rem; line-height: 1.6; color: var(--text);
      max-height: 4.8rem; overflow: hidden;
      mask-image: linear-gradient(180deg, #000 60%, transparent);
      -webkit-mask-image: linear-gradient(180deg, #000 60%, transparent);
    }
    .tx-card.expanded .tx-card-preview {
      max-height: none; mask-image: none; -webkit-mask-image: none;
    }
    .tx-card-turns { margin-top: 0.75rem; display: none; }
    .tx-card.expanded .tx-card-turns { display: block; }
    .tx-turn {
      padding: 0.5rem 0; border-top: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.85rem; line-height: 1.6;
    }
    .tx-turn-label {
      font-family: var(--font-mono); font-size: 0.65rem;
      text-transform: uppercase; letter-spacing: 0.1em;
      margin-bottom: 0.2rem;
    }
    .tx-turn-label.caller { color: var(--accent-red); }
    .tx-turn-label.signal { color: var(--accent-cyan); }
    .tx-empty {
      text-align: center; padding: 3rem; color: var(--text-muted);
      font-family: var(--font-mono); font-size: 0.9rem;
    }
    .tx-load-more {
      display: block; width: 100%; padding: 0.8rem;
      margin-top: 1rem; border: 1px dashed var(--line);
      border-radius: var(--radius-panel); background: transparent;
      color: var(--text-muted); font-family: var(--font-mono);
      font-size: 0.8rem; cursor: pointer; transition: all 0.2s;
    }
    .tx-load-more:hover {
      border-color: var(--accent-cyan); color: var(--accent-cyan);
    }
    .tx-insignificant { opacity: 0.4; }
    .tx-filters + .tx-list .tx-insignificant { display: none; }
    .tx-filters.show-all + .tx-list .tx-insignificant { display: block; opacity: 0.6; }
  </style>
</head>
<body data-page="transmissions">
  <div class="noise"></div>
  <div class="scanlines" aria-hidden="true"></div>

  <header class="site-header">
    <a class="brand-lockup" href="/" aria-label="Ghost Signal — home" style="text-decoration:none;color:inherit;">
      <img class="brand-logo" src="/logo-nav.png?v=20260501-ghost" alt="Ghost Signal logo" width="64" height="64" />
      <div class="brand-mark">GHOST // SIGNAL</div>
    </a>
    <nav class="site-nav" aria-label="Primary">
      <a href="/">Signal</a>
      <a href="/transmissions" aria-current="page">Transmissions</a>
      <a href="/docs">Docs</a>
      <a href="/api/docs">API</a>
    </nav>
  </header>
  <script type="speculationrules">
  {
    "prerender": [
      { "where": { "href_matches": "/" }, "eagerness": "moderate" },
      { "where": { "href_matches": "/docs" }, "eagerness": "moderate" },
      { "where": { "href_matches": "/api/docs" }, "eagerness": "moderate" }
    ]
  }
  </script>

  <main class="shell tx-layout">
    <div class="tx-hero">
      <p class="eyebrow">PUBLIC RECORD // MEP TRANSMISSIONS</p>
      <h1>Transmission Log</h1>
      <p style="color: var(--text-muted); max-width: 50ch; margin: 0.5rem auto 0; font-size: 0.92rem;">
        Every call and chat — recorded, transcribed, and published.
        The Multiverse-Entropy Provider hides nothing.
      </p>
      <div class="tx-stats">
        <div><span class="tx-stat-val" id="tx-total-calls">--</span> calls</div>
        <div><span class="tx-stat-val" id="tx-total-chats">--</span> chats</div>
        <div><span class="tx-stat-val" id="tx-total">--</span> total entries</div>
      </div>
    </div>

    <div class="tx-synopsis" id="tx-synopsis">
      <h2>What People Are Talking About</h2>
      <ul id="tx-topics">
        <li>Loading transmission analysis...</li>
      </ul>
    </div>

    <div class="tx-filters" id="tx-filters">
      <button class="tx-filter-btn active" data-filter="all">All</button>
      <button class="tx-filter-btn" data-filter="call">Calls Only</button>
      <button class="tx-filter-btn" data-filter="chat">Chats Only</button>
      <button class="tx-filter-btn" data-filter="significant">Significant Only</button>
      <button class="tx-filter-btn" data-filter="show-all">Include Minor</button>
    </div>

    <div class="tx-list" id="tx-list">
      <div class="tx-empty">Loading transmissions...</div>
    </div>
  </main>

  <footer class="site-footer">
    <div class="footer-meta">
      <p class="footer-brand">Ghost Signal — Multiverse-Entropy Provider (MEP)</p>
      <p class="footer-copy">Personal story. Believe it or not. Wrapped into an entropy API.</p>
    </div>
  </footer>

  <script src="/transmissions.js"></script>
</body>
</html>`;
}

let cachedTimeline: TimelineData | null = null;
function getTimelineData(): TimelineData {
  if (!cachedTimeline) {
    cachedTimeline = parseYaml(timelineYamlText) as TimelineData;
  }
  return cachedTimeline;
}

function getDefaultCache(): Cache {
  return (caches as CacheStorage & { default: Cache }).default;
}

async function readCachedJson<T>(cacheKey: Request): Promise<T | null> {
  const cached = await getDefaultCache().match(cacheKey);
  if (!cached) {
    return null;
  }

  return (await cached.json()) as T;
}

function writeCachedJson(
  cacheKey: Request,
  payload: unknown,
  cacheControl: string,
  executionCtx: ExecutionContext,
): void {
  const response = new Response(JSON.stringify(payload), {
    headers: {
      "cache-control": cacheControl,
      "content-type": "application/json; charset=utf-8",
    },
  });

  executionCtx.waitUntil(getDefaultCache().put(cacheKey, response));
}

app.use("*", logger());

app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
  c.header("x-request-id", c.get("requestId"));
});

app.use("*", async (c, next) => {
  await next();
  const pathname = new URL(c.req.url).pathname;
  c.res = applyResponseHeaders(c.res, getSecurityHeaders(pathname));
});

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  summary: "Health check",
  tags: ["System"],
  responses: {
    200: {
      description: "Worker health",
      content: {
        "application/json": {
          schema: HealthSchema,
        },
      },
    },
  },
});

app.openapi(healthRoute, (c) =>
  c.json(
    {
      status: "ok",
      version,
      timestamp: new Date().toISOString(),
    },
    200,
  ),
);

const metaRoute = createRoute({
  method: "get",
  path: "/api/v1/ghost-emf/meta",
  summary: "Public metadata for the exposed EMF sensor",
  tags: ["Ghost EMF"],
  responses: {
    200: {
      description: "Sensor metadata",
      content: {
        "application/json": {
          schema: MetaSchema,
        },
      },
    },
  },
});

app.openapi(metaRoute, (c) =>
  c.json(
    {
      entityId: c.env.EMF_SENSOR_ENTITY_ID,
      publicName: c.env.EMF_SENSOR_NAME ?? "Ghost EMF",
      source: "home-assistant",
      historyMode: c.env.EMF_DB ? "d1" : "home-assistant",
      earliestKnownAt: getSensorStartedAt(c.env),
      docsUrl: `${getSiteUrl(c.env)}/docs`,
      openApiUrl: `${getSiteUrl(c.env)}/api/v1/openapi.json`,
      polling: {
        recommendedIntervalMs: 3000,
        currentCacheTtlSeconds: getCurrentCacheTtl(c.env),
        historyCacheTtlSeconds: getHistoryCacheTtl(c.env),
        entropyCacheTtlSeconds: getEntropyCacheTtl(c.env),
      },
    },
    200,
  ),
);

const currentRoute = createRoute({
  method: "get",
  path: "/api/v1/ghost-emf/current",
  summary: "Get the current normalized EMF reading",
  tags: ["Ghost EMF"],
  responses: {
    200: {
      description: "Current EMF reading",
      content: {
        "application/json": {
          schema: CurrentSchema,
        },
      },
    },
    503: {
      description: "Sensor unavailable",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

app.use("/api/v1/ghost-emf/*", publicReadRateLimit);

app.openapi(currentRoute, async (c) => {
  const ttl = getCurrentCacheTtl(c.env);
  const cacheKey = new Request(new URL("/__cache/ghost-emf/current", c.req.url).toString(), {
    method: "GET",
  });
  const cached = await readCachedJson<z.infer<typeof CurrentSchema>>(cacheKey);

  if (cached) {
    const response = c.json(cached, 200);
    response.headers.set("cache-control", `public, max-age=${ttl}, stale-while-revalidate=15`);
    response.headers.set("x-cache-status", "HIT");
    return response;
  }

  try {
    const reading = await fetchCurrentReading(c.env);
    const response = c.json(reading, 200);
    const cacheControl = `public, max-age=${ttl}, stale-while-revalidate=15`;

    response.headers.set("cache-control", cacheControl);
    response.headers.set("x-cache-status", "MISS");
    writeCachedJson(cacheKey, reading, cacheControl, c.executionCtx);

    return response;
  } catch {
    return c.json({ error: "Sensor upstream unavailable", code: "UPSTREAM_ERROR" }, 503);
  }
});

const sensorsRoute = createRoute({
  method: "get",
  path: "/api/v1/sensors",
  summary: "Get all GQ EMF-390 sensor readings (EMF, EF, RF)",
  tags: ["Ghost EMF"],
  responses: {
    200: {
      description: "All available sensor readings",
      content: {
        "application/json": {
          schema: AllSensorsSchema,
        },
      },
    },
  },
});

app.openapi(sensorsRoute, async (c) => {
  const ttl = getCurrentCacheTtl(c.env);
  const cacheKey = new Request(new URL("/__cache/sensors/all", c.req.url).toString(), {
    method: "GET",
  });
  const cached = await readCachedJson<z.infer<typeof AllSensorsSchema>>(cacheKey);

  if (cached) {
    const response = c.json(cached, 200);
    response.headers.set("cache-control", `public, max-age=${ttl}, stale-while-revalidate=15`);
    response.headers.set("x-cache-status", "HIT");
    return response;
  }

  try {
    const readings = await fetchAllSensors(c.env);
    const response = c.json(readings, 200);
    const cacheControl = `public, max-age=${ttl}, stale-while-revalidate=15`;

    response.headers.set("cache-control", cacheControl);
    response.headers.set("x-cache-status", "MISS");
    writeCachedJson(cacheKey, readings, cacheControl, c.executionCtx);

    return response;
  } catch {
    return c.json({ error: "Sensor upstream unavailable", code: "UPSTREAM_ERROR" }, 503);
  }
});

const historyRoute = createRoute({
  method: "get",
  path: "/api/v1/ghost-emf/history",
  summary: "Get EMF history for a recent window or explicit date range",
  tags: ["Ghost EMF"],
  request: {
    query: z.object({
      minutes: z.coerce.number().int().min(1).max(1440).default(60),
      start: z.string().optional(),
      end: z.string().optional(),
      targetPoints: z.coerce.number().int().min(32).max(4000).default(720),
    }),
  },
  responses: {
    200: {
      description: "Recent EMF points",
      content: {
        "application/json": {
          schema: HistorySchema,
        },
      },
    },
  },
});

app.openapi(historyRoute, async (c) => {
  const { minutes, start, end, targetPoints } = c.req.valid("query");
  const window = parseHistoryWindow({ minutes, start, end });
  const ttl = getHistoryCacheTtl(c.env);
  const cacheKey = new Request(
    new URL(
      `/__cache/ghost-emf/history?start=${encodeURIComponent(window.start)}&end=${encodeURIComponent(window.end)}&targetPoints=${targetPoints}`,
      c.req.url,
    ).toString(),
    { method: "GET" },
  );
  const cached = await readCachedJson<z.infer<typeof HistorySchema>>(cacheKey);

  if (cached) {
    const response = c.json(cached, 200);
    response.headers.set("cache-control", `public, max-age=${ttl}, stale-while-revalidate=30`);
    response.headers.set("x-cache-status", "HIT");
    return response;
  }

  const rawPoints = await fetchHistoryPoints(c.env, window);
  const points = downsamplePoints(rawPoints, targetPoints);
  const payload = {
    entityId: c.env.EMF_SENSOR_ENTITY_ID,
    points,
    start: window.start,
    end: window.end,
    rawPointCount: rawPoints.length,
    displayPointCount: points.length,
    targetPoints,
    generatedAt: new Date().toISOString(),
  };
  const response = c.json(payload, 200);
  const cacheControl = `public, max-age=${ttl}, stale-while-revalidate=30`;

  response.headers.set("cache-control", cacheControl);
  response.headers.set("x-cache-status", "MISS");
  writeCachedJson(cacheKey, payload, cacheControl, c.executionCtx);

  return response;
});

const entropyRoute = createRoute({
  method: "get",
  path: "/api/v1/ghost-emf/entropy",
  summary: "Compute Shannon entropy over a recent window or explicit date range",
  tags: ["Ghost EMF"],
  request: {
    query: z.object({
      minutes: z.coerce.number().int().min(1).max(1440).default(60),
      start: z.string().optional(),
      end: z.string().optional(),
      bins: z.coerce.number().int().min(2).max(128).default(16),
      targetPoints: z.coerce.number().int().min(32).max(4000).default(720),
    }),
  },
  responses: {
    200: {
      description: "Entropy summary",
      content: {
        "application/json": {
          schema: EntropySchema,
        },
      },
    },
  },
});

app.openapi(entropyRoute, async (c) => {
  const { minutes, start, end, bins, targetPoints } = c.req.valid("query");
  const window = parseHistoryWindow({ minutes, start, end });
  const ttl = getEntropyCacheTtl(c.env);
  const cacheKey = new Request(
    new URL(
      `/__cache/ghost-emf/entropy?start=${encodeURIComponent(window.start)}&end=${encodeURIComponent(window.end)}&bins=${bins}&targetPoints=${targetPoints}`,
      c.req.url,
    ).toString(),
    { method: "GET" },
  );
  const cached = await readCachedJson<z.infer<typeof EntropySchema>>(cacheKey);

  if (cached) {
    const response = c.json(cached, 200);
    response.headers.set("cache-control", `public, max-age=${ttl}, stale-while-revalidate=30`);
    response.headers.set("x-cache-status", "HIT");
    return response;
  }

  const points = downsamplePoints(await fetchHistoryPoints(c.env, window), targetPoints);
  const windowMinutes = Math.max(1, Math.round((new Date(window.end).getTime() - new Date(window.start).getTime()) / 60_000));
  const entropy = calculateEntropy(points, windowMinutes, bins);
  const response = c.json(entropy, 200);
  const cacheControl = `public, max-age=${ttl}, stale-while-revalidate=30`;

  response.headers.set("cache-control", cacheControl);
  response.headers.set("x-cache-status", "MISS");
  writeCachedJson(cacheKey, entropy, cacheControl, c.executionCtx);

  return response;
});

const snapshotQuerySchema = z.object({
  minutes: z.coerce.number().int().min(1).max(1440).default(60),
  start: z.string().optional(),
  end: z.string().optional(),
});

const snapshotRoute = createRoute({
  method: "get",
  path: "/api/v1/ghost-emf/snapshot",
  summary: "Get the raw D1 snapshot rows for a recent window or explicit date range",
  tags: ["Ghost EMF"],
  request: {
    query: snapshotQuerySchema,
  },
  responses: {
    200: {
      description: "Raw serverless snapshot rows",
      content: {
        "application/json": {
          schema: SnapshotSchema,
        },
      },
    },
  },
});

app.openapi(snapshotRoute, async (c) => {
  const { minutes, start, end } = c.req.valid("query");
  const window = parseHistoryWindow({ minutes, start, end });
  const ttl = getHistoryCacheTtl(c.env);
  const cacheKey = new Request(
    new URL(`/__cache/ghost-emf/snapshot?start=${encodeURIComponent(window.start)}&end=${encodeURIComponent(window.end)}`, c.req.url).toString(),
    { method: "GET" },
  );
  const cached = await readCachedJson<z.infer<typeof SnapshotSchema>>(cacheKey);

  if (cached) {
    const response = c.json(cached, 200);
    response.headers.set("cache-control", `public, max-age=${ttl}, stale-while-revalidate=30`);
    response.headers.set("x-cache-status", "HIT");
    return response;
  }

  const points = await fetchSnapshotRecords(c.env, window);
  const payload = {
    entityId: c.env.EMF_SENSOR_ENTITY_ID,
    start: window.start,
    end: window.end,
    sampleCount: points.length,
    generatedAt: new Date().toISOString(),
    storage: "d1" as const,
    points,
  };
  const response = c.json(payload, 200);
  const cacheControl = `public, max-age=${ttl}, stale-while-revalidate=30`;

  response.headers.set("cache-control", cacheControl);
  response.headers.set("x-cache-status", "MISS");
  writeCachedJson(cacheKey, payload, cacheControl, c.executionCtx);

  return response;
});

const exportRoute = createRoute({
  method: "get",
  path: "/api/v1/ghost-emf/export",
  summary: "Export raw D1 snapshots as CSV or an Excel-compatible workbook",
  tags: ["Ghost EMF"],
  request: {
    query: snapshotQuerySchema.extend({
      format: z.enum(["csv", "excel"]).default("csv"),
    }),
  },
  responses: {
    200: {
      description: "Snapshot export file",
      content: {
        "text/csv": {
          schema: z.string(),
        },
        "application/vnd.ms-excel": {
          schema: z.string(),
        },
      },
    },
  },
});

app.openapi(exportRoute, async (c) => {
  const { minutes, start, end, format } = c.req.valid("query");
  const window = parseHistoryWindow({ minutes, start, end });
  const records = await fetchSnapshotRecords(c.env, window);
  const filename = buildSnapshotFilename(window, format);

  if (format === "excel") {
    return new Response(buildSnapshotExcel(records, filename), {
      headers: {
        "cache-control": "public, max-age=15, stale-while-revalidate=30",
        "content-disposition": `attachment; filename="${filename}"`,
        "content-type": "application/vnd.ms-excel; charset=utf-8",
      },
    });
  }

  return new Response(buildSnapshotCsv(records), {
    headers: {
      "cache-control": "public, max-age=15, stale-while-revalidate=30",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-type": "text/csv; charset=utf-8",
    },
  });
});

const googleSheetsRoute = createRoute({
  method: "get",
  path: "/api/v1/ghost-emf/google-sheets",
  summary: "Get a Google Sheets IMPORTDATA formula for the selected snapshot range",
  tags: ["Ghost EMF"],
  request: {
    query: snapshotQuerySchema,
  },
  responses: {
    200: {
      description: "Google Sheets formula",
      content: {
        "application/json": {
          schema: GoogleSheetsSchema,
        },
      },
    },
  },
});

app.openapi(googleSheetsRoute, (c) => {
  const { minutes, start, end } = c.req.valid("query");
  const window = parseHistoryWindow({ minutes, start, end });

  return c.json(
    {
      entityId: c.env.EMF_SENSOR_ENTITY_ID,
      start: window.start,
      end: window.end,
      csvUrl: buildSnapshotExportUrl(c.env, window, "csv"),
      importDataFormula: buildGoogleSheetsFormula(c.env, window),
    },
    200,
  );
});

const randomRoute = createRoute({
  method: "get",
  path: "/api/v1/ghost-emf/random",
  summary: "Derive a reproducible random number from the selected D1 snapshot range",
  tags: ["Ghost EMF"],
  request: {
    query: snapshotQuerySchema.extend({
      digits: z.coerce.number().int().min(1).max(18).default(10),
    }),
  },
  responses: {
    200: {
      description: "Random number derived from snapshot rows",
      content: {
        "application/json": {
          schema: RandomSchema,
        },
      },
    },
  },
});

app.openapi(randomRoute, async (c) => {
  const { minutes, start, end, digits } = c.req.valid("query");
  const window = parseHistoryWindow({ minutes, start, end });
  const summary = await deriveSnapshotRandom(await fetchSnapshotRecords(c.env, window), window, digits);

  const response = c.json(
    {
      entityId: c.env.EMF_SENSOR_ENTITY_ID,
      ...summary,
    },
    200,
  );
  response.headers.set("cache-control", "no-store");
  return response;
});

const timelineRoute = createRoute({
  method: "get",
  path: "/api/v1/ghost-emf/timeline",
  summary: "Get timeline metadata, technical annotations, and story milestones",
  tags: ["Ghost EMF"],
  responses: {
    200: {
      description: "Timeline metadata",
      content: {
        "application/json": {
          schema: TimelineSchema,
        },
      },
    },
  },
});

app.openapi(timelineRoute, (c) => {
  const yamlData = getTimelineData();
  return c.json(
    {
      entityId: c.env.EMF_SENSOR_ENTITY_ID,
      earliestKnownAt: getSensorStartedAt(c.env),
      latestKnownAt: new Date().toISOString(),
      annotations: timelineAnnotations,
      milestones: storyMilestones,
      events: yamlData.events,
      categories: yamlData.categories,
      safetyNote:
        "Do not use this dataset to rationalize cruelty, abuse any animals, or justify harm to anyone.",
    },
    200,
  );
});

app.post("/api/v1/chat", async (c) => {
  const body = await c.req.json<{ message?: string; sessionId?: string }>();
  const message = body.message?.trim();
  if (!message || message.length === 0 || message.length > 2000) {
    return c.json({ error: "Message must be 1-2000 characters.", code: "INVALID_MESSAGE" }, 400);
  }

  const sessionId = body.sessionId || crypto.randomUUID();
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
  const response = await handleChat(c.env, message, sessionId, ip);

  return c.json({ response, sessionId }, 200);
});

app.get("/api/v1/chat/history/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  if (!sessionId) {
    return c.json({ error: "Session ID required.", code: "MISSING_SESSION" }, 400);
  }

  const messages = await getChatHistory(c.env, sessionId);
  return c.json({ messages }, 200);
});

app.post("/api/v1/twilio/voice", async (c) => {
  const siteUrl = getSiteUrl(c.env);
  const gatherUrl = `${siteUrl}/api/v1/twilio/gather`;
  const twiml = buildGreetingTwiml(gatherUrl);
  return new Response(twiml, {
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
});

app.post("/api/v1/twilio/gather", async (c) => {
  const formData = await c.req.parseBody();
  const speechResult = (formData.SpeechResult as string) ?? "";
  const callSid = (formData.CallSid as string) ?? "unknown";
  const callerNumber = (formData.From as string) ?? "unknown";
  const siteUrl = getSiteUrl(c.env);
  const gatherUrl = `${siteUrl}/api/v1/twilio/gather`;

  const twiml = await handleGather(c.env, speechResult, callSid, callerNumber, gatherUrl);
  return new Response(twiml, {
    headers: { "content-type": "text/xml; charset=utf-8" },
  });
});

app.post("/api/v1/twilio/status", async (c) => {
  return c.json({ ok: true }, 200);
});

app.get("/api/v1/transmissions", async (c) => {
  const transmissions = await getTransmissions(c.env, 50);
  return c.json({ transmissions, total: transmissions.length }, 200);
});

app.get("/api/v1/transmissions/live", async (c) => {
  if (!c.env.EMF_DB) return c.json({ entries: [], total: 0 }, 200);

  const sinceParam = c.req.query("since");
  const limitParam = c.req.query("limit");
  const limit = Math.min(50, Math.max(1, Number(limitParam) || 30));

  const callQuery = sinceParam
    ? c.env.EMF_DB.prepare(
        "SELECT call_sid, caller_number, transcript, ai_response, turn_number, created_at FROM call_transmissions WHERE created_at > ? ORDER BY created_at DESC LIMIT ?"
      ).bind(sinceParam, limit)
    : c.env.EMF_DB.prepare(
        "SELECT call_sid, caller_number, transcript, ai_response, turn_number, created_at FROM call_transmissions ORDER BY created_at DESC LIMIT ?"
      ).bind(limit);

  const chatQuery = sinceParam
    ? c.env.EMF_DB.prepare(
        "SELECT session_id, role, content, created_at FROM chat_messages WHERE created_at > ? ORDER BY created_at DESC LIMIT ?"
      ).bind(sinceParam, limit)
    : c.env.EMF_DB.prepare(
        "SELECT session_id, role, content, created_at FROM chat_messages ORDER BY created_at DESC LIMIT ?"
      ).bind(limit);

  const [calls, chats, countRes] = await Promise.all([
    callQuery.all(),
    chatQuery.all(),
    c.env.EMF_DB.prepare("SELECT (SELECT COUNT(*) FROM call_transmissions) + (SELECT COUNT(*) FROM chat_messages) as total").first<{ total: number }>(),
  ]);

  const entries: Array<{
    type: "call" | "chat";
    createdAt: string;
    callSid?: string;
    callerNumber?: string;
    transcript?: string;
    aiResponse?: string;
    turnNumber?: number;
    sessionId?: string;
    role?: string;
    content?: string;
  }> = [];

  for (const r of calls.results) {
    entries.push({
      type: "call",
      createdAt: r.created_at as string,
      callSid: r.call_sid as string,
      callerNumber: (r.caller_number as string).replace(/\d(?=\d{4})/g, "*"),
      transcript: r.transcript as string,
      aiResponse: r.ai_response as string,
      turnNumber: r.turn_number as number,
    });
  }

  for (const r of chats.results) {
    entries.push({
      type: "chat",
      createdAt: r.created_at as string,
      sessionId: (r.session_id as string).slice(0, 8),
      role: r.role as string,
      content: r.content as string,
    });
  }

  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return c.json({
    entries: entries.slice(0, limit),
    total: countRes?.total ?? 0,
    latestAt: entries[0]?.createdAt ?? null,
  }, 200, {
    "cache-control": "public, max-age=3, stale-while-revalidate=10",
  });
});

app.get("/api/v1/transmission-count", async (c) => {
  const count = await getTransmissionCount(c.env);
  return c.json({ count }, 200);
});

app.post("/api/v1/debate", async (c) => {
  const body = await c.req.json<{ topic?: string }>().catch(() => ({} as { topic?: string }));
  const topic = body.topic || "True entropy from a public EMF sensor";

  // Generate debate rounds — client-side pre-written for now (no AI dependency)
  const debateBank: Record<string, Array<{ for: string; against: string }>> = {
    "True entropy from a public EMF sensor": [
      { for: "True randomness from a living EMF source — entropy no algorithm can fake. Built into AI to prevent deterministic tyranny.", against: "EMF readings from a single sensor are noise, not entropy. Peer-reviewed RNG hardware already exists." },
      { for: "The multiverse fog-of-war theory suggests EMF fluctuations represent genuine quantum-adjacent entropy observable at macro scale.", against: "Extraordinary claims require extraordinary evidence. Publishing EMF data is not the same as proving multiverse interaction." },
      { for: "By feeding true randomness into AI from a source that even abominable forces cannot control, we protect free will itself.", against: "Cryptographically secure PRNGs are already indistinguishable from true randomness for all practical purposes." },
    ],
    "AI hotline as public record": [
      { for: "An AI listens, transcribes, and publishes every call. The public record finally outpaces the institutions that bury it.", against: "An AI intake line invites prank calls, harassment, and disinformation faster than moderation can respond." },
      { for: "Transcripts as plain text files mean callers own the record forever — no platform can deplatform a static file behind a CDN.", against: "Caller identity, mental-health context, and consent get muddied when every utterance becomes searchable forever." },
      { for: "Every transmission is a data point. The corpus turns rumor into pattern, and pattern into something a community can audit.", against: "Volume isn't truth. A million unverified transmissions still don't add up to evidence." },
    ],
    "Time travelers and clandestine surveillance": [
      { for: "Pattern-recognition over decades — repeated plates, staged encounters, dream-burden coincidences — is data no single experiment captures.", against: "Apophenia thrives in long timelines. The brain manufactures patterns where none exist." },
      { for: "Multiple agencies declined to investigate. That refusal is itself a record. Silence is signal.", against: "Agencies decline weak-evidence reports for the same reason scientists do — limited resources, infinite claims." },
      { for: "The dossier exists as plates, audio, video, and timestamps. The evidence is reproducible by anyone who looks.", against: "Reproducible evidence is verifiable by independent observers, not just available to look at. The two are not the same." },
    ],
    "Ghost Signal Entropy Science": [
      { for: "True randomness from a living EMF source — entropy no algorithm can fake. Built into AI to prevent deterministic tyranny.", against: "EMF readings from a single sensor are noise, not entropy. Peer-reviewed RNG hardware already exists." },
      { for: "The multiverse fog-of-war theory suggests EMF fluctuations represent genuine quantum-adjacent entropy observable at macro scale.", against: "Extraordinary claims require extraordinary evidence. Publishing EMF data is not the same as proving multiverse interaction." },
      { for: "By feeding true randomness into AI from a source that even abominable forces cannot control, we protect free will itself.", against: "Cryptographically secure PRNGs are already indistinguishable from true randomness for all practical purposes." },
    ],
  };

  const rounds = debateBank[topic] || debateBank["True entropy from a public EMF sensor"];
  return c.json({ topic, rounds });
});

app.post("/api/v1/newsletter/subscribe", async (c) => {
  const ip = c.req.header("cf-connecting-ip") || "unknown";
  if (c.env.RATE_LIMIT_KV) {
    const key = `newsletter:${ip}`;
    const count = parseInt((await c.env.RATE_LIMIT_KV.get(key)) || "0", 10);
    if (count >= 5) {
      return c.json({ error: "Too many requests. Try again in a minute." }, 429);
    }
    c.executionCtx.waitUntil(
      c.env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 60 })
    );
  }

  const body = await c.req.json<{ email?: string }>().catch(() => ({} as { email?: string }));
  const email = body.email?.trim()?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return c.json({ error: "Valid email required." }, 400);
  }
  // Anonymous by design — never store a real name. Listmonk requires `name`,
  // so we send a fixed placeholder. The 666 channel is for people to share
  // what happened to them without identifying themselves.
  const name = "anonymous";

  // Best-effort local mirror (D1) — keeps a private record of every signup.
  if (c.env.EMF_DB) {
    c.executionCtx.waitUntil(
      c.env.EMF_DB.prepare(
        "INSERT OR IGNORE INTO newsletter_subscribers (email, subscribed_at) VALUES (?, ?)"
      ).bind(email, new Date().toISOString()).run().then(() => undefined).catch(() => undefined)
    );
  }

  // Forward to Listmonk. Without creds, treat as success (D1 mirror still recorded).
  const listmonkUrl = c.env.LISTMONK_URL;
  const listmonkUser = c.env.LISTMONK_API_USER;
  const listmonkToken = c.env.LISTMONK_API_TOKEN;
  const listmonkListId = parseInt(c.env.LISTMONK_LIST_ID || "0", 10);

  if (!listmonkUrl || !listmonkUser || !listmonkToken || !listmonkListId) {
    return c.json({ ok: true, message: "Subscribed. The signal will find you." });
  }

  try {
    const auth = btoa(`${listmonkUser}:${listmonkToken}`);
    const res = await fetch(`${listmonkUrl.replace(/\/$/, "")}/api/subscribers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${auth}`,
        "user-agent": "ghost.megabyte.space/1.0",
      },
      body: JSON.stringify({
        email,
        name,
        status: "enabled",
        lists: [listmonkListId],
        preconfirm_subscriptions: true,
      }),
    });

    if (res.ok) {
      return c.json({ ok: true, message: "Subscribed. The signal will find you." });
    }

    const text = await res.text();
    // 409: already exists. Re-add to the list to be safe, then treat as success.
    if (res.status === 409 || /already exists/i.test(text)) {
      try {
        const listRes = await fetch(`${listmonkUrl.replace(/\/$/, "")}/api/subscribers/lists`, {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            authorization: `Basic ${auth}`,
          },
          body: JSON.stringify({
            query: `subscribers.email = '${email.replace(/'/g, "''")}'`,
            action: "add",
            target_list_ids: [listmonkListId],
            status: "confirmed",
          }),
        });
        void listRes;
      } catch {
        // ignore — original 409 is still a logical success
      }
      return c.json({ ok: true, message: "You're already on the list. Signal locked." });
    }

    console.error("listmonk_subscribe_failed", { status: res.status, body: text.slice(0, 500) });
    return c.json({ error: "Subscription service is offline. Try again shortly." }, 502);
  } catch (err) {
    console.error("listmonk_subscribe_exception", err);
    return c.json({ error: "Network error reaching the signal relay." }, 502);
  }
});

app.get("/transmissions", (c) => c.redirect("/#transmissions", 301));
app.get("/docs", (c) => c.redirect("/#docs", 301));
app.get("/docs.html", (c) => c.redirect("/#docs", 301));

app.get("/transmissions/:callSid.txt", async (c) => {
  const callSid = c.req.param("callSid");
  if (!c.env.EMF_DB) return c.text("No database.", 503);

  const result = await c.env.EMF_DB
    .prepare("SELECT transcript, ai_response, turn_number, created_at FROM call_transmissions WHERE call_sid = ? ORDER BY turn_number ASC")
    .bind(callSid)
    .all();

  if (result.results.length === 0) return c.text("Transmission not found.", 404);

  let output = `GHOST SIGNAL HOTLINE — Call ${callSid}\n`;
  output += `Recorded: ${result.results[0]?.created_at ?? "unknown"}\n`;
  output += "─────────────────────────────────\n\n";
  for (const t of result.results) {
    output += `CALLER: ${t.transcript}\n`;
    output += `SIGNAL: ${t.ai_response}\n\n`;
  }

  return new Response(output, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
});

app.doc("/api/v1/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "ghost.megabyte.space API",
    version,
    description:
      "Public EMF sensor API backed by Home Assistant, edge-cached on Cloudflare, and designed for polling, graphing, and entropy experiments.",
  },
  servers: [{ url: "https://ghost.megabyte.space" }],
});

app.get("/api/docs", (c) => {
  return c.html(`<!doctype html>
<html lang="en" data-page="api-docs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ghost Signal API Reference</title>
  <meta name="description" content="Interactive API reference for the Ghost Signal — EMF, EF, RF, entropy, transmissions, and AI chat. Live try-it-out and multi-language code samples." />
  <meta name="theme-color" content="#060610" />
  <link rel="canonical" href="https://ghost.megabyte.space/api/docs" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=20260501-ghost" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=20260501-ghost" />
  <link rel="icon" href="/favicon.ico?v=20260501-ghost" sizes="any" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20260501-ghost" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Fira+Code:wght@400;500;700&family=Sora:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css?v=20260501-reveal" />
  <style>
    @view-transition { navigation: auto; }
    :root {
      --gs-bg: #060610;
      --gs-bg-2: #0a0a1a;
      --gs-cyan: #00E5FF;
      --gs-blue: #50AAE3;
      --gs-violet: #7C3AED;
      --gs-red: #ff1744;
      --gs-text: #e7e7ef;
      --gs-muted: #9aa0b4;
      --gs-line: rgba(255,255,255,0.08);
    }
    html, body[data-page="api-docs"] {
      margin: 0;
      background: #060610;
      color: var(--gs-text);
      font-family: 'Sora', system-ui, sans-serif;
    }
    body[data-page="api-docs"] a { color: var(--gs-cyan); }
    /* Reuse the homepage .site-header brand lockup so the nav is identical across routes */
    body[data-page="api-docs"] .site-header {
      view-transition-name: site-header;
    }
    .gs-banner {
      padding: 2.4rem 1.5rem 2rem;
      background:
        radial-gradient(900px 240px at 8% -20%, rgba(0,229,255,0.18), transparent 60%),
        radial-gradient(700px 260px at 92% 0%, rgba(124,58,237,0.18), transparent 65%),
        linear-gradient(180deg, var(--gs-bg-2), var(--gs-bg));
      border-bottom: 1px solid var(--gs-line);
      view-transition-name: page-banner;
    }
    .gs-banner-shell { max-width: 1200px; margin: 0 auto; }
    .gs-banner .eyebrow {
      display: inline-block;
      font-family: 'Fira Code', monospace; font-size: 11px;
      letter-spacing: 0.22em; text-transform: uppercase;
      color: var(--gs-cyan); margin: 0 0 0.5rem;
      padding: 0.25rem 0.6rem;
      border: 1px solid rgba(0,229,255,0.35); border-radius: 999px;
      background: rgba(0,229,255,0.04);
    }
    .gs-banner h1 {
      margin: 0 0 0.5rem;
      font-family: 'Cinzel', serif;
      font-size: clamp(1.8rem, 4vw, 2.6rem);
      font-weight: 700; letter-spacing: 0.01em;
      background: linear-gradient(135deg, #fff 0%, #b9bccd 60%, var(--gs-cyan) 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .gs-banner p {
      margin: 0;
      color: var(--gs-muted);
      max-width: 760px;
      line-height: 1.65;
      font-size: 0.95rem;
    }
    .gs-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 1rem; }
    .gs-chip {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 12px; border: 1px solid var(--gs-line); border-radius: 999px;
      background: rgba(255,255,255,0.02); font-family: 'Fira Code', monospace; font-size: 12px;
      transition: border-color 0.2s, background 0.2s;
    }
    .gs-chip:hover { border-color: rgba(0,229,255,0.4); background: rgba(0,229,255,0.05); }
    .gs-chip .dot { width: 8px; height: 8px; border-radius: 999px; box-shadow: 0 0 10px currentColor; }
    .gs-chip.emf .dot { background: var(--gs-cyan); color: var(--gs-cyan); }
    .gs-chip.ef .dot { background: var(--gs-blue); color: var(--gs-blue); }
    .gs-chip.rf .dot { background: var(--gs-violet); color: var(--gs-violet); }
    .gs-spec-pill {
      display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 1rem;
      padding: 0.45rem 0.95rem; border-radius: 999px;
      border: 1px solid rgba(0,229,255,0.4);
      color: var(--gs-cyan); font-family: 'Fira Code', monospace; font-size: 12px;
      text-decoration: none; transition: background 0.2s, transform 0.2s;
    }
    .gs-spec-pill:hover { background: rgba(0,229,255,0.08); transform: translateY(-1px); }
    /* Scalar overrides — match brand palette */
    .scalar-app, .scalar-api-reference { background: var(--gs-bg) !important; }
    [data-theme="dark"] .scalar-card, [data-theme="dark"] .references-rendered { background: var(--gs-bg) !important; }
    /* View transitions */
    @media (prefers-reduced-motion: no-preference) {
      ::view-transition-old(root), ::view-transition-new(root) {
        animation-duration: 280ms;
        animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      }
    }
  </style>
</head>
<body data-page="api-docs">
  <header class="site-header">
    <a class="brand-lockup" href="/" aria-label="Ghost Signal — home" style="text-decoration:none;color:inherit;">
      <img class="brand-logo" src="/logo-nav.png?v=20260501-ghost" alt="Ghost Signal logo" width="64" height="64" />
      <div class="brand-mark">GHOST // SIGNAL</div>
    </a>
    <nav class="site-nav" aria-label="Primary">
      <a href="/">Signal</a>
      <a href="/transmissions">Transmissions</a>
      <a href="/docs">Docs</a>
      <a href="/api/docs" aria-current="page">API</a>
    </nav>
  </header>
  <section class="gs-banner">
    <div class="gs-banner-shell">
      <p class="eyebrow">API // PUBLIC SIGNAL</p>
      <h1>Build on the Ghost Signal</h1>
      <p>Public, read-only, edge-cached API for real-time EMF/EF/RF sensor data, entropy analysis, transmissions, and AI chat. Try every endpoint live, copy as curl/JS/Python, or wire it into Google Sheets.</p>
      <div class="gs-chips" aria-label="Sensor entities">
        <span class="gs-chip emf"><span class="dot"></span>EMF · sensor.gq_emf390_emf_mg</span>
        <span class="gs-chip ef"><span class="dot"></span>EF · sensor.gq_emf390_ef_v_m</span>
        <span class="gs-chip rf"><span class="dot"></span>RF · sensor.gq_emf390_rf_total_density_mw_m2</span>
      </div>
      <a class="gs-spec-pill" href="/api/v1/openapi.json">openapi.json &rarr;</a>
    </div>
  </section>
  <script type="speculationrules">
    {
      "prerender": [
        { "where": { "href_matches": "/" }, "eagerness": "moderate" },
        { "where": { "href_matches": "/transmissions" }, "eagerness": "moderate" },
        { "where": { "href_matches": "/docs" }, "eagerness": "moderate" }
      ]
    }
  </script>
  <script
    id="api-reference"
    data-url="/api/v1/openapi.json"
    data-configuration='${JSON.stringify({
      theme: "purple",
      layout: "modern",
      hideDownloadButton: false,
      hiddenClients: ["wget", "httpie", "okhttp", "libcurl"],
      defaultHttpClient: { targetKey: "shell", clientKey: "curl" },
      customCss: `
        :root {
          --scalar-color-1: #e7e7ef;
          --scalar-color-2: #b9bccd;
          --scalar-color-3: #9aa0b4;
          --scalar-color-accent: #00E5FF;
          --scalar-background-1: #060610;
          --scalar-background-2: #0a0a1a;
          --scalar-background-3: #0f0f24;
          --scalar-background-accent: rgba(0,229,255,0.10);
          --scalar-border-color: rgba(255,255,255,0.08);
          --scalar-button-1: #00E5FF;
          --scalar-button-1-color: #060610;
          --scalar-button-1-hover: #5cf3ff;
          --scalar-color-green: #38f0a3;
          --scalar-color-red: #ff5577;
          --scalar-color-yellow: #ffd166;
          --scalar-color-blue: #50AAE3;
          --scalar-color-orange: #ffb05a;
          --scalar-color-purple: #b794f4;
          --scalar-radius: 10px;
          --scalar-radius-lg: 14px;
          --scalar-radius-xl: 18px;
          --scalar-font: 'Sora', system-ui, sans-serif;
          --scalar-font-code: 'Fira Code', ui-monospace, monospace;
        }
        .dark-mode {
          --scalar-color-1: #e7e7ef;
          --scalar-background-1: #060610;
          --scalar-background-2: #0a0a1a;
          --scalar-background-3: #0f0f24;
        }
        .sidebar { background: linear-gradient(180deg, #08081a, #060610) !important; border-right: 1px solid rgba(255,255,255,0.06) !important; }
        .show-api-client-button { background: linear-gradient(135deg, #00E5FF, #7C3AED) !important; color: #060610 !important; border: 0 !important; }
        .scalar-card { box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 30px 60px -30px rgba(0,229,255,0.15) !important; }
        h1.section-header, h2.section-header { letter-spacing: -0.01em; }
        .badge { font-family: 'Fira Code', monospace !important; letter-spacing: 0.04em; }
      `,
      metaData: {
        title: "Ghost Signal API Reference",
        description: "Public EMF/EF/RF/entropy/transmissions API — interactive try-it-out.",
        ogTitle: "Ghost Signal API Reference",
      },
    })
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")}'
  ></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`);
});

app.options("/api/*", (c) => {
  c.header("access-control-allow-origin", "*");
  c.header("access-control-allow-methods", "GET, POST, OPTIONS");
  c.header("access-control-allow-headers", "Content-Type");
  return c.body(null, 204);
});

app.get("/__test/reset", async (c) => {
  if (!areTestHelpersEnabled(c.env)) {
    throw new ApiError("Test helpers are disabled.", 404, "NOT_FOUND");
  }

  const deleted = await resetSnapshots(c.env);
  return c.json({ ok: true, deleted }, 200);
});

app.get("/__test/seed", async (c) => {
  if (!areTestHelpersEnabled(c.env)) {
    throw new ApiError("Test helpers are disabled.", 404, "NOT_FOUND");
  }

  const query = c.req.query();
  const resetFirst = query.reset === "1";
  const start = query.start;
  const end = query.end;
  const minutes = query.minutes ? Number.parseInt(query.minutes, 10) : 60;
  const window = parseHistoryWindow({ start, end, minutes: Number.isFinite(minutes) ? minutes : 60 });

  if (resetFirst) {
    await resetSnapshots(c.env);
  }

  const inserted = await seedSnapshots(c.env, window);
  return c.json(
    {
      ok: true,
      start: window.start,
      end: window.end,
      inserted,
    },
    200,
  );
});

// Strip Telnet IAC negotiation sequences from raw TCP data
function stripTelnet(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  while (i < data.length) {
    if (data[i] === 0xff && i + 1 < data.length) {
      const cmd = data[i + 1];
      if (cmd >= 0xfb && cmd <= 0xfe) {
        // WILL/WONT/DO/DONT + option byte = 3 bytes
        i += 3;
      } else if (cmd === 0xfa) {
        // Sub-negotiation: skip until IAC SE (0xFF 0xF0)
        i += 2;
        while (i < data.length) {
          if (data[i] === 0xff && i + 1 < data.length && data[i + 1] === 0xf0) {
            i += 2;
            break;
          }
          i++;
        }
      } else if (cmd === 0xff) {
        // Escaped 0xFF = literal 0xFF
        out.push(0xff);
        i += 2;
      } else {
        // Other 2-byte commands (GA, NOP, etc.)
        i += 2;
      }
    } else {
      out.push(data[i]);
      i++;
    }
  }
  return new Uint8Array(out);
}

// WebSocket-to-TCP proxy for Avatar MUD
app.get("/ws/mud", async (c) => {
  const upgradeHeader = c.req.header("Upgrade");
  if (upgradeHeader !== "websocket") {
    return c.text("Expected WebSocket upgrade", 426);
  }

  const pair = new WebSocketPair();
  const [client, server] = [pair[0], pair[1]];
  server.accept();

  const { connect } = await import("cloudflare:sockets");
  const tcpSocket = connect("avatar.outland.org:3000");

  // TCP readable → strip Telnet negotiation → WebSocket
  const reader = tcpSocket.readable.getReader();
  (async () => {
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const cleaned = stripTelnet(value);
        if (cleaned.length > 0) {
          try { server.send(cleaned); } catch { break; }
        }
      }
    } catch {
      // TCP connection closed
    } finally {
      try { server.close(1000, "TCP closed"); } catch { /* already closed */ }
    }
  })();

  // WebSocket → TCP writable
  const writer = tcpSocket.writable.getWriter();
  server.addEventListener("message", async (event) => {
    const data =
      typeof event.data === "string"
        ? new TextEncoder().encode(event.data)
        : new Uint8Array(event.data as ArrayBuffer);
    try { await writer.write(data); } catch { /* TCP closed */ }
  });

  server.addEventListener("close", () => {
    try { writer.close(); } catch { /* already closed */ }
    try { tcpSocket.close(); } catch { /* already closed */ }
  });

  return new Response(null, { status: 101, webSocket: client });
});

app.get("*", async (c) => {
  const url = new URL(c.req.url);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    throw new ApiError(`Route GET ${pathname} was not found.`, 404, "NOT_FOUND");
  }

  const assetPath = pathname === "/" ? "/index.html" : pathname === "/docs" ? "/docs.html" : pathname === "/privacy" ? "/privacy.html" : pathname === "/terms" ? "/terms.html" : pathname;
  const assetUrl = new URL(assetPath, url);
  let assetResponse = await c.env.ASSETS.fetch(new Request(assetUrl.toString(), { method: "GET" }));

  // ASSETS may redirect /index.html → / — follow it internally to avoid loops
  if (assetResponse.status >= 300 && assetResponse.status < 400) {
    const redirectTo = assetResponse.headers.get("location");
    if (redirectTo) {
      const redirectUrl = new URL(redirectTo, assetUrl);
      assetResponse = await c.env.ASSETS.fetch(new Request(redirectUrl.toString(), { method: "GET" }));
    }
  }

  if (assetResponse.status === 404 && !assetPath.includes(".")) {
    const notFoundPage = await c.env.ASSETS.fetch(new Request(new URL("/404.html", url).toString(), { method: "GET" }));
    return applyResponseHeaders(new Response(notFoundPage.body, { status: 404, headers: notFoundPage.headers }), {
      "cache-control": "public, max-age=0, must-revalidate",
    });
  }

  return applyResponseHeaders(assetResponse, {
    "cache-control": assetPath.endsWith(".html")
      ? "public, max-age=0, must-revalidate"
      : "public, max-age=31536000, immutable",
  });
});

app.onError((error, c) => {
  const requestId = c.get("requestId") ?? crypto.randomUUID();

  if (error instanceof ApiError) {
    return jsonError(error, requestId);
  }

  if (error instanceof HTTPException) {
    return jsonError(new ApiError(error.message, error.status, `HTTP_${error.status}`), requestId);
  }

  console.error(error);
  return jsonError(new ApiError("Something went wrong on our end.", 500, "INTERNAL_ERROR"), requestId);
});

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(persistSnapshot(env));
  },
};
