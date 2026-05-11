/**
 * Playwright-only test-mode helpers backing `GET /__test/reset` and
 * `GET /__test/seed`.
 *
 * These routes are 100% off by default. They only fire when the Worker is
 * deployed with `TEST_HELPERS_ENABLED=1` (see `wrangler.jsonc` env override
 * for the playwright environment). Production deploys never set the flag.
 *
 * `resetSnapshots` is destructive — it truncates `emf_snapshots`. `seedSnapshots`
 * additionally requires {@link isMockSensorMode} so the generated rows are
 * deterministic and never accidentally backfill from real Home Assistant data.
 *
 * @packageDocumentation
 */

import { ApiError } from "./errors";
import { buildMockSnapshotRecords, isMockSensorMode } from "./mock-sensor";
import type { Env } from "../types";

/** `true` when `TEST_HELPERS_ENABLED=1` is set on the deployed Worker. */
export function areTestHelpersEnabled(env: Env): boolean {
  return env.TEST_HELPERS_ENABLED === "1";
}

/**
 * Guard rail — throws `NOT_FOUND` (`404`) when the test routes are not enabled.
 * The `404` is intentional: production users should not be able to discover
 * the route exists.
 */
function requireTestHelpers(env: Env): void {
  if (!areTestHelpersEnabled(env)) {
    throw new ApiError("Test helpers are disabled.", 404, "NOT_FOUND");
  }
}

function requireSnapshotDb(env: Env): D1Database {
  if (!env.EMF_DB) {
    throw new ApiError("EMF_DB is required for test helpers.", 503, "SNAPSHOT_STORAGE_UNAVAILABLE");
  }

  return env.EMF_DB;
}

/**
 * Truncate `emf_snapshots`. Test-mode only.
 *
 * @returns Number of rows deleted (from `D1Result.meta.changes`).
 * @throws  {@link ApiError} `NOT_FOUND` when test helpers are disabled.
 */
export async function resetSnapshots(env: Env): Promise<number> {
  requireTestHelpers(env);
  const db = requireSnapshotDb(env);
  const result = await db.prepare("DELETE FROM emf_snapshots").run();
  return result.meta.changes ?? 0;
}

/**
 * Seed `emf_snapshots` with a deterministic mock-sensor series spanning
 * `[start, end]` (one row per minute). Test-mode + mock-sensor-mode only.
 *
 * Rows are inserted via `INSERT OR REPLACE` keyed on `<entityId>:<sampledAt>`
 * so calling this twice with the same window is idempotent.
 *
 * @returns Number of rows generated (matches the minute count of the window).
 * @throws  {@link ApiError} `NOT_FOUND` when test helpers are disabled.
 * @throws  {@link ApiError} `TEST_HELPER_INVALID_MODE` (`400`) when not in
 *          mock-sensor mode.
 */
export async function seedSnapshots(
  env: Env,
  input: {
    start: string;
    end: string;
  },
): Promise<number> {
  requireTestHelpers(env);
  const db = requireSnapshotDb(env);

  if (!isMockSensorMode(env)) {
    throw new ApiError("Snapshot seeding only works in mock sensor mode.", 400, "TEST_HELPER_INVALID_MODE");
  }

  const records = buildMockSnapshotRecords(env, input);
  const statement = db.prepare(
    `
      INSERT OR REPLACE INTO emf_snapshots (
        id,
        entity_id,
        state,
        numeric_value,
        unit,
        last_changed,
        last_updated,
        sampled_at,
        source
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    `,
  );

  const operations = records.map((record) =>
    statement.bind(
      `${record.entityId}:${record.sampledAt}`,
      record.entityId,
      record.state,
      record.numericValue,
      record.unit,
      record.lastChanged,
      record.lastUpdated,
      record.sampledAt,
      record.source,
    ),
  );

  if (operations.length > 0) {
    await db.batch(operations);
  }

  return records.length;
}
