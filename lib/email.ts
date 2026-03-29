// SECURITY: server-only — contains API key access; must never be bundled client-side.
import 'server-only';

import { Resend } from 'resend';
import type { DigestContent } from './types';

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'LexPulse <onboarding@resend.dev>';
}

function buildEmailHtml(content: DigestContent): string {
  const sectionsHtml = content.sections
    .map((section) => {
      const itemsHtml = section.items
        .map((item) => {
          const titleHtml = item.url
            ? `<a href="${item.url}" style="color:#111827;text-decoration:none;font-weight:600;">${item.title}</a>`
            : `<strong>${item.title}</strong>`;
          const metaHtml = [
            item.url
              ? `<a href="${item.url}" style="color:#6b7280;text-decoration:none;">${item.source}</a>`
              : item.source,
            item.publishedDate,
          ]
            .filter(Boolean)
            .join(' &middot; ');
          return `
            <div style="margin-bottom:20px;">
              <p style="margin:0 0 6px;font-size:14px;line-height:1.4;">${titleHtml}</p>
              <p style="margin:0 0 6px;font-size:13px;color:#374151;line-height:1.6;">${item.summary}</p>
              <p style="margin:0 0 6px;font-size:12px;color:#6b7280;line-height:1.5;">
                <strong style="color:#4b5563;">Why it matters:</strong> ${item.significance}
              </p>
              <p style="margin:0;font-size:11px;color:#9ca3af;">${metaHtml}</p>
            </div>`;
        })
        .join('');

      return `
        <div style="margin-bottom:32px;">
          <h2 style="margin:0 0 12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">
            ${section.topic}
          </h2>
          ${itemsHtml}
        </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
    <div style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
      <p style="margin:0;font-size:13px;font-weight:600;">LexPulse</p>
      <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${content.weekOf}</p>
    </div>
    <div style="padding:24px 32px;">
      ${sectionsHtml}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        Generated ${new Date(content.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} UTC
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendDigestEmail(
  toEmails: string | string[],
  content: DigestContent,
): Promise<void> {
  const recipients = Array.isArray(toEmails) ? toEmails : [toEmails];
  if (recipients.length === 0) throw new Error('No recipients provided');
  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: recipients,
    subject: `LexPulse — ${content.weekOf}`,
    html: buildEmailHtml(content),
  });
  if (error) {
    console.error('[email] send error:', error.name, error.message);
    throw new Error('Failed to send digest email');
  }
}
