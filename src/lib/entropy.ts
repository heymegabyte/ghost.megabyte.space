/**
 * Shannon-entropy calculator for time-windowed EMF readings.
 *
 * Reads are binned uniformly between observed `min` and `max` and the Shannon
 * entropy of the resulting histogram is reported in bits. The endpoint
 * `GET /api/v1/ghost-emf/entropy` wraps this helper.
 *
 * @packageDocumentation
 */

import type { EntropySummary, HistoryPoint } from "../types";

/**
 * Compute the Shannon entropy of a series of EMF readings.
 *
 * Algorithm:
 *  1. Take the numeric `value` from each point.
 *  2. If the series is empty, return zeroed summary.
 *  3. If all values are equal (`min === max`), return zero entropy bits.
 *  4. Otherwise, build a `bins`-element histogram between `min` and `max` and
 *     compute `H = -Σ p_i · log2(p_i)`.
 *
 * @param points         Time-ordered readings (only `value` is used).
 * @param windowMinutes  Window size used to gather `points` — echoed back in the result.
 * @param bins           Number of histogram bins. Clamped to at least 1.
 *
 * @returns Summary including `entropyBits`, `sampleCount`, `min`, `max`, `mean`,
 *          `bins`, `windowMinutes`, and an `updatedAt` ISO timestamp.
 *
 * @see {@link https://en.wikipedia.org/wiki/Entropy_(information_theory) | Shannon, C. E. (1948)} —
 * *A Mathematical Theory of Communication.* Bell System Technical Journal, 27(3), 379–423.
 */
export function calculateEntropy(points: HistoryPoint[], windowMinutes: number, bins: number): EntropySummary {
  const values = points.map((point) => point.value);
  const updatedAt = new Date().toISOString();

  if (values.length === 0) {
    return {
      entropyBits: 0,
      sampleCount: 0,
      windowMinutes,
      bins,
      min: 0,
      max: 0,
      mean: 0,
      updatedAt,
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;

  if (min === max) {
    return {
      entropyBits: 0,
      sampleCount: values.length,
      windowMinutes,
      bins,
      min,
      max,
      mean,
      updatedAt,
    };
  }

  const counts = new Array(Math.max(1, bins)).fill(0);
  const span = max - min;

  for (const value of values) {
    const rawIndex = Math.floor(((value - min) / span) * counts.length);
    const index = Math.min(counts.length - 1, Math.max(0, rawIndex));
    counts[index] += 1;
  }

  let entropyBits = 0;

  for (const count of counts) {
    if (count === 0) {
      continue;
    }

    const probability = count / values.length;
    entropyBits -= probability * Math.log2(probability);
  }

  return {
    entropyBits: Number(entropyBits.toFixed(6)),
    sampleCount: values.length,
    windowMinutes,
    bins: counts.length,
    min,
    max,
    mean: Number(mean.toFixed(6)),
    updatedAt,
  };
}
