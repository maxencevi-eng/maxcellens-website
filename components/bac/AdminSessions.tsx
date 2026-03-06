'use client';

import { useEffect, useState } from 'react';
import type { BacSession, BacProfil, BacHistoire } from '../../lib/bac/types';

const STATUT_MAP: Record<string, { label: string; badge: string; icon: string }> = {
  'en-preparation': { label: 'En préparation', badge: 'bac-badge-warning', icon: '⏳' },
  'en-cours': { label: 'En cours', badge: 'bac-badge-primary', icon: '🎬' },
  'terminee': { label: 'Terminée', badge: 'bac-badge-success', icon: '✅' },
  'archivee': { label: 'Archivée', badge: 'bac-badge-info', icon: '📦' },
};

export default function AdminSessions() {
  const [sessions, setSessions] = useState<BacSession[]>([]);
  const [groupes, setGroupes] = useState<BacProfil[]>([]);
  const [histoires, setHistoires] = useState<BacHistoire[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSession, setEditSession] = useState<BacSession | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [form, setForm] = useState({
    nom_entreprise: '',
    date_jour_j: '',
    lieu: '',
    nb_participants: 10,
    min_scenes: 1,
    max_scenes: 3,
    histoire_id: '',
    groupes_actifs: [] as string[],
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, p, h] = await Promise.all([
        fetch('/bac/api/sessions').then(r => r.json()),
        fetch('/bac/api/profils').then(r => r.json()),
        fetch('/bac/api/histoires').then(r => r.json()),
      ]);
      if (Array.isArray(s)) setSessions(s);
      if (Array.isArray(p)) setGroupes(p.filter((x: BacProfil) => x.type === 'groupe-acteur' && x.actif));
      if (Array.isArray(h)) setHistoires(h.filter((x: BacHistoire) => x.actif));
    } catch { } finally { setLoading(false); }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setEditSession(null);
    setForm({
      nom_entreprise: '',
      date_jour_j: '',
      lieu: '',
      nb_participants: 10,
      min_scenes: 1,
      max_scenes: 3,
      histoire_id: '',
      groupes_actifs: groupes.map(g => g.slug),
    });
    setShowModal(true);
  }

  function openEdit(session: BacSession) {
    setEditSession(session);
    setForm({
      nom_entreprise: session.nom_entreprise,
      date_jour_j: session.date_jour_j || '',
      lieu: session.lieu,
      nb_participants: session.nb_participants,
      min_scenes: session.min_scenes ?? 1,
      max_scenes: session.max_scenes ?? 3,
      histoire_id: session.histoire_id || '',
      groupes_actifs: session.groupes_actifs,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      histoire_id: form.histoire_id || null,
    };

    const res = editSession
      ? await fetch('/bac/api/sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editSession.id, ...payload }),
        })
      : await fetch('/bac/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    if (res.ok) {
      showToast(editSession ? 'Session mise à jour' : 'Session créée');
      setShowModal(false);
      loadData();
    } else {
      let message = 'Erreur lors de l’enregistrement de la session.';
      try {
        const data = await res.json();
        if (data?.error) {
          message = data.error;
        }
      } catch {}
      // Message plus explicite si la date est requise côté base
      if (message.toLowerCase().includes('date_jour_j') || message.toLowerCase().includes('date du jour j')) {
        message = 'La date du Jour J est obligatoire pour enregistrer la session.';
      }
      showToast(message, 'error');
    }
  }

  async function updateStatut(id: string, statut: string) {
    if (!confirm(`Changer le statut en "${STATUT_MAP[statut]?.label}" ?`)) return;
    const res = await fetch('/bac/api/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, statut }),
    });
    if (res.ok) { showToast('Statut mis à jour'); loadData(); }
  }

  async function exportSession(session: BacSession) {
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${session.nom_entreprise.replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(session: BacSession) {
    if (!confirm(`Supprimer la session "${session.nom_entreprise}" et toutes ses données (casting, choix, saisies) ?`)) return;
    const res = await fetch(`/bac/api/sessions?id=${session.id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Session supprimée');
      loadData();
    } else {
      showToast('Erreur de suppression', 'error');
    }
  }

  return (
    <div>
      <div className="bac-page-header bac-animate-in">
        <div>
          <h1>Sessions</h1>
          <p style={{ color: 'var(--bac-text-secondary)', marginTop: 4 }}>{sessions.length} sessions</p>
        </div>
        <button className="bac-btn bac-btn-primary" onClick={openCreate}>+ Nouvelle session</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="bac-spinner" /></div>
      ) : sessions.length === 0 ? (
        <div className="bac-empty bac-animate-in">
          <div className="bac-empty-icon">📋</div>
          <p>Aucune session</p>
          <button className="bac-btn bac-btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>Créer la première session</button>
        </div>
      ) : (
        <div className="bac-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sessions.map(session => {
            const statut = STATUT_MAP[session.statut] || STATUT_MAP['en-preparation'];
            return (
              <div key={session.id} className="bac-card" style={{ borderLeft: '4px solid var(--bac-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>{session.nom_entreprise}</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                      <span className={`bac-badge ${statut.badge}`}>{statut.icon} {statut.label}</span>
                      {session.date_jour_j && <span className="bac-badge bac-badge-info">📅 {session.date_jour_j}</span>}
                      {session.lieu && <span style={{ fontSize: '0.875rem', color: 'var(--bac-text-secondary)' }}>📍 {session.lieu}</span>}
                      <span style={{ fontSize: '0.875rem', color: 'var(--bac-text-secondary)' }}>👥 {session.nb_participants} participants</span>
                    </div>
                    {session.histoire && <p style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)', marginTop: 4 }}>📖 {session.histoire.titre}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="bac-btn bac-btn-secondary bac-btn-sm" onClick={() => openEdit(session)}>✏️ Modifier</button>
                    {session.statut === 'en-preparation' && (
                      <button className="bac-btn bac-btn-primary bac-btn-sm" onClick={() => updateStatut(session.id, 'en-cours')}>🎬 Démarrer</button>
                    )}
                    {session.statut === 'en-cours' && (
                      <button className="bac-btn bac-btn-success bac-btn-sm" onClick={() => updateStatut(session.id, 'terminee')}>✅ Terminer</button>
                    )}
                    <button className="bac-btn bac-btn-ghost bac-btn-sm" onClick={() => exportSession(session)}>📥 Export JSON</button>
                    {session.statut !== 'archivee' && (
                      <button className="bac-btn bac-btn-ghost bac-btn-sm" onClick={() => updateStatut(session.id, 'archivee')}>📦 Archiver</button>
                    )}
                    <button className="bac-btn bac-btn-ghost bac-btn-sm" style={{ color: 'var(--bac-error)' }} onClick={() => handleDelete(session)}>🗑️</button>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {session.groupes_actifs.map(slug => {
                    const g = groupes.find(x => x.slug === slug);
                    return <span key={slug} className="bac-badge" style={{ background: (g?.couleur || '#888') + '20', color: g?.couleur || '#888' }}>{g?.nom || slug}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit session */}
      {showModal && (
        <div className="bac-modal-overlay" onClick={() => setShowModal(false)}>
          <form className="bac-modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="bac-modal-header">
              <h2 className="bac-h2">{editSession ? 'Modifier la session' : 'Nouvelle session'}</h2>
              <button type="button" className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="bac-modal-body">
              {/* Informations générales */}
              <h3 className="bac-h3" style={{ marginBottom: 12 }}>Informations générales</h3>
              <div className="bac-form-group">
                <label className="bac-label">Nom de l'entreprise</label>
                <input className="bac-input" value={form.nom_entreprise} onChange={e => setForm(p => ({ ...p, nom_entreprise: e.target.value }))} required />
              </div>
              <div className="bac-form-row">
                <div className="bac-form-group">
                  <label className="bac-label">Date du Jour J</label>
                  <input type="date" className="bac-input" value={form.date_jour_j} onChange={e => setForm(p => ({ ...p, date_jour_j: e.target.value }))} />
                </div>
                <div className="bac-form-group">
                  <label className="bac-label">Lieu</label>
                  <input className="bac-input" value={form.lieu} onChange={e => setForm(p => ({ ...p, lieu: e.target.value }))} />
                </div>
                <div className="bac-form-group">
                  <label className="bac-label">Participants</label>
                  <input type="number" className="bac-input" value={form.nb_participants} onChange={e => setForm(p => ({ ...p, nb_participants: parseInt(e.target.value) || 10 }))} min={5} max={200} />
                </div>
              </div>

              <div className="bac-form-row">
                <div className="bac-form-group">
                  <label className="bac-label">Scènes minimum à choisir</label>
                  <input
                    type="number"
                    className="bac-input"
                    min={0}
                    max={20}
                    value={form.min_scenes}
                    onChange={e => {
                      const v = parseInt(e.target.value || '0');
                      setForm(p => ({ ...p, min_scenes: isNaN(v) ? 0 : v }));
                    }}
                  />
                </div>
                <div className="bac-form-group">
                  <label className="bac-label">Scènes maximum à choisir</label>
                  <input
                    type="number"
                    className="bac-input"
                    min={0}
                    max={20}
                    value={form.max_scenes}
                    onChange={e => {
                      const v = parseInt(e.target.value || '0');
                      setForm(p => ({ ...p, max_scenes: isNaN(v) ? 0 : v }));
                    }}
                  />
                </div>
              </div>

              <div className="bac-divider" />

              {/* Groupes actifs */}
              <h3 className="bac-h3" style={{ marginBottom: 12 }}>Groupes actifs</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {groupes.map(g => (
                  <label key={g.slug} className={`bac-radio-label ${form.groupes_actifs.includes(g.slug) ? 'selected' : ''}`} style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.groupes_actifs.includes(g.slug)}
                      onChange={e => {
                        if (e.target.checked) setForm(p => ({ ...p, groupes_actifs: [...p.groupes_actifs, g.slug] }));
                        else setForm(p => ({ ...p, groupes_actifs: p.groupes_actifs.filter(s => s !== g.slug) }));
                      }}
                    />
                    <span className="bac-color-dot" style={{ backgroundColor: g.couleur }} />
                    {g.nom}
                  </label>
                ))}
              </div>

              <div className="bac-divider" />

              {/* Histoire */}
              <h3 className="bac-h3" style={{ marginBottom: 4 }}>📖 Histoire</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)', marginBottom: 12 }}>
                Définit l'intro, le finale et les scènes obligatoires du fil conducteur
              </p>
              <div className="bac-form-group">
                <select
                  className="bac-input bac-select"
                  value={form.histoire_id}
                  onChange={e => setForm(p => ({ ...p, histoire_id: e.target.value }))}
                >
                  <option value="">— Aucune histoire —</option>
                  {histoires.map(h => (
                    <option key={h.id} value={h.id}>{h.titre}</option>
                  ))}
                </select>
                {form.histoire_id && (() => {
                  const selected = histoires.find(h => h.id === form.histoire_id);
                  if (!selected) return null;
                  return (
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--bac-surface-active)', borderRadius: 'var(--bac-radius)', borderLeft: '3px solid var(--bac-primary)', fontSize: '0.8125rem' }}>
                      {selected.description && <p style={{ color: 'var(--bac-text-secondary)', marginBottom: 6 }}>{selected.description}</p>}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {selected.revelation && <span style={{ color: 'var(--bac-info)' }}>🌅 {selected.revelation.titre}</span>}
                        {selected.denouement && <span style={{ color: 'var(--bac-success)' }}>🎞️ {selected.denouement.titre}</span>}
                        {(selected.scenes || []).length > 0 && <span style={{ color: 'var(--bac-text-muted)' }}>🎬 {(selected.scenes || []).length} scène(s) fil rouge</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="bac-modal-footer">
              <button type="button" className="bac-btn bac-btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="bac-btn bac-btn-primary">{editSession ? 'Enregistrer' : 'Créer la session'}</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>{toast.msg}</div>}
    </div>
  );
}
