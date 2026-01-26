import React from 'react';
import styles from './ContactBlocks.module.css';

export default function ContactBlocks() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.introGrid}>
        <div>
          <img
            className={styles.photo}
            alt="Portrait"
            src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80"
          />
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>@maxcellens</div>
          <div className={styles.cardBody}>
            <p><strong>Photographe, vidéaste</strong> et chef de projets depuis 2020.</p>
            <p>Je suis spécialisé dans la création d'images pour les entreprises. Des vidéos courtes pour vos réseaux sociaux, la couverture de grands évènements, et la réalisation de portraits retouchés professionnellement. Je mets tout en œuvre pour livrer des images de haute qualité adaptées à votre besoin.</p>
            <p>N'hésitez pas à <strong>me contacter</strong> pour échanger et parler de votre attente.</p>
            <p><strong>Email :</strong> <a href="mailto:maxcellens@gmail.com">maxcellens@gmail.com</a></p>
            <p><strong>Téléphone :</strong> (+33) 06 74 96 64 58</p>
          </div>
        </div>
      </div>

      <div className={styles.threeCols}>
        <div>
          <div className={styles.colTitle}>QG</div>
          <div>Basé à Clamart (92). Point de départ de mes missions en Île-de-France.</div>
          <div style={{ marginTop: '0.5rem' }}>📞 06 74 96 64 58</div>
        </div>
        <div>
          <div className={styles.colTitle}>Paris & Alentours</div>
          <div>Priorité aux transports en commun. Voiture possible pour la banlieue proche — frais kilométriques.</div>
        </div>
        <div>
          <div className={styles.colTitle}>France & Monde</div>
          <div>Déplacements réguliers en train pour des missions partout en France et parfois à l'étranger — frais de déplacement.</div>
        </div>
      </div>

      <div className={styles.mapContainer}>
        <iframe
          className={styles.mapIframe}
          src="https://www.google.com/maps?q=92140+Clamart&output=embed"
          title="Clamart map"
          loading="lazy"
        />
      </div>
    </div>
  );
}
