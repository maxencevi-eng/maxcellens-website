'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
      case 'technique': return '🔧 Technique';
      case 'groupe-acteur': return '🎬 Groupe acteur';
      default: return type;
    }
  };

  if (showPrintView) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    // hide admin rows and specific profiles that shouldn\'t be printed
    const activeProfils = profils.filter(p => p.actif && p.type !== 'admin' && p.slug !== 'coordinateur');

    function handlePrintCard(slug: string) {
      const inner = document.querySelector(`[data-card-slug="${slug}"] .bac-jour-j-card`);
      if (!inner) return;
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:white;}@page{size:A5 portrait;margin:0;}.bac-jour-j-card{width:148mm!important;height:210mm!important;min-height:unset!important;box-shadow:none!important;border-radius:0!important;}</style></head><body>${inner.outerHTML}<script>window.onload=function(){window.print();setTimeout(function(){window.close();},500);};<\/script></body></html>`);
      w.document.close();
    }

    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <style>{`
          @media print {
            .bac-jour-j-controls { display: none !important; }
            body { background: white !important; }
            .bac-jour-j-grid { display: block !important; padding: 0 !important; background: white !important; }
            .bac-jour-j-card-wrap { display: block !important; }
            .bac-jour-j-print-btn { display: none !important; }
            .bac-jour-j-card {
              width: 148mm !important;
              height: 210mm !important;
              min-height: unset !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              page-break-after: always;
              break-after: page;
            }
            @page { size: A5 portrait; margin: 0; }
          }
        `}</style>

        {/* Controls — screen only */}
        <div className="bac-jour-j-controls" style={{ padding: '14px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="bac-btn bac-btn-secondary" onClick={() => setShowPrintView(false)}>← Retour</button>
          <button className="bac-btn bac-btn-primary" onClick={() => window.print()}>
            🖨️ Imprimer tout ({activeProfils.length} fiche{activeProfils.length > 1 ? 's' : ''})
          </button>
          <span style={{ fontSize: '0.8125rem', color: '#94a3b8', marginLeft: 4 }}>Format A5 · Une fiche par page · Cliquez 🖨️ sur une carte pour l'imprimer seule</span>
        </div>

        {/* Cards grid */}
        <div className="bac-jour-j-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'center', padding: 36 }}>
          {activeProfils.map(p => {
            const url = `${baseUrl}/animation/${p.slug}`;
            return (
              <div key={p.id} className="bac-jour-j-card-wrap" data-card-slug={p.slug} style={{ position: 'relative' }}>

                {/* Per-card print button */}
                <button
                  className="bac-jour-j-print-btn"
                  title="Imprimer cette fiche"
                  onClick={() => handlePrintCard(p.slug)}
                  style={{
                    position: 'absolute', top: -13, right: -13, zIndex: 2,
                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%',
                    width: 34, height: 34, cursor: 'pointer', fontSize: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
                  }}
                >
                  🖨️
                </button>

                {/* A5 card */}
                <div
                  className="bac-jour-j-card"
                  style={{
                    width: 559,
                    minHeight: 794,
                    background: 'white',
                    borderRadius: 14,
                    boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top color bar */}
                  <div style={{ width: '100%', height: 12, background: p.couleur, flexShrink: 0 }} />

                  {/* 3-section layout: space-between for even distribution */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '28px 40px 32px', flex: 1, width: '100%' }}>

                    {/* TOP — branding + name */}
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
                        🎬 Bureau à la Carte
                      </div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                        {p.nom}
                      </div>
                    </div>

                    {/* MIDDLE — QR code + URL */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                      <div style={{ padding: 14, background: 'white', border: '2px solid #f1f5f9', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                        <QRCodeSVG value={url} size={240} level="M" />
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8', textAlign: 'center', wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5 }}>
                        {url}
                      </div>
                    </div>

                    {/* BOTTOM — password */}
                    <div style={{ width: '100%', borderTop: '2px solid #f1f5f9', paddingTop: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>
                        Mot de passe
                      </div>
                      {p.mot_de_passe_clair ? (
                        <div style={{ fontSize: '2.5rem', fontWeight: 800, color: p.couleur, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
                          {p.mot_de_passe_clair}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.9375rem', color: '#f59e0b', fontWeight: 600 }}>
                          ⚠️ Re-saisissez le mot de passe dans les profils
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
        <div className="bac-animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {profils.filter(p => p.type !== 'admin').map(profil => (
            <div
              key={profil.id}
              className="bac-card"
              style={{
                padding: 16,
                opacity: profil.actif ? 1 : 0.55,
                borderLeft: `4px solid ${profil.couleur || 'var(--bac-border)'}`,
              }}
            >
              {/* Top row: name + type + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{profil.nom}</strong>
                  <span style={{ marginLeft: 8, fontFamily: 'var(--bac-font-mono)', fontSize: '0.75rem', color: 'var(--bac-text-muted)' }}>
                    ({profil.slug})
                  </span>
                  <div style={{ marginTop: 4, fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>{typeLabel(profil.type)}</div>
                </div>
                <span className={`bac-badge ${profil.actif ? 'bac-badge-success' : 'bac-badge-error'}`}>
                  {profil.actif ? 'Actif' : 'Inactif'}
                </span>
              </div>

              {/* Password row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)', minWidth: 100 }}>Mot de passe :</span>
                {editingPw === profil.id ? (
                  <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                    <input
                      type="text"
                      className="bac-input"
                      style={{ flex: 1, padding: '6px 10px', minHeight: 36 }}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Nouveau mot de passe"
                      autoFocus
                    />
                    <button className="bac-btn bac-btn-primary bac-btn-sm" onClick={() => handleUpdatePassword(profil.id)}>✓</button>
                    <button className="bac-btn bac-btn-ghost bac-btn-sm" onClick={() => { setEditingPw(null); setNewPw(''); }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {profil.mot_de_passe_clair ? (
                      <code style={{ fontFamily: 'var(--bac-font-mono)', fontSize: '1rem', fontWeight: 700, color: 'var(--bac-primary)' }}>
                        {profil.mot_de_passe_clair}
                      </code>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--bac-warning)' }}>⚠️ non visible</span>
                    )}
                    <button
                      className="bac-btn bac-btn-ghost bac-btn-sm"
                      onClick={() => { setEditingPw(profil.id); setNewPw(''); }}
                    >
                      🔑 Modifier
                    </button>
                  </div>
                )}
              </div>

              {/* Actions row (groupe-acteur only) */}
              {profil.type === 'groupe-acteur' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--bac-border)' }}>
                  <a href={`/bac/${profil.slug}`} className="bac-btn bac-btn-secondary bac-btn-sm">
                    👥 Gérer
                  </a>
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
            </div>
          ))}
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
