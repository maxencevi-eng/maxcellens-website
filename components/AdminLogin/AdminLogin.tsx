"use client";

import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      try {
        (listener as any)?.subscription?.unsubscribe?.();
      } catch (_) {}
    };
  }, []);

  async function signIn() {
    setMessage(null);
    setLoading(true);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        setMessage(res.error.message);
      } else {
        setMessage('Connecté');
      }
    } catch (err: any) {
      setMessage(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setMessage(null);
    await supabase.auth.signOut();
    setMessage('Déconnecté');
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.panel}>
        <div className={styles.orb} aria-hidden="true" />
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.badge}>
              <ShieldCheck size={16} />
              <span>Espace sécurisé</span>
            </div>
            <div className={styles.icon} aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className={styles.title}>Connexion admin</h2>
            <p className={styles.subtitle}>Gérez les contenus, le menu et le référencement depuis un espace plus clair et plus rapide.</p>
          </div>

          {user ? (
            <div className={styles.loggedIn}>
              <div className={styles.avatar} aria-hidden="true">
                {user.email?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.label}>Connecté</span>
                <span className={styles.email}>{user.email}</span>
              </div>
              <button type="button" onClick={signOut} className={styles.btnLogout}>
                Se déconnecter
              </button>
            </div>
          ) : (
            <form onSubmit={async (e) => { e.preventDefault(); await signIn(); }} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <div className={styles.inputWrap}>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    className={styles.input}
                    placeholder="vous@exemple.fr"
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Mot de passe</label>
                <div className={styles.inputWrap}>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    className={styles.input}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className={styles.toggle}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? 'Connexion…' : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
          {message && (
            <div className={message === 'Connecté' || message === 'Déconnecté' ? styles.messageSuccess : styles.messageError} role="status">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
