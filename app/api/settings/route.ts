import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { upsertUserSettings } from '@/lib/supabase';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    emailEnabled: boolean;
    notifyEmail: string | null;
    digestDay: number;
    digestHour: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const { emailEnabled, notifyEmail, digestDay, digestHour } = body;

  if (
    typeof emailEnabled !== 'boolean' ||
    digestDay < 0 || digestDay > 6 ||
    digestHour < 0 || digestHour > 23
  ) {
    return NextResponse.json({ error: 'invalid_values' }, { status: 400 });
  }

  try {
    await upsertUserSettings(userId, {
      email_enabled: emailEnabled,
      notify_email: notifyEmail,
      digest_day: digestDay,
      digest_hour: digestHour,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }
}
