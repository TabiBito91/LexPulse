import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getDigest, getTrackedThreads } from '@/lib/supabase';
import DigestReader from '@/components/DigestReader';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IssuePage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;
  const [digest, trackedThreads] = await Promise.all([
    getDigest(id, userId),
    getTrackedThreads(userId),
  ]);
  if (!digest) notFound();

  return (
    <div className="space-y-4">
      <a href="/digests" className="text-xs text-gray-400 hover:text-gray-600">
        &larr; Back to past digests
      </a>
      <DigestReader content={digest.content} trackedThreads={trackedThreads} />
    </div>
  );
}
