import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bureau à la Carte — Team Building Cinéma | Maxcellens',
  description: 'Bureau à la Carte : l\'activité team building vidéo où vos équipes deviennent les stars d\'un épisode de série TV. Casting, improvisation, tournage — une expérience corporate unique.',
  robots: 'noindex, nofollow',
};

export default function BacLandingPage() {
  return (
    <div style={{ '--bac-land-primary': '#6366f1', '--bac-land-primary-light': '#818cf8', '--bac-land-bg': '#0f0f1a', '--bac-land-surface': '#1a1a2e', '--bac-land-text': '#f1f5f9', '--bac-land-text-muted': '#94a3b8' } as React.CSSProperties}>
      <style>{`
        .bac-land { min-height: 100vh; background: var(--bac-land-bg); color: var(--bac-land-text); font-family: 'Inter', system-ui, sans-serif; overflow-x: hidden; }
        .bac-land * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Hero */
        .bac-hero { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 60px 24px; overflow: hidden; }
        .bac-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.1) 0%, transparent 50%); pointer-events: none; }
        .bac-hero::after { content: ''; position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"); opacity: 0.5; pointer-events: none; }
        .bac-hero-inner { position: relative; z-index: 1; max-width: 700px; animation: bacFadeUp 1s ease-out; }

        .bac-hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); border-radius: 100px; padding: 8px 20px; font-size: 0.8125rem; font-weight: 600; color: var(--bac-land-primary-light); letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 24px; }
        .bac-hero-badge::before { content: ''; width: 8px; height: 8px; background: var(--bac-land-primary-light); border-radius: 50%; animation: bacPulse 2s infinite; }

        .bac-hero h1 { font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 800; line-height: 1.1; margin-bottom: 20px; background: linear-gradient(135deg, #f1f5f9 30%, #818cf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .bac-hero p { font-size: 1.125rem; line-height: 1.6; color: var(--bac-land-text-muted); max-width: 550px; margin: 0 auto 40px; }

        .bac-hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .bac-land-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; border-radius: 12px; font-size: 1rem; font-weight: 600; border: none; cursor: pointer; transition: all 0.3s ease; text-decoration: none; }
        .bac-land-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; box-shadow: 0 4px 20px rgba(99,102,241,0.4); }
        .bac-land-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.5); }
        .bac-land-btn-outline { background: transparent; color: var(--bac-land-text); border: 1px solid rgba(255,255,255,0.2); }
        .bac-land-btn-outline:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.3); }

        /* Cards section */
        .bac-section { padding: 80px 24px; max-width: 1100px; margin: 0 auto; }
        .bac-section-header { text-align: center; margin-bottom: 48px; }
        .bac-section-header h2 { font-size: clamp(1.75rem, 3.5vw, 2.5rem); font-weight: 800; margin-bottom: 12px; }
        .bac-section-header p { color: var(--bac-land-text-muted); font-size: 1.0625rem; max-width: 500px; margin: 0 auto; }

        .bac-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .bac-card-land { background: var(--bac-land-surface); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 32px 28px; transition: all 0.3s ease; position: relative; overflow: hidden; }
        .bac-card-land:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.3); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
        .bac-card-land::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--card-accent, #6366f1), transparent); opacity: 0; transition: opacity 0.3s; }
        .bac-card-land:hover::before { opacity: 1; }
        .bac-card-icon { font-size: 2.5rem; margin-bottom: 16px; display: block; }
        .bac-card-land h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; }
        .bac-card-land p { color: var(--bac-land-text-muted); font-size: 0.9375rem; line-height: 1.5; margin-bottom: 20px; }
        .bac-card-link { display: inline-flex; align-items: center; gap: 6px; color: var(--bac-land-primary-light); font-weight: 600; font-size: 0.875rem; text-decoration: none; transition: gap 0.2s; }
        .bac-card-link:hover { gap: 10px; }

        /* How it works */
        .bac-steps { display: flex; flex-direction: column; gap: 0; position: relative; }
        .bac-steps::before { content: ''; position: absolute; left: 28px; top: 28px; bottom: 28px; width: 2px; background: linear-gradient(to bottom, var(--bac-land-primary), rgba(99,102,241,0.1)); }
        .bac-step-row { display: flex; gap: 24px; align-items: flex-start; padding: 24px 0; position: relative; }
        .bac-step-num { flex-shrink: 0; width: 56px; height: 56px; border-radius: 16px; background: var(--bac-land-surface); border: 2px solid var(--bac-land-primary); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800; color: var(--bac-land-primary-light); position: relative; z-index: 1; }
        .bac-step-body h3 { font-size: 1.125rem; font-weight: 700; margin-bottom: 4px; }
        .bac-step-body p { color: var(--bac-land-text-muted); font-size: 0.9375rem; line-height: 1.5; }

        /* Footer CTA */
        .bac-cta { text-align: center; padding: 80px 24px 100px; }
        .bac-cta h2 { font-size: clamp(1.75rem, 3.5vw, 2.25rem); font-weight: 800; margin-bottom: 12px; }
        .bac-cta p { color: var(--bac-land-text-muted); margin-bottom: 32px; font-size: 1.0625rem; }

        /* Animations */
        @keyframes bacFadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bacPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* Films strip */
        .bac-film-strip { display: flex; justify-content: center; gap: 32px; margin-top: 60px; opacity: 0.5; }
        .bac-film-frame { width: 60px; height: 48px; border: 2px solid rgba(255,255,255,0.1); border-radius: 4px; }

        @media (max-width: 640px) {
          .bac-hero { min-height: auto; padding: 100px 20px 60px; }
          .bac-hero-actions { flex-direction: column; align-items: center; }
          .bac-land-btn { width: 100%; justify-content: center; }
          .bac-section { padding: 60px 20px; }
          .bac-steps::before { left: 27px; }
        }
      `}</style>

      <div className="bac-land">
        {/* Hero */}
        <section className="bac-hero">
          <div className="bac-hero-inner">
            <div className="bac-hero-badge">
              Expérience Team Building
            </div>
            <h1>Bureau à la Carte</h1>
            <p>
              Vos collaborateurs deviennent les stars d'un épisode de série TV.
              Casting, improvisation guidée, tournage — une activité team building
              vidéo unique et mémorable.
            </p>
            <div className="bac-hero-actions">
              <a href="/bac/admin" className="bac-land-btn bac-land-btn-primary">
                🔧 Administration
              </a>
              <a href="/bac/connexion" className="bac-land-btn bac-land-btn-outline">
                🚀 Accès participants
              </a>
            </div>
            <div className="bac-film-strip">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="bac-film-frame" />
              ))}
            </div>
          </div>
        </section>

        {/* Espaces */}
        <section className="bac-section">
          <div className="bac-section-header">
            <h2>Les espaces</h2>
            <p>Chaque profil a son interface dédiée, optimisée pour son rôle le jour J.</p>
          </div>
          <div className="bac-cards">
            <div className="bac-card-land" style={{ '--card-accent': '#6366f1' } as React.CSSProperties}>
              <span className="bac-card-icon">🔧</span>
              <h3>Administration</h3>
              <p>Créez les rôles, écrivez les scènes, configurez les sessions et déclenchez le jour J.</p>
              <a href="/bac/admin" className="bac-card-link">Accéder <span>→</span></a>
            </div>
            <div className="bac-card-land" style={{ '--card-accent': '#8b5cf6' } as React.CSSProperties}>
              <span className="bac-card-icon">📋</span>
              <h3>Coordination</h3>
              <p>Suivez la progression de tous les groupes en temps réel pendant l'événement.</p>
              <a href="/bac/connexion?profil=coordinateur" className="bac-card-link">Accéder <span>→</span></a>
            </div>
            <div className="bac-card-land" style={{ '--card-accent': '#06b6d4' } as React.CSSProperties}>
              <span className="bac-card-icon">📹</span>
              <h3>Équipe technique</h3>
              <p>Consultez les scripts complets, la répartition des rôles et les interviews à tourner.</p>
              <a href="/bac/connexion?profil=technique" className="bac-card-link">Accéder <span>→</span></a>
            </div>
            <div className="bac-card-land" style={{ '--card-accent': '#f59e0b' } as React.CSSProperties}>
              <span className="bac-card-icon">🎭</span>
              <h3>Groupes acteurs</h3>
              <p>Les participants choisissent leurs rôles, leurs scènes et personnalisent leurs répliques.</p>
              <a href="/bac/connexion" className="bac-card-link">Accéder <span>→</span></a>
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section className="bac-section">
          <div className="bac-section-header">
            <h2>Comment ça marche</h2>
            <p>Un déroulé fluide pour une expérience immersive.</p>
          </div>
          <div className="bac-steps">
            <div className="bac-step-row">
              <div className="bac-step-num">1</div>
              <div className="bac-step-body">
                <h3>Préparation</h3>
                <p>L'admin configure les rôles, écrit les scènes avec les variantes de personnalité, définit le thème et la révélation de l'épisode.</p>
              </div>
            </div>
            <div className="bac-step-row">
              <div className="bac-step-num">2</div>
              <div className="bac-step-body">
                <h3>Casting</h3>
                <p>Chaque groupe de participants se connecte sur mobile, choisit le nombre de joueurs et attribue les rôles et variantes de personnalité.</p>
              </div>
            </div>
            <div className="bac-step-row">
              <div className="bac-step-num">3</div>
              <div className="bac-step-body">
                <h3>Choix des scènes</h3>
                <p>Les groupes sélectionnent une scène par acte (4 actes) parmi les options proposées, selon la difficulté et le ton souhaités.</p>
              </div>
            </div>
            <div className="bac-step-row">
              <div className="bac-step-num">4</div>
              <div className="bac-step-body">
                <h3>Personnalisation</h3>
                <p>Chaque réplique est attribuée à un acteur du groupe, avec la possibilité d'ajouter anecdotes et touches personnelles.</p>
              </div>
            </div>
            <div className="bac-step-row">
              <div className="bac-step-num">5</div>
              <div className="bac-step-body">
                <h3>Tournage !</h3>
                <p>L'équipe technique reçoit les scripts finalisés et tourne l'épisode avec chaque groupe. Action ! 🎬</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bac-cta">
          <h2>Prêt pour le tournage ?</h2>
          <p>Connectez-vous selon votre rôle pour commencer l'expérience.</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/bac/admin" className="bac-land-btn bac-land-btn-primary">Administration</a>
            <a href="/bac/connexion" className="bac-land-btn bac-land-btn-outline">Connexion participants</a>
          </div>
        </section>
      </div>
    </div>
  );
}
