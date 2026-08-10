"use client";

import { alertDialog } from '../admin/dialog';
import { AdminToolbarShell, AdminToolbarButton } from '../admin/AdminToolbar';
import { Pencil } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';
const RichTextModal = dynamic(() => import('../RichTextModal/RichTextModal'), { ssr: false });

export default function VideoIntroEditor({ keyName, title, placeholder }: { keyName: string; title?: string; placeholder?: string }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });
    return () => { mounted = false; try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {} };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/site-settings?keys=${encodeURIComponent(keyName)}`);
        const json = await res.json();
        if (json?.settings && json.settings[keyName]) {
          try {
            const parsed = JSON.parse(json.settings[keyName]);
            setHtml(parsed || '');
          } catch (e) {
            setHtml(String(json.settings[keyName] || ''));
          }
        }
      } catch (e) {
        // ignore
      }
    }
    load();
  }, [keyName]);

  async function save(newHtml: string) {
    try {
      // sanitize headings similar to PortraitIntroEditor
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(newHtml, 'text/html');
        ['h1','h2','h3','h4','h5'].forEach(tag => {
          Array.from(doc.getElementsByTagName(tag)).forEach((el: any) => {
            try {
              if (el && el.style) {
                el.style.fontSize = '';
                el.style.fontFamily = '';
                el.style.fontWeight = '';
                if (!el.getAttribute('style') || el.getAttribute('style').trim() === '') el.removeAttribute('style');
              }
            } catch (_) {}
          });
        });
        newHtml = doc.body.innerHTML;
      } catch (e) {
        // ignore
      }

      const payload = { key: keyName, value: JSON.stringify(newHtml) };
      const resp = await fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      if (!resp.ok) throw new Error('Save failed');
      setHtml(newHtml);
      setOpen(false);
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: keyName, value: JSON.stringify(newHtml) } })); } catch (_) {}
    } catch (e) {
      console.error('save video intro error', e);
      await alertDialog({ title: 'Enregistrement impossible', message: 'La sauvegarde n’a pas abouti. Réessayez dans un instant.', tone: 'danger' });
    }
  }

  return (
    <div style={{ width: '100%', padding: '1rem 0', background: 'transparent' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        {isAdmin && (
          <AdminToolbarShell>
            <AdminToolbarButton
              variant="primary"
              showLabel
              icon={<Pencil size={14} aria-hidden="true" />}
              label="Modifier"
              onClick={() => setOpen(true)}
            />
          </AdminToolbarShell>
        )}
        {title ? <h3 style={{ textAlign: 'center', marginBottom: 12 }}>{title}</h3> : null}
        <div className="richtext-content tiptap-editor" style={{ background: 'transparent', padding: '18px 0', borderRadius: 8, color: 'var(--color-text)', minHeight: 80 }} dangerouslySetInnerHTML={{ __html: html || (placeholder || '<p style="opacity:0.7">Texte d\'introduction ...</p>') }} />
      </div>

      {open && (
        <RichTextModal title={`Édition ${title || 'Intro'}`} initial={html} onClose={() => setOpen(false)} onSave={save} />
      )}
    </div>
  );
}
