'use client';

import { useState } from 'react';

interface SourcesFormProps {
  initial: string[];
}

function normaliseDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

export default function SourcesForm({ initial }: SourcesFormProps) {
  const [sites, setSites] = useState<string[]>(initial);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [inputError, setInputError] = useState('');

  function addSite() {
    const domain = normaliseDomain(input);
    if (!domain) return;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
      setInputError('Enter a valid domain, e.g. reuters.com');
      return;
    }
    if (sites.includes(domain)) {
      setInputError('Already added.');
      return;
    }
    setSites((prev) => [...prev, domain]);
    setInput('');
    setInputError('');
  }

  function removeSite(domain: string) {
    setSites((prev) => prev.filter((s) => s !== domain));
  }

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch('/api/settings/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredSites: sites }),
      });
      setStatus(res.ok ? 'saved' : 'error');
      if (res.ok) setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Preferred sources</h2>
        <p className="text-xs text-gray-500 mt-1">
          The agent will prioritise these domains when searching. Leave empty to search broadly.
        </p>
      </div>

      {/* Tag list */}
      {sites.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sites.map((site) => (
            <span
              key={site}
              className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs font-mono"
            >
              {site}
              <button
                onClick={() => removeSite(site)}
                className="text-gray-400 hover:text-gray-700 leading-none"
                aria-label={`Remove ${site}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setInputError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSite(); } }}
          placeholder="e.g. reuters.com"
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
        />
        <button
          onClick={addSite}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
        >
          Add
        </button>
      </div>
      {inputError && <p className="text-xs text-red-500">{inputError}</p>}

      <button
        onClick={handleSave}
        disabled={status === 'saving'}
        className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved!' : 'Save sources'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-500">Failed to save — please try again.</p>
      )}
    </div>
  );
}
