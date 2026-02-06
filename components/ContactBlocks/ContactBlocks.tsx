"use client";

import React, { Fragment, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';
import styles from './ContactBlocks.module.css';
import type { ContactZonesData } from './ContactZonesEditModal';
import type { ContactKitData } from './ContactKitEditModal';
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from '../BlockVisibility';
import AnimateInView, { AnimateStaggerItem } from '../AnimateInView/AnimateInView';

const ContactEditModal = dynamic(() => import('./ContactEditModal'), { ssr: false });
const ContactZonesEditModal = dynamic(() => import('./ContactZonesEditModal'), { ssr: false });
const ContactKitEditModal = dynamic(() => import('./ContactKitEditModal'), { ssr: false });

export default function ContactBlocks() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [openZones, setOpenZones] = useState(false);
  const [contactHandle, setContactHandle] = useState('@maxcellens');
  const [html, setHtml] = useState<string>('');
  const [contactIntroBg, setContactIntroBg] = useState<string>('');
  const [photo, setPhoto] = useState<{ url?: string; path?: string } | null>(null);
  const [zones, setZones] = useState<ContactZonesData | null>(null);
  const [kitData, setKitData] = useState<ContactKitData | null>(null);
  const [openKit, setOpenKit] = useState(false);
  const { hiddenBlocks, blockWidthModes, blockOrderContact, isAdmin: isAdminCtx } = useBlockVisibility();
  const hide = (id: string) => !isAdminCtx && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === 'max1600' ? 'block-width-1600' : '');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });

    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=contact_handle,contact_intro,contact_photo,contact_zones,contact_kit');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.contact_handle != null) setContactHandle(String(s.contact_handle));
        else setContactHandle('@maxcellens');
        if (s.contact_intro) {
          try {
            const parsed = JSON.parse(String(s.contact_intro));
            if (parsed && typeof parsed === 'object' && 'html' in parsed) {
              setHtml(parsed.html ?? '');
              setContactIntroBg(parsed.backgroundColor ?? '');
            } else {
              setHtml(typeof parsed === 'string' ? parsed : '');
              setContactIntroBg('');
            }
          } catch (e) { setHtml(String(s.contact_intro || '')); setContactIntroBg(''); }
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
        if (s.contact_kit) {
          try {
            const parsed = JSON.parse(String(s.contact_kit)) as ContactKitData;
            if (parsed && typeof parsed === 'object') setKitData(parsed);
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

  const btnWrap = { display: 'flex', gap: 8, alignItems: 'center', position: 'absolute' as const, right: 12, top: -16, zIndex: 5 };

  const introSection = hide('contact_intro') ? null : (
      <div className={`${styles.blockInner} ${styles.blockFullWidthBg} ${blockWidthClass('contact_intro')}`.trim()} style={{ ...(contactIntroBg ? { backgroundColor: contactIntroBg } : {}), marginTop: 0 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        {isAdmin && (
          <div style={btnWrap}>
            <BlockVisibilityToggle blockId="contact_intro" />
            <BlockWidthToggle blockId="contact_intro" />
            <button className="btn-secondary" onClick={() => setOpen(true)} style={{ position: 'static', background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>Modifier</button>
            <BlockOrderButtons page="contact" blockId="contact_intro" />
          </div>
        )}
      </div>

      <AnimateInView variant="fadeUp">
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
          <div className={styles.cardHeader}>{contactHandle || '@maxcellens'}</div>
          <div className={styles.cardBody}>
            <div className={`${styles.cardBodyInner} richtext-content`} dangerouslySetInnerHTML={{ __html: (html || fallbackHtml) }} />
        </div>
      </div>
      </div>
      </AnimateInView>
      </div>
  );

  const zonesSection = hide('contact_zones') ? null : (
      <div className={`${styles.blockInner} ${styles.blockFullWidthBg} ${blockWidthClass('contact_zones')}`.trim()} style={{ position: 'relative', marginTop: '2rem', ...(zones?.backgroundColor ? { backgroundColor: zones.backgroundColor } : {}) }}>
        {isAdmin && (
          <div style={{ ...btnWrap, top: -16 }}>
            <BlockVisibilityToggle blockId="contact_zones" />
            <BlockWidthToggle blockId="contact_zones" />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpenZones(true)}
              style={{ position: 'static', background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}
            >
              Modifier
            </button>
            <BlockOrderButtons page="contact" blockId="contact_zones" />
          </div>
        )}
        <AnimateInView variant="stagger" className={styles.threeCols}>
          <AnimateStaggerItem>
            <div>
              {(() => {
                const tag = (zones?.qg?.titleStyle && ['p', 'h1', 'h2', 'h3', 'h4', 'h5'].includes(zones.qg.titleStyle)) ? zones.qg.titleStyle : 'h3';
                const Tag = tag as keyof React.JSX.IntrinsicElements;
                const fs = zones?.qg?.titleFontSize != null && zones.qg.titleFontSize >= 8 && zones.qg.titleFontSize <= 72 ? zones.qg.titleFontSize : undefined;
                return <Tag className={`${styles.colTitle} style-${tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{zones?.qg?.title ?? 'QG'}</Tag>;
              })()}
              <div className={`${styles.colBody} richtext-content`} dangerouslySetInnerHTML={{ __html: zones?.qg?.text ?? '<p>Basé à Clamart (92). Point de départ de mes missions en Île-de-France.</p>' }} />
              {(zones?.qg?.phone ?? '06 74 96 64 58') && (
                <div style={{ marginTop: '0.5rem' }}>📞 {zones?.qg?.phone ?? '06 74 96 64 58'}</div>
              )}
            </div>
          </AnimateStaggerItem>
          <AnimateStaggerItem>
            <div>
              {(() => {
                const tag = (zones?.paris?.titleStyle && ['p', 'h1', 'h2', 'h3', 'h4', 'h5'].includes(zones.paris.titleStyle)) ? zones.paris.titleStyle : 'h3';
                const Tag = tag as keyof React.JSX.IntrinsicElements;
                const fs = zones?.paris?.titleFontSize != null && zones.paris.titleFontSize >= 8 && zones.paris.titleFontSize <= 72 ? zones.paris.titleFontSize : undefined;
                return <Tag className={`${styles.colTitle} style-${tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{zones?.paris?.title ?? 'Paris & Alentours'}</Tag>;
              })()}
              <div className={`${styles.colBody} richtext-content`} dangerouslySetInnerHTML={{ __html: zones?.paris?.text ?? '<p>Priorité aux transports en commun. Voiture possible pour la banlieue proche — frais kilométriques.</p>' }} />
            </div>
          </AnimateStaggerItem>
          <AnimateStaggerItem>
            <div>
              {(() => {
                const tag = (zones?.france?.titleStyle && ['p', 'h1', 'h2', 'h3', 'h4', 'h5'].includes(zones.france.titleStyle)) ? zones.france.titleStyle : 'h3';
                const Tag = tag as keyof React.JSX.IntrinsicElements;
                const fs = zones?.france?.titleFontSize != null && zones.france.titleFontSize >= 8 && zones.france.titleFontSize <= 72 ? zones.france.titleFontSize : undefined;
                return <Tag className={`${styles.colTitle} style-${tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>{zones?.france?.title ?? 'France & Monde'}</Tag>;
              })()}
              <div className={`${styles.colBody} richtext-content`} dangerouslySetInnerHTML={{ __html: zones?.france?.text ?? '<p>Déplacements réguliers en train pour des missions partout en France et parfois à l\'étranger — frais de déplacement.</p>' }} />
            </div>
          </AnimateStaggerItem>
        </AnimateInView>

        <div className={styles.mapContainer}>
          <iframe
            className={styles.mapIframe}
            src={`https://www.google.com/maps?q=${encodeURIComponent(zones?.mapQuery?.trim() || '92140 Clamart')}&output=embed`}
            title="Carte"
            loading="lazy"
          />
        </div>
      </div>
  );

  const kitSection = hide('contact_kit') ? null : (
      <div className={`${styles.blockInner} ${styles.blockFullWidthBg} ${blockWidthClass('contact_kit')}`.trim()} style={{ position: 'relative', marginTop: '2.5rem', ...(kitData?.backgroundColor ? { backgroundColor: kitData.backgroundColor } : {}) }}>
        {isAdmin && (
          <div style={{ ...btnWrap, top: -16 }}>
            <BlockVisibilityToggle blockId="contact_kit" />
            <BlockWidthToggle blockId="contact_kit" />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setOpenKit(true)}
              style={{ position: 'static', background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}
            >
              Modifier
            </button>
            <BlockOrderButtons page="contact" blockId="contact_kit" />
          </div>
        )}
        <AnimateInView variant="fadeUp">
          {kitData?.title?.trim() ? (
            <h3 className={styles.kitTitle}>{kitData.title.trim()}</h3>
          ) : null}
          <div className={styles.kitWidget}>
            <iframe
              src={kitData?.embedUrl?.trim() || 'https://kit.co/embed?url=https%3A%2F%2Fkit.co%2FMaxcellens%2Fmon-equipement'}
              className={styles.kitIframe}
              scrolling="no"
              title="Mon équipement — Kit.co"
              loading="lazy"
            />
          </div>
        </AnimateInView>
      </div>
  );

  const sections: Record<string, React.ReactNode> = {
    contact_intro: introSection,
    contact_zones: zonesSection,
    contact_kit: kitSection,
  };

  return (
    <div className={styles.wrapper}>
      {blockOrderContact.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
      {open ? (
        <ContactEditModal onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />
      ) : null}
      {openZones ? (
        <ContactZonesEditModal onClose={() => setOpenZones(false)} onSaved={() => setOpenZones(false)} />
      ) : null}
      {openKit ? (
        <ContactKitEditModal onClose={() => setOpenKit(false)} onSaved={() => setOpenKit(false)} />
      ) : null}
    </div>
  );
}
