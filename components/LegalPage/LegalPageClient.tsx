"use client";
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './LegalPage.module.css';
import { supabase } from '../../lib/supabase';

const LegalEditModal = dynamic(() => import('../LegalEditModal/LegalEditModal'), { ssr: false });

export interface StoredSection {
  title: string;
  html: string;
}

interface DefaultSection {
  title: string;
  content: string[];
}

interface LegalPageClientProps {
  pageKey: string;
  title: string;
  intro: string;
  defaultSections: DefaultSection[];
  bgColor?: string;
}

function defaultToStored(sections: DefaultSection[]): StoredSection[] {
  return sections.map((s) => ({
    title: s.title,
    html: s.content.map((line) => `<p>${line}</p>`).join(''),
  }));
}

export default function LegalPageClient({ pageKey, title, intro, defaultSections, bgColor: defaultBgColor }: LegalPageClientProps) {
  const [sections, setSections] = useState<StoredSection[]>(() => defaultToStored(defaultSections));
  const [bgColor, setBgColor] = useState(defaultBgColor || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Admin detection
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setIsAdmin(Boolean((data as any).user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(Boolean(session?.user));
    });
    return () => {
      mounted = false;
      try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {}
    };
  }, []);

  // Load stored content
  useEffect(() => {
    async function load() {
      try {
        const resp = await fetch(`/api/admin/site-settings?keys=${pageKey}`);
        if (!resp.ok) return;
        const j = await resp.json();
        const raw = j?.settings?.[pageKey];
        if (!raw) return;
        const parsed = JSON.parse(String(raw));
        if (parsed?.sections?.length) setSections(parsed.sections);
        if (parsed?.bgColor) setBgColor(parsed.bgColor);
      } catch (_) {}
    }
    load();
  }, [pageKey]);

  return (
    <div className={styles.wrapper} style={{ background: bgColor || 'var(--bg, #F2F0EB)' }}>
      {/* Bouton admin — coin supérieur droit du bloc */}
      {isAdmin && (
        <div style={{ position: 'absolute', top: '1rem', right: 'max(calc(50% - 390px), 1.25rem)' }}>
          <button
            onClick={() => setEditOpen(true)}
            style={{ background: '#111', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          >
            Modifier
          </button>
        </div>
      )}

      <div className={styles.container}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Informations légales</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.intro}>{intro}</p>
        </header>

        <div className={styles.content}>
          {sections.map((section, i) => (
            <section key={i} className={styles.section}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              <div
                className={styles.sectionBody}
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
            </section>
          ))}
        </div>
      </div>

      {editOpen && (
        <LegalEditModal
          pageKey={pageKey}
          title={title}
          initialSections={sections}
          initialBgColor={bgColor}
          onClose={() => setEditOpen(false)}
          onSaved={(newSections, newBg) => {
            setSections(newSections);
            if (newBg !== undefined) setBgColor(newBg);
            setEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
