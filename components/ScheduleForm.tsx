'use client';

import { useState } from 'react';

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const period = i < 12 ? 'AM' : 'PM';
  const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${hour} ${period} UTC` };
});

const MINUTES = Array.from({ length: 12 }, (_, i) => {
  const m = i * 5;
  return { value: m, label: `:${String(m).padStart(2, '0')}` };
});

interface ScheduleFormProps {
  initial: {
    emailEnabled: boolean;
    notifyEmail: string;
    digestDay: number;
    digestHour: number;
    digestMinute: number;
  };
}

export default function ScheduleForm({ initial }: ScheduleFormProps) {
  const [emailEnabled, setEmailEnabled] = useState(initial.emailEnabled);
  const [notifyEmail, setNotifyEmail] = useState(initial.notifyEmail);
  const [digestDay, setDigestDay] = useState(initial.digestDay);
  const [digestHour, setDigestHour] = useState(initial.digestHour);
  const [digestMinute, setDigestMinute] = useState(initial.digestMinute);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailEnabled, notifyEmail: notifyEmail || null, digestDay, digestHour, digestMinute }),
      });
      setStatus(res.ok ? 'saved' : 'error');
      if (res.ok) setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Digest schedule & email</h2>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={emailEnabled}
          onChange={(e) => setEmailEnabled(e.target.checked)}
          className="rounded"
        />
        Email me the digest when it's generated
      </label>

      {emailEnabled && (
        <div className="space-y-3 pl-5">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Send to (leave blank to use your account email)</label>
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="space-y-1 flex-1">
              <label className="text-xs text-gray-500">Day (UTC)</label>
              <select
                value={digestDay}
                onChange={(e) => setDigestDay(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAYS.map((day, i) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Hour (UTC)</label>
              <select
                value={digestHour}
                onChange={(e) => setDigestHour(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {HOURS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Minute</label>
              <select
                value={digestMinute}
                onChange={(e) => setDigestMinute(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MINUTES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={status === 'saving'}
        className="text-sm px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved!' : 'Save schedule'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-500">Failed to save — please try again.</p>
      )}
    </div>
  );
}
