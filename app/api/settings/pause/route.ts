import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { setPausedUntil } from '@/lib/supabase';

const MAX_PAUSE_DAYS = 180;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { pausedUntil: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const { pausedUntil } = body;

  if (pausedUntil !== null) {
    if (typeof pausedUntil !== 'string') {
      return NextResponse.json({ error: 'invalid_values' }, { status: 400 });
    }
    const date = new Date(pausedUntil);
    if (isNaN(date.getTime()) || date <= new Date()) {
      return NextResponse.json({ error: 'invalid_values' }, { status: 400 });
    }
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + MAX_PAUSE_DAYS);
    if (date > maxDate) {
      return NextResponse.json({ error: 'pause_too_long' }, { status: 400 });
    }
  }

  try {
    await setPausedUntil(userId, pausedUntil ? new Date(pausedUntil) : null);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}
