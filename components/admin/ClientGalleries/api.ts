"use client";

import { supabase } from '../../../lib/supabase';

/** fetch authentifié pour les routes /api/admin/client-galleries/*. */
export async function adminApi<T = any>(path: string, init: RequestInit & { json?: any } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const headers: Record<string, string> = { ...(init.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = init.body;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`/api/admin/client-galleries${path}`, { ...init, headers, body });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(j?.error || `Erreur ${res.status}`);
    err.status = res.status;
    err.setup = j?.setup;
    throw err;
  }
  return j as T;
}

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

export function downloadTextFile(name: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
}

/**
 * Copie un tableau dans le presse-papiers, collable proprement partout :
 * - text/plain en valeurs séparées par des tabulations (LibreOffice, Excel,
 *   Google Sheets : une ligne par entrée, une valeur par colonne) ;
 * - text/html en <table> (e-mail, Word, Google Docs).
 */
export async function copyTable(header: string[], rows: (string | number | null | undefined)[][]): Promise<boolean> {
  const cell = (v: any) => (v == null ? '' : String(v)).replace(/[\t\r\n]+/g, ' ').trim();
  const tsv = [header, ...rows].map((r) => r.map(cell).join('\t')).join('\r\n');
  const esc = (v: any) => cell(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html =
    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">' +
    `<thead><tr>${header.map((h) => `<th style="background:#f2f0eb;text-align:left">${esc(h)}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  try {
    const CI = (window as any).ClipboardItem;
    if (CI && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new CI({ 'text/plain': new Blob([tsv], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) }),
      ]);
      return true;
    }
  } catch {
    /* repli texte seul ci-dessous */
  }
  return copyText(tsv);
}
