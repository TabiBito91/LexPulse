import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { generateDigest } from '@/lib/agent';
import { decryptKey } from '@/lib/crypto';
import { getUserKey, getUsersScheduledNow, insertDigest } from '@/lib/supabase';
import { sendDigestEmail } from '@/lib/email';

// Allow up to 5 minutes — multiple users may be generated in sequence
export const maxDuration = 300;

export async function GET(req: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const scheduledUsers = await getUsersScheduledNow();
  console.log(`[cron] ${scheduledUsers.length} user(s) scheduled for this hour`);

  const results: Array<{ clerkId: string; status: string }> = [];

  for (const { clerk_id, notify_email } of scheduledUsers) {
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

      // Generate digest
      const digest = await generateDigest(apiKey);
      apiKey = ''; // clear from memory

      // Persist
      await insertDigest(clerk_id, digest, userKey.key_hint);

      // Send email
      try {
        let toEmail = notify_email;
        if (!toEmail) {
          const user = await clerkClient().users.getUser(clerk_id);
          toEmail = user.emailAddresses[0]?.emailAddress ?? null;
        }
        if (toEmail) await sendDigestEmail(toEmail, digest);
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
