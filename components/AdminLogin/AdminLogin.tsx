"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser((data as any).user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      // unsubscribe
      try {
        (listener as any)?.subscription?.unsubscribe?.();
      } catch (_) {}
    };
  }, []);

  async function signIn() {
    setMessage(null);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setMessage(res.error.message);
      } else {
        setMessage('Connecté');
      }
    } catch (err: any) {
      setMessage(err?.message || String(err));
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMessage('Déconnecté');
  }

  return (
    <div style={{ padding: '1rem 0' }}>
      <div style={{ maxWidth: 520 }}>
        {user ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div>
              <strong>Connecté :</strong>
              <div style={{ fontSize: 13 }}>{user.email}</div>
            </div>
            <button onClick={signOut} style={{ marginLeft: 'auto' }}>Se déconnecter</button>
          </div>
        ) : (
          <form onSubmit={async (e) => { e.preventDefault(); await signIn(); }} style={{ display: 'grid', gap: 12 }}>
            <label style={{ fontSize: 13 }}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%' }}
            />

            <label style={{ fontSize: 13 }}>Mot de passe</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', width: '100%' }}
            />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="submit" style={{ padding: '8px 12px', borderRadius: 6, background: '#0f1720', color: '#fff', border: 'none' }}>Se connecter</button>
            </div>
          </form>
        )}

        {message && <div style={{ marginTop: 10, color: 'var(--muted)' }}>{message}</div>}
      </div>
    </div>
  );
}
