import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateDigest } from '@/lib/agent';
import { decryptKey } from '@/lib/crypto';
import { getUserKey, insertDigest } from '@/lib/supabase';

export async function POST(req: Request) {
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

  // ── Run the agent ──────────────────────────────────────────────────────────
  let digest;
  try {
    digest = await generateDigest(resolvedApiKey);
  } catch {
    // SECURITY: Never forward raw Anthropic errors — they may reference the API key
    return NextResponse.json({ error: 'generation_failed' }, { status: 502 });
  } finally {
    // Explicitly clear the key reference (helps GC; belt-and-suspenders)
    resolvedApiKey = '';
  }

  // ── Optional verification agent ───────────────────────────────────────────
  let verificationScore: number | undefined;
  // (ENABLE_VERIFICATION support omitted for now — placeholder)

  // ── Persist ───────────────────────────────────────────────────────────────
  try {
    const saved = await insertDigest(
      resolvedClerkId,
      digest,
      keyHint,
      verificationScore,
    );
    return NextResponse.json({ id: saved.id }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}
