'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashStats {
  profils: number;
  roles: number;
  scenes: number;
  revelations: number;
  denouements: number;
  sessions: number;
  sessionsActives: number;
}

interface GroupeInfo {
  id: string;
  slug: string;
  nom: string;
  couleur: string;
  actif: boolean;
  activeSession: string | null;
  activeSessionStatut: string | null;
}

const defaultStats: DashStats = { profils: 0, roles: 0, scenes: 0, revelations: 0, denouements: 0, sessions: 0, sessionsActives: 0 };

export default function BacAdminDashboard() {
  const [stats, setStats] = useState<DashStats>(defaultStats);
  const [groupes, setGroupes] = useState<GroupeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [profils, roles, scenes, revelations, denouements, sessions] = await Promise.all([
        fetch('/bac/api/profils').then(r => r.json()),
        fetch('/bac/api/roles').then(r => r.json()),
        fetch('/bac/api/scenes').then(r => r.json()),
        fetch('/bac/api/revelations').then(r => r.json()),
        fetch('/bac/api/denouements').then(r => r.json()),
        fetch('/bac/api/sessions').then(r => r.json()),
      ]);

      setStats({
        profils: Array.isArray(profils) ? profils.length : 0,
        roles: Array.isArray(roles) ? roles.length : 0,
        scenes: Array.isArray(scenes) ? scenes.length : 0,
        revelations: Array.isArray(revelations) ? revelations.length : 0,
        denouements: Array.isArray(denouements) ? denouements.length : 0,
        sessions: Array.isArray(sessions) ? sessions.length : 0,
        sessionsActives: Array.isArray(sessions) ? sessions.filter((s: any) => s.statut === 'en-cours' || s.statut === 'en-preparation').length : 0,
      });

      // Build groupe info with their active session
      if (Array.isArray(profils) && Array.isArray(sessions)) {
        const groupeProfils = profils.filter((p: any) => p.type === 'groupe-acteur');
        const activeSessions = sessions.filter((s: any) => s.statut === 'en-cours' || s.statut === 'en-preparation');
        const built: GroupeInfo[] = groupeProfils.map((p: any) => {
          const sess = activeSessions.find((s: any) => s.groupes_actifs?.includes(p.slug));
          return {
            id: p.id,
            slug: p.slug,
            nom: p.nom,
            couleur: p.couleur,
            actif: p.actif,
            activeSession: sess?.nom_entreprise || null,
            activeSessionStatut: sess?.statut || null,
          };
        });
        setGroupes(built);
      }
    } catch (e) {
      console.error('Failed to load stats', e);
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    { label: 'Profils d\'accès', value: stats.profils, icon: '👥', href: '/bac/admin/dashboard/profils', color: '#8b5cf6' },
    { label: 'Rôles', value: stats.roles, icon: '🎭', href: '/bac/admin/dashboard/roles', color: '#f59e0b' },
    { label: 'Scènes', value: stats.scenes, icon: '🎬', href: '/bac/admin/dashboard/scenes', color: '#3b82f6' },
    { label: 'Révélations', value: stats.revelations, icon: '🌅', href: '/bac/admin/dashboard/themes', color: '#10b981' },
    { label: 'Dénouements', value: stats.denouements, icon: '🎞️', href: '/bac/admin/dashboard/revelations', color: '#ef4444' },
    { label: 'Sessions', value: stats.sessions, icon: '📋', href: '/bac/admin/dashboard/sessions', color: '#06b6d4' },
  ];

  return (
    <div>
      <div className="bac-page-header bac-animate-in">
        <div>
          <h1>Tableau de bord</h1>
          <p style={{ color: 'var(--bac-text-secondary)', marginTop: 4 }}>Bureau à la Carte — Vue d'ensemble</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="bac-spinner" />
        </div>
      ) : (
        <>
          {/* Active sessions banner */}
          {stats.sessionsActives > 0 && (
            <div
              className="bac-card bac-animate-in"
              style={{
                background: 'linear-gradient(135deg, var(--bac-primary) 0%, #7c3aed 100%)',
                color: 'white',
                marginBottom: 24,
                border: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: 4 }}>Sessions actives</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800 }}>{stats.sessionsActives}</div>
                </div>
                <Link href="/bac/admin/dashboard/sessions" className="bac-btn" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  Voir les sessions →
                </Link>
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div className="bac-grid bac-grid-3 bac-stagger">
            {cards.map((card) => (
              <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
                <div className="bac-card bac-card-interactive" style={{ borderLeft: `4px solid ${card.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--bac-text-secondary)', marginBottom: 4 }}>{card.label}</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: card.color }}>{card.value}</div>
                    </div>
                    <div style={{ fontSize: '2rem', opacity: 0.3 }}>{card.icon}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick actions */}
          <div className="bac-card" style={{ marginTop: 24 }}>
            <h3 className="bac-h3" style={{ marginBottom: 16 }}>Actions rapides</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/bac/admin/dashboard/sessions?action=new" className="bac-btn bac-btn-primary">
                + Nouvelle session
              </Link>
              <Link href="/bac/admin/dashboard/scenes?action=new" className="bac-btn bac-btn-secondary">
                + Nouvelle scène
              </Link>
              <Link href="/bac/admin/dashboard/profils" className="bac-btn bac-btn-secondary">
                Gérer les profils
              </Link>
            </div>
          </div>

          {/* Groupe management */}
          {groupes.length > 0 && (
            <div className="bac-card" style={{ marginTop: 24 }}>
              <h3 className="bac-h3" style={{ marginBottom: 4 }}>Intervenir sur un groupe</h3>
              <p style={{ color: 'var(--bac-text-secondary)', fontSize: '0.875rem', marginBottom: 16 }}>
                En tant qu'admin, accédez à l'interface de n'importe quel groupe pour gérer son casting, ses scènes et la personnalisation.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {groupes.map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--bac-radius)', borderLeft: `4px solid ${g.couleur}`, background: 'var(--bac-bg-secondary)', opacity: g.actif ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="bac-color-dot" style={{ backgroundColor: g.couleur }} />
                      <div>
                        <strong>{g.nom}</strong>
                        {g.activeSession && (
                          <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>
                            — {g.activeSession} ({g.activeSessionStatut === 'en-cours' ? '🎬 En cours' : '⏳ En préparation'})
                          </span>
                        )}
                        {!g.activeSession && (
                          <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: 'var(--bac-text-muted)' }}>— Aucune session active</span>
                        )}
                      </div>
                    </div>
                    <Link href={`/bac/${g.slug}`} className="bac-btn bac-btn-secondary bac-btn-sm">
                      👥 Gérer
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
