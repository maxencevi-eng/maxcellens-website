"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import ClientShell from './ClientShell';
import Brand from './Brand';
import { slugify } from '../../lib/clientGalleries/types';
import styles from './ClientGallery.module.css';

/**
 * Accueil de l'espace client (/client) : aucune galerie n'est listée (elles
 * sont privées). Le client saisit l'identifiant de sa galerie, ou colle le
 * lien reçu, et il est envoyé vers /client/<slug>.
 */
function toHref(raw: string): string | null {
  let v = raw.trim();
  let key = '';
  // Lien complet collé : on garde ce qui suit /client/, et le lien magique éventuel
  const m = v.match(/\/client\/([^/?#\s]+)(?:\?[^#\s]*?\bk=([^&#\s]+))?/i);
  if (m) {
    v = decodeURIComponent(m[1]);
    if (m[2]) key = `?k=${m[2]}`;
  }
  const slug = slugify(v);
  return slug && v ? `/client/${encodeURIComponent(slug)}${key}` : null;
}

export default function ClientHome({ logo }: { logo?: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const href = toHref(value);
    if (!href) {
      setError('Indiquez l’identifiant de votre galerie.');
      return;
    }
    setError(null);
    setBusy(true);
    router.push(href);
  }

  return (
    <ClientShell>
      <div className={styles.gate}>
        <form className={`${styles.gateCard} ${styles.gateForm}`} onSubmit={submit}>
          <Brand logo={logo} className={styles.gateBrand} size="lg" />
          <h1 className={styles.gateTitle}>Espace client</h1>
          <p className={styles.gateHint} style={{ marginTop: 10 }}>
            Retrouvez les photos de votre événement.
          </p>
          <div className={styles.gateField}>
            <input
              type="text"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Identifiant ou lien de la galerie"
              aria-label="Identifiant ou lien de la galerie"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <button type="submit" disabled={busy || !value.trim()}>
              {busy ? <Loader2 size={16} className="spin" /> : null}
              Accéder <ArrowRight size={16} />
            </button>
          </div>
          <div className={styles.gateHint}>
            L’identifiant figure dans le lien envoyé par Maxcellens. Lien perdu ?{' '}
            <a href="/contact">Contactez-nous</a>.
          </div>
          {error ? <div className={styles.error} role="alert">{error}</div> : null}
        </form>
      </div>
    </ClientShell>
  );
}
