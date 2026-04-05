-- LexPulse v2.0 — Supabase schema
-- Run this in the Supabase SQL editor to create all required tables.
-- The app uses the service role key server-side, so RLS is a defence-in-depth
-- layer rather than the primary access control.

-- ── user_keys ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id    text NOT NULL UNIQUE,
  encrypted_key text NOT NULL,         -- AES-256-GCM: iv:authTag:ciphertext (hex)
  key_hint    text NOT NULL,           -- Last 4 chars of plaintext key (display only)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS. This policy is defence-in-depth for anon/user role access.
CREATE POLICY user_keys_owner ON user_keys
  USING (clerk_id = auth.jwt() ->> 'sub');

-- ── digests ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS digests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id           text NOT NULL,
  content            jsonb NOT NULL,          -- DigestContent JSON
  key_hint_used      text NOT NULL,           -- Audit trail: which key generated this
  verification_score integer,                 -- Optional: 0–100, null if not run
  verification_issues jsonb,                  -- Optional: structured issues from verifier
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digests_clerk_id_created_at
  ON digests (clerk_id, created_at DESC);

ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY digests_owner ON digests
  USING (clerk_id = auth.jwt() ->> 'sub');

-- ── user_settings ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id     text NOT NULL UNIQUE,
  email_enabled boolean NOT NULL DEFAULT false,
  notify_email text,              -- null = use Clerk account email
  digest_day    integer NOT NULL DEFAULT 1,   -- 0=Sun … 6=Sat (UTC)
  digest_hour   integer NOT NULL DEFAULT 9,   -- 0–23 UTC
  digest_minute integer NOT NULL DEFAULT 0,   -- 0, 5, 10 … 55
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── tracked_threads ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracked_threads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id     text NOT NULL,
  title        text NOT NULL,
  source_url   text,
  topic_area   text,
  search_query text NOT NULL,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tracked_threads_clerk_id
  ON tracked_threads (clerk_id, active, created_at DESC);

ALTER TABLE tracked_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tracked_threads_owner ON tracked_threads
  USING (clerk_id = auth.jwt() ->> 'sub');

-- ── thread_updates ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS thread_updates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id      uuid NOT NULL REFERENCES tracked_threads(id),
  clerk_id       text NOT NULL,
  update_title   text NOT NULL,
  summary        text NOT NULL,
  significance   text NOT NULL,
  source         text NOT NULL,
  url            text,
  published_date text,
  generated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS thread_updates_thread_id_generated_at
  ON thread_updates (thread_id, generated_at DESC);

ALTER TABLE thread_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY thread_updates_owner ON thread_updates
  USING (clerk_id = auth.jwt() ->> 'sub');

-- Add columns introduced after initial schema (run once each)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_sites  text[] NOT NULL DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notify_emails    text[] NOT NULL DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS timezone         text NOT NULL DEFAULT 'UTC';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS digest_frequency text NOT NULL DEFAULT 'weekly';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS next_run_at      timestamptz;

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_owner ON user_settings
  USING (clerk_id = auth.jwt() ->> 'sub');
