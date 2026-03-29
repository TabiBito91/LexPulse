import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getDigests, getTrackedThreads } from '@/lib/supabase';
import DigestReader from '@/components/DigestReader';
import GenerateButton from '@/components/GenerateButton';

export default async function HomePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [digests, trackedThreads] = await Promise.all([
    getDigests(userId),
    getTrackedThreads(userId),
  ]);
  const latest = digests[0] ?? null;

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-gray-500">Latest digest</h1>
          <GenerateButton latestCreatedAt={latest?.created_at ?? null} />
        </div>
        {latest ? (
          <DigestReader content={latest.content} trackedThreads={trackedThreads} />
        ) : (
          <div className="text-sm text-gray-500 py-10 text-center border border-dashed border-gray-200 rounded">
            No digests yet. Click &ldquo;Generate digest&rdquo; to create your first one.
          </div>
        )}
      </div>
    </div>
  );
}
