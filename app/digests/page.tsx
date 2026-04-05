import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getDigests } from '@/lib/supabase';
import IssueCard from '@/components/IssueCard';
import SummaryPanel from '@/components/SummaryPanel';

export default async function DigestsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const digests = await getDigests(userId);

  // Pass only id + weekOf to the client component — no digest content crosses the boundary
  const digestOptions = digests.map((d) => ({
    id: d.id,
    weekOf: d.content?.weekOf ?? 'Weekly Digest',
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-sm font-semibold text-gray-500">Past digests</h1>
      {digests.length === 0 ? (
        <div className="text-sm text-gray-500 py-10 text-center border border-dashed border-gray-200 rounded">
          No digests yet. Go to the home page and click &ldquo;Generate digest&rdquo; to create your first one.
        </div>
      ) : (
        <>
          <SummaryPanel digestOptions={digestOptions} />
          <div className="space-y-2">
            {digests.map((d) => (
              <IssueCard key={d.id} digest={d} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
