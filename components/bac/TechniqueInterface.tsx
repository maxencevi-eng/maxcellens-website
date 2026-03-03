'use client';

import { useEffect, useState, Fragment } from 'react';
import type { BacSession, BacScene, BacCasting, BacChoixScene, BacSaisie, BacRole, BacRevelation, BacDenouement, BacProfil } from '../../lib/bac/types';
import DeroulAnimation from './DeroulAnimation';

type SectionId = 'animation' | 'tournage';
type TabId = 'script' | 'repartition' | 'itw' | 'notes' | 'pratiques' | 'deroule';

const TAB_LABELS: Record<TabId, string> = {
  deroule: '🎞️ Déroulé',
  pratiques: '📋 Bonnes pratiques',
  script: '📜 Script',
  repartition: '👥 Répartition',
  itw: '🎤 ITW',
  notes: '🎥 Notes réal',
};

const ROLES_TECHNIQUES = [
  {
    categorie: 'Acteur',
    roles: [
      {
        nom: 'Acteur',
        description: `Vous êtes la star du film ! Votre rôle est de jouer votre personnage avec naturel et engagement, en suivant le script que vous avez co-construit.\nPendant le tournage, écoutez le clap de l'assistant réalisation avant de commencer à jouer. Parlez clairement, regardez vos partenaires (pas la caméra), et n'hésitez pas à vous approprier vos répliques.\nSi vous oubliez un mot, pas de panique : le souffleur est là pour vous aider discrètement.\nEntre les prises, restez concentré(e) et évitez de modifier votre tenue ou votre coiffure (continuité).\nDurant les interviews, répondez en restant dans la peau de votre personnage — c'est souvent le moment le plus spontané et le plus fun du tournage.`,
      },
    ],
  },
  {
    categorie: 'Équipe principale',
    roles: [
      {
        nom: 'Ingénieur son',
        description: `Responsable de toute la prise de son sur le tournage.\nGère la perche (microphone longue portée) et les micros-cravates ou sans fil pour chaque acteur.\nVeille à la qualité audio en temps réel, signale tout problème (bruit de fond, saturation, câblage) et s'assure que chaque prise est propre et exploitable au montage.`,
      },
      {
        nom: 'Souffleur(s)',
        description: `Présent(e) pour chaque acteur si possible, le souffleur rassure et aide à la mémorisation du texte sur le vif.\nIl suit la feuille de répliques en silence, et intervient discrètement si un acteur hésite ou oublie sa ligne.\nSon rôle est discret mais essentiel pour garantir la fluidité du tournage et mettre les acteurs en confiance.\nIl peut y avoir un souffleur par acteur dans l'idéal.`,
      },
      {
        nom: 'Assistant(e) réalisation',
        description: `Véritable bras droit du réalisateur, il/elle coordonne le tournage au quotidien : gestion du clap (annonce du nom de la scène et du numéro de prise), gestion du timing entre les scènes, coordination des équipes.\nPeut également filmer des images Behind The Scenes (BTS) pour alimenter le générique ou le bêtisier.\nLors des phases d'interview (ITW), c'est lui/elle qui pose les questions face caméra, avec un regard naturel et bienveillant, façon journaliste.\nIl peut y avoir plusieurs assistants réalisation selon la complexité du tournage.`,
      },
    ],
  },
  {
    categorie: 'Équipe secondaire',
    roles: [
      {
        nom: 'Make-up & continuité',
        description: `Veille à la cohérence visuelle des acteurs tout au long du tournage : coiffure, lunettes, tenues vestimentaires.\nS'assure que chaque acteur est raccord d'une scène à l'autre (continuité de costume et de maquillage).\nIntervient entre les prises pour les retouches : cheveux, maquillage léger, lingettes.\nUn détail qui fait toute la différence au montage.`,
      },
      {
        nom: 'Décorateur / Accessoiriste',
        description: `Organise et harmonise l'espace de tournage.\nSimplifie les décors pour éviter la surcharge visuelle à l'image, déplace ou retire les éléments parasites.\nPrépare et gère les accessoires utiles aux scènes (objets de bureau, documents, signalétique, etc.).\nVeille à la cohérence visuelle de l'environnement entre les différentes prises.`,
      },
    ],
  },
  {
    categorie: 'Scénariste',
    roles: [
      {
        nom: 'Scénariste',
        description: `Supervise le respect du scénario tout au long de la journée de tournage.\nConnaît toutes les scènes sur le bout des doigts et intervient si un acteur s'écarte trop du script initial ou improvise de façon non pertinente.\nAjuste en temps réel les répliques ou le déroulé si nécessaire.\nInterface essentielle entre la vision artistique et la réalité du tournage.`,
      },
    ],
  },
];

