# LexPulse

A personal US legal intelligence digest app. LexPulse uses an AI agent to search the web for the week's most significant legal developments across four topic areas, formats them into a structured digest, and delivers them by email or on-demand. Users bring their own Anthropic API key (BYOK) so the owner pays nothing to run the app.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | Clerk |
| Database | Supabase (Postgres + JSONB) |
| AI | Anthropic Claude Sonnet 4.6 via `@anthropic-ai/sdk` |
| Email | Resend |
| PDF | `@react-pdf/renderer` |
| Hosting | Vercel |
| Styling | Tailwind CSS |

---

## Architecture Overview

The app follows a clear server/client split enforced by Next.js App Router:

- **Server components** handle all data fetching from Supabase. They never expose raw data to the browser.
- **Client components** handle interactive UI (forms, buttons, state). They only receive the minimum data they need as props.
- **API routes** are the boundary for mutations and AI calls. All sensitive operations (key decryption, Claude calls, email sending) happen here.
- **`server-only`** is imported at the top of any library module that must never be bundled client-side. Next.js will throw a build error if these files are accidentally imported by a client component.

### BYOK (Bring Your Own Key) Pattern

Each user stores their own Anthropic API key. The key flow is:

1. User pastes their key in Settings
2. `POST /api/keys` validates the key against the Anthropic API, then AES-256-GCM encrypts it and stores only the ciphertext in Supabase
3. At generation time, the ciphertext is decrypted in server memory, used for the Claude call, then immediately cleared
4. The plaintext key never touches the database, never appears in logs, and never reaches the client

---

## Environment Variables

Defined in `.env.local` (see `.env.local.example` for the full list):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key (safe for browser) |
| `CLERK_SECRET_KEY` | Clerk server-side secret |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — bypasses RLS; server-only |
| `KEY_ENCRYPTION_SECRET` | 64-char hex string used for AES-256-GCM encryption of user API keys |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `RESEND_FROM_EMAIL` | Sender address, e.g. `LexPulse <digest@yourdomain.com>` |
| `CRON_SECRET` | Shared secret that Vercel Cron sends to authenticate `/api/cron` |
| `NEXT_PUBLIC_APP_URL` | Public app URL, used to build follow links in emails |

---

## File-by-File Reference

### Root Config Files

**`next.config.mjs`**
Next.js configuration. Sets `serverExternalPackages: ['@react-pdf/renderer']` to prevent webpack from trying to bundle the PDF library (it must run as native Node.js, not bundled). Also defines global security response headers (X-Frame-Options, etc.).

**`middleware.ts`**
Runs on every request before it reaches a page or API route. Uses Clerk's `clerkMiddleware` to check authentication. All routes require a signed-in user except `/sign-in` and `/api/cron`. Unauthenticated users are redirected to `/sign-in`.

**`vercel.json`**
Configures a Vercel Cron job that hits `/api/cron` every 5 minutes. Vercel calls this endpoint on schedule; the endpoint itself checks which users are actually due for a digest at that moment.

**`tailwind.config.ts`** / **`postcss.config.js`**
Standard Tailwind and PostCSS configuration. No customisation — uses the default Tailwind theme.

**`tsconfig.json`**
TypeScript configuration. Sets `@/` as a path alias for the project root, so `import { Foo } from '@/lib/types'` works from any file.

**`supabase/schema.sql`**
The complete database schema. Run this once against your Supabase project to create all tables. Key tables:
- `user_keys` — encrypted Anthropic API keys, one per user
- `digests` — generated digest content stored as JSONB, indexed by `(clerk_id, created_at DESC)`
- `user_settings` — email delivery preferences, schedule config, preferred news sources
- `tracked_threads` — topics a user is following (up to 10 active per user)
- `thread_updates` — historical record of per-topic updates from each digest run

---

### `lib/` — Server-Side Library Modules

All files in `lib/` are server-only. Most start with `import 'server-only'` to enforce this at build time.

**`lib/types.ts`**
The single source of truth for all TypeScript interfaces used across the app. Key types:
- `DigestItem` — one news item: title, summary, significance, source, url, publishedDate
- `DigestSection` — one topic area containing an array of `DigestItem`
- `DigestContent` — the full digest: sections + optional followed updates + metadata
- `Digest` — a database row: id, clerk_id, content (JSONB), created_at, verification data
- `TrackedThread` — a topic the user is following
- `FollowedTopicUpdate` — an update (or lack of update) on a tracked thread within a digest
- `UserSettings` — schedule, email preferences, timezone, preferred sites
- `DigestSummary` / `SummaryTheme` / `TopicSummary` — types for the multi-digest summary feature

**`lib/crypto.ts`**
Handles AES-256-GCM encryption and decryption of user API keys using Node.js's built-in `crypto` module. The encryption key comes from `KEY_ENCRYPTION_SECRET` in the environment. Stores ciphertext as `iv:authTag:ciphertext` (all hex). The auth tag detects any tampering with the stored value.

