// Curated IANA timezone list for the schedule form.
// US timezones first (primary audience), then common international zones.

export interface TimezoneOption {
  value: string;
  label: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  // United States
  { value: 'America/New_York',    label: 'Eastern Time — New York (ET)' },
  { value: 'America/Chicago',     label: 'Central Time — Chicago (CT)' },
  { value: 'America/Denver',      label: 'Mountain Time — Denver (MT)' },
  { value: 'America/Phoenix',     label: 'Mountain Time — Phoenix (no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time — Los Angeles (PT)' },
  { value: 'America/Anchorage',   label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii Time (HT)' },
  // International
  { value: 'America/Toronto',     label: 'Eastern Time — Toronto' },
  { value: 'America/Vancouver',   label: 'Pacific Time — Vancouver' },
  { value: 'Europe/London',       label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',        label: 'Central Europe — Paris (CET)' },
  { value: 'Europe/Berlin',       label: 'Central Europe — Berlin (CET)' },
  { value: 'Asia/Dubai',          label: 'Gulf Standard Time — Dubai (GST)' },
  { value: 'Asia/Kolkata',        label: 'India Standard Time (IST)' },
  { value: 'Asia/Singapore',      label: 'Singapore Time (SGT)' },
  { value: 'Asia/Tokyo',          label: 'Japan Standard Time (JST)' },
  { value: 'Asia/Shanghai',       label: 'China Standard Time (CST)' },
  { value: 'Australia/Sydney',    label: 'Australian Eastern — Sydney (AEST)' },
  { value: 'UTC',                 label: 'UTC' },
];
