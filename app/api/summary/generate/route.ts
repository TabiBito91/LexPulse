import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getDigest, getUserKey } from '@/lib/supabase';
import { decryptKey } from '@/lib/crypto';
import { generateSummary } from '@/lib/summarize';

// No web search — pure analysis — 2 minutes is plenty
export const maxDuration = 120;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let digestIds: string[];
  try {
    const body = await req.json();
    digestIds = body.digestIds;
    if (!Array.isArray(digestIds) || digestIds.length < 2 || digestIds.length > 8) {
      return NextResponse.json(
        { error: 'digestIds must be an array of 2–8 IDs' },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Fetch and decrypt the user's API key
  const userKey = await getUserKey(userId);
  if (!userKey) {
    return NextResponse.json(
      { error: 'no_key', redirect: '/settings' },
      { status: 402 },
    );
  }

  let apiKey: string;
  try {
    apiKey = decryptKey(userKey.encrypted_key);
  } catch {
    return NextResponse.json({ error: 'key_decryption_failed' }, { status: 500 });
  }

  // Fetch all requested digests — each scoped to the owner
  let digests;
  try {
    const fetched = await Promise.all(digestIds.map((id) => getDigest(id, userId)));
    digests = fetched.filter((d) => d !== null);
    if (digests.length < 2) {
      return NextResponse.json({ error: 'not_enough_digests' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }

  // Sort oldest → newest so the summary reads chronologically
  digests.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  // Generate the summary
  let summary;
  try {
    summary = await generateSummary(apiKey, digests);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[summary/generate] agent error:', msg);
    return NextResponse.json({ error: 'generation_failed' }, { status: 502 });
  } finally {
    apiKey = '';
  }

  return NextResponse.json({ summary }, { status: 200 });
}
