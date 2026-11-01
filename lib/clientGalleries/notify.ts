import { SITE_URL } from '../siteUrl';
import { escapeHtml as esc, mailConfigured, sendMail } from '../mail';
import { formatTimecode } from './types';

/** E-mails de notification des galeries clients (envoyés via Brevo, voir lib/mail.ts). */

export { mailConfigured };

function send(subject: string, html: string, replyTo?: string | null): Promise<boolean> {
  return sendMail({ subject, html, replyTo: replyTo ? { email: replyTo } : null });
}

export async function notifyReviewSubmitted(p: {
  galleryId: string;
  galleryTitle: string;
  photoId: string;
  videoName: string;
  reviewer: { name: string | null; email: string | null };
  message: string | null;
  comments: { body: string; timecode: number | null; created_at: string }[];
}): Promise<boolean> {
  const who = p.reviewer.name || p.reviewer.email || 'Un client';
  const link = `${SITE_URL}/admin/galeries/${p.galleryId}?tab=reviews&video=${p.photoId}`;
  const list = p.comments
    .slice(0, 40)
    .map(
      (c) =>
        `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;font:600 13px/1.4 ui-monospace,Consolas,monospace;color:#2f6b45;white-space:nowrap">${
          c.timecode != null ? esc(formatTimecode(c.timecode)) : 'Général'
        }</td><td style="padding:8px 0;font:14px/1.5 Arial,sans-serif;color:#1e2b28">${esc(c.body).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');
  const more = p.comments.length > 40 ? `<p style="font:13px Arial,sans-serif;color:#7b8783">… et ${p.comments.length - 40} autres.</p>` : '';
  const html = `
  <div style="background:#f2f0eb;padding:28px 12px">
    <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:16px;padding:28px 30px;border-top:4px solid #213431">
      <p style="margin:0 0 6px;font:600 11px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7b8783">Review terminée</p>
      <h1 style="margin:0 0 4px;font:600 21px/1.3 Arial,sans-serif;color:#1e2b28">${esc(who)} a terminé sa review</h1>
      <p style="margin:0 0 18px;font:14px/1.5 Arial,sans-serif;color:#4a5a56">${esc(p.galleryTitle)} · ${esc(p.videoName)}${
        p.reviewer.email && p.reviewer.name ? ` · ${esc(p.reviewer.email)}` : ''
      }</p>
      ${
        p.message
          ? `<div style="background:#f7f6f2;border-radius:10px;padding:12px 14px;margin:0 0 18px;font:14px/1.5 Arial,sans-serif;color:#1e2b28">« ${esc(p.message).replace(/\n/g, '<br>')} »</div>`
          : ''
      }
      <p style="margin:0 0 6px;font:600 14px Arial,sans-serif;color:#1e2b28">${p.comments.length} commentaire${p.comments.length > 1 ? 's' : ''}</p>
      <table style="border-collapse:collapse;width:100%">${list}</table>${more}
      <p style="margin:24px 0 0"><a href="${link}" style="display:inline-block;background:#213431;color:#fff;text-decoration:none;font:600 14px Arial,sans-serif;padding:12px 20px;border-radius:999px">Ouvrir la review</a></p>
    </div>
  </div>`;
  return send(`Review terminée — ${p.galleryTitle} · ${p.videoName}`, html, p.reviewer.email);
}
