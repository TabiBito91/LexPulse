import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getTrackedThread, getThreadUpdates } from '@/lib/supabase';

export default async function ThreadHistoryPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [thread, updates] = await Promise.all([
    getTrackedThread(userId, params.id),
    getThreadUpdates(userId, params.id),
  ]);

  if (!thread) notFound();

  return (
    <div className="max-w-lg space-y-6">
      <div className="space-y-1">
        <Link href="/following" className="text-xs text-gray-400 hover:text-gray-600">
          ← Following
        </Link>
        <h1 className="text-base font-semibold">{thread.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          {thread.topic_area && <span>{thread.topic_area}</span>}
          {thread.source_url && (
            <>
              {thread.topic_area && <span>&middot;</span>}
              <a
                href={thread.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline hover:text-gray-600"
              >
                Source
              </a>
            </>
          )}
          <span>&middot;</span>
          <span>
            Following since{' '}
            {new Date(thread.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {updates.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded">
          No updates yet — updates appear here after each digest is generated.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {updates.map((update) => (
            <li key={update.id} className="py-4 space-y-1.5">
              <p className="text-xs text-gray-400">
                {new Date(update.generated_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="text-sm font-medium leading-snug">
                {update.url ? (
                  <a
                    href={update.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {update.update_title}
                  </a>
                ) : (
                  update.update_title
                )}
              </p>
              <p className="text-sm text-gray-600">{update.summary}</p>
              <p className="text-xs text-gray-500 italic">{update.significance}</p>
              <p className="text-xs text-gray-400">
                {update.source}
                {update.published_date && <> &middot; {update.published_date}</>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
