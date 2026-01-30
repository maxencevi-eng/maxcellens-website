"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import dynamic from 'next/dynamic';

const RichTextModal = dynamic(() => import('../RichTextModal/RichTextModal'), { ssr: false });

export default function PortraitIntroEditor() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string>('');
  // use Supabase auth state so the modifier button remains visible reliably
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });
    return () => { mounted = false; try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {} };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/site-settings?keys=portrait_intro');
        const json = await res.json();
        if (json?.settings?.portrait_intro) {
          try {
            const parsed = JSON.parse(json.settings.portrait_intro);
            setHtml(parsed || '');
          } catch (e) {
            setHtml(String(json.settings.portrait_intro || ''));
          }
        }
      } catch (e) {
        // ignore
      }
    }
    load();
  }, []);

  async function save(newHtml: string) {
    try {
      // sanitize headings: remove inline font-size/font-family/font-weight so headings inherit site variables
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
                // remove empty style attribute
                if (!el.getAttribute('style') || el.getAttribute('style').trim() === '') el.removeAttribute('style');
              }
            } catch (_) {}
          });
        });
        newHtml = doc.body.innerHTML;
      } catch (e) {
        // ignore parser errors and proceed with raw html
      }

      const payload = { key: 'portrait_intro', value: JSON.stringify(newHtml) };
      const resp = await fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      if (!resp.ok) throw new Error('Save failed');
      setHtml(newHtml);
      setOpen(false);
      try { window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'portrait_intro', value: JSON.stringify(newHtml) } })); } catch (_) {}
    } catch (e) {
      console.error('save intro error', e);
      alert('Erreur en sauvegarde');
    }
  }

  return (
    <div style={{ width: '100%', padding: '1rem', background: 'transparent' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        {isAdmin && (
          <button className="btn-secondary" onClick={() => setOpen(true)} style={{ position: 'absolute', right: 12, top: -16, zIndex: 5, background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>Modifier</button>
        )}
        <div className="richtext-content tiptap-editor" style={{ background: 'transparent', padding: 18, borderRadius: 8, color: 'var(--color-text)', minHeight: 120 }} dangerouslySetInnerHTML={{ __html: html || '<p style="opacity:0.7">Texte d\'introduction pour la page Portrait...</p>' }} />
      </div>

      {open && (
        <RichTextModal title="Édition Intro Portrait" initial={html} onClose={() => setOpen(false)} onSave={save} />
      )}
    </div>
  );
}
