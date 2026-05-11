/**
 * Home Assistant REST client + D1 snapshot persistence.
 *
 * This module is the sole bridge between the Cloudflare Worker and the
 * upstream Home Assistant instance hosting the GQ EMF-390 sensor. Every
 * request goes through {@link homeAssistantFetch}, which adds the bearer
 * token, normalizes the URL, and wraps non-2xx responses in {@link ApiError}.
 *
 * History fetches prefer D1 snapshots (cron-populated by {@link persistSnapshot})
 * for stable, replay-friendly data, and fall back to Home Assistant's
 * `/api/history/period/*` endpoint when no snapshots are stored yet.
 *
 * @packageDocumentation
 */

import { ApiError } from "./errors";
import { getCurrentCacheTtl } from "./config";
import { buildMockHistoryPoints, buildMockReading, isMockSensorMode } from "./mock-sensor";
import type { Env, HistoryPoint, HistoryWindow, HomeAssistantState, NormalizedReading } from "../types";

/**
 * Resolve `HASS_SERVER` into a `URL`. Throws `CONFIGURATION_ERROR` (`500`)
 * when the env var is missing or malformed — surfaces misconfiguration loudly
 * rather than letting downstream `fetch()` calls fail with cryptic errors.
 */
function getBaseUrl(env: Env): URL {
  try {
    return new URL(env.HASS_SERVER);
  } catch {
    throw new ApiError("HASS_SERVER is not configured with a valid URL.", 500, "CONFIGURATION_ERROR");
  }
}

/**
 * Authenticated HTTP GET against Home Assistant.
 *
 * @typeParam T  Expected response shape.
 * @param env           Worker bindings (for `HASS_SERVER` + `HASS_TOKEN`).
 * @param path          REST path (e.g. `/api/states/sensor.emf`).
 * @param searchParams  Optional query string.
 * @throws {@link ApiError} `UPSTREAM_ERROR` (`502`) on any non-2xx response.
 */
