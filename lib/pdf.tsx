import 'server-only';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { DigestContent, DigestItem, DigestSection, DigestSummary, FollowedTopicUpdate } from './types';

// ── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 48,
    paddingBottom: 64, // leave room for footer
    paddingHorizontal: 48,
    color: '#111827',
  },

  // Header
  headerBrand: {
    fontSize: 7,
    color: '#9CA3AF',
    letterSpacing: 2,
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  headerWeek: {
    fontSize: 9,
    color: '#6B7280',
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    marginTop: 14,
    marginBottom: 18,
  },

  // Section
  section: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
    marginBottom: 10,
  },
  sectionHeadingFollowing: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1D4ED8',
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    paddingBottom: 4,
    marginBottom: 10,
  },

  // Item
  item: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  itemUpdateLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#2563EB',
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    lineHeight: 1.4,
    marginBottom: 4,
    textDecoration: 'none',
  },
  itemTitleLink: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    lineHeight: 1.4,
    marginBottom: 4,
    textDecoration: 'none',
  },
  itemSummary: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.55,
    marginBottom: 5,
  },

  // Significance
  significanceRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  significanceLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
  },
  significanceText: {
    fontSize: 8.5,
    color: '#6B7280',
    lineHeight: 1.5,
    flex: 1,
  },

  // Source block — prominent for legal use
  sourceBlock: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 2,
    borderLeftColor: '#D1D5DB',
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  sourceRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  sourceLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    width: 36,
  },
  sourceValue: {
    fontSize: 7.5,
    color: '#374151',
    flex: 1,
  },
  sourceDate: {
    fontSize: 7.5,
    color: '#374151',
    flex: 1,
  },
  sourceUrlRow: {
    flexDirection: 'row',
    marginTop: 1,
  },
  sourceUrlLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    width: 36,
  },
  sourceUrl: {
    fontSize: 7,
    color: '#2563EB',
    flex: 1,
    textDecoration: 'underline',
  },

  // No-update items
  noUpdateText: {
    fontSize: 8,
    color: '#9CA3AF',
    fontFamily: 'Helvetica-Oblique',
    marginBottom: 3,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLeft: {
    fontSize: 7,
    color: '#9CA3AF',
  },
  footerRight: {
    fontSize: 7,
    color: '#9CA3AF',
  },
  pageNumber: {
    fontSize: 7,
    color: '#9CA3AF',
  },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceBlock({ source, date, url }: { source?: string; date?: string; url?: string }) {
  if (!source && !date && !url) return null;
  return (
    <View style={S.sourceBlock}>
      {source && (
        <View style={S.sourceRow}>
          <Text style={S.sourceLabel}>Source</Text>
          <Text style={S.sourceValue}>{source}</Text>
        </View>
      )}
      {date && (
        <View style={S.sourceRow}>
          <Text style={S.sourceLabel}>Date</Text>
          <Text style={S.sourceDate}>{date}</Text>
        </View>
      )}
      {url && (
        <View style={S.sourceUrlRow}>
          <Text style={S.sourceUrlLabel}>URL</Text>
          <Link src={url} style={S.sourceUrl}>
            {url}
          </Link>
        </View>
      )}
    </View>
  );
}

function DigestItemView({ item, isLast }: { item: DigestItem; isLast: boolean }) {
  return (
    <View style={isLast ? S.itemLast : S.item} wrap={false}>
      {/* Title */}
      {item.url ? (
        <Link src={item.url} style={S.itemTitleLink}>
          {item.title}
        </Link>
      ) : (
        <Text style={S.itemTitle}>{item.title}</Text>
      )}

      {/* Summary */}
      <Text style={S.itemSummary}>{item.summary}</Text>

      {/* Significance */}
      <View style={S.significanceRow}>
        <Text style={S.significanceLabel}>Why it matters: </Text>
        <Text style={S.significanceText}>{item.significance}</Text>
      </View>

      {/* Source block — full URL visible for print */}
      <SourceBlock source={item.source} date={item.publishedDate} url={item.url} />
    </View>
  );
}

function CategorySectionView({ section }: { section: DigestSection }) {
  return (
    <View style={S.section} wrap={false}>
      <Text style={S.sectionHeading}>{section.topic.toUpperCase()}</Text>
      {section.items.map((item, i) => (
        <DigestItemView key={i} item={item} isLast={i === section.items.length - 1} />
      ))}
    </View>
  );
}

function FollowedUpdateView({ update, isLast }: { update: FollowedTopicUpdate; isLast: boolean }) {
  if (!update.hasUpdate) {
    return (
      <Text style={S.noUpdateText}>
        No new developments: {update.originalTitle}
      </Text>
    );
  }
  return (
    <View style={isLast ? S.itemLast : S.item} wrap={false}>
      <Text style={S.itemUpdateLabel}>Update on: {update.originalTitle}</Text>

      {update.url ? (
        <Link src={update.url} style={S.itemTitleLink}>
          {update.updateTitle}
        </Link>
      ) : (
        <Text style={S.itemTitle}>{update.updateTitle}</Text>
      )}

      {update.summary && <Text style={S.itemSummary}>{update.summary}</Text>}

      {update.significance && (
        <View style={S.significanceRow}>
          <Text style={S.significanceLabel}>Why it matters: </Text>
          <Text style={S.significanceText}>{update.significance}</Text>
        </View>
      )}

      <SourceBlock source={update.source} date={update.publishedDate} url={update.url} />
    </View>
  );
}

// ── Document ──────────────────────────────────────────────────────────────────

function DigestPDF({ content }: { content: DigestContent }) {
  const generatedAt = new Date(content.generatedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const hasFollowedUpdates =
    content.followedUpdates && content.followedUpdates.length > 0;

  return (
    <Document
      title={`LexPulse — ${content.weekOf}`}
      author="LexPulse"
      subject="Legal Intelligence Digest"
    >
      <Page size="LETTER" style={S.page}>
        {/* Header */}
        <View style={{ marginBottom: 0 }}>
          <Text style={S.headerBrand}>LEXPULSE</Text>
          <Text style={S.headerTitle}>Legal Intelligence Digest</Text>
          <Text style={S.headerWeek}>{content.weekOf}</Text>
          <View style={S.headerDivider} />
        </View>

        {/* Following section */}
        {hasFollowedUpdates && (
          <View style={S.section}>
            <Text style={S.sectionHeadingFollowing}>FOLLOWING</Text>
            {content.followedUpdates!.map((update, i) => (
              <FollowedUpdateView
                key={update.threadId}
                update={update}
                isLast={i === content.followedUpdates!.length - 1}
              />
            ))}
          </View>
        )}

        {/* Topic sections */}
        {content.sections.map((section) => (
          <CategorySectionView key={section.topic} section={section} />
        ))}

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerLeft}>Generated {generatedAt}</Text>
          <Text
            style={S.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
          <Text style={S.footerRight}>LexPulse — Legal Intelligence</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Summary PDF ───────────────────────────────────────────────────────────────

const SS = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 48,
    color: '#111827',
  },
  headerBrand: {
    fontSize: 7,
    color: '#9CA3AF',
    letterSpacing: 2,
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 9,
    color: '#6B7280',
    marginBottom: 2,
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    marginTop: 14,
    marginBottom: 18,
  },
  // Themes section
  sectionHeading: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 4,
    marginBottom: 10,
  },
  themeBlock: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  themeBlockLast: {
    marginBottom: 18,
  },
  themeTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginBottom: 3,
  },
  themeDesc: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.55,
  },
  // Topic section
  topicBlock: {
    marginBottom: 18,
  },
  topicHeading: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 3,
    marginBottom: 7,
  },
  topicOverview: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.55,
    marginBottom: 7,
  },
  devLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  devRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  devBullet: {
    fontSize: 9,
    color: '#4B5563',
    width: 12,
  },
  devText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
    flex: 1,
  },
  trendRow: {
    flexDirection: 'row',
    marginTop: 6,
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 2,
    borderLeftColor: '#D1D5DB',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  trendLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6B7280',
    width: 38,
  },
  trendText: {
    fontSize: 8.5,
    color: '#374151',
    lineHeight: 1.5,
    flex: 1,
    fontFamily: 'Helvetica-Oblique',
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#9CA3AF',
  },
  pageNumber: {
    fontSize: 7,
    color: '#9CA3AF',
  },
});

