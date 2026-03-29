import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserKey, getUserSettings } from '@/lib/supabase';
import ApiKeyForm from '@/components/ApiKeyForm';
import ScheduleForm from '@/components/ScheduleForm';
import SourcesForm from '@/components/SourcesForm';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [userKey, settings] = await Promise.all([
    getUserKey(userId),
    getUserSettings(userId),
  ]);

  return (
    <div className="max-w-lg space-y-10">
      <h1 className="text-base font-semibold">Settings</h1>

      <ApiKeyForm existingHint={userKey?.key_hint ?? null} />

      <hr className="border-gray-200" />

      <ScheduleForm
        initial={{
          emailEnabled: settings?.email_enabled ?? false,
          notifyEmail: settings?.notify_email ?? '',
          digestDay: settings?.digest_day ?? 1,
          digestHour: settings?.digest_hour ?? 9,
          digestMinute: settings?.digest_minute ?? 0,
          timezone: settings?.timezone ?? '',
          digestFrequency: settings?.digest_frequency ?? 'weekly',
        }}
      />

      <hr className="border-gray-200" />

      <SourcesForm initial={settings?.preferred_sites ?? []} />
    </div>
  );
}
