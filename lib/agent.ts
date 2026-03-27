// SECURITY: server-only — uses plaintext API keys in memory; must never be bundled client-side.
import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import type { DigestContent, DigestSection, TopicArea } from './types';
import { TOPIC_AREAS } from './types';

const SYSTEM_PROMPT = `You are a US legal intelligence analyst. Your job is to find and summarize the most significant legal developments from the past 7 days.

For each topic area provided, identify 3–5 high-signal items. Each item must include:
- title: a concise headline
- summary: 2–3 sentences describing what happened
- significance: 1–2 sentences on why this matters to US legal practitioners
- source: the publication, court, or agency name
- url: the direct URL to the source (required)

Focus on: court decisions, regulatory actions, agency guidance, notable legislation, and enforcement trends.
Exclude: opinion pieces, listicles, and items older than 7 days.

Respond ONLY with valid JSON matching this schema exactly:
{
  "sections": [
    {
      "topic": "<topic area string>",
      "items": [
        {
          "title": "string",
          "summary": "string",
          "significance": "string",
          "source": "string",
          "url": "string"
        }
      ]
    }
  ]
}`;

function buildUserPrompt(weekOf: string): string {
  const topicList = TOPIC_AREAS.map((t) => `- ${t}`).join('\n');
  return `Today is ${new Date().toDateString()}. Generate a digest for the week of ${weekOf}.

Cover these four topic areas:
${topicList}

Search for the most recent and significant developments in each area from the past 7 days.`;
}

function getWeekOf(): string {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return monday.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function generateDigest(apiKey: string): Promise<DigestContent> {
  // SECURITY: apiKey is a plaintext key — never log it, never include it in error messages
  const client = new Anthropic({ apiKey });
  const weekOf = getWeekOf();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }] as any,
    tool_choice: { type: 'auto' },
    messages: [{ role: 'user', content: buildUserPrompt(weekOf) }],
  });

  // Extract the final text response (after tool use rounds)
  const textBlock = response.content.findLast((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Agent returned no text content');
  }

  // Parse and validate the JSON structure
  let parsed: { sections: Array<{ topic: string; items: unknown[] }> };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error('Agent returned invalid JSON');
  }

  if (!Array.isArray(parsed.sections)) {
    throw new Error('Agent response missing sections array');
  }

  // Map and validate each section
  const sections: DigestSection[] = parsed.sections
    .filter((s) => TOPIC_AREAS.includes(s.topic as TopicArea))
    .map((s) => ({
      topic: s.topic as TopicArea,
      items: (s.items as Array<Record<string, string>>).map((item) => ({
        title: item.title ?? '',
        summary: item.summary ?? '',
        significance: item.significance ?? '',
        source: item.source ?? '',
        url: item.url,
      })),
    }));

  return {
    sections,
    generatedAt: new Date().toISOString(),
    weekOf: `Week of ${weekOf}`,
  };
}
