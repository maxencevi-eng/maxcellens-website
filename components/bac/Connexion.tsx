'use client';

import { useState } from 'react';

export default function Connexion({ profilSlug }: { profilSlug: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const displayName = profilSlug.charAt(0).toUpperCase() + profilSlug.slice(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/bac/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: profilSlug, password }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.reload(); // Full reload so the server picks up the new cookie
      } else {
        setError(data.error || 'Identifiants incorrects');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bac-login-page">
      <form className="bac-login-card" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎬</div>
          <h1>Bureau à la Carte</h1>
          <p className="bac-login-subtitle">{displayName}</p>
        </div>

        <div className="bac-form-group">
          <label className="bac-label">Mot de passe</label>
          <input
            type="password"
            className="bac-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            autoFocus
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
          disabled={loading || !password}
        >
          {loading ? <span className="bac-spinner" style={{ width: 20, height: 20 }} /> : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
