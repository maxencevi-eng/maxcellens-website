"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';
import styles from './ContactBlocks.module.css';
import type { ContactZonesData } from './ContactZonesEditModal';

const ContactEditModal = dynamic(() => import('./ContactEditModal'), { ssr: false });
const ContactZonesEditModal = dynamic(() => import('./ContactZonesEditModal'), { ssr: false });

export default function ContactBlocks() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [openZones, setOpenZones] = useState(false);
  const [html, setHtml] = useState<string>('');
  const [photo, setPhoto] = useState<{ url?: string; path?: string } | null>(null);
  const [zones, setZones] = useState<ContactZonesData | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });

    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=contact_intro,contact_photo,contact_zones');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.contact_intro) {
          try {
            const parsed = JSON.parse(String(s.contact_intro));
            setHtml(parsed || '');
          } catch (e) { setHtml(String(s.contact_intro || '')); }
        }
        if (s.contact_photo) {
          try {
            const parsed = JSON.parse(String(s.contact_photo));
            if (parsed && (parsed.url || parsed.path)) setPhoto({ url: parsed.url, path: parsed.path });
            else if (typeof parsed === 'string') setPhoto({ url: parsed });
          } catch (e) { setPhoto({ url: String(s.contact_photo) }); }
        }
        if (s.contact_zones) {
          try {
            const parsed = JSON.parse(String(s.contact_zones)) as ContactZonesData;
            if (parsed && typeof parsed === 'object') setZones(parsed);
          } catch (_) {}
        }
      } catch (e) { /* ignore */ }
    }
    load();

    function onUpdate(e?: any) { load(); }
    window.addEventListener('site-settings-updated', onUpdate as EventListener);
    return () => { mounted = false; try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {} window.removeEventListener('site-settings-updated', onUpdate as EventListener); };
  }, []);

  // fallback content when no site-settings set
  const fallbackHtml = '<p><strong>Photographe, vidéaste</strong> et chef de projets depuis 2020.</p><p>Je suis spécialisé dans la création d\'images pour les entreprises. Des vidéos courtes pour vos réseaux sociaux, la couverture de grands évènements, et la réalisation de portraits retouchés professionnellement. Je mets tout en œuvre pour livrer des images de haute qualité adaptées à votre besoin.</p><p>N\'hésitez pas à <strong>me contacter</strong> pour échanger et parler de votre attente.</p><p><strong>Email :</strong> <a href="mailto:maxcellens@gmail.com">maxcellens@gmail.com</a></p><p><strong>Téléphone :</strong> (+33) 06 74 96 64 58</p>';

  return (
    <div className={styles.wrapper}>
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        {isAdmin && (
          <button className="btn-secondary" onClick={() => setOpen(true)} style={{ position: 'absolute', right: 12, top: -16, zIndex: 5, background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>Modifier</button>
        )}
      </div>

      <div className={styles.introGrid}>
        <div>
          {/* Only render the photo if a custom photo is set; otherwise render an empty placeholder to avoid showing base images */}
          {photo?.url ? (
            <img
              className={styles.photo}
              alt="Portrait"
              src={String(photo.url)}
            />
          ) : (
            <div className={styles.photoPlaceholder} aria-hidden="true" />
          )}
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>@maxcellens</div>
          <div className={styles.cardBody}>
            <div className={styles.cardBodyInner} dangerouslySetInnerHTML={{ __html: (html || fallbackHtml) }} />
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: '2rem' }}>
        {isAdmin && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setOpenZones(true)}
            style={{ position: 'absolute', right: 12, top: -16, zIndex: 5, background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}
          >
            Modifier
          </button>
        )}
        <div className={styles.threeCols}>
          <div>
            <div className={styles.colTitle}>{zones?.qg?.title ?? 'QG'}</div>
            <div className={styles.colBody} dangerouslySetInnerHTML={{ __html: zones?.qg?.text ?? '<p>Basé à Clamart (92). Point de départ de mes missions en Île-de-France.</p>' }} />
            {(zones?.qg?.phone ?? '06 74 96 64 58') && (
              <div style={{ marginTop: '0.5rem' }}>📞 {zones?.qg?.phone ?? '06 74 96 64 58'}</div>
            )}
          </div>
          <div>
            <div className={styles.colTitle}>{zones?.paris?.title ?? 'Paris & Alentours'}</div>
            <div className={styles.colBody} dangerouslySetInnerHTML={{ __html: zones?.paris?.text ?? '<p>Priorité aux transports en commun. Voiture possible pour la banlieue proche — frais kilométriques.</p>' }} />
          </div>
          <div>
            <div className={styles.colTitle}>{zones?.france?.title ?? 'France & Monde'}</div>
            <div className={styles.colBody} dangerouslySetInnerHTML={{ __html: zones?.france?.text ?? '<p>Déplacements réguliers en train pour des missions partout en France et parfois à l\'étranger — frais de déplacement.</p>' }} />
          </div>
        </div>

        <div className={styles.mapContainer}>
          <iframe
            className={styles.mapIframe}
            src={`https://www.google.com/maps?q=${encodeURIComponent(zones?.mapQuery?.trim() || '92140 Clamart')}&output=embed`}
            title="Carte"
            loading="lazy"
          />
        </div>
      </div>

      {open ? (
        <ContactEditModal onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />
      ) : null}
      {openZones ? (
        <ContactZonesEditModal onClose={() => setOpenZones(false)} onSaved={() => setOpenZones(false)} />
      ) : null}
    </div>
  );
}
