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
              background: isActive ? 'var(--button-2-bg, #f5f5f5)' : 'transparent',
              color: isActive ? 'var(--button-2-color, #111)' : 'var(--button-1-color, #213431)',
              border: isActive ? '1px solid var(--button-2-bg, #ddd)' : '1px solid var(--button-1-bg, #eee)',
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
