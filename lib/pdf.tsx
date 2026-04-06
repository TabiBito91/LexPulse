// SECURITY: server-only — must never be bundled client-side.
import 'server-only';

import PDFDocument from 'pdfkit';
import type { DigestContent, DigestSummary } from './types';

// ── Constants ─────────────────────────────────────────────────────────────────

const W = 612;          // US Letter width  (pts)
const H = 792;          // US Letter height (pts)
const M = 48;           // Page margin
const CW = W - M * 2;  // Content width
const BOT = 64;         // Bottom margin (leaves room for footer)

const C = {
  black:  '#111827',
  dark:   '#374151',
  mid:    '#6B7280',
  light:  '#9CA3AF',
  border: '#E5E7EB',
  divider:'#D1D5DB',
  blue:   '#2563EB',
  blueBorder: '#BFDBFE',
};

// ── Core helpers ──────────────────────────────────────────────────────────────

function createDoc(): PDFKit.PDFDocument {
  return new PDFDocument({
    size: 'LETTER',
    bufferPages: true,   // keep all pages in memory so we can add footers at the end
    margins: { top: M, bottom: BOT, left: M, right: M },
  });
}

function docToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

/** Horizontal rule at current Y, then move down. */
function rule(doc: PDFKit.PDFDocument, color = C.border): void {
  doc
    .moveTo(M, doc.y)
    .lineTo(W - M, doc.y)
    .strokeColor(color)
    .lineWidth(0.5)
    .stroke()
    .moveDown(0.7);
}

/** Uppercase section heading followed by a rule. */
function sectionHeading(
  doc: PDFKit.PDFDocument,
  label: string,
  textColor = C.mid,
  lineColor = C.border,
): void {
  doc
    .fontSize(7.5)
    .font('Helvetica-Bold')
    .fillColor(textColor)
    .text(label.toUpperCase(), M, doc.y, { width: CW, characterSpacing: 1.2 })
    .moveDown(0.15);
  rule(doc, lineColor);
}

/**
 * Source / Date / URL block — prominent for legal professionals.
 * Shown below every digest item so sources are visible when printed.
 */
function sourceBlock(
  doc: PDFKit.PDFDocument,
  source?: string,
  date?: string,
  url?: string,
): void {
  if (!source && !date && !url) return;
  doc.moveDown(0.3);

  if (source) {
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold').fillColor(C.mid).text('Source  ', { continued: true })
      .font('Helvetica').fillColor(C.dark).text(source, { width: CW });
  }
  if (date) {
    doc
      .fontSize(7.5)
      .font('Helvetica-Bold').fillColor(C.mid).text('Date    ', { continued: true })
      .font('Helvetica').fillColor(C.dark).text(date, { width: CW });
  }
  if (url) {
    doc
      .fontSize(7)
      .font('Helvetica-Bold').fillColor(C.mid).text('URL     ', { continued: true })
      .font('Helvetica').fillColor(C.blue).text(url, { link: url, underline: true, width: CW });
  }
}

/** One digest item: title, summary, significance, source block. */
function drawItem(
  doc: PDFKit.PDFDocument,
  title: string,
  summary: string,
  significance: string,
  source?: string,
  date?: string,
  url?: string,
): void {
  // Title — bold; hyperlinked when URL present
  doc.fontSize(10.5).font('Helvetica-Bold').fillColor(C.black);
  if (url) {
    doc.text(title, M, doc.y, { width: CW, link: url });
  } else {
    doc.text(title, M, doc.y, { width: CW });
  }
  doc.moveDown(0.25);

  // Summary
  doc
    .fontSize(9).font('Helvetica').fillColor(C.dark)
    .text(summary, M, doc.y, { width: CW, lineGap: 1.5 })
    .moveDown(0.25);

  // Significance — bold label inline with normal text
  doc
    .fontSize(8.5)
    .font('Helvetica-Bold').fillColor(C.dark).text('Why it matters: ', { continued: true })
    .font('Helvetica').fillColor(C.mid).text(significance, { width: CW, lineGap: 1.5 });

  // Source / Date / URL
  sourceBlock(doc, source, date, url);
  doc.moveDown(0.9);
}

/**
 * Add footers to every buffered page.
 * Must be called after all content is written, before doc.end().
 */
function addFooters(
  doc: PDFKit.PDFDocument,
  leftText: string,
  rightText: string,
): void {
  const { count } = doc.bufferedPageRange();
  for (let i = 0; i < count; i++) {
    doc.switchToPage(i);
    const y = H - BOT + 16;

    // Rule
    doc
      .moveTo(M, y - 8).lineTo(W - M, y - 8)
      .strokeColor(C.border).lineWidth(0.5).stroke();

    // Three text segments on the same Y — explicit y coordinate on each call
    doc.fontSize(7).font('Helvetica').fillColor(C.light)
      .text(leftText,           M, y, { width: CW, align: 'left',   lineBreak: false })
      .text(`${i + 1} / ${count}`, M, y, { width: CW, align: 'center', lineBreak: false })
      .text(rightText,          M, y, { width: CW, align: 'right',  lineBreak: false });
  }
}

