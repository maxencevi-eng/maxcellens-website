'use client';

import { useEffect, useState } from 'react';
import type { BacRevelation } from '../../lib/bac/types';

export default function AdminRevelations() {
  const [revelations, setRevelations] = useState<BacRevelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BacRevelation | null>(null);
  const [form, setForm] = useState({ titre: '', description: '', delai_suggere: '', note_interne: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await fetch('/bac/api/revelations').then(r => r.json());
      if (Array.isArray(data)) setRevelations(data);
    } catch { } finally { setLoading(false); }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setEditItem(null);
    setForm({ titre: '', description: '', delai_suggere: '', note_interne: '' });
    setShowModal(true);
  }

  function openEdit(item: BacRevelation) {
    setEditItem(item);
    setForm({ titre: item.titre, description: item.description, delai_suggere: item.delai_suggere, note_interne: item.note_interne });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editItem ? 'PATCH' : 'POST';
    const body = editItem ? { id: editItem.id, ...form } : form;

    const res = await fetch('/bac/api/revelations', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast(editItem ? 'Révélation mise à jour' : 'Révélation créée');
      setShowModal(false);
      loadData();
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function toggleActive(item: BacRevelation) {
    await fetch('/bac/api/revelations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, actif: !item.actif }),
    });
    loadData();
  }

  return (
    <div>
      <div className="bac-page-header bac-animate-in">
        <div>
          <h1>Révélations</h1>
          <p style={{ color: 'var(--bac-text-secondary)', marginTop: 4 }}>Surprises secrètes pour les sessions</p>
        </div>
        <button className="bac-btn bac-btn-primary" onClick={openCreate}>+ Nouvelle révélation</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="bac-spinner" /></div>
      ) : revelations.length === 0 ? (
        <div className="bac-empty bac-animate-in">
          <div className="bac-empty-icon">🤫</div>
          <p>Aucune révélation créée</p>
          <button className="bac-btn bac-btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>Créer la première révélation</button>
        </div>
      ) : (
        <div className="bac-grid bac-grid-2 bac-stagger">
          {revelations.map(item => (
            <div key={item.id} className="bac-card bac-card-interactive" style={{ opacity: item.actif ? 1 : 0.5, cursor: 'pointer' }} onClick={() => openEdit(item)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>🤫 {item.titre}</h3>
                <span className={`bac-badge ${item.actif ? 'bac-badge-success' : 'bac-badge-error'}`}>
                  {item.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--bac-text-secondary)', marginTop: 8 }}>{item.description}</p>
              {item.delai_suggere && (
                <span className="bac-badge bac-badge-warning" style={{ marginTop: 8 }}>⏱️ {item.delai_suggere}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="bac-modal-overlay" onClick={() => setShowModal(false)}>
          <form className="bac-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="bac-modal-header">
              <h2 className="bac-h2">{editItem ? 'Modifier' : 'Nouvelle révélation'}</h2>
              <button type="button" className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="bac-modal-body">
              <div className="bac-form-group">
                <label className="bac-label">Titre court</label>
                <input className="bac-input" value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} required />
              </div>
              <div className="bac-form-group">
                <label className="bac-label">Description complète</label>
                <textarea className="bac-input bac-textarea" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="L'équipe apprend que [événement] aura lieu dans [délai]..." />
              </div>
              <div className="bac-form-group">
                <label className="bac-label">Délai suggéré</label>
                <input className="bac-input" value={form.delai_suggere} onChange={e => setForm(p => ({ ...p, delai_suggere: e.target.value }))} placeholder="ex: 2 semaines" />
              </div>
              <div className="bac-form-group">
                <label className="bac-label">Note interne (coordinateur uniquement)</label>
                <textarea className="bac-input bac-textarea" value={form.note_interne} onChange={e => setForm(p => ({ ...p, note_interne: e.target.value }))} placeholder="Visible uniquement dans vos documents..." />
              </div>
            </div>
            <div className="bac-modal-footer">
              {editItem && (
                <button type="button" className="bac-btn bac-btn-ghost" style={{ marginRight: 'auto' }} onClick={() => { toggleActive(editItem); setShowModal(false); }}>
                  {editItem.actif ? '🚫 Désactiver' : '✅ Activer'}
                </button>
              )}
              <button type="button" className="bac-btn bac-btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="bac-btn bac-btn-primary">{editItem ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>{toast.msg}</div>}
    </div>
  );
}
