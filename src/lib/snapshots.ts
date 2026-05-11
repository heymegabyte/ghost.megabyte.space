/**
 * Snapshot export + reproducible-random helpers backing the
 * `/snapshot`, `/export`, `/google-sheets`, and `/random` API surfaces.
 *
 * D1 `emf_snapshots` rows are projected into:
 *  - CSV ({@link buildSnapshotCsv}) — RFC 4180 with `\r\n` line endings.
 *  - HTML table excelable ({@link buildSnapshotExcel}) — Excel renders this
 *    natively when served with `application/vnd.ms-excel` and the right filename.
 *  - SHA-256 derived "ghost RNG" digits, uint32, and hex ({@link deriveSnapshotRandom}).
 *
 * The Google Sheets formula helper produces an `=IMPORTDATA(...)` cell that
 * pulls the CSV through Cloudflare's cache, making the dataset trivial to embed
 * in a spreadsheet without copy-paste.
 *
 * @packageDocumentation
 */

import { getSiteUrl } from "./config";
import { ApiError } from "./errors";
import type { Env, HistoryWindow, SnapshotRecord } from "../types";

/**
 * Guard helper: returns the D1 binding or throws `SNAPSHOT_STORAGE_UNAVAILABLE`
 * (`503`) when `EMF_DB` is not configured.
 */
function requireSnapshotDb(env: Env): D1Database {
  if (!env.EMF_DB) {
    throw new ApiError(
      "Serverless snapshot storage is not configured. Bind EMF_DB to enable exports and reproducible random numbers.",
      503,
      "SNAPSHOT_STORAGE_UNAVAILABLE",
    );
  }

  return env.EMF_DB;
}

