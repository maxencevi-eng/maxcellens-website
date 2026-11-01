"use client";

import { useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import styles from './ContactForm.module.css';

const TYPES = ['Vidéo commerciale', 'Événement', 'Corporate / institutionnel', 'Portrait', 'Cadreur / tournage', 'Bureau à la carte', 'Autre'];

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Formulaire de contact : quelques champs, envoi par e-mail via /api/contact (Brevo). */
export default function ContactForm() {
  const [type, setType] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, type }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "L'envoi a échoué.");
      setStatus('sent');
      form.reset();
      setType('');
    } catch (err: any) {
      setError(err?.message || "L'envoi a échoué.");
      setStatus('error');
    }
  }

  return (
    <section className={styles.block} id="formulaire" aria-labelledby="contact-form-title">
      <div className={styles.intro}>
        <span className={styles.eyebrow}>Écrivez-moi</span>
        <h2 id="contact-form-title" className={styles.title}>Parlons de votre projet</h2>
        <p className={styles.lead}>
          Quelques lignes suffisent : le type de projet, la date et le lieu si vous les connaissez.
          Je vous réponds rapidement.
        </p>
        <p className={styles.direct}>
          Ou directement : <a href="mailto:maxcellens@gmail.com">maxcellens@gmail.com</a>
          <span aria-hidden> · </span>
          <a href="tel:+33674966458">06 74 96 64 58</a>
        </p>
      </div>

      {status === 'sent' ? (
        <div className={styles.success} role="status">
          <span className={styles.successIcon} aria-hidden><Check size={22} /></span>
          <p className={styles.successTitle}>Message envoyé, merci !</p>
          <p className={styles.successText}>Je reviens vers vous très vite.</p>
          <button type="button" className={styles.linkBtn} onClick={() => setStatus('idle')}>Envoyer un autre message</button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit} noValidate={false}>
          <fieldset className={styles.types}>
            <legend className={styles.label}>Votre projet</legend>
            <div className={styles.chips}>
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={styles.chip}
                  aria-pressed={type === t}
                  onClick={() => setType(type === t ? '' : t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Nom *</span>
              <input name="name" required maxLength={120} autoComplete="name" />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>E-mail *</span>
              <input name="email" type="email" required maxLength={200} autoComplete="email" />
            </label>
          </div>
          <label className={styles.field}>
            <span className={styles.label}>Téléphone <em>(facultatif)</em></span>
            <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Message *</span>
            <textarea name="message" required minLength={10} maxLength={5000} rows={5} placeholder="Votre projet, la date, le lieu…" />
          </label>

          {/* Pot de miel anti-robots : invisible pour les visiteurs */}
          <input name="website" tabIndex={-1} autoComplete="off" className={styles.honeypot} aria-hidden />

          {status === 'error' ? <p className={styles.error} role="alert">{error}</p> : null}

          <div className={styles.footer}>
            <button type="submit" className={styles.submit} disabled={status === 'sending'}>
              {status === 'sending' ? 'Envoi…' : 'Envoyer'}
              <span className={styles.submitIcon} aria-hidden>
                {status === 'sending' ? <Loader2 size={16} className={styles.spin} /> : <ArrowRight size={16} />}
              </span>
            </button>
            <p className={styles.legal}>
              Vos informations servent uniquement à vous répondre.{' '}
              <a href="/politique-de-confidentialite">Confidentialité</a>
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
