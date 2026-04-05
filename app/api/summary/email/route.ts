import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getUserSettings } from '@/lib/supabase';
import { sendSummaryEmail } from '@/lib/email';
import type { DigestSummary } from '@/lib/types';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let summary: DigestSummary;
  try {
    const body = await req.json();
    summary = body.summary;
    if (!summary?.period || !Array.isArray(summary.themes) || !Array.isArray(summary.byTopic)) {
      return NextResponse.json({ error: 'invalid_summary' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Resolve recipient emails from settings (same fallback chain as digest email)
  const settings = await getUserSettings(userId).catch(() => null);
  let recipients: string[] = settings?.notify_emails?.length ? settings.notify_emails : [];

  if (recipients.length === 0) {
    const fallback =
      settings?.notify_email ??
      (await (await clerkClient()).users.getUser(userId)).emailAddresses[0]?.emailAddress ??
      null;
    if (fallback) recipients = [fallback];
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'no_recipients' }, { status: 422 });
  }

  try {
    await sendSummaryEmail(recipients, summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[summary/email] send error:', msg);
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, recipients }, { status: 200 });
}
