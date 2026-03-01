'use client';

// AdminThemes.tsx — Gestion des Révélations (scènes d'introduction scripted)
import { useEffect, useState, useCallback } from 'react';
import type { BacRevelation, BacRole, ScriptBloc, ItwQuestion, NotesRealisation } from '../../lib/bac/types';

const EMPTY_NOTES: NotesRealisation = { cadrage: '', rythme: '', silences: '', pieges: '', astuce: '' };

// ─── Éditeur complet ───────────────────────────────────────────────────────────
function RevelationEditor({
  item,
  roles,
  onClose,
  onToast,
}: {
  item: BacRevelation;
  roles: BacRole[];
  onClose: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [tab, setTab] = useState<'meta' | 'script' | 'itw' | 'notes'>('meta');
  const [form, setForm] = useState({
    titre: item.titre,
    description: item.description || '',
    ton_principal: item.ton_principal || '',
    ton_secondaire: item.ton_secondaire || '',
    duree_min: item.duree_min ?? 1,
    duree_max: item.duree_max ?? 3,
    fil_rouge: item.fil_rouge || '',
    script_json: (item.script_json || []) as ScriptBloc[],
    itw_json: (item.itw_json || []) as ItwQuestion[],
    notes_real_json: (item.notes_real_json || EMPTY_NOTES) as NotesRealisation,
    actif: item.actif,
  });

  const setField = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));
  const setNotes = (key: keyof NotesRealisation, val: string) =>
    setForm(p => ({ ...p, notes_real_json: { ...p.notes_real_json, [key]: val } }));

  async function save() {
    const res = await fetch('/bac/api/revelations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, ...form }),
    });
    if (res.ok) { onToast('Révélation enregistrée'); }
    else { onToast('Erreur', 'error'); }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer "${item.titre}" définitivement ?`)) return;
    const res = await fetch(`/bac/api/revelations?id=${item.id}`, { method: 'DELETE' });
    if (res.ok) { onToast('Révélation supprimée'); onClose(); }
    else { onToast('Erreur', 'error'); }
  }

  // ── Script helpers ──
  function addBloc(type: 'didascalie' | 'replique') {
    const bloc: ScriptBloc = type === 'didascalie'
      ? { type: 'didascalie', texte: '', style: 'intermediaire' }
      : { type: 'replique', role_id: '', directive: '', exemple: '', utilise_champ_perso: false };
    setField('script_json', [...form.script_json, bloc]);
  }
  function removeBloc(i: number) {
    setField('script_json', form.script_json.filter((_, idx) => idx !== i));
  }
  function moveBloc(i: number, dir: -1 | 1) {
    const arr = [...form.script_json];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setField('script_json', arr);
  }
  function updateBloc(i: number, patch: Partial<ScriptBloc>) {
    const arr = form.script_json.map((b, idx) => idx === i ? { ...b, ...patch } as ScriptBloc : b);
    setField('script_json', arr);
  }

  // ── ITW helpers ──
  function addItw() {
    setField('itw_json', [...form.itw_json, { role_id: '', question: '', reponse_variant_a: '', reponse_variant_b: '', reponse_variant_c: '' }]);
  }
  function removeItw(i: number) { setField('itw_json', form.itw_json.filter((_, idx) => idx !== i)); }
  function updateItw(i: number, patch: Partial<ItwQuestion>) {
    setField('itw_json', form.itw_json.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  }

  const TABS = [
    { id: 'meta', label: '📋 Métadonnées' },
    { id: 'script', label: `📝 Script (${form.script_json.length})` },
    { id: 'itw', label: `🎤 ITW (${form.itw_json.length})` },
    { id: 'notes', label: '🎥 Notes réal' },
  ] as const;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="bac-btn bac-btn-ghost bac-btn-sm" onClick={onClose}>← Retour</button>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>🌅 {form.titre}</h1>
          <span className={`bac-badge ${form.actif ? 'bac-badge-success' : 'bac-badge-error'}`}>
            {form.actif ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bac-btn bac-btn-ghost bac-btn-sm"
            onClick={() => { setField('actif', !form.actif); }}
          >{form.actif ? '🚫 Désactiver' : '✅ Activer'}</button>
          <button className="bac-btn bac-btn-ghost bac-btn-sm" style={{ color: 'var(--bac-error)' }} onClick={handleDelete}>🗑️ Supprimer</button>
          <button className="bac-btn bac-btn-primary" onClick={save}>💾 Enregistrer</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--bac-border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`bac-btn bac-btn-ghost bac-btn-sm`}
            style={{
              borderRadius: '8px 8px 0 0', borderBottom: tab === t.id ? '2px solid var(--bac-primary)' : '2px solid transparent',
              color: tab === t.id ? 'var(--bac-primary)' : 'var(--bac-text-secondary)', fontWeight: tab === t.id ? 700 : 400,
              marginBottom: -2,
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── TAB: Métadonnées ── */}
      {tab === 'meta' && (
        <div className="bac-card" style={{ padding: 24 }}>
          <div className="bac-form-group">
            <label className="bac-label">Titre</label>
            <input className="bac-input" value={form.titre} onChange={e => setField('titre', e.target.value)} />
          </div>
          <div className="bac-form-group">
            <label className="bac-label">Description (résumé admin)</label>
            <textarea className="bac-input bac-textarea" value={form.description} onChange={e => setField('description', e.target.value)} />
          </div>
          <div className="bac-form-row">
            <div className="bac-form-group">
              <label className="bac-label">Ton principal</label>
              <input className="bac-input" value={form.ton_principal} onChange={e => setField('ton_principal', e.target.value)} placeholder="ex: Solennel" />
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Ton secondaire</label>
              <input className="bac-input" value={form.ton_secondaire} onChange={e => setField('ton_secondaire', e.target.value)} placeholder="ex: Légèrement inquiet" />
            </div>
          </div>
          <div className="bac-form-row">
            <div className="bac-form-group">
              <label className="bac-label">Durée min (min)</label>
              <input type="number" className="bac-input" value={form.duree_min} min={1} max={60} onChange={e => setField('duree_min', parseInt(e.target.value) || 1)} />
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Durée max (min)</label>
              <input type="number" className="bac-input" value={form.duree_max} min={1} max={60} onChange={e => setField('duree_max', parseInt(e.target.value) || 3)} />
            </div>
          </div>
          <div className="bac-form-group">
            <label className="bac-label">🔴 Fil rouge (coordinateur uniquement)</label>
            <textarea className="bac-input bac-textarea" value={form.fil_rouge} onChange={e => setField('fil_rouge', e.target.value)} placeholder="Notes internes — non visibles par les acteurs" />
          </div>
        </div>
      )}

      {/* ── TAB: Script ── */}
      {tab === 'script' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className="bac-btn bac-btn-secondary bac-btn-sm" onClick={() => addBloc('didascalie')}>+ Didascalie</button>
            <button className="bac-btn bac-btn-primary bac-btn-sm" onClick={() => addBloc('replique')}>+ Réplique</button>
          </div>
          {form.script_json.length === 0 && (
            <div className="bac-empty"><p>Aucun bloc — ajoutez une didascalie ou une réplique</p></div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {form.script_json.map((bloc, i) => (
              <div key={i} className="bac-card" style={{ padding: 16, borderLeft: `4px solid ${bloc.type === 'didascalie' ? '#f59e0b' : 'var(--bac-primary)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className={`bac-badge ${bloc.type === 'didascalie' ? 'bac-badge-warning' : 'bac-badge-primary'}`}>
                    {bloc.type === 'didascalie' ? '🎭 Didascalie' : '💬 Réplique'}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => moveBloc(i, -1)} title="Monter">↑</button>
                    <button className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => moveBloc(i, 1)} title="Descendre">↓</button>
                    <button className="bac-btn bac-btn-ghost bac-btn-icon" style={{ color: 'var(--bac-error)' }} onClick={() => removeBloc(i)}>✕</button>
                  </div>
                </div>
                {bloc.type === 'didascalie' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <select className="bac-input bac-select" style={{ maxWidth: 240 }} value={bloc.style} onChange={e => updateBloc(i, { style: e.target.value as any })}>
                      <option value="ouverture">Ouverture</option>
                      <option value="intermediaire">Intermédiaire</option>
                      <option value="cloture">Clôture</option>
                      <option value="regard-camera">Regard caméra</option>
                    </select>
                    <textarea className="bac-input bac-textarea" style={{ minHeight: 64 }} value={bloc.texte} placeholder="Description de la scène…" onChange={e => updateBloc(i, { texte: e.target.value })} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="bac-form-row">
                      <div className="bac-form-group" style={{ margin: 0 }}>
                        <label className="bac-label">Rôle</label>
                        <select className="bac-input bac-select" value={bloc.role_id} onChange={e => updateBloc(i, { role_id: e.target.value })}>
                          <option value="">— Choisir —</option>
                          <option value="coordinateur">🎬 Coordinateur</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                        </select>
                      </div>
                      <div className="bac-form-group" style={{ margin: 0 }}>
                        <label className="bac-label">Didascalie (optionnel)</label>
                        <input className="bac-input" value={bloc.didascalie || ''} placeholder="ex: en chuchotant" onChange={e => updateBloc(i, { didascalie: e.target.value })} />
                      </div>
                    </div>
                    <div className="bac-form-group" style={{ margin: 0 }}>
                      <label className="bac-label">Directive de jeu</label>
                      <input className="bac-input" value={bloc.directive} placeholder="Intention — comment jouer cette réplique" onChange={e => updateBloc(i, { directive: e.target.value })} />
                    </div>
                    <div className="bac-form-group" style={{ margin: 0 }}>
                      <label className="bac-label">Exemple de réplique</label>
                      <textarea className="bac-input bac-textarea" style={{ minHeight: 56 }} value={bloc.exemple} placeholder="Texte suggéré…" onChange={e => updateBloc(i, { exemple: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: ITW ── */}
      {tab === 'itw' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <button className="bac-btn bac-btn-primary bac-btn-sm" onClick={addItw}>+ Question ITW</button>
          </div>
          {form.itw_json.length === 0 && (
            <div className="bac-empty"><p>Aucune question d'interview</p></div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {form.itw_json.map((q, i) => (
              <div key={i} className="bac-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600 }}>Question {i + 1}</span>
                  <button className="bac-btn bac-btn-ghost bac-btn-icon" style={{ color: 'var(--bac-error)' }} onClick={() => removeItw(i)}>✕</button>
                </div>
                <div className="bac-form-row">
                  <div className="bac-form-group" style={{ margin: 0 }}>
                    <label className="bac-label">Rôle ciblé</label>
                    <select className="bac-input bac-select" value={q.role_id} onChange={e => updateItw(i, { role_id: e.target.value })}>
                      <option value="">— Choisir —</option>
                      {roles.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                    </select>
                  </div>
                  <div className="bac-form-group" style={{ margin: 0, flex: 2 }}>
                    <label className="bac-label">Question</label>
                    <input className="bac-input" value={q.question} onChange={e => updateItw(i, { question: e.target.value })} placeholder="Question posée à l'acteur" />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {(['a', 'b', 'c'] as const).map(v => (
                    <div key={v} className="bac-form-group" style={{ margin: 0 }}>
                      <label className="bac-label">Variante {v.toUpperCase()}</label>
                      <textarea className="bac-input bac-textarea" style={{ minHeight: 48 }}
                        value={(q as any)[`reponse_variant_${v}`]}
                        onChange={e => updateItw(i, { [`reponse_variant_${v}`]: e.target.value } as any)}
                        placeholder={`Réponse selon variante ${v.toUpperCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: Notes réal ── */}
      {tab === 'notes' && (
        <div className="bac-card" style={{ padding: 24 }}>
          {([
            ['cadrage', '📷 Cadrage', 'Conseils de cadrage caméra…'],
            ['rythme', '⏱️ Rythme', 'Conseils sur le rythme de la scène…'],
            ['silences', '🤫 Silences', 'Moments de silence importants…'],
            ['pieges', '⚠️ Pièges', 'Erreurs à éviter…'],
            ['astuce', '💡 Astuce', 'Conseil pratique pour le réalisateur…'],
          ] as [keyof NotesRealisation, string, string][]).map(([key, label, placeholder]) => (
            <div key={key} className="bac-form-group">
              <label className="bac-label">{label}</label>
              <textarea className="bac-input bac-textarea" value={form.notes_real_json[key]} placeholder={placeholder}
                onChange={e => setNotes(key, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {/* Save bar */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="bac-btn bac-btn-primary" onClick={save}>💾 Enregistrer</button>
      </div>
    </div>
  );
}

// ─── Page liste ───────────────────────────────────────────────────────────────
export default function AdminRevelations() {
  const [items, setItems] = useState<BacRevelation[]>([]);
  const [roles, setRoles] = useState<BacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<BacRevelation | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [d, r] = await Promise.all([
        fetch('/bac/api/revelations').then(r => r.json()),
        fetch('/bac/api/roles').then(r => r.json()),
      ]);
      if (Array.isArray(d)) setItems(d);
      if (Array.isArray(r)) setRoles(r);
    } catch { } finally { setLoading(false); }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function createItem() {
    const res = await fetch('/bac/api/revelations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Nouvelle révélation' }),
    });
    if (res.ok) {
      const data = await res.json();
      await loadData();
      setEditItem(data);
    } else {
      showToast('Erreur', 'error');
    }
  }

  if (editItem) {
    return (
      <RevelationEditor
        item={editItem}
        roles={roles}
        onClose={() => { setEditItem(null); loadData(); }}
        onToast={showToast}
      />
    );
  }

  return (
    <div>
      <div className="bac-page-header bac-animate-in">
        <div>
          <h1>Révélations</h1>
          <p style={{ color: 'var(--bac-text-secondary)', marginTop: 4 }}>Scènes d'introduction scripted</p>
        </div>
        <button className="bac-btn bac-btn-primary" onClick={createItem}>+ Nouvelle révélation</button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="bac-spinner" /></div>
      ) : items.length === 0 ? (
        <div className="bac-empty bac-animate-in">
          <div className="bac-empty-icon">🌅</div>
          <p>Aucune révélation créée</p>
          <button className="bac-btn bac-btn-primary" style={{ marginTop: 16 }} onClick={createItem}>Créer la première révélation</button>
        </div>
      ) : (
        <div className="bac-grid bac-grid-2 bac-stagger">
          {items.map(item => (
            <div key={item.id} className="bac-card bac-card-interactive"
              style={{ opacity: item.actif ? 1 : 0.55, cursor: 'pointer', borderLeft: '4px solid #6366f1' }}
              onClick={() => setEditItem(item)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>🌅 {item.titre}</h3>
                <span className={`bac-badge ${item.actif ? 'bac-badge-success' : 'bac-badge-error'}`}>{item.actif ? 'Active' : 'Inactive'}</span>
              </div>
              {item.description && <p style={{ fontSize: '0.875rem', color: 'var(--bac-text-secondary)', marginTop: 8 }}>{item.description}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {item.ton_principal && <span className="bac-badge bac-badge-info">{item.ton_principal}</span>}
                <span className="bac-badge">⏱️ {item.duree_min}–{item.duree_max} min</span>
                <span className="bac-badge">📝 {(item.script_json || []).length} blocs</span>
                {(item.itw_json || []).length > 0 && <span className="bac-badge">🎤 {item.itw_json.length} ITW</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>{toast.msg}</div>}
    </div>
  );
}
