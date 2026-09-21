"use no memo";
"use client";

import { AdminToolbarShell, AdminToolbarButton } from '../admin/AdminToolbar';
import { Pencil, MapPin, TrainFront, Plane, Car, Compass, Globe, CalendarDays } from 'lucide-react';
import useBuiltinPageBlocks from '../PageBuilder/useBuiltinPageBlocks';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';
import styles from './ContactBlocks.module.css';
import type { ContactZonesData, ContactZoneCard, ZoneIconKey } from './ContactZonesEditModal';
import { DEFAULT_ZONES, DEFAULT_MAP_TILE_URL, DEFAULT_MAP_ATTRIBUTION } from './ContactZonesEditModal';
import LocationMap from './LocationMap';
import { useBlockVisibility, BlockVisibilityToggle, BlockWidthToggle, BlockOrderButtons } from '../BlockVisibility';
import AnimateInView, { AnimateStaggerItem, useSplashReady } from '../AnimateInView/AnimateInView';

const ContactEditModal = dynamic(() => import('./ContactEditModal'), { ssr: false });
import ContactZonesEditModal from './ContactZonesEditModal';
const ContactFaqEditModal = dynamic(() => import('./ContactFaqEditModal'), { ssr: false });
const ContactGalleryEditModal = dynamic(() => import('./ContactGalleryEditModal'), { ssr: false });
import type { AboutRow } from './ContactEditModal';
import type { ContactFaqData } from './ContactFaqEditModal';
import type { ContactGalleryData, ContactGalleryItem } from './ContactGalleryEditModal';

const ZONE_ICONS: Record<ZoneIconKey, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  pin: MapPin,
  train: TrainFront,
  plane: Plane,
  car: Car,
  compass: Compass,
  globe: Globe,
  calendar: CalendarDays,
};

function ZoneIcon({ name, size = 22 }: { name?: ZoneIconKey; size?: number }) {
  const Icon = ZONE_ICONS[name ?? 'pin'] ?? MapPin;
  return <Icon size={size} strokeWidth={1.8} />;
}