// ── Digest PDF ────────────────────────────────────────────────────────────────

export async function renderDigestPDF(content: DigestContent): Promise<Buffer> {
  const doc = createDoc();

  const generatedAt = new Date(content.generatedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // ── Header
  doc
    .fontSize(7).font('Helvetica').fillColor(C.light)
    .text('LEXPULSE', M, M, { characterSpacing: 2 })
    .moveDown(0.4);
  doc.fontSize(17).font('Helvetica-Bold').fillColor(C.black)
    .text('Legal Intelligence Digest').moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor(C.mid)
    .text(content.weekOf).moveDown(0.8);
  rule(doc, C.divider);

  // ── Following section (if any)
  if (content.followedUpdates?.length) {
    sectionHeading(doc, 'Following', '#1D4ED8', C.blueBorder);

    for (const u of content.followedUpdates) {
      if (!u.hasUpdate) {
        doc
          .fontSize(8).font('Helvetica-Oblique').fillColor(C.light)
          .text(`No new developments: ${u.originalTitle}`, M, doc.y, { width: CW })
          .moveDown(0.3);
        continue;
      }
      doc
        .fontSize(7.5).font('Helvetica-Bold').fillColor(C.blue)
        .text(`Update on: ${u.originalTitle}`, M, doc.y, { width: CW })
        .moveDown(0.2);
      drawItem(
        doc,
        u.updateTitle ?? '',
        u.summary ?? '',
        u.significance ?? '',
        u.source,
        u.publishedDate,
        u.url,
      );
    }
  }

  // ── Topic sections
  for (const section of content.sections) {
    sectionHeading(doc, section.topic);
    for (const entry of section.items) {
      drawItem(doc, entry.title, entry.summary, entry.significance, entry.source, entry.publishedDate, entry.url);
    }
  }

  addFooters(doc, `Generated ${generatedAt}`, 'LexPulse — Legal Intelligence');
  return docToBuffer(doc);
}

// ── Summary PDF ───────────────────────────────────────────────────────────────

export async function renderSummaryPDF(summary: DigestSummary): Promise<Buffer> {
  const doc = createDoc();

  const generatedAt = new Date(summary.generatedAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // ── Header
  doc
    .fontSize(7).font('Helvetica').fillColor(C.light)
    .text('LEXPULSE', M, M, { characterSpacing: 2 })
    .moveDown(0.4);
  doc.fontSize(17).font('Helvetica-Bold').fillColor(C.black)
    .text('Legal Intelligence Summary').moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor(C.mid)
    .text(summary.period).moveDown(0.2);
  doc.fontSize(9).fillColor(C.light)
    .text(`Based on ${summary.digestCount} digest${summary.digestCount !== 1 ? 's' : ''}`)
    .moveDown(0.8);
  rule(doc, C.divider);

  // ── Cross-cutting themes
  sectionHeading(doc, 'Cross-Cutting Themes');
  for (const theme of summary.themes) {
    doc
      .fontSize(10).font('Helvetica-Bold').fillColor(C.black)
      .text(theme.title, M, doc.y, { width: CW })
      .moveDown(0.2);
    doc
      .fontSize(9).font('Helvetica').fillColor(C.dark)
      .text(theme.description, M, doc.y, { width: CW, lineGap: 1.5 })
      .moveDown(0.8);
  }

  // ── By topic area
  sectionHeading(doc, 'By Topic Area');
  for (const t of summary.byTopic) {
    // Topic heading + rule
    doc
      .fontSize(8.5).font('Helvetica-Bold').fillColor(C.black)
      .text(t.topic.toUpperCase(), M, doc.y, { width: CW, characterSpacing: 0.5 })
      .moveDown(0.15);
    rule(doc, C.border);

    // Overview
    doc
      .fontSize(9).font('Helvetica').fillColor(C.dark)
      .text(t.overview, M, doc.y, { width: CW, lineGap: 1.5 })
      .moveDown(0.4);

    // Key developments
    doc
      .fontSize(7.5).font('Helvetica-Bold').fillColor(C.mid)
      .text('KEY DEVELOPMENTS', M, doc.y, { characterSpacing: 0.8 })
      .moveDown(0.3);

    for (const dev of t.keyDevelopments) {
      doc
        .fontSize(9).font('Helvetica').fillColor(C.dark)
        .text(`•  ${dev}`, M + 6, doc.y, { width: CW - 6, lineGap: 1.5 })
        .moveDown(0.2);
    }

    // Trend — italic, inline bold label
    doc.moveDown(0.3);
    doc
      .fontSize(8.5)
      .font('Helvetica-Bold').fillColor(C.mid).text('Trend  ', { continued: true })
      .font('Helvetica-Oblique').fillColor(C.dark).text(t.trend, { width: CW, lineGap: 1.5 });
    doc.moveDown(1);
  }

  addFooters(doc, `Generated ${generatedAt}`, 'LexPulse — Legal Intelligence');
  return docToBuffer(doc);
}
