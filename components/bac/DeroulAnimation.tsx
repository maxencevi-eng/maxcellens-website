'use client';

const ETAPES = [
  {
    num: 1,
    icon: '🎬',
    titre: 'Introduction',
    description:
      "Bienvenue, mise en condition et présentation de la journée. Les équipes découvrent le concept et les règles du jeu.",
    duree: '15 min',
    couleur: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
  },
  {
    num: 2,
    icon: '👥',
    titre: 'Attribution des rôles',
    description:
      "Chaque participant découvre son personnage et son style de jeu. Le casting se fait par groupe.",
    duree: '15 min',
    couleur: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
  },
  {
    num: 3,
    icon: '✍️',
    titre: 'Phase de scénarisation',
    description:
      "Les groupes construisent leurs scènes : choix des situations, personnalisation des répliques, anecdotes réelles intégrées au script.",
    duree: '30 min',
    couleur: '#06b6d4',
    bg: 'rgba(6,182,212,0.12)',
  },
  {
    num: 4,
    icon: '📖',
    titre: 'Lecture & tour de table',
    description:
      "Répétition à voix haute du script. Chacun prend conscience de son rôle, ajustements de dernière minute avant caméra.",
    duree: '15 min',
    couleur: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    num: 5,
    icon: '🎥',
    titre: 'Tournage',
    description:
      "Action (10mn/scène) ! Chaque scène est filmée par l'équipe technique. L'assistant réal donne le clap, le souffleur veille au grain.",
    duree: '2h',
    couleur: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
  },
  {
    num: 6,
    icon: '🎤',
    titre: 'Interviews',
    description:
      "Les acteurs répondent en personnage aux questions du journaliste. Réponses selon leur variant de jeu.",
    duree: '45 min',
    couleur: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
  },
  {
    num: 7,
    icon: '👏',
    titre: 'Clap de fin',
    description:
      "Débrief collectif, visionnage des premières images, révélation du concept et applaudissements. Le film est en route.",
    duree: '20 min',
    couleur: '#f97316',
    bg: 'rgba(249,115,22,0.12)',
  },
];

export default function DeroulAnimation({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        maxWidth: compact ? '100%' : 720,
        margin: '0 auto',
        padding: compact ? 0 : '8px 0',
      }}
    >
      {!compact && (
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2
            style={{
              fontWeight: 900,
              fontSize: '1.75rem',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 8,
              letterSpacing: '-0.02em',
            }}
          >
            Déroulé de l'animation
          </h2>
          <p style={{ color: 'var(--bac-text-secondary)', fontSize: '0.9375rem' }}>
            Les grandes étapes de votre journée de tournage
          </p>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        {/* Vertical connector line */}
        <div
          style={{
            position: 'absolute',
            left: compact ? 20 : 28,
            top: 32,
            bottom: 32,
            width: 2,
            background: 'linear-gradient(to bottom, #6366f1, #8b5cf6, #06b6d4, #f59e0b, #ef4444, #10b981, #f97316)',
            opacity: 0.3,
            borderRadius: 2,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 16 : 20 }}>
          {ETAPES.map((etape, idx) => (
            <div
              key={etape.num}
              className="bac-animate-in"
              style={{
                display: 'flex',
                gap: compact ? 16 : 20,
                alignItems: 'flex-start',
                animationDelay: `${idx * 60}ms`,
              }}
            >
              {/* Circle with number */}
              <div
                style={{
                  flexShrink: 0,
                  width: compact ? 40 : 56,
                  height: compact ? 40 : 56,
                  borderRadius: '50%',
                  background: etape.bg,
                  border: `2px solid ${etape.couleur}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: `0 0 12px ${etape.couleur}33`,
                }}
              >
                <span style={{ fontSize: compact ? '1.125rem' : '1.5rem', lineHeight: 1 }}>{etape.icon}</span>
                {!compact && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontWeight: 800,
                      color: etape.couleur,
                      letterSpacing: '0.05em',
                      marginTop: 1,
                    }}
                  >
                    {etape.num}/{ETAPES.length}
                  </span>
                )}
              </div>

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  background: etape.bg,
                  border: `1px solid ${etape.couleur}44`,
                  borderRadius: 12,
                  padding: compact ? '12px 16px' : '16px 20px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Accent bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: etape.couleur,
                    borderRadius: '3px 0 0 3px',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 8,
                    paddingLeft: 4,
                  }}
                >
                  <h3
                    style={{
                      fontWeight: 800,
                      fontSize: compact ? '0.9375rem' : '1.0625rem',
                      color: etape.couleur,
                      margin: 0,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {etape.titre}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: etape.couleur,
                      background: `${etape.couleur}22`,
                      border: `1px solid ${etape.couleur}44`,
                      borderRadius: 20,
                      padding: '2px 8px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    ⏱ {etape.duree}
                  </span>
                </div>

                {!compact && (
                  <p
                    style={{
                      color: 'var(--bac-text-secondary)',
                      fontSize: '0.875rem',
                      marginTop: 6,
                      lineHeight: 1.6,
                      paddingLeft: 4,
                    }}
                  >
                    {etape.description}
                  </p>
                )}
                {compact && (
                  <p
                    style={{
                      color: 'var(--bac-text-muted)',
                      fontSize: '0.8125rem',
                      marginTop: 4,
                      lineHeight: 1.5,
                      paddingLeft: 4,
                    }}
                  >
                    {etape.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total duration footer */}
      <div
        style={{
          marginTop: compact ? 20 : 28,
          padding: compact ? '12px 16px' : '16px 24px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1))',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: compact ? '0.9375rem' : '1rem',
              color: 'var(--bac-text)',
            }}
          >
            🎞️ Durée totale estimée
          </div>
          {!compact && (
            <div style={{ color: 'var(--bac-text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>
              Variable selon le nombre de groupes et de scènes
            </div>
          )}
        </div>
        <div
          style={{
            fontWeight: 900,
            fontSize: compact ? '1.125rem' : '1.375rem',
            color: '#6366f1',
            letterSpacing: '-0.02em',
          }}
        >
          ~4h
        </div>
      </div>
    </div>
  );
}
