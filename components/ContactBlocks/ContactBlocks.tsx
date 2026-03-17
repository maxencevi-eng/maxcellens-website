"use no memo";
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
import ContactZonesEditModal from './ContactZonesEditModal';
const ContactKitEditModal = dynamic(() => import('./ContactKitEditModal'), { ssr: false });
const ContactFaqEditModal = dynamic(() => import('./ContactFaqEditModal'), { ssr: false });
import type { AboutRow } from './ContactEditModal';
import type { ContactFaqData } from './ContactFaqEditModal';

export default function ContactBlocks() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [openZones, setOpenZones] = useState(false);
  const [contactHandle, setContactHandle] = useState('@maxcellens');
  const [rows, setRows] = useState<AboutRow[]>([]);
  const [contactIntroBg, setContactIntroBg] = useState<string>('');
  const [photo, setPhoto] = useState<{ url?: string; path?: string } | null>(null);
  const [handleColor, setHandleColor] = useState('');
  const [handleFontSize, setHandleFontSize] = useState(0);
  const [handleFontWeight, setHandleFontWeight] = useState(0);
  const [handleFontFamily, setHandleFontFamily] = useState('');
  const [zones, setZones] = useState<ContactZonesData | null>(null);
  const [kitData, setKitData] = useState<ContactKitData | null>(null);
  const [openKit, setOpenKit] = useState(false);
  const [labelStyle, setLabelStyle] = useState<{ fontSize?: number; color?: string; fontFamily?: string }>({});
  const [faqData, setFaqData] = useState<ContactFaqData | null>(null);
  const [openFaq, setOpenFaq] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const { hiddenBlocks, blockWidthModes, blockOrderContact, isAdmin: isAdminCtx } = useBlockVisibility();
  const hide = (id: string) => !isAdminCtx && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === 'max1600' ? 'block-width-1600' : '');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });

    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=contact_handle,contact_intro,contact_photo,contact_zones,contact_kit,contact_faq,contact_handle_color,contact_handle_font_size,contact_handle_font_weight,contact_handle_font_family');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.contact_handle != null) setContactHandle(String(s.contact_handle));
        else setContactHandle('@maxcellens');
        if (s.contact_intro) {
          try {
            const parsed = JSON.parse(String(s.contact_intro));
            if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.rows) && parsed.rows.length > 0) setRows(parsed.rows);
              setContactIntroBg(parsed.backgroundColor ?? '');
              if (parsed.labelStyle && typeof parsed.labelStyle === 'object') setLabelStyle(parsed.labelStyle);
            }
          } catch (_) {}
        }
        if (s.contact_faq) {
          try {
            const parsed = JSON.parse(String(s.contact_faq));
            if (parsed && typeof parsed === 'object') setFaqData(parsed as ContactFaqData);
          } catch (_) {}
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
        if (s.contact_handle_color) setHandleColor(String(s.contact_handle_color));
        if (s.contact_handle_font_size) setHandleFontSize(Number(s.contact_handle_font_size) || 0);
        if (s.contact_handle_font_weight) setHandleFontWeight(Number(s.contact_handle_font_weight) || 0);
        if (s.contact_handle_font_family != null) setHandleFontFamily(String(s.contact_handle_font_family));
      } catch (e) { /* ignore */ }
    }
    load();

    function onUpdate(e?: any) { load(); }
    window.addEventListener('site-settings-updated', onUpdate as EventListener);
    return () => { mounted = false; try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {} window.removeEventListener('site-settings-updated', onUpdate as EventListener); };
  }, []);

  const DEFAULT_ROWS: AboutRow[] = [
    { label: 'SERVICES', content: "J'accompagne les entreprises et commerces dans leur communication visuelle. Mon expertise se concentre en priorité sur la réalisation de vidéos commerciales impactantes et la couverture d'événements (vidéo & photo)." },
    { label: 'PROJETS', content: "Je réalise également vos films institutionnels, vos portraits professionnels ainsi que des ateliers Team Building Série TV. Partenaire des sociétés de production, j'interviens aussi régulièrement en tant que cadreur pour renforcer vos équipes techniques sur le terrain." },
    { label: 'SECTEURS', content: "Basé en Île-de-France, je me déplace dans toute la France pour des missions sur mesure. Discutons de votre projet et de vos attentes." },
    { label: 'PARCOURS', content: "(2015 – 2020) Chef de projets Information (AMOA)\n(Depuis 2020) Vidéaste & Photographe Indépendant" },
    { label: 'CONTACT', content: "EMAIL  maxcellens@gmail.com\nTÉLÉPHONE  (+33) 06 74 96 64 58" },
  ];
  const displayRows = rows.length > 0 ? rows : DEFAULT_ROWS;

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
          {photo?.url ? (
            <img className={styles.photo} alt="Portrait" src={String(photo.url)} />
          ) : (
            <div className={styles.photoPlaceholder} aria-hidden="true" />
          )}
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ ...(handleColor ? { color: handleColor } : {}), ...(handleFontSize > 0 ? { fontSize: handleFontSize } : {}), ...(handleFontWeight > 0 ? { fontWeight: handleFontWeight } : {}), ...(handleFontFamily ? { fontFamily: handleFontFamily } : {}) }}>
            {contactHandle || '@maxcellens'}
          </div>
          <div className={styles.cardBody}>
            <div className={styles.aboutRows}>
              {displayRows.map((row, i) => {
                const lblStyle: React.CSSProperties = {
                  ...(row.labelFontSize ?? labelStyle.fontSize ? { fontSize: row.labelFontSize ?? labelStyle.fontSize } : {}),
                  ...(row.labelColor ?? labelStyle.color ? { color: row.labelColor ?? labelStyle.color } : {}),
                  ...(row.labelFontFamily ?? labelStyle.fontFamily ? { fontFamily: row.labelFontFamily ?? labelStyle.fontFamily } : {}),
                };
                return (
                  <div key={i} className={styles.aboutRow}>
                    <span className={styles.aboutLabel} style={Object.keys(lblStyle).length > 0 ? lblStyle : undefined}>{row.label}</span>
                    {row.contentHtml
                      ? <span className={`${styles.aboutContent} richtext-content`} dangerouslySetInnerHTML={{ __html: row.contentHtml }} />
                      : <span className={styles.aboutContent}>{row.content}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      </AnimateInView>
      </div>
  );

  const qgText = zones?.qg?.text ?? '<p>Basé à Clamart (92). Point de départ de mes missions en Île-de-France.</p>';
  const qgPhone = zones?.qg?.phone ?? '06 74 96 64 58';
  const parisText = zones?.paris?.text ?? '<p>Priorité aux transports en commun. Voiture possible pour la banlieue proche — frais kilométriques.</p>';
  const franceText = zones?.france?.text ?? '<p>Déplacements réguliers en train pour des missions partout en France et parfois à l\'étranger — frais de déplacement.</p>';
  const mapQueryVal = zones?.mapQuery?.trim() || '92140 Clamart';

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
              <div className={`${styles.colBody} richtext-content`} dangerouslySetInnerHTML={{ __html: qgText }} />
              {qgPhone && (
                <div style={{ marginTop: '0.5rem' }}>📞 {qgPhone}</div>
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
              <div className={`${styles.colBody} richtext-content`} dangerouslySetInnerHTML={{ __html: parisText }} />
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
              <div className={`${styles.colBody} richtext-content`} dangerouslySetInnerHTML={{ __html: franceText }} />
            </div>
          </AnimateStaggerItem>
        </AnimateInView>

        <div className={styles.mapContainer}>
          <iframe
            className={styles.mapIframe}
            src={`https://www.google.com/maps?q=${encodeURIComponent(mapQueryVal)}&output=embed`}
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

  const faqItems = faqData?.items ?? [];
  const faqSection = hide('contact_faq') ? null : (
    <div className={`${styles.blockInner} ${styles.blockFullWidthBg} ${styles.faqBlockWrap} ${blockWidthClass('contact_faq')}`.trim()}
      style={{ position: 'relative', marginTop: '2rem', ...(faqData?.backgroundColor ? { backgroundColor: faqData.backgroundColor } : {}) }}>
      {isAdmin && (
        <div style={{ ...btnWrap, top: -16 }}>
          <BlockVisibilityToggle blockId="contact_faq" />
          <BlockWidthToggle blockId="contact_faq" />
          <button type="button" className="btn-secondary" onClick={() => setOpenFaq(true)}
            style={{ position: 'static', background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>
            Modifier
          </button>
          <BlockOrderButtons page="contact" blockId="contact_faq" />
        </div>
      )}
      <AnimateInView variant="fadeUp">
        <div className={styles.faqBlock}>
          {(faqData?.eyebrow ?? 'FAQ') && (
            <div style={{ textAlign: 'center' }}>
              <span className={styles.faqEyebrow}>{faqData?.eyebrow ?? 'FAQ'}</span>
            </div>
          )}
          <h2 className={styles.faqTitle} style={{
            ...(faqData?.titleFontSize ? { fontSize: faqData.titleFontSize } : {}),
            ...(faqData?.titleColor ? { color: faqData.titleColor } : {}),
            ...(faqData?.titleFontFamily ? { fontFamily: faqData.titleFontFamily } : {}),
            ...(faqData?.titleFontWeight ? { fontWeight: faqData.titleFontWeight } : {}),
          }}>
            {faqData?.title ?? 'Vos questions,'}{' '}
            <span className={styles.faqTitleHighlight} style={faqData?.highlightColor ? { color: faqData.highlightColor } : undefined}>
              {faqData?.titleHighlight ?? 'nos réponses.'}
            </span>
          </h2>
          <p className={styles.faqDescription} style={{
            ...(faqData?.descriptionFontSize ? { fontSize: faqData.descriptionFontSize } : {}),
            ...(faqData?.descriptionColor ? { color: faqData.descriptionColor } : {}),
          }}>{faqData?.description ?? 'Tout ce que vous devez savoir sur mes prestations. Une question non listée\u00a0? Écrivez-moi directement.'}</p>
          <div className={styles.faqList}>
            {(faqItems.length > 0 ? faqItems : [
              { question: 'Quels types de projets réalisez-vous ?', answer: "Je couvre principalement les événements d'entreprise, les vidéos corporate et commerciales, ainsi que les portraits professionnels." },
              { question: 'Dans quelles zones géographiques intervenez-vous ?', answer: "Je suis basé en Île-de-France et interviens partout en France pour des missions sur mesure." },
              { question: 'Quels sont vos délais de livraison ?', answer: "Pour un événement, les photos sont livrées sous 7 à 14 jours. Pour une vidéo, comptez 2 à 4 semaines." },
              { question: 'Comment se déroule un projet vidéo ?', answer: "Échange initial, brief créatif, tournage, post-production (montage, étalonnage, son), puis livraison avec ajustements possibles." },
              { question: 'Quels sont vos tarifs ?', answer: "Les tarifs sont établis sur mesure. Contactez-moi pour un devis personnalisé." },
            ]).map((item, i) => (
              <div key={i} className={`${styles.faqItem} ${faqOpenIndex === i ? styles.faqItemOpen : ''}`}>
                <button className={styles.faqQuestion} onClick={() => setFaqOpenIndex(faqOpenIndex === i ? null : i)}>
                  <span>{item.question}</span>
                  <span className={styles.faqIcon}>{faqOpenIndex === i ? '×' : '+'}</span>
                </button>
                {faqOpenIndex === i && (
                  <div className={styles.faqAnswer}>{item.answer}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </AnimateInView>
    </div>
  );

  const sections: Record<string, React.ReactNode> = {
    contact_intro: introSection,
    contact_zones: zonesSection,
    contact_kit: kitSection,
    contact_faq: faqSection,
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
      {openFaq ? (
        <ContactFaqEditModal onClose={() => setOpenFaq(false)} onSaved={() => setOpenFaq(false)} />
      ) : null}
    </div>
  );
}
