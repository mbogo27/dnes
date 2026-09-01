CREATE TABLE submissions (
  id            TEXT PRIMARY KEY,
  text          TEXT NOT NULL,
  handle        TEXT,
  bundle        TEXT,
  source_url    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  session_id    TEXT,
  ip_hash       TEXT,
  user_agent    TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE reactions (
  id            TEXT PRIMARY KEY,
  splash_id     TEXT NOT NULL,
  bundle        TEXT,
  reaction      TEXT NOT NULL,                    -- fire | heart | down
  session_id    TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_reactions_splash ON reactions(splash_id);

CREATE TABLE slot_claims (
  id            TEXT PRIMARY KEY,
  brand_name    TEXT NOT NULL,
  contact_name  TEXT NOT NULL,
  whatsapp      TEXT NOT NULL,
  bundle_pref   TEXT,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'interest', -- interest | confirmed | declined
  session_id    TEXT,
  created_at    INTEGER NOT NULL
);

-- splash_id is nullable here (deviates from the literal spec's NOT NULL):
-- the copy in §5 has the claim prompt shown right after a fresh submission,
-- before any splash_id exists — enforcing NOT NULL would make that flow
-- impossible to write. NULL means "claimed via the post-submission prompt."
CREATE TABLE name_claims (
  id            TEXT PRIMARY KEY,
  splash_id     TEXT,
  handle        TEXT,
  whatsapp      TEXT NOT NULL,
  verified      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE shares (
  id            TEXT PRIMARY KEY,
  share_token   TEXT NOT NULL UNIQUE,
  splash_id     TEXT,                             -- null = whole wall
  channel       TEXT,                             -- whatsapp | copy_link | x | other
  session_id    TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_shares_token ON shares(share_token);

CREATE TABLE events (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  splash_id     TEXT,
  bundle        TEXT,
  props_json    TEXT,
  session_id    TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_events_name_time ON events(name, created_at);
