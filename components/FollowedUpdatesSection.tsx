import type { FollowedTopicUpdate } from '@/lib/types';

interface FollowedUpdatesSectionProps {
  updates: FollowedTopicUpdate[];
}

export default function FollowedUpdatesSection({ updates }: FollowedUpdatesSectionProps) {
  const withUpdates    = updates.filter((u) => u.hasUpdate);
  const withoutUpdates = updates.filter((u) => !u.hasUpdate);

  return (
    <section className="space-y-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-600 border-b border-blue-100 pb-1">
        Following
      </h2>

      <div className="space-y-6">
        {withUpdates.map((update) => (
          <article key={update.threadId} className="space-y-1">
            <div className="text-xs text-blue-500 font-medium">
              Update on: {update.originalTitle}
            </div>
            <h3 className="text-sm font-semibold leading-snug">
              {update.url ? (
                <a
                  href={update.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {update.updateTitle}
                </a>
              ) : (
                update.updateTitle
              )}
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">{update.summary}</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-600">Why it matters: </span>
              {update.significance}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {update.url ? (
                <a
                  href={update.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:text-gray-600"
                >
                  {update.source}
                </a>
              ) : (
                <span>{update.source}</span>
              )}
              {update.publishedDate && (
                <>
                  <span>·</span>
                  <span>{update.publishedDate}</span>
                </>
              )}
            </div>
          </article>
        ))}

        {withoutUpdates.length > 0 && (
          <div className="space-y-1">
            {withoutUpdates.map((update) => (
              <p key={update.threadId} className="text-xs text-gray-400">
                No new developments this week on: <span className="italic">{update.originalTitle}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
