import { auth } from '@clerk/nextjs/server';
import { renderSummaryPDF } from '@/lib/pdf';
import type { DigestSummary } from '@/lib/types';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  let summary: DigestSummary;
  try {
    const body = await req.json();
    summary = body.summary;
    if (!summary?.period || !Array.isArray(summary.themes) || !Array.isArray(summary.byTopic)) {
      return new Response('Invalid summary payload', { status: 400 });
    }
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const pdfBuffer = await renderSummaryPDF(summary);
  const pdfBytes = new Uint8Array(pdfBuffer);

  const safePeriod = summary.period.replace(/[–—\s,]+/g, '-').replace(/-+/g, '-');
  const filename = `LexPulse-Summary-${safePeriod}.pdf`;

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