/** RFC 4180 cell escaping — quote when the cell contains `"`, `,`, or a newline. */
function escapeCsvCell(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n") || text.includes("\r")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

/** XML escaping for the HTML-table excel projection. */
function escapeXml(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * Read all snapshot rows for the configured EMF entity inside `window`,
 * ascending by `sampled_at`. Backs the JSON `/snapshot`, the CSV/XLS `/export`,
 * and the seed for {@link deriveSnapshotRandom}.
 */
export async function fetchSnapshotRecords(env: Env, window: HistoryWindow): Promise<SnapshotRecord[]> {
  const db = requireSnapshotDb(env);
  const result = await db
    .prepare(
      `
        SELECT
          entity_id AS entityId,
          state,
          numeric_value AS numericValue,
          unit,
          last_changed AS lastChanged,
          last_updated AS lastUpdated,
          sampled_at AS sampledAt,
          source
        FROM emf_snapshots
        WHERE entity_id = ?1
          AND sampled_at >= ?2
          AND sampled_at <= ?3
        ORDER BY sampled_at ASC
      `,
    )
    .bind(env.EMF_SENSOR_ENTITY_ID, window.start, window.end)
    .all<SnapshotRecord>();

  return (result.results ?? []).map((row) => ({
    entityId: row.entityId,
    state: row.state,
    numericValue: row.numericValue,
    unit: row.unit ?? null,
    lastChanged: row.lastChanged,
    lastUpdated: row.lastUpdated,
    sampledAt: row.sampledAt,
    source: row.source,
  }));
}

/**
 * Render snapshot rows as RFC 4180 CSV with the canonical header order.
 * Line endings are `\r\n` for maximum compatibility with Excel + Google Sheets.
 */
export function buildSnapshotCsv(records: SnapshotRecord[]): string {
  const header = [
    "entity_id",
    "state",
    "numeric_value",
    "unit",
    "last_changed",
    "last_updated",
    "sampled_at",
    "source",
  ];

  const rows = records.map((record) =>
    [
      record.entityId,
      record.state,
      record.numericValue,
      record.unit,
      record.lastChanged,
      record.lastUpdated,
      record.sampledAt,
      record.source,
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return [header.join(","), ...rows].join("\r\n");
}

/**
 * Render snapshot rows as an HTML `<table>` document that Excel opens as a
 * spreadsheet when the `Content-Type` is `application/vnd.ms-excel` and the
 * filename ends in `.xls` (see {@link buildSnapshotFilename}).
 *
 * @param title Title rendered into `<title>` — typically the human-readable
 *              window range.
 */
export function buildSnapshotExcel(records: SnapshotRecord[], title: string): string {
  const rows = records
    .map(
      (record) => `
      <tr>
        <td>${escapeXml(record.entityId)}</td>
        <td>${escapeXml(record.state)}</td>
        <td>${escapeXml(record.numericValue)}</td>
        <td>${escapeXml(record.unit)}</td>
        <td>${escapeXml(record.lastChanged)}</td>
        <td>${escapeXml(record.lastUpdated)}</td>
        <td>${escapeXml(record.sampledAt)}</td>
        <td>${escapeXml(record.source)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeXml(title)}</title>
  </head>
  <body>
    <table border="1">
      <thead>
        <tr>
          <th>entity_id</th>
          <th>state</th>
          <th>numeric_value</th>
          <th>unit</th>
          <th>last_changed</th>
          <th>last_updated</th>
          <th>sampled_at</th>
          <th>source</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </body>
</html>`;
}

/**
 * Build the suggested download filename for an export. ISO timestamps' `:`
 * and `.` characters are replaced with `-` so the filename survives all common
 * filesystems.
 */
export function buildSnapshotFilename(window: HistoryWindow, format: "csv" | "excel"): string {
  const start = window.start.replaceAll(/[:.]/g, "-");
  const end = window.end.replaceAll(/[:.]/g, "-");
  return format === "csv" ? `ghost-emf-${start}-to-${end}.csv` : `ghost-emf-${start}-to-${end}.xls`;
}

/**
 * Construct the absolute `/api/v1/ghost-emf/export` URL for the given window.
 * Used by the Google-Sheets formula helper and surfaced to clients that want a
 * shareable, cache-friendly download link.
 */
export function buildSnapshotExportUrl(env: Env, window: HistoryWindow, format: "csv" | "excel" = "csv"): string {
  const url = new URL("/api/v1/ghost-emf/export", getSiteUrl(env));
  url.searchParams.set("start", window.start);
  url.searchParams.set("end", window.end);
  url.searchParams.set("format", format);
  return url.toString();
}

/**
 * Produce the `=IMPORTDATA("...")` cell formula that pulls the CSV export
 * into a Google Sheet directly.
 */
export function buildGoogleSheetsFormula(env: Env, window: HistoryWindow): string {
  return `=IMPORTDATA("${buildSnapshotExportUrl(env, window, "csv")}")`;
}

/**
 * Derive a deterministic random number from a window of EMF snapshots.
 *
 * Algorithm:
 *  1. Serialize each snapshot as `${sampledAt}|${numericValue}|${state}|${lastUpdated}`
 *     and join with `\n`. This canonicalises the input regardless of how the
 *     rows are paginated.
 *  2. SHA-256 the serialized string. The hex digest is returned as `seedHash`
 *     so callers can reproduce the result.
 *  3. Interpret the first 8 bytes as a 64-bit unsigned big-endian integer,
 *     take it modulo `10^digits`, and zero-pad to produce `randomNumber`.
 *  4. Pack the first 4 bytes as a big-endian uint32 for `randomUint32`.
 *  5. Use the first 8 hex chars (16 nibbles) as `randomHex`.
 *
 * Cryptographic note: this is **not** a cryptographic RNG — it is a verifiable
 * derivation from publicly auditable sensor data. The whole point is
 * reproducibility: anyone with the same snapshot rows produces the same number.
 *
 * @throws {@link ApiError} `SNAPSHOT_EMPTY` (`404`) when no rows exist in `window`.
 */
export async function deriveSnapshotRandom(
  records: SnapshotRecord[],
  window: HistoryWindow,
  digits: number,
): Promise<{
  digits: number;
  randomNumber: string;
  randomUint32: number;
  randomHex: string;
  seedHash: string;
  sampleCount: number;
  start: string;
  end: string;
  derivedAt: string;
}> {
  if (records.length === 0) {
    throw new ApiError("No snapshot rows exist for the selected range.", 404, "SNAPSHOT_EMPTY", window);
  }

  const encoder = new TextEncoder();
  const serialized = records
    .map((record) => `${record.sampledAt}|${record.numericValue}|${record.state}|${record.lastUpdated}`)
    .join("\n");
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(serialized)));
  const seedHash = Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  let seedBigInt = 0n;
  for (const byte of digest.subarray(0, 8)) {
    seedBigInt = (seedBigInt << 8n) + BigInt(byte);
  }

  const normalizedDigits = Math.min(18, Math.max(1, digits));
  const modulus = 10n ** BigInt(normalizedDigits);
  const randomNumber = (seedBigInt % modulus).toString().padStart(normalizedDigits, "0");
  const randomUint32 =
    ((digest[0] ?? 0) << 24) | ((digest[1] ?? 0) << 16) | ((digest[2] ?? 0) << 8) | (digest[3] ?? 0);

  return {
    digits: normalizedDigits,
    randomNumber,
    randomUint32: randomUint32 >>> 0,
    randomHex: `0x${seedHash.slice(0, 16)}`,
    seedHash,
    sampleCount: records.length,
    start: window.start,
    end: window.end,
    derivedAt: new Date().toISOString(),
  };
}
