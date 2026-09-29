"use client";
import React from 'react';

type Tab = { id: string; label: string };

export default function ModalTabs({ tabs, active, onChange }: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      marginBottom: 12,
      marginTop: 6,
      overflowX: 'auto',
      flexWrap: 'wrap',
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              // Couleurs de l'interface admin : celles des boutons du site
              // (souvent texte blanc) rendaient les onglets inactifs invisibles.
              background: isActive ? 'var(--adm-accent, #213431)' : 'transparent',
              color: isActive ? 'var(--adm-accent-ink, #fff)' : 'var(--adm-ink, #1a1a18)',
              border: isActive ? '1px solid var(--adm-accent, #213431)' : '1px solid var(--adm-border, #e2e2e0)',
              padding: '8px 12px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 700 : 400,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: 'none',
            }}
          >{t.label}</button>
        );
      })}
    </div>
  );
}
