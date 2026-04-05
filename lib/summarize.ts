// SECURITY: server-only — uses plaintext API keys in memory; must never be bundled client-side.
import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import type { Digest, DigestSummary, TopicArea } from './types';
import { TOPIC_AREAS } from './types';

// ── Tool schema ────────────────────────────────────────────────────────────

const CREATE_SUMMARY_TOOL = {
  name: 'create_summary',
  description: 'Submit the completed multi-week legal intelligence summary.',
  input_schema: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        description: 'Human-readable date range, e.g. "March 3 – April 5, 2026"',
      },
      themes: {
        type: 'array',
        description: '2–4 significant cross-cutting themes that emerged across all digests',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short theme name, e.g. "AI Liability Acceleration"' },
            description: { type: 'string', description: '2–3 sentences explaining the theme and why it matters' },
          },
          required: ['title', 'description'],
        },
        minItems: 2,
        maxItems: 4,
      },
      byTopic: {
        type: 'array',
        description: 'Per-topic summary — one entry for each of the four topic areas',
        items: {
          type: 'object',
          properties: {
            topic: { type: 'string', enum: TOPIC_AREAS },
            overview: {
              type: 'string',
              description: '2–3 sentences summarising the most important developments across the period',
            },
            keyDevelopments: {
              type: 'array',
              description: '3–5 concrete developments (each a single sentence)',
              items: { type: 'string' },
              minItems: 3,
              maxItems: 5,
            },
            trend: {
              type: 'string',
              description: '1–2 sentences on the direction of travel and what practitioners should watch',
            },
          },
          required: ['topic', 'overview', 'keyDevelopments', 'trend'],
        },
        minItems: 4,
        maxItems: 4,
      },
    },
    required: ['period', 'themes', 'byTopic'],
  },
};

// ── Input formatting ────────────────────────────────────────────────────────

function formatDigests(digests: Digest[]): string {
  return digests
    .map((d, i) => {
      const sections = d.content.sections
        .map((s) => {
          const items = s.items
            .map(
              (item) =>
                `  • ${item.title} (${item.source}, ${item.publishedDate})\n` +
                `    ${item.summary} ${item.significance}`,
            )
            .join('\n');
          return `[${s.topic}]\n${items}`;
        })
        .join('\n\n');
      return `DIGEST ${i + 1} — ${d.content.weekOf}\n${'─'.repeat(48)}\n${sections}`;
    })
    .join('\n\n\n');
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function generateSummary(
  apiKey: string,
  digests: Digest[],
): Promise<DigestSummary> {
  // SECURITY: apiKey is a plaintext key — never log it, never include in errors
  const client = new Anthropic({ apiKey });
  const count = digests.length;
  const digestText = formatDigests(digests);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: `You are a senior US legal intelligence analyst preparing an executive briefing for law firm partners. You have been given ${count} weekly legal digests and must synthesize them into a coherent multi-week summary. Focus on trends, recurring themes, and the most consequential developments. Be analytical, precise, and concrete — partners value insight over recitation.`,
    tools: [CREATE_SUMMARY_TOOL as any],
    tool_choice: { type: 'tool', name: 'create_summary' },
    messages: [
      {
        role: 'user',
        content: `Analyze the following ${count} weekly legal intelligence digests and produce an executive summary report.\n\n${digestText}`,
      },
    ],
  });

  const toolBlock = response.content.find(
    (b) => b.type === 'tool_use' && b.name === 'create_summary',
  );
  if (!toolBlock || toolBlock.type !== 'tool_use') {
    throw new Error('Agent did not call create_summary tool');
  }

  const input = toolBlock.input as {
    period: string;
    themes: Array<{ title: string; description: string }>;
    byTopic: Array<{
      topic: string;
      overview: string;
      keyDevelopments: string[];
      trend: string;
    }>;
  };

  return {
    period: input.period,
    digestCount: count,
    themes: input.themes,
    byTopic: input.byTopic.map((t) => ({
      topic: t.topic as TopicArea,
      overview: t.overview,
      keyDevelopments: t.keyDevelopments,
      trend: t.trend,
    })),
    generatedAt: new Date().toISOString(),
  };
}
