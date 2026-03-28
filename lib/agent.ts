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
- url: the direct URL to the original article or document (required — do not omit)
- publishedDate: the date the article or decision was published, formatted as "Month D, YYYY" (e.g. "March 27, 2026")

Focus on: court decisions, regulatory actions, agency guidance, notable legislation, and enforcement trends.
Exclude: opinion pieces, listicles, and items older than 7 days.

Use the web_search tool to find recent developments, then call create_digest with your findings.`;

function buildUserPrompt(weekOf: string): string {
  const topicList = TOPIC_AREAS.map((t) => `- ${t}`).join('\n');
  return `Today is ${new Date().toDateString()}. Generate a digest for the week of ${weekOf}.

Cover these four topic areas:
${topicList}

Search for the most recent and significant developments in each area from the past 7 days.
Ensure every item has a direct URL to the source and the date it was published.`;
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

// Tool schema for structured digest output — forces Claude to return valid structured data
// instead of free-form text, eliminating JSON parsing fragility.
const CREATE_DIGEST_TOOL = {
  name: 'create_digest',
  description: 'Submit the completed legal digest with all topic sections.',
  input_schema: {
    type: 'object',
    properties: {
      sections: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string', enum: TOPIC_AREAS },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  summary: { type: 'string' },
                  significance: { type: 'string' },
                  source: { type: 'string' },
                  url: { type: 'string', description: 'Direct URL to the original article or document' },
                  publishedDate: { type: 'string', description: 'Publication date, e.g. "March 27, 2026"' },
                },
                required: ['title', 'summary', 'significance', 'source', 'url', 'publishedDate'],
              },
              minItems: 3,
              maxItems: 5,
            },
          },
          required: ['topic', 'items'],
        },
        minItems: 4,
        maxItems: 4,
      },
    },
    required: ['sections'],
  },
};

export async function generateDigest(apiKey: string): Promise<DigestContent> {
  // SECURITY: apiKey is a plaintext key — never log it, never include it in error messages
  const client = new Anthropic({ apiKey });
  const weekOf = getWeekOf();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [
      { type: 'web_search_20250305', name: 'web_search', max_uses: 12 } as any,
      CREATE_DIGEST_TOOL as any,
    ],
    tool_choice: { type: 'auto' },
    messages: [{ role: 'user', content: buildUserPrompt(weekOf) }],
  });

  console.log('[agent] stop_reason:', response.stop_reason);
  console.log('[agent] content block types:', response.content.map((b) => b.type));

  // Extract the create_digest tool call from the response
  const toolUseBlock = response.content.find(
    (b) => b.type === 'tool_use' && b.name === 'create_digest',
  );

  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('Agent did not call create_digest tool');
  }

  const input = toolUseBlock.input as {
    sections: Array<{ topic: string; items: Array<Record<string, string>> }>;
  };

  if (!Array.isArray(input.sections)) {
    throw new Error('Agent create_digest input missing sections array');
  }

  const sections: DigestSection[] = input.sections
    .filter((s) => TOPIC_AREAS.includes(s.topic as TopicArea))
    .map((s) => ({
      topic: s.topic as TopicArea,
      items: s.items.map((item) => ({
        title: item.title ?? '',
        summary: item.summary ?? '',
        significance: item.significance ?? '',
        source: item.source ?? '',
        url: item.url ?? '',
        publishedDate: item.publishedDate ?? '',
      })),
    }));

  return {
    sections,
    generatedAt: new Date().toISOString(),
    weekOf: `Week of ${weekOf}`,
  };
}
