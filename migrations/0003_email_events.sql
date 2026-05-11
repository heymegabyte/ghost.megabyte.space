-- Email events: per-recipient ledger of every Listmonk / SMTP-provider event.
-- Every send, view, click, bounce, complaint, unsubscribe lands here so the
-- analytics layer + PostHog dashboards have one canonical source of truth.
CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK(event_type IN (
    'subscriber.created',
    'subscriber.updated',
    'subscriber.deleted',
    'campaign.created',
    'campaign.update',
    'campaign.sent',
    'tx.sent',
    'tx.delivered',
    'tx.opened',
    'tx.clicked',
    'tx.bounced',
    'tx.complained',
    'tx.failed',
    'bounce',
    'unknown'
  )),
  email TEXT,
  campaign_id INTEGER,
  subscriber_id INTEGER,
  source TEXT,
  reason TEXT,
  raw_payload TEXT NOT NULL,
  posthog_status TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign ON email_events(campaign_id, received_at DESC);

-- Email suppressions: authoritative do-not-send list. Every transactional
-- send path MUST hit this table first. Composite uniqueness on (email, reason)
-- so we can record both a hard bounce + a manual unsubscribe for one address.
CREATE TABLE IF NOT EXISTS email_suppressions (
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(reason IN (
    'unsubscribe',
    'hard_bounce',
    'soft_bounce',
    'complaint',
    'manual',
    'invalid'
  )),
  source TEXT,
  campaign_id INTEGER,
  notes TEXT,
  suppressed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (email, reason)
);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_email ON email_suppressions(email);
