import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getDigests } from '@/lib/supabase';
import DigestReader from '@/components/DigestReader';
import IssueCard from '@/components/IssueCard';
import GenerateButton from '@/components/GenerateButton';

export default async function HomePage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const digests = await getDigests(userId);
  const latest = digests[0] ?? null;
  const past = digests.slice(1);

  return (
    <div className="space-y-12">
      {/* Generate + latest digest */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold text-gray-500">Latest digest</h1>
          <GenerateButton />
        </div>
        {latest ? (
          <DigestReader content={latest.content} />
        ) : (
          <div className="text-sm text-gray-500 py-10 text-center border border-dashed border-gray-200 rounded">
            No digests yet. Click &ldquo;Generate digest&rdquo; to create your first one.
          </div>
        )}
      </div>

      {/* Past issues */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500">Past issues</h2>
          <div className="space-y-2">
            {past.map((d) => (
              <IssueCard key={d.id} digest={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
