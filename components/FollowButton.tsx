'use client';

import { useState } from 'react';

interface FollowButtonProps {
  title: string;
  sourceUrl: string;
  topicArea: string;
  threadId: string | null;   // non-null means already following
  threadCount: number;       // current number of followed topics
}

const MAX = 10;

export default function FollowButton({ title, sourceUrl, topicArea, threadId: initialThreadId, threadCount }: FollowButtonProps) {
  const [threadId, setThreadId]   = useState<string | null>(initialThreadId);
  const [count, setCount]         = useState(threadCount);
  const [status, setStatus]       = useState<'idle' | 'loading' | 'error'>('idle');

  const following = threadId !== null;
  const atLimit   = !following && count >= MAX;

  async function toggle() {
    setStatus('loading');
    try {
      if (following) {
        const res = await fetch(`/api/follow/${threadId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        setThreadId(null);
        setCount(c => c - 1);
      } else {
        const res = await fetch('/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            sourceUrl,
            topicArea,
            searchQuery: title,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setThreadId(data.thread.id);
        setCount(c => c + 1);
      }
      setStatus('idle');
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  if (atLimit) {
    return (
      <span className="text-xs text-gray-300 cursor-default" title={`Limit of ${MAX} followed topics reached`}>
        Follow limit reached
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={status === 'loading'}
      className={`text-xs transition-colors disabled:opacity-50 ${
        following
          ? 'text-blue-600 hover:text-red-500'
          : 'text-gray-400 hover:text-blue-600'
      }`}
      title={following ? 'Unfollow this topic' : 'Follow this topic for updates in future digests'}
    >
      {status === 'loading' ? '…' : status === 'error' ? 'Error' : following ? 'Following ✓' : 'Follow'}
    </button>
  );
}
