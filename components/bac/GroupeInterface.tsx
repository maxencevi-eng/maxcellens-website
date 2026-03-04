'use client';

import { useEffect, useState } from 'react';
import type { BacSession, BacRole, BacCasting, BacChoixScene, BacScene, ScriptBloc } from '../../lib/bac/types';
import DeroulAnimation from './DeroulAnimation';

type Phase = 'loading' | 'casting' | 'scenes' | 'personnalisation' | 'pret';

interface CastingMember {
  id?: string;
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
  const [detailScene, setDetailScene] = useState<BacScene | null>(null);
  const [showSceneDetail, setShowSceneDetail] = useState(false);
  const [detailLockedScene, setDetailLockedScene] = useState<any | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [validatedScenes, setValidatedScenes] = useState<Set<string>>(new Set());
  const [saisies, setSaisies] = useState<Record<string, any>>({});
  const [editingPretSceneId, setEditingPretSceneId] = useState<string | null>(null);
  const [phaseBeforeCasting, setPhaseBeforeCasting] = useState<Phase | null>(null);
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
  const [globalGroupes, setGlobalGroupes] = useState<any[]>([]);

  // helper that updates phase and keeps localStorage in sync
  function setPhasePersist(p: Phase) {
    setPhase(p);
    if (session) {
      try {
        const key = `bac_phase_${session.id}_${slug}`;
        if (p === 'pret') {
          localStorage.setItem(key, 'pret');
        } else {
          localStorage.removeItem(key);
          // if we left the ready state, clear any server marker so coord view updates
          clearReadyMarker();
        }
      } catch {}
    }
  }

