import { ApiError } from "./errors";
import { getCurrentCacheTtl } from "./config";
import { buildMockHistoryPoints, buildMockReading, isMockSensorMode } from "./mock-sensor";
import type { Env, HistoryPoint, HistoryWindow, HomeAssistantState, NormalizedReading, SnapshotRecord } from "../types";

function getBaseUrl(env: Env): URL {
  try {
    return new URL(env.HASS_SERVER);
  } catch {
    throw new ApiError("HASS_SERVER is not configured with a valid URL.", 500, "CONFIGURATION_ERROR");
  }
}

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

function getFriendlyName(env: Env, state: HomeAssistantState): string {
  const friendlyName = state.attributes?.friendly_name;
  if (typeof friendlyName === "string" && friendlyName.length > 0) {
    return friendlyName;
  }

  return env.EMF_SENSOR_NAME ?? state.entity_id;
}

function getUnit(state: HomeAssistantState): string | null {
  const unit = state.attributes?.unit_of_measurement;
  return typeof unit === "string" && unit.length > 0 ? unit : null;
}

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

export async function fetchCurrentReading(env: Env): Promise<NormalizedReading> {
  if (isMockSensorMode(env)) {
    return buildMockReading(env);
  }

  return fetchSensorReading(env, env.EMF_SENSOR_ENTITY_ID);
}

export interface AllSensorReadings {
  emf: NormalizedReading | null;
  ef: NormalizedReading | null;
  rf: NormalizedReading | null;
  sampledAt: string;
}

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
 * Build a last-known-good reading from a stored D1 snapshot row, flagged `stale`
 * so callers can clearly label it as sample data (not a live measurement).
 */
function buildStaleReading(env: Env, row: SnapshotRecord): NormalizedReading {
  return {
    entityId: row.entityId,
    friendlyName: row.entityId === env.EMF_SENSOR_ENTITY_ID ? (env.EMF_SENSOR_NAME ?? row.entityId) : row.entityId,
    state: row.state,
    numericValue: row.numericValue,
    unit: row.unit ?? null,
    lastChanged: row.lastChanged,
    lastUpdated: row.lastUpdated,
    source: "home-assistant",
    sampledAt: row.sampledAt,
    stale: true,
    staleSince: row.sampledAt,
    cache: {
      maxAgeSeconds: getCurrentCacheTtl(env),
      staleWhileRevalidateSeconds: 15,
      strategy: "cloudflare-cache-api",
    },
  };
}

/**
 * The most recent stored snapshot for one entity, or null if none exists / D1 is unbound.
 * Used to degrade gracefully to last-known-good sample data when the live sensor is unreachable.
 */
export async function fetchLastKnownReading(env: Env, entityId: string): Promise<NormalizedReading | null> {
  if (!env.EMF_DB) return null;
  const row = await env.EMF_DB.prepare(
    `SELECT entity_id AS entityId, state, numeric_value AS numericValue, unit,
            last_changed AS lastChanged, last_updated AS lastUpdated, sampled_at AS sampledAt, source
     FROM emf_snapshots WHERE entity_id = ?1 ORDER BY sampled_at DESC LIMIT 1`,
  )
    .bind(entityId)
    .first<SnapshotRecord>();

  return row ? buildStaleReading(env, row) : null;
}

/** Last-known-good readings for every configured sensor, all flagged `stale`. */
export async function fetchLastKnownAllSensors(
  env: Env,
): Promise<AllSensorReadings & { stale: true }> {
  const [emf, ef, rf] = await Promise.all([
    fetchLastKnownReading(env, env.EMF_SENSOR_ENTITY_ID),
    env.EF_SENSOR_ENTITY_ID ? fetchLastKnownReading(env, env.EF_SENSOR_ENTITY_ID) : Promise.resolve(null),
    env.RF_SENSOR_ENTITY_ID ? fetchLastKnownReading(env, env.RF_SENSOR_ENTITY_ID) : Promise.resolve(null),
  ]);
  const sampledAt = emf?.staleSince ?? ef?.staleSince ?? rf?.staleSince ?? new Date().toISOString();
  return { emf, ef, rf, sampledAt, stale: true };
}

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
