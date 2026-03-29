'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GenerateButtonProps {
  latestCreatedAt?: string | null;
}

function hoursAgo(isoString: string): number {
  return (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60);
}

export default function GenerateButton({ latestCreatedAt }: GenerateButtonProps) {
  const [status, setStatus] = useState<'idle' | 'warning' | 'generating' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  async function runGenerate() {
    setStatus('generating');
    setErrorMsg('');
    try {
      const res = await fetch('/api/generate', { method: 'POST' });
      const data = await res.json();

      if (res.status === 402 && data.redirect) {
        router.push(data.redirect);
        return;
      }

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error === 'generation_failed'
          ? 'Generation failed. Check that your API key has sufficient credits.'
          : 'Something went wrong. Please try again.');
        return;
      }

      router.refresh();
      setStatus('idle');
    } catch {
      setStatus('error');
      setErrorMsg('Network error — please try again.');
    }
  }

  function handleClick() {
    if (latestCreatedAt && hoursAgo(latestCreatedAt) < 24) {
      setStatus('warning');
    } else {
      runGenerate();
    }
  }

  if (status === 'warning') {
    const h = Math.round(hoursAgo(latestCreatedAt!));
    const label = h < 1 ? 'less than an hour ago' : `${h} hour${h === 1 ? '' : 's'} ago`;
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="text-xs text-amber-600 text-right max-w-xs">
          A digest was generated {label}. Generating again may return different results.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setStatus('idle')}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={runGenerate}
            className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700"
          >
            Generate anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={status === 'generating'}
        className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
      >
        {status === 'generating' ? 'Generating…' : 'Generate digest'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}