async function homeAssistantFetch<T>(env: Env, path: string, searchParams?: URLSearchParams): Promise<T> {
  const baseUrl = getBaseUrl(env);
  const url = new URL(path, baseUrl);

  if (searchParams) {
    url.search = searchParams.toString();
  }

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${env.HASS_TOKEN}`,
      "content-type": "application/json",
    },
  });

  if (!response.ok) {
    throw new ApiError("Home Assistant rejected the request.", 502, "UPSTREAM_ERROR", {
      status: response.status,
      statusText: response.statusText,
      path,
    });
  }

  return (await response.json()) as T;
}

/** Friendly name resolution: state attribute → env override → entity id. */
function getFriendlyName(env: Env, state: HomeAssistantState): string {
  const friendlyName = state.attributes?.friendly_name;
  if (typeof friendlyName === "string" && friendlyName.length > 0) {
    return friendlyName;
  }

  return env.EMF_SENSOR_NAME ?? state.entity_id;
}

/** Extract the Home Assistant `unit_of_measurement` attribute, or `null` when absent. */
function getUnit(state: HomeAssistantState): string | null {
  const unit = state.attributes?.unit_of_measurement;
  return typeof unit === "string" && unit.length > 0 ? unit : null;
}

/**
 * Coerce a state string into a finite number, throwing `SENSOR_UNAVAILABLE` (`503`)
 * when the entity is reporting `unavailable`, `unknown`, or any non-numeric value.
 */
function coerceNumericValue(state: HomeAssistantState): number {
  const numericValue = Number.parseFloat(state.state);

  if (!Number.isFinite(numericValue)) {
    throw new ApiError("The configured Home Assistant entity is not reporting a numeric value right now.", 503, "SENSOR_UNAVAILABLE", {
      entityId: state.entity_id,
      state: state.state,
    });
  }

  return numericValue;
}

/**
 * Fetch a single sensor's current state from Home Assistant and normalize it
 * into the public {@link NormalizedReading} shape.
 *
 * @param env       Worker bindings.
 * @param entityId  Home Assistant entity id (e.g. `sensor.gq_emf_390_emf`).
 */
export async function fetchSensorReading(env: Env, entityId: string): Promise<NormalizedReading> {
  const state = await homeAssistantFetch<HomeAssistantState>(
    env,
    `/api/states/${encodeURIComponent(entityId)}`,
  );

  return {
    entityId: state.entity_id,
    friendlyName: getFriendlyName(env, state),
    state: state.state,
    numericValue: coerceNumericValue(state),
    unit: getUnit(state),
    lastChanged: state.last_changed,
    lastUpdated: state.last_updated,
    source: "home-assistant",
    sampledAt: new Date().toISOString(),
    cache: {
      maxAgeSeconds: getCurrentCacheTtl(env),
      staleWhileRevalidateSeconds: 15,
      strategy: "cloudflare-cache-api",
    },
  };
}

/**
 * Return the current EMF reading, honoring {@link isMockSensorMode}.
 * Powers `GET /api/v1/ghost-emf/current`.
 */
export async function fetchCurrentReading(env: Env): Promise<NormalizedReading> {
  if (isMockSensorMode(env)) {
    return buildMockReading(env);
  }

  return fetchSensorReading(env, env.EMF_SENSOR_ENTITY_ID);
}

/** Combined snapshot of EMF + (optional) EF + RF sensors at a single instant. */
export interface AllSensorReadings {
  emf: NormalizedReading | null;
  ef: NormalizedReading | null;
  rf: NormalizedReading | null;
  sampledAt: string;
}

/**
 * Fan-out parallel fetch of EMF, EF, and RF readings. Individual sensor
 * failures are swallowed (logged as `null` in the response) so a single
 * upstream timeout doesn't take down the whole `/sensors` endpoint.
 *
 * Powers `GET /api/v1/sensors`.
 */
export async function fetchAllSensors(env: Env): Promise<AllSensorReadings> {
  const sampledAt = new Date().toISOString();
  const sensors: AllSensorReadings = { emf: null, ef: null, rf: null, sampledAt };

  const fetches: Promise<void>[] = [];

  fetches.push(
    fetchSensorReading(env, env.EMF_SENSOR_ENTITY_ID)
      .then((r) => { sensors.emf = r; })
      .catch(() => {}),
  );

  if (env.EF_SENSOR_ENTITY_ID) {
    fetches.push(
      fetchSensorReading(env, env.EF_SENSOR_ENTITY_ID)
        .then((r) => { sensors.ef = r; })
        .catch(() => {}),
    );
  }

  if (env.RF_SENSOR_ENTITY_ID) {
    fetches.push(
      fetchSensorReading(env, env.RF_SENSOR_ENTITY_ID)
        .then((r) => { sensors.rf = r; })
        .catch(() => {}),
    );
  }

  await Promise.all(fetches);
  return sensors;
}

/**
 * Return the EMF history series for the requested window.
 *
 * Source-of-truth priority:
 *  1. D1 `emf_snapshots` rows (cron-populated). Stable, reproducible, fast.
 *  2. Mock generator when {@link isMockSensorMode} is on (Playwright / local).
 *  3. Home Assistant `/api/history/period/...` upstream fetch (cold-start).
 *
 * D1 rows are sorted DESC by the SQL engine for index efficiency then reversed
 * here so the returned array is ascending — matches the public contract used
 * by the charting code on `app.js`.
 */
export async function fetchHistoryPoints(env: Env, window: HistoryWindow): Promise<HistoryPoint[]> {
  if (env.EMF_DB) {
    const result = await env.EMF_DB.prepare(
      `
        SELECT sampled_at AS timestamp, numeric_value AS value
        FROM emf_snapshots
        WHERE entity_id = ?1
          AND sampled_at >= ?2
          AND sampled_at <= ?3
        ORDER BY sampled_at DESC
      `,
    )
      .bind(env.EMF_SENSOR_ENTITY_ID, window.start, window.end)
      .all<{ timestamp: string; value: number }>();

    const rows = (result.results ?? []).map((row) => ({
      timestamp: row.timestamp,
      value: row.value,
    }));

    return rows.reverse();
  }

  if (isMockSensorMode(env)) {
    return buildMockHistoryPoints(window);
  }

  const params = new URLSearchParams({
    filter_entity_id: env.EMF_SENSOR_ENTITY_ID,
    end_time: window.end,
    minimal_response: "",
    no_attributes: "",
  });
  const rawHistory = await homeAssistantFetch<Array<Array<Partial<HomeAssistantState>>>>(
    env,
    `/api/history/period/${encodeURIComponent(window.start)}`,
    params,
  );
  const states = Array.isArray(rawHistory[0]) ? rawHistory[0] : [];

  const points = states
    .map((state) => {
      const rawState = typeof state.state === "string" ? Number.parseFloat(state.state) : Number.NaN;
      const timestamp =
        typeof state.last_updated === "string"
          ? state.last_updated
          : typeof state.last_changed === "string"
            ? state.last_changed
            : null;

      if (!Number.isFinite(rawState) || !timestamp) {
        return null;
      }

      return {
        timestamp,
        value: rawState,
      };
    })
    .filter((point): point is HistoryPoint => point !== null);

  return points;
}

/**
 * Insert a single reading into `emf_snapshots`, ignoring duplicate-key conflicts
 * (the synthetic id is `<entityId>:<sampledAt>` so re-running the cron is safe).
 */
async function persistSingleSnapshot(env: Env, reading: NormalizedReading): Promise<void> {
  if (!env.EMF_DB) return;
  const id = `${reading.entityId}:${reading.sampledAt}`;
  await env.EMF_DB.prepare(
    `INSERT OR IGNORE INTO emf_snapshots (
      id, entity_id, state, numeric_value, unit,
      last_changed, last_updated, sampled_at, source
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(id, reading.entityId, reading.state, reading.numericValue,
      reading.unit, reading.lastChanged, reading.lastUpdated,
      reading.sampledAt, reading.source)
    .run();
}

/**
 * Capture a snapshot of every configured sensor (EMF + optional EF + RF) and
 * write it to D1. Called every minute by the scheduled cron handler in
 * `src/index.ts`. In {@link isMockSensorMode}, persists a deterministic mock
 * reading so Playwright runs accumulate predictable history.
 */
export async function persistSnapshot(env: Env): Promise<void> {
  if (!env.EMF_DB) return;

  if (isMockSensorMode(env)) {
    const reading = buildMockReading(env);
    await persistSingleSnapshot(env, reading);
    return;
  }

  const all = await fetchAllSensors(env);
  const snapshots: Promise<void>[] = [];
  if (all.emf) snapshots.push(persistSingleSnapshot(env, all.emf));
  if (all.ef) snapshots.push(persistSingleSnapshot(env, all.ef));
  if (all.rf) snapshots.push(persistSingleSnapshot(env, all.rf));
  await Promise.all(snapshots);
}