function SummaryPDF({ summary }: { summary: DigestSummary }) {
  const generatedAt = new Date(summary.generatedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <Document
      title={`LexPulse Summary — ${summary.period}`}
      author="LexPulse"
      subject="Legal Intelligence Summary"
    >
      <Page size="LETTER" style={SS.page}>
        {/* Header */}
        <Text style={SS.headerBrand}>LEXPULSE</Text>
        <Text style={SS.headerTitle}>Legal Intelligence Summary</Text>
        <Text style={SS.headerSub}>{summary.period}</Text>
        <Text style={SS.headerSub}>
          Based on {summary.digestCount} digest{summary.digestCount !== 1 ? 's' : ''}
        </Text>
        <View style={SS.headerDivider} />

        {/* Cross-cutting themes */}
        <Text style={SS.sectionHeading}>CROSS-CUTTING THEMES</Text>
        {summary.themes.map((theme, i) => (
          <View
            key={i}
            style={i === summary.themes.length - 1 ? SS.themeBlockLast : SS.themeBlock}
            wrap={false}
          >
            <Text style={SS.themeTitle}>{theme.title}</Text>
            <Text style={SS.themeDesc}>{theme.description}</Text>
          </View>
        ))}

        {/* Per-topic summaries */}
        <Text style={SS.sectionHeading}>BY TOPIC AREA</Text>
        {summary.byTopic.map((t) => (
          <View key={t.topic} style={SS.topicBlock} wrap={false}>
            <Text style={SS.topicHeading}>{t.topic.toUpperCase()}</Text>
            <Text style={SS.topicOverview}>{t.overview}</Text>

            <Text style={SS.devLabel}>KEY DEVELOPMENTS</Text>
            {t.keyDevelopments.map((dev, i) => (
              <View key={i} style={SS.devRow}>
                <Text style={SS.devBullet}>•</Text>
                <Text style={SS.devText}>{dev}</Text>
              </View>
            ))}

            <View style={SS.trendRow}>
              <Text style={SS.trendLabel}>Trend</Text>
              <Text style={SS.trendText}>{t.trend}</Text>
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={SS.footer} fixed>
          <Text style={SS.footerText}>Generated {generatedAt}</Text>
          <Text
            style={SS.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
          <Text style={SS.footerText}>LexPulse — Legal Intelligence</Text>
        </View>
      </Page>
    </Document>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function renderDigestPDF(content: DigestContent): Promise<Buffer> {
  return renderToBuffer(<DigestPDF content={content} />);
}

export async function renderSummaryPDF(summary: DigestSummary): Promise<Buffer> {
  return renderToBuffer(<SummaryPDF summary={summary} />);
}
