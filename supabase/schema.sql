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
