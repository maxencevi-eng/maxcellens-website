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
      gap: 0,
      borderBottom: '1px solid #e5e7eb',
      marginBottom: 18,
      marginTop: 6,
      overflowX: 'auto',
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          style={{
            padding: '7px 16px',
            border: 'none',
            borderBottom: active === t.id ? '2px solid #111' : '2px solid transparent',
            background: 'none',
            fontSize: 13,
            fontWeight: active === t.id ? 600 : 400,
            color: active === t.id ? '#111' : '#6b7280',
            cursor: 'pointer',
            borderRadius: 0,
            marginBottom: -1,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >{t.label}</button>
      ))}
    </div>
  );
}
