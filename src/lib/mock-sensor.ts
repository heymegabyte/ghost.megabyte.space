/**
 * Deterministic mock sensor for Playwright + local development.
 *
 * When `MOCK_SENSOR_MODE=1` is set (see `.dev.vars.playwright`), every helper that
 * would normally call Home Assistant routes through this module instead. The values
 * are derived from `Math.sin` / `Math.cos` of the current minute so a test run started
 * at the same wall clock observes the same readings across worker restarts.
 *
 * @packageDocumentation
 */

import { getCurrentCacheTtl } from "./config";
import type { Env, HistoryPoint, HistoryWindow, NormalizedReading, SnapshotRecord } from "../types";

/**
 * Generate a deterministic mG value in roughly `[0.35, 1.3]` from the floor-minute of `date`.
 * Sum of three sinusoids — fast, dependency-free, and stable across cold starts.
 */
function getDeterministicValueAt(date: Date): number {
  const minutes = Math.floor(date.getTime() / 60_000);
  const waveA = Math.sin(minutes / 11) * 0.22;
  const waveB = Math.cos(minutes / 37) * 0.17;
  const waveC = Math.sin(minutes / 5) * 0.08;
  return Number((0.82 + waveA + waveB + waveC).toFixed(3));
}

/** `true` when the Worker should bypass Home Assistant and synthesise readings locally. */
export function isMockSensorMode(env: Env): boolean {
  return env.MOCK_SENSOR_MODE === "1";
}

/**
 * Build a `/api/v1/ghost-emf/current` response payload from the deterministic generator.
 * @param env  Worker env (for sensor IDs + cache TTL).
 * @param date Timestamp the reading is reported at (defaults to `new Date()`).
 */
export function buildMockReading(env: Env, date = new Date()): NormalizedReading {
  const timestamp = date.toISOString();
  const numericValue = getDeterministicValueAt(date);

  return {
    entityId: env.EMF_SENSOR_ENTITY_ID,
    friendlyName: env.EMF_SENSOR_NAME ?? "Ghost EMF",
    state: numericValue.toFixed(3),
    numericValue,
    unit: "mG",
    lastChanged: timestamp,
    lastUpdated: timestamp,
    source: "home-assistant",
    sampledAt: timestamp,
    cache: {
      maxAgeSeconds: getCurrentCacheTtl(env),
      staleWhileRevalidateSeconds: 15,
      strategy: "cloudflare-cache-api",
    },
  };
}

/** Generate one synthetic data point per minute inside the requested window. */
export function buildMockHistoryPoints(window: HistoryWindow): HistoryPoint[] {
  const start = new Date(window.start);
  const end = new Date(window.end);
  const points: HistoryPoint[] = [];

  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += 60_000) {
    const date = new Date(cursor);
    points.push({
      timestamp: date.toISOString(),
      value: getDeterministicValueAt(date),
    });
  }

  return points;
}

/** Project {@link buildMockHistoryPoints} into the D1 snapshot row shape used by `__test/seed`. */
export function buildMockSnapshotRecords(env: Env, window: HistoryWindow): SnapshotRecord[] {
  return buildMockHistoryPoints(window).map((point) => ({
    entityId: env.EMF_SENSOR_ENTITY_ID,
    state: point.value.toFixed(3),
    numericValue: point.value,
    unit: "mG",
    lastChanged: point.timestamp,
    lastUpdated: point.timestamp,
    sampledAt: point.timestamp,
    source: "mock-sensor",
  }));
}
