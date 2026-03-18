"use client";
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { StoredSection } from '../LegalPage/LegalPageClient';

const RichTextModalContent = dynamic(() => import('../RichTextModal/RichTextModalContent'), { ssr: false });

interface Props {
  pageKey: string;
  title: string;
  initialSections: StoredSection[];
  initialBgColor: string;
  onClose: () => void;
  onSaved: (sections: StoredSection[], bgColor: string) => void;
}

export default function LegalEditModal({ pageKey, title, initialSections, initialBgColor, onClose, onSaved }: Props) {
  const [sections, setSections] = useState<StoredSection[]>(initialSections.map(s => ({ ...s })));
  const [bgColor, setBgColor] = useState(initialBgColor || '#F2F0EB');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTitle(i: number, val: string) {
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, title: val } : s));
  }

  function updateHtml(i: number, html: string) {
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, html } : s));
    setEditingIndex(null);
  }

  function addSection() {
    setSections(prev => [...prev, { title: 'Nouvelle section', html: '<p>Contenu...</p>' }]);
  }

  function removeSection(i: number) {
    setSections(prev => prev.filter((_, idx) => idx !== i));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    setSections(prev => { const arr = [...prev]; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; return arr; });
  }

  function moveDown(i: number) {
    setSections(prev => {
      if (i >= prev.length - 1) return prev;
      const arr = [...prev]; [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; return arr;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = { sections, bgColor };
      const resp = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: pageKey, value: JSON.stringify(payload) }),
      });
      if (!resp.ok) throw new Error('Erreur lors de la sauvegarde');
      onSaved(sections, bgColor);
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  // If a section is being edited in rich text, show the RTE modal
  if (editingIndex !== null) {
    const section = sections[editingIndex];
    return (
      <RichTextModalContent
        title={`Modifier : ${section.title}`}
        initial={section.html}
        onClose={() => setEditingIndex(null)}
        onSave={(html) => updateHtml(editingIndex, html)}
        editorBackground={bgColor}
      />
    );
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50000, padding: '64px 16px 32px', overflowY: 'auto' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', color: '#111', padding: 24, width: 760, maxWidth: '98%', borderRadius: 10, position: 'relative', alignSelf: 'flex-start' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>Modifier — {title}</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#888' }}>Cliquez sur "Modifier" à côté d'une section pour éditer son contenu.</p>

        {/* Background color */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: '#f7f7f5', borderRadius: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>Couleur de fond</label>
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            style={{ width: 40, height: 32, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }}
          />
          <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>{bgColor}</span>
          <button onClick={() => setBgColor('#F2F0EB')} style={{ fontSize: 12, padding: '4px 8px', background: 'none', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', marginLeft: 'auto', color: '#666' }}>Réinitialiser</button>
        </div>

        {/* Sections list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {sections.map((section, i) => (
            <div key={i} style={{ border: '1px solid #e5e5e5', borderRadius: 8, padding: 14, background: '#fafafa' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => updateTitle(i, e.target.value)}
                  placeholder="Titre de la section"
                  style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 5, fontSize: 14, fontWeight: 600 }}
                />
                <button onClick={() => moveUp(i)} disabled={i === 0} title="Monter" style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer', background: '#fff', color: '#555', fontSize: 12 }}>↑</button>
                <button onClick={() => moveDown(i)} disabled={i === sections.length - 1} title="Descendre" style={{ padding: '5px 8px', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer', background: '#fff', color: '#555', fontSize: 12 }}>↓</button>
                <button onClick={() => setEditingIndex(i)} style={{ padding: '5px 12px', background: '#111', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>Modifier contenu</button>
                <button onClick={() => removeSection(i)} title="Supprimer la section" style={{ padding: '5px 8px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
              {/* Content preview */}
              <div
                style={{ fontSize: 12, color: '#666', maxHeight: 60, overflow: 'hidden', lineHeight: 1.5, fontStyle: 'italic' }}
                dangerouslySetInnerHTML={{ __html: section.html }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={addSection}
          style={{ width: '100%', padding: '9px', background: '#f4f4f4', border: '1px dashed #bbb', borderRadius: 7, cursor: 'pointer', fontSize: 13, color: '#555', marginBottom: 16 }}
        >
          + Ajouter une section
        </button>

        {error && <div style={{ marginBottom: 10, color: 'red', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
