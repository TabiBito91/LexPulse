'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FollowConfirmProps {
  title: string;
  sourceUrl?: string;
  topicArea?: string;
}

export default function FollowConfirm({ title, sourceUrl, topicArea }: FollowConfirmProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'limit' | 'error'>('idle');
  const router = useRouter();

  async function handleFollow() {
    setStatus('loading');
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sourceUrl, topicArea, searchQuery: title }),
      });
      if (res.status === 422) { setStatus('limit'); return; }
      if (!res.ok) throw new Error();
      setStatus('done');
      setTimeout(() => router.push('/following'), 1000);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-gray-200 rounded p-4 space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {topicArea && <p className="text-xs text-gray-400">{topicArea}</p>}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:underline hover:text-gray-600"
          >
            View original source
          </a>
        )}
      </div>

      {status === 'limit' && (
        <p className="text-xs text-red-500">
          You have reached the 10-topic limit. Unfollow a topic on the{' '}
          <a href="/following" className="underline">Following</a> page first.
        </p>
      )}
      {status === 'done' && (
        <p className="text-xs text-green-600">Following! Redirecting to your followed topics…</p>
      )}
      {status === 'error' && (
        <p className="text-xs text-red-500">Something went wrong — please try again.</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleFollow}
          disabled={status === 'loading' || status === 'done'}
          className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {status === 'loading' ? 'Following…' : status === 'done' ? 'Followed!' : 'Follow this topic'}
        </button>
        <a
          href="/"
          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </a>
      </div>
    </div>
  );
}
