'use client';

import { useEffect, useState } from 'react';
import type { BacSession, BacScene, BacCasting, BacChoixScene, BacSaisie, ScriptBloc, BacRole } from '../../lib/bac/types';

type TabId = 'script' | 'repartition' | 'itw';

export default function TechniqueInterface() {
  const [session, setSession] = useState<BacSession | null>(null);
  const [roles, setRoles] = useState<BacRole[]>([]);
  const [allCasting, setAllCasting] = useState<BacCasting[]>([]);
  const [allChoix, setAllChoix] = useState<BacChoixScene[]>([]);
  const [allSaisies, setAllSaisies] = useState<BacSaisie[]>([]);
  const [tab, setTab] = useState<TabId>('script');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const sessRes = await fetch('/bac/api/sessions');
      const sessions = await sessRes.json();
      const active = Array.isArray(sessions) ? sessions.find((s: BacSession) => s.statut === 'en-cours') : null;
      if (!active) { setLoading(false); return; }
      setSession(active);

      const groups = active.groupes_actifs;
      if (groups.length > 0) setSelectedGroup(groups[0]);

      const rolesRes = await fetch('/bac/api/roles');
      setRoles(Array.isArray(await rolesRes.clone().json()) ? await rolesRes.json() : []);

      const castPromises = groups.map((g: string) => fetch(`/bac/api/casting?session_id=${active.id}&groupe_slug=${g}`).then(r => r.json()));
      const choixPromises = groups.map((g: string) => fetch(`/bac/api/choix-scenes?session_id=${active.id}&groupe_slug=${g}`).then(r => r.json()));
      const saisiesPromises = groups.map((g: string) => fetch(`/bac/api/saisies?session_id=${active.id}&groupe_slug=${g}`).then(r => r.json()));

      const [castResults, choixResults, saisiesResults] = await Promise.all([
        Promise.all(castPromises), Promise.all(choixPromises), Promise.all(saisiesPromises),
      ]);

      setAllCasting(castResults.flat().filter(Boolean));
      setAllChoix(choixResults.flat().filter(Boolean));
      setAllSaisies(saisiesResults.flat().filter(Boolean));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function getGroupScenes(groupSlug: string): BacScene[] {
    if (!session?.snapshot_scenes_json) return [];
    const chosenIds = allChoix.filter(c => c.groupe_slug === groupSlug && c.statut === 'valide').map(c => c.scene_id);
    return (session.snapshot_scenes_json as BacScene[]).filter(s => chosenIds.includes(s.id)).sort((a, b) => String(a.acte).localeCompare(String(b.acte)));
  }

  function getGroupCasting(groupSlug: string) {
    return allCasting.filter(c => c.groupe_slug === groupSlug);
  }

  function getSceneSaisies(groupSlug: string, sceneId: string) {
    return allSaisies.filter(s => s.groupe_slug === groupSlug && s.scene_id === sceneId);
  }

  async function handleLogout() {
    await fetch('/bac/api/auth', { method: 'DELETE' });
    window.location.href = '/bac/connexion?profil=technique';
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

  const groupScenes = getGroupScenes(selectedGroup);
  const groupCasting = getGroupCasting(selectedGroup);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="bac-h1" style={{ marginBottom: 4 }}>📹 Équipe Technique</h1>
          <p style={{ color: 'var(--bac-text-secondary)', fontSize: '0.875rem' }}>{session.nom_entreprise}</p>
        </div>
        <button className="bac-btn bac-btn-ghost" onClick={handleLogout}>Déco</button>
      </div>

      {/* Group selector */}
      <div className="bac-form-group" style={{ marginBottom: 16 }}>
        <label className="bac-label">Groupe</label>
        <select className="bac-input bac-select" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
          {session.groupes_actifs.map(g => (
            <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="bac-tabs" style={{ marginBottom: 24 }}>
        <button className={`bac-tab ${tab === 'script' ? 'active' : ''}`} onClick={() => setTab('script')}>📜 Script</button>
        <button className={`bac-tab ${tab === 'repartition' ? 'active' : ''}`} onClick={() => setTab('repartition')}>👥 Répartition</button>
        <button className={`bac-tab ${tab === 'itw' ? 'active' : ''}`} onClick={() => setTab('itw')}>🎤 ITW</button>
      </div>

      {/* SCRIPT TAB */}
      {tab === 'script' && (
        <div className="bac-animate-in">
          {groupScenes.length === 0 ? (
            <div className="bac-empty"><p>Ce groupe n'a pas encore finalisé ses scènes</p></div>
          ) : (
            groupScenes.map(scene => {
              const sceneSaisies = getSceneSaisies(selectedGroup, scene.id);

              return (
                <div key={scene.id} className="bac-card" style={{ marginBottom: 16, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <span className="bac-badge bac-badge-primary">Acte {scene.acte}</span>
                      <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginTop: 4 }}>{scene.titre}</h3>
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>⏱️ {scene.duree_min}-{scene.duree_max} min</span>
                  </div>

                  {/* Champ perso value */}
                  {scene.champ_perso_label && (() => {
                    const champSaisie = sceneSaisies.find(s => s.bloc_index === -1);
                    return champSaisie?.champ_perso_valeur ? (
                      <div style={{ marginBottom: 16, padding: 12, background: 'var(--bac-bg-tertiary)', borderRadius: 8, borderLeft: '3px solid var(--bac-info)' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{scene.champ_perso_label}:</span>{' '}
                        <span style={{ color: 'var(--bac-primary)', fontWeight: 700 }}>{champSaisie.champ_perso_valeur}</span>
                      </div>
                    ) : null;
                  })()}

                  {/* Script blocs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(scene.script_json || []).map((bloc: ScriptBloc, i: number) => {
                      if (bloc.type === 'didascalie') {
                        return (
                          <div key={i} className="bac-script-didascalie">
                            {(bloc as any).texte}
                          </div>
                        );
                      }

                      const repBloc = bloc as any;
                      const role = roles.find(r => r.id === repBloc.role_id);
                      const saisie = sceneSaisies.find(s => s.bloc_index === i);
                      const acteur = saisie?.acteur_id ? groupCasting.find(c => c.id === saisie.acteur_id) : null;

                      return (
                        <div key={i} className="bac-script-replique">
                          <div className="bac-script-role-name" style={{ color: role?.couleur || 'var(--bac-text)' }}>
                            {role?.nom || 'Rôle'} {acteur ? `(${acteur.prenom})` : ''}
                          </div>
                          <div className="bac-script-directive">{repBloc.directive}</div>
                          {saisie?.texte_saisi ? (
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
            })
          )}
        </div>
      )}

      {/* RÉPARTITION TAB */}
      {tab === 'repartition' && (
        <div className="bac-animate-in">
          {groupCasting.length === 0 ? (
            <div className="bac-empty"><p>Casting non défini</p></div>
          ) : (
            <>
              <div className="bac-card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Casting du groupe</h3>
                <div className="bac-table-wrap">
                  <table className="bac-table">
                    <thead>
                      <tr><th>Prénom</th><th>Rôle</th><th>Variant</th></tr>
                    </thead>
                    <tbody>
                      {groupCasting.map(c => (
                        <tr key={c.id}>
                          <td><strong>{c.prenom}</strong></td>
                          <td>{(c.role as any)?.nom || '—'}</td>
                          <td>{(c.variant as any)?.emoji || ''} {(c.variant as any)?.nom || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {groupScenes.map(scene => (
                <div key={scene.id} className="bac-card" style={{ padding: 20, marginBottom: 16 }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 12 }}>
                    <span className="bac-badge bac-badge-primary" style={{ marginRight: 8 }}>Acte {scene.acte}</span>
                    {scene.titre}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(scene.script_json || []).filter((b: ScriptBloc) => b.type === 'replique').map((bloc: any, i: number) => {
                      const role = roles.find(r => r.id === bloc.role_id);
                      const sceneSaisies = getSceneSaisies(selectedGroup, scene.id);
                      const saisie = sceneSaisies.find(s => s.bloc_index === (scene.script_json || []).indexOf(bloc));
                      const acteur = saisie?.acteur_id ? groupCasting.find(c => c.id === saisie.acteur_id) : null;
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bac-border)' }}>
                          <span style={{ color: role?.couleur || 'var(--bac-text)' }}>{role?.nom || '?'}</span>
                          <span style={{ fontWeight: 600 }}>{acteur ? acteur.prenom : '—'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ITW TAB */}
      {tab === 'itw' && (
        <div className="bac-animate-in">
          {groupScenes.length === 0 ? (
            <div className="bac-empty"><p>Aucune scène finalisée</p></div>
          ) : (
            groupScenes.filter(s => (s.itw_json || []).length > 0).map(scene => (
              <div key={scene.id} className="bac-card" style={{ padding: 20, marginBottom: 16 }}>
                <h4 style={{ fontWeight: 700, marginBottom: 16 }}>
                  <span className="bac-badge bac-badge-primary" style={{ marginRight: 8 }}>Acte {scene.acte}</span>
                  {scene.titre} — ITW
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {(scene.itw_json || []).map((itw: any, i: number) => {
                    const role = roles.find(r => r.id === itw.role_id);
                    return (
                      <div key={i} style={{ padding: 12, background: 'var(--bac-bg-tertiary)', borderRadius: 8 }}>
                        <div style={{ fontWeight: 700, color: role?.couleur || 'var(--bac-text)', marginBottom: 8 }}>
                          {role?.nom || 'Rôle'} — Interview
                        </div>
                        <p style={{ fontWeight: 600, marginBottom: 4 }}>{itw.question}</p>
                        {itw.reponses_par_variant && Object.entries(itw.reponses_par_variant).map(([variant, rep]: [string, any]) => (
                          <div key={variant} style={{ marginLeft: 12, fontSize: '0.875rem', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, color: 'var(--bac-text-muted)' }}>{variant}:</span>{' '}
                            <span style={{ fontStyle: 'italic' }}>{rep}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          {groupScenes.every(s => !(s.itw_json || []).length) && (
            <div className="bac-empty"><p>Aucune interview configurée</p></div>
          )}
        </div>
      )}
    </div>
  );
}
