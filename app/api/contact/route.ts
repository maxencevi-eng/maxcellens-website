import { NextResponse } from 'next/server';
import { escapeHtml as esc, mailConfigured, sendMail } from '@/lib/mail';
import { clientIp, rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const PROJECT_TYPES = ['Vidéo commerciale', 'Événement', 'Corporate / institutionnel', 'Portrait', 'Cadreur / tournage', 'Bureau à la carte', 'Autre'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/contact — formulaire de contact, envoyé par e-mail via Brevo.
 * Rien n'est stocké en base : le message part directement dans la boîte mail,
 * avec l'adresse du visiteur en « Répondre à ».
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // Pot de miel : un champ invisible qu'un humain ne remplit jamais.
  // On répond « ok » pour ne rien apprendre au robot.
  if (body.website) return NextResponse.json({ ok: true });

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 40);
  const type = PROJECT_TYPES.includes(body.type) ? String(body.type) : '';
  const message = String(body.message || '').trim().slice(0, 5000);

  if (!name || !EMAIL_RE.test(email) || message.length < 10) {
    return NextResponse.json({ error: 'Merci de renseigner votre nom, un e-mail valide et un message.' }, { status: 400 });
  }
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Trop de messages envoyés. Réessayez plus tard ou écrivez directement à maxcellens@gmail.com.' }, { status: 429 });
  }
  if (!mailConfigured) {
    console.error('Formulaire de contact : Brevo non configuré (BREVO_API_KEY, MAIL_FROM, NOTIFY_EMAIL)');
    return NextResponse.json({ error: 'Le formulaire est momentanément indisponible. Écrivez directement à maxcellens@gmail.com.' }, { status: 503 });
  }

  const row = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:6px 16px 6px 0;font:600 13px Arial,sans-serif;color:#6b7670;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0;font:14px/1.5 Arial,sans-serif;color:#1e2b28">${value}</td></tr>`
      : '';
  const html = `
  <div style="background:#f2f0eb;padding:28px 12px">
    <div style="max-width:620px;margin:0 auto;background:#fff;border-radius:16px;padding:28px 30px;border-top:4px solid #213431">
      <p style="margin:0 0 6px;font:600 11px/1 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7b8783">Nouveau message — maxcellens.com</p>
      <h1 style="margin:0 0 18px;font:600 21px/1.3 Arial,sans-serif;color:#1e2b28">${esc(name)}${type ? ` · ${esc(type)}` : ''}</h1>
      <table style="border-collapse:collapse;margin:0 0 18px">
        ${row('E-mail', `<a href="mailto:${esc(email)}" style="color:#2d6b5f">${esc(email)}</a>`)}
        ${row('Téléphone', phone ? `<a href="tel:${esc(phone.replace(/[^+\d]/g, ''))}" style="color:#2d6b5f">${esc(phone)}</a>` : '')}
        ${row('Projet', esc(type))}
      </table>
      <div style="background:#f7f6f2;border-radius:10px;padding:14px 16px;font:14px/1.6 Arial,sans-serif;color:#1e2b28">${esc(message).replace(/\n/g, '<br>')}</div>
      <p style="margin:18px 0 0;font:12px Arial,sans-serif;color:#7b8783">Répondez directement à cet e-mail pour écrire à ${esc(name)}.</p>
    </div>
  </div>`;
  const text = `${name}${type ? ` — ${type}` : ''}\n${email}${phone ? `\n${phone}` : ''}\n\n${message}`;

  const ok = await sendMail({
    subject: `Contact — ${name}${type ? ` · ${type}` : ''}`,
    html,
    text,
    replyTo: { email, name },
  });
  if (!ok) {
    return NextResponse.json({ error: "L'envoi a échoué. Réessayez ou écrivez directement à maxcellens@gmail.com." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
