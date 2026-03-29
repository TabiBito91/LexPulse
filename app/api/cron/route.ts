import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { generateDigest } from '@/lib/agent';
import { decryptKey } from '@/lib/crypto';
import { getUserKey, getUserSettings, getUsersScheduledNow, getTrackedThreads, insertDigest, updateNextRunAt } from '@/lib/supabase';
import { computeNextFromPrevious } from '@/lib/scheduling';
import { sendDigestEmail } from '@/lib/email';
import type { DigestFrequency } from '@/lib/types';

// Allow up to 5 minutes — multiple users may be generated in sequence
export const maxDuration = 300;

export async function GET(req: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let scheduledUsers: Array<{ clerk_id: string; notify_email: string | null; notify_emails: string[] | null; next_run_at: string; digest_frequency: string }>;
  try {
    scheduledUsers = await getUsersScheduledNow();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron] failed to fetch scheduled users:', msg);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }
  console.log(`[cron] ${scheduledUsers.length} user(s) scheduled for this slot`);

  const results: Array<{ clerkId: string; status: string }> = [];

  for (const { clerk_id, notify_email, notify_emails, next_run_at, digest_frequency } of scheduledUsers) {
    try {
      // Fetch and decrypt user's API key
      const userKey = await getUserKey(clerk_id);
      if (!userKey) {
        results.push({ clerkId: clerk_id, status: 'skipped_no_key' });
        continue;
      }

      let apiKey: string;
      try {
        apiKey = decryptKey(userKey.encrypted_key);
      } catch {
        results.push({ clerkId: clerk_id, status: 'skipped_decrypt_failed' });
        continue;
      }

      // Fetch preferred sites and tracked threads from user settings
      const [userSettings, trackedThreads] = await Promise.all([
        getUserSettings(clerk_id).catch(() => null),
        getTrackedThreads(clerk_id).catch(() => []),
      ]);
      const preferredSites = userSettings?.preferred_sites ?? [];

      // Generate digest
      const digest = await generateDigest(apiKey, preferredSites, trackedThreads);
      apiKey = ''; // clear from memory

      // Persist
      await insertDigest(clerk_id, digest, userKey.key_hint);

      // Advance next_run_at for this user
      try {
        const nextRunAt = computeNextFromPrevious(new Date(next_run_at), digest_frequency as DigestFrequency);
        await updateNextRunAt(clerk_id, nextRunAt);
      } catch (schedErr) {
        const msg = schedErr instanceof Error ? schedErr.message : String(schedErr);
        console.error(`[cron] failed to advance next_run_at for ${clerk_id} (non-fatal):`, msg);
      }

      // Send email
      try {
        let recipients: string[] = notify_emails?.length ? notify_emails : [];
        if (recipients.length === 0) {
          // Fall back to legacy single email, then Clerk account email
          const fallback = notify_email
            ?? (await (await clerkClient()).users.getUser(clerk_id)).emailAddresses[0]?.emailAddress
            ?? null;
          if (fallback) recipients = [fallback];
        }
        if (recipients.length > 0) await sendDigestEmail(recipients, digest);
      } catch (emailErr) {
        const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.error(`[cron] email failed for ${clerk_id} (non-fatal):`, msg);
      }

      results.push({ clerkId: clerk_id, status: 'ok' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron] generation failed for ${clerk_id}:`, msg);
      results.push({ clerkId: clerk_id, status: 'error' });
    }
  }

  return NextResponse.json({ results }, { status: 200 });
}
