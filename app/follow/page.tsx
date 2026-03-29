import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import FollowConfirm from '@/components/FollowConfirm';

interface Props {
  searchParams: Promise<{ title?: string; url?: string; topic?: string }>;
}

export default async function FollowPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { title, url, topic } = await searchParams;

  if (!title) redirect('/');

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-base font-semibold">Follow this topic</h1>
      <p className="text-xs text-gray-500">
        Future digests will include a dedicated update on this topic.
      </p>
      <FollowConfirm
        title={decodeURIComponent(title)}
        sourceUrl={url ? decodeURIComponent(url) : undefined}
        topicArea={topic ? decodeURIComponent(topic) : undefined}
      />
    </div>
  );
}
