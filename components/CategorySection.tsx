import type { DigestSection } from '@/lib/types';
import FollowButton from './FollowButton';

interface CategorySectionProps {
  section: DigestSection;
  followedTitles: Map<string, string>; // title (lowercase) → threadId
  threadCount: number;
}

export default function CategorySection({ section, followedTitles, threadCount }: CategorySectionProps) {
  return (
    <section className="space-y-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1">
        {section.topic}
      </h2>
      <div className="space-y-6">
        {section.items.map((item, i) => {
          const threadId = followedTitles.get(item.title.toLowerCase()) ?? null;
          return (
            <article key={i} className="space-y-1">
              <h3 className="text-sm font-semibold leading-snug">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">{item.summary}</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                <span className="font-medium text-gray-600">Why it matters: </span>
                {item.significance}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-gray-600"
                  >
                    {item.source}
                  </a>
                ) : (
                  <span>{item.source}</span>
                )}
                {item.publishedDate && (
                  <>
                    <span>·</span>
                    <span>{item.publishedDate}</span>
                  </>
                )}
                <span>·</span>
                <FollowButton
                  title={item.title}
                  sourceUrl={item.url}
                  topicArea={section.topic}
                  threadId={threadId}
                  threadCount={threadCount}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
