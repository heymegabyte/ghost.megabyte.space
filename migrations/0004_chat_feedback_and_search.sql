-- Per-message feedback (thumbs up / thumbs down) on assistant replies.
-- Indexed by session for replay + by created_at for global signal-quality dashboards.
CREATE TABLE IF NOT EXISTS chat_feedback (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating IN (-1, 1)),
  reason TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (message_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_feedback_session ON chat_feedback(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_created ON chat_feedback(created_at DESC);

-- Lightweight search index for /api/v1/chat/search. SQLite FTS5 keeps it portable
-- across D1 and local dev. Tokenizer 'porter unicode61' handles plurals + diacritics.
CREATE VIRTUAL TABLE IF NOT EXISTS chat_messages_fts USING fts5(
  content,
  session_id UNINDEXED,
  role UNINDEXED,
  content='chat_messages',
  content_rowid='rowid',
  tokenize='porter unicode61'
);

-- Triggers keep the FTS index in sync with chat_messages. They are idempotent
-- — re-running this migration is a no-op because of IF NOT EXISTS upstream.
CREATE TRIGGER IF NOT EXISTS chat_messages_ai AFTER INSERT ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(rowid, content, session_id, role)
  VALUES (new.rowid, new.content, new.session_id, new.role);
END;

CREATE TRIGGER IF NOT EXISTS chat_messages_ad AFTER DELETE ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(chat_messages_fts, rowid, content, session_id, role)
  VALUES('delete', old.rowid, old.content, old.session_id, old.role);
END;

CREATE TRIGGER IF NOT EXISTS chat_messages_au AFTER UPDATE ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(chat_messages_fts, rowid, content, session_id, role)
  VALUES('delete', old.rowid, old.content, old.session_id, old.role);
  INSERT INTO chat_messages_fts(rowid, content, session_id, role)
  VALUES (new.rowid, new.content, new.session_id, new.role);
END;

-- Backfill the FTS index from any rows that already existed before this migration.
INSERT INTO chat_messages_fts(rowid, content, session_id, role)
  SELECT rowid, content, session_id, role FROM chat_messages
  WHERE rowid NOT IN (SELECT rowid FROM chat_messages_fts);
