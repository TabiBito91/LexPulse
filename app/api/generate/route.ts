import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateDigest } from '@/lib/agent';
import { decryptKey } from '@/lib/crypto';
import { getUserKey, getUserSettings, getTrackedThreads, insertDigest } from '@/lib/supabase';
import { sendDigestEmail } from '@/lib/email';

// Allow up to 5 minutes for web search + digest generation (requires Vercel Pro)
export const maxDuration = 300;

export async function POST(req: Request) {
  console.log('[generate] POST handler started');
  try {
    return await handleGenerate(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const name = err instanceof Error ? err.constructor.name : 'Unknown';
    console.error('[generate] unhandled top-level error:', name, msg);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

async function handleGenerate(req: Request) {
  // ── Determine caller identity ──────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const isCron =
    authHeader === `Bearer ${process.env.CRON_SECRET}` &&
    !!process.env.CRON_SECRET;

  let resolvedClerkId: string;
  let resolvedApiKey: string;
  let keyHint: string;

  if (isCron) {
    // Cron path — use owner's env var key for owner's account
    const ownerKey = process.env.ANTHROPIC_API_KEY;
    const ownerClerkId = process.env.OWNER_CLERK_ID;
    if (!ownerKey || !ownerClerkId) {
      return NextResponse.json(
        { error: 'cron_misconfigured' },
        { status: 500 },
      );
    }
    resolvedClerkId = ownerClerkId;
    resolvedApiKey = ownerKey;
    keyHint = 'cron';
  } else {
    // User-triggered path — resolve key from Supabase
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const userKey = await getUserKey(userId);
    if (!userKey) {
      // Signal to the frontend to redirect to /settings
      return NextResponse.json(
        { error: 'no_key', redirect: '/settings' },
        { status: 402 },
      );
    }

    try {
      resolvedApiKey = decryptKey(userKey.encrypted_key);
    } catch {
      // Decryption failure — key may be corrupted or encryption secret rotated
      return NextResponse.json({ error: 'key_decryption_failed' }, { status: 500 });
    }

    resolvedClerkId = userId;
    keyHint = userKey.key_hint;
  }

  // ── Fetch user settings, preferred sites, and tracked threads ────────────
  const [settings, trackedThreads] = await Promise.all([
    getUserSettings(resolvedClerkId).catch(() => null),
    getTrackedThreads(resolvedClerkId).catch(() => []),
  ]);
  const preferredSites = settings?.preferred_sites ?? [];

  // ── Run the agent ──────────────────────────────────────────────────────────
  let digest;
  try {
    digest = await generateDigest(resolvedApiKey, preferredSites, trackedThreads);
  } catch (err) {
    // SECURITY: log error type/message only — never log the API key
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.constructor.name : 'Unknown';
    console.error('[generate] agent error:', errName, errMsg);
    return NextResponse.json({ error: 'generation_failed' }, { status: 502 });
  } finally {
    // Explicitly clear the key reference (helps GC; belt-and-suspenders)
    resolvedApiKey = '';
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  let savedId: string;
  try {
    const saved = await insertDigest(resolvedClerkId, digest, keyHint);
    savedId = saved.id;
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }

  // ── Send email if enabled ─────────────────────────────────────────────────
  try {
    if (settings?.email_enabled) {
      let recipients: string[] = settings.notify_emails?.length ? settings.notify_emails : [];
      if (recipients.length === 0) {
        // Fall back to legacy single email, then Clerk account email
        const fallback = settings.notify_email
          ?? (await (await clerkClient()).users.getUser(resolvedClerkId)).emailAddresses[0]?.emailAddress
          ?? null;
        if (fallback) recipients = [fallback];
      }
      if (recipients.length > 0) await sendDigestEmail(recipients, digest);
    }
  } catch (err) {
    // Email failure is non-fatal — digest was already saved
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate] email send failed (non-fatal):', msg);
  }

  return NextResponse.json({ id: savedId }, { status: 200 });
}

