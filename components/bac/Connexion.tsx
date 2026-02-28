'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ConnexionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profilSlug = searchParams.get('profil') || '';

  const [slug, setSlug] = useState(profilSlug);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profilSlug) setSlug(profilSlug);
  }, [profilSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/bac/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect based on profile type
        switch (data.type) {
          case 'coordinateur':
            router.push('/bac/coordinateur');
            break;
          case 'technique':
            router.push('/bac/technique');
            break;
          case 'groupe-acteur':
            router.push(`/bac/${slug}`);
            break;
          default:
            router.push('/bac');
        }
      } else {
        setError(data.error || 'Identifiants incorrects');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const profilLabels: Record<string, string> = {
    coordinateur: 'Coordinateur',
    technique: 'Équipe technique',
  };

  const displayName = profilLabels[profilSlug] || profilSlug || 'Bureau à la Carte';

  return (
    <div className="bac-login-page">
      <form className="bac-login-card" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎬</div>
          <h1>Bureau à la Carte</h1>
          <p className="bac-login-subtitle">{displayName}</p>
        </div>

        {!profilSlug && (
          <div className="bac-form-group">
            <label className="bac-label">Identifiant</label>
            <input
              type="text"
              className="bac-input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Votre identifiant"
              autoFocus
            />
          </div>
        )}

        <div className="bac-form-group">
          <label className="bac-label">Mot de passe</label>
          <input
            type="password"
            className="bac-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe du jour"
            autoFocus={!!profilSlug}
            style={{ fontSize: '1rem' }}
          />
        </div>

        {error && (
          <div style={{
            color: 'var(--bac-error)',
            fontSize: '0.875rem',
            marginBottom: 16,
            textAlign: 'center',
            padding: '10px 16px',
            background: 'var(--bac-error-bg)',
            borderRadius: 'var(--bac-radius)',
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="bac-btn bac-btn-primary bac-btn-lg"
          style={{ width: '100%' }}
          disabled={loading || !slug || !password}
        >
          {loading ? <span className="bac-spinner" style={{ width: 20, height: 20 }} /> : 'Se connecter'}
        </button>

        {profilSlug && (
          <input type="hidden" value={profilSlug} />
        )}
      </form>
    </div>
  );
}

export default function Connexion() {
  return (
    <Suspense fallback={
      <div className="bac-login-page">
        <div className="bac-login-card" style={{ textAlign: 'center' }}>
          <div className="bac-spinner" style={{ margin: '40px auto' }} />
        </div>
      </div>
    }>
      <ConnexionInner />
    </Suspense>
  );
}
