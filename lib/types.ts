export type DigestFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'bimonthly';

export type TopicArea =
  | 'US Employment Law'
  | 'US AI Law'
  | 'US Data Privacy Law'
  | 'US Securities Law';

export const TOPIC_AREAS: TopicArea[] = [
  'US Employment Law',
  'US AI Law',
  'US Data Privacy Law',
  'US Securities Law',
];

export interface DigestItem {
  title: string;
  summary: string;        // 2–3 sentence summary
  significance: string;   // Why this matters to practitioners
  source: string;         // Publication or court name
  url: string;            // Direct link to original source (required)
  publishedDate: string;  // e.g. "March 27, 2026"
}

export interface DigestSection {
  topic: TopicArea;
  items: DigestItem[];
}

export interface FollowedTopicUpdate {
  threadId: string;
  originalTitle: string;
  hasUpdate: boolean;
  updateTitle?: string;
  summary?: string;
  significance?: string;
  source?: string;
  url?: string;
  publishedDate?: string;
}

export interface DigestContent {
  sections: DigestSection[];
  followedUpdates?: FollowedTopicUpdate[]; // updates on tracked threads
  generatedAt: string; // ISO timestamp
  weekOf: string;      // "Week of March 24, 2026"
}

export interface TrackedThread {
  id: string;
  clerk_id: string;
  title: string;
  source_url: string | null;
  topic_area: string | null;
  search_query: string;
  created_at: string;
  active: boolean;
}

export interface Digest {
  id: string;
  clerk_id: string;
  content: DigestContent;
  key_hint_used: string;
  verification_score?: number | null;
  verification_issues?: unknown | null;
  created_at: string;
}

export interface UserKey {
  id: string;
  clerk_id: string;
  encrypted_key: string;
  key_hint: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  clerk_id: string;
  email_enabled: boolean;
  notify_email: string | null;        // legacy single email — superseded by notify_emails
  notify_emails: string[];            // recipients; falls back to Clerk account email if empty
  digest_day: number;                 // 0=Sunday … 6=Saturday (in user's timezone)
  digest_hour: number;                // 0–23 (in user's timezone)
  digest_minute: number;              // 0, 5, 10 … 55
  timezone: string;                   // IANA timezone e.g. "America/New_York"
  digest_frequency: DigestFrequency;  // how often to send
  next_run_at: string | null;         // UTC ISO timestamp of next scheduled run
  preferred_sites: string[];          // domains to prioritise in searches e.g. ["reuters.com"]
  created_at: string;
  updated_at: string;
}
