// SECURITY: server-only — Supabase service role key must never reach the client.
import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Digest, DigestFrequency, UserKey, UserSettings } from './types';

function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  // Service role client — bypasses RLS. Always scope queries by clerk_id manually.
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── User API key helpers ────────────────────────────────────────────────────

export async function getUserKey(clerkId: string): Promise<UserKey | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('user_keys')
    .select('*')
    .eq('clerk_id', clerkId)
    .maybeSingle();
  if (error) throw new Error('Failed to fetch user key');
  return data;
}

export async function upsertUserKey(
  clerkId: string,
  encryptedKey: string,
  keyHint: string,
): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.from('user_keys').upsert(
    {
      clerk_id: clerkId,
      encrypted_key: encryptedKey,
      key_hint: keyHint,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'clerk_id' },
  );
  if (error) throw new Error('Failed to save user key');
}

export async function deleteUserKey(clerkId: string): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .from('user_keys')
    .delete()
    .eq('clerk_id', clerkId);
  if (error) throw new Error('Failed to delete user key');
}

// ── Digest helpers ──────────────────────────────────────────────────────────

export async function getDigests(clerkId: string): Promise<Digest[]> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('digests')
    .select('*')
    .eq('clerk_id', clerkId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('Failed to fetch digests');
  return data ?? [];
}

export async function getDigest(
  id: string,
  clerkId: string,
): Promise<Digest | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('digests')
    .select('*')
    .eq('id', id)
    .eq('clerk_id', clerkId) // always scope by owner
    .maybeSingle();
  if (error) throw new Error('Failed to fetch digest');
  return data;
}

// ── User settings helpers ───────────────────────────────────────────────────

export async function getUserSettings(clerkId: string): Promise<UserSettings | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('user_settings')
    .select('*')
    .eq('clerk_id', clerkId)
    .maybeSingle();
  if (error) throw new Error('Failed to fetch user settings');
  return data;
}

export async function upsertUserSettings(
  clerkId: string,
  settings: Partial<Omit<UserSettings, 'id' | 'clerk_id' | 'created_at' | 'updated_at'>>,
): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.from('user_settings').upsert(
    { clerk_id: clerkId, ...settings, updated_at: new Date().toISOString() },
    { onConflict: 'clerk_id' },
  );
  if (error) throw new Error('Failed to save user settings');
}

// Returns all users whose next_run_at is at or before now.
export async function getUsersScheduledNow(): Promise<
  Array<{ clerk_id: string; notify_email: string | null; next_run_at: string; digest_frequency: DigestFrequency }>
> {
  const db = getServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('user_settings')
    .select('clerk_id, notify_email, next_run_at, digest_frequency')
    .eq('email_enabled', true)
    .not('next_run_at', 'is', null)
    .lte('next_run_at', now);
  if (error) throw new Error('Failed to fetch scheduled users');
  return data ?? [];
}

export async function updateNextRunAt(clerkId: string, nextRunAt: Date): Promise<void> {
  const db = getServiceClient();
  const { error } = await db
    .from('user_settings')
    .update({ next_run_at: nextRunAt.toISOString(), updated_at: new Date().toISOString() })
    .eq('clerk_id', clerkId);
  if (error) throw new Error('Failed to update next_run_at');
}

export async function insertDigest(
  clerkId: string,
  content: object,
  keyHint: string,
  verificationScore?: number,
  verificationIssues?: unknown,
): Promise<Digest> {
  const db = getServiceClient();
  const { data, error } = await db
    .from('digests')
    .insert({
      clerk_id: clerkId,
      content,
      key_hint_used: keyHint,
      verification_score: verificationScore ?? null,
      verification_issues: verificationIssues ?? null,
    })
    .select()
    .single();
  if (error) throw new Error('Failed to insert digest');
  return data;
}
