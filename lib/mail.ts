/**
 * Envoi d'e-mails transactionnels via Brevo (API HTTP v3 — aucune dépendance).
 *
 * Variables d'environnement :
 *   BREVO_API_KEY  clé API Brevo (Paramètres → SMTP et API → Clés API)
 *   MAIL_FROM      expéditeur validé dans Brevo, ex. « Maxcellens <site@maxcellens.com> »
 *   NOTIFY_EMAIL   destinataire des notifications (formulaire, reviews)
 */

export const mailConfigured = !!(process.env.BREVO_API_KEY && process.env.MAIL_FROM && process.env.NOTIFY_EMAIL);

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** « Nom <adresse> » ou « adresse » → { name, email }. */
function parseAddress(raw: string): { name?: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].replace(/^"|"$/g, '') || undefined, email: m[2].trim() } : { email: raw.trim() };
}

export async function sendMail(opts: {
  subject: string;
  html: string;
  text?: string;
  /** Destinataire ; par défaut NOTIFY_EMAIL. */
  to?: string;
  replyTo?: { email: string; name?: string | null } | null;
}): Promise<boolean> {
  if (!mailConfigured) return false;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': String(process.env.BREVO_API_KEY),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: parseAddress(String(process.env.MAIL_FROM)),
        to: [parseAddress(opts.to || String(process.env.NOTIFY_EMAIL))],
        subject: opts.subject,
        htmlContent: opts.html,
        ...(opts.text ? { textContent: opts.text } : {}),
        ...(opts.replyTo?.email ? { replyTo: { email: opts.replyTo.email, ...(opts.replyTo.name ? { name: opts.replyTo.name } : {}) } } : {}),
      }),
    });
    if (!res.ok) console.warn('Brevo : e-mail refusé', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (e) {
    console.warn('Brevo : envoi impossible', e);
    return false;
  }
}
