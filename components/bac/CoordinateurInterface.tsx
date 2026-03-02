'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { BacSession, BacCasting, BacChoixScene, BacSaisie } from '../../lib/bac/types';

interface GroupeStatusData {
  slug: string;
  casting: BacCasting[];
  choix: BacChoixScene[];
  saisies: BacSaisie[];
  phase: 'attente' | 'casting' | 'scenes' | 'personnalisation' | 'pret';
}

export default function CoordinateurInterface({ isAdmin = false, embedded = false }: { isAdmin?: boolean; embedded?: boolean }) {
  const [session, setSession] = useState<BacSession | null>(null);
  const [sessions, setSessions] = useState<BacSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [groups, setGroups] = useState<GroupeStatusData[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load data when session changes
  useEffect(() => {
    if (selectedSessionId) loadGroupsData();
  }, [selectedSessionId]);

  // Realtime subscriptions
  useEffect(() => {
    if (!selectedSessionId) return;

    const channel = supabase
      .channel(`coord-${selectedSessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bac_casting_groupes', filter: `session_id=eq.${selectedSessionId}` }, () => {
        loadGroupsData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bac_choix_scenes', filter: `session_id=eq.${selectedSessionId}` }, () => {
        loadGroupsData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bac_saisies_acteurs', filter: `session_id=eq.${selectedSessionId}` }, () => {
        loadGroupsData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedSessionId]);

  async function loadSessions() {
    const res = await fetch('/bac/api/sessions');
    const data = await res.json();
    if (Array.isArray(data)) {
      setSessions(data);
      const active = data.find((s: BacSession) => s.statut === 'en-cours') || data.find((s: BacSession) => s.statut === 'en-preparation');
      if (active) setSelectedSessionId(active.id);
    }
    setLoading(false);
  }

  async function loadGroupsData() {
    const sess = sessions.find(s => s.id === selectedSessionId);
    if (!sess) {
      // Refetch
      const res = await fetch('/bac/api/sessions');
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
      const found = data?.find((s: BacSession) => s.id === selectedSessionId);
      if (!found) return;
      setSession(found);
      await loadGroupsForSession(found);
    } else {
      setSession(sess);
      await loadGroupsForSession(sess);
    }
  }

  async function loadGroupsForSession(sess: BacSession) {
    const slugs = sess.groupes_actifs;
    const results: GroupeStatusData[] = [];

    for (const slug of slugs) {
      const [castRes, choixRes, saisiesRes] = await Promise.all([
        fetch(`/bac/api/casting?session_id=${sess.id}&groupe_slug=${slug}`),
        fetch(`/bac/api/choix-scenes?session_id=${sess.id}&groupe_slug=${slug}`),
        fetch(`/bac/api/saisies?session_id=${sess.id}&groupe_slug=${slug}`),
      ]);

      const [cast, choix, saisies] = await Promise.all([
        castRes.json(), choixRes.json(), saisiesRes.json(),
      ]);

      const castArr = Array.isArray(cast) ? cast : [];
      const choixArr = Array.isArray(choix) ? choix : [];
      const saisiesArr = Array.isArray(saisies) ? saisies : [];

      let phase: GroupeStatusData['phase'] = 'attente';
      if (castArr.length === 0) phase = 'attente';
      else if (choixArr.length < 4 || choixArr.some(c => c.statut !== 'valide')) {
        if (choixArr.length > 0) phase = 'scenes';
        else phase = 'casting';
      } else {
        const totalBlocs = saisiesArr.length;
        // Check if all scenes are personalized
        const sceneIds = new Set(choixArr.map(c => c.scene_id));
        phase = totalBlocs > 0 ? 'personnalisation' : 'scenes';
        // If all scenes have at least some saisies
        if (sceneIds.size === 4 && totalBlocs >= sceneIds.size * 2) phase = 'pret';
      }

      results.push({ slug, casting: castArr, choix: choixArr, saisies: saisiesArr, phase });
    }

    setGroups(results);
    setLastUpdate(new Date());
  }

  function getPhaseInfo(phase: GroupeStatusData['phase']) {
    switch (phase) {
      case 'attente': return { label: 'En attente', color: 'var(--bac-text-muted)', icon: '⏳' };
      case 'casting': return { label: 'Casting en cours', color: 'var(--bac-info)', icon: '👥' };
      case 'scenes': return { label: 'Choix des scènes', color: 'var(--bac-warning)', icon: '🎭' };
      case 'personnalisation': return { label: 'Personnalisation', color: 'var(--bac-primary)', icon: '✍️' };
      case 'pret': return { label: 'Prêt !', color: 'var(--bac-success)', icon: '✅' };
    }
  }

  function getProgress(group: GroupeStatusData) {
    let total = 3; // casting + scenes + perso
    let done = 0;
    if (group.casting.length > 0) done += 1;
    const validatedChoix = group.choix.filter(c => c.statut === 'valide');
    if (validatedChoix.length === 4) done += 1;
    if (group.phase === 'pret') done += 1;
    return Math.round((done / total) * 100);
  }

  async function handleLogout() {
    await fetch('/bac/api/auth', { method: 'DELETE' });
    window.location.href = isAdmin ? '/animation/admin' : '/animation/coordinateur';
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', ...(embedded ? { padding: 40 } : { minHeight: '100vh' }) }}>
        <div className="bac-spinner" />
      </div>
    );
  }

  return (
    <div style={embedded ? {} : { maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header — hidden when embedded in dashboard */}
      {!embedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 className="bac-h1" style={{ marginBottom: 4 }}>🎬 Coordination</h1>
            <p style={{ color: 'var(--bac-text-secondary)', fontSize: '0.875rem' }}>
              MAJ {lastUpdate.toLocaleTimeString('fr-FR')} • Mise à jour en temps réel
            </p>
          </div>
          {isAdmin && (
            <a href="/animation/admin/dashboard" className="bac-btn bac-btn-secondary" style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
              ← Tableau de bord
            </a>
          )}
        </div>
      )}

      {/* Session selector */}
      {sessions.length > 1 && (
        <div className="bac-form-group" style={{ marginBottom: 24 }}>
          <select className="bac-input bac-select" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.nom_entreprise} — {s.statut}</option>
            ))}
          </select>
        </div>
      )}

      {!session ? (
        <div className="bac-empty">
          <div className="bac-empty-icon">📋</div>
          <p>Aucune session trouvée</p>
        </div>
      ) : (
        <>
          {/* Session info bar */}
          <div className="bac-card" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{session.nom_entreprise}</strong>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <span className={`bac-badge ${session.statut === 'en-cours' ? 'bac-badge-success' : 'bac-badge-primary'}`}>{session.statut}</span>
                <span style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>👥 {session.groupes_actifs.length} groupes</span>
              </div>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>
              🎭 {(session as any).theme?.titre || '—'} &nbsp;|&nbsp; 💡 {(session as any).revelation?.titre || '—'}
            </div>
          </div>

          {/* Overall progress */}
          <div className="bac-card" style={{ padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--bac-text-muted)' }}>{groups.filter(g => g.phase === 'attente').length}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>Attente</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--bac-warning)' }}>{groups.filter(g => g.phase === 'scenes' || g.phase === 'casting').length}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>En cours</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--bac-primary)' }}>{groups.filter(g => g.phase === 'personnalisation').length}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>En perso</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{groups.filter(g => g.phase === 'pret').length}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)' }}>Prêts</div>
              </div>
            </div>
          </div>

          {/* Group cards */}
          <div className="bac-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {groups.map(group => {
              const info = getPhaseInfo(group.phase);
              const progress = getProgress(group);
              const expanded = expandedGroup === group.slug;

              return (
                <div key={group.slug} className="bac-card" style={{ overflow: 'hidden' }}>
                  <div
                    style={{ padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => setExpandedGroup(expanded ? null : group.slug)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.25rem' }}>{info.icon}</span>
                        <strong style={{ fontSize: '1.0625rem' }}>{group.slug.charAt(0).toUpperCase() + group.slug.slice(1)}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                        <div style={{ flex: 1, minWidth: 100, height: 6, background: 'var(--bac-bg-tertiary)', borderRadius: 3 }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: info.color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                        </div>
                        <span style={{ fontSize: '0.8125rem', color: info.color, fontWeight: 600 }}>{info.label}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <a
                        href={`/bac/${group.slug}`}
                        className="bac-btn bac-btn-secondary bac-btn-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        👥 Gérer
                      </a>
                      <span style={{ fontSize: '1.25rem', transform: expanded ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▼</span>
                    </div>
                  </div>

                  {expanded && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--bac-border)' }} className="bac-animate-in">
                      {/* Casting */}
                      <div style={{ marginTop: 12 }}>
                        <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 8 }}>👥 Casting ({group.casting.length} membres)</h4>
                        {group.casting.length === 0 ? (
                          <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.8125rem' }}>Pas encore commencé</p>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {group.casting.map(c => (
                              <span key={c.id} className="bac-badge bac-badge-primary">
                                {c.prenom} — {(c.role as any)?.nom || '?'} {(c.variant as any)?.emoji || ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Scenes */}
                      <div style={{ marginTop: 16 }}>
                        <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 8 }}>🎭 Scènes choisies ({group.choix.length}/4)</h4>
                        {group.choix.length === 0 ? (
                          <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.8125rem' }}>Aucune scène choisie</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {group.choix.sort((a, b) => a.acte.localeCompare(b.acte)).map(c => {
                              const scene = session?.snapshot_scenes_json?.find((s: any) => s.id === c.scene_id);
                              return (
                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                  <span>Acte {c.acte}: <strong>{(scene as any)?.titre || c.scene_id}</strong></span>
                                  <span className={`bac-badge ${c.statut === 'valide' ? 'bac-badge-success' : ''}`} style={{ fontSize: '0.75rem' }}>{c.statut}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Saisies */}
                      <div style={{ marginTop: 16 }}>
                        <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 8 }}>✍️ Personnalisation ({group.saisies.length} saisies)</h4>
                        {group.saisies.length > 0 ? (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {Array.from(new Set(group.saisies.map(s => s.scene_id))).map(sid => {
                              const count = group.saisies.filter(s => s.scene_id === sid).length;
                              return <span key={sid} className="bac-badge">{count} blocs</span>;
                            })}
                          </div>
                        ) : (
                          <p style={{ color: 'var(--bac-text-muted)', fontSize: '0.8125rem' }}>Pas encore démarré</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Déconnexion at bottom — hidden when embedded in dashboard */}
      {!embedded && (
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--bac-border)', textAlign: 'center' }}>
          <button
            className="bac-btn bac-btn-ghost"
            onClick={handleLogout}
            style={{ color: 'var(--bac-text-muted)', fontSize: '0.875rem' }}
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
