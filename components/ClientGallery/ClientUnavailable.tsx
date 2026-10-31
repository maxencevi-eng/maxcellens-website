import React from 'react';
import ClientShell from './ClientShell';
import styles from './ClientGallery.module.css';

const COPY: Record<string, { title: string; text: string }> = {
  missing: {
    title: 'Galerie introuvable',
    text: "Ce lien ne correspond à aucune galerie. Vérifiez l'adresse reçue, ou contactez Maxcellens.",
  },
  draft: {
    title: 'Galerie en préparation',
    text: 'Vos photos ne sont pas encore prêtes. Vous recevrez un message dès leur mise en ligne.',
  },
  expired: {
    title: "Cette galerie n'est plus disponible",
    text: 'La période de mise à disposition est terminée. Contactez Maxcellens pour la réactiver.',
  },
  setup: {
    title: 'Galerie momentanément indisponible',
    text: 'Le stockage des fichiers est en cours de configuration. Réessayez un peu plus tard.',
  },
};

export default function ClientUnavailable({ reason }: { reason: string }) {
  const c = COPY[reason] || COPY.missing;
  return (
    <ClientShell>
      <div className={styles.unavailable}>
        <div>
          <div className={styles.footBrand}>Maxcellens</div>
          <h1>{c.title}</h1>
          <p>{c.text}</p>
          <a href="/contact">Contacter Maxcellens</a>
        </div>
      </div>
    </ClientShell>
  );
}
