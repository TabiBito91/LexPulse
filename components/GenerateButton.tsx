'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GenerateButton() {
  const [status, setStatus] = useState<'idle' | 'generating' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  async function handleGenerate() {
    setStatus('generating');
    setErrorMsg('');
    try {
      const res = await fetch('/api/generate', { method: 'POST' });
      const data = await res.json();

      if (res.status === 402 && data.redirect) {
        // No API key stored — send to settings
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

      // Success — refresh the page to show the new digest
      router.refresh();
      setStatus('idle');
    } catch {
      setStatus('error');
      setErrorMsg('Network error — please try again.');
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleGenerate}
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
