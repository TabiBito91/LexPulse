import type { DigestSection } from '@/lib/types';

interface CategorySectionProps {
  section: DigestSection;
}

export default function CategorySection({ section }: CategorySectionProps) {
  return (
    <section className="space-y-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1">
        {section.topic}
      </h2>
      <div className="space-y-6">
        {section.items.map((item, i) => (
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
            <p className="text-xs text-gray-400">{item.source}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
