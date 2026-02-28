'use client';

import { useEffect, useState } from 'react';
import type { BacTheme } from '../../lib/bac/types';

export default function AdminThemes() {
  const [themes, setThemes] = useState<BacTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTheme, setEditTheme] = useState<BacTheme | null>(null);
  const [form, setForm] = useState({ titre: '', description: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadThemes(); }, []);

  async function loadThemes() {
    try {
      const data = await fetch('/bac/api/themes').then(r => r.json());
      if (Array.isArray(data)) setThemes(data);
    } catch { } finally { setLoading(false); }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setEditTheme(null);
    setForm({ titre: '', description: '' });
    setShowModal(true);
  }

  function openEdit(theme: BacTheme) {
    setEditTheme(theme);
    setForm({ titre: theme.titre, description: theme.description });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editTheme ? 'PATCH' : 'POST';
    const body = editTheme ? { id: editTheme.id, ...form } : form;

    const res = await fetch('/bac/api/themes', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast(editTheme ? 'Thème mis à jour' : 'Thème créé');
      setShowModal(false);
      loadThemes();
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function toggleActive(theme: BacTheme) {
    await fetch('/bac/api/themes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: theme.id, actif: !theme.actif }),
    });
    loadThemes();
  }

  async function handleDelete(theme: BacTheme) {
    if (!confirm(`Supprimer le thème "${theme.titre}" définitivement ?`)) return;
    const res = await fetch(`/bac/api/themes?id=${theme.id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Thème supprimé');
      setShowModal(false);
      loadThemes();
    } else {
      showToast('Erreur de suppression', 'error');
    }
  }

  return (
    <div>
      <div className="bac-page-header bac-animate-in">
        <div>
          <h1>Thèmes</h1>
          <p style={{ color: 'var(--bac-text-secondary)', marginTop: 4 }}>Thèmes d'épisode</p>
        </div>
        <button className="bac-btn bac-btn-primary" onClick={openCreate}>+ Nouveau thème</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="bac-spinner" /></div>
      ) : themes.length === 0 ? (
        <div className="bac-empty bac-animate-in">
          <div className="bac-empty-icon">🎨</div>
          <p>Aucun thème créé</p>
          <button className="bac-btn bac-btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>Créer le premier thème</button>
        </div>
      ) : (
        <div className="bac-grid bac-grid-2 bac-stagger">
          {themes.map(theme => (
            <div key={theme.id} className="bac-card bac-card-interactive" style={{ opacity: theme.actif ? 1 : 0.5, cursor: 'pointer' }} onClick={() => openEdit(theme)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>🎨 {theme.titre}</h3>
                <span className={`bac-badge ${theme.actif ? 'bac-badge-success' : 'bac-badge-error'}`}>
                  {theme.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>
              {theme.description && <p style={{ fontSize: '0.875rem', color: 'var(--bac-text-secondary)', marginTop: 8 }}>{theme.description}</p>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="bac-modal-overlay" onClick={() => setShowModal(false)}>
          <form className="bac-modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="bac-modal-header">
              <h2 className="bac-h2">{editTheme ? 'Modifier le thème' : 'Nouveau thème'}</h2>
              <button type="button" className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="bac-modal-body">
              <div className="bac-form-group">
                <label className="bac-label">Titre</label>
                <input className="bac-input" value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} required />
              </div>
              <div className="bac-form-group">
                <label className="bac-label">Description</label>
                <textarea className="bac-input bac-textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="bac-modal-footer">
              {editTheme && (
                <div style={{ display: 'flex', gap: 8, marginRight: 'auto' }}>
                  <button type="button" className="bac-btn bac-btn-ghost" onClick={() => { toggleActive(editTheme); setShowModal(false); }}>
                    {editTheme.actif ? '🚫 Désactiver' : '✅ Activer'}
                  </button>
                  <button type="button" className="bac-btn bac-btn-ghost" style={{ color: 'var(--bac-error)' }} onClick={() => handleDelete(editTheme)}>
                    🗑️ Supprimer
                  </button>
                </div>
              )}
              <button type="button" className="bac-btn bac-btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="bac-btn bac-btn-primary">{editTheme ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>{toast.msg}</div>}
    </div>
  );
}
