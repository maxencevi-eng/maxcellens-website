'use client';

import { useEffect, useState } from 'react';
import type { BacRole, BacProfil } from '../../lib/bac/types';

interface RoleWithGroupe extends BacRole {
  groupe?: { nom: string; couleur: string };
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<RoleWithGroupe[]>([]);
  const [groupes, setGroupes] = useState<BacProfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState<RoleWithGroupe | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const emptyForm = {
    nom: '',
    groupe_slug: '',
    description: '',
    couleur: '#6366f1',
    variants: [
      { nom: '', description: '', emoji: '😰' },
      { nom: '', description: '', emoji: '😄' },
      { nom: '', description: '', emoji: '🤷' },
    ],
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [rolesRes, profilsRes] = await Promise.all([
        fetch('/bac/api/roles').then(r => r.json()),
        fetch('/bac/api/profils').then(r => r.json()),
      ]);
      if (Array.isArray(rolesRes)) setRoles(rolesRes);
      if (Array.isArray(profilsRes)) setGroupes(profilsRes.filter((p: BacProfil) => p.type === 'groupe-acteur' && p.actif));
    } catch { } finally { setLoading(false); }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setEditRole(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(role: RoleWithGroupe) {
    setEditRole(role);
    setForm({
      nom: role.nom,
      groupe_slug: role.groupe_slug,
      description: role.description,
      couleur: role.couleur,
      variants: role.variants?.map(v => ({ id: v.id, nom: v.nom, description: v.description, emoji: v.emoji })) as any ||
        emptyForm.variants,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editRole ? 'PATCH' : 'POST';
    const body = editRole ? { id: editRole.id, ...form } : form;

    const res = await fetch('/bac/api/roles', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      showToast(editRole ? 'Rôle mis à jour' : 'Rôle créé');
      setShowModal(false);
      loadData();
    } else {
      showToast('Erreur', 'error');
    }
  }

  async function handleToggle(role: RoleWithGroupe) {
    await fetch('/bac/api/roles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: role.id, actif: !role.actif }),
    });
    loadData();
  }

  function updateVariant(index: number, field: string, value: string) {
    setForm(prev => {
      const variants = [...prev.variants];
      variants[index] = { ...variants[index], [field]: value };
      return { ...prev, variants };
    });
  }

  return (
    <div>
      <div className="bac-page-header bac-animate-in">
        <div>
          <h1>Rôles & Variants</h1>
          <p style={{ color: 'var(--bac-text-secondary)', marginTop: 4 }}>Personnages et styles de jeu</p>
        </div>
        <button className="bac-btn bac-btn-primary" onClick={openCreate}>
          + Nouveau rôle
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="bac-spinner" />
        </div>
      ) : roles.length === 0 ? (
        <div className="bac-empty bac-animate-in">
          <div className="bac-empty-icon">🎭</div>
          <p>Aucun rôle créé</p>
          <button className="bac-btn bac-btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
            Créer le premier rôle
          </button>
        </div>
      ) : (
        <div className="bac-grid bac-grid-2 bac-stagger">
          {roles.map(role => (
            <div
              key={role.id}
              className="bac-card bac-card-interactive"
              style={{ borderLeft: `4px solid ${role.couleur}`, opacity: role.actif ? 1 : 0.5, cursor: 'pointer' }}
              onClick={() => openEdit(role)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{role.nom}</h3>
                  {role.groupe && (
                    <span className="bac-badge" style={{ background: role.groupe.couleur + '20', color: role.groupe.couleur, marginTop: 4 }}>
                      {role.groupe.nom}
                    </span>
                  )}
                </div>
                <span className={`bac-badge ${role.actif ? 'bac-badge-success' : 'bac-badge-error'}`}>
                  {role.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>
              {role.description && (
                <p style={{ fontSize: '0.875rem', color: 'var(--bac-text-secondary)', marginBottom: 12 }}>{role.description}</p>
              )}
              {role.variants && role.variants.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {role.variants.sort((a, b) => a.lettre.localeCompare(b.lettre)).map(v => (
                    <span
                      key={v.id}
                      className="bac-badge bac-badge-info"
                      style={{ fontSize: '0.8125rem' }}
                    >
                      {v.emoji} {v.nom}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="bac-modal-overlay" onClick={() => setShowModal(false)}>
          <form className="bac-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <div className="bac-modal-header">
              <h2 className="bac-h2">{editRole ? 'Modifier le rôle' : 'Nouveau rôle'}</h2>
              <button type="button" className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="bac-modal-body">
              <div className="bac-form-row">
                <div className="bac-form-group">
                  <label className="bac-label">Nom du rôle</label>
                  <input className="bac-input" value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} required />
                </div>
                <div className="bac-form-group">
                  <label className="bac-label">Groupe</label>
                  <select className="bac-input bac-select" value={form.groupe_slug} onChange={e => setForm(p => ({ ...p, groupe_slug: e.target.value }))} required>
                    <option value="">Sélectionner...</option>
                    {groupes.map(g => <option key={g.slug} value={g.slug}>{g.nom}</option>)}
                  </select>
                </div>
              </div>
              <div className="bac-form-group">
                <label className="bac-label">Description</label>
                <textarea className="bac-input bac-textarea" style={{ minHeight: 60 }} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="bac-form-group">
                <label className="bac-label">Couleur</label>
                <input type="color" className="bac-input" style={{ padding: 4, height: 44, maxWidth: 80 }} value={form.couleur} onChange={e => setForm(p => ({ ...p, couleur: e.target.value }))} />
              </div>

              <div className="bac-divider" />

              <h3 className="bac-h3" style={{ marginBottom: 16 }}>Variants (3 obligatoires)</h3>
              {['A', 'B', 'C'].map((lettre, i) => (
                <div key={lettre} className="bac-card" style={{ padding: 16, marginBottom: 12, background: 'var(--bac-surface-elevated)' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Variant {lettre}</div>
                  <div className="bac-form-row" style={{ gap: 8 }}>
                    <input
                      className="bac-input"
                      placeholder="Emoji"
                      value={form.variants[i]?.emoji || ''}
                      onChange={e => updateVariant(i, 'emoji', e.target.value)}
                      style={{ maxWidth: 60, textAlign: 'center' }}
                    />
                    <input
                      className="bac-input"
                      placeholder="Nom (ex: L'anxieux)"
                      value={form.variants[i]?.nom || ''}
                      onChange={e => updateVariant(i, 'nom', e.target.value)}
                      required
                    />
                  </div>
                  <input
                    className="bac-input"
                    placeholder="Description courte"
                    value={form.variants[i]?.description || ''}
                    onChange={e => updateVariant(i, 'description', e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                </div>
              ))}
            </div>
            <div className="bac-modal-footer">
              {editRole && (
                <button
                  type="button"
                  className="bac-btn bac-btn-ghost"
                  style={{ marginRight: 'auto' }}
                  onClick={() => { handleToggle(editRole); setShowModal(false); }}
                >
                  {editRole.actif ? '🚫 Désactiver' : '✅ Activer'}
                </button>
              )}
              <button type="button" className="bac-btn bac-btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
              <button type="submit" className="bac-btn bac-btn-primary">{editRole ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>{toast.msg}</div>}
    </div>
  );
}
