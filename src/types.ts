/**
 * Shared type definitions for the Ghost Signal Worker.
 *
 * Every public interface used across `src/lib/*` lives here so route handlers,
 * persistence helpers, and the OpenAPI document have one canonical schema source.
 *
 * @packageDocumentation
 */

/**
 * Cloudflare Worker bindings + environment variables.
 *
 * Required bindings are non-optional; optional bindings degrade gracefully:
 *  - Missing `EMF_DB` → snapshot endpoints return 503; chat/calls don't persist.
 *  - Missing `RATE_LIMIT_KV` → rate limiter becomes a no-op.
 *  - Missing `AI` → chat falls back through to the static "static on the line" reply.
 */
export interface Env {
  /** Static assets binding — serves files from `./public`. */
  ASSETS: Fetcher;
  /** KV namespace for per-IP rate-limit counters. */
  RATE_LIMIT_KV?: KVNamespace;
  /** D1 database holding `emf_snapshots`, `chat_messages`, `call_transmissions`, `newsletter_subscribers`. */
  EMF_DB?: D1Database;
  /** Workers AI binding — Llama fallback for chat. */
  AI?: Ai;
  /** Home Assistant base URL (e.g. `https://hass.example.com`). */
  HASS_SERVER: string;
  /** Home Assistant Long-Lived Access Token (sent as `Authorization: Bearer …`). */
  HASS_TOKEN: string;
  /** `"1"` to bypass Home Assistant and synthesise deterministic readings (Playwright). */
  MOCK_SENSOR_MODE?: string;
  /** `"1"` to enable `GET /__test/reset` and `GET /__test/seed`. */
  TEST_HELPERS_ENABLED?: string;
  /** Primary EMF sensor Home Assistant entity id. */
  EMF_SENSOR_ENTITY_ID: string;
  /** Optional electric-field sensor entity id (powers `/api/v1/sensors.ef`). */
  EF_SENSOR_ENTITY_ID?: string;
  /** Optional radio-frequency sensor entity id (powers `/api/v1/sensors.rf`). */
  RF_SENSOR_ENTITY_ID?: string;
  /** Friendly name override for the EMF sensor (defaults to the HA attribute). */
  EMF_SENSOR_NAME?: string;
  /** ISO timestamp of when the sensor first came online (surfaced via `/meta`). */
  EMF_SENSOR_STARTED_AT?: string;
  /** Public site name used in OpenAPI + UI copy. */
  SITE_NAME?: string;
  /** Canonical site URL (defaults to `https://ghost.megabyte.space`). */
  SITE_URL?: string;
  /** Cache TTL (seconds) for `/current`. */
  CURRENT_CACHE_TTL_SECONDS?: string;
  /** Cache TTL (seconds) for `/history`. */
  HISTORY_CACHE_TTL_SECONDS?: string;
  /** Cache TTL (seconds) for `/entropy`. */
  ENTROPY_CACHE_TTL_SECONDS?: string;
  /** Per-IP, per-minute request budget on `/api/v1/ghost-emf/*`. */
  PUBLIC_API_RATE_LIMIT_PER_MINUTE?: string;
  /** Per-IP, per-minute message budget on `/api/v1/chat` + `/api/v1/chat/stream`. Defaults to 20. */
  CHAT_RATE_LIMIT?: string;
  /** Anthropic API key for chat + hotline replies. */
  ANTHROPIC_API_KEY?: string;
  /** Twilio Account SID. Surfaced for diagnostics; not used by signature verification. */
  TWILIO_ACCOUNT_SID?: string;
  /** Twilio auth token. Used by `verifyTwilioSignature` to validate `X-Twilio-Signature` on every webhook. */
  TWILIO_AUTH_TOKEN?: string;
  /** Twilio hotline phone number in E.164. */
  TWILIO_PHONE_NUMBER?: string;
  /** Listmonk base URL for newsletter subscribe. */
  LISTMONK_URL?: string;
  /** Listmonk API username. */
  LISTMONK_API_USER?: string;
  /** Listmonk API token. */
  LISTMONK_API_TOKEN?: string;
  /** Listmonk list id to subscribe new emails to. */
  LISTMONK_LIST_ID?: string;
  /** HMAC-SHA256 shared secret used to verify Listmonk webhook deliveries. */
  LISTMONK_WEBHOOK_SECRET?: string;
  /** PostHog project API key. Webhook events fan out here when set. */
  POSTHOG_API_KEY?: string;
  /** PostHog ingestion host (defaults to `https://us.i.posthog.com`). */
  POSTHOG_HOST?: string;
}

