'use client';

import { useEffect, useState } from 'react';
import type { BacHistoire, BacHistoireScene, BacRevelation, BacDenouement, BacScene } from '../../lib/bac/types';

const ACTE_LABELS: Record<string, string> = {
  intro: 'Intro', '1': 'Acte 1', '2': 'Acte 2', '3': 'Acte 3', '4': 'Acte 4', final: 'Final',
};
const ACTE_ORDER: Record<string, number> = {
  intro: -1, '1': 1, '2': 2, '3': 3, '4': 4, final: 99,
};

// ─── Éditeur ──────────────────────────────────────────────────────────────────
function HistoireEditor({
  item,
  revelations,
  denouements,
  allScenes,
  onClose,
  onToast,
}: {
  item: BacHistoire;
  revelations: BacRevelation[];
  denouements: BacDenouement[];
  allScenes: BacScene[];
  onClose: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'meta' | 'scenes'>('meta');
  const [form, setForm] = useState({
    titre: item.titre,
    description: item.description || '',
    revelation_id: item.revelation_id || '',
    denouement_id: item.denouement_id || '',
    actif: item.actif,
  });
  // Ordered list of scene IDs
  const [linkedSceneIds, setLinkedSceneIds] = useState<string[]>(
    (item.scenes || []).sort((a, b) => a.ordre - b.ordre).map(hs => hs.scene_id)
  );
  const [saving, setSaving] = useState(false);

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    const payload = {
      id: item.id,
      titre: form.titre,
      description: form.description,
      revelation_id: form.revelation_id || null,
      denouement_id: form.denouement_id || null,
      actif: form.actif,
      scene_ids: linkedSceneIds,
    };
    const res = await fetch('/bac/api/histoires', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) { onToast('Histoire sauvegardée ✓'); onClose(); }
    else onToast('Erreur lors de la sauvegarde', 'error');
  }

  async function handleDelete() {
    if (!confirm('Supprimer cette histoire ? Les sessions liées perdront leur histoire.')) return;
    const res = await fetch(`/bac/api/histoires?id=${item.id}`, { method: 'DELETE' });
    if (res.ok) { onToast('Histoire supprimée'); onClose(); }
    else onToast('Erreur', 'error');
  }

  function moveScene(idx: number, dir: -1 | 1) {
    const next = [...linkedSceneIds];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setLinkedSceneIds(next);
  }

  function removeScene(sceneId: string) {
    setLinkedSceneIds(prev => prev.filter(id => id !== sceneId));
  }

  function addScene(sceneId: string) {
    if (!linkedSceneIds.includes(sceneId)) setLinkedSceneIds(prev => [...prev, sceneId]);
  }

  const linkedScenes = linkedSceneIds
    .map(id => allScenes.find(s => s.id === id))
    .filter(Boolean) as BacScene[];

  const availableScenes = allScenes
    .filter(s => s.actif && !linkedSceneIds.includes(s.id))
    .sort((a, b) => (ACTE_ORDER[a.acte] ?? 0) - (ACTE_ORDER[b.acte] ?? 0));

  return (
    <div className="bac-animate-in">
      {/* Page header */}
      <div className="bac-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="bac-btn bac-btn-ghost" onClick={onClose}>← Retour</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{form.titre || 'Sans titre'}</h1>
          {!form.actif && <span className="bac-badge" style={{ background: 'var(--bac-text-muted)', color: 'white' }}>Inactif</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bac-btn bac-btn-ghost" style={{ color: 'var(--bac-error)' }} onClick={handleDelete}>🗑️ Supprimer</button>
          <button className="bac-btn bac-btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="bac-spinner" style={{ width: 18, height: 18 }} /> : '💾 Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bac-tabs" style={{ marginBottom: 24 }}>
        {(['meta', 'scenes'] as const).map(t => (
          <button key={t} className={`bac-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'meta' ? '📋 Métadonnées' : `🎬 Scènes (${linkedSceneIds.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Métadonnées */}
      {tab === 'meta' && (
        <div className="bac-card bac-animate-fade" style={{ padding: 24 }}>
          <div className="bac-form-group">
            <label className="bac-label">Titre</label>
            <input className="bac-input" value={form.titre} onChange={e => update('titre', e.target.value)} placeholder="Titre de l'histoire" />
          </div>
          <div className="bac-form-group">
            <label className="bac-label">Description</label>
            <textarea className="bac-input bac-textarea" style={{ minHeight: 80 }} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Description (interne)" />
          </div>
          <div className="bac-form-row">
            <div className="bac-form-group">
              <label className="bac-label">Révélation (scène d'intro)</label>
              <select className="bac-input bac-select" value={form.revelation_id} onChange={e => update('revelation_id', e.target.value)}>
                <option value="">— Aucune —</option>
                {revelations.map(r => <option key={r.id} value={r.id}>{r.titre}</option>)}
              </select>
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Dénouement (scène finale)</label>
              <select className="bac-input bac-select" value={form.denouement_id} onChange={e => update('denouement_id', e.target.value)}>
                <option value="">— Aucun —</option>
                {denouements.map(d => <option key={d.id} value={d.id}>{d.titre}</option>)}
              </select>
            </div>
          </div>
          <div className="bac-form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.actif} onChange={e => update('actif', e.target.checked)} />
              <span className="bac-label" style={{ margin: 0 }}>Histoire active</span>
            </label>
          </div>
        </div>
      )}

      {/* Tab: Scènes */}
      {tab === 'scenes' && (
        <div className="bac-animate-fade">
          {/* Linked scenes */}
          <div className="bac-card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 className="bac-h3" style={{ marginBottom: 16 }}>Scènes liées à l'histoire ({linkedScenes.length})</h3>
            {linkedScenes.length === 0 ? (
              <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}>Aucune scène liée. Ajoutez-en depuis le catalogue ci-dessous.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {linkedScenes.map((scene, idx) => (
                  <div key={scene.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bac-bg-tertiary)', borderRadius: 8, border: '1px solid var(--bac-border)' }}>
                    <span className="bac-badge bac-badge-primary" style={{ fontSize: '0.6875rem', flexShrink: 0 }}>{ACTE_LABELS[scene.acte] || scene.acte}</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.875rem' }}>{scene.titre}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--bac-text-muted)' }}>
                      {(scene.groupes_concernes || []).join(', ')}
                    </span>
                    <button className="bac-btn bac-btn-ghost" style={{ padding: '2px 6px', fontSize: '0.8125rem' }} onClick={() => moveScene(idx, -1)} disabled={idx === 0}>↑</button>
                    <button className="bac-btn bac-btn-ghost" style={{ padding: '2px 6px', fontSize: '0.8125rem' }} onClick={() => moveScene(idx, 1)} disabled={idx === linkedScenes.length - 1}>↓</button>
                    <button className="bac-btn bac-btn-ghost" style={{ padding: '2px 6px', fontSize: '0.8125rem', color: 'var(--bac-error)' }} onClick={() => removeScene(scene.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catalogue */}
          <div className="bac-card" style={{ padding: 20 }}>
            <h3 className="bac-h3" style={{ marginBottom: 16 }}>Catalogue de scènes disponibles</h3>
            {availableScenes.length === 0 ? (
              <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}>Toutes les scènes actives sont déjà liées.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {availableScenes.map(scene => (
                  <div key={scene.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bac-border)' }}>
                    <span className="bac-badge bac-badge-primary" style={{ fontSize: '0.6875rem', flexShrink: 0 }}>{ACTE_LABELS[scene.acte] || scene.acte}</span>
                    <span style={{ flex: 1, fontSize: '0.875rem' }}>{scene.titre}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--bac-text-muted)' }}>
                      {(scene.groupes_concernes || []).join(', ')}
                    </span>
                    <button className="bac-btn bac-btn-primary" style={{ padding: '4px 10px', fontSize: '0.8125rem' }} onClick={() => addScene(scene.id)}>+ Ajouter</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Liste principale ──────────────────────────────────────────────────────────
export default function AdminHistoires() {
  const [histoires, setHistoires] = useState<BacHistoire[]>([]);
  const [revelations, setRevelations] = useState<BacRevelation[]>([]);
  const [denouements, setDenouements] = useState<BacDenouement[]>([]);
  const [allScenes, setAllScenes] = useState<BacScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<BacHistoire | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [h, r, d, s] = await Promise.all([
        fetch('/bac/api/histoires').then(x => x.json()),
        fetch('/bac/api/revelations').then(x => x.json()),
        fetch('/bac/api/denouements').then(x => x.json()),
        fetch('/bac/api/scenes').then(x => x.json()),
      ]);
      if (Array.isArray(h)) setHistoires(h);
      if (Array.isArray(r)) setRevelations(r.filter((x: BacRevelation) => x.actif));
      if (Array.isArray(d)) setDenouements(d.filter((x: BacDenouement) => x.actif));
      if (Array.isArray(s)) setAllScenes(s.filter((x: BacScene) => x.actif));
    } catch { } finally { setLoading(false); }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function createHistoire() {
    const res = await fetch('/bac/api/histoires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Nouvelle histoire' }),
    });
    if (res.ok) {
      const data = await res.json();
      setEditItem(data);
      setShowEditor(true);
      loadData();
    }
  }

  if (showEditor && editItem) {
    return (
      <HistoireEditor
        item={editItem}
        revelations={revelations}
        denouements={denouements}
        allScenes={allScenes}
        onClose={() => { setShowEditor(false); setEditItem(null); loadData(); }}
        onToast={showToast}
      />
    );
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="bac-spinner" /></div>;

  return (
    <div className="bac-animate-in">
      {toast && (
        <div className={`bac-toast ${toast.type === 'error' ? 'bac-toast-error' : 'bac-toast-success'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bac-page-header">
        <h1 className="bac-h1">📖 Histoires</h1>
        <button className="bac-btn bac-btn-primary" onClick={createHistoire}>+ Nouvelle histoire</button>
      </div>

      {histoires.length === 0 ? (
        <div className="bac-empty">
          <div className="bac-empty-icon">📖</div>
          <p>Aucune histoire créée</p>
          <button className="bac-btn bac-btn-primary" style={{ marginTop: 16 }} onClick={createHistoire}>Créer la première histoire</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {histoires.map(h => {
            const sceneCount = (h.scenes || []).length;
            return (
              <div key={h.id} className="bac-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, opacity: h.actif ? 1 : 0.6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: '1rem' }}>{h.titre}</strong>
                    {!h.actif && <span className="bac-badge" style={{ background: 'var(--bac-text-muted)', color: 'white', fontSize: '0.6875rem' }}>Inactif</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {h.revelation ? (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--bac-info)' }}>🌅 {h.revelation.titre}</span>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>🌅 Aucune révélation</span>
                    )}
                    {h.denouement ? (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--bac-success)' }}>🎞️ {h.denouement.titre}</span>
                    ) : (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>🎞️ Aucun dénouement</span>
                    )}
                    <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>🎬 {sceneCount} scène{sceneCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <button className="bac-btn bac-btn-secondary" style={{ flexShrink: 0 }} onClick={() => { setEditItem(h); setShowEditor(true); }}>
                  ✏️ Modifier
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
