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

export interface DigestContent {
  sections: DigestSection[];
  generatedAt: string; // ISO timestamp
  weekOf: string;      // "Week of March 24, 2026"
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
  notify_email: string | null;   // null = use Clerk account email
  digest_day: number;            // 0=Sunday … 6=Saturday (UTC)
  digest_hour: number;           // 0–23 UTC
  digest_minute: number;         // 0, 5, 10 … 55
  created_at: string;
  updated_at: string;
}