/** Raw `/api/states/...` payload returned by Home Assistant. */
export interface HomeAssistantState {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

/**
 * The public shape served by `/api/v1/ghost-emf/current` and the
 * per-sensor entries of `/api/v1/sensors`.
 */
export interface NormalizedReading {
  entityId: string;
  friendlyName: string;
  /** Raw HA state string (e.g. `"0.823"`). */
  state: string;
  /** Parsed numeric value from `state`. */
  numericValue: number;
  /** Unit of measurement (e.g. `"mG"`) or `null` when absent. */
  unit: string | null;
  /** ISO timestamp the upstream value last changed (HA `last_changed`). */
  lastChanged: string;
  /** ISO timestamp the upstream value was last updated (HA `last_updated`). */
  lastUpdated: string;
  source: "home-assistant";
  /** ISO timestamp at which the Worker normalized + responded. */
  sampledAt: string;
  /** Cache strategy metadata, surfaced so clients can size their own caches. */
  cache: {
    maxAgeSeconds: number;
    staleWhileRevalidateSeconds: number;
    strategy: "cloudflare-cache-api";
  };
}

/** A single point in a downsampled history series. */
export interface HistoryPoint {
  timestamp: string;
  value: number;
}

/** Canonical `{ start, end }` ISO pair used by every range-bound endpoint. */
export interface HistoryWindow {
  start: string;
  end: string;
}

/** One row of the D1 `emf_snapshots` table, projected to camelCase. */
export interface SnapshotRecord {
  entityId: string;
  state: string;
  numericValue: number;
  unit: string | null;
  lastChanged: string;
  lastUpdated: string;
  sampledAt: string;
  source: string;
}

/** Shape returned by `GET /api/v1/ghost-emf/entropy`. */
export interface EntropySummary {
  /** Shannon entropy in bits. */
  entropyBits: number;
  sampleCount: number;
  windowMinutes: number;
  bins: number;
  min: number;
  max: number;
  mean: number;
  updatedAt: string;
}

/** Hono `c.var` shape — per-request correlation id + optional pre-parsed Twilio form body. */
export interface AppVariables {
  requestId: string;
  twilioForm?: Record<string, string>;
}

/** Technical-event overlay card on the homepage chart (see `timeline-events.ts`). */
export interface TimelineAnnotation {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  kind: "technical" | "narrative";
}

/** Narrative story-arc milestone rendered as a homepage card. */
export interface StoryMilestone {
  id: string;
  eraLabel: string;
  title: string;
  subtitle: string;
  body: string;
}

/** One event from `src/data/timeline.yaml`. */
export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  body: string;
  category: string;
  severity?: number;
}

/** Render hints (label + color) for a `TimelineEvent.category`. */
export interface TimelineCategory {
  label: string;
  color: string;
}

/** Parsed shape of `src/data/timeline.yaml`. */
export interface TimelineData {
  title: string;
  description: string;
  categories: Record<string, TimelineCategory>;
  events: TimelineEvent[];
}

/** One row of `chat_messages` (web-chat persistence). */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  ipAddress?: string;
}

/** One row of `email_events` (Listmonk + SMTP-provider event ledger). */
export interface EmailEventRow {
  id: string;
  eventType: string;
  email?: string;
  campaignId?: number;
  subscriberId?: number;
  source?: string;
  reason?: string;
  rawPayload: string;
  posthogStatus?: string;
  receivedAt: string;
}

/** One row of `email_suppressions` (authoritative do-not-send list). */
export interface EmailSuppressionRow {
  email: string;
  reason: "unsubscribe" | "hard_bounce" | "soft_bounce" | "complaint" | "manual" | "invalid";
  source?: string;
  campaignId?: number;
  notes?: string;
  suppressedAt: string;
}

/** One row of `call_transmissions` (Twilio hotline persistence). */
export interface CallTransmission {
  id: string;
  callSid: string;
  callerNumber: string;
  transcript: string;
  aiResponse: string;
  turnNumber: number;
  createdAt: string;
}
