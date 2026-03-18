"use client";
import React, { useEffect, useState } from 'react';
import Modal from '../Modal/Modal';
import { useTransitionSettings, type TransitionSettings } from './TransitionProvider';

export default function TransitionsEditor({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, saveSettings } = useTransitionSettings();
  const [local, setLocal] = useState<TransitionSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setLocal(settings), [settings]);

  // Live preview
  useEffect(() => {
    setSettings(local);
  }, [local]);

  function update(next: Partial<TransitionSettings>) {
    setLocal((s) => ({ ...s, ...next }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await saveSettings(local);
      setMessage('Enregistr\u00e9 !');
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 13, fontWeight: 600, color: '#444',
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 0', borderBottom: '1px solid #f0f0ee',
  };
  const helpStyle: React.CSSProperties = {
    fontSize: 11, color: '#999', marginTop: 2,
  };

  return (
    <Modal title="Transitions & Effets" onClose={onClose}>
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Toggle */}
        <div style={rowStyle}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Transitions fluides
            <div style={helpStyle}>Effet de balayage lors de la navigation entre les pages</div>
          </label>
          <button
            onClick={() => update({ enabled: !local.enabled })}
            style={{
              padding: '6px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: local.enabled ? '#172622' : '#e5e5e5',
              color: local.enabled ? '#fff' : '#888',
              transition: 'all 200ms',
            }}
          >
            {local.enabled ? 'Activ\u00e9' : 'D\u00e9sactiv\u00e9'}
          </button>
        </div>

        {/* Overlay color */}
        <div style={rowStyle}>
          <label style={{ ...labelStyle, flex: 1 }}>Couleur de l'overlay</label>
          <input
            type="color"
            value={local.overlayColor}
            onChange={(e) => update({ overlayColor: e.target.value })}
            style={{ width: 40, height: 32, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', padding: 2 }}
          />
          <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>{local.overlayColor}</span>
        </div>

        {/* Duration slider */}
        <div style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch', gap: 8, borderBottom: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={labelStyle}>Vitesse de transition</label>
            <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#666', fontWeight: 600 }}>
              {local.duration.toFixed(2)}s
            </span>
          </div>
          <input
            type="range"
            min={0.3}
            max={1.2}
            step={0.05}
            value={local.duration}
            onChange={(e) => update({ duration: parseFloat(e.target.value) })}
            style={{ width: '100%', cursor: 'pointer', accentColor: '#172622' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa' }}>
            <span>Rapide (0.3s)</span>
            <span>Lent (1.2s)</span>
          </div>
        </div>

        {/* Mode */}
        <div style={rowStyle}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Mode de transition</label>
            <div style={helpStyle}>
              <strong>Standard</strong> : l'overlay couvre d'abord, puis la page charge.<br />
              <strong>Seamless</strong> : la page charge pendant que l'overlay monte — enchaînement fluide sans pause.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['standard', 'seamless'] as const).map((m) => (
              <button
                key={m}
                onClick={() => update({ mode: m })}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: local.mode === m ? '#172622' : '#e5e5e5',
                  color: local.mode === m ? '#fff' : '#888',
                  transition: 'all 200ms',
                  textTransform: 'capitalize',
                }}
              >
                {m === 'standard' ? 'Standard' : 'Seamless'}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '16px 0 8px', fontSize: 12, color: '#999', lineHeight: 1.6 }}>
          <strong style={{ color: '#666' }}>Comportement :</strong><br />
          La transition &laquo; Wipe &raquo; s'applique lors de la navigation entre pages internes.<br />
          Le chargement initial conserve l'animation existante (splash).
        </div>

        {/* Preview button */}
        <div style={{ padding: '8px 0 16px' }}>
          <button
            onClick={() => {
              // Trigger a visual preview of the wipe effect
              const preview = document.getElementById('transition-preview-overlay');
              if (preview) {
                preview.style.transition = `transform ${local.duration / 2}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
                preview.style.transform = 'translateY(0%)';
                setTimeout(() => {
                  preview.style.transform = 'translateY(-100%)';
                }, local.duration * 500 + 200);
                setTimeout(() => {
                  preview.style.transform = 'translateY(100%)';
                  preview.style.transition = 'none';
                }, local.duration * 1000 + 400);
              }
            }}
            style={{
              width: '100%', padding: '10px', background: '#f4f4f4',
              border: '1px dashed #bbb', borderRadius: 7, cursor: 'pointer',
              fontSize: 13, color: '#555',
            }}
          >
            Pr\u00e9visualiser la transition
          </button>
          <div
            id="transition-preview-overlay"
            style={{
              position: 'fixed', inset: 0, zIndex: 999998,
              background: local.overlayColor, pointerEvents: 'none',
              transform: 'translateY(100%)',
            }}
          />
        </div>

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          {message && <span style={{ fontSize: 13, color: message.startsWith('Err') ? 'red' : '#2a7' , alignSelf: 'center' }}>{message}</span>}
          <button onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}>
            Fermer
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