export default function TechniqueInterface({ isAdmin = false }: { isAdmin?: boolean }) {
  const [session, setSession] = useState<BacSession | null>(null);
  const [roles, setRoles] = useState<BacRole[]>([]);
  const [allCasting, setAllCasting] = useState<BacCasting[]>([]);
  const [allChoix, setAllChoix] = useState<BacChoixScene[]>([]);
  const [allSaisies, setAllSaisies] = useState<BacSaisie[]>([]);
  const [allScenes, setAllScenes] = useState<BacScene[]>([]);
  const [groupes, setGroupes] = useState<BacProfil[]>([]);
  const [section, setSection] = useState<SectionId>('tournage');
  const [tab, setTab] = useState<TabId>('script');
  const [selectedRole, setSelectedRole] = useState<string | null>('Acteur');
  const [loading, setLoading] = useState(true);
  // Regular scene editing
  const [editingSceneKey, setEditingSceneKey] = useState<string | null>(null);
  const [editActors, setEditActors] = useState<Record<number, string>>({});
  const [editTextes, setEditTextes] = useState<Record<number, string>>({});
  const [editChampPersos, setEditChampPersos] = useState<Record<number, string>>({});
  // Intro / Finale scene editing
  const [editingSpecial, setEditingSpecial] = useState<'intro' | 'finale' | null>(null);
  // Collapsed scenes (persisted in localStorage)
  const [collapsedScenes, setCollapsedScenes] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('bac-collapsed-scenes');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  function toggleCollapsed(key: string) {
    setCollapsedScenes(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem('bac-collapsed-scenes', JSON.stringify([...next])); } catch {}
      return next;
    });
  }
  function handleTermine(key: string, elementId: string) {
    toggleCollapsed(key);
    setTimeout(() => {
      document.getElementById(elementId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const sessRes = await fetch('/bac/api/sessions');
      const sessions = await sessRes.json();
      const active = Array.isArray(sessions) ? sessions.find((s: BacSession) => s.statut === 'en-cours') : null;
      if (!active) { setLoading(false); return; }
      setSession(active);

      const groups = active.groupes_actifs;

      const [rolesData, scenesData, profilsData, castResults, choixResults, saisiesResults, introSaisies, finaleSaisies] = await Promise.all([
        fetch('/bac/api/roles').then(r => r.json()),
        fetch('/bac/api/scenes').then(r => r.json()),
        fetch('/bac/api/profils').then(r => r.json()),
        Promise.all(groups.map((g: string) => fetch(`/bac/api/casting?session_id=${active.id}&groupe_slug=${g}`).then(r => r.json()))),
        Promise.all(groups.map((g: string) => fetch(`/bac/api/choix-scenes?session_id=${active.id}&groupe_slug=${g}`).then(r => r.json()))),
        Promise.all(groups.map((g: string) => fetch(`/bac/api/saisies?session_id=${active.id}&groupe_slug=${g}`).then(r => r.json()))),
        fetch(`/bac/api/saisies?session_id=${active.id}&groupe_slug=intro`).then(r => r.json()),
        fetch(`/bac/api/saisies?session_id=${active.id}&groupe_slug=finale`).then(r => r.json()),
      ]);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      setAllScenes(Array.isArray(scenesData) ? scenesData : []);
      setGroupes(Array.isArray(profilsData) ? profilsData.filter((p: BacProfil) => p.type === 'groupe-acteur' && p.actif) : []);
      setAllCasting(castResults.flat().filter(Boolean));
      setAllChoix(choixResults.flat().filter(Boolean));
      setAllSaisies([
        ...saisiesResults.flat().filter(Boolean),
        ...(Array.isArray(introSaisies) ? introSaisies : []),
        ...(Array.isArray(finaleSaisies) ? finaleSaisies : []),
      ]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function getGroupScenes(groupSlug: string): BacScene[] {
    const chosenIds = allChoix
      .filter(c => c.groupe_slug === groupSlug && c.statut === 'valide')
      .map(c => c.scene_id);
    return allScenes
      .filter(s => chosenIds.includes(s.id))
      .sort((a, b) => String(a.acte).localeCompare(String(b.acte)));
  }

  function getGroupCasting(groupSlug: string) {
    return allCasting.filter(c => c.groupe_slug === groupSlug);
  }

  function getSceneSaisies(groupSlug: string, sceneId: string) {
    return allSaisies.filter(s => s.groupe_slug === groupSlug && s.scene_id === sceneId);
  }

  // All validated scenes from all groups, ordered by acte then group
  function getAllValidatedEntries() {
    const entries: Array<{ scene: BacScene; groupSlug: string }> = [];
    for (const g of (session?.groupes_actifs || [])) {
      getGroupScenes(g).forEach(s => entries.push({ scene: s, groupSlug: g }));
    }
    return entries.sort((a, b) => {
      const diff = Number(a.scene.acte) - Number(b.scene.acte);
      if (diff !== 0) return diff;
      return a.groupSlug.localeCompare(b.groupSlug);
    });
  }

  // ITW questions grouped by role across all groups
  function getAllItwByRole() {
    const byRole: Record<string, {
      role: BacRole | { id: string; nom: string; couleur: string };
      entries: Array<{
        groupSlug: string;
        sceneActe: string;
        sceneTitre: string;
        question: string;
        reponses: Record<string, string>;
        actorName: string | null;
      }>;
    }> = {};

    for (const g of (session?.groupes_actifs || [])) {
      const scenes = getGroupScenes(g);
      const casting = getGroupCasting(g);
      for (const scene of scenes) {
        for (const itw of ((scene as any).itw_json || []) as any[]) {
          const roleId = itw.role_id;
          if (!byRole[roleId]) {
            const role = roles.find(r => r.id === roleId) || { id: roleId, nom: roleId, couleur: 'var(--bac-text)' };
            byRole[roleId] = { role, entries: [] };
          }
          const actor = casting.find(c => c.role_id === roleId) || null;
          byRole[roleId].entries.push({
            groupSlug: g,
            sceneActe: String(scene.acte),
            sceneTitre: scene.titre,
            question: itw.question,
            reponses: itw.reponses_par_variant || {},
            actorName: actor ? actor.prenom : null,
          });
        }
      }
    }

    // Add révélation ITW
    const revelationEntity = session?.revelation;
    if (revelationEntity) {
      for (const itw of (revelationEntity.itw_json || []) as any[]) {
        const roleId = itw.role_id;
        if (!byRole[roleId]) {
          const role = roles.find(r => r.id === roleId) || { id: roleId, nom: roleId, couleur: 'var(--bac-text)' };
          byRole[roleId] = { role, entries: [] };
        }
        const actor = allCasting.find(c => c.role_id === roleId) || null;
        byRole[roleId].entries.push({
          groupSlug: 'intro',
          sceneActe: 'intro',
          sceneTitre: revelationEntity.titre,
          question: itw.question,
          reponses: itw.reponses_par_variant || {},
          actorName: actor ? actor.prenom : null,
        });
      }
    }

    // Add dénouement ITW
    const denouementEntity = session?.denouement;
    if (denouementEntity) {
      for (const itw of (denouementEntity.itw_json || []) as any[]) {
        const roleId = itw.role_id;
        if (!byRole[roleId]) {
          const role = roles.find(r => r.id === roleId) || { id: roleId, nom: roleId, couleur: 'var(--bac-text)' };
          byRole[roleId] = { role, entries: [] };
        }
        const actor = allCasting.find(c => c.role_id === roleId) || null;
        byRole[roleId].entries.push({
          groupSlug: 'finale',
          sceneActe: 'finale',
          sceneTitre: denouementEntity.titre,
          question: itw.question,
          reponses: itw.reponses_par_variant || {},
          actorName: actor ? actor.prenom : null,
        });
      }
    }

    return Object.values(byRole);
  }

  // Per-scene: unique actors (deduped), preserving order of first appearance
  function getSceneActors(groupSlug: string, scene: BacScene) {
    const saisies = getSceneSaisies(groupSlug, scene.id);
    const casting = allCasting;
    const scriptJson = (scene.script_json || []) as any[];
    const actorMap = new Map<string, { actor: BacCasting; roleNames: string[] }>();
    scriptJson.forEach((bloc: any, i: number) => {
      if (bloc.type !== 'replique') return;
      const saisie = saisies.find(s => s.bloc_index === i);
      if (!saisie?.acteur_id) return;
      const actor = casting.find(c => c.id === saisie.acteur_id);
      if (!actor) return;
      const role = roles.find(r => r.id === bloc.role_id);
      const roleName = role?.nom || bloc.role_id;
      if (actorMap.has(saisie.acteur_id)) {
        const entry = actorMap.get(saisie.acteur_id)!;
        if (!entry.roleNames.includes(roleName)) entry.roleNames.push(roleName);
      } else {
        actorMap.set(saisie.acteur_id, { actor, roleNames: [roleName] });
      }
    });
    return Array.from(actorMap.values());
  }

  // Script tab: "Role1 (Actor1) et Role2 (Actor2, Actor3)"
  function getSceneIntervenants(groupSlug: string, scene: BacScene): string {
    const saisies = getSceneSaisies(groupSlug, scene.id);
    const casting = allCasting;
    const scriptJson = (scene.script_json || []) as any[];
    const roleMap = new Map<string, { roleName: string; actors: string[] }>();
    const roleOrder: string[] = [];
    scriptJson.forEach((bloc: any, i: number) => {
      if (bloc.type !== 'replique') return;
      const roleId = bloc.role_id;
      const role = roles.find(r => r.id === roleId);
      const roleName = role?.nom || roleId;
      const saisie = saisies.find(s => s.bloc_index === i);
      const actorName = saisie?.acteur_id ? (casting.find(c => c.id === saisie.acteur_id)?.prenom || '') : '';
      if (!roleMap.has(roleId)) {
        roleMap.set(roleId, { roleName, actors: [] });
        roleOrder.push(roleId);
      }
      const entry = roleMap.get(roleId)!;
      if (actorName && !entry.actors.includes(actorName)) entry.actors.push(actorName);
    });
    if (roleOrder.length === 0) return '';
    const parts = roleOrder.map(roleId => {
      const { roleName, actors } = roleMap.get(roleId)!;
      return actors.length ? `${roleName} (${actors.join(', ')})` : roleName;
    });
    return parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' et ' + parts[parts.length - 1];
  }

  function startEditing(groupSlug: string, scene: BacScene) {
    const sceneSaisies = getSceneSaisies(groupSlug, scene.id);
    const actors: Record<number, string> = {};
    const textes: Record<number, string> = {};
    const champs: Record<number, string> = {};
    sceneSaisies.forEach(s => {
      if (s.bloc_index >= 0 && s.acteur_id) actors[s.bloc_index] = s.acteur_id;
      if (s.bloc_index >= 0 && s.texte_saisi) textes[s.bloc_index] = s.texte_saisi;
      if (s.bloc_index >= 0 && s.champ_perso_valeur) champs[s.bloc_index] = s.champ_perso_valeur;
    });
    // Auto-assign when only 1 actor across all groups has this role
    ((scene.script_json || []) as any[]).forEach((bloc: any, i: number) => {
      if (bloc.type !== 'replique' || actors[i]) return;
      const eligible = allCasting.filter(c => c.role_id === bloc.role_id);
      if (eligible.length === 1) actors[i] = eligible[0].id;
    });
    setEditActors(actors);
    setEditTextes(textes);
    setEditChampPersos(champs);
    setEditingSceneKey(`${groupSlug}-${scene.id}`);
  }

  async function saveSceneEdit(groupSlug: string, scene: BacScene) {
    if (!session) return;
    const sceneSaisies = getSceneSaisies(groupSlug, scene.id);
    const scriptJson = (scene.script_json || []) as any[];
    const saisies: any[] = [];
    scriptJson.forEach((bloc: any, i: number) => {
      if (bloc.type !== 'replique') return;
      saisies.push({ session_id: session.id, groupe_slug: groupSlug, scene_id: scene.id, bloc_index: i, texte_saisi: editTextes[i] || '', acteur_id: editActors[i] || null, champ_perso_valeur: editChampPersos[i] || null });
    });
    await fetch('/bac/api/saisies', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ saisies }) });
    setAllSaisies(prev => [...prev.filter(s => !(s.groupe_slug === groupSlug && s.scene_id === scene.id)), ...saisies]);
    setEditingSceneKey(null);
  }

  // ── Intro / Finale helpers ──────────────────────────────────────

  function getSpecialEntity(type: 'intro' | 'finale'): BacRevelation | BacDenouement | null {
    if (!session) return null;
    return type === 'intro' ? (session.revelation || null) : (session.denouement || null);
  }

  function startEditingSpecial(type: 'intro' | 'finale') {
    const entity = getSpecialEntity(type);
    if (entity) {
      const saisies = getSceneSaisies(type, entity.id);
      const actors: Record<number, string> = {};
      const textes: Record<number, string> = {};
      const champs: Record<number, string> = {};
      saisies.forEach(s => {
        if (s.bloc_index >= 0 && s.acteur_id) actors[s.bloc_index] = s.acteur_id;
        if (s.bloc_index >= 0 && s.texte_saisi) textes[s.bloc_index] = s.texte_saisi;
        if (s.bloc_index >= 0 && s.champ_perso_valeur) champs[s.bloc_index] = s.champ_perso_valeur;
      });
      // Auto-assign when only 1 actor in the assigned group
      ((entity.script_json || []) as any[]).forEach((bloc: any, i: number) => {
        if (bloc.type !== 'replique' || actors[i]) return;
        const eligible = allCasting.filter(c => c.groupe_slug === bloc.role_id);
        if (eligible.length === 1) actors[i] = eligible[0].id;
      });
      setEditTextes(textes);
      setEditActors(actors);
      setEditChampPersos(champs);
    } else {
      setEditChampPersos({});
      setEditActors({});
      setEditTextes({});
    }
    setEditingSpecial(type);
  }

  async function saveSpecialEdit(type: 'intro' | 'finale') {
    if (!session) return;
    const entity = getSpecialEntity(type);
    if (entity) {
      const groupSlug = type;
      const saisies: any[] = [];
      (entity.script_json as any[]).forEach((bloc: any, i: number) => {
        if (bloc.type !== 'replique') return;
        saisies.push({ session_id: session.id, groupe_slug: groupSlug, scene_id: entity.id, bloc_index: i, texte_saisi: editTextes[i] || '', acteur_id: editActors[i] || null, champ_perso_valeur: editChampPersos[i] || null });
      });
      await fetch('/bac/api/saisies', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ saisies }) });
      setAllSaisies(prev => [...prev.filter(s => !(s.groupe_slug === groupSlug && s.scene_id === entity.id)), ...saisies]);
    }
    setEditingSpecial(null);
  }

  // ── Render a special (intro or finale) block ────────────────────
  function renderSpecialBlock(type: 'intro' | 'finale') {
    const label = type === 'intro' ? 'INTRO' : 'FINALE';
    const icon = type === 'intro' ? '🌅' : '🎬';
    const color = type === 'intro' ? 'var(--bac-info)' : 'var(--bac-success, #22c55e)';
    const entity = getSpecialEntity(type);
    const isEditing = editingSpecial === type;
    const groupSlug = type;
    const isCollapsed = !isEditing && collapsedScenes.has(`special-${type}`);

    const sceneSaisies = entity ? getSceneSaisies(groupSlug, entity.id) : [];
    const scriptJson = (entity?.script_json || []) as any[];

    return (
      <div key={`special-${type}`} style={{ marginBottom: 24 }}>
        {/* Header */}
        <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `2px solid ${color}` }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.375rem', color, margin: 0 }}>
            {icon} {label}
          </h2>
        </div>

        {isEditing ? (
          /* ── Edit mode : attribution des acteurs ── */
          <div className="bac-card" style={{ padding: 20, borderLeft: `4px solid ${color}` }}>
            {/* Header with title + save/cancel buttons at the top */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                {entity && <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: 4 }}>{entity.titre}</h3>}
                {entity && <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>⏱️ {entity.duree_min}–{entity.duree_max} min</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                <button className="bac-btn bac-btn-primary" style={{ padding: '4px 10px', fontSize: '0.8125rem' }} onClick={() => saveSpecialEdit(type)}>✓ Enregistrer</button>
                <button className="bac-btn bac-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8125rem' }} onClick={() => setEditingSpecial(null)}>Annuler</button>
              </div>
            </div>
            {entity ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(entity.script_json as any[]).map((bloc: any, i: number) => {
                  if (bloc.type === 'didascalie') {
                    return <div key={i} className="bac-script-didascalie">{bloc.texte}</div>;
                  }
                  const groupe = groupes.find(g => g.slug === bloc.role_id);
                  const roleName = groupe?.nom || roles.find(r => r.id === bloc.role_id)?.nom || bloc.role_id || 'Groupe';
                  const groupeColor = groupe?.couleur || color;
                  const actorPool = allCasting.filter(c => c.groupe_slug === bloc.role_id);
                  const groupedActors = actorPool.length > 0 ? [{ groupSlug: bloc.role_id, actors: actorPool }] : [];
                  return (
                    <div key={i} className="bac-script-replique">
                      <div className="bac-script-role-name" style={{ color: groupeColor, marginBottom: 4 }}>{roleName}</div>
                      <div className="bac-script-directive" style={{ marginBottom: 6 }}>{bloc.directive}</div>
                      <div style={{ fontStyle: 'italic', color: 'var(--bac-text-muted)', fontSize: '0.875rem', marginBottom: 8 }}>"{bloc.exemple}"</div>
                      {groupedActors.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {groupedActors.map(({ groupSlug, actors }) => (
                            <div key={groupSlug}>
                              <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--bac-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{groupSlug}</span>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                                {actors.map(actor => (
                                  <label key={actor.id} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 12px', borderRadius: 6, border: `1px solid ${editActors[i] === actor.id ? 'var(--bac-primary)' : 'var(--bac-border)'}`, background: editActors[i] === actor.id ? 'rgba(99,102,241,0.12)' : 'transparent', fontSize: '0.875rem', fontWeight: editActors[i] === actor.id ? 700 : 400 }}>
                                    <input type="radio" name={`special-actor-${type}-${i}`} value={actor.id} checked={editActors[i] === actor.id} onChange={() => setEditActors(prev => ({ ...prev, [i]: actor.id }))} style={{ display: 'none' }} />
                                    {actor.prenom}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>Aucun acteur disponible</p>
                      )}
                      <div style={{ marginTop: 8 }}>
                        <label style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)', display: 'block', marginBottom: 4 }}>Réplique personnalisée</label>
                        <textarea
                          className="bac-input"
                          rows={2}
                          value={editTextes[i] || ''}
                          onChange={e => setEditTextes(prev => ({ ...prev, [i]: e.target.value }))}
                          placeholder={bloc.exemple || '…'}
                          style={{ width: '100%', resize: 'vertical', fontSize: '0.875rem' }}
                        />
                        {bloc.utilise_champ_perso && (
                          <div style={{ marginTop: 8 }}>
                            <label style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)', display: 'block', marginBottom: 4 }}>{bloc.champ_perso_label || 'Champ perso'}</label>
                            <input
                              className="bac-input"
                              value={editChampPersos[i] || ''}
                              onChange={e => setEditChampPersos(prev => ({ ...prev, [i]: e.target.value }))}
                              style={{ width: '100%', fontSize: '0.875rem' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}>
                Aucune {type === 'intro' ? 'révélation' : 'dénouement'} assigné à cette session. Configurez-le dans les Sessions.
              </p>
            )}
            {entity && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <button
                  className="bac-btn bac-btn-primary"
                  style={{ padding: '6px 20px', fontSize: '0.875rem' }}
                  onClick={() => saveSpecialEdit(type)}
                >
                  ✓ Enregistrer
                </button>
              </div>
            )}
          </div>
        ) : entity ? (
          /* ── Read mode ── */
          <div id={`scene-special-${type}`} className="bac-card" style={{ padding: 20, borderLeft: `4px solid ${color}`, opacity: isCollapsed ? 0.6 : 1 }}>
            <div style={{ marginBottom: isCollapsed ? 4 : 8 }}>
              {/* Line 1 : boutons à droite */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
                <button
                  className="bac-btn bac-btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '0.8125rem', color: isCollapsed ? 'var(--bac-text-muted)' : 'var(--bac-success, #22c55e)' }}
                  onClick={() => toggleCollapsed(`special-${type}`)}
                >
                  {isCollapsed ? '↩️ Afficher la scène' : '✓ Scène terminée'}
                </button>
                <button
                  className="bac-btn bac-btn-ghost"
                  style={{ padding: '4px 10px', fontSize: '0.8125rem' }}
                  onClick={() => { setEditingSceneKey(null); startEditingSpecial(type); }}
                >
                  ✏️ Modifier
                </button>
              </div>
              {/* Line 2 : titre */}
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: 4 }}>{entity.titre}</h3>
              {/* Line 3 : durée */}
              {!isCollapsed && <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>⏱️ {entity.duree_min}–{entity.duree_max} min</span>}
            </div>
            {!isCollapsed && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {scriptJson.map((bloc: any, i: number) => {
                    if (bloc.type === 'didascalie') {
                      return <div key={i} className="bac-script-didascalie">{bloc.texte}</div>;
                    }
                    const groupe = groupes.find(g => g.slug === bloc.role_id);
                    const roleName = groupe?.nom || roles.find(r => r.id === bloc.role_id)?.nom || bloc.role_id || 'Groupe';
                    const groupeColor = groupe?.couleur || color;
                    const saisie = sceneSaisies.find((s: BacSaisie) => s.bloc_index === i);
                    const acteur = saisie?.acteur_id ? allCasting.find(c => c.id === saisie.acteur_id) : null;
                    return (
                      <div key={i} className="bac-script-replique">
                        <div className="bac-script-role-name" style={{ color: groupeColor }}>
                          {roleName} {acteur ? `(${acteur.prenom})` : ''}
                        </div>
                        <div className="bac-script-directive">{bloc.directive}</div>
                        <div className="bac-script-exemple">"{bloc.exemple}"</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  <button
                    className="bac-btn bac-btn-ghost"
                    style={{ padding: '6px 20px', fontSize: '0.875rem', color: 'var(--bac-success, #22c55e)' }}
                    onClick={() => handleTermine(`special-${type}`, `scene-special-${type}`)}
                  >
                    ✓ Scène terminée
                  </button>
                  <button
                    className="bac-btn bac-btn-ghost"
                    style={{ padding: '6px 20px', fontSize: '0.875rem' }}
                    onClick={() => { setEditingSceneKey(null); startEditingSpecial(type); }}
                  >
                    ✏️ Modifier
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── Not assigned ── */
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--bac-text-muted)', fontSize: '0.9rem' }}>
            Aucune {type === 'intro' ? 'révélation' : 'dénouement'} assigné — configurez-le dans Sessions.
          </div>
        )}
      </div>
    );
  }

  async function handleLogout() {
    await fetch('/bac/api/auth', { method: 'DELETE' });
    window.location.href = '/animation/technique';
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="bac-spinner" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bac-empty" style={{ marginTop: 100 }}>
        <div className="bac-empty-icon">🎬</div>
        <p>Aucune session en cours</p>
        <button className="bac-btn bac-btn-secondary" style={{ marginTop: 16 }} onClick={loadData}>Réessayer</button>
      </div>
    );
  }

  const allEntries = getAllValidatedEntries();
  const itwByRole = getAllItwByRole();

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="bac-h1" style={{ marginBottom: 4 }}>📹 Équipe Technique</h1>
          <p style={{ color: 'var(--bac-text-secondary)', fontSize: '0.875rem' }}>{session.nom_entreprise}</p>
        </div>
        {isAdmin && (
          <a href="/animation/admin/dashboard" className="bac-btn bac-btn-secondary" style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
            ← Tableau de bord
          </a>
        )}
      </div>

      {/* Section selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {([
          { id: 'animation' as SectionId, icon: '🎬', label: "L'animation", desc: 'Déroulé · Bonnes pratiques', defaultTab: 'deroule' as TabId },
          { id: 'tournage' as SectionId, icon: '🎥', label: 'Le tournage', desc: 'Script · Répartition · ITW', defaultTab: 'script' as TabId },
        ]).map(({ id, icon, label, desc, defaultTab }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => { setSection(id); setTab(defaultTab); }}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: `2px solid ${active ? 'var(--bac-primary)' : 'var(--bac-border)'}`,
                background: active ? 'rgba(99,102,241,0.1)' : 'var(--bac-surface)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                outline: 'none',
              }}
            >
              <div style={{ fontSize: '1.375rem', lineHeight: 1, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: active ? 'var(--bac-primary)' : 'var(--bac-text)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--bac-text-muted)', lineHeight: 1.3 }}>{desc}</div>
            </button>
          );
        })}
      </div>

      {/* Sub-tabs */}
      <div className="bac-tabs" style={{ marginBottom: 24 }}>
        {(section === 'animation'
          ? (['deroule', 'pratiques'] as TabId[])
          : (['script', 'repartition', 'itw', ...(isAdmin ? ['notes' as TabId] : [])] as TabId[])
        ).map(t => (
          <button key={t} className={`bac-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>


      {/* ── SCRIPT TAB — global (all groups) ── */}
      {tab === 'script' && (
        <div className="bac-animate-in">
          {/* INTRO block */}
          {renderSpecialBlock('intro')}

          {/* Regular scenes by acte */}
          {allEntries.length > 0 && (() => {
            let lastActe: any = null;
            return allEntries.map(({ scene, groupSlug }) => {
              const isFirstActe = lastActe === null;
              const showActeHeader = String(scene.acte) !== String(lastActe);
              if (showActeHeader) lastActe = scene.acte;
              const sceneKey = `${groupSlug}-${scene.id}`;
              const isEditing = editingSceneKey === sceneKey;
              const isSceneCollapsed = !isEditing && collapsedScenes.has(sceneKey);
              const sceneSaisies = getSceneSaisies(groupSlug, scene.id);
              const scriptJson = (scene.script_json || []) as any[];
              return (
                <Fragment key={sceneKey}>
                  {showActeHeader && (
                    <h2 style={{ fontWeight: 800, fontSize: '1.375rem', marginTop: isFirstActe ? 0 : 32, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--bac-border)' }}>
                      Acte {scene.acte}
                    </h2>
                  )}
                  <div id={`scene-${sceneKey}`} className="bac-card" style={{ marginBottom: 16, padding: 20, opacity: isSceneCollapsed ? 0.6 : 1 }}>
                    {/* Card header */}
                    <div style={{ marginBottom: isSceneCollapsed ? 4 : 16 }}>
                      {/* Line 1 : boutons à droite */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
                        {isEditing ? (
                          <button className="bac-btn bac-btn-primary" style={{ padding: '4px 10px', fontSize: '0.8125rem' }} onClick={() => saveSceneEdit(groupSlug, scene)}>✓ Enregistrer</button>
                        ) : (
                          <>
                            <button
                              className="bac-btn bac-btn-ghost"
                              style={{ padding: '4px 10px', fontSize: '0.8125rem', color: isSceneCollapsed ? 'var(--bac-text-muted)' : 'var(--bac-success, #22c55e)' }}
                              onClick={() => toggleCollapsed(sceneKey)}
                            >
                              {isSceneCollapsed ? '↩️ Afficher' : '✓ Scène terminée'}
                            </button>
                            <button className="bac-btn bac-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.8125rem' }} onClick={() => { setEditingSpecial(null); startEditing(groupSlug, scene); }}>✏️ Modifier</button>
                          </>
                        )}
                      </div>
                      {/* Line 2 : titre */}
                      <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: 4 }}>{scene.titre}</h3>
                      {/* Line 3 : groupe + durée */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>
                          {groupSlug.charAt(0).toUpperCase() + groupSlug.slice(1)}
                        </span>
                        {!isSceneCollapsed && <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>⏱️ {scene.duree_min}-{scene.duree_max} min</span>}
                      </div>
                    </div>

                    {/* Intervenants (read mode only) */}
                    {!isEditing && !isSceneCollapsed && (() => {
                      const intervenants = getSceneIntervenants(groupSlug, scene);
                      return intervenants ? (
                        <div style={{ marginBottom: 12, fontSize: '0.875rem', color: 'var(--bac-text-secondary)', fontStyle: 'italic' }}>
                          👥 {intervenants}
                        </div>
                      ) : null;
                    })()}

                    {/* Script blocs */}
                    {!isSceneCollapsed && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {scriptJson.map((bloc: any, i: number) => {
                        if (bloc.type === 'didascalie') {
                          return <div key={i} className="bac-script-didascalie">{bloc.texte}</div>;
                        }
                        const role = roles.find(r => r.id === bloc.role_id);
                        const saisie = sceneSaisies.find(s => s.bloc_index === i);
                        const acteur = saisie?.acteur_id ? allCasting.find(c => c.id === saisie.acteur_id) : null;
                        const roleActors = allCasting.filter(c => c.role_id === bloc.role_id);
                        return (
                          <div key={i} className="bac-script-replique">
                            {isEditing ? (
                              <>
                                <div className="bac-script-role-name" style={{ color: role?.couleur || 'var(--bac-text)', marginBottom: 4 }}>
                                  {role?.nom || 'Rôle'}
                                </div>
                                <div className="bac-script-directive" style={{ marginBottom: 6 }}>{bloc.directive}</div>
                                <div style={{ fontStyle: 'italic', color: 'var(--bac-text-muted)', fontSize: '0.875rem', marginBottom: 8 }}>"{bloc.exemple}"</div>
                                {roleActors.length > 0 ? (
                                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {roleActors.map(actor => (
                                      <label key={actor.id} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '4px 12px', borderRadius: 6, border: `1px solid ${editActors[i] === actor.id ? 'var(--bac-primary)' : 'var(--bac-border)'}`, background: editActors[i] === actor.id ? 'rgba(99,102,241,0.12)' : 'transparent', fontSize: '0.875rem', fontWeight: editActors[i] === actor.id ? 700 : 400 }}>
                                        <input type="radio" name={`actor-${sceneKey}-${i}`} value={actor.id} checked={editActors[i] === actor.id} onChange={() => setEditActors(prev => ({ ...prev, [i]: actor.id }))} style={{ display: 'none' }} />
                                        {actor.prenom}
                                      </label>
                                    ))}
                                  </div>
                                ) : (
                                  <p style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>Aucun acteur pour ce rôle</p>
                                )}
                                <div style={{ marginTop: 8 }}>
                                  <label style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)', display: 'block', marginBottom: 4 }}>Réplique personnalisée</label>
                                  <textarea
                                    className="bac-input"
                                    rows={2}
                                    value={editTextes[i] || ''}
                                    onChange={e => setEditTextes(prev => ({ ...prev, [i]: e.target.value }))}
                                    placeholder={bloc.exemple || '…'}
                                    style={{ width: '100%', resize: 'vertical', fontSize: '0.875rem' }}
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="bac-script-role-name" style={{ color: role?.couleur || 'var(--bac-text)' }}>
                                  {role?.nom || 'Rôle'} {acteur ? `(${acteur.prenom})` : ''}
                                </div>
                                <div className="bac-script-directive">{bloc.directive}</div>
                                {saisie?.texte_saisi ? (
                                  <div className="bac-script-exemple">"{saisie.texte_saisi}"</div>
                                ) : (
                                  <div className="bac-script-exemple">"{bloc.exemple}"</div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>}
                    {!isSceneCollapsed && isEditing && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                        <button
                          className="bac-btn bac-btn-primary"
                          style={{ padding: '6px 20px', fontSize: '0.875rem' }}
                          onClick={() => saveSceneEdit(groupSlug, scene)}
                        >
                          ✓ Enregistrer
                        </button>
                      </div>
                    )}
                    {!isSceneCollapsed && !isEditing && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                        <button
                          className="bac-btn bac-btn-ghost"
                          style={{ padding: '6px 20px', fontSize: '0.875rem', color: 'var(--bac-success, #22c55e)' }}
                          onClick={() => handleTermine(sceneKey, `scene-${sceneKey}`)}
                        >
                          ✓ Scène terminée
                        </button>
                        <button
                          className="bac-btn bac-btn-ghost"
                          style={{ padding: '6px 20px', fontSize: '0.875rem' }}
                          onClick={() => { setEditingSpecial(null); startEditing(groupSlug, scene); }}
                        >
                          ✏️ Modifier
                        </button>
                      </div>
                    )}
                  </div>
                </Fragment>
              );
            });
          })()}

          {/* FINALE block */}
          <div style={{ marginTop: allEntries.length > 0 ? 32 : 0 }}>
            {renderSpecialBlock('finale')}
          </div>

          {allEntries.length === 0 && !session.revelation_id && !session.denouement_id && (
            <div className="bac-empty" style={{ marginTop: 16 }}><p>Aucune scène validée pour l'instant</p></div>
          )}
        </div>
      )}

      {/* ── RÉPARTITION TAB — global (all groups) ── */}
      {tab === 'repartition' && (
        <div className="bac-animate-in">
          {/* Casting par groupe */}
          {(session?.groupes_actifs || []).map(g => {
            const gc = getGroupCasting(g);
            if (gc.length === 0) return null;
            return (
              <div key={g} className="bac-card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12 }}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {gc.map(c => (
                    <div key={c.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--bac-border)' }}>
                      <span style={{ fontWeight: 600 }}>{c.prenom}</span>
                      <span style={{ color: 'var(--bac-text-muted)', margin: '0 6px' }}>—</span>
                      <span style={{ color: 'var(--bac-text-secondary)' }}>{(c.role as any)?.nom || '—'}</span>
                      {(c.variant as any)?.emoji || (c.variant as any)?.nom ? (
                        <span style={{ marginLeft: 6, color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}>
                          {(c.variant as any)?.emoji} {(c.variant as any)?.nom}
                          {(c.variant as any)?.description ? (
                            <span style={{ marginLeft: 4, color: 'var(--bac-text-muted)', fontStyle: 'italic', opacity: 0.8 }}>
                              — {(c.variant as any)?.description}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Répartition par scène */}
          <h3 style={{ fontWeight: 700, margin: '24px 0 12px' }}>Répartition par scène</h3>
          {allEntries.length === 0 && !session.revelation && !session.denouement ? (
            <div className="bac-empty"><p>Aucune scène validée</p></div>
          ) : (
            <>
              {/* Révélation */}
              {session.revelation && (() => {
                const entity = session.revelation;
                const actors = getSceneActors('intro', entity as any);
                return (
                  <div className="bac-card" style={{ padding: 20, marginBottom: 12, borderLeft: '4px solid var(--bac-info)' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 12 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--bac-info)', fontWeight: 700, textTransform: 'uppercase' as const, marginRight: 8 }}>Intro</span>
                      {entity.titre}
                    </h4>
                    {actors.length === 0 ? (
                      <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}>Aucun acteur assigné</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {actors.map(({ actor, roleNames }) => (
                          <div key={actor.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--bac-border)' }}>
                            <span style={{ fontWeight: 600 }}>{actor.prenom}</span>
                            <span style={{ color: 'var(--bac-text-muted)', margin: '0 6px' }}>—</span>
                            <span style={{ color: 'var(--bac-text-secondary)' }}>{roleNames.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Regular scenes */}
              {allEntries.map(({ scene, groupSlug }) => {
                const sceneActors = getSceneActors(groupSlug, scene);
                return (
                  <div key={`${groupSlug}-${scene.id}`} className="bac-card" style={{ padding: 20, marginBottom: 12 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 12 }}>
                      <span className="bac-badge bac-badge-primary" style={{ marginRight: 8 }}>Acte {scene.acte}</span>
                      {scene.titre}
                      <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--bac-text-muted)', fontWeight: 400 }}>{groupSlug}</span>
                    </h4>
                    {sceneActors.length === 0 ? (
                      <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}>Aucun acteur assigné</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {sceneActors.map(({ actor, roleNames }) => (
                          <div key={actor.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--bac-border)' }}>
                            <span style={{ fontWeight: 600 }}>{actor.prenom}</span>
                            <span style={{ color: 'var(--bac-text-muted)', margin: '0 6px' }}>—</span>
                            <span style={{ color: 'var(--bac-text-secondary)' }}>{roleNames.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Dénouement */}
              {session.denouement && (() => {
                const entity = session.denouement;
                const actors = getSceneActors('finale', entity as any);
                return (
                  <div className="bac-card" style={{ padding: 20, marginBottom: 12, borderLeft: '4px solid var(--bac-success, #22c55e)' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 12 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--bac-success, #22c55e)', fontWeight: 700, textTransform: 'uppercase' as const, marginRight: 8 }}>Finale</span>
                      {entity.titre}
                    </h4>
                    {actors.length === 0 ? (
                      <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}>Aucun acteur assigné</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {actors.map(({ actor, roleNames }) => (
                          <div key={actor.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--bac-border)' }}>
                            <span style={{ fontWeight: 600 }}>{actor.prenom}</span>
                            <span style={{ color: 'var(--bac-text-muted)', margin: '0 6px' }}>—</span>
                            <span style={{ color: 'var(--bac-text-secondary)' }}>{roleNames.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* ── ITW TAB — grouped by profil (role) across all groups ── */}
      {tab === 'itw' && (
        <div className="bac-animate-in">
          {itwByRole.length === 0 ? (
            <div className="bac-empty"><p>Aucune interview configurée</p></div>
          ) : (
            itwByRole.map(({ role, entries }) => (
              <div key={role.id} className="bac-card" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.125rem', color: (role as any).couleur, marginBottom: 16, borderBottom: '2px solid var(--bac-border)', paddingBottom: 10 }}>
                  🎤 {role.nom}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {entries.sort((a, b) => {
                    const order = (acte: string) => acte === 'intro' ? -1 : acte === 'finale' ? 9999 : parseInt(acte) || 0;
                    const diff = order(a.sceneActe) - order(b.sceneActe);
                    return diff !== 0 ? diff : a.groupSlug.localeCompare(b.groupSlug);
                  }).map((entry, i) => (
                    <div key={i} style={{ padding: 14, background: 'var(--bac-bg-tertiary)', borderRadius: 10, borderLeft: `3px solid ${(role as any).couleur}` }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {entry.sceneActe === 'intro' ? (
                          <span className="bac-badge" style={{ background: 'var(--bac-info)', color: 'white' }}>Intro</span>
                        ) : entry.sceneActe === 'finale' ? (
                          <span className="bac-badge" style={{ background: 'var(--bac-success, #22c55e)', color: 'white' }}>Finale</span>
                        ) : (
                          <span className="bac-badge bac-badge-primary">Acte {entry.sceneActe}</span>
                        )}
                        <span style={{ fontSize: '0.875rem', color: 'var(--bac-text-secondary)' }}>{entry.sceneTitre}</span>
                      </div>
                      <p style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.9375rem' }}>{entry.question}</p>
                      {Object.entries(entry.reponses).length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {Object.entries(entry.reponses).map(([variant, rep]) => (
                            <div key={variant} style={{ fontSize: '0.875rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--bac-text-muted)' }}>{variant}:</span>{' '}
                              <span style={{ fontStyle: 'italic' }}>{rep as string}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── NOTES RÉAL TAB — admin only ── */}
      {tab === 'notes' && isAdmin && (
        <div className="bac-animate-in">
          {(() => {
            const fields = [
              { key: 'cadrage', label: '🎥 Cadrage' },
              { key: 'rythme', label: '⏱️ Rythme' },
              { key: 'silences', label: '🤫 Silences' },
              { key: 'pieges', label: '⚠️ Pièges' },
              { key: 'astuce', label: '💡 Astuce' },
            ];
            function renderNotesCard(titre: string, notes: any, label: string, color: string, key: string) {
              const hasNotes = fields.some(f => notes[f.key]);
              return (
                <div key={key} className="bac-card" style={{ padding: 20, marginBottom: 16, borderLeft: `4px solid ${color}` }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 16 }}>
                    <span style={{ fontSize: '0.75rem', color, fontWeight: 700, textTransform: 'uppercase' as const, marginRight: 8 }}>{label}</span>
                    {titre}
                  </h4>
                  {!hasNotes ? (
                    <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}>Aucune note de réalisation</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {fields.filter(f => notes[f.key]).map(f => (
                        <div key={f.key} style={{ padding: '10px 14px', background: 'var(--bac-bg-tertiary)', borderRadius: 8, borderLeft: `3px solid ${color}` }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4, color: 'var(--bac-text-secondary)' }}>{f.label}</div>
                          <div style={{ fontSize: '0.9375rem' }}>{notes[f.key]}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            const hasAny = allEntries.length > 0 || session.revelation || session.denouement;
            if (!hasAny) return <div className="bac-empty"><p>Aucune scène finalisée</p></div>;
            return (
              <>
                {session.revelation && renderNotesCard(session.revelation.titre, session.revelation.notes_real_json || {}, 'Intro', 'var(--bac-info)', 'special-intro')}
                {allEntries.map(({ scene, groupSlug }) => {
                  const notes = (scene as any).notes_real_json || {};
                  const hasNotes = fields.some(f => notes[f.key]);
                  return (
                    <div key={`${groupSlug}-${scene.id}`} className="bac-card" style={{ padding: 20, marginBottom: 16 }}>
                      <h4 style={{ fontWeight: 700, marginBottom: 16 }}>
                        <span className="bac-badge bac-badge-primary" style={{ marginRight: 8 }}>Acte {scene.acte}</span>
                        {scene.titre}
                        <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--bac-text-muted)', fontWeight: 400 }}>{groupSlug}</span>
                      </h4>
                      {!hasNotes ? (
                        <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}>Aucune note de réalisation</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {fields.filter(f => notes[f.key]).map(f => (
                            <div key={f.key} style={{ padding: '10px 14px', background: 'var(--bac-bg-tertiary)', borderRadius: 8, borderLeft: '3px solid var(--bac-primary)' }}>
                              <div style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4, color: 'var(--bac-text-secondary)' }}>{f.label}</div>
                              <div style={{ fontSize: '0.9375rem' }}>{notes[f.key]}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {session.denouement && renderNotesCard(session.denouement.titre, session.denouement.notes_real_json || {}, 'Finale', 'var(--bac-success, #22c55e)', 'special-finale')}
              </>
            );
          })()}
        </div>
      )}

      {/* ── BONNES PRATIQUES TAB ── */}
      {tab === 'pratiques' && (
        <div className="bac-animate-in">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Role list */}
            <div style={{ flex: '0 0 240px', minWidth: 180 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ROLES_TECHNIQUES.flatMap(cat => cat.roles).map(role => (
                      <button
                        key={role.nom}
                        onClick={() => setSelectedRole(selectedRole === role.nom ? null : role.nom)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: `2px solid ${selectedRole === role.nom ? 'var(--bac-primary)' : 'var(--bac-border)'}`,
                          background: selectedRole === role.nom ? 'rgba(99,102,241,0.1)' : 'var(--bac-surface)',
                          color: selectedRole === role.nom ? 'var(--bac-primary)' : 'var(--bac-text)',
                          fontWeight: selectedRole === role.nom ? 700 : 400,
                          cursor: 'pointer',
                          fontSize: '0.9375rem',
                          transition: 'all 0.15s',
                        }}
                      >
                        {role.nom}
                      </button>
                ))}
              </div>
            </div>

            {/* Description panel */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {selectedRole ? (() => {
                const found = ROLES_TECHNIQUES.flatMap(c => c.roles).find(r => r.nom === selectedRole);
                return found ? (
                  <div className="bac-card" style={{ padding: 24 }}>
                    <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: 16 }}>{found.nom}</h3>
                    <p style={{ lineHeight: 1.75, color: 'var(--bac-text)', fontSize: '0.9375rem', whiteSpace: 'pre-line' }}>{found.description}</p>
                  </div>
                ) : null;
              })() : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--bac-text-muted)', fontSize: '0.9rem' }}>
                  Sélectionnez un rôle pour voir sa description
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DÉROULÉ TAB ── */}
      {tab === 'deroule' && (
        <div className="bac-animate-in">
          <DeroulAnimation />
        </div>
      )}

      {/* Déconnexion at bottom */}
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--bac-border)', textAlign: 'center' }}>
        <button
          className="bac-btn bac-btn-ghost"
          onClick={handleLogout}
          style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}
        >
          Déconnexion
        </button>
      </div>
    </div>
  );
}
