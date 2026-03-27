import type { Digest } from '@/lib/types';

interface IssueCardProps {
  digest: Digest;
}

export default function IssueCard({ digest }: IssueCardProps) {
  const date = new Date(digest.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <a
      href={`/issues/${digest.id}`}
      className="block border border-gray-200 rounded p-4 hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">
            {digest.content?.weekOf ?? 'Weekly Digest'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{date}</p>
        </div>
        {digest.verification_score != null && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              digest.verification_score >= 60
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {digest.verification_score < 60 ? '⚠ ' : ''}
            {digest.verification_score}/100
          </span>
        )}
      </div>
    </a>
  );
}