**`lib/supabase.ts`**
All Supabase database operations. Uses the service role client (which bypasses Row Level Security) and manually scopes every query by `clerk_id` to ensure users can only access their own data. Exports named functions for each operation: `getDigest`, `getDigests`, `insertDigest`, `getUserKey`, `upsertUserKey`, `getUserSettings`, `upsertUserSettings`, `getTrackedThreads`, `addTrackedThread`, `deactivateTrackedThread`, `getThreadUpdates`, `insertThreadUpdates`, `getUsersScheduledNow`, `updateNextRunAt`.

**`lib/agent.ts`**
The AI digest generation agent. Uses Claude Sonnet 4.6 with two tools:
1. `web_search` (Anthropic's built-in tool) — searches the web for legal developments
2. `create_digest` — a structured output tool that forces Claude to return valid JSON matching the `DigestContent` shape

The agent makes two separate Claude calls per digest run:
- First call: searches and creates the main four-topic digest
- Second call (if user has tracked threads): searches for updates on each followed topic

Using tool calls instead of asking for JSON in the prompt is more reliable — Claude cannot skip required fields or return malformed output.

**`lib/summarize.ts`**
Generates a multi-digest summary using Claude. Unlike `agent.ts`, this makes no web searches — it's pure analysis of digest content already in the database. Formats N digests into structured text and forces a `create_summary` tool call that returns cross-cutting themes and per-topic trend analysis.

**`lib/email.ts`**
Builds and sends HTML emails via Resend. Contains two exported send functions:
- `sendDigestEmail` — sends a full weekly digest as HTML email
- `sendSummaryEmail` — sends a multi-digest summary as HTML email

Both build the HTML inline using template strings with inline CSS (required for email client compatibility — most email clients strip `<style>` blocks).

**`lib/pdf.tsx`**
Generates PDF files using `@react-pdf/renderer`. Uses React components with its own JSX element set (`Document`, `Page`, `View`, `Text`, `Link`) and a `StyleSheet` API similar to React Native. Contains two exported render functions:
- `renderDigestPDF(content)` — renders a full digest as a US Letter PDF with source URLs visible as text (critical for legal professionals who may print)
- `renderSummaryPDF(summary)` — renders a multi-digest summary as a US Letter PDF with themes and per-topic trend callouts

Both return a `Buffer` (Node.js binary) that the API routes stream to the browser as a file download.

**`lib/scheduling.ts`**
Pure date/time logic for computing when the next digest should run. Uses `Intl.DateTimeFormat` to correctly handle all IANA timezones without any external library. Two exported functions:
- `computeNextRunAt` — called when a user saves their schedule settings; finds the next future occurrence of their chosen day/time in their timezone
- `computeNextFromPrevious` — called after a digest is generated; advances by the configured frequency (daily=1d, weekly=7d, biweekly=14d, monthly=28d, bimonthly=56d)

**`lib/timezones.ts`**
A static list of common IANA timezone strings used to populate the timezone selector in Settings.

---

### `app/` — Pages and API Routes

Next.js App Router uses the filesystem as the routing system. Every `page.tsx` is a URL; every `route.ts` inside `api/` is an API endpoint.

#### Pages

**`app/layout.tsx`**
The root layout that wraps every page. Sets up `ClerkProvider` (required for auth to work throughout the app), renders the navigation header with links to Past Digests / Following / Settings and a Clerk `UserButton` (avatar + sign-out), and constrains the main content to `max-w-3xl`.

**`app/page.tsx`** → `/`
The home page. Server component. Fetches the user's most recent digest and their tracked threads, then renders `DigestReader` to display the latest digest. Also renders `GenerateButton` which lets the user trigger a new digest on demand.

**`app/digests/page.tsx`** → `/digests`
Lists all past digests as clickable cards. Also renders `SummaryPanel` at the top, which lets the user select 2–8 past digests and generate a summary. Only passes `{ id, weekOf }` to the client component — the full digest content stays server-side.

**`app/issues/[id]/page.tsx`** → `/issues/:id`
Displays a single digest in full. Fetches the digest and tracked threads server-side, then renders `DigestReader`. Also shows a "Download PDF" link that points to `/api/digest/:id/pdf`.

**`app/settings/page.tsx`** → `/settings`
Settings page. Fetches the user's API key hint and settings server-side, then renders three client-component forms: `ApiKeyForm`, `ScheduleForm`, and `SourcesForm`.

**`app/following/page.tsx`** → `/following`
Shows the list of topics the user is currently tracking, with an `UnfollowButton` for each.

**`app/following/[id]/page.tsx`** → `/following/:id`
Shows the update history for a single tracked topic — all the `thread_updates` records for that thread, in reverse chronological order.

**`app/follow/page.tsx`** → `/follow`
A confirmation page for following a topic. Reached by clicking "Follow topic →" on a digest item (from email or from `CategorySection`). Reads `title`, `url`, and `topic` from URL search params and renders `FollowConfirm`.

**`app/sign-in/[[...sign-in]]/page.tsx`** → `/sign-in`
Renders Clerk's hosted sign-in UI component. The `[[...sign-in]]` catch-all route is required by Clerk to handle its multi-step auth flows.

**`app/access-denied/page.tsx`** → `/access-denied`
A simple error page for unauthorized access attempts.

#### API Routes

**`app/api/generate/route.ts`** → `POST /api/generate`
The main digest generation endpoint. Can be triggered by a logged-in user (via `GenerateButton`) or by the cron job (via `Authorization: Bearer CRON_SECRET` header). Flow: authenticate → fetch & decrypt API key → fetch user settings & tracked threads → call `generateDigest` → save to database → persist thread updates → send email if enabled. `maxDuration = 300` allows up to 5 minutes (requires Vercel Pro) to accommodate the web search + generation time.

**`app/api/cron/route.ts`** → `GET /api/cron`
Called by Vercel Cron every 5 minutes. Authenticates via `CRON_SECRET`. Queries Supabase for all users whose `next_run_at` is at or before now, then generates a digest for each one sequentially, advances their `next_run_at`, and sends their email.

**`app/api/keys/route.ts`** → `POST /api/keys`, `DELETE /api/keys`
Saves or deletes the user's Anthropic API key. On POST: validates the key format, makes a live test call to Anthropic (using the cheap Haiku model with `max_tokens: 1`) to confirm it works, then encrypts and stores it. On DELETE: removes the stored key from Supabase.

**`app/api/keys/test/route.ts`** → `POST /api/keys/test`
Tests whether the currently stored key is still valid, without re-saving it. Used by the Settings page to show a live status indicator.

**`app/api/settings/route.ts`** → `POST /api/settings`
Saves schedule and email settings. After saving, calls `computeNextRunAt` to calculate and store the next `next_run_at` timestamp.

**`app/api/settings/sources/route.ts`** → `POST /api/settings/sources`
Saves the user's list of preferred news sources (domain names). These are passed to the agent as `site:` operators in web searches.

**`app/api/follow/route.ts`** → `POST /api/follow`
Adds a new tracked thread. Validates that the user is under the 10-thread limit before inserting.

**`app/api/follow/[id]/route.ts`** → `DELETE /api/follow/:id`
Deactivates (soft-deletes) a tracked thread by setting `active = false`.

**`app/api/digest/[id]/pdf/route.ts`** → `GET /api/digest/:id/pdf`
Fetches a specific digest from Supabase (scoped to the requesting user), renders it as a PDF via `renderDigestPDF`, and returns it as a file download with a filename based on the digest's week period.

**`app/api/summary/generate/route.ts`** → `POST /api/summary/generate`
Takes `{ digestIds: string[] }` (2–8 IDs), fetches those digests from Supabase (all owner-scoped), calls `generateSummary` with the user's decrypted API key, and returns `{ summary: DigestSummary }`. The summary is not stored in the database — it's ephemeral.

**`app/api/summary/pdf/route.ts`** → `POST /api/summary/pdf`
Takes `{ summary: DigestSummary }` in the request body, renders it as a PDF via `renderSummaryPDF`, and returns it as a file download.

**`app/api/summary/email/route.ts`** → `POST /api/summary/email`
Takes `{ summary: DigestSummary }` in the request body, resolves the user's email recipients from their settings (using the same fallback chain as the digest email), and sends the summary via Resend.

---

### `components/` — UI Components

**`DigestReader.tsx`** *(server component)*
The main digest display component. Renders the digest header, the `FollowedUpdatesSection` (if the user tracks any topics), and one `CategorySection` per topic area. Builds a `Map` of tracked thread titles for O(1) lookup by `CategorySection`.

**`CategorySection.tsx`** *(server component)*
Renders one topic area section of a digest. For each item, shows the title (linked to source), summary, "Why it matters" significance text, and metadata (source name, date, "Follow topic" link). Also renders a `FollowButton` on each item.

**`FollowedUpdatesSection.tsx`** *(server component)*
Renders the "Following" section at the top of a digest. Separates updates that have new developments from those that don't. Items with updates show full detail; items without show a one-line "No new developments" message.

**`IssueCard.tsx`** *(server component)*
A clickable card representing one past digest in the `/digests` list. Shows the week period, creation date, and an optional verification score badge.

**`GenerateButton.tsx`** *(client component)*
The "Generate digest" button on the home page. Calls `POST /api/generate`, shows a loading spinner, and redirects to the new digest on success. Shows a cooldown indicator if a digest was generated recently.

**`ApiKeyForm.tsx`** *(client component)*
The Anthropic API key input form in Settings. Lets the user paste a key, validates it live via `POST /api/keys`, and shows the last-4-digits hint once saved.

**`ScheduleForm.tsx`** *(client component)*
The email delivery schedule form in Settings. Controls email enabled/disabled, recipient addresses, digest frequency, delivery day/time, and timezone. Saves via `POST /api/settings`.

**`SourcesForm.tsx`** *(client component)*
The preferred news sources form in Settings. Lets users add/remove domain names (e.g. `reuters.com`) that will be prioritised in digest searches. Saves via `POST /api/settings/sources`.

**`FollowButton.tsx`** *(client component)*
The inline "Follow" / "Following" toggle on each digest item. Shown in `CategorySection`. Links to `/follow?title=...` to initiate the follow confirmation flow.

**`FollowConfirm.tsx`** *(client component)*
The confirmation UI on the `/follow` page. Shows the topic title and a confirm button that calls `POST /api/follow` to save the tracked thread.

**`UnfollowButton.tsx`** *(client component)*
The "Unfollow" button on the `/following` page. Calls `DELETE /api/follow/:id` and removes the item from the list optimistically.

**`SummaryPanel.tsx`** *(client component)*
The multi-digest summary panel on the `/digests` page. Lets the user pick how many past digests to summarise (2–8, capped at what they have), calls `POST /api/summary/generate`, and displays the result inline with themes and per-topic analysis. Provides "Download PDF" (calls `POST /api/summary/pdf`, triggers browser download) and "Send to my email" (calls `POST /api/summary/email`) action buttons.

---

## Key Data Flows

### Generating a Digest (Manual)

```
User clicks "Generate digest"
  → GenerateButton: POST /api/generate
    → app/api/generate/route.ts
      → lib/supabase.ts: getUserKey()         fetch encrypted key
      → lib/crypto.ts: decryptKey()           decrypt in memory
      → lib/supabase.ts: getUserSettings()    fetch preferred sites
      → lib/supabase.ts: getTrackedThreads()  fetch followed topics
      → lib/agent.ts: generateDigest()        two Claude calls (web search + structure)
      → lib/supabase.ts: insertDigest()       persist DigestContent as JSONB
      → lib/supabase.ts: insertThreadUpdates() persist per-topic updates
      → lib/email.ts: sendDigestEmail()       send via Resend (if enabled)
  → Browser redirects to /issues/:newId
```

### Generating a Digest (Scheduled)

```
Vercel Cron: GET /api/cron (every 5 min)
  → app/api/cron/route.ts
    → lib/supabase.ts: getUsersScheduledNow()  find users due right now
    → for each user: same flow as manual generation above
    → lib/scheduling.ts: computeNextFromPrevious()  advance their next_run_at
```

### Viewing a Digest as PDF

```
User clicks "Download PDF" on /issues/:id
  → Browser: GET /api/digest/:id/pdf
    → app/api/digest/[id]/pdf/route.ts
      → lib/supabase.ts: getDigest()     fetch DigestContent (owner-scoped)
      → lib/pdf.tsx: renderDigestPDF()   render React PDF components to Buffer
  → Browser downloads LexPulse-Week-of-....pdf
```

### Generating a Multi-Digest Summary

```
User selects count and clicks "Generate summary" on /digests
  → SummaryPanel: POST /api/summary/generate { digestIds: [...] }
    → app/api/summary/generate/route.ts
      → lib/supabase.ts: getDigest() × N     fetch each digest (owner-scoped)
      → lib/crypto.ts: decryptKey()          decrypt API key
      → lib/summarize.ts: generateSummary()  one Claude call, no web search
  → SummaryPanel renders summary inline
  → User clicks "Download PDF"
      → POST /api/summary/pdf { summary }
        → lib/pdf.tsx: renderSummaryPDF()
      → Browser downloads LexPulse-Summary-....pdf
  → User clicks "Send to my email"
      → POST /api/summary/email { summary }
        → lib/supabase.ts: getUserSettings()  resolve recipients
        → lib/email.ts: sendSummaryEmail()    send via Resend
```

---

## Security Notes

- The Supabase **service role key** bypasses Row Level Security. Every query in `lib/supabase.ts` manually filters by `clerk_id` to enforce ownership. Never expose this key client-side.
- User API keys are encrypted with **AES-256-GCM** before storage. The GCM auth tag detects tampering. The plaintext key exists only in server memory during request lifetime.
- The `server-only` package causes a **build-time error** if any `lib/` module is accidentally imported by a client component.
- The cron endpoint authenticates via a **shared secret** (`CRON_SECRET`) sent as a Bearer token. This secret is never exposed to users.
- API key validation errors from Anthropic are **never forwarded** to the client — only a sanitised error code is returned.
