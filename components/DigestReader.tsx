import type { DigestContent, TrackedThread } from '@/lib/types';
import CategorySection from './CategorySection';
import FollowedUpdatesSection from './FollowedUpdatesSection';

interface DigestReaderProps {
  content: DigestContent;
  trackedThreads?: TrackedThread[];
}

export default function DigestReader({ content, trackedThreads = [] }: DigestReaderProps) {
  // Build a lookup map: lowercase title → threadId for O(1) checks in CategorySection
  const followedTitles = new Map(
    trackedThreads.map((t) => [t.title.toLowerCase(), t.id]),
  );

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-base font-semibold">LexPulse — Legal Intelligence Digest</h1>
        <p className="text-xs text-gray-500">{content.weekOf}</p>
      </header>

      {content.followedUpdates && content.followedUpdates.length > 0 && (
        <FollowedUpdatesSection updates={content.followedUpdates} />
      )}

      {content.sections.map((section) => (
        <CategorySection
          key={section.topic}
          section={section}
          followedTitles={followedTitles}
          threadCount={trackedThreads.length}
        />
      ))}

      <footer className="text-xs text-gray-400 pt-4 border-t border-gray-100">
        Generated{' '}
        {new Date(content.generatedAt).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </footer>
    </div>
  );
}
