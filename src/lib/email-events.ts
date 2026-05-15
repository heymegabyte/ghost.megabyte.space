/**
 * Listmonk webhook ingestion + PostHog forwarder + suppression-list helpers.
 *
 * The Worker exposes `POST /api/v1/listmonk/webhook` which:
 *  1. Verifies an HMAC-SHA256 signature in `X-Listmonk-Signature` against the
 *     raw request body using {@link Env.LISTMONK_WEBHOOK_SECRET}.
 *  2. Parses the canonical Listmonk event envelope `{ event, data }`.
 *  3. Inserts one row into `email_events` (full raw payload retained).
 *  4. Upserts `email_suppressions` for bounces / complaints / unsubscribes.
 *  5. Forwards a corresponding event to PostHog `/capture/` when credentials
 *     are present, recording the upstream HTTP status on the `email_events` row.
 *
 * Every transactional-send code path MUST call {@link isSuppressed} before
 * dispatching mail. The function fails-closed: when `EMF_DB` is unbound it
 * returns `true` rather than risk sending to an address we cannot vet.
 *
 * @packageDocumentation
 */
import type { Env } from "../types";

/** Canonical Listmonk event names + the catch-all `unknown` fallback. */
export type EmailEventType =
  | "subscriber.created"
  | "subscriber.updated"
  | "subscriber.deleted"
  | "campaign.created"
  | "campaign.update"
  | "campaign.sent"
  | "tx.sent"
  | "tx.delivered"
  | "tx.opened"
  | "tx.clicked"
  | "tx.bounced"
  | "tx.complained"
  | "tx.failed"
  | "bounce"
  | "unknown";

const VALID_EVENT_TYPES: ReadonlySet<EmailEventType> = new Set<EmailEventType>([
  "subscriber.created",
  "subscriber.updated",
  "subscriber.deleted",
  "campaign.created",
  "campaign.update",
  "campaign.sent",
  "tx.sent",
  "tx.delivered",
  "tx.opened",
  "tx.clicked",
  "tx.bounced",
  "tx.complained",
  "tx.failed",
  "bounce",
  "unknown",
]);

/** Reasons that result in a permanent suppression entry. */
export type SuppressionReason =
  | "unsubscribe"
  | "hard_bounce"
  | "soft_bounce"
  | "complaint"
  | "manual"
  | "invalid";

/** Map raw event → suppression reason. `null` means: do not suppress. */
function suppressionReasonForEvent(
  event: EmailEventType,
  bounceType?: string,
): SuppressionReason | null {
  if (event === "subscriber.deleted") return "unsubscribe";
  if (event === "tx.complained") return "complaint";
  if (event === "tx.bounced" || event === "bounce") {
    return bounceType === "soft" ? "soft_bounce" : "hard_bounce";
  }
  return null;
}

/** Coerce any user-supplied event string to a known {@link EmailEventType}. */
export function normalizeEventType(raw: unknown): EmailEventType {
  if (typeof raw !== "string") return "unknown";
  return VALID_EVENT_TYPES.has(raw as EmailEventType)
    ? (raw as EmailEventType)
    : "unknown";
}

/** Decode a hex-encoded string to bytes. Returns an empty array on malformed input. */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "").trim();
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
    return new Uint8Array(0);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Constant-time comparison over Uint8Arrays. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    diff |= av ^ bv;
  }
  return diff === 0;
}

/**
 * Verify the `X-Listmonk-Signature` header against `HMAC_SHA256(body, secret)`.
 *
 * Returns `true` only when both the header decodes to a 32-byte digest and the
 * timing-safe comparison succeeds. Missing secret → returns `false` so the
 * caller can reject the request rather than silently accept unsigned events.
 */
export async function verifyListmonkSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret || !signatureHeader) return false;

  const expected = hexToBytes(signatureHeader);
  if (expected.length !== 32) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)),
  );
  return timingSafeEqual(sig, expected);
}

/** Best-effort extraction of recipient email from a Listmonk envelope. */
function extractEmail(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as Record<string, unknown>;
  if (typeof obj.email === "string") return obj.email.toLowerCase();
  const subscriber = obj.subscriber as Record<string, unknown> | undefined;
  if (subscriber && typeof subscriber.email === "string") {
    return subscriber.email.toLowerCase();
  }
  return undefined;
}

