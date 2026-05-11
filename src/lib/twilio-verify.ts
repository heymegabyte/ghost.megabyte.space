/**
 * Twilio webhook signature verification middleware.
 *
 * Twilio signs every webhook request with HMAC-SHA1 of:
 *   webhookFullUrl + sorted(formParams).map(k => k + v).join("")
 *
 * Reference: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Mounted on `/api/v1/twilio/voice|gather|status` to confirm every request
 * originated from Twilio. When `TWILIO_AUTH_TOKEN` is not bound the middleware
 * is a no-op (keeps `wrangler dev` and local Playwright flows ergonomic).
 *
 * @packageDocumentation
 */

import { createMiddleware } from "hono/factory";

import { ApiError } from "./errors";
import type { AppVariables, Env } from "../types";

type Bindings = {
  Bindings: Env;
  Variables: AppVariables;
};

/**
 * HMAC-SHA1 → base64 of the Twilio signing string, computed via Web Crypto.
 */
async function hmacSha1Base64(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  let bin = "";
  const bytes = new Uint8Array(sig);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

/**
 * Constant-time string comparison to avoid timing side-channels.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Build the canonical signing string Twilio uses to compute `X-Twilio-Signature`.
 *
 * For `application/x-www-form-urlencoded` POSTs:
 *   url + sorted(formParams).map(([k, v]) => k + v).join("")
 *
 * For GET requests:
 *   url (no body component)
 */
function buildSigningString(url: string, form: Record<string, string>): string {
  const keys = Object.keys(form).sort();
  let body = "";
  for (const k of keys) body += k + form[k];
  return url + body;
}

/**
 * Hono middleware verifying `X-Twilio-Signature` on inbound Twilio webhooks.
 *
 * Behavior:
 *  - If `TWILIO_AUTH_TOKEN` is unbound → no-op (dev/test fallback).
 *  - Computes HMAC-SHA1(authToken, url + sortedFormBody) and base64-encodes.
 *  - Constant-time compares against the `X-Twilio-Signature` header.
 *  - Re-parses `c.req.parseBody()` once and re-stashes the parsed body on
 *    `c.set("twilioForm", form)` so downstream handlers can avoid double-parse.
 *
 * @throws {@link ApiError} `TWILIO_SIGNATURE_INVALID` (`403`) on mismatch.
 */
export const verifyTwilioSignature = createMiddleware<Bindings>(async (c, next) => {
  const authToken = c.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    await next();
    return;
  }

  const sig = c.req.header("x-twilio-signature");
  if (!sig) {
    throw new ApiError("Missing X-Twilio-Signature header.", 403, "TWILIO_SIGNATURE_MISSING");
  }

  const url = new URL(c.req.url);
  const forwardedProto = c.req.header("x-forwarded-proto");
  if (forwardedProto) url.protocol = forwardedProto + ":";
  const canonicalUrl = url.toString();

  let form: Record<string, string> = {};
  if (c.req.method === "POST") {
    const parsed = await c.req.parseBody();
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") form[k] = v;
    }
    c.set("twilioForm", form);
  }

  const expected = await hmacSha1Base64(authToken, buildSigningString(canonicalUrl, form));
  if (!safeEqual(expected, sig)) {
    throw new ApiError("Twilio signature mismatch.", 403, "TWILIO_SIGNATURE_INVALID");
  }

  await next();
});
