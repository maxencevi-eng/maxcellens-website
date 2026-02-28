'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { BacSession, BacRole, BacVariant, BacCasting, BacChoixScene, BacScene, ScriptBloc } from '../../lib/bac/types';

type Phase = 'loading' | 'casting' | 'scenes' | 'personnalisation' | 'pret';

interface CastingMember {
  prenom: string;
  role_id: string;
  variant_id: string;
}

export default function GroupeInterface({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<BacSession | null>(null);
  const [roles, setRoles] = useState<BacRole[]>([]);
  const [casting, setCasting] = useState<BacCasting[]>([]);
  const [choix, setChoix] = useState<BacChoixScene[]>([]);
  const [scenes, setScenes] = useState<BacScene[]>([]);
  const [memberCount, setMemberCount] = useState(2);
  const [members, setMembers] = useState<CastingMember[]>([]);
  const [currentActe, setCurrentActe] = useState(1);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [showCastingModal, setShowCastingModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [validatedScenes, setValidatedScenes] = useState<Set<string>>(new Set());
  const [saisies, setSaisies] = useState<Record<string, any>>({});

  // Load initial data
  useEffect(() => {
    loadData();
  }, [slug]);

  async function loadData() {
    try {
      // Get active session
      const sessRes = await fetch('/bac/api/sessions');
      const sessions = await sessRes.json();
      const active = Array.isArray(sessions) ? sessions.find((s: BacSession) =>
        (s.statut === 'en-cours' || s.statut === 'en-preparation') && s.groupes_actifs.includes(slug)
      ) : null;

      if (!active) {
        setPhase('loading');
        return;
      }
      setSession(active);

      // Get scenes from snapshot
      const snapshotScenes = active.snapshot_scenes_json || [];
      setScenes(snapshotScenes.filter((s: BacScene) => s.groupes_concernes.includes(slug)));

      // Get roles for this group
      const rolesRes = await fetch('/bac/api/roles');
      const allRoles = await rolesRes.json();
      setRoles(Array.isArray(allRoles) ? allRoles.filter((r: BacRole) => r.groupe_slug === slug && r.actif) : []);

      // Get existing casting
      const castRes = await fetch(`/bac/api/casting?session_id=${active.id}&groupe_slug=${slug}`);
      const castData = await castRes.json();
      if (Array.isArray(castData) && castData.length > 0) {
        setCasting(castData);
        // Check existing choices
        const choixRes = await fetch(`/bac/api/choix-scenes?session_id=${active.id}&groupe_slug=${slug}`);
        const choixData = await choixRes.json();
        if (Array.isArray(choixData)) {
          setChoix(choixData);
          if (choixData.length === 4 && choixData.every((c: BacChoixScene) => c.statut === 'valide')) {
            // Load saisies
            const saisiesRes = await fetch(`/bac/api/saisies?session_id=${active.id}&groupe_slug=${slug}`);
            const saisiesData = await saisiesRes.json();
            if (Array.isArray(saisiesData)) {
              const map: Record<string, any> = {};
              saisiesData.forEach((s: any) => { map[`${s.scene_id}_${s.bloc_index}`] = s; });
              setSaisies(map);
            }
            setPhase('personnalisation');
          } else {
            setPhase('scenes');
          }
        } else {
          setPhase('scenes');
        }
      } else {
        setPhase('casting');
      }
    } catch (e) {
      console.error(e);
    }
  }

  function showToastMsg(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ========== CASTING ==========
  function initMembers(count: number) {
    setMemberCount(count);
    setMembers(Array.from({ length: count }, () => ({ prenom: '', role_id: '', variant_id: '' })));
  }

  function updateMember(index: number, field: string, value: string) {
    setMembers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // Reset variant when role changes
      if (field === 'role_id') next[index].variant_id = '';
      return next;
    });
  }

  async function submitCasting() {
    if (!session) return;
    const res = await fetch('/bac/api/casting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        groupe_slug: slug,
        members: members.map(m => ({
          prenom: m.prenom,
          role_id: m.role_id || null,
          variant_id: m.variant_id || null,
        })),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setCasting(data);
      showToastMsg('Casting enregistré !');
      setPhase('scenes');
    }
  }

  // ========== SCENE CHOICE ==========
  function getScenesForActe(acte: number) {
    return scenes.filter(s => s.acte === String(acte));
  }

  async function selectScene(acte: number, sceneId: string) {
    if (!session) return;
    const res = await fetch('/bac/api/choix-scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, groupe_slug: slug, acte: String(acte), scene_id: sceneId }),
    });
    if (res.ok) {
      const data = await res.json();
      setChoix(prev => {
        const filtered = prev.filter(c => c.acte !== String(acte));
        return [...filtered, data];
      });
      if (acte < 4) setCurrentActe(acte + 1);
    }
  }

  async function validateChoices() {
    if (!session || choix.length < 4) return;
    if (!confirm('Les choix ne seront plus modifiables. Confirmer ?')) return;

    const res = await fetch('/bac/api/choix-scenes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, groupe_slug: slug }),
    });
    if (res.ok) {
      const data = await res.json();
      setChoix(data);
      showToastMsg('Choix validés !');
      setPhase('personnalisation');
    }
  }

  // ========== PERSONNALISATION ==========
  const chosenScenes = choix.map(c => scenes.find(s => s.id === c.scene_id)).filter(Boolean) as BacScene[];
  const currentScene = chosenScenes[currentSceneIndex];

  function getSaisieKey(sceneId: string, blocIndex: number) {
    return `${sceneId}_${blocIndex}`;
  }

  async function saveSaisie(sceneId: string, blocIndex: number, texte: string, acteurId?: string, champPersoValeur?: string) {
    if (!session) return;
    // Save to localStorage first
    const key = getSaisieKey(sceneId, blocIndex);
    const saisie = { ...saisies[key], texte_saisi: texte, acteur_id: acteurId, champ_perso_valeur: champPersoValeur };
    setSaisies(prev => ({ ...prev, [key]: saisie }));

    try {
      localStorage.setItem(`bac_draft_${key}`, JSON.stringify(saisie));
    } catch { }

    // Sync to DB
    await fetch('/bac/api/saisies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: session.id,
        groupe_slug: slug,
        scene_id: sceneId,
        bloc_index: blocIndex,
        texte_saisi: texte,
        acteur_id: acteurId || null,
        champ_perso_valeur: champPersoValeur || null,
      }),
    });
  }

  function validateScene(sceneId: string) {
    setValidatedScenes(prev => new Set([...prev, sceneId]));
    showToastMsg('Scène validée ✓');
    // Move to next scene
    const nextIndex = currentSceneIndex + 1;
    if (nextIndex < chosenScenes.length) {
      setCurrentSceneIndex(nextIndex);
    }
  }

  const allScenesValidated = chosenScenes.length === 4 && chosenScenes.every(s => validatedScenes.has(s.id));

  // ========== RENDER ==========
  if (phase === 'loading') {
    return (
      <div className="bac-mobile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        {!session ? (
          <div className="bac-empty">
            <div className="bac-empty-icon">🎬</div>
            <p>Aucune session active pour votre groupe</p>
            <button className="bac-btn bac-btn-secondary" style={{ marginTop: 16 }} onClick={loadData}>Réessayer</button>
          </div>
        ) : (
          <div className="bac-spinner" />
        )}
      </div>
    );
  }

  return (
    <div className="bac-mobile-page">
      {/* Header */}
      <div className="bac-mobile-header">
        <h1>🎬 {slug.charAt(0).toUpperCase() + slug.slice(1)}</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {phase !== 'casting' && (
            <button className="bac-btn bac-btn-ghost bac-btn-sm" onClick={() => setShowCastingModal(true)}>
              👥 Casting
            </button>
          )}
          {allScenesValidated && (
            <span className="bac-badge bac-badge-success">✅ Prêt</span>
          )}
        </div>
      </div>

      {/* Stepper */}
      <div style={{ padding: '16px 20px 0' }}>
        <div className="bac-stepper">
          <div className={`bac-step ${phase === 'casting' ? 'active' : 'completed'}`}>
            <div className="bac-step-number">{phase === 'casting' ? '1' : '✓'}</div>
            <span>Casting</span>
          </div>
          <div className={`bac-step-line ${phase !== 'casting' ? 'completed' : ''}`} />
          <div className={`bac-step ${phase === 'scenes' ? 'active' : phase === 'personnalisation' || phase === 'pret' ? 'completed' : ''}`}>
            <div className="bac-step-number">{phase === 'personnalisation' || phase === 'pret' ? '✓' : '2'}</div>
            <span>Scènes</span>
          </div>
          <div className={`bac-step-line ${phase === 'personnalisation' || phase === 'pret' ? 'completed' : ''}`} />
          <div className={`bac-step ${phase === 'personnalisation' ? 'active' : phase === 'pret' ? 'completed' : ''}`}>
            <div className="bac-step-number">{phase === 'pret' ? '✓' : '3'}</div>
            <span>Perso</span>
          </div>
        </div>
      </div>

      <div className="bac-mobile-content">
        {/* ===== CASTING PHASE ===== */}
        {phase === 'casting' && (
          <div className="bac-animate-in">
            {members.length === 0 ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <h2 className="bac-h2" style={{ marginBottom: 8 }}>Combien jouez-vous ?</h2>
                  <p style={{ color: 'var(--bac-text-secondary)' }}>Nombre de personnes dans votre groupe</p>
                </div>
                <div className="bac-number-selector">
                  <button type="button" onClick={() => setMemberCount(Math.max(1, memberCount - 1))}>−</button>
                  <span className="bac-number-value">{memberCount}</span>
                  <button type="button" onClick={() => setMemberCount(Math.min(5, memberCount + 1))}>+</button>
                </div>
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <button className="bac-btn bac-btn-primary bac-btn-lg" onClick={() => initMembers(memberCount)}>
                    C'est parti !
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="bac-h2" style={{ marginBottom: 20, textAlign: 'center' }}>Qui joue quoi ?</h2>
                <div className="bac-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {members.map((member, i) => {
                    const role = roles.find(r => r.id === member.role_id);
                    const variants = role?.variants || [];

                    return (
                      <div key={i} className="bac-card" style={{ padding: 20 }}>
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>Membre {i + 1}</div>
                        <div className="bac-form-group">
                          <label className="bac-label">Prénom</label>
                          <input
                            className="bac-input"
                            value={member.prenom}
                            onChange={e => updateMember(i, 'prenom', e.target.value)}
                            placeholder="Prénom"
                            style={{ fontSize: '1rem' }}
                          />
                        </div>
                        <div className="bac-form-group">
                          <label className="bac-label">Rôle</label>
                          <select className="bac-input bac-select" value={member.role_id} onChange={e => updateMember(i, 'role_id', e.target.value)}>
                            <option value="">Choisir un rôle...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                          </select>
                        </div>
                        {member.role_id && variants.length > 0 && (
                          <div className="bac-form-group">
                            <label className="bac-label">Style de jeu</label>
                            <div className="bac-radio-group">
                              {variants.sort((a, b) => a.lettre.localeCompare(b.lettre)).map(v => (
                                <label key={v.id} className={`bac-radio-label ${member.variant_id === v.id ? 'selected' : ''}`} style={{ cursor: 'pointer' }}>
                                  <input type="radio" name={`variant-${i}`} checked={member.variant_id === v.id} onChange={() => updateMember(i, 'variant_id', v.id)} />
                                  <span style={{ fontSize: '1.25rem' }}>{v.emoji}</span>
                                  <div>
                                    <strong>{v.nom}</strong>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)', margin: 0 }}>{v.description}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                            {/* Suggestion if same role with same variant */}
                            {members.filter((m, j) => j !== i && m.role_id === member.role_id && m.variant_id === member.variant_id && member.variant_id).length > 0 && (
                              <p className="bac-form-help" style={{ color: 'var(--bac-warning)', marginTop: 8 }}>
                                ⚠️ Un autre membre a le même rôle et variant — essayez un variant différent !
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="bac-mobile-bottom-bar">
                  <button
                    className="bac-btn bac-btn-primary bac-btn-lg"
                    style={{ width: '100%' }}
                    onClick={submitCasting}
                    disabled={members.some(m => !m.prenom)}
                  >
                    C'est parti ! 🎬
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== SCENE CHOICE PHASE ===== */}
        {phase === 'scenes' && (
          <div className="bac-animate-in">
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h2 className="bac-h2">Acte {currentActe}</h2>
              <p style={{ color: 'var(--bac-text-secondary)' }}>Choisissez votre scène</p>
            </div>

            {/* Acte tabs */}
            <div className="bac-tabs" style={{ marginBottom: 20 }}>
              {[1, 2, 3, 4].map(acte => {
                const chosen = choix.find(c => c.acte === String(acte));
                return (
                  <button
                    key={acte}
                    className={`bac-tab ${currentActe === acte ? 'active' : ''}`}
                    onClick={() => setCurrentActe(acte)}
                  >
                    {chosen ? '✓ ' : ''}Acte {acte}
                  </button>
                );
              })}
            </div>

            <div className="bac-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 100 }}>
              {getScenesForActe(currentActe).map(scene => {
                const isChosen = choix.find(c => c.acte === String(currentActe))?.scene_id === scene.id;
                return (
                  <div
                    key={scene.id}
                    className={`bac-scene-card ${isChosen ? 'selected' : ''}`}
                    onClick={() => selectScene(currentActe, scene.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{scene.titre}</h3>
                      {isChosen && <span className="bac-badge bac-badge-success">✓ Choisi</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>⏱️ {scene.duree_min}-{scene.duree_max} min</span>
                      <span className="bac-stars">{['⭐', '⭐⭐', '⭐⭐⭐'][scene.difficulte - 1]}</span>
                      {scene.ton_principal && <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>{scene.ton_principal}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {choix.length === 4 && (
              <div className="bac-mobile-bottom-bar">
                <button className="bac-btn bac-btn-success bac-btn-lg" style={{ width: '100%' }} onClick={validateChoices}>
                  Valider les 4 scènes ✅
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== PERSONNALISATION PHASE ===== */}
        {phase === 'personnalisation' && currentScene && (
          <div className="bac-animate-in">
            {/* Scene tabs */}
            <div className="bac-tabs" style={{ marginBottom: 20 }}>
              {chosenScenes.map((s, i) => (
                <button key={s.id} className={`bac-tab ${currentSceneIndex === i ? 'active' : ''}`} onClick={() => setCurrentSceneIndex(i)}>
                  {validatedScenes.has(s.id) ? '✓ ' : ''}Scène {i + 1}
                </button>
              ))}
            </div>

            <div className="bac-card" style={{ marginBottom: 16, padding: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem' }}>{currentScene.titre}</h3>
              <span className="bac-badge bac-badge-primary" style={{ marginTop: 4 }}>Acte {currentScene.acte}</span>
            </div>

            {/* Champ perso */}
            {currentScene.champ_perso_label && (
              <div className="bac-card" style={{ marginBottom: 16, padding: 16, borderLeft: '4px solid var(--bac-info)' }}>
                <label className="bac-label">{currentScene.champ_perso_label}</label>
                <p className="bac-form-help" style={{ marginBottom: 8 }}>
                  ex: {currentScene.champ_perso_exemple}
                </p>
                <input
                  className="bac-input"
                  placeholder={currentScene.champ_perso_exemple || 'Votre élément personnalisé'}
                  value={saisies[getSaisieKey(currentScene.id, -1)]?.champ_perso_valeur || ''}
                  onChange={e => saveSaisie(currentScene.id, -1, '', undefined, e.target.value)}
                  style={{ fontSize: '1rem' }}
                />
              </div>
            )}

            {/* Script blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 100 }}>
              {(currentScene.script_json || []).map((bloc: ScriptBloc, i: number) => {
                if (bloc.type === 'didascalie') {
                  return (
                    <div key={i} className="bac-script-didascalie">
                      {(bloc as any).texte}
                    </div>
                  );
                }

                const repBloc = bloc as any;
                const role = roles.find(r => r.id === repBloc.role_id);
                const saisieKey = getSaisieKey(currentScene.id, i);
                const saisie = saisies[saisieKey] || {};

                return (
                  <div key={i} className="bac-script-replique">
                    <div className="bac-script-role-name" style={{ color: role?.couleur || 'var(--bac-text)' }}>
                      {role?.nom || 'Rôle'}
                    </div>

                    {/* Assign actor */}
                    {casting.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <label className="bac-label" style={{ fontSize: '0.8125rem' }}>Qui dit cette réplique ?</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <label className={`bac-radio-label ${!saisie.acteur_id ? 'selected' : ''}`} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                            <input type="radio" name={`actor-${i}`} checked={!saisie.acteur_id} onChange={() => saveSaisie(currentScene.id, i, saisie.texte_saisi || '', undefined)} />
                            Non assigné
                          </label>
                          {casting.filter(c => c.role_id === repBloc.role_id || !repBloc.role_id).map(c => (
                            <label key={c.id} className={`bac-radio-label ${saisie.acteur_id === c.id ? 'selected' : ''}`} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                              <input type="radio" name={`actor-${i}`} checked={saisie.acteur_id === c.id} onChange={() => saveSaisie(currentScene.id, i, saisie.texte_saisi || '', c.id)} />
                              {c.prenom} {c.variant && `(${(c.variant as any)?.nom || ''})`}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bac-script-directive">{repBloc.directive}</div>
                    <div className="bac-script-exemple">"{repBloc.exemple}"</div>

                    <textarea
                      className="bac-input"
                      style={{ fontSize: '1rem', minHeight: 60 }}
                      placeholder="Vos mots, votre anecdote... (optionnel)"
                      value={saisie.texte_saisi || ''}
                      onChange={e => saveSaisie(currentScene.id, i, e.target.value, saisie.acteur_id)}
                    />
                  </div>
                );
              })}
            </div>

            <div className="bac-mobile-bottom-bar">
              <button
                className={`bac-btn bac-btn-lg ${validatedScenes.has(currentScene.id) ? 'bac-btn-success' : 'bac-btn-primary'}`}
                style={{ width: '100%' }}
                onClick={() => validateScene(currentScene.id)}
              >
                {validatedScenes.has(currentScene.id) ? '✓ Scène validée' : 'Valider cette scène'}
              </button>
            </div>
          </div>
        )}

        {/* ===== PRÊT ===== */}
        {allScenesValidated && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }} className="bac-animate-scale">
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
            <h2 className="bac-h2" style={{ marginBottom: 8 }}>Votre groupe est prêt !</h2>
            <p style={{ color: 'var(--bac-text-secondary)' }}>Toutes les scènes sont validées. En attendant le tournage...</p>
          </div>
        )}
      </div>

      {/* Casting modal */}
      {showCastingModal && (
        <div className="bac-modal-overlay" onClick={() => setShowCastingModal(false)}>
          <div className="bac-modal" onClick={e => e.stopPropagation()}>
            <div className="bac-modal-header">
              <h2 className="bac-h2">👥 Notre casting</h2>
              <button className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => setShowCastingModal(false)}>✕</button>
            </div>
            <div className="bac-modal-body">
              {casting.length === 0 ? (
                <p style={{ color: 'var(--bac-text-muted)' }}>Aucun casting enregistré</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {casting.map(c => (
                    <div key={c.id} className="bac-status-card" style={{ borderLeftColor: (c.role as any)?.couleur || 'var(--bac-primary)' }}>
                      <div>
                        <strong>{c.prenom}</strong>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>
                          {(c.role as any)?.nom || 'Sans rôle'} — {(c.variant as any)?.emoji || ''} {(c.variant as any)?.nom || ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bac-modal-footer">
              <button className="bac-btn bac-btn-secondary" onClick={() => { setShowCastingModal(false); setPhase('casting'); }}>
                ✏️ Modifier le casting
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>{toast.msg}</div>}
    </div>
  );
}
