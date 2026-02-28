'use client';

import { useEffect, useState, useCallback } from 'react';
import type { BacScene, BacProfil, BacRole, ScriptBloc } from '../../lib/bac/types';

const ACTE_LABELS: Record<string, string> = {
  intro: 'Intro (fixe)',
  '1': 'Acte 1',
  '2': 'Acte 2',
  '3': 'Acte 3',
  '4': 'Acte 4',
  final: 'Final (fixe)',
};

const DIFFICULTY_LABELS = ['⭐', '⭐⭐', '⭐⭐⭐'];

export default function AdminScenes() {
  const [scenes, setScenes] = useState<BacScene[]>([]);
  const [groupes, setGroupes] = useState<BacProfil[]>([]);
  const [roles, setRoles] = useState<BacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editScene, setEditScene] = useState<BacScene | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [filterActe, setFilterActe] = useState<string>('');
  const [filterGroupe, setFilterGroupe] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, p, r] = await Promise.all([
        fetch('/bac/api/scenes').then(r => r.json()),
        fetch('/bac/api/profils').then(r => r.json()),
        fetch('/bac/api/roles').then(r => r.json()),
      ]);
      if (Array.isArray(s)) setScenes(s);
      if (Array.isArray(p)) setGroupes(p.filter((x: BacProfil) => x.type === 'groupe-acteur' && x.actif));
      if (Array.isArray(r)) setRoles(r);
    } catch { } finally { setLoading(false); }
  }

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function createScene() {
    const res = await fetch('/bac/api/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: 'Nouvelle scène', acte: '1' }),
    });
    if (res.ok) {
      const data = await res.json();
      setEditScene(data);
      setShowEditor(true);
      loadData();
    }
  }

  const filteredScenes = scenes.filter(s => {
    if (filterActe && s.acte !== filterActe) return false;
    if (filterGroupe && !s.groupes_concernes.includes(filterGroupe)) return false;
    return true;
  });

  if (showEditor && editScene) {
    return (
      <SceneEditor
        scene={editScene}
        groupes={groupes}
        roles={roles}
        onClose={() => { setShowEditor(false); setEditScene(null); loadData(); }}
        onToast={showToast}
      />
    );
  }

  return (
    <div>
      <div className="bac-page-header bac-animate-in">
        <div>
          <h1>Scènes</h1>
          <p style={{ color: 'var(--bac-text-secondary)', marginTop: 4 }}>{scenes.length} scènes au total</p>
        </div>
        <button className="bac-btn bac-btn-primary" onClick={createScene}>
          + Nouvelle scène
        </button>
      </div>

      {/* Filters */}
      <div className="bac-card bac-animate-in" style={{ marginBottom: 24, padding: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Filtres :</span>
          <select className="bac-input bac-select" style={{ maxWidth: 160, minHeight: 36, padding: '6px 10px' }} value={filterActe} onChange={e => setFilterActe(e.target.value)}>
            <option value="">Tous les actes</option>
            {Object.entries(ACTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="bac-input bac-select" style={{ maxWidth: 180, minHeight: 36, padding: '6px 10px' }} value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}>
            <option value="">Tous les groupes</option>
            {groupes.map(g => <option key={g.slug} value={g.slug}>{g.nom}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="bac-spinner" /></div>
      ) : filteredScenes.length === 0 ? (
        <div className="bac-empty bac-animate-in">
          <div className="bac-empty-icon">🎬</div>
          <p>Aucune scène{filterActe || filterGroupe ? ' avec ces filtres' : ''}</p>
        </div>
      ) : (
        <div className="bac-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredScenes.map(scene => (
            <div
              key={scene.id}
              className="bac-card bac-card-interactive"
              onClick={() => { setEditScene(scene); setShowEditor(true); }}
              style={{ cursor: 'pointer', opacity: scene.actif ? 1 : 0.5 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="bac-badge bac-badge-primary">{ACTE_LABELS[scene.acte]}</span>
                  <strong style={{ fontSize: '1rem' }}>{scene.titre}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="bac-text-sm" style={{ color: 'var(--bac-text-muted)' }}>
                    {scene.duree_min}-{scene.duree_max} min
                  </span>
                  <span className="bac-stars">{DIFFICULTY_LABELS[scene.difficulte - 1]}</span>
                  <span className={`bac-badge ${scene.actif ? 'bac-badge-success' : 'bac-badge-error'}`}>
                    {scene.actif ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {scene.groupes_concernes.map(g => {
                  const groupe = groupes.find(x => x.slug === g);
                  return (
                    <span key={g} className="bac-badge" style={{ background: (groupe?.couleur || '#888') + '20', color: groupe?.couleur || '#888' }}>
                      {groupe?.nom || g}
                    </span>
                  );
                })}
                {scene.ton_principal && <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>• {scene.ton_principal}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>{toast.msg}</div>}
    </div>
  );
}

/* ============================================================
   Scene Editor — full page editor for a single scene
   ============================================================ */
function SceneEditor({ scene, groupes, roles, onClose, onToast }: {
  scene: BacScene;
  groupes: BacProfil[];
  roles: BacRole[];
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState({ ...scene });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'meta' | 'script' | 'itw' | 'notes'>('meta');

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  async function save() {
    setSaving(true);
    const res = await fetch('/bac/api/scenes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      onToast('Scène sauvegardée', 'success');
    } else {
      onToast('Erreur de sauvegarde', 'error');
    }
    setSaving(false);
  }

  // Script block helpers
  function addScriptBlock(type: 'didascalie' | 'replique') {
    const blocks = [...(form.script_json || [])];
    if (type === 'didascalie') {
      blocks.push({ type: 'didascalie', texte: '', style: 'intermediaire' });
    } else {
      blocks.push({ type: 'replique', role_id: '', directive: '', exemple: '', utilise_champ_perso: false });
    }
    update('script_json', blocks);
  }

  function updateBlock(index: number, field: string, value: any) {
    const blocks = [...(form.script_json || [])];
    blocks[index] = { ...blocks[index], [field]: value };
    update('script_json', blocks);
  }

  function removeBlock(index: number) {
    const blocks = [...(form.script_json || [])];
    blocks.splice(index, 1);
    update('script_json', blocks);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const blocks = [...(form.script_json || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
    update('script_json', blocks);
  }

  // ITW helpers
  function addItw() {
    const itws = [...(form.itw_json || [])];
    itws.push({ role_id: '', question: '', reponse_variant_a: '', reponse_variant_b: '', reponse_variant_c: '' });
    update('itw_json', itws);
  }

  function updateItw(index: number, field: string, value: string) {
    const itws = [...(form.itw_json || [])];
    itws[index] = { ...itws[index], [field]: value };
    update('itw_json', itws);
  }

  function removeItw(index: number) {
    const itws = [...(form.itw_json || [])];
    itws.splice(index, 1);
    update('itw_json', itws);
  }

  const relevantRoles = roles.filter(r => r.actif && form.groupes_concernes.includes(r.groupe_slug));

  return (
    <div className="bac-animate-in">
      <div className="bac-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="bac-btn bac-btn-ghost" onClick={onClose}>← Retour</button>
          <h1>{form.titre || 'Sans titre'}</h1>
          <span className="bac-badge bac-badge-primary">{ACTE_LABELS[form.acte]}</span>
        </div>
        <button className="bac-btn bac-btn-primary" onClick={save} disabled={saving}>
          {saving ? <span className="bac-spinner" style={{ width: 18, height: 18 }} /> : '💾 Sauvegarder'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bac-tabs" style={{ marginBottom: 24 }}>
        {(['meta', 'script', 'itw', 'notes'] as const).map(t => (
          <button key={t} className={`bac-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {{ meta: '📋 Métadonnées', script: '📝 Script', itw: '🎤 ITW', notes: '🎥 Notes réal' }[t]}
          </button>
        ))}
      </div>

      {/* Tab: Metadata */}
      {tab === 'meta' && (
        <div className="bac-card bac-animate-fade">
          <div className="bac-form-row">
            <div className="bac-form-group" style={{ flex: 2 }}>
              <label className="bac-label">Titre</label>
              <input className="bac-input" value={form.titre} onChange={e => update('titre', e.target.value)} />
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Acte</label>
              <select className="bac-input bac-select" value={form.acte} onChange={e => update('acte', e.target.value)}>
                {Object.entries(ACTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="bac-form-row">
            <div className="bac-form-group">
              <label className="bac-label">Ton principal</label>
              <input className="bac-input" value={form.ton_principal} onChange={e => update('ton_principal', e.target.value)} placeholder="ex: Comique" />
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Ton secondaire</label>
              <input className="bac-input" value={form.ton_secondaire} onChange={e => update('ton_secondaire', e.target.value)} placeholder="ex: Gênant" />
            </div>
          </div>

          <div className="bac-form-row">
            <div className="bac-form-group">
              <label className="bac-label">Durée min (min)</label>
              <input type="number" className="bac-input" value={form.duree_min} onChange={e => update('duree_min', parseInt(e.target.value) || 1)} min={1} />
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Durée max (min)</label>
              <input type="number" className="bac-input" value={form.duree_max} onChange={e => update('duree_max', parseInt(e.target.value) || 3)} min={1} />
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Difficulté</label>
              <select className="bac-input bac-select" value={form.difficulte} onChange={e => update('difficulte', parseInt(e.target.value))}>
                <option value={1}>⭐ Facile</option>
                <option value={2}>⭐⭐ Moyen</option>
                <option value={3}>⭐⭐⭐ Difficile</option>
              </select>
            </div>
          </div>

          <div className="bac-form-group">
            <label className="bac-label">Groupes concernés</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {groupes.map(g => (
                <label
                  key={g.slug}
                  className={`bac-radio-label ${form.groupes_concernes.includes(g.slug) ? 'selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={form.groupes_concernes.includes(g.slug)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        update('groupes_concernes', [...form.groupes_concernes, g.slug]);
                      } else {
                        update('groupes_concernes', form.groupes_concernes.filter((s: string) => s !== g.slug));
                      }
                    }}
                  />
                  <span className="bac-color-dot" style={{ backgroundColor: g.couleur }} />
                  {g.nom}
                </label>
              ))}
            </div>
          </div>

          <div className="bac-form-row">
            <div className="bac-form-group">
              <label className="bac-label">Intervenants min</label>
              <input type="number" className="bac-input" value={form.nb_intervenants_min} onChange={e => update('nb_intervenants_min', parseInt(e.target.value) || 1)} min={1} />
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Intervenants max</label>
              <input type="number" className="bac-input" value={form.nb_intervenants_max} onChange={e => update('nb_intervenants_max', parseInt(e.target.value) || 5)} min={1} />
            </div>
          </div>

          <div className="bac-divider" />

          <div className="bac-form-group">
            <label className="bac-label">Fil rouge (coordinateur uniquement)</label>
            <textarea className="bac-input bac-textarea" value={form.fil_rouge} onChange={e => update('fil_rouge', e.target.value)} placeholder="Comment cette scène s'accroche à la révélation..." />
          </div>

          <div className="bac-divider" />

          <h3 className="bac-h3" style={{ marginBottom: 16 }}>Champ de personnalisation (optionnel)</h3>
          <div className="bac-form-row">
            <div className="bac-form-group">
              <label className="bac-label">Label</label>
              <input className="bac-input" value={form.champ_perso_label || ''} onChange={e => update('champ_perso_label', e.target.value || null)} placeholder="ex: Un outil interne à citer" />
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Exemple</label>
              <input className="bac-input" value={form.champ_perso_exemple || ''} onChange={e => update('champ_perso_exemple', e.target.value || null)} placeholder="ex: Teams, Notion, Monday…" />
            </div>
            <div className="bac-form-group">
              <label className="bac-label">Réplique cible (n°)</label>
              <input type="number" className="bac-input" value={form.champ_perso_replique_cible || ''} onChange={e => update('champ_perso_replique_cible', parseInt(e.target.value) || null)} min={0} />
            </div>
          </div>

          <div className="bac-form-group" style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <label className="bac-radio-label" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={form.actif} onChange={e => update('actif', e.target.checked)} />
              Scène active
            </label>
          </div>
        </div>
      )}

      {/* Tab: Script */}
      {tab === 'script' && (
        <div className="bac-animate-fade">
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button className="bac-btn bac-btn-secondary" onClick={() => addScriptBlock('didascalie')}>+ Didascalie</button>
            <button className="bac-btn bac-btn-primary" onClick={() => addScriptBlock('replique')}>+ Réplique</button>
          </div>

          {(!form.script_json || form.script_json.length === 0) ? (
            <div className="bac-empty">
              <div className="bac-empty-icon">📝</div>
              <p>Aucun bloc dans le script</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.script_json.map((block: ScriptBloc, i: number) => (
                <div key={i} className="bac-card" style={{
                  padding: 16,
                  borderLeft: block.type === 'replique' ? `4px solid ${relevantRoles.find(r => r.id === (block as any).role_id)?.couleur || 'var(--bac-border)'}` : '4px solid var(--bac-text-muted)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="bac-badge" style={{ background: block.type === 'replique' ? 'var(--bac-primary-50)' : 'var(--bac-surface-active)' }}>
                      {block.type === 'replique' ? `Réplique #${i}` : 'Didascalie'}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="bac-btn bac-btn-ghost bac-btn-sm bac-btn-icon" onClick={() => moveBlock(i, -1)} disabled={i === 0}>↑</button>
                      <button className="bac-btn bac-btn-ghost bac-btn-sm bac-btn-icon" onClick={() => moveBlock(i, 1)} disabled={i === form.script_json.length - 1}>↓</button>
                      <button className="bac-btn bac-btn-ghost bac-btn-sm bac-btn-icon" style={{ color: 'var(--bac-error)' }} onClick={() => removeBlock(i)}>✕</button>
                    </div>
                  </div>

                  {block.type === 'didascalie' ? (
                    <>
                      <textarea className="bac-input bac-textarea" style={{ minHeight: 60 }} value={(block as any).texte} onChange={e => updateBlock(i, 'texte', e.target.value)} placeholder="Texte de la didascalie..." />
                      <select className="bac-input bac-select" style={{ marginTop: 8, maxWidth: 200 }} value={(block as any).style} onChange={e => updateBlock(i, 'style', e.target.value)}>
                        <option value="ouverture">Ouverture</option>
                        <option value="intermediaire">Intermédiaire</option>
                        <option value="cloture">Clôture</option>
                        <option value="regard-camera">Regard caméra</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <div className="bac-form-row">
                        <div className="bac-form-group">
                          <label className="bac-label">Rôle</label>
                          <select className="bac-input bac-select" value={(block as any).role_id} onChange={e => updateBlock(i, 'role_id', e.target.value)}>
                            <option value="">Sélectionner...</option>
                            {relevantRoles.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="bac-form-group">
                        <label className="bac-label">Directive</label>
                        <input className="bac-input" value={(block as any).directive} onChange={e => updateBlock(i, 'directive', e.target.value)} placeholder="Intention de la réplique" />
                      </div>
                      <div className="bac-form-group">
                        <label className="bac-label">Exemple de formulation</label>
                        <textarea className="bac-input bac-textarea" style={{ minHeight: 60 }} value={(block as any).exemple} onChange={e => updateBlock(i, 'exemple', e.target.value)} placeholder="Base suggérée..." />
                      </div>
                      <div className="bac-form-group">
                        <label className="bac-label">Didascalie de réplique (opt.)</label>
                        <input className="bac-input" value={(block as any).didascalie || ''} onChange={e => updateBlock(i, 'didascalie', e.target.value)} placeholder="ex: en chuchotant" />
                      </div>
                      <label className="bac-radio-label" style={{ cursor: 'pointer', maxWidth: 280 }}>
                        <input type="checkbox" checked={(block as any).utilise_champ_perso || false} onChange={e => updateBlock(i, 'utilise_champ_perso', e.target.checked)} />
                        Utilise [ÉLÉMENT PERSONNALISÉ]
                      </label>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: ITW */}
      {tab === 'itw' && (
        <div className="bac-animate-fade">
          <button className="bac-btn bac-btn-primary" onClick={addItw} style={{ marginBottom: 20 }}>
            + Nouvelle question ITW
          </button>

          {(!form.itw_json || form.itw_json.length === 0) ? (
            <div className="bac-empty">
              <div className="bac-empty-icon">🎤</div>
              <p>Aucune question ITW</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.itw_json.map((itw: any, i: number) => (
                <div key={i} className="bac-card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="bac-badge bac-badge-info">Question {i + 1}</span>
                    <button className="bac-btn bac-btn-ghost bac-btn-sm" style={{ color: 'var(--bac-error)' }} onClick={() => removeItw(i)}>✕ Supprimer</button>
                  </div>
                  <div className="bac-form-group">
                    <label className="bac-label">Rôle ciblé</label>
                    <select className="bac-input bac-select" value={itw.role_id} onChange={e => updateItw(i, 'role_id', e.target.value)}>
                      <option value="">Sélectionner...</option>
                      {relevantRoles.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                    </select>
                  </div>
                  <div className="bac-form-group">
                    <label className="bac-label">Question</label>
                    <input className="bac-input" value={itw.question} onChange={e => updateItw(i, 'question', e.target.value)} />
                  </div>
                  <div className="bac-form-row">
                    <div className="bac-form-group">
                      <label className="bac-label">Réponse Variant A</label>
                      <textarea className="bac-input bac-textarea" style={{ minHeight: 50 }} value={itw.reponse_variant_a} onChange={e => updateItw(i, 'reponse_variant_a', e.target.value)} />
                    </div>
                    <div className="bac-form-group">
                      <label className="bac-label">Réponse Variant B</label>
                      <textarea className="bac-input bac-textarea" style={{ minHeight: 50 }} value={itw.reponse_variant_b} onChange={e => updateItw(i, 'reponse_variant_b', e.target.value)} />
                    </div>
                    <div className="bac-form-group">
                      <label className="bac-label">Réponse Variant C</label>
                      <textarea className="bac-input bac-textarea" style={{ minHeight: 50 }} value={itw.reponse_variant_c} onChange={e => updateItw(i, 'reponse_variant_c', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Notes de réalisation */}
      {tab === 'notes' && (
        <div className="bac-card bac-animate-fade">
          <h3 className="bac-h3" style={{ marginBottom: 16 }}>Notes de réalisation (coordinateur uniquement)</h3>
          {(['cadrage', 'rythme', 'silences', 'pieges', 'astuce'] as const).map(field => (
            <div key={field} className="bac-form-group">
              <label className="bac-label" style={{ textTransform: 'capitalize' }}>
                {{ cadrage: '🎥 Cadrage', rythme: '⏱️ Rythme', silences: '🤫 Silences à garder', pieges: '⚠️ Pièges à éviter', astuce: '💡 Astuce de tournage' }[field]}
              </label>
              <textarea
                className="bac-input bac-textarea"
                style={{ minHeight: 60 }}
                value={(form.notes_real_json as any)?.[field] || ''}
                onChange={e => update('notes_real_json', { ...(form.notes_real_json || {}), [field]: e.target.value })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
