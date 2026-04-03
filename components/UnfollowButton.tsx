'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UnfollowButton({ threadId }: { threadId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const router = useRouter();

  async function handleUnfollow() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/follow/${threadId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  return (
    <button
      onClick={handleUnfollow}
      disabled={status === 'loading'}
      className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-50 shrink-0"
    >
      {status === 'loading' ? '…' : status === 'error' ? 'Error' : 'Unfollow'}
    </button>
  );
}
