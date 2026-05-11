/**
 * Canonical error type + JSON response builder for the Ghost Signal API.
 *
 * Every request handler that needs to bail with a 4xx/5xx throws an {@link ApiError}.
 * The top-level Hono `app.onError()` (see `src/index.ts`) catches it and reshapes it
 * into the public `{ error, code, details, requestId }` envelope via {@link jsonError}.
 *
 * @packageDocumentation
 */

/**
 * Structured error thrown by route handlers + lib helpers.
 *
 * Carries enough metadata for the framework error handler to produce a
 * machine-readable response without losing the request correlation id.
 *
 * @example
 * ```ts
 * if (!c.env.EMF_DB) {
 *   throw new ApiError("Snapshot storage is not configured.", 503, "SNAPSHOT_STORAGE_UNAVAILABLE");
 * }
 * ```
 *
 * @see {@link jsonError} — serializes an `ApiError` into the public response envelope.
 */
export class ApiError extends Error {
  /** Stable machine-readable code (SCREAMING_SNAKE_CASE) — safe to switch on. */
  readonly code: string;
  /** Optional structured payload surfaced to the caller (validation hints, retry-after, etc.). */
  readonly details?: unknown;
  /** HTTP status the framework should emit. */
  readonly status: number;

  /**
   * @param message  Human-readable error message included in the response body.
   * @param status   HTTP status code (defaults to `500`).
   * @param code     Stable machine-readable code (defaults to `"INTERNAL_ERROR"`).
   * @param details  Optional structured payload (rendered as JSON in the response).
   */
  constructor(message: string, status = 500, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Serialize an {@link ApiError} into the canonical public error envelope.
 *
 * The envelope shape (`error`, `code`, `details`, `requestId`) matches the
 * `ApiError` Zod schema exported in the OpenAPI document at `/api/v1/openapi.json`,
 * so generated clients can rely on the same field set across every endpoint.
 *
 * @param error      The error to serialize.
 * @param requestId  Correlation id from the `requestId` Hono context variable.
 *                   Echoed back as the `x-request-id` response header.
 * @returns A JSON `Response` with `error.status` as its HTTP status.
 */
export function jsonError(error: ApiError, requestId: string): Response {
  return new Response(
    JSON.stringify({
      error: error.message,
      code: error.code,
      details: error.details,
      requestId,
    }),
    {
      status: error.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-request-id": requestId,
      },
    },
  );
}
