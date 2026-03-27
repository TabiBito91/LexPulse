'use client';

import { useState } from 'react';

interface ApiKeyFormProps {
  existingHint?: string | null;
}

type TestStatus = 'idle' | 'testing' | 'valid' | 'invalid';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ApiKeyForm({ existingHint }: ApiKeyFormProps) {
  const [key, setKey] = useState('');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hint, setHint] = useState(existingHint ?? null);
  const [showInput, setShowInput] = useState(!existingHint);

  async function handleTest() {
    setTestStatus('testing');
    setTestError('');
    try {
      const res = await fetch('/api/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.valid) {
        setTestStatus('valid');
      } else {
        setTestStatus('invalid');
        setTestError(data.error ?? 'Key validation failed');
      }
    } catch {
      setTestStatus('invalid');
      setTestError('Network error — please try again');
    }
  }

  async function handleSave() {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus('saved');
        setHint(data.hint);
        setKey('');
        setShowInput(false);
        setTestStatus('idle');
        // Redirect to home after short confirmation
        setTimeout(() => (window.location.href = '/'), 2000);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }

  async function handleDelete() {
    if (!confirm('Remove your stored API key? You will need to add a new key to generate digests.')) return;
    try {
      await fetch('/api/keys', { method: 'DELETE' });
      setHint(null);
      setShowInput(true);
      setTestStatus('idle');
      setSaveStatus('idle');
      setKey('');
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Anthropic API key</h2>
        <p className="text-xs text-gray-500 mt-1">
          Your key is encrypted before storage and used only to generate your digest.
          It is never logged or shared.{' '}
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Get your key at console.anthropic.com
          </a>
        </p>
      </div>

      {hint && !showInput ? (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Key ending in …{hint}</span>
          <button
            onClick={() => setShowInput(true)}
            className="text-blue-600 hover:underline"
          >
            Update key
          </button>
          <button
            onClick={handleDelete}
            className="text-red-500 hover:underline"
          >
            Remove key
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            type="password"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setTestStatus('idle');
              setSaveStatus('idle');
            }}
            placeholder="sk-ant-…"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleTest}
              disabled={!key || testStatus === 'testing'}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              {testStatus === 'testing' ? 'Testing…' : 'Test key'}
            </button>

            <button
              onClick={handleSave}
              disabled={testStatus !== 'valid' || saveStatus === 'saving'}
              className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-40"
            >
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save key'}
            </button>

            {hint && (
              <button
                onClick={() => setShowInput(false)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            )}
          </div>

          {testStatus === 'valid' && (
            <p className="text-xs text-green-600">Key is valid — you can save it.</p>
          )}
          {testStatus === 'invalid' && (
            <p className="text-xs text-red-500">{testError || 'Key is invalid.'}</p>
          )}
          {saveStatus === 'error' && (
            <p className="text-xs text-red-500">Failed to save key — please try again.</p>
          )}
        </div>
      )}
    </div>
  );
}
