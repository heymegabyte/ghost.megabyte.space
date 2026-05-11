#!/usr/bin/env bash
# Apply migrations/0003_email_events.sql to the remote ghost-megabyte-space-emf D1
# database. Requires a Cloudflare API token with "D1 Edit" permission for the
# Megabyte Labs account (84fa0d1b16ff8086dd958c468ce7fd59).
#
# The deploy-only `cfut_*` token in CLAUDE memory does NOT have D1 perms.
# Create a scoped token at https://dash.cloudflare.com/profile/api-tokens with
# the "D1:Edit" permission for this account, then run:
#
#   CLOUDFLARE_API_TOKEN=<d1-edit-token> ./scripts/apply-email-migration.sh
#
# Alternatively, run `pnpm wrangler login` once and then call:
#
#   pnpm wrangler d1 execute ghost-megabyte-space-emf --remote --file=migrations/0003_email_events.sql
#
set -euo pipefail

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "[apply-email-migration] CLOUDFLARE_API_TOKEN not set." >&2
  echo "[apply-email-migration] Mint a D1:Edit-scoped token at:" >&2
  echo "  https://dash.cloudflare.com/profile/api-tokens" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

echo "[apply-email-migration] Applying migrations/0003_email_events.sql to remote D1..."
pnpm wrangler d1 execute ghost-megabyte-space-emf \
  --remote \
  --file=migrations/0003_email_events.sql

echo "[apply-email-migration] Verifying tables exist..."
pnpm wrangler d1 execute ghost-megabyte-space-emf \
  --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('email_events','email_suppressions') ORDER BY name;"

echo "[apply-email-migration] Done. Now set the webhook secret:"
echo "  pnpm wrangler secret put LISTMONK_WEBHOOK_SECRET"
echo "  pnpm wrangler secret put POSTHOG_API_KEY"
