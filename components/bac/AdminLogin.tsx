'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function BacAdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoChecking, setSsoChecking] = useState(true);
  const router = useRouter();

  // SSO: auto-login if site admin is already authenticated via Supabase Auth
  useEffect(() => {
    async function checkSiteAdmin() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('/bac/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sso: true, access_token: session.access_token }),
          });
          if (res.ok) {
            router.push('/animation/admin/dashboard');
            return;
          }
        }
      } catch { }
      setSsoChecking(false);
    }
    checkSiteAdmin();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/bac/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'admin', password }),
      });

      if (res.ok) {
        router.push('/animation/admin/dashboard');
      } else {
        setError('Mot de passe incorrect');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (ssoChecking) {
    return (
      <div className="bac-login-page">
        <div className="bac-login-card" style={{ textAlign: 'center' }}>
          <div className="bac-spinner" style={{ margin: '40px auto' }} />
          <p style={{ color: 'var(--bac-text-secondary)' }}>Vérification de l'accès admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bac-login-page">
      <form className="bac-login-card" onSubmit={handleSubmit}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎬</div>
          <h1>Bureau à la Carte</h1>
          <p className="bac-login-subtitle">Administration</p>
        </div>

        <div className="bac-form-group">
          <label className="bac-label">Mot de passe admin</label>
          <input
            type="password"
            className="bac-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Entrez le mot de passe"
            autoFocus
          />
        </div>

        {error && (
          <div style={{ color: 'var(--bac-error)', fontSize: '0.875rem', marginBottom: 16, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="bac-btn bac-btn-primary bac-btn-lg"
          style={{ width: '100%' }}
          disabled={loading || !password}
        >
          {loading ? (
            <span className="bac-spinner" style={{ width: 20, height: 20 }} />
          ) : (
            'Se connecter'
          )}
        </button>
      </form>
    </div>
  );
}
