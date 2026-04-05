import { auth } from '@clerk/nextjs/server';
import { getDigest } from '@/lib/supabase';
import { renderDigestPDF } from '@/lib/pdf';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;
  const digest = await getDigest(id, userId);
  if (!digest) {
    return new Response('Not found', { status: 404 });
  }

  const pdfBuffer = await renderDigestPDF(digest.content);
  const pdfBytes = new Uint8Array(pdfBuffer);

  // Sanitise weekOf for use in a filename: "Week of March 24, 2026" → "Week-of-March-24-2026"
  const safeName = digest.content.weekOf.replace(/[,\s]+/g, '-').replace(/-+/g, '-');
  const filename = `LexPulse-${safeName}.pdf`;

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
