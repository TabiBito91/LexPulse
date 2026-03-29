import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTrackedThreads } from '@/lib/supabase';
import UnfollowButton from '@/components/UnfollowButton';

export default async function FollowingPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const threads = await getTrackedThreads(userId);

  return (
    <div className="max-w-lg space-y-8">
      <div className="space-y-1">
        <h1 className="text-base font-semibold">Following</h1>
        <p className="text-xs text-gray-500">
          {threads.length}/10 topics tracked — updates appear at the top of each digest.
        </p>
      </div>

      {threads.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded">
          You are not following any topics yet. Click &ldquo;Follow&rdquo; on any digest item to start tracking it.
        </p>
      ) : (
        <ul className="space-y-3">
          {threads.map((thread) => (
            <li
              key={thread.id}
              className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0"
            >
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium leading-snug truncate">{thread.title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {thread.topic_area && <span>{thread.topic_area}</span>}
                  {thread.source_url && (
                    <>
                      {thread.topic_area && <span>·</span>}
                      <a
                        href={thread.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline hover:text-gray-600 truncate max-w-xs"
                      >
                        Source
                      </a>
                    </>
                  )}
                  <span>·</span>
                  <span>Since {new Date(thread.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <UnfollowButton threadId={thread.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
