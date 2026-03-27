import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserKey } from '@/lib/supabase';
import ApiKeyForm from '@/components/ApiKeyForm';

export default async function SettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const userKey = await getUserKey(userId);

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-base font-semibold">Settings</h1>
      <ApiKeyForm existingHint={userKey?.key_hint ?? null} />
    </div>
  );
}
