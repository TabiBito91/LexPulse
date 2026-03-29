import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { upsertUserSettings } from '@/lib/supabase';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { preferredSites: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const { preferredSites } = body;

  if (
    !Array.isArray(preferredSites) ||
    preferredSites.some((s) => typeof s !== 'string' || s.length === 0 || s.length > 253)
  ) {
    return NextResponse.json({ error: 'invalid_values' }, { status: 400 });
  }

  try {
    await upsertUserSettings(userId, { preferred_sites: preferredSites });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}
