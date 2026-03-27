import type { DigestContent } from '@/lib/types';
import CategorySection from './CategorySection';

interface DigestReaderProps {
  content: DigestContent;
}

export default function DigestReader({ content }: DigestReaderProps) {
  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-base font-semibold">LexPulse — Legal Intelligence Digest</h1>
        <p className="text-xs text-gray-500">{content.weekOf}</p>
      </header>
      {content.sections.map((section) => (
        <CategorySection key={section.topic} section={section} />
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
