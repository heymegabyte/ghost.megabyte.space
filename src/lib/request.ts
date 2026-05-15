/**
 * Request-parsing helpers shared across route handlers.
 *
 * Centralizes the "read JSON body → validate with Zod → emit canonical 400" flow
 * that previously lived inline in every chat / feedback / debate handler. Keeps
 * the public error envelope shape (`{ error, code, details }`) consistent and
 * lets new handlers opt in with a single call site.
 *
 * @packageDocumentation
 */

import type { Context } from "hono";
import type { z, ZodError, ZodTypeAny } from "zod";

/**
 * Outcome of a JSON-body parse attempt — either a validated payload (`ok: true`)
 * or a pre-built `Response` carrying the canonical 400 envelope (`ok: false`).
 *
 * The discriminated union lets callers `return result.response` directly when
 * validation fails without re-encoding the error message.
 */
export type ParsedBody<TSchema extends ZodTypeAny> =
  | { ok: true; data: z.infer<TSchema> }
  | { ok: false; response: Response };

/**
 * Read the request body as JSON and validate it against `schema`.
 *
 * Returns a discriminated `{ ok, data }` / `{ ok, response }` so handlers can
 * surface validation errors without inlining the same `try/catch + safeParse`
 * boilerplate. Two failure modes are surfaced explicitly:
 *
 *  - Body is not parseable JSON → `400 INVALID_JSON`.
 *  - Body parses but fails the schema → `400 <invalidCode>` carrying
 *    `details: ZodIssue[]` so clients can render per-field validation errors.
 *
 * @example
 * ```ts
 * app.post("/api/v1/chat", async (c) => {
 *   const parsed = await parseJsonBody(c, ChatRequestSchema, "INVALID_MESSAGE");
 *   if (!parsed.ok) return parsed.response;
 *   // …parsed.data is fully typed via z.infer<typeof ChatRequestSchema>
 * });
 * ```
 *
 * @param c             Hono request context.
 * @param schema        Zod schema to validate against.
 * @param invalidCode   Machine-readable code emitted on validation failure
 *                      (defaults to `"INVALID_REQUEST"`). The `INVALID_JSON`
 *                      code on body-parse failure is non-configurable on
 *                      purpose so clients can branch on it.
 */
export async function parseJsonBody<TSchema extends ZodTypeAny>(
  c: Context,
  schema: TSchema,
  invalidCode = "INVALID_REQUEST",
): Promise<ParsedBody<TSchema>> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return {
      ok: false,
      response: c.json({ error: "Invalid JSON body.", code: "INVALID_JSON" }, 400),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: c.json(
        {
          error: firstIssueMessage(parsed.error) ?? "Invalid request.",
          code: invalidCode,
          details: parsed.error.issues,
        },
        400,
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

/** First Zod issue message (or `null` if the error somehow has no issues). */
function firstIssueMessage(error: ZodError): string | null {
  return error.issues[0]?.message ?? null;
}
