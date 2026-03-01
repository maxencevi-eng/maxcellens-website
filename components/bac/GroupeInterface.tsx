'use client';

import { useEffect, useState } from 'react';
import type { BacSession, BacRole, BacCasting, BacChoixScene, BacScene, ScriptBloc } from '../../lib/bac/types';
import DeroulAnimation from './DeroulAnimation';

type Phase = 'loading' | 'casting' | 'scenes' | 'personnalisation' | 'pret';

interface CastingMember {
  prenom: string;
  role_id: string;
  variant_id: string;
}

export default function GroupeInterface({ slug, nbScenesRequis = 4 }: { slug: string; nbScenesRequis?: number }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [session, setSession] = useState<BacSession | null>(null);
  const [roles, setRoles] = useState<BacRole[]>([]);
  const [casting, setCasting] = useState<BacCasting[]>([]);
  const [choix, setChoix] = useState<BacChoixScene[]>([]);
  const [scenes, setScenes] = useState<BacScene[]>([]);
  const [memberCount, setMemberCount] = useState(2);
  const [members, setMembers] = useState<CastingMember[]>([]);
  const [currentActe, setCurrentActe] = useState(1);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [detailScene, setDetailScene] = useState<BacScene | null>(null);
  const [showSceneDetail, setShowSceneDetail] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [validatedScenes, setValidatedScenes] = useState<Set<string>>(new Set());
  const [saisies, setSaisies] = useState<Record<string, any>>({});
  const [editingPretSceneId, setEditingPretSceneId] = useState<string | null>(null);
  // Global script & déroulé
  const [cameFromPret, setCameFromPret] = useState(false);
  const [showDeroule, setShowDeroule] = useState(false);
  const [showGlobalScript, setShowGlobalScript] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalCasting, setGlobalCasting] = useState<BacCasting[]>([]);
  const [globalChoix, setGlobalChoix] = useState<BacChoixScene[]>([]);
  const [globalSaisies, setGlobalSaisies] = useState<Record<string, any>>({});
  const [globalScenes, setGlobalScenes] = useState<BacScene[]>([]);
  const [globalIntroScene, setGlobalIntroScene] = useState<any>(null);
  const [globalFinaleScene, setGlobalFinaleScene] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [slug]);

  async function loadData() {
    try {
      // Get active session
      const sessRes = await fetch('/bac/api/sessions');
      const sessions = await sessRes.json();
      let active = Array.isArray(sessions) ? sessions.find((s: BacSession) =>
        (s.statut === 'en-cours' || s.statut === 'en-preparation') && s.groupes_actifs.includes(slug)
      ) : null;

      // If no active session for this group, allow admin to view/manage any session for the group
      if (!active) {
        try {
          const authRes = await fetch('/bac/api/auth');
          const authData = await authRes.json();
          if (authData?.authenticated && authData.profil_type === 'admin') {
            // admin can open any session that includes the group
            active = Array.isArray(sessions) ? sessions.find((s: BacSession) => s.groupes_actifs.includes(slug)) : null;
          }
        } catch (_) {}
      }

      if (!active) {
        return;
      }
      setSession(active);

      // Get scenes dynamically from API (not from snapshot, so new scenes appear immediately)
      const scenesRes = await fetch(`/bac/api/scenes?groupe=${encodeURIComponent(slug)}`);
      const scenesData = await scenesRes.json();
      setScenes(Array.isArray(scenesData) ? scenesData : []);

      // Get roles for this group
      const rolesRes = await fetch('/bac/api/roles');
      const allRoles = await rolesRes.json();
      setRoles(Array.isArray(allRoles) ? allRoles.filter((r: BacRole) => r.actif) : []);

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
          if (nbScenesRequis === 0 || (choixData.length >= nbScenesRequis && choixData.every((c: BacChoixScene) => c.statut === 'valide'))) {
            // Load saisies
            const saisiesRes = await fetch(`/bac/api/saisies?session_id=${active.id}&groupe_slug=${slug}`);
            const saisiesData = await saisiesRes.json();
            if (Array.isArray(saisiesData)) {
              const map: Record<string, any> = {};
              saisiesData.forEach((s: any) => { map[`${s.scene_id}_${s.bloc_index}`] = s; });
              setSaisies(map);
            }
            if (choixData.length > 0 && choixData.every((c: BacChoixScene) => c.statut === 'valide')) {
              setValidatedScenes(new Set(choixData.map((c: BacChoixScene) => c.scene_id)));
              setPhase('pret');
            } else {
              setPhase('personnalisation');
            }
          } else {
            setPhase('scenes');
          }
        } else {
          setPhase('scenes');
        }
      } else {
        setPhase(nbScenesRequis === 0 ? 'personnalisation' : 'casting');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDataLoaded(true);
    }
  }

  function showToastMsg(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function loadGlobalScript() {
    setShowGlobalScript(true);
    if (!session || globalScenes.length > 0) return;
    setGlobalLoading(true);
    setShowGlobalScript(true);
    try {
      const groups: string[] = session.groupes_actifs || [];
      const [allScenesRes, allRolesRes, ...groupResults] = await Promise.all([
        fetch('/bac/api/scenes').then(r => r.json()),
        fetch('/bac/api/roles').then(r => r.json()),
        ...groups.map(g =>
          Promise.all([
            fetch(`/bac/api/casting?session_id=${session.id}&groupe_slug=${g}`).then(r => r.json()),
            fetch(`/bac/api/choix-scenes?session_id=${session.id}&groupe_slug=${g}`).then(r => r.json()),
            fetch(`/bac/api/saisies?session_id=${session.id}&groupe_slug=${g}`).then(r => r.json()),
          ])
        ),
        fetch(`/bac/api/saisies?session_id=${session.id}&groupe_slug=intro`).then(r => r.json()),
        fetch(`/bac/api/saisies?session_id=${session.id}&groupe_slug=finale`).then(r => r.json()),
      ]);

      const introSaisies = groupResults[groups.length];
      const finaleSaisies = groupResults[groups.length + 1];
      const perGroupResults = groupResults.slice(0, groups.length);

      const allCastArr: BacCasting[] = perGroupResults.flatMap(([cast]) => Array.isArray(cast) ? cast : []);
      const allChoixArr: BacChoixScene[] = perGroupResults.flatMap(([, choix]) => Array.isArray(choix) ? choix : []);
      const saisiesMap: Record<string, any> = {};
      perGroupResults.forEach(([, , saisiesArr]) => {
        if (Array.isArray(saisiesArr)) {
          saisiesArr.forEach((s: any) => { saisiesMap[`${s.scene_id}_${s.bloc_index}`] = s; });
        }
      });
      if (Array.isArray(introSaisies)) introSaisies.forEach((s: any) => { saisiesMap[`intro_${s.scene_id}_${s.bloc_index}`] = s; });
      if (Array.isArray(finaleSaisies)) finaleSaisies.forEach((s: any) => { saisiesMap[`finale_${s.scene_id}_${s.bloc_index}`] = s; });

      const allScenesArr: BacScene[] = Array.isArray(allScenesRes) ? allScenesRes : [];
      setGlobalScenes(allScenesArr);
      setGlobalCasting(allCastArr);
      setGlobalChoix(allChoixArr);
      setGlobalSaisies(saisiesMap);
      setGlobalIntroScene(session.revelation || null);
      setGlobalFinaleScene(session.denouement || null);
      setRoles(Array.isArray(allRolesRes) ? allRolesRes.filter((r: BacRole) => r.actif) : roles);
    } catch (e) { console.error(e); }
    setGlobalLoading(false);
  }

  function renderGlobalScriptScene(scene: BacScene, groupSlug: string, prefix: string) {
    return (
      <div key={`${prefix}-${scene.id}`} className="bac-card" style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          {prefix !== 'intro' && prefix !== 'finale' && (
            <><span className="bac-badge bac-badge-primary" style={{ marginRight: 8 }}>Acte {scene.acte}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--bac-text-muted)', marginRight: 8 }}>{groupSlug}</span></>
          )}
          <h4 style={{ fontWeight: 700, fontSize: '1rem', marginTop: 6 }}>{scene.titre}</h4>
        </div>
        {scene.champ_perso_label && (() => {
          const key = prefix === 'intro' || prefix === 'finale'
            ? `${prefix}_${scene.id}_-1`
            : `${scene.id}_-1`;
          const champSaisie = globalSaisies[key];
          return champSaisie?.champ_perso_valeur ? (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bac-bg-tertiary)', borderRadius: 8, borderLeft: '3px solid var(--bac-info)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{scene.champ_perso_label} :</span>{' '}
              <span style={{ color: 'var(--bac-primary)', fontWeight: 700 }}>{champSaisie.champ_perso_valeur}</span>
            </div>
          ) : null;
        })()}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(scene.script_json || []).map((bloc: ScriptBloc, i: number) => {
            if (bloc.type === 'didascalie') {
              return <div key={i} className="bac-script-didascalie">{(bloc as any).texte}</div>;
            }
            const repBloc = bloc as any;
            const role = roles.find(r => r.id === repBloc.role_id);
            const saisieKey = prefix === 'intro' || prefix === 'finale'
              ? `${prefix}_${scene.id}_${i}`
              : `${scene.id}_${i}`;
            const saisie = globalSaisies[saisieKey] || {};
            const acteur = saisie.acteur_id ? globalCasting.find((c: BacCasting) => c.id === saisie.acteur_id) : null;
            return (
              <div key={i} className="bac-script-replique">
                <div className="bac-script-role-name" style={{ color: role?.couleur || 'var(--bac-text)' }}>
                  {role?.nom || repBloc.role_id || 'Rôle'}{acteur ? ` — ${acteur.prenom}` : ''}
                </div>
                <div className="bac-script-directive">{repBloc.directive}</div>
                {saisie.texte_saisi ? (
                  <div style={{ fontStyle: 'italic', color: 'var(--bac-primary)', padding: '8px 12px', background: 'var(--bac-bg-tertiary)', borderRadius: 6 }}>
                    "{saisie.texte_saisi}"
                  </div>
                ) : (
                  <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
      setPhase(nbScenesRequis === 0 ? 'personnalisation' : 'scenes');
    }
  }

  // ========== SCENE CHOICE ==========
  function getScenesForActe(acte: number) {
    return scenes.filter(s => s.acte === String(acte));
  }

  async function selectScene(_acte: number, sceneId: string) {
    // Open a detail modal instead of immediate selection. User confirms choice there.
    const scene = scenes.find(s => s.id === sceneId) || null;
    if (!scene) return;
    setDetailScene(scene);
    setShowSceneDetail(true);
  }

  async function confirmSelectScene(acte: number, sceneId: string) {
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
      setShowSceneDetail(false);
      setDetailScene(null);
      // Do not auto-advance; user chooses when to go to next act
    }
  }

  async function validateChoices() {
    if (!session || choix.length < nbScenesRequis) return;

    const res = await fetch('/bac/api/choix-scenes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, groupe_slug: slug }),
    });
    if (res.ok) {
      const data = await res.json();
      setChoix(data);
      showToastMsg('Choix validés !');
      if (cameFromPret) {
        setCameFromPret(false);
        setPhase('pret');
      } else {
        setPhase('personnalisation');
      }
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
    const newValidated = new Set([...validatedScenes, sceneId]);
    setValidatedScenes(newValidated);
    showToastMsg('Scène validée ✓');
    const nextIndex = currentSceneIndex + 1;
    if (nextIndex < chosenScenes.length) {
      setCurrentSceneIndex(nextIndex);
    }
    // All scenes validated → move to pret
    if (chosenScenes.every(s => newValidated.has(s.id))) {
      setPhase('pret');
    }
  }


  // ========== RENDER ==========
  if (phase === 'loading') {
    return (
      <div className="bac-mobile-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        {!dataLoaded ? (
          <div className="bac-spinner" />
        ) : (
          <div className="bac-empty">
            <div className="bac-empty-icon">🎬</div>
            <p>Aucune session active pour votre groupe</p>
            <button className="bac-btn bac-btn-secondary" style={{ marginTop: 16 }} onClick={loadData}>Réessayer</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bac-mobile-page">
      {/* Header */}
      <div className="bac-mobile-header">
        <h1>🎬 {slug.charAt(0).toUpperCase() + slug.slice(1)}</h1>
        {phase === 'pret' && (
          <span className="bac-badge bac-badge-success" style={{ fontSize: '0.78rem', flexShrink: 0 }}>✅ Prêt</span>
        )}
      </div>

      {/* Stepper */}
      {phase !== 'pret' && <div style={{ padding: '16px 20px 0' }}>
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
      </div>}

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
                <div className="bac-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 130 }}>
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
              {Array.from({ length: nbScenesRequis }, (_, i) => i + 1).map(acte => {
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

            <div className="bac-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 120 }}>
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

            {/* Scene detail modal */}
            {showSceneDetail && detailScene && (
              <div className="bac-modal-overlay" onClick={() => { setShowSceneDetail(false); setDetailScene(null); }}>
                <div className="bac-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
                  <div className="bac-modal-header">
                    <h2 className="bac-h2">{detailScene.titre}</h2>
                    <button className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => { setShowSceneDetail(false); setDetailScene(null); }}>✕</button>
                  </div>
                  <div className="bac-modal-body">
                    <p style={{ color: 'var(--bac-text-secondary)' }}>{detailScene.ton_principal} — {detailScene.ton_secondaire}</p>
                    <p style={{ marginTop: 12 }}>{detailScene.fil_rouge}</p>
                    <div style={{ marginTop: 12 }}>
                      <strong>Durée :</strong> {detailScene.duree_min}-{detailScene.duree_max} min • <strong>Difficulté</strong> {detailScene.difficulte}
                    </div>
                    {detailScene.champ_perso_label && (
                      <div style={{ marginTop: 12 }}>
                        <strong>Champ perso :</strong> {detailScene.champ_perso_label} — ex: {detailScene.champ_perso_exemple}
                      </div>
                    )}
                  </div>
                  <div className="bac-modal-footer">
                    <button className="bac-btn bac-btn-secondary" onClick={() => { setShowSceneDetail(false); setDetailScene(null); }}>Annuler</button>
                    <button className="bac-btn bac-btn-primary" onClick={() => confirmSelectScene(currentActe, detailScene.id)}>Choisir cette scène</button>
                  </div>
                </div>
              </div>
            )}

            {choix.length >= nbScenesRequis && nbScenesRequis > 0 && (
              <div className="bac-mobile-bottom-bar" style={{ backdropFilter: 'blur(12px)', background: 'rgba(15,15,26,0.95)', borderTop: '1px solid rgba(99,102,241,0.3)', padding: '14px 20px' }}>
                <button
                  onClick={validateChoices}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '1rem',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 24px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(34,197,94,0.35)',
                    letterSpacing: '0.01em',
                  }}
                >
                  ✅ Valider les {nbScenesRequis} scène{nbScenesRequis > 1 ? 's' : ''}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 160 }}>
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

                    {/* Assign actor — only own group, only matching role */}
                    {(() => {
                      const eligible = casting.filter(c => c.role_id === repBloc.role_id);
                      if (eligible.length === 0) return null;
                      return (
                        <div style={{ marginBottom: 12 }}>
                          <label className="bac-label" style={{ fontSize: '0.8125rem' }}>Qui dit cette réplique ?</label>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {eligible.map(c => (
                              <label key={c.id} className={`bac-radio-label ${saisie.acteur_id === c.id ? 'selected' : ''}`} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                <input type="radio" name={`actor-${i}`} checked={saisie.acteur_id === c.id} onChange={() => saveSaisie(currentScene.id, i, saisie.texte_saisi || '', c.id)} />
                                {c.prenom} {c.variant && `(${(c.variant as any)?.nom || ''})`}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

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

            <div className="bac-mobile-bottom-bar" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className={`bac-btn bac-btn-lg ${validatedScenes.has(currentScene.id) ? 'bac-btn-success' : 'bac-btn-primary'}`}
                style={{ width: '100%' }}
                onClick={() => validateScene(currentScene.id)}
              >
                {validatedScenes.has(currentScene.id) ? '✓ Scène validée' : 'Valider cette scène'}
              </button>
              <button className="bac-btn bac-btn-ghost bac-btn-sm" style={{ width: '100%' }} onClick={() => setPhase('scenes')}>
                ← Modifier les scènes
              </button>
            </div>
          </div>
        )}

        {/* ===== PRÊT ===== */}
        {phase === 'pret' && (
          <div className="bac-animate-in" style={{ paddingBottom: 40 }}>

            {/* ── Carte d'actions globales ── */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.06))',
              border: '1.5px solid rgba(34,197,94,0.28)',
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(34,197,94,0.15)',
                  border: '2px solid rgba(34,197,94,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.375rem', flexShrink: 0,
                }}>✅</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#16a34a' }}>Votre groupe est prêt !</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)', marginTop: 2 }}>
                    Script validé · Casting confirmé
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Déroulé en premier = info globale de l'animation */}
                <button
                  onClick={() => setShowDeroule(true)}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(99,102,241,0.35)',
                    background: 'rgba(99,102,241,0.08)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    outline: 'none',
                  }}
                >
                  <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>🎞️</span>
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--bac-primary)' }}>Déroulé</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--bac-text-muted)', lineHeight: 1.2 }}>Programme du jour</span>
                </button>
                {/* Script global */}
                <button
                  onClick={() => loadGlobalScript()}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    border: '1.5px solid rgba(6,182,212,0.35)',
                    background: 'rgba(6,182,212,0.08)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    outline: 'none',
                  }}
                >
                  <span style={{ fontSize: '1.375rem', lineHeight: 1 }}>🌍</span>
                  <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--bac-info)' }}>Script global</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--bac-text-muted)', lineHeight: 1.2 }}>Tous les groupes</span>
                </button>
              </div>
            </div>

            {/* Résumé casting */}
            {casting.length > 0 && (
              <div className="bac-card" style={{ marginBottom: 16, padding: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>👥 Notre casting</h3>
                {casting.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--bac-border)' }}>
                    <strong>{c.prenom}</strong>
                    <span style={{ fontSize: '0.875rem', color: 'var(--bac-text-secondary)' }}>
                      {(c.role as any)?.nom || '—'}
                      {(c.variant as any)?.emoji ? ` — ${(c.variant as any).emoji} ${(c.variant as any).nom}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Script personnalisé */}
            {choix.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>📜 Notre script</h3>
                {[...choix].sort((a, b) => a.acte.localeCompare(b.acte)).map(c => {
                  const scene = scenes.find(s => s.id === c.scene_id);
                  if (!scene) return null;
                  const champSaisie = saisies[`${scene.id}_-1`];
                  const isEditing = editingPretSceneId === scene.id;
                  return (
                    <div key={c.id} className="bac-card" style={{ marginBottom: 16, padding: 20, border: isEditing ? '2px solid var(--bac-primary)' : undefined }}>
                      {/* Scene header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <span className="bac-badge bac-badge-primary">Acte {c.acte}</span>
                          <h4 style={{ fontWeight: 700, fontSize: '1.0625rem', marginTop: 6 }}>{scene.titre}</h4>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>⏱️ {scene.duree_min}-{scene.duree_max} min</span>
                          {isEditing ? (
                            <button
                              className="bac-btn bac-btn-success bac-btn-sm"
                              onClick={() => { setEditingPretSceneId(null); showToastMsg('Modifications enregistrées ✓'); }}
                            >
                              ✓ Enregistrer
                            </button>
                          ) : (
                            <button
                              className="bac-btn bac-btn-ghost bac-btn-sm"
                              onClick={() => setEditingPretSceneId(scene.id)}
                            >
                              ✏️ Modifier
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Champ perso */}
                      {scene.champ_perso_label && (
                        isEditing ? (
                          <div className="bac-card" style={{ marginBottom: 12, padding: 12, borderLeft: '4px solid var(--bac-info)' }}>
                            <label className="bac-label">{scene.champ_perso_label}</label>
                            <p className="bac-form-help" style={{ marginBottom: 6 }}>ex: {scene.champ_perso_exemple}</p>
                            <input
                              className="bac-input"
                              placeholder={scene.champ_perso_exemple || ''}
                              value={champSaisie?.champ_perso_valeur || ''}
                              onChange={e => saveSaisie(scene.id, -1, '', undefined, e.target.value)}
                              style={{ fontSize: '1rem' }}
                            />
                          </div>
                        ) : champSaisie?.champ_perso_valeur ? (
                          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bac-bg-tertiary)', borderRadius: 8, borderLeft: '3px solid var(--bac-info)' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{scene.champ_perso_label} :</span>{' '}
                            <span style={{ color: 'var(--bac-primary)', fontWeight: 700 }}>{champSaisie.champ_perso_valeur}</span>
                          </div>
                        ) : null
                      )}

                      {/* Script blocs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(scene.script_json || []).map((bloc: ScriptBloc, i: number) => {
                          if (bloc.type === 'didascalie') {
                            return <div key={i} className="bac-script-didascalie">{(bloc as any).texte}</div>;
                          }
                          const repBloc = bloc as any;
                          const role = roles.find(r => r.id === repBloc.role_id);
                          const saisie = saisies[`${scene.id}_${i}`] || {};
                          const acteur = saisie.acteur_id ? casting.find(cst => cst.id === saisie.acteur_id) : null;

                          if (isEditing) {
                            return (
                              <div key={i} className="bac-script-replique">
                                <div className="bac-script-role-name" style={{ color: role?.couleur || 'var(--bac-text)' }}>
                                  {role?.nom || 'Rôle'}
                                </div>
                                {(() => {
                                  const eligible = casting.filter(c => c.role_id === repBloc.role_id);
                                  if (eligible.length === 0) return null;
                                  return (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                      {eligible.map(cst => (
                                        <label key={cst.id} className={`bac-radio-label ${saisie.acteur_id === cst.id ? 'selected' : ''}`} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                          <input type="radio" name={`pret-actor-${scene.id}-${i}`} checked={saisie.acteur_id === cst.id} onChange={() => saveSaisie(scene.id, i, saisie.texte_saisi || '', cst.id)} />
                                          {cst.prenom}
                                        </label>
                                      ))}
                                    </div>
                                  );
                                })()}
                                <div className="bac-script-directive">{repBloc.directive}</div>
                                <textarea
                                  className="bac-input"
                                  style={{ fontSize: '0.9375rem', minHeight: 52, marginTop: 6 }}
                                  placeholder={`"${repBloc.exemple}" (optionnel)`}
                                  value={saisie.texte_saisi || ''}
                                  onChange={e => saveSaisie(scene.id, i, e.target.value, saisie.acteur_id)}
                                />
                              </div>
                            );
                          }

                          return (
                            <div key={i} className="bac-script-replique">
                              <div className="bac-script-role-name" style={{ color: role?.couleur || 'var(--bac-text)' }}>
                                {role?.nom || 'Rôle'}{acteur ? ` — ${acteur.prenom}` : ''}
                              </div>
                              <div className="bac-script-directive">{repBloc.directive}</div>
                              {saisie.texte_saisi ? (
                                <div style={{ fontStyle: 'italic', color: 'var(--bac-primary)', padding: '8px 12px', background: 'var(--bac-bg-tertiary)', borderRadius: 6 }}>
                                  "{saisie.texte_saisi}"
                                </div>
                              ) : (
                                <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Boutons modification */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <button className="bac-btn bac-btn-ghost bac-btn-lg" style={{ width: '100%' }} onClick={() => { setCameFromPret(true); setPhase('scenes'); }}>
                ← Modifier les scènes
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>{toast.msg}</div>}

      {/* ── Déroulé modal ── */}
      {showDeroule && (
        <div className="bac-modal-overlay" onClick={() => setShowDeroule(false)}>
          <div className="bac-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="bac-modal-header">
              <h2 className="bac-h2">🎞️ Déroulé de l'animation</h2>
              <button className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => setShowDeroule(false)}>✕</button>
            </div>
            <div className="bac-modal-body" style={{ paddingBottom: 24 }}>
              <DeroulAnimation compact />
            </div>
          </div>
        </div>
      )}

      {/* ── Script global modal ── */}
      {showGlobalScript && (
        <div className="bac-modal-overlay" onClick={() => setShowGlobalScript(false)}>
          <div className="bac-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 740, maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="bac-modal-header" style={{ position: 'sticky', top: 0, background: 'var(--bac-surface)', zIndex: 1 }}>
              <h2 className="bac-h2">🌍 Script global</h2>
              <button className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => setShowGlobalScript(false)}>✕</button>
            </div>
            <div className="bac-modal-body" style={{ paddingBottom: 24 }}>
              {globalLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="bac-spinner" /></div>
              ) : (
                <>
                  {/* INTRO */}
                  {globalIntroScene && (
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--bac-info)', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--bac-info)' }}>
                        🎬 INTRO
                      </h3>
                      {renderGlobalScriptScene(globalIntroScene, 'intro', 'intro')}
                    </div>
                  )}

                  {/* Scènes par acte */}
                  {(() => {
                    const validatedEntries = globalChoix
                      .filter(c => c.statut === 'valide')
                      .map(c => ({ choix: c, scene: globalScenes.find(s => s.id === c.scene_id) }))
                      .filter(e => e.scene)
                      .sort((a, b) => {
                        const diff = Number(a.choix.acte) - Number(b.choix.acte);
                        return diff !== 0 ? diff : a.choix.groupe_slug.localeCompare(b.choix.groupe_slug);
                      });
                    if (validatedEntries.length === 0) return (
                      <div className="bac-empty"><p>Aucune scène validée</p></div>
                    );
                    let lastActe: string | null = null;
                    return validatedEntries.map(({ choix, scene }) => {
                      const showActe = String(choix.acte) !== lastActe;
                      if (showActe) lastActe = String(choix.acte);
                      return (
                        <div key={`${choix.groupe_slug}-${scene!.id}`}>
                          {showActe && (
                            <h3 style={{ fontWeight: 800, fontSize: '1.125rem', marginTop: 16, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--bac-border)' }}>
                              Acte {choix.acte}
                            </h3>
                          )}
                          {renderGlobalScriptScene(scene!, choix.groupe_slug, `${choix.groupe_slug}`)}
                        </div>
                      );
                    });
                  })()}

                  {/* FINALE */}
                  {globalFinaleScene && (
                    <div style={{ marginTop: 24 }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.125rem', color: '#22c55e', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #22c55e' }}>
                        🎤 FINALE
                      </h3>
                      {renderGlobalScriptScene(globalFinaleScene, 'finale', 'finale')}
                    </div>
                  )}

                  {!globalIntroScene && !globalFinaleScene && globalChoix.filter(c => c.statut === 'valide').length === 0 && (
                    <div className="bac-empty"><p>Le script global n'est pas encore disponible</p></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
