'use client';

import { useState } from 'react';
import type { DigestSummary } from '@/lib/types';

interface DigestOption {
  id: string;
  weekOf: string;
}

interface SummaryPanelProps {
  digestOptions: DigestOption[]; // ordered newest → oldest
}

const COUNT_OPTIONS = [2, 3, 4, 6, 8];

export default function SummaryPanel({ digestOptions }: SummaryPanelProps) {
  const available = digestOptions.length;

  // Default to last 4, capped at available
  const [count, setCount] = useState(() => Math.min(4, available));
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DigestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [pdfLoading, setPdfLoading] = useState(false);

  if (available < 2) return null;

  const selectedIds = digestOptions.slice(0, count).map((d) => d.id);
  const oldestLabel = digestOptions[count - 1]?.weekOf ?? '';
  const newestLabel = digestOptions[0]?.weekOf ?? '';

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSummary(null);
    setEmailState('idle');

    try {
      const res = await fetch('/api/summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digestIds: selectedIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'no_key') {
          setError('No API key found. Please add your Anthropic key in Settings.');
        } else {
          setError('Failed to generate summary. Please try again.');
        }
        return;
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!summary) return;
    setPdfLoading(true);
    try {
      const res = await fetch('/api/summary/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safePeriod = summary.period.replace(/[–—\s,]+/g, '-').replace(/-+/g, '-');
      a.href = url;
      a.download = `LexPulse-Summary-${safePeriod}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — rare
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleSendEmail() {
    if (!summary) return;
    setEmailState('sending');
    try {
      const res = await fetch('/api/summary/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'no_recipients') {
          setError('No email address found. Please set one in Settings.');
        }
        setEmailState('error');
        return;
      }
      setEmailState('sent');
    } catch {
      setEmailState('error');
    }
  }

  return (
    <div className="border border-gray-200 rounded p-4 space-y-4">
      {/* Form row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-gray-500">Summarize last</span>
        <select
          value={count}
          onChange={(e) => {
            setCount(Number(e.target.value));
            setSummary(null);
            setError(null);
            setEmailState('idle');
          }}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:border-gray-400"
          disabled={loading}
        >
          {COUNT_OPTIONS.filter((n) => n <= available).map((n) => (
            <option key={n} value={n}>
              {n} digest{n !== 1 ? 's' : ''}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          {oldestLabel === newestLabel
            ? oldestLabel
            : `${oldestLabel} → ${newestLabel}`}
        </span>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="text-xs border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
        >
          {loading ? 'Generating…' : 'Generate summary'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Summary result */}
      {summary && (
        <div className="space-y-5 pt-2 border-t border-gray-100">
          {/* Header */}
          <div>
            <p className="text-xs font-semibold text-gray-700">
              {summary.period}
            </p>
            <p className="text-xs text-gray-400">
              Based on {summary.digestCount} digest{summary.digestCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Themes */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">
              Cross-Cutting Themes
            </h3>
            {summary.themes.map((theme, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-gray-800">{theme.title}</p>
                <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{theme.description}</p>
              </div>
            ))}
          </div>

          {/* By topic */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-1">
              By Topic Area
            </h3>
            {summary.byTopic.map((t) => (
              <div key={t.topic} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t.topic}
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">{t.overview}</p>
                <ul className="space-y-0.5 pl-3">
                  {t.keyDevelopments.map((dev, i) => (
                    <li key={i} className="text-xs text-gray-600 leading-relaxed list-disc list-outside">
                      {dev}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 leading-relaxed border-l-2 border-gray-200 pl-2 mt-1 italic">
                  <span className="font-medium not-italic text-gray-600">Trend: </span>
                  {t.trend}
                </p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="text-xs border border-gray-200 hover:border-gray-300 rounded px-2.5 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
            >
              {pdfLoading ? 'Generating…' : '↓ Download PDF'}
            </button>
            <button
              onClick={handleSendEmail}
              disabled={emailState === 'sending' || emailState === 'sent'}
              className="text-xs border border-gray-200 hover:border-gray-300 rounded px-2.5 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
            >
              {emailState === 'sending'
                ? 'Sending…'
                : emailState === 'sent'
                ? '✓ Sent'
                : emailState === 'error'
                ? 'Retry email'
                : '✉ Send to my email'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