  // helper that scrolls both window and the mobile page container
  function scrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo(0, 0);
    const el = document.querySelector('.bac-mobile-page');
    if (el && 'scrollTo' in el) {
      (el as any).scrollTo({ top: 0, behavior: 'smooth' });
      (el as any).scrollTo(0, 0);
    }
  }

  // scroll view to the "Votre groupe est prêt" header when present
  function scrollToReady() {
    const header = document.getElementById('group-ready-header');
    if (header) {
      header.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      scrollTop();
    }
  }

  // scroll to ready header when moving into "pret" phase
  useEffect(() => {
    if (phase === 'pret') {
      scrollToReady();
      const t1 = setTimeout(scrollToReady, 100);
      const t2 = setTimeout(scrollToReady, 300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [phase]);

  // scroll to stepper when entering casting, scenes or personnalisation phase
  function scrollToStepper() {
    const el = document.querySelector('.bac-stepper');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else scrollTop();
  }

  useEffect(() => {
    if (phase === 'casting' || phase === 'scenes' || phase === 'personnalisation') {
      scrollToStepper();
      const t1 = setTimeout(scrollToStepper, 100);
      const t2 = setTimeout(scrollToStepper, 300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [phase]);

  // whenever we enter "pret", prefetch global data so we can overlay other groups' edits
  useEffect(() => {
    if (phase === 'pret') {
      refreshGlobalData();
    }
  }, [phase]);

  // also refresh global data when window regains focus (mimic TechniqueInterface behaviour)
  useEffect(() => {
    const onFocus = () => {
      if (phase === 'pret') refreshGlobalData();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [phase]);

  // mark group as ready (phase "pret")
  function clearReadyMarker() {
    if (!session || chosenScenes.length === 0) return;
    // overwrite the special saisie with empty text to disable the flag
    saveSaisie(chosenScenes[0].id, -1, '');
  }

  function markReady() {
    setPhasePersist('pret');
    // scroll towards ready header repeatedly
    scrollToReady();
    setTimeout(scrollToReady, 150);
    setTimeout(scrollToReady, 400);
    // add a special saisie row so coordination can see the group is truly ready
    if (chosenScenes.length > 0) {
      // use first scene id as target; bloc_index -1 is a sentinel value
      saveSaisie(chosenScenes[0].id, -1, '__group_ready__');
    }
  }

  // helper to return any existing saisie with custom text for the given scene/bloc
  // across all groups (used in "pret" read-only view to display other groups' edits)
  function getAnySaisie(sceneId: string, blocIndex: number) {
    // return any saisie containing custom text or an actor assignment for the given
    // scene+bloc, regardless of groupe. globalSaisies entries may lack text but
    // still hold an acteur_id, which we need to propagate.
    const predicate = (s: any) =>
      s.scene_id === sceneId && s.bloc_index === blocIndex && (s.texte_saisi || s.acteur_id);
    // first look in our local saisies
    const local = Object.values(saisies).find(predicate);
    if (local) return local;
    // fall back to any global saisies
    return Object.values(globalSaisies).find(predicate);
  }

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

      // helper: read stored phase from previous visits
      try {
        const stored = active && localStorage.getItem(`bac_phase_${active.id}_${slug}`);
        if (stored === 'pret') {
          // we'll override phase after computing below
          // store in temporary variable
          (window as any)._bac_phase_override = 'pret';
        }
      } catch {}

      // Get roles for this group
      const rolesRes = await fetch('/bac/api/roles');
      const allRoles = await rolesRes.json();
      setRoles(Array.isArray(allRoles) ? allRoles.filter((r: BacRole) => r.actif) : []);

      // Load group profils for name/color lookup in personnalisation
      const profilsRes = await fetch('/bac/api/profils');
      const profilsData = profilsRes.ok ? await profilsRes.json() : [];
      setGlobalGroupes(Array.isArray(profilsData) ? profilsData.filter((p: any) => p.type === 'groupe-acteur' && p.actif) : []);

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
          // require at least one valid choice (previously used nbScenesRequis minimum)
          if (choixData.length >= 1 && choixData.every((c: BacChoixScene) => c.statut === 'valide')) {
            // Load saisies (needed to populate validatedScenes and previous drafts)
            const saisiesRes = await fetch(`/bac/api/saisies?session_id=${active.id}&groupe_slug=${slug}`);
            const saisiesData = await saisiesRes.json();
            if (Array.isArray(saisiesData)) {
              const map: Record<string, any> = {};
              saisiesData.forEach((s: any) => { map[`${s.scene_id}_${s.bloc_index}`] = s; });
              setSaisies(map);
            }
            setValidatedScenes(new Set(choixData.map((c: BacChoixScene) => c.scene_id)));
            // regardless of saisies, go to personnalisation first
            setPhasePersist('personnalisation');
          } else {
            setPhasePersist('scenes');
          }
        } else {
          setPhasePersist('scenes');
        }
      } else {
        setPhasePersist(nbScenesRequis === 0 ? 'personnalisation' : 'casting');
      }
      // if we loaded a stored "pret" flag earlier, apply it now
      try {
        if ((window as any)._bac_phase_override === 'pret') {
          setPhasePersist('pret');
          try { delete (window as any)._bac_phase_override; } catch {}
        }
      } catch {}
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

  // fetch the global dataset (casting/choix/saisies etc) but do not toggle modal
  async function refreshGlobalData() {
    if (!session) return;
    setGlobalLoading(true);
    try {
      const groups: string[] = session.groupes_actifs || [];
      // note: we keep fetching data even if scenes were already loaded, because
      // personalized saisies may change and need refreshing. Scenes/roles/profils
      // are cheap to refetch.
      const [allScenesRes, allRolesRes, allProfilsRes, ...groupResults] = await Promise.all([
        fetch('/bac/api/scenes').then(r => r.json()),
        fetch('/bac/api/roles').then(r => r.json()),
        fetch('/bac/api/profils').then(r => r.ok ? r.json() : []),
        ...groups.map(g =>
          Promise.all([
            fetch(`/bac/api/casting?session_id=${session.id}&groupe_slug=${g}`).then(r => r.json()),
            fetch(`/bac/api/choix-scenes?session_id=${session.id}&groupe_slug=${g}`).then(r => r.json()),
            fetch(`/bac/api/saisies?session_id=${session.id}&groupe_slug=${g}`).then(r => r.json()),
          ])
        ),
      ]);

      const allCastArr: BacCasting[] = groupResults.flatMap(([cast]) => Array.isArray(cast) ? cast : []);
      const allChoixArr: BacChoixScene[] = groupResults.flatMap(([, choix]) => Array.isArray(choix) ? choix : []);
      const saisiesMap: Record<string, any> = {};
      groupResults.forEach(([, , saisiesArr]) => {
        if (Array.isArray(saisiesArr)) {
          saisiesArr.forEach((s: any) => {
            saisiesMap[`${s.scene_id}_${s.bloc_index}`] = s;
            saisiesMap[`${s.groupe_slug}_${s.scene_id}_${s.bloc_index}`] = s;
          });
        }
      });

      const allScenesArr: BacScene[] = Array.isArray(allScenesRes) ? allScenesRes : [];
      setGlobalScenes(allScenesArr);
      setGlobalCasting(allCastArr);
      setGlobalChoix(allChoixArr);
      setGlobalSaisies(saisiesMap);
      setGlobalIntroScene(session.histoire?.revelation || null);
      setGlobalFinaleScene(session.histoire?.denouement || null);
      setRoles(Array.isArray(allRolesRes) ? allRolesRes.filter((r: BacRole) => r.actif) : roles);
      setGlobalGroupes(Array.isArray(allProfilsRes) ? allProfilsRes.filter((p: any) => p.type === 'groupe-acteur' && p.actif) : []);
    } catch (e) { console.error(e); }
    setGlobalLoading(false);
  }

  async function loadGlobalScript() {
    setShowGlobalScript(true);
    await refreshGlobalData();
  }

  // helper used by global script rendering - mirrors TechniqueInterface.getSceneIntervenants
  function getGlobalSceneIntervenants(scene: BacScene): string {
    const roleMap = new Map<string, { roleName: string; actors: string[] }>();
    const order: string[] = [];
    const scriptJson = (scene.script_json || []) as any[];

    scriptJson.forEach((bloc: any, i: number) => {
      if (bloc.type !== 'replique') return;
      const roleId = bloc.role_id;
      const groupe = globalGroupes.find((g: any) => g.slug === roleId);
      const roleName = groupe?.nom || roleId;

      // try to pick up a saisie (there might not be any for intro/histoire/finale)
      const saisie = Object.values(globalSaisies).find((s: any) =>
        s.scene_id === scene.id && s.bloc_index === i
      );
      const actorName = saisie?.acteur_id
        ? (globalCasting.find((c: BacCasting) => c.id === saisie.acteur_id)?.prenom || '')
        : '';

      if (!roleMap.has(roleId)) {
        roleMap.set(roleId, { roleName, actors: [] });
        order.push(roleId);
      }
      const entry = roleMap.get(roleId)!;
      if (actorName && !entry.actors.includes(actorName)) entry.actors.push(actorName);
    });

    // for roles that didn't get an actor via saisies, fall back to any global casting entries
    order.forEach(rid => {
      const entry = roleMap.get(rid)!;
      if (entry.actors.length === 0) {
        const names = globalCasting
          .filter((c: BacCasting) => c.role_id === rid || c.groupe_slug === rid)
          .map(c => c.prenom)
          .filter(n => !!n);
        names.forEach(n => {
          if (!entry.actors.includes(n)) entry.actors.push(n);
        });
      }
    });

    if (order.length === 0) return '';
    const parts = order.map(rid => {
      const { roleName, actors } = roleMap.get(rid)!;
      return actors.length ? `${roleName} (${actors.join(', ')})` : roleName;
    });
    return parts.length === 1
      ? parts[0]
      : parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1];
  }

  function renderGlobalScriptScene(scene: BacScene, groupSlug: string, prefix: string) {
    // compute a brief list of intervenants from global saisies
    const intervenantsText = getGlobalSceneIntervenants(scene);

    return (
      <div key={`${prefix}-${scene.id}`} className="bac-card" style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          {prefix !== 'intro' && prefix !== 'finale' && prefix !== 'histoire' && (
            <><span className="bac-badge bac-badge-primary" style={{ marginRight: 8 }}>Acte {scene.acte}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--bac-text-muted)', marginRight: 8 }}>{groupSlug}</span></>
          )}
          <h4 style={{ fontWeight: 700, fontSize: '1rem', marginTop: 6 }}>
            {scene.titre}
          </h4>
          {/* duration + casting summary */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--bac-text-muted)' }}>
              ⏱️ {scene.duree_min}-{scene.duree_max} min
            </span>
            {intervenantsText && (
              <span style={{ fontSize: '0.75rem', color: 'var(--bac-text-secondary)', fontStyle: 'italic' }}>
                👥 {intervenantsText}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(scene.script_json || []).map((bloc: ScriptBloc, i: number) => {
            if (bloc.type === 'didascalie') {
              return <div key={i} className="bac-script-didascalie">{(bloc as any).texte}</div>;
            }
            const repBloc = bloc as any;
            const role = roles.find(r => r.id === repBloc.role_id);
            const groupe = !role ? globalGroupes.find((g: any) => g.slug === repBloc.role_id) : null;
            const saisieKey = prefix === 'histoire'
              ? `${repBloc.role_id}_${scene.id}_${i}`
              : `${scene.id}_${i}`;
            const saisie = globalSaisies[saisieKey] || {};
            const acteur = saisie.acteur_id ? globalCasting.find((c: BacCasting) => c.id === saisie.acteur_id) : null;
            const color = role?.couleur || groupe?.couleur || 'var(--bac-text)';
            const label = role?.nom || groupe?.nom || repBloc.role_id || 'Rôle';
            return (
              <div key={i} className="bac-script-replique">
                <div className="bac-script-role-name" style={{ color }}>
                  {label}{acteur ? ` — ${acteur.prenom}` : ''}
                </div>
                <div className="bac-script-directive">{repBloc.directive}</div>
                {saisie.texte_saisi ? (
                  <div className="bac-script-exemple">"{saisie.texte_saisi}"</div>
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

  function addMember() {
    if (members.length >= 8) return;
    setMembers(prev => [...prev, { prenom: '', role_id: '', variant_id: '' }]);
    setMemberCount(prev => prev + 1);
  }

  function removeMember(index: number) {
    const next = members.filter((_, i) => i !== index);
    setMembers(next);
    setMemberCount(Math.max(next.length, 1));
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
          id: m.id || null,
          prenom: m.prenom,
          role_id: m.role_id || null,
          variant_id: m.variant_id || null,
        })),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setCasting(data);
      showToastMsg('Casting mis à jour !');
      if (phaseBeforeCasting) {
        setPhasePersist(phaseBeforeCasting);
        setPhaseBeforeCasting(null);
      } else {
        setPhasePersist(nbScenesRequis === 0 ? 'personnalisation' : 'scenes');
      }
      // after phase change, ensure viewport moves to the stepper
      setTimeout(scrollToStepper, 50);
      setTimeout(scrollToStepper, 200);
    }
  }

  async function handleEditCasting(fromPhase: Phase) {
    setPhaseBeforeCasting(fromPhase);
    // Always re-fetch fresh casting from DB to avoid stale state
    let freshCasting = casting;
    if (session) {
      try {
        const res = await fetch(`/bac/api/casting?session_id=${session.id}&groupe_slug=${slug}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          freshCasting = data;
          setCasting(data);
        }
      } catch (_) {}
    }
    setMembers(freshCasting.map(c => ({
      id: c.id,
      prenom: c.prenom,
      role_id: c.role_id || '',
      variant_id: c.variant_id || '',
    })));
    setMemberCount(Math.max(freshCasting.length, 1));
    clearReadyMarker();
    setPhasePersist('casting');
    // ensure scroll after phase updates
    setTimeout(scrollToStepper, 50);
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
      setValidatedScenes(prev => {
        const copy = new Set(prev);
        copy.add(sceneId);
        return copy;
      });
      setShowSceneDetail(false);
      setDetailScene(null);
      // Do not auto-advance; user chooses when to go to next act
    }
  }

  async function deselectScene(acte: number, sceneId: string) {
    if (!session) return;
    const res = await fetch('/bac/api/choix-scenes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, groupe_slug: slug, acte: String(acte) }),
    });
    if (res.ok) {
      setChoix(prev => prev.filter(c => c.acte !== String(acte)));
      setValidatedScenes(prev => {
        const copy = new Set(prev);
        copy.delete(sceneId);
        return copy;
      });
      setShowSceneDetail(false);
      setDetailScene(null);
    }
  }

  async function validateChoices() {
    // allow validation as soon as at least one scene is selected
    if (!session || choix.length < 1) return;

    const res = await fetch('/bac/api/choix-scenes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.id, groupe_slug: slug }),
    });
    if (res.ok) {
      const data = await res.json();
      setChoix(data);
      showToastMsg('Choix validés !');
      // go to personnalisation after validating selection; readiness depends on scene validations
      setPhasePersist('personnalisation');
      setTimeout(scrollToStepper, 50);
      setTimeout(scrollToStepper, 200);
    }
  }

  // ========== PERSONNALISATION ==========
  const chosenScenes = choix
    .map(c => scenes.find(s => s.id === c.scene_id))
    .filter(Boolean) as BacScene[];
  // sort selected scenes by acte to respect chronological order
  chosenScenes.sort((a, b) => Number(a.acte) - Number(b.acte));


  // Histoire-derived mandatory scenes
  const histoireScenes: BacScene[] = session
    ? (session.histoire?.scenes || []).map(hs => hs.scene!).filter((s): s is BacScene => !!(s && (s.groupes_concernes || []).includes(slug)))
    : [];
  const introScene = session?.histoire?.revelation || null;
  const isInIntro = !!(introScene && (introScene.groupes_concernes || []).includes(slug));
  const finaleScene = session?.histoire?.denouement || null;
  const isInFinale = !!(finaleScene && (finaleScene.groupes_concernes || []).includes(slug));

  // auto-assign actor when personalization begins and only one cast member exists
  useEffect(() => {
    if (phase === 'personnalisation' && casting.length === 1) {
      const actorId = casting[0].id;
      if (!actorId) return;
      const allRelevant: any[] = [];
      histoireScenes.forEach(s => allRelevant.push(s));
      chosenScenes.forEach(s => allRelevant.push(s));
      if (introScene && isInIntro) allRelevant.push(introScene);
      if (finaleScene && isInFinale) allRelevant.push(finaleScene);
      allRelevant.forEach(scene => {
        (scene.script_json || []).forEach((bloc: any, idx: number) => {
          if (bloc.type === 'replique' && bloc.role_id === slug) {
            const key = `${scene.id}_${idx}`;
            const existing = saisies[key] || {};
            if (!existing.acteur_id) {
              saveSaisie(scene.id, idx, existing.texte_saisi || '', actorId);
            }
          }
        });
      });
    }
  }, [phase, casting, chosenScenes, histoireScenes, introScene, finaleScene, isInIntro, isInFinale, slug, saisies]);

  // collect all acte numbers used by histoire or chosen scenes
  const actes = Array.from(new Set<string>([
    ...histoireScenes.map(s => String(s.acte)),
    ...chosenScenes.map(s => String(s.acte)),
  ])).sort((a, b) => Number(a) - Number(b));

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
    // All scenes validated → move to pret
    if (chosenScenes.every(s => newValidated.has(s.id))) {
      markReady();
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
          <span className="bac-badge bac-badge-success" style={{ fontSize: '0.78rem', flexShrink: 0 }}>🎥 C'est l'heure de tourner </span>
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
          <div className={`bac-step ${phase === 'scenes' ? 'active' : phase === 'personnalisation' ? 'completed' : ''}`}>
            <div className="bac-step-number">{phase === 'personnalisation' ? '✓' : '2'}</div>
            <span>Scènes</span>
          </div>
          <div className={`bac-step-line ${phase === 'personnalisation' ? 'completed' : ''}`} />
          <div className={`bac-step ${phase === 'personnalisation' ? 'active' : ''}`}>
            <div className="bac-step-number">3</div>
            <span>Perso</span>
          </div>
        </div>
      </div>}

      <div
        className="bac-mobile-content"
        style={{ paddingBottom: phase === 'scenes' ? (isInFinale ? 260 : 220) : undefined }}
      >
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <div style={{ fontWeight: 700 }}>Membre {i + 1}</div>
                          <button type="button" onClick={() => removeMember(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bac-text-muted)', fontSize: '1.1rem', padding: '2px 6px', borderRadius: 6 }} title="Supprimer ce membre">✕</button>
                        </div>
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
                            {roles.filter(r => r.groupe_slug === slug).map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
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
                  {members.length < 8 && (
                    <button type="button" className="bac-btn bac-btn-ghost bac-btn-sm" onClick={addMember} style={{ alignSelf: 'center', marginTop: 4 }}>
                      + Ajouter un membre
                    </button>
                  )}
                </div>
                <div className="bac-mobile-bottom-bar" style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'transparent', boxShadow: 'none', borderTop: 'none' }}>
                  <button
                    className="bac-btn bac-btn-primary bac-btn-lg"
                    style={{ width: '100%' }}
                    onClick={submitCasting}
                    disabled={members.some(m => !m.prenom)}
                  >
                    {phaseBeforeCasting ? '✅ Valider le nouveau casting' : 'C\'est parti ! 🎬'}
                  </button>
                  {phaseBeforeCasting && (
                    <button
                      className="bac-btn bac-btn-ghost bac-btn-sm"
                      style={{ width: '100%' }}
                      onClick={() => { setPhasePersist(phaseBeforeCasting); setPhaseBeforeCasting(null); }}
                    >
                      ← Revenir {phaseBeforeCasting === 'scenes' ? 'au choix des scènes' : phaseBeforeCasting === 'personnalisation' ? 'à la personnalisation' : 'à l\'étape précédente'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== SCENE CHOICE PHASE ===== */}
        {phase === 'scenes' && (
          <div className="bac-animate-in">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <h2 className="bac-h2">Vos scènes</h2>
              <p style={{ color: 'var(--bac-text-secondary)' }}>
                {(isInIntro || histoireScenes.length > 0 || isInFinale)
                  ? 'Scènes obligatoires + 1 choix libre'
                  : 'Choisissez au moins 1 scène'}
              </p>
            </div>

            {/* INTRO locked card */}
            {isInIntro && introScene && (
              <div className="bac-card" style={{ marginBottom: 12, borderLeft: '4px solid var(--bac-info)', background: 'rgba(6,182,212,0.05)', padding: 14, cursor: 'pointer' }} onClick={() => setDetailLockedScene(introScene)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="bac-badge" style={{ background: 'var(--bac-info)', color: 'white', marginBottom: 4, display: 'inline-block' }}>🎬 INTRO</span>
                    <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginTop: 4 }}>{(introScene as any).titre}</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)', marginTop: 2 }}>⏱️ {(introScene as any).duree_min}-{(introScene as any).duree_max} min</p>
                  </div>
                  <span className="bac-badge bac-badge-success" style={{ flexShrink: 0, marginLeft: 8 }}>✓</span>
                </div>
              </div>
            )}

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

            {/* Histoire locked cards for current acte */}
            {histoireScenes.filter(s => s.acte === String(currentActe)).map(scene => (
              <div key={`hist-${scene.id}`} className="bac-card" style={{ marginBottom: 12, borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.05)', padding: 14, cursor: 'pointer' }} onClick={() => setDetailLockedScene(scene)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="bac-badge" style={{ background: '#f59e0b', color: 'white', marginBottom: 4, display: 'inline-block' }}>📌 HISTOIRE</span>
                    <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginTop: 4 }}>{scene.titre}</h3>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>⏱️ {scene.duree_min}-{scene.duree_max} min</span>
                      {scene.ton_principal && <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>{scene.ton_principal}</span>}
                    </div>
                  </div>
                  <span className="bac-badge bac-badge-success" style={{ flexShrink: 0, marginLeft: 8 }}>✓</span>
                </div>
              </div>
            ))}
            {(histoireScenes.filter(s => s.acte === String(currentActe)).length > 0 || isInIntro || isInFinale) && (
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 6, color: 'var(--bac-text-secondary)' }}>Votre scène libre :</p>
            )}
            <div className="bac-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: isInFinale ? 20 : 120 }}>
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
                    <p style={{ color: 'var(--bac-text-secondary)' }}>{detailScene.ton_principal}{detailScene.ton_secondaire ? ` — ${detailScene.ton_secondaire}` : ''}</p>
                    <p style={{ marginTop: 12 }}>{detailScene.fil_rouge}</p>
                    <div style={{ marginTop: 12 }}>
                      <strong>Durée :</strong> {detailScene.duree_min}-{detailScene.duree_max} min
                    </div>
                  </div>
                  <div className="bac-modal-footer">
                    <button className="bac-btn bac-btn-secondary" onClick={() => { setShowSceneDetail(false); setDetailScene(null); }}>Annuler</button>
                    {choix.find(c => c.acte === String(currentActe))?.scene_id === detailScene.id ? (
                      <button className="bac-btn bac-btn-warning" style={{ marginRight: 8 }} onClick={() => deselectScene(currentActe, detailScene.id)}>Désélectionner</button>
                    ) : null}
                    <button className="bac-btn bac-btn-primary" onClick={() => confirmSelectScene(currentActe, detailScene.id)}>
                      Choisir cette scène
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FINALE locked card */}
            {isInFinale && finaleScene && (
              <>
                <div className="bac-card" style={{ marginBottom: 0, marginTop: 8, borderLeft: '4px solid #22c55e', background: 'rgba(34,197,94,0.05)', padding: 14, cursor: 'pointer' }} onClick={() => setDetailLockedScene(finaleScene)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="bac-badge" style={{ background: '#22c55e', color: 'white', marginBottom: 4, display: 'inline-block' }}>🎤 FINALE</span>
                    <h3 style={{ fontWeight: 700, fontSize: '1.0625rem', marginTop: 4 }}>{(finaleScene as any).titre}</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)', marginTop: 2 }}>⏱️ {(finaleScene as any).duree_min}-{(finaleScene as any).duree_max} min</p>
                  </div>
                  <span className="bac-badge bac-badge-success" style={{ flexShrink: 0, marginLeft: 8 }}>✓</span>
                </div>
              </div>
              <div style={{ height: 120 }} />
              </>
            )}

            <div className="bac-mobile-bottom-bar" style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'transparent', boxShadow: 'none', borderTop: 'none' }}>
              {choix.length >= 1 && (
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
                  ✅ Valider la sélection
                </button>
              )}
              <button className="bac-btn bac-btn-ghost bac-btn-sm" style={{ width: '100%' }} onClick={() => { handleEditCasting('scenes'); setTimeout(scrollToStepper, 50); }}>
                👥 Modifier Casting
              </button>
            </div>
          </div>
        )}

        {/* ===== PERSONNALISATION PHASE ===== */}
        {phase === 'personnalisation' && (
          <div className="bac-animate-in">

            {/* INTRO mandatory section */}
            {isInIntro && introScene && (
              <div className="bac-card" style={{ marginBottom: 20, padding: 20, borderLeft: '4px solid var(--bac-info)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span className="bac-badge" style={{ background: 'var(--bac-info)', color: 'white' }}>🎬 INTRO</span>
                  <strong style={{ fontSize: '0.9375rem' }}>{(introScene as any).titre}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {((introScene as any).script_json || []).map((bloc: ScriptBloc, bIdx: number) => {
                    if (bloc.type === 'didascalie') return <div key={bIdx} className="bac-script-didascalie">{(bloc as any).texte}</div>;
                    const repBloc = bloc as any;
                    const isMyBloc = repBloc.role_id === slug;
                    const roleObj = roles.find(r => r.id === repBloc.role_id);
                    const groupe = globalGroupes.find((g: any) => g.slug === repBloc.role_id);
                    const colorOther = roleObj?.couleur || groupe?.couleur || 'var(--bac-text)';
                    const colorMine = groupe?.couleur || 'var(--bac-primary)';
                    const saisie = saisies[getSaisieKey((introScene as any).id, bIdx)] || {};
                    if (!isMyBloc) return (
                      <div key={bIdx} className="bac-script-replique" style={{ opacity: 0.45 }}>
                        <div className="bac-script-role-name" style={{ color: colorOther }}>{groupe?.nom || repBloc.role_id}</div>
                        <div className="bac-script-directive">{repBloc.directive}</div>
                        <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                      </div>
                    );
                    return (
                      <div key={bIdx} className="bac-script-replique">
                        <div className="bac-script-role-name" style={{ color: colorMine }}>{groupe?.nom || slug}</div>
                        {casting.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <label className="bac-label" style={{ fontSize: '0.8125rem' }}>Qui dit cette réplique ?</label>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {casting.map(c => (
                                <label key={c.id} className={`bac-radio-label ${saisie.acteur_id === c.id ? 'selected' : ''}`} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                  <input type="radio" name={`actor-intro-${bIdx}`} checked={saisie.acteur_id === c.id} onChange={() => saveSaisie((introScene as any).id, bIdx, saisie.texte_saisi || '', c.id)} />
                                  {c.prenom}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="bac-script-directive">{repBloc.directive}</div>
                        <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                        <textarea className="bac-input" style={{ fontSize: '1rem', minHeight: 60 }} placeholder="Vos mots..." value={saisie.texte_saisi || ''} onChange={e => saveSaisie((introScene as any).id, bIdx, e.target.value, saisie.acteur_id)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* scènes à personnaliser, classées par acte */}
            {actes.map(acte => (
              <div key={acte} style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 800, fontSize: '1.375rem', marginBottom: 12 }}>Acte {acte}</h2>
                {/* histoire scenes for this acte */}
                {histoireScenes.filter(s => String(s.acte) === acte).map(hScene => (
                  <div key={hScene.id} className="bac-card" style={{ marginBottom: 20, padding: 20, borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
                      <span className="bac-badge" style={{ background: '#f59e0b', color: 'white' }}>📌 HISTOIRE</span>
                      <strong style={{ fontSize: '0.9375rem' }}>{hScene.titre}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(hScene.script_json || []).map((bloc: ScriptBloc, bIdx: number) => {
                        if (bloc.type === 'didascalie') return <div key={bIdx} className="bac-script-didascalie">{(bloc as any).texte}</div>;
                        const repBloc = bloc as any;
                        const isMyBloc = repBloc.role_id === slug;
                        const roleObj = roles.find(r => r.id === repBloc.role_id);
                        const groupe = globalGroupes.find((g: any) => g.slug === repBloc.role_id);
                        const colorOther = roleObj?.couleur || groupe?.couleur || 'var(--bac-text)';
                        const colorMine = groupe?.couleur || 'var(--bac-primary)';
                        const saisie = saisies[getSaisieKey(hScene.id, bIdx)] || {};
                        if (!isMyBloc) return (
                          <div key={bIdx} className="bac-script-replique" style={{ opacity: 0.45 }}>
                            <div className="bac-script-role-name" style={{ color: colorOther }}>{groupe?.nom || repBloc.role_id}</div>
                            <div className="bac-script-directive">{repBloc.directive}</div>
                            <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                          </div>
                        );
                        return (
                          <div key={bIdx} className="bac-script-replique">
                            <div className="bac-script-role-name" style={{ color: colorMine }}>{groupe?.nom || slug}</div>
                            {casting.length > 0 && (
                              <div style={{ marginBottom: 8 }}>
                                <label className="bac-label" style={{ fontSize: '0.8125rem' }}>Qui dit cette réplique ?</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {casting.map(c => (
                                    <label key={c.id} className={`bac-radio-label ${saisie.acteur_id === c.id ? 'selected' : ''}`} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                      <input type="radio" name={`actor-hist-${hScene.id}-${bIdx}`} checked={saisie.acteur_id === c.id} onChange={() => saveSaisie(hScene.id, bIdx, saisie.texte_saisi || '', c.id)} />
                                      {c.prenom}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="bac-script-directive">{repBloc.directive}</div>
                            <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                            <textarea className="bac-input" style={{ fontSize: '1rem', minHeight: 60 }} placeholder="Vos mots..." value={saisie.texte_saisi || ''} onChange={e => saveSaisie(hScene.id, bIdx, e.target.value, saisie.acteur_id)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* chosen scenes for this acte */}
                {chosenScenes.filter(s => String(s.acte) === acte).map(sc => (
                  <div key={sc.id} style={{ marginBottom: 20 }}>
                    <div className="bac-card" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <span className="bac-badge" style={{ background: 'var(--bac-info)', color: 'white' }}>🎬</span>
                        <h3 style={{ fontWeight: 700, fontSize: '1.125rem', margin: 0 }}>{sc.titre}</h3>
                      </div>
                      <span className="bac-badge bac-badge-primary" style={{ marginTop: 4 }}>Acte {sc.acte}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                        {(sc.script_json || []).map((bloc: ScriptBloc, i: number) => {
                          if (bloc.type === 'didascalie') return <div key={i} className="bac-script-didascalie">{(bloc as any).texte}</div>;
                          const repBloc = bloc as any;
                          const roleObj = roles.find(r => r.id === repBloc.role_id);
                          const groupe = globalGroupes.find((g: any) => g.slug === repBloc.role_id);
                          const color = roleObj?.couleur || groupe?.couleur || 'var(--bac-text)';
                          const saisieKey = getSaisieKey(sc.id, i);
                          const saisie = saisies[saisieKey] || {};
                          return (
                            <div key={i} className="bac-script-replique">
                              <div className="bac-script-role-name" style={{ color }}>
                                {groupe?.nom || repBloc.role_id}
                              </div>
                              {(() => {
                                const isGroupReplique = repBloc.role_id === slug;
                                const eligible = isGroupReplique ? casting : [];
                                if (eligible.length === 0) return null;
                                return (
                                  <div style={{ marginBottom: 12 }}>
                                    <label className="bac-label" style={{ fontSize: '0.8125rem' }}>Qui dit cette réplique ?</label>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                      {eligible.map(c => (
                                        <label key={c.id} className={`bac-radio-label ${saisie.acteur_id === c.id ? 'selected' : ''}`} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                          <input type="radio" name={`actor-${i}`} checked={saisie.acteur_id === c.id} onChange={() => saveSaisie(sc.id, i, saisie.texte_saisi || '', c.id)} />
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
                                onChange={e => saveSaisie(sc.id, i, e.target.value, saisie.acteur_id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* FINALE mandatory section */}
            {isInFinale && finaleScene && (
              <div className="bac-card" style={{ marginTop: 20, marginBottom: 40, padding: 20, borderLeft: '4px solid #22c55e' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <span className="bac-badge" style={{ background: '#22c55e', color: 'white' }}>🎤 FINALE</span>
                  <strong style={{ fontSize: '0.9375rem' }}>{(finaleScene as any).titre}</strong>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {((finaleScene as any).script_json || []).map((bloc: ScriptBloc, bIdx: number) => {
                    if (bloc.type === 'didascalie') return <div key={bIdx} className="bac-script-didascalie">{(bloc as any).texte}</div>;
                    const repBloc = bloc as any;
                    const isMyBloc = repBloc.role_id === slug;
                    const roleObj = roles.find(r => r.id === repBloc.role_id);
                    const groupe = globalGroupes.find((g: any) => g.slug === repBloc.role_id);
                    const colorOther = roleObj?.couleur || groupe?.couleur || 'var(--bac-text)';
                    const colorMine = groupe?.couleur || 'var(--bac-primary)';
                    const saisie = saisies[getSaisieKey((finaleScene as any).id, bIdx)] || {};
                    if (!isMyBloc) return (
                      <div key={bIdx} className="bac-script-replique" style={{ opacity: 0.45 }}>
                        <div className="bac-script-role-name" style={{ color: colorOther }}>{groupe?.nom || repBloc.role_id}</div>
                        <div className="bac-script-directive">{repBloc.directive}</div>
                        <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                      </div>
                    );
                    return (
                      <div key={bIdx} className="bac-script-replique">
                        <div className="bac-script-role-name" style={{ color: colorMine }}>{groupe?.nom || slug}</div>
                        {casting.length > 0 && (
                          <div style={{ marginBottom: 8 }}>
                            <label className="bac-label" style={{ fontSize: '0.8125rem' }}>Qui dit cette réplique ?</label>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {casting.map(c => (
                                <label key={c.id} className={`bac-radio-label ${saisie.acteur_id === c.id ? 'selected' : ''}`} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                  <input type="radio" name={`actor-finale-${bIdx}`} checked={saisie.acteur_id === c.id} onChange={() => saveSaisie((finaleScene as any).id, bIdx, saisie.texte_saisi || '', c.id)} />
                                  {c.prenom}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="bac-script-directive">{repBloc.directive}</div>
                        <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                        <textarea className="bac-input" style={{ fontSize: '1rem', minHeight: 60 }} placeholder="Vos mots..." value={saisie.texte_saisi || ''} onChange={e => saveSaisie((finaleScene as any).id, bIdx, e.target.value, saisie.acteur_id)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* bottom actions bar for personnalisation */}
            <div className="bac-mobile-bottom-bar" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="bac-btn bac-btn-primary bac-btn-lg"
                style={{ width: '100%' }}
                onClick={markReady}
              >
                ✅ Valider la personnalisation
              </button>
              <button className="bac-btn bac-btn-ghost bac-btn-sm" style={{ width: '100%' }} onClick={() => handleEditCasting('personnalisation')}>
                👥 Modifier Casting
              </button>
              <button className="bac-btn bac-btn-ghost bac-btn-sm" style={{ width: '100%' }} onClick={() => { clearReadyMarker(); setPhasePersist('scenes'); setTimeout(scrollToStepper, 50); }}>
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
                <div id="group-ready-header">
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
            {(isInIntro || histoireScenes.length > 0 || isInFinale || choix.length > 0) && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>📜 Notre script</h3>

                {/* INTRO */}
                {isInIntro && introScene && (() => {
                  const sc: any = introScene;
                  const isEditingIntro = editingPretSceneId === 'intro';
                  return (
                    <div
                      className="bac-card"
                      style={{
                        marginBottom: 16,
                        padding: 20,
                        borderLeft: '4px solid var(--bac-info)',
                        border: isEditingIntro ? '2px solid var(--bac-primary)' : undefined,
                      }}
                    >
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                          {isEditingIntro ? (
                            <button
                              className="bac-btn bac-btn-success bac-btn-sm"
                              onClick={() => { setEditingPretSceneId(null); showToastMsg('Modifications enregistrées ✓'); }}
                            >
                              ✓ Enregistrer
                            </button>
                          ) : (
                            <button
                              className="bac-btn bac-btn-ghost bac-btn-sm"
                              onClick={() => setEditingPretSceneId('intro')}
                            >
                              ✏️ Modifier
                            </button>
                          )}
                        </div>

                        <span className="bac-badge" style={{ background: 'var(--bac-info)', color: 'white', marginBottom: 6, display: 'inline-block' }}>🎬 INTRO</span>
                        <h4 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: 4 }}>{sc.titre}</h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(sc.script_json || []).map((bloc: ScriptBloc, i: number) => {
                          if (bloc.type === 'didascalie') return <div key={i} className="bac-script-didascalie">{(bloc as any).texte}</div>;
                          const repBloc = bloc as any;
                          const roleObj = roles.find(r => r.id === repBloc.role_id);
                          const groupe = globalGroupes.find((g: any) => g.slug === repBloc.role_id);
                          let saisie = saisies[`${sc.id}_${i}`] || {};
                          if (phase === 'pret') {
                            const alt = getAnySaisie(sc.id, i);
                            if (alt) {
                              if (alt.texte_saisi && !saisie.texte_saisi) saisie = { ...saisie, texte_saisi: alt.texte_saisi };
                              if (alt.acteur_id && !saisie.acteur_id) saisie = { ...saisie, acteur_id: alt.acteur_id };
                            }
                          }
                          const acteur = saisie.acteur_id ? (casting.find(cst => cst.id === saisie.acteur_id) || globalCasting.find(cst => cst.id === saisie.acteur_id)) : null;
                          const isMyBloc = repBloc.role_id === slug;
                          const color = roleObj?.couleur || groupe?.couleur || 'var(--bac-text)';
                          const label = roleObj?.nom || groupe?.nom || repBloc.role_id || 'Groupe';

                          if (isEditingIntro && isMyBloc) {
                            return (
                              <div key={i} className="bac-script-replique">
                                <div className="bac-script-role-name" style={{ color }}>
                                  {label}
                                </div>
                                {casting.length > 0 && (
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {casting.map(cst => (
                                      <label
                                        key={cst.id}
                                        className={`bac-radio-label ${saisie.acteur_id === cst.id ? 'selected' : ''}`}
                                        style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8125rem' }}
                                      >
                                        <input
                                          type="radio"
                                          name={`pret-intro-${i}`}
                                          checked={saisie.acteur_id === cst.id}
                                          onChange={() => saveSaisie(sc.id, i, saisie.texte_saisi || '', cst.id)}
                                        />
                                        {cst.prenom}
                                      </label>
                                    ))}
                                  </div>
                                )}
                                <div className="bac-script-directive">{repBloc.directive}</div>
                                <textarea
                                  className="bac-input"
                                  style={{ fontSize: '0.9375rem', minHeight: 52, marginTop: 6 }}
                                  placeholder={`"${repBloc.exemple}" (optionnel)`}
                                  value={saisie.texte_saisi || ''}
                                  onChange={e => saveSaisie(sc.id, i, e.target.value, saisie.acteur_id)}
                                />
                              </div>
                            );
                          }

                          return (
                            <div key={i} className="bac-script-replique" style={!isMyBloc ? { opacity: 0.55 } : undefined}>
                              <div className="bac-script-role-name" style={{ color }}>
                                {label}{acteur ? ` — ${acteur.prenom}` : ''}
                              </div>
                              <div className="bac-script-directive">{repBloc.directive}</div>
                              {saisie.texte_saisi ? (
                                <div className="bac-script-exemple">"{saisie.texte_saisi}"</div>
                              ) : (
                                <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {isEditingIntro && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                          <button
                            className="bac-btn bac-btn-success bac-btn-sm"
                            onClick={() => { setEditingPretSceneId(null); showToastMsg('Modifications enregistrées ✓'); }}
                          >
                            ✓ Enregistrer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* HISTOIRE scenes */}
                {histoireScenes.map(sc => {
                  const isEditing = editingPretSceneId === sc.id;
                  return (
                    <div key={sc.id} className="bac-card" style={{ marginBottom: 16, padding: 20, borderLeft: '4px solid #f59e0b', border: isEditing ? '2px solid var(--bac-primary)' : undefined }}>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                          {isEditing ? (
                            <button className="bac-btn bac-btn-success bac-btn-sm" onClick={() => { setEditingPretSceneId(null); showToastMsg('Modifications enregistrées ✓'); }}>✓ Enregistrer</button>
                          ) : (
                            <button className="bac-btn bac-btn-ghost bac-btn-sm" onClick={() => setEditingPretSceneId(sc.id)}>✏️ Modifier</button>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <span className="bac-badge" style={{ background: '#f59e0b', color: 'white' }}>📌 HISTOIRE</span>
                          <span className="bac-badge bac-badge-primary">Acte {sc.acte}</span>
                        </div>
                        <h4 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: 4 }}>{sc.titre}</h4>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>⏱️ {sc.duree_min}-{sc.duree_max} min</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(sc.script_json || []).map((bloc: ScriptBloc, i: number) => {
                          if (bloc.type === 'didascalie') return <div key={i} className="bac-script-didascalie">{(bloc as any).texte}</div>;
                          const repBloc = bloc as any;
                          const roleObj = roles.find(r => r.id === repBloc.role_id);
                          const groupe = globalGroupes.find((g: any) => g.slug === repBloc.role_id);
                          let saisie = saisies[`${sc.id}_${i}`] || {};
                          if (phase === 'pret') {
                            const alt = getAnySaisie(sc.id, i);
                            if (alt) {
                              if (alt.texte_saisi && !saisie.texte_saisi) saisie = { ...saisie, texte_saisi: alt.texte_saisi };
                              if (alt.acteur_id && !saisie.acteur_id) saisie = { ...saisie, acteur_id: alt.acteur_id };
                            }
                          }
                          const acteur = saisie.acteur_id ? (casting.find(cst => cst.id === saisie.acteur_id) || globalCasting.find(cst => cst.id === saisie.acteur_id)) : null;
                          const isMyBloc = repBloc.role_id === slug;
                          const color = roleObj?.couleur || groupe?.couleur || 'var(--bac-text)';
                          const label = roleObj?.nom || groupe?.nom || repBloc.role_id || 'Groupe';
                          if (isEditing && isMyBloc) {
                            return (
                              <div key={i} className="bac-script-replique">
                                <div className="bac-script-role-name" style={{ color }}>{label}</div>
                                {casting.length > 0 && (
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {casting.map(cst => (
                                      <label key={cst.id} className={`bac-radio-label ${saisie.acteur_id === cst.id ? 'selected' : ''}`} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8125rem' }}>
                                        <input type="radio" name={`pret-hist-${sc.id}-${i}`} checked={saisie.acteur_id === cst.id} onChange={() => saveSaisie(sc.id, i, saisie.texte_saisi || '', cst.id)} />
                                        {cst.prenom}
                                      </label>
                                    ))}
                                  </div>
                                )}
                                <div className="bac-script-directive">{repBloc.directive}</div>
                                <textarea className="bac-input" style={{ fontSize: '0.9375rem', minHeight: 52, marginTop: 6 }} placeholder={`"${repBloc.exemple}" (optionnel)`} value={saisie.texte_saisi || ''} onChange={e => saveSaisie(sc.id, i, e.target.value, saisie.acteur_id)} />
                              </div>
                            );
                          }
                          return (
                            <div key={i} className="bac-script-replique" style={!isMyBloc ? { opacity: 0.55 } : undefined}>
                              <div className="bac-script-role-name" style={{ color }}>{label}{acteur ? ` — ${acteur.prenom}` : ''}</div>
                              <div className="bac-script-directive">{repBloc.directive}</div>
                              {saisie.texte_saisi ? <div className="bac-script-exemple">"{saisie.texte_saisi}"</div> : <div className="bac-script-exemple">"{repBloc.exemple}"</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Free scenes */}
                {[...choix].sort((a, b) => a.acte.localeCompare(b.acte)).map(c => {
                  const scene = scenes.find(s => s.id === c.scene_id);
                  if (!scene) return null;
                  const champSaisie = saisies[`${scene.id}_-1`];
                  const isEditing = editingPretSceneId === scene.id;
                  return (
                    <div key={c.id} className="bac-card" style={{ marginBottom: 16, padding: 20, border: isEditing ? '2px solid var(--bac-primary)' : undefined }}>
                      {/* Scene header */}
                      <div style={{ marginBottom: 12 }}>
                        {/* Line 1 : bouton à droite */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
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
                        {/* Line 2 : titre */}
                        <h4 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: 4 }}>{scene.titre}</h4>
                        {/* Line 3 : acte + durée */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="bac-badge bac-badge-primary">Acte {c.acte}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>⏱️ {scene.duree_min}-{scene.duree_max} min</span>
                        </div>
                      </div>

                      {/* Script blocs */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(scene.script_json || []).map((bloc: ScriptBloc, i: number) => {
                          if (bloc.type === 'didascalie') {
                            return <div key={i} className="bac-script-didascalie">{(bloc as any).texte}</div>;
                          }
                          const repBloc = bloc as any;
                          const roleObj = roles.find(r => r.id === repBloc.role_id);
                          const groupe = globalGroupes.find((g: any) => g.slug === repBloc.role_id);
                          let saisie = saisies[`${scene.id}_${i}`] || {};
                          const color = roleObj?.couleur || groupe?.couleur || 'var(--bac-text)';
                          const label = roleObj?.nom || groupe?.nom || repBloc.role_id || 'Groupe';
                          if (phase === 'pret') {
                            const alt = getAnySaisie(scene.id, i);
                            if (alt) {
                              if (alt.texte_saisi && !saisie.texte_saisi) saisie = { ...saisie, texte_saisi: alt.texte_saisi };
                              if (alt.acteur_id && !saisie.acteur_id) saisie = { ...saisie, acteur_id: alt.acteur_id };
                            }
                          }
                          const acteur = saisie.acteur_id ? (casting.find(cst => cst.id === saisie.acteur_id) || globalCasting.find(cst => cst.id === saisie.acteur_id)) : null;

                          if (isEditing) {
                            return (
                              <div key={i} className="bac-script-replique">
                                <div className="bac-script-role-name" style={{ color }}>
                                  {label}
                                </div>
                                {(() => {
                                  const isGroupReplique = repBloc.role_id === slug;
                                  const eligible = isGroupReplique ? casting : [];
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
                              <div className="bac-script-role-name" style={{ color }}>
                                {label}{acteur ? ` — ${acteur.prenom}` : ''}
                              </div>
                              <div className="bac-script-directive">{repBloc.directive}</div>
                              {saisie.texte_saisi ? (
                                <div className="bac-script-exemple">"{saisie.texte_saisi}"</div>
                              ) : (
                                <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {isEditing && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                          <button
                            className="bac-btn bac-btn-success bac-btn-sm"
                            onClick={() => { setEditingPretSceneId(null); showToastMsg('Modifications enregistrées ✓'); }}
                          >
                            ✓ Enregistrer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* FINALE */}
                {isInFinale && finaleScene && (() => {
                  const sc: any = finaleScene;
                  const isEditingFinale = editingPretSceneId === 'finale';
                  return (
                    <div
                      className="bac-card"
                      style={{
                        marginBottom: 16,
                        padding: 20,
                        borderLeft: '4px solid #22c55e',
                        border: isEditingFinale ? '2px solid var(--bac-primary)' : undefined,
                      }}
                    >
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                          {isEditingFinale ? (
                            <button
                              className="bac-btn bac-btn-success bac-btn-sm"
                              onClick={() => { setEditingPretSceneId(null); showToastMsg('Modifications enregistrées ✓'); }}
                            >
                              ✓ Enregistrer
                            </button>
                          ) : (
                            <button
                              className="bac-btn bac-btn-ghost bac-btn-sm"
                              onClick={() => setEditingPretSceneId('finale')}
                            >
                              ✏️ Modifier
                            </button>
                          )}
                        </div>

                        <span className="bac-badge" style={{ background: '#22c55e', color: 'white', marginBottom: 6, display: 'inline-block' }}>🎤 FINALE</span>
                        <h4 style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: 4 }}>{sc.titre}</h4>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(sc.script_json || []).map((bloc: ScriptBloc, i: number) => {
                          if (bloc.type === 'didascalie') return <div key={i} className="bac-script-didascalie">{(bloc as any).texte}</div>;
                          const repBloc = bloc as any;
                          const roleObj = roles.find(r => r.id === repBloc.role_id);
                          const groupe = globalGroupes.find((g: any) => g.slug === repBloc.role_id);
                          let saisie = saisies[`${sc.id}_${i}`] || {};
                          if (phase === 'pret') {
                            const alt = getAnySaisie(sc.id, i);
                            if (alt) {
                              if (alt.texte_saisi && !saisie.texte_saisi) saisie = { ...saisie, texte_saisi: alt.texte_saisi };
                              if (alt.acteur_id && !saisie.acteur_id) saisie = { ...saisie, acteur_id: alt.acteur_id };
                            }
                          }
                          const acteur = saisie.acteur_id ? (casting.find(cst => cst.id === saisie.acteur_id) || globalCasting.find(cst => cst.id === saisie.acteur_id)) : null;
                          const isMyBloc = repBloc.role_id === slug;
                          const color = roleObj?.couleur || groupe?.couleur || 'var(--bac-text)';
                          const label = roleObj?.nom || groupe?.nom || repBloc.role_id || 'Groupe';

                          if (isEditingFinale && isMyBloc) {
                            return (
                              <div key={i} className="bac-script-replique">
                                <div className="bac-script-role-name" style={{ color }}>
                                  {label}
                                </div>
                                {casting.length > 0 && (
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {casting.map(cst => (
                                      <label
                                        key={cst.id}
                                        className={`bac-radio-label ${saisie.acteur_id === cst.id ? 'selected' : ''}`}
                                        style={{ padding: '4px 8px', cursor: 'pointer', fontSize: '0.8125rem' }}
                                      >
                                        <input
                                          type="radio"
                                          name={`pret-finale-${i}`}
                                          checked={saisie.acteur_id === cst.id}
                                          onChange={() => saveSaisie(sc.id, i, saisie.texte_saisi || '', cst.id)}
                                        />
                                        {cst.prenom}
                                      </label>
                                    ))}
                                  </div>
                                )}
                                <div className="bac-script-directive">{repBloc.directive}</div>
                                <textarea
                                  className="bac-input"
                                  style={{ fontSize: '0.9375rem', minHeight: 52, marginTop: 6 }}
                                  placeholder={`"${repBloc.exemple}" (optionnel)`}
                                  value={saisie.texte_saisi || ''}
                                  onChange={e => saveSaisie(sc.id, i, e.target.value, saisie.acteur_id)}
                                />
                              </div>
                            );
                          }

                          return (
                            <div key={i} className="bac-script-replique" style={!isMyBloc ? { opacity: 0.55 } : undefined}>
                              <div className="bac-script-role-name" style={{ color }}>
                                {label}{acteur ? ` — ${acteur.prenom}` : ''}
                              </div>
                              <div className="bac-script-directive">{repBloc.directive}</div>
                              {saisie.texte_saisi ? (
                                <div className="bac-script-exemple">"{saisie.texte_saisi}"</div>
                              ) : (
                                <div className="bac-script-exemple">"{repBloc.exemple}"</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {isEditingFinale && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                          <button
                            className="bac-btn bac-btn-success bac-btn-sm"
                            onClick={() => { setEditingPretSceneId(null); showToastMsg('Modifications enregistrées ✓'); }}
                          >
                            ✓ Enregistrer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Boutons modification */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
              <button className="bac-btn bac-btn-ghost bac-btn-lg" style={{ width: '100%' }} onClick={() => handleEditCasting('pret')}>
                👥 Modifier Casting
              </button>
              <button className="bac-btn bac-btn-ghost bac-btn-lg" style={{ width: '100%' }} onClick={() => { clearReadyMarker(); setCameFromPret(true); setPhasePersist('scenes'); }}>
                ← Modifier les scènes
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <div className={`bac-toast ${toast.type === 'success' ? 'bac-toast-success' : 'bac-toast-error'}`}>{toast.msg}</div>}

      {/* ── Locked scene detail modal ── */}
      {detailLockedScene && (
        <div className="bac-modal-overlay" onClick={() => setDetailLockedScene(null)}>
          <div className="bac-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="bac-modal-header">
              <h2 className="bac-h2">{detailLockedScene.titre}</h2>
              <button className="bac-btn bac-btn-ghost bac-btn-icon" onClick={() => setDetailLockedScene(null)}>✕</button>
            </div>
            <div className="bac-modal-body">
              {(detailLockedScene.ton_principal || detailLockedScene.ton_secondaire) && (
                <p style={{ color: 'var(--bac-text-secondary)', marginBottom: 8 }}>{detailLockedScene.ton_principal}{detailLockedScene.ton_secondaire ? ` — ${detailLockedScene.ton_secondaire}` : ''}</p>
              )}
              {detailLockedScene.fil_rouge && <p style={{ marginBottom: 8 }}>{detailLockedScene.fil_rouge}</p>}
              {detailLockedScene.description && <p style={{ marginBottom: 8 }}>{detailLockedScene.description}</p>}
              {(detailLockedScene.duree_min || detailLockedScene.duree_max) && (
                <p style={{ fontSize: '0.875rem', color: 'var(--bac-text-muted)' }}>⏱️ {detailLockedScene.duree_min}-{detailLockedScene.duree_max} min</p>
              )}
            </div>
            <div className="bac-modal-footer">
              <button className="bac-btn bac-btn-primary" onClick={() => setDetailLockedScene(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

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

                  {/* Actes: Fil rouge + free scenes interleaved */}
                  {(() => {
                    const allHistoireScenes = (session?.histoire?.scenes || []).map(hs => hs.scene!).filter((s): s is BacScene => !!s).sort((a, b) => Number(a.acte) - Number(b.acte));
                    const validatedEntries = globalChoix.filter(c => c.statut === 'valide').map(c => ({ choix: c, scene: globalScenes.find(s => s.id === c.scene_id) })).filter(e => e.scene).sort((a, b) => {
                      const diff = Number(a.choix.acte) - Number(b.choix.acte);
                      return diff !== 0 ? diff : a.choix.groupe_slug.localeCompare(b.choix.groupe_slug);
                    });
                    const acteSet = new Set([...allHistoireScenes.map(s => String(s.acte)), ...validatedEntries.map(e => String(e.choix.acte))]);
                    const actes = Array.from(acteSet).sort((a, b) => Number(a) - Number(b));
                    if (actes.length === 0) return <div className="bac-empty"><p>Aucune scène validée</p></div>;
                    return actes.map((acte, idx) => {
                      const histForActe = allHistoireScenes.filter(s => String(s.acte) === acte);
                      const freeForActe = validatedEntries.filter(e => String(e.choix.acte) === acte);
                      return (
                        <div key={`acte-${acte}`}>
                          <h3 style={{ fontWeight: 800, fontSize: '1.125rem', marginTop: idx === 0 ? 0 : 16, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--bac-border)' }}>
                            Acte {acte}
                          </h3>
                          {histForActe.map(sc => renderGlobalScriptScene(sc, '', 'histoire'))}
                          {freeForActe.map(({ choix, scene }) => renderGlobalScriptScene(scene!, choix.groupe_slug, `${choix.groupe_slug}`))}
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

                  {!globalIntroScene && !globalFinaleScene && globalChoix.filter(c => c.statut === 'valide').length === 0 && session?.histoire?.scenes?.length === 0 && (
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