function extractNumber(data: unknown, key: string): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const value = (data as Record<string, unknown>)[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function extractString(data: unknown, key: string): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

/** Result row passed back to the route handler so it can return useful JSON. */
export interface IngestResult {
  eventId: string;
  eventType: EmailEventType;
  email?: string;
  suppressed: boolean;
  posthogStatus: string;
}

/**
 * Persist a single webhook event to D1, suppress recipient when warranted, and
 * fan-out to PostHog. Returns metadata about what was written so the route
 * handler can echo it back to the caller (useful for Listmonk's test harness).
 *
 * Idempotency: rows are keyed by a synthetic id of
 * `<event>:<receivedAt>:<emailOrAnon>`. Re-deliveries within the same epoch
 * second produce a unique id via `crypto.randomUUID` suffix.
 */
export async function ingestListmonkEvent(
  env: Env,
  body: unknown,
): Promise<IngestResult> {
  const envelope = (body ?? {}) as Record<string, unknown>;
  const eventType = normalizeEventType(envelope.event);
  const data = envelope.data ?? envelope;
  const email = extractEmail(data);
  const campaignId = extractNumber(data, "campaign_id") ?? extractNumber(envelope, "campaign_id");
  const subscriberId = extractNumber(data, "id") ?? extractNumber(data, "subscriber_id");
  const source = extractString(data, "source") ?? extractString(envelope, "source");
  const bounceType = extractString(data, "type");
  const reasonText = extractString(data, "reason") ?? bounceType ?? null;
  const eventId = `${eventType}:${Date.now()}:${crypto.randomUUID()}`;
  const rawPayload = JSON.stringify(envelope).slice(0, 65535);

  const posthogStatus = await forwardToPostHog(env, {
    event: `email.${eventType}`,
    distinctId: email ?? `anonymous-${eventId}`,
    properties: {
      email,
      campaign_id: campaignId,
      subscriber_id: subscriberId,
      source,
      reason: reasonText,
      bounce_type: bounceType,
      listmonk_event: eventType,
    },
  });

  if (env.EMF_DB) {
    await env.EMF_DB.prepare(
      `INSERT INTO email_events
        (id, event_type, email, campaign_id, subscriber_id, source, reason, raw_payload, posthog_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        eventId,
        eventType,
        email ?? null,
        campaignId ?? null,
        subscriberId ?? null,
        source ?? null,
        reasonText,
        rawPayload,
        posthogStatus,
      )
      .run();
  }

  const suppression = suppressionReasonForEvent(eventType, bounceType);
  let suppressed = false;
  if (suppression && email && env.EMF_DB) {
    await env.EMF_DB.prepare(
      `INSERT OR REPLACE INTO email_suppressions
        (email, reason, source, campaign_id, notes, suppressed_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(email, suppression, source ?? "listmonk-webhook", campaignId ?? null, reasonText)
      .run();
    suppressed = true;
  }

  return { eventId, eventType, email, suppressed, posthogStatus };
}

/**
 * Forward an event to PostHog `/capture/`. Returns a short status string for
 * logging (`"skipped"` when credentials are absent, `"ok:<status>"` otherwise,
 * or `"error:<message>"` on network failure).
 */
async function forwardToPostHog(
  env: Env,
  payload: {
    event: string;
    distinctId: string;
    properties: Record<string, unknown>;
  },
): Promise<string> {
  const apiKey = env.POSTHOG_API_KEY;
  const host = (env.POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
  if (!apiKey) return "skipped";

  try {
    const res = await fetch(`${host}/capture/`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "ghost.megabyte.space/1.0",
      },
      body: JSON.stringify({
        api_key: apiKey,
        event: payload.event,
        distinct_id: payload.distinctId,
        properties: {
          ...payload.properties,
          $lib: "ghost-signal-worker",
          $lib_version: "1.0",
        },
        timestamp: new Date().toISOString(),
      }),
    });
    return `ok:${res.status}`;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `error:${message.slice(0, 60)}`;
  }
}

/**
 * Check the suppression list before sending mail.
 *
 * Returns `true` when the recipient should NOT be sent to:
 *  - their email appears in `email_suppressions` for any reason, OR
 *  - the database binding is missing entirely (fail-closed).
 *
 * The check is exact-match, case-insensitive. Callers must lowercase + trim
 * the address before invoking.
 */
export async function isSuppressed(env: Env, email: string): Promise<boolean> {
  if (!env.EMF_DB) return true;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return true;
  const result = await env.EMF_DB.prepare(
    "SELECT 1 FROM email_suppressions WHERE email = ? LIMIT 1",
  )
    .bind(normalized)
    .first<{ "1": number }>();
  return result !== null;
}
