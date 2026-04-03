import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { upsertUserSettings } from '@/lib/supabase';
import { computeNextRunAt } from '@/lib/scheduling';
import type { DigestFrequency } from '@/lib/types';

const VALID_FREQUENCIES: DigestFrequency[] = ['daily', 'weekly', 'biweekly', 'monthly', 'bimonthly'];

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    emailEnabled: boolean;
    notifyEmails: string[];
    digestDay: number;
    digestHour: number;
    digestMinute: number;
    timezone: string;
    digestFrequency: DigestFrequency;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const { emailEnabled, notifyEmails, digestDay, digestHour, digestMinute, timezone, digestFrequency } = body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    typeof emailEnabled !== 'boolean' ||
    !Array.isArray(notifyEmails) || notifyEmails.some(e => !emailRegex.test(e)) ||
    digestDay < 0 || digestDay > 6 ||
    digestHour < 0 || digestHour > 23 ||
    digestMinute < 0 || digestMinute > 55 || digestMinute % 5 !== 0 ||
    typeof timezone !== 'string' || !isValidTimezone(timezone) ||
    !VALID_FREQUENCIES.includes(digestFrequency)
  ) {
    return NextResponse.json({ error: 'invalid_values' }, { status: 400 });
  }

  const nextRunAt = emailEnabled
    ? computeNextRunAt(digestDay, digestHour, digestMinute, timezone, digestFrequency)
    : null;

  try {
    await upsertUserSettings(userId, {
      email_enabled: emailEnabled,
      notify_emails: notifyEmails,
      digest_day: digestDay,
      digest_hour: digestHour,
      digest_minute: digestMinute,
      timezone,
      digest_frequency: digestFrequency,
      next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}
