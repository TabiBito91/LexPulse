import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getDigest } from '@/lib/supabase';
import DigestReader from '@/components/DigestReader';

interface Props {
  params: { id: string };
}

export default async function IssuePage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const digest = await getDigest(params.id, userId);
  if (!digest) notFound();

  return (
    <div className="space-y-4">
      <a href="/" className="text-xs text-gray-400 hover:text-gray-600">
        &larr; Back to digest
      </a>
      <DigestReader content={digest.content} />
    </div>
  );
}
