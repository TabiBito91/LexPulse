'use client';

import { useState } from 'react';
import { COMMON_TIMEZONES } from '@/lib/timezones';
import type { DigestFrequency } from '@/lib/types';

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const period = i < 12 ? 'AM' : 'PM';
  const hour = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${hour}:00 ${period}` };
});

const MINUTES = Array.from({ length: 12 }, (_, i) => {
  const m = i * 5;
  return { value: m, label: `:${String(m).padStart(2, '0')}` };
});

const FREQUENCIES: { value: DigestFrequency; label: string }[] = [
  { value: 'daily',     label: 'Every day' },
  { value: 'weekly',    label: 'Every week' },
  { value: 'biweekly',  label: 'Every 2 weeks' },
  { value: 'monthly',   label: 'Every 4 weeks' },
  { value: 'bimonthly', label: 'Every 8 weeks' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function buildTimezoneOptions(current: string) {
  const exists = COMMON_TIMEZONES.some(tz => tz.value === current);
  if (exists) return COMMON_TIMEZONES;
  return [{ value: current, label: current }, ...COMMON_TIMEZONES];
}

interface ScheduleFormProps {
  initial: {
    emailEnabled: boolean;
    notifyEmails: string[];
    digestDay: number;
    digestHour: number;
    digestMinute: number;
    timezone: string;
    digestFrequency: DigestFrequency;
  };
}

export default function ScheduleForm({ initial }: ScheduleFormProps) {
  const [emailEnabled, setEmailEnabled]       = useState(initial.emailEnabled);
  const [notifyEmails, setNotifyEmails]       = useState<string[]>(initial.notifyEmails);
  const [emailInput, setEmailInput]           = useState('');
  const [emailInputError, setEmailInputError] = useState('');
  const [digestDay, setDigestDay]             = useState(initial.digestDay);
  const [digestHour, setDigestHour]           = useState(initial.digestHour);
  const [digestMinute, setDigestMinute]       = useState(initial.digestMinute);
  const [timezone, setTimezone]               = useState(() => initial.timezone || detectTimezone());
  const [digestFrequency, setDigestFrequency] = useState<DigestFrequency>(initial.digestFrequency);
  const [status, setStatus]                   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const timezoneOptions = buildTimezoneOptions(timezone);

  function addEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    if (!EMAIL_REGEX.test(email)) {
      setEmailInputError('Enter a valid email address.');
      return;
    }
    if (notifyEmails.includes(email)) {
      setEmailInputError('Already added.');
      return;
    }
    setNotifyEmails(prev => [...prev, email]);
    setEmailInput('');
    setEmailInputError('');
  }

  function removeEmail(email: string) {
    setNotifyEmails(prev => prev.filter(e => e !== email));
  }

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled,
          notifyEmails,
          digestDay,
          digestHour,
          digestMinute,
          timezone,
          digestFrequency,
        }),
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
        Email me the digest when it&apos;s generated
      </label>

      {emailEnabled && (
        <div className="space-y-3 pl-5">

          {/* Multi-email recipients */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">
              Recipients (leave empty to use your account email)
            </label>

            {notifyEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {notifyEmails.map(email => (
                  <span
                    key={email}
                    className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs font-mono"
                  >
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="text-gray-400 hover:text-gray-700 leading-none"
                      aria-label={`Remove ${email}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setEmailInputError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                placeholder="you@example.com"
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addEmail}
                className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50"
              >
                Add
              </button>
            </div>
            {emailInputError && <p className="text-xs text-red-500">{emailInputError}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timezoneOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-500">Frequency</label>
            <select
              value={digestFrequency}
              onChange={(e) => setDigestFrequency(e.target.value as DigestFrequency)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FREQUENCIES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            {digestFrequency !== 'daily' && (
              <div className="space-y-1 flex-1">
                <label className="text-xs text-gray-500">Day</label>
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
            )}

            <div className="space-y-1">
              <label className="text-xs text-gray-500">Hour</label>
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

          <p className="text-xs text-gray-400">
            All times are in your selected timezone.{' '}
            {digestFrequency === 'daily'
              ? 'The first digest will be sent at the next matching time today or tomorrow.'
              : `The first digest will be sent on the next matching ${DAYS[digestDay]}.`}
          </p>
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
