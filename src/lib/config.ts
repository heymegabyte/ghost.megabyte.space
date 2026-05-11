/**
 * Environment-variable accessors with safe defaults.
 *
 * All Worker-tunable settings (cache TTLs, rate limit, site URL, sensor genesis
 * timestamp) funnel through this module so route handlers never read `c.env.*`
 * directly. Each helper parses the underlying string binding and falls back to a
 * production-safe default when the variable is unset or malformed.
 *
 * @packageDocumentation
 */

import type { Env } from "../types";

/**
 * Parse a string env var as an integer, returning `fallback` when missing or non-finite.
 *
 * @param value     Raw env var string (often `c.env.SOME_TTL`).
 * @param fallback  Default returned when `value` is empty or fails `Number.parseInt`.
 */
export function getIntSetting(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Canonical site URL used for OG tags, OpenAPI servers list, and absolute links.
 * Defaults to `https://ghost.megabyte.space` when `SITE_URL` is unset.
 */
export function getSiteUrl(env: Env): string {
  return env.SITE_URL ?? "https://ghost.megabyte.space";
}

/**
 * Cache TTL (seconds) for `GET /api/v1/ghost-emf/current`. Defaults to `3`.
 * Set `CURRENT_CACHE_TTL_SECONDS` in `wrangler.jsonc` to tune.
 */
export function getCurrentCacheTtl(env: Env): number {
  return getIntSetting(env.CURRENT_CACHE_TTL_SECONDS, 3);
}

/**
 * Cache TTL (seconds) for `GET /api/v1/ghost-emf/history`. Defaults to `15`.
 * Set `HISTORY_CACHE_TTL_SECONDS` in `wrangler.jsonc` to tune.
 */
export function getHistoryCacheTtl(env: Env): number {
  return getIntSetting(env.HISTORY_CACHE_TTL_SECONDS, 15);
}

/**
 * Cache TTL (seconds) for `GET /api/v1/ghost-emf/entropy`. Defaults to `15`.
 * Set `ENTROPY_CACHE_TTL_SECONDS` in `wrangler.jsonc` to tune.
 */
export function getEntropyCacheTtl(env: Env): number {
  return getIntSetting(env.ENTROPY_CACHE_TTL_SECONDS, 15);
}

/**
 * Per-IP, per-minute request budget enforced by {@link publicReadRateLimit} on
 * `/api/v1/ghost-emf/*`. Defaults to `60`. Set `PUBLIC_API_RATE_LIMIT_PER_MINUTE`
 * in `wrangler.jsonc` to tune.
 */
export function getPublicRateLimit(env: Env): number {
  return getIntSetting(env.PUBLIC_API_RATE_LIMIT_PER_MINUTE, 60);
}

/**
 * ISO timestamp of when the public EMF sensor was first plugged in.
 * Surfaced via `/api/v1/ghost-emf/meta` so clients can compute uptime.
 * Defaults to the project's genesis moment when `EMF_SENSOR_STARTED_AT` is unset.
 */
export function getSensorStartedAt(env: Env): string {
  return env.EMF_SENSOR_STARTED_AT ?? "2026-04-03T02:47:58.394637+00:00";
}