function GalleryRow({ items, speed }: { items: ContactGalleryItem[]; speed: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const overflowsRef = useRef(false);
  const pausedRef = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const [overflows, setOverflows] = useState(false);

  // Mesure — observe container + track (déclenche après chargement des images)
  useEffect(() => {
    if (speed === 0) { overflowsRef.current = false; setOverflows(false); return; }
    function check() {
      const el = containerRef.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const does = track.scrollWidth > el.clientWidth;
      if (does !== overflowsRef.current) {
        overflowsRef.current = does;
        setOverflows(does);
      }
    }
    check();
    const ro = new ResizeObserver(check);
    if (containerRef.current) ro.observe(containerRef.current);
    if (trackRef.current) ro.observe(trackRef.current);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, speed]);

  // Auto-scroll via scrollLeft — simple, pas de duplication
  // Arrive à la fin → repart au début
  useEffect(() => {
    if (!overflows || speed === 0) return;
    const el = containerRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    let raf: number;
    let last: number | null = null;
    function tick(now: number) {
      if (last !== null && !pausedRef.current) {
        const maxScroll = track!.scrollWidth - el!.clientWidth;
        if (maxScroll > 0) {
          const pps = maxScroll / speed;
          el!.scrollLeft += (pps * (now - last)) / 1000;
          if (el!.scrollLeft >= maxScroll) el!.scrollLeft = 0;
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [overflows, speed]);

  useEffect(() => () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); }, []);

  function onTouchStart() {
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }
  function onTouchEnd() {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 1200);
  }

  function onMouseDown(e: React.MouseEvent) {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartScrollLeft.current = containerRef.current?.scrollLeft ?? 0;
    pausedRef.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    containerRef.current.scrollLeft = dragStartScrollLeft.current - (e.clientX - dragStartX.current);
  }
  function onMouseUp() {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => { pausedRef.current = false; }, 1200);
  }

  const itemEl = (item: ContactGalleryItem, i: number) => (
    <div key={i} className={styles.galleryItem}>
      <div className={styles.galleryImgWrap}>
        <img src={item.url} alt={item.caption ?? ''} className={styles.galleryImg} loading="lazy" />
      </div>
      {item.caption && <p className={styles.galleryCaption}>{item.caption}</p>}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={styles.galleryScrollJS}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <div ref={trackRef} className={styles.galleryTrackJS}>
        {items.map(itemEl)}
      </div>
    </div>
  );
}

export default function ContactBlocks() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [openZones, setOpenZones] = useState(false);
  const [contactHandle, setContactHandle] = useState('@maxcellens');
  const [rows, setRows] = useState<AboutRow[]>([]);
  const [contactIntroBg, setContactIntroBg] = useState<string>('');
  const [photo, setPhoto] = useState<{ url?: string; path?: string } | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const splashReady = useSplashReady();
  const imgRef = useRef<HTMLImageElement>(null);
  const [handleColor, setHandleColor] = useState('');
  const [handleFontSize, setHandleFontSize] = useState(0);
  const [handleFontWeight, setHandleFontWeight] = useState(0);
  const [handleFontFamily, setHandleFontFamily] = useState('');
  const [zones, setZones] = useState<ContactZonesData | null>(null);
  const [labelStyle, setLabelStyle] = useState<{ fontSize?: number; color?: string; fontFamily?: string }>({});
  const [faqData, setFaqData] = useState<ContactFaqData | null>(null);
  const [openFaq, setOpenFaq] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [galleryData, setGalleryData] = useState<ContactGalleryData | null>(null);
  const [openGallery, setOpenGallery] = useState(false);
  const { hiddenBlocks, blockWidthModes, blockOrderContact, isAdmin: isAdminCtx } = useBlockVisibility();

  /* Blocs ajoutés depuis l'administration : leurs sections sont fusionnées
     dans la table ci-dessous et leurs identifiants figurent dans le même
     ordre que les blocs intégrés. */
  const dynamicBlocks = useBuiltinPageBlocks("contact");
  const hide = (id: string) => !isAdminCtx && hiddenBlocks.includes(id);
  const blockWidthClass = (id: string) => (blockWidthModes[id] === 'max1600' ? 'block-width-1600' : '');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => { if (!mounted) return; setIsAdmin(Boolean((data as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setIsAdmin(Boolean(session?.user)); });

    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=contact_handle,contact_intro,contact_photo,contact_zones,contact_faq,contact_gallery,contact_handle_color,contact_handle_font_size,contact_handle_font_weight,contact_handle_font_family');
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
        if (s.contact_gallery) {
          try {
            const parsed = JSON.parse(String(s.contact_gallery)) as ContactGalleryData;
            if (parsed && typeof parsed === 'object') setGalleryData(parsed);
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


  // Gère les images déjà en cache (complete avant onLoad)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setImgLoaded(true);
    }
  }, [photo?.url]);

  const photoAnimated = splashReady && imgLoaded;

  const DEFAULT_ROWS: AboutRow[] = [
    { label: 'SERVICES', content: "J'accompagne les entreprises et commerces dans leur communication visuelle. Mon expertise se concentre en priorité sur la réalisation de vidéos commerciales impactantes et la couverture d'événements (vidéo & photo)." },
    { label: 'PROJETS', content: "Je réalise également vos films institutionnels, vos portraits professionnels ainsi que des ateliers Team Building Série TV. Partenaire des sociétés de production, j'interviens aussi régulièrement en tant que cadreur pour renforcer vos équipes techniques sur le terrain." },
    { label: 'SECTEURS', content: "Basé en Île-de-France, je me déplace dans toute la France pour des missions sur mesure. Discutons de votre projet et de vos attentes." },
    { label: 'PARCOURS', content: "(2015 – 2020) Chef de projets Information (AMOA)\n(Depuis 2020) Vidéaste & Photographe Indépendant" },
    { label: 'CONTACT', content: "EMAIL  maxcellens@gmail.com\nTÉLÉPHONE  (+33) 06 74 96 64 58" },
  ];
  const displayRows = rows.length > 0 ? rows : DEFAULT_ROWS;

  const introSection = hide('contact_intro') ? null : (
      <div className={`${styles.blockInner} ${styles.blockFullWidthBg} ${blockWidthClass('contact_intro')}`.trim()} style={{ ...(contactIntroBg ? { backgroundColor: contactIntroBg } : {}), marginTop: 0 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        {isAdmin && (
          <AdminToolbarShell>
            <AdminToolbarButton
              variant="primary"
              showLabel
              icon={<Pencil size={14} aria-hidden="true" />}
              label="Modifier"
              onClick={() => setOpen(true)}
            />
            <BlockVisibilityToggle blockId="contact_intro" />
            <BlockWidthToggle blockId="contact_intro" />
            <BlockOrderButtons page="contact" blockId="contact_intro" />
          </AdminToolbarShell>
        )}
      </div>

      <AnimateInView variant="fadeUp">
      <div className={styles.introGrid}>
        <div>
          {photo?.url ? (
            <div className={`${styles.photoWrap}${photoAnimated ? ` ${styles.photoVisible}` : ''}`}>
              <img
                ref={imgRef}
                className={styles.photo}
                alt="Portrait"
                src={String(photo.url)}
                onLoad={() => setImgLoaded(true)}
              />
            </div>
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

  const mapQueryVal = zones?.mapQuery?.trim() || '92140 Clamart';
  const zonesEyebrow = zones?.eyebrow ?? DEFAULT_ZONES.eyebrow;
  const mapCfg = { ...DEFAULT_ZONES.map, ...zones?.map };
  const mapPoints = zones?.map?.points ?? DEFAULT_ZONES.map?.points ?? [];
  const zonesFootnotes = zones?.footnotes ?? DEFAULT_ZONES.footnotes ?? [];

  /** Les trois cartes du bloc : mêmes champs, même rendu. */
  const zoneCards: { key: 'qg' | 'paris' | 'france'; data?: ContactZoneCard; fallback: ContactZoneCard }[] = [
    { key: 'qg', data: zones?.qg, fallback: DEFAULT_ZONES.qg! },
    { key: 'paris', data: zones?.paris, fallback: DEFAULT_ZONES.paris! },
    { key: 'france', data: zones?.france, fallback: DEFAULT_ZONES.france! },
  ];

  /* Typographie du sur-titre. Les familles/graisses viennent des variables de
     « Style du site », comme les titres des blocs de l'accueil, mais sont
     posées en style inline plutôt que par la classe `style-*` : la classe
     entrerait en concurrence de spécificité avec `.locEyebrow`, alors que
     l'inline l'emporte toujours. */
  const eyebrowStyle: React.CSSProperties = {};
  if (zones?.eyebrowStyle) {
    const v = zones.eyebrowStyle === 'p' ? 'body' : zones.eyebrowStyle;
    eyebrowStyle.fontFamily = `var(--font-${v}-family)`;
    eyebrowStyle.fontWeight = `var(--font-${v}-weight)`;
    eyebrowStyle.fontSize = `var(--font-${v}-size)`;
  }
  if (zones?.eyebrowFontSize != null) eyebrowStyle.fontSize = `${zones.eyebrowFontSize}px`;
  if (zones?.eyebrowColor) eyebrowStyle.color = zones.eyebrowColor;
  if (zones?.eyebrowAlign) eyebrowStyle.textAlign = zones.eyebrowAlign;
  if (zones?.eyebrowUppercase === false) {
    eyebrowStyle.textTransform = 'none';
    eyebrowStyle.letterSpacing = 'normal';
  }

  /** Onglet Style de la modale : mêmes réglages que les blocs de l'accueil. */
  const zonesStyle: React.CSSProperties = {};
  if (zones?.backgroundColor) zonesStyle.backgroundColor = zones.backgroundColor;
  if (zones?.borderRadiusTop != null) {
    zonesStyle.borderTopLeftRadius = `${zones.borderRadiusTop}px`;
    zonesStyle.borderTopRightRadius = `${zones.borderRadiusTop}px`;
  }
  if (zones?.borderRadiusBottom != null) {
    zonesStyle.borderBottomLeftRadius = `${zones.borderRadiusBottom}px`;
    zonesStyle.borderBottomRightRadius = `${zones.borderRadiusBottom}px`;
  }
  if (zones?.paddingTop != null) zonesStyle.paddingTop = `${zones.paddingTop}px`;
  if (zones?.paddingBottom != null) zonesStyle.paddingBottom = `${zones.paddingBottom}px`;
  if (zones?.paddingX != null) {
    // Plancher conservé : le contenu reste dans « largeur de la zone contenu »
    // même si la marge choisie est plus petite.
    const px = `max(${zones.paddingX}px, calc((100cqw - var(--page-content-width, 1600px)) / 2))`;
    zonesStyle.paddingLeft = px;
    zonesStyle.paddingRight = px;
  }

  const zonesSection = hide('contact_zones') ? null : (
      <div className={`${styles.blockInner} ${styles.blockFullWidthBg} ${blockWidthClass('contact_zones')}`.trim()} style={{ position: 'relative', marginTop: '2rem', ...zonesStyle }}>
        {isAdmin && (
          <AdminToolbarShell>
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
          </AdminToolbarShell>
        )}
        {zonesEyebrow ? (
          <p className={styles.locEyebrow} style={Object.keys(eyebrowStyle).length ? eyebrowStyle : undefined}>
            {zonesEyebrow}
          </p>
        ) : null}

        <AnimateInView variant="stagger" className={styles.locCards}>
          {zoneCards.map(({ key, data, fallback }) => {
            const tag = (data?.titleStyle && ['p', 'h1', 'h2', 'h3', 'h4', 'h5'].includes(data.titleStyle)) ? data.titleStyle : 'h3';
            const Tag = tag as keyof React.JSX.IntrinsicElements;
            const fs = data?.titleFontSize != null && data.titleFontSize >= 8 && data.titleFontSize <= 72 ? data.titleFontSize : undefined;
            const kicker = data?.kicker ?? fallback.kicker;
            const text = data?.text ?? fallback.text ?? '';
            const phone = key === 'qg' ? (data?.phone ?? fallback.phone) : undefined;
            return (
              <AnimateStaggerItem key={key}>
                <article className={styles.locCard}>
                  <span className={styles.locCardIcon} aria-hidden>
                    <ZoneIcon name={data?.icon ?? fallback.icon} />
                  </span>
                  <div className={styles.locCardBody}>
                    {kicker ? <span className={styles.locCardKicker}>{kicker}</span> : null}
                    <Tag className={`${styles.locCardTitle} style-${tag}`} style={fs != null ? { fontSize: `${fs}px` } : undefined}>
                      {data?.title ?? fallback.title}
                    </Tag>
                    <div className={`${styles.locCardText} richtext-content`} dangerouslySetInnerHTML={{ __html: text }} />
                    {phone ? (
                      <a className={styles.locCardPhone} href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a>
                    ) : null}
                  </div>
                </article>
              </AnimateStaggerItem>
            );
          })}
        </AnimateInView>

        <LocationMap
          className={styles.locMap}
          lat={mapCfg.lat ?? 48.82}
          lng={mapCfg.lng ?? 2.32}
          zoom={mapCfg.zoom ?? 10}
          points={mapPoints}
          tileUrl={mapCfg.tileUrl || DEFAULT_MAP_TILE_URL}
          attribution={mapCfg.attribution || DEFAULT_MAP_ATTRIBUTION}
          desaturate={!mapCfg.plainTiles}
          externalUrl={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQueryVal)}`}
        />

        {zonesFootnotes.length > 0 ? (
          <ul className={styles.locNotes}>
            {zonesFootnotes.map((f, i) => (
              <li key={i} className={styles.locNote}>
                <span className={styles.locNoteIcon} aria-hidden><ZoneIcon name={f.icon} size={19} /></span>
                {f.text}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
  );

  const galleryItems = galleryData?.items ?? [];
  const galleryCategories = galleryData?.categories ?? [];
  // Build rows: one per defined category (with items), then uncategorized items
  const galleryCatRows: { label: string | null; items: typeof galleryItems }[] = [];
  if (galleryCategories.length > 0) {
    for (const cat of galleryCategories) {
      const catItems = galleryItems.filter((it) => it.category === cat);
      if (catItems.length > 0) galleryCatRows.push({ label: cat, items: catItems });
    }
    const uncategorized = galleryItems.filter((it) => !it.category || !galleryCategories.includes(it.category));
    if (uncategorized.length > 0) galleryCatRows.push({ label: null, items: uncategorized });
  } else if (galleryItems.length > 0) {
    galleryCatRows.push({ label: null, items: galleryItems });
  }

  const gallerySection = hide('contact_gallery') ? null : (
    <div className={`${styles.blockInner} ${styles.blockFullWidthBg} ${blockWidthClass('contact_gallery')}`.trim()} style={{ position: 'relative', marginTop: '2.5rem', ...(galleryData?.backgroundColor ? { backgroundColor: galleryData.backgroundColor } : {}) }}>
      {isAdmin && (
        <AdminToolbarShell>
          <BlockVisibilityToggle blockId="contact_gallery" />
          <BlockWidthToggle blockId="contact_gallery" />
          <button type="button" className="btn-secondary" onClick={() => setOpenGallery(true)}
            style={{ position: 'static', background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>
            Modifier
          </button>
          <BlockOrderButtons page="contact" blockId="contact_gallery" />
        </AdminToolbarShell>
      )}
      <AnimateInView variant="fadeUp">
        <div className={styles.galleryBlock}>
          {(galleryData?.title?.trim() || galleryData?.description?.trim()) && (
            <div className={styles.galleryHeader}>
              {galleryData?.title?.trim() && (() => {
                const tagName = (galleryData.titleStyle && ['h1','h2','h3','h4','h5','p'].includes(galleryData.titleStyle) ? galleryData.titleStyle : 'h2');
                const Tag = tagName as React.ElementType;
                return (
                  <Tag className={`${styles.galleryTitle} style-${tagName}`} style={{
                    ...(galleryData.titleFontSize ? { fontSize: galleryData.titleFontSize } : {}),
                    ...(galleryData.titleColor ? { color: galleryData.titleColor } : {}),
                    ...(galleryData.titleAlign ? { textAlign: galleryData.titleAlign as 'left' | 'center' | 'right' } : {}),
                  }}>
                    {galleryData.title}
                  </Tag>
                );
              })()}
              {galleryData?.description?.trim() && (
                <p className={styles.galleryDescription} style={{
                  ...(galleryData.descriptionFontSize ? { fontSize: galleryData.descriptionFontSize } : {}),
                  ...(galleryData.descriptionColor ? { color: galleryData.descriptionColor } : {}),
                }}>
                  {galleryData.description}
                </p>
              )}
            </div>
          )}

          {galleryCatRows.length > 0 ? (
            <div className={styles.galleryRows}>
              {galleryCatRows.map((row, ri) => (
                <div key={ri} className={styles.galleryRow}>
                  {row.label && <p className={styles.galleryCategoryLabel}>{row.label}</p>}
                  <GalleryRow items={row.items} speed={galleryData?.scrollSpeed ?? 22} />
                </div>
              ))}
            </div>
          ) : isAdmin ? (
            <div style={{ padding: '24px 32px', color: 'var(--muted)', fontSize: 13, border: '1.5px dashed #ccc', borderRadius: 8 }}>
              Aucune photo — cliquez sur « Modifier »
            </div>
          ) : null}
        </div>
      </AnimateInView>
    </div>
  );


  const faqItems = faqData?.items ?? [];
  const faqSection = hide('contact_faq') ? null : (
    <div className={`${styles.blockInner} ${styles.blockFullWidthBg} ${styles.faqBlockWrap} ${blockWidthClass('contact_faq')}`.trim()}
      style={{ position: 'relative', marginTop: '2rem', ...(faqData?.backgroundColor ? { backgroundColor: faqData.backgroundColor } : {}) }}>
      {isAdmin && (
        <AdminToolbarShell>
          <BlockVisibilityToggle blockId="contact_faq" />
          <BlockWidthToggle blockId="contact_faq" />
          <button type="button" className="btn-secondary" onClick={() => setOpenFaq(true)}
            style={{ position: 'static', background: '#111', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>
            Modifier
          </button>
          <BlockOrderButtons page="contact" blockId="contact_faq" />
        </AdminToolbarShell>
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
    contact_gallery: gallerySection,
    contact_faq: faqSection,
  };

  // Les blocs dynamiques s'ajoutent à la table de rendu, indexés par
  // leur identifiant d'ordre (« dyn:<uuid> »).
  Object.assign(sections, dynamicBlocks.sections);

  return (
    <div className={`${styles.wrapper} page-blocks`}>
      {blockOrderContact.map((blockId) => (
        <Fragment key={blockId}>{sections[blockId] ?? null}</Fragment>
      ))}
      {dynamicBlocks.addButton}
      {dynamicBlocks.modals}
      {open ? (
        <ContactEditModal onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />
      ) : null}
      {openZones ? (
        <ContactZonesEditModal onClose={() => setOpenZones(false)} onSaved={() => setOpenZones(false)} />
      ) : null}
      {openFaq ? (
        <ContactFaqEditModal onClose={() => setOpenFaq(false)} onSaved={() => setOpenFaq(false)} />
      ) : null}
      {openGallery ? (
        <ContactGalleryEditModal onClose={() => setOpenGallery(false)} onSaved={() => setOpenGallery(false)} />
      ) : null}
    </div>
  );
}
