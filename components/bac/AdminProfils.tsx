'use client';

import { useEffect, useState } from 'react';
import type { BacProfil } from '../../lib/bac/types';

export default function AdminProfils() {
  const [profils, setProfils] = useState<BacProfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPw, setEditingPw] = useState<string | null>(null);
  const [newPw, setNewPw] = useState('');
  const [editingScenes, setEditingScenes] = useState<string | null>(null);
  const [newNbScenes, setNewNbScenes] = useState(4);
  const [newProfil, setNewProfil] = useState({ nom: '', slug: '', couleur: '#6366f1', password: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);

  useEffect(() => { loadProfils(); }, []);

  async function loadProfils() {
    try {
      const res = await fetch('/bac/api/profils');
      const data = await res.json();
      if (Array.isArray(data)) setProfils(data);
    } catch { } finally { setLoading(false); }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleUpdatePassword(id: string) {
    if (!newPw.trim()) return;
    const res = await fetch('/bac/api/profils', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password: newPw }),
    });
    if (res.ok) {
      showToast('Mot de passe mis à jour');
      setEditingPw(null);
      setNewPw('');
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function handleToggleActive(profil: BacProfil) {
    const res = await fetch('/bac/api/profils', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: profil.id, actif: !profil.actif }),
    });
    if (res.ok) {
      setProfils(prev => prev.map(p => p.id === profil.id ? { ...p, actif: !p.actif } : p));
      showToast(profil.actif ? 'Profil désactivé' : 'Profil activé');
    }
  }

  async function handleUpdateNbScenes(id: string) {
    const res = await fetch('/bac/api/profils', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nb_scenes_requis: newNbScenes }),
    });
    if (res.ok) {
      setProfils(prev => prev.map(p => p.id === id ? { ...p, nb_scenes_requis: newNbScenes } : p));
      showToast('Nombre de scènes mis à jour');
      setEditingScenes(null);
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function handleCreateProfil(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/bac/api/profils', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfil),
    });
    if (res.ok) {
      showToast('Profil créé');
      setShowModal(false);
      setNewProfil({ nom: '', slug: '', couleur: '#6366f1', password: '' });
      loadProfils();
    } else {
      const err = await res.json();
      showToast(err.error || 'Erreur', 'error');
    }
  }

  const typeLabel = (type: string) => {
    switch (type) {
      case 'coordinateur': return '🎯 Coordinateur';
      case 'technique': return '🔧 Technique';
      case 'groupe-acteur': return '🎬 Groupe acteur';
      default: return type;
    }
  };

  if (showPrintView) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 className="bac-h1">🎬 Bureau à la Carte — Mots de passe du jour</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="bac-btn bac-btn-secondary" onClick={() => setShowPrintView(false)}>← Retour</button>
            <button className="bac-btn bac-btn-primary" onClick={() => window.print()}>🖨️ Imprimer</button>
          </div>
        </div>

        <div className="bac-stagger">
          {profils.filter(p => p.actif && p.type !== 'admin').map(p => (
            <div key={p.id} className="bac-card" style={{ borderLeft: `4px solid ${p.couleur}`, marginBottom: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{p.nom}</strong>
                  <span style={{ color: 'var(--bac-text-muted)', marginLeft: 8, fontSize: '0.875rem' }}>
                    ({p.slug})
                  </span>
                </div>
                {p.mot_de_passe_clair ? (
                  <div style={{ fontFamily: 'var(--bac-font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--bac-primary)' }}>
                    {p.mot_de_passe_clair}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--bac-warning)', fontWeight: 600 }}>
                    ⚠️ Ré-enregistrez le mdp
                  </div>
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)', marginTop: 4 }}>
                Connexion : /bac/{p.slug}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)', marginTop: 24 }}>
          Si un mot de passe affiche "⚠️", cliquez sur 🔑 Modifier dans la liste et re-saisissez le mot de passe pour l'enregistrer en clair.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="bac-page-header bac-animate-in">
        <div>
          <h1>Profils d'accès</h1>
          <p style={{ color: 'var(--bac-text-secondary)', marginTop: 4 }}>Gérez les profils et mots de passe</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="bac-btn bac-btn-secondary" onClick={() => setShowPrintView(true)}>
            🖨️ Préparer le Jour J
          </button>
          <button className="bac-btn bac-btn-primary" onClick={() => setShowModal(true)}>
            + Nouveau groupe
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="bac-spinner" />
        </div>
      ) : (
        <div className="bac-card bac-animate-in">
          <table className="bac-table">
            <thead>
              <tr>
                <th>Profil</th>
                <th>Slug</th>
                <th>Type</th>
                <th>Couleur</th>
                <th>Statut</th>
                <th>Mot de passe</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profils.filter(p => p.type !== 'admin').map(profil => (
                <tr key={profil.id} style={{ opacity: profil.actif ? 1 : 0.5 }}>
                  <td><strong>{profil.nom}</strong></td>
                  <td style={{ fontFamily: 'var(--bac-font-mono)', fontSize: '0.8125rem' }}>{profil.slug}</td>
                  <td>{typeLabel(profil.type)}</td>
                  <td>
                    <span className="bac-color-dot" style={{ backgroundColor: profil.couleur }} />
                  </td>
                  <td>
                    <span className={`bac-badge ${profil.actif ? 'bac-badge-success' : 'bac-badge-error'}`}>
                      {profil.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td>
                    {editingPw === profil.id ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          className="bac-input"
                          style={{ maxWidth: 150, padding: '6px 10px', minHeight: 36 }}
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          placeholder="Nouveau mdp"
                          autoFocus
                        />
                        <button className="bac-btn bac-btn-primary bac-btn-sm" onClick={() => handleUpdatePassword(profil.id)}>✓</button>
                        <button className="bac-btn bac-btn-ghost bac-btn-sm" onClick={() => { setEditingPw(null); setNewPw(''); }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {profil.mot_de_passe_clair ? (
                          <code style={{ fontFamily: 'var(--bac-font-mono)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--bac-primary)' }}>
                            {profil.mot_de_passe_clair}
                          </code>
                        ) : (
                          <span style={{ fontSize: '0.8125rem', color: 'var(--bac-warning)' }}>⚠️ non visible</span>
                        )}
                        <button
                          className="bac-btn bac-btn-ghost bac-btn-sm"
                          onClick={() => { setEditingPw(profil.id); setNewPw(''); }}
                        >
                          🔑
                        </button>
                      </div>
                    )}
                  </td>
                  <td>
                    {profil.type === 'groupe-acteur' && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="bac-btn bac-btn-ghost bac-btn-sm"
                          onClick={() => handleToggleActive(profil)}
                        >
                          {profil.actif ? '🚫 Désactiver' : '✅ Activer'}
                        </button>
                        {editingScenes === profil.id ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              max={4}
                              className="bac-input"
                              style={{ width: 56, padding: '4px 8px', minHeight: 32 }}
                              value={newNbScenes}
                              onChange={e => setNewNbScenes(Number(e.target.value))}
                            />
                            <button className="bac-btn bac-btn-primary bac-btn-sm" onClick={() => handleUpdateNbScenes(profil.id)}>✓</button>
                            <button className="bac-btn bac-btn-ghost bac-btn-sm" onClick={() => setEditingScenes(null)}>✕</button>
                          </div>
                        ) : (
                          <button
                            className="bac-btn bac-btn-ghost bac-btn-sm"
                            title="Nombre de scènes requises"
                            onClick={() => { setEditingScenes(profil.id); setNewNbScenes(profil.nb_scenes_requis ?? 4); }}
                          >
                            🎬 {profil.nb_scenes_requis ?? 4} scène{(profil.nb_scenes_requis ?? 4) > 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: create new group */}
      {showModal && (
        <div className="bac-modal-overlay" onClick={() => setShowModal(false)}>
          <form className="bac-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleCreateProfil}>
            <div className="bac-modal-header">
              <h2 className="bac-h2">Nouveau groupe acteur</h2>
              <button type="button" className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="bac-modal-body">
              <div className="bac-form-group">
                <label className="bac-label">Nom du groupe</label>
                <input
                  type="text"
                  className="bac-input"
                  value={newProfil.nom}
                  onChange={(e) => setNewProfil(prev => ({
                    ...prev,
                    nom: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                  }))}
                  placeholder="ex: Stagiaires"
                  required
                />
              </div>
              <div className="bac-form-group">
                <label className="bac-label">Slug (URL)</label>
                <input
                  type="text"
                  className="bac-input"
                  value={newProfil.slug}
                  onChange={(e) => setNewProfil(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="auto-généré"
                />
                <p className="bac-form-help">Sera utilisé dans l'URL : /bac/{newProfil.slug || '...'}</p>
              </div>
              <div className="bac-form-row">
                <div className="bac-form-group">
                  <label className="bac-label">Couleur</label>
                  <input
                    type="color"
                    className="bac-input"
                    value={newProfil.couleur}
                    onChange={(e) => setNewProfil(prev => ({ ...prev, couleur: e.target.value }))}
                    style={{ padding: 4, height: 44 }}
                  />
                </div>
                <div className="bac-form-group">
                  <label className="bac-label">Mot de passe initial</label>
                  <input
                    type="text"
                    className="bac-input"
                    value={newProfil.password}
                    onChange={(e) => setNewProfil(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mot de passe"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="bac-modal-footer">
              <button type="button" className="bac-btn bac-btn-secondary" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button type="submit" className="bac-btn bac-btn-primary">
                Créer le groupe
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
