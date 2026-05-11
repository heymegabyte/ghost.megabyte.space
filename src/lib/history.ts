/**
 * History-window parsing + downsampling helpers.
 *
 * Provides the shared validation that backs every endpoint accepting `start`/`end`
 * or `minutes` query parameters (`/history`, `/snapshot`, `/export`,
 * `/google-sheets`, `/random`, `__test/seed`).
 *
 * @packageDocumentation
 */

import { ApiError } from "./errors";
import type { HistoryPoint, HistoryWindow } from "../types";

/**
 * Normalize and validate a history window from either explicit ISO bounds
 * or a relative `minutes` lookback.
 *
 * Rules:
 *  - If either `start` or `end` is supplied, both are required.
 *  - Both bounds must parse as valid ISO timestamps.
 *  - `end` must be strictly after `start`.
 *  - The total span may not exceed 10 years (`24 * 3650` hours).
 *  - If neither bound is supplied, the window is `[now - minutes, now]`
 *    where `minutes` defaults to `60`.
 *
 * @param input.start    Optional ISO start timestamp.
 * @param input.end      Optional ISO end timestamp.
 * @param input.minutes  Relative lookback window (used only when start/end are absent).
 * @throws {@link ApiError} `VALIDATION_ERROR` (`400`) on any rule violation.
 * @returns Canonical `{ start, end }` ISO pair.
 */
export function parseHistoryWindow(input: {
  start?: string;
  end?: string;
  minutes?: number;
}): HistoryWindow {
  if (input.start || input.end) {
    if (!input.start || !input.end) {
      throw new ApiError("Both start and end are required when using explicit history ranges.", 400, "VALIDATION_ERROR");
    }

    const start = new Date(input.start);
    const end = new Date(input.end);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new ApiError("History range dates must be valid ISO timestamps.", 400, "VALIDATION_ERROR");
    }

    if (end.getTime() <= start.getTime()) {
      throw new ApiError("History end must be after history start.", 400, "VALIDATION_ERROR");
    }

    const spanHours = (end.getTime() - start.getTime()) / 3_600_000;
    if (spanHours > 24 * 3650) {
      throw new ApiError("History range is too large. Request at most 10 years at a time.", 400, "VALIDATION_ERROR");
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  const minutes = input.minutes ?? 60;
  const end = new Date();
  const start = new Date(end.getTime() - minutes * 60_000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Largest-Triangle-Three-Buckets-style uniform downsample to `targetPoints` samples.
 *
 * Picks evenly spaced points by index. Returns the input unchanged when the request
 * is non-positive, larger than the input length, or otherwise impossible.
 *
 * @param points        Time-ordered series.
 * @param targetPoints  Desired output length (typically the caller's `points` query param).
 */
export function downsamplePoints(points: HistoryPoint[], targetPoints: number): HistoryPoint[] {
  if (targetPoints <= 0 || points.length <= targetPoints) {
    return points;
  }

  const step = (points.length - 1) / (targetPoints - 1);
  const sampled: HistoryPoint[] = [];

  for (let index = 0; index < targetPoints; index += 1) {
    const point = points[Math.round(index * step)];
    if (point) {
      sampled.push(point);
    }
  }

  return sampled;
}
