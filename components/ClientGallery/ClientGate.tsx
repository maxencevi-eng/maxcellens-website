"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { Theme } from '../../lib/clientGalleries/types';
import ClientShell from './ClientShell';
import Brand from './Brand';
import styles from './ClientGallery.module.css';

/**
 * Porte d'accès : mot de passe, ou identification (prénom + e-mail) quand
 * la galerie l'exige. Sur succès, le serveur pose un cookie et on recharge
 * la page serveur, qui rend alors la galerie.
 */
export default function ClientGate({
  slug,
  mode,
  title,
  date,
  cover,
  theme,
  logo,
}: {
  slug: string;
  mode: 'password' | 'email';
  title: string;
  date: string | null;
  cover: string | null;
  theme: Theme;
  logo?: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/client/${slug}/${mode === 'password' ? 'unlock' : 'visitor'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'password' ? { password } : { name, email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || 'Une erreur est survenue');
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau.');
      setBusy(false);
    }
  }

  return (
    <ClientShell theme={theme}>
      <div className={styles.gate}>
        {cover ? <div className={styles.gateBg} style={{ backgroundImage: `url(${cover})` }} /> : null}
        <form className={`${styles.gateCard} ${styles.gateForm}`} onSubmit={submit}>
          <Brand logo={logo} className={styles.gateBrand} size="lg" />
          <h1 className={styles.gateTitle}>{title}</h1>
          {date ? <div className={styles.gateDate}>{date}</div> : null}

          {mode === 'password' ? (
            <>
              <div className={styles.gateField}>
                <input
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  placeholder="Mot de passe"
                  aria-label="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit" disabled={busy || !password.trim()}>
                  {busy ? <Loader2 size={16} className="spin" /> : null}
                  Accéder <ArrowRight size={16} />
                </button>
              </div>
              <div className={styles.gateHint}>Le mot de passe figure dans le message de Maxcellens.</div>
            </>
          ) : (
            <>
              <p className={styles.gateHint} style={{ marginTop: 22 }}>
                Indiquez votre nom et votre e-mail pour accéder aux photos.
              </p>
              <input className={styles.input} placeholder="Prénom et nom" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              <input
                className={styles.input}
                type="email"
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <button className={styles.primary} type="submit" disabled={busy || !email.trim()}>
                Accéder aux photos <ArrowRight size={16} />
              </button>
            </>
          )}
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
        </form>
      </div>
    </ClientShell>
  );
}
