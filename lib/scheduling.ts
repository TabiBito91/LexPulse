import 'server-only';
import type { DigestFrequency } from './types';

const pad2 = (n: number) => String(n).padStart(2, '0');
const pad4 = (n: number) => String(n).padStart(4, '0');

const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

interface LocalParts {
  year: number;
  month: number;  // 1–12
  day: number;    // 1–31
  hour: number;   // 0–23
  minute: number;
  weekday: number; // 0=Sun … 6=Sat
}

function getLocalParts(date: Date, timezone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
  return {
    year: parseInt(get('year')),
    month: parseInt(get('month')),
    day: parseInt(get('day')),
    hour: parseInt(get('hour')) % 24, // Intl can return "24" at midnight
    minute: parseInt(get('minute')),
    weekday: WEEKDAY_SHORT[get('weekday')] ?? 0,
  };
}

// Convert a wall-clock local time in `tz` to a UTC Date.
// Uses the "naive UTC offset" trick: treat the local time as UTC, then
// measure the offset Intl reports and subtract it.
function localToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const isoStr = `${pad4(year)}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00`;
  const naive = new Date(isoStr + 'Z');

  const epochMs = (date: Date, timezone: string): number => {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
    }).formatToParts(date);
    const get = (type: string) => parseInt(p.find(x => x.type === type)?.value ?? '0');
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), 0);
  };

  // diff = how far the tz local time is behind UTC (positive = tz is behind)
  const diff = epochMs(naive, 'UTC') - epochMs(naive, tz);
  return new Date(naive.getTime() + diff);
}

// Find the next UTC moment when (targetDay, targetHour, targetMinute) occurs
// in the given timezone, strictly after `after`.
function nextOccurrence(
  targetDay: number,
  targetHour: number,
  targetMinute: number,
  timezone: string,
  after: Date,
): Date {
  for (let daysAhead = 0; daysAhead <= 13; daysAhead++) {
    const candidate = new Date(after.getTime() + daysAhead * 86_400_000);
    const parts = getLocalParts(candidate, timezone);
    if (parts.weekday !== targetDay) continue;
    const runAt = localToUTC(parts.year, parts.month, parts.day, targetHour, targetMinute, timezone);
    if (runAt.getTime() > after.getTime()) return runAt;
  }
  // Fallback: 7 days from now (shouldn't be reached)
  return new Date(after.getTime() + 7 * 86_400_000);
}

const FREQUENCY_DAYS: Record<DigestFrequency, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 14,
  monthly: 28,
  bimonthly: 56,
};

/**
 * Compute the first next_run_at when the user saves their schedule settings.
 * Finds the next future occurrence of (day, hour, minute) in the user's timezone.
 */
export function computeNextRunAt(
  day: number,
  hour: number,
  minute: number,
  timezone: string,
  frequency: DigestFrequency,
  after: Date = new Date(),
): Date {
  if (frequency === 'daily') {
    // For daily, find the next occurrence of hour:minute on any day.
    for (let daysAhead = 0; daysAhead <= 1; daysAhead++) {
      const candidate = new Date(after.getTime() + daysAhead * 86_400_000);
      const parts = getLocalParts(candidate, timezone);
      const runAt = localToUTC(parts.year, parts.month, parts.day, hour, minute, timezone);
      if (runAt.getTime() > after.getTime()) return runAt;
    }
    // Fallback: tomorrow at the given time
    const tomorrow = new Date(after.getTime() + 86_400_000);
    const parts = getLocalParts(tomorrow, timezone);
    return localToUTC(parts.year, parts.month, parts.day, hour, minute, timezone);
  }
  return nextOccurrence(day, hour, minute, timezone, after);
}

/**
 * Compute the next next_run_at after a digest has been generated.
 * Advances by fixed day multiples: weekly=7d, biweekly=14d, monthly=28d, bimonthly=56d.
 */
export function computeNextFromPrevious(
  prevRunAt: Date,
  frequency: DigestFrequency,
): Date {
  return new Date(prevRunAt.getTime() + FREQUENCY_DAYS[frequency] * 86_400_000);
}
