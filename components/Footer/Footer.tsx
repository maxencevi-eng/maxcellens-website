"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';
import { Instagram, Youtube, Linkedin } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const footerLogoUrl = `${supabaseUrl}/storage/v1/object/public/site-assets/logos/footer-logo.webp`;
  const [logoSrc, setLogoSrc] = useState<string>(footerLogoUrl);

  useEffect(() => {
    const v = typeof window !== 'undefined' ? (localStorage.getItem('siteFooterLogoVersion') || '') : '';
    setLogoSrc(v ? `${footerLogoUrl}?t=${v}` : footerLogoUrl);

    function onStorage(e: StorageEvent) {
      if (e.key === 'siteFooterLogoVersion') {
        const newV = e.newValue || '';
        setLogoSrc(newV ? `${footerLogoUrl}?t=${newV}` : footerLogoUrl);
      }
      if (e.key === 'siteFooterLogoHeight') {
        const newH = Number(e.newValue || '36') || 36;
        try { document.documentElement.style.setProperty('--site-footer-logo-height', `${newH}px`); } catch (_) {}
      }
    }

    // apply saved footer height on mount (localStorage or server)
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('siteFooterLogoHeight') : null;
      if (saved) {
        const h = Number(saved) || 36;
        document.documentElement.style.setProperty('--site-footer-logo-height', `${h}px`);
      } else {
        // try to load from server settings
        (async () => {
          try {
            const res = await fetch('/api/admin/site-settings?keys=siteFooterLogoHeight');
            if (!res.ok) return;
            const j = await res.json();
            const val = j?.settings?.siteFooterLogoHeight;
            if (val) {
              const hv = Number(val) || 36;
              document.documentElement.style.setProperty('--site-footer-logo-height', `${hv}px`);
              try { localStorage.setItem('siteFooterLogoHeight', String(hv)); } catch(_) {}
            }
          } catch (_) {}
        })();
      }
    } catch (_) {}

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [footerLogoUrl]);

  const [footerColumn1, setFooterColumn1] = useState<string | null>(null);
  const [footerBottomText, setFooterBottomText] = useState<string | null>(null);
  const [footerMenuVisible, setFooterMenuVisible] = useState<any | null>(null);
  const [sanitizedCol1, setSanitizedCol1] = useState<string | null>(null);
  const [sanitizedBottom, setSanitizedBottom] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [isMobileFooter, setIsMobileFooter] = useState(false);
  const [socialInstagram, setSocialInstagram] = useState<string>('#');
  const [socialFacebook, setSocialFacebook] = useState<string>('#');
  const [socialYouTube, setSocialYouTube] = useState<string>('#');
  const [socialTikTok, setSocialTikTok] = useState<string>('#');
  const [socialLinkedIn, setSocialLinkedIn] = useState<string>('#');
  const [iconStyle, setIconStyle] = useState<string>('style-outline');
  const [customIcons, setCustomIcons] = useState<{ [k: string]: string }>({});
  const [footerBanner, setFooterBanner] = useState<{ url?: string; path?: string } | null>(null);
  const [footerBannerFocal, setFooterBannerFocal] = useState<{ x: number; y: number } | null>(null);
  const [footerBannerHeight, setFooterBannerHeight] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=footerColumn1,footerBottomText,footerMenuVisible,footerBanner,footerBannerFocal,footerBannerHeight,socialIcon_instagram,socialIcon_facebook,socialIcon_youtube,socialIcon_tiktok,socialIcon_linkedin');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        if (s.footerColumn1) setFooterColumn1(String(s.footerColumn1)); else { try { const v = localStorage.getItem('footerColumn1'); if (v) setFooterColumn1(v); } catch(_){} }
        if (s.footerBottomText) setFooterBottomText(String(s.footerBottomText)); else { try { const v = localStorage.getItem('footerBottomText'); if (v) setFooterBottomText(v); } catch(_){} }
        if (s.footerMenuVisible) {
          try { setFooterMenuVisible(JSON.parse(String(s.footerMenuVisible))); } catch(_) { setFooterMenuVisible(null); }
        } else {
          try { const v = localStorage.getItem('footerMenuVisible'); if (v) setFooterMenuVisible(JSON.parse(v)); else setFooterMenuVisible(null); } catch(_) { setFooterMenuVisible(null); }
        }
        try {          if (s.footerBanner) {
            try {
              const parsed = JSON.parse(String(s.footerBanner));
              if (parsed && (parsed.url || parsed.path)) setFooterBanner({ url: parsed.url, path: parsed.path });
              else if (typeof parsed === 'string') setFooterBanner({ url: parsed });
            } catch (_) { setFooterBanner({ url: String(s.footerBanner) }); }
          } else {
            try { const v = localStorage.getItem('footerBanner'); if (v) { const parsed = JSON.parse(v); if (parsed && (parsed.url || parsed.path)) setFooterBanner({ url: parsed.url, path: parsed.path }); else setFooterBanner({ url: String(v) }); } } catch(_){}
          }

          // load banner focal point (JSON {x,y})
          if (s.footerBannerFocal) {
            try { const f = JSON.parse(String(s.footerBannerFocal)); if (f && typeof f.x === 'number' && typeof f.y === 'number') setFooterBannerFocal({ x: Number(f.x), y: Number(f.y) }); } catch(_) {}
          } else {
            try { const vf = localStorage.getItem('footerBannerFocal'); if (vf) { const p = JSON.parse(vf); if (p && typeof p.x === 'number' && typeof p.y === 'number') setFooterBannerFocal({ x: Number(p.x), y: Number(p.y) }); } } catch(_) {}
          }

          // load banner height (number in px)
          if (s.footerBannerHeight) {
            try { setFooterBannerHeight(Number(s.footerBannerHeight)); } catch(_) {}
          } else {
            try { const vh = localStorage.getItem('footerBannerHeight'); if (vh) setFooterBannerHeight(Number(vh)); } catch(_) {}
          }

          if (s.socialIcon_instagram) setCustomIcons(prev => ({ ...prev, instagram: String(s.socialIcon_instagram) }));
          if (s.socialIcon_facebook) setCustomIcons(prev => ({ ...prev, facebook: String(s.socialIcon_facebook) }));
          if (s.socialIcon_youtube) setCustomIcons(prev => ({ ...prev, youtube: String(s.socialIcon_youtube) }));
          if (s.socialIcon_tiktok) setCustomIcons(prev => ({ ...prev, tiktok: String(s.socialIcon_tiktok) }));
          if (s.socialIcon_linkedin) setCustomIcons(prev => ({ ...prev, linkedin: String(s.socialIcon_linkedin) }));
        } catch(_){}
      } catch (_) {
        try { const v = localStorage.getItem('footerColumn1'); if (v) setFooterColumn1(v); } catch(_){}
        try { const v = localStorage.getItem('footerBottomText'); if (v) setFooterBottomText(v); } catch(_){}
        try { const v = localStorage.getItem('footerMenuVisible'); if (v) setFooterMenuVisible(JSON.parse(v)); } catch(_){}
      }
    }

    load();

    function onSettings(e?: Event) {
      try {
        const det = (e as any)?.detail;
        if (det && det.key) {
          const key = String(det.key);
          if (key === 'socialIcon_instagram' && (det as any).url) setCustomIcons(prev => ({ ...prev, instagram: String((det as any).url) }));
          if (key === 'socialIcon_facebook' && (det as any).url) setCustomIcons(prev => ({ ...prev, facebook: String((det as any).url) }));
          if (key === 'socialIcon_youtube' && (det as any).url) setCustomIcons(prev => ({ ...prev, youtube: String((det as any).url) }));
          if (key === 'socialIcon_tiktok' && (det as any).url) setCustomIcons(prev => ({ ...prev, tiktok: String((det as any).url) }));
          if (key === 'socialIcon_linkedin' && (det as any).url) setCustomIcons(prev => ({ ...prev, linkedin: String((det as any).url) }));
          if (key === 'footerBanner' && (det as any).url) setFooterBanner({ url: String((det as any).url), path: (det as any).path || undefined });
          if (key === 'footerBanner' && (det as any).value) {
            try { const p = JSON.parse(String((det as any).value)); if (p && (p.url || p.path)) setFooterBanner({ url: p.url, path: p.path }); } catch(_) {}
          }
          if (key === 'footerBannerFocal' && (det as any).value) {
            try { const f = JSON.parse(String((det as any).value)); if (f && typeof f.x === 'number' && typeof f.y === 'number') setFooterBannerFocal({ x: Number(f.x), y: Number(f.y) }); } catch(_) {}
          }
          if (key === 'footerBannerHeight' && (det as any).value) {
            try { setFooterBannerHeight(Number((det as any).value)); } catch(_) {}
          }
          return;
        }
      } catch(_){}      // try to refetch authoritative values from the server first
      (async () => {
        try {
          const r = await fetch('/api/admin/site-settings?keys=socialIcon_instagram,socialIcon_facebook,socialIcon_youtube,socialIcon_tiktok,socialIcon_linkedin');
          if (r.ok) {
            const j = await r.json();
            const s = j?.settings || {};
            setCustomIcons(prev => ({
              ...prev,
              instagram: s.socialIcon_instagram || localStorage.getItem('socialIcon_instagram') || prev.instagram || '',
              facebook: s.socialIcon_facebook || localStorage.getItem('socialIcon_facebook') || prev.facebook || '',
              youtube: s.socialIcon_youtube || localStorage.getItem('socialIcon_youtube') || prev.youtube || '',
              tiktok: s.socialIcon_tiktok || localStorage.getItem('socialIcon_tiktok') || prev.tiktok || '',
              linkedin: s.socialIcon_linkedin || localStorage.getItem('socialIcon_linkedin') || prev.linkedin || '',
            }));
            return;
          }
        } catch (_) {}
      })();      // reload from localStorage (modal writes there) or refetch
      try { const v = localStorage.getItem('footerColumn1'); if (v) setFooterColumn1(v); } catch(_){ }
      try { const v = localStorage.getItem('footerBottomText'); if (v) setFooterBottomText(v); } catch(_){ }
      try { const v = localStorage.getItem('footerMenuVisible'); if (v) setFooterMenuVisible(JSON.parse(v)); } catch(_){ }
      try { const v = localStorage.getItem('footerBanner'); if (v) { const parsed = JSON.parse(v); if (parsed && (parsed.url || parsed.path)) setFooterBanner({ url: parsed.url, path: parsed.path }); else setFooterBanner({ url: String(v) }); } } catch(_){ }
      try { const si = localStorage.getItem('socialIcon_instagram'); if (si) setCustomIcons(prev => ({ ...prev, instagram: si })); } catch(_){ }
      try { const sf = localStorage.getItem('socialIcon_facebook'); if (sf) setCustomIcons(prev => ({ ...prev, facebook: sf })); } catch(_){ }
      try { const sy = localStorage.getItem('socialIcon_youtube'); if (sy) setCustomIcons(prev => ({ ...prev, youtube: sy })); } catch(_){ }
      try { const st = localStorage.getItem('socialIcon_tiktok'); if (st) setCustomIcons(prev => ({ ...prev, tiktok: st })); } catch(_){ }
      try { const sl = localStorage.getItem('socialIcon_linkedin'); if (sl) setCustomIcons(prev => ({ ...prev, linkedin: sl })); } catch(_){ }
    }

    window.addEventListener('site-settings-updated', onSettings as EventListener);
    return () => { mounted = false; window.removeEventListener('site-settings-updated', onSettings as EventListener); };
  }, []);

  // prefer any locally-uploaded icons (localStorage) immediately to avoid showing letters while waiting for server
  useEffect(() => {
    try { const si = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_instagram') : null; if (si) setCustomIcons(prev => ({ ...prev, instagram: si })); } catch(_){}
    try { const sf = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_facebook') : null; if (sf) setCustomIcons(prev => ({ ...prev, facebook: sf })); } catch(_){}
    try { const sy = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_youtube') : null; if (sy) setCustomIcons(prev => ({ ...prev, youtube: sy })); } catch(_){}
    try { const st = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_tiktok') : null; if (st) setCustomIcons(prev => ({ ...prev, tiktok: st })); } catch(_){}
    try { const sl = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_linkedin') : null; if (sl) setCustomIcons(prev => ({ ...prev, linkedin: sl })); } catch(_){}
  }, []);




  // load social links from localStorage on client only to avoid hydration mismatch
  useEffect(() => {
    function loadLinks() {
      try { setSocialInstagram(localStorage.getItem('socialInstagram') || '#'); } catch(_) { setSocialInstagram('#'); }
      try { setSocialFacebook(localStorage.getItem('socialFacebook') || '#'); } catch(_) { setSocialFacebook('#'); }
      try { setSocialYouTube(localStorage.getItem('socialYouTube') || '#'); } catch(_) { setSocialYouTube('#'); }
      try { setSocialTikTok(localStorage.getItem('socialTikTok') || '#'); } catch(_) { setSocialTikTok('#'); }
      try { setSocialLinkedIn(localStorage.getItem('socialLinkedIn') || '#'); } catch(_) { setSocialLinkedIn('#'); }
      try { const v = localStorage.getItem('socialIconStyle') || ''; if (v) setIconStyle(v); } catch(_) {}
    }

    loadLinks();

    function onSettings() { loadLinks(); }
    function onStorage(e: StorageEvent) {
      if (!e.key) return;
      if (['socialInstagram','socialFacebook','socialYouTube','socialTikTok','socialLinkedIn'].includes(e.key)) loadLinks();
    }

    window.addEventListener('site-settings-updated', onSettings as EventListener);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('site-settings-updated', onSettings as EventListener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // sanitize any HTML for client rendering
  useEffect(() => {
    let mounted = true;
    async function sanitize() {
      if (typeof window === 'undefined') return;
      try {
        const DOMPurify = (await import('dompurify')).default;
        if (!footerColumn1) { if (mounted) setSanitizedCol1(null); } else {
          if (mounted) setSanitizedCol1(DOMPurify.sanitize(footerColumn1));
        }
        if (!footerBottomText) { if (mounted) setSanitizedBottom(null); } else {
          if (mounted) setSanitizedBottom(DOMPurify.sanitize(footerBottomText));
        }
      } catch (_) {
        if (mounted) { setSanitizedCol1(null); setSanitizedBottom(null); }
      }
    }
    sanitize();
    return () => { mounted = false; };
  }, [footerColumn1, footerBottomText]);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(max-width:900px)');
      const apply = () => setIsMobileFooter(Boolean(mq.matches));
      apply();
      if (mq.addEventListener) mq.addEventListener('change', apply);
      else if ((mq as any).addListener) (mq as any).addListener(apply);
      return () => {
        try {
          if (mq.removeEventListener) mq.removeEventListener('change', apply);
          else if ((mq as any).removeListener) (mq as any).removeListener(apply);
        } catch (_) {}
      };
    } catch (_) {}
  }, []);

  // build column JSX so we can re-order on mobile reliably (avoids relying only on CSS selectors)
  const colLogo = (
    <div className={`${styles.col} ${styles.colLogo}`} key="colLogo">
      <h3 className={styles.logo}>
        <Link href="/" aria-label="Accueil" data-analytics-id="Logo-pied de page">
          {!imgError ? (
            <img src={logoSrc} alt="Maxcellens" onError={() => setImgError(true)} onLoad={() => setImgError(false)} />
          ) : (
            <span style={{ fontWeight: 800, color: 'var(--fg)' }}>Maxcellens</span>
          )}
        </Link>
      </h3>

      <div className={styles.contact}>
        {sanitizedCol1 ? (
          <div dangerouslySetInnerHTML={{ __html: sanitizedCol1 }} />
        ) : (footerColumn1 ? (
          footerColumn1.split('\n').map((line, i) => <p key={`${line}-${i}`} style={{ margin: 0 }}>{line}</p>)
        ) : (
          <>
            <p>Maxence Viozelange</p>
            <p>📞 06.74.96.64.58</p>
            <p>✉️ maxcellens@gmail.com</p>
          </>
        ))}
      </div>
    </div>
  );

  const colServices = (
    <div className={`${styles.col} ${styles.colServices}`} key="colServices">
      <h4>Services</h4>
      <ul className={styles.list}>
        {(!footerMenuVisible || footerMenuVisible.realisation) && <li><Link href="/realisation" data-analytics-id="Footer|Réalisation">Réalisation</Link></li>}
        {(!footerMenuVisible || footerMenuVisible.evenement) && <li><Link href="/evenement" data-analytics-id="Footer|Évènement">Évènement</Link></li>}
        {(!footerMenuVisible || footerMenuVisible.corporate) && <li><Link href="/corporate" data-analytics-id="Footer|Corporate">Corporate</Link></li>}
        {(!footerMenuVisible || footerMenuVisible.portrait) && <li><Link href="/portrait" data-analytics-id="Footer|Portrait">Portrait</Link></li>}
        {(!footerMenuVisible || footerMenuVisible.animation) && <li><Link href="/animation" data-analytics-id="Footer|Animation">Animation</Link></li>}
        {(!footerMenuVisible || footerMenuVisible.galleries) && <li><Link href="/galeries" data-analytics-id="Footer|Galeries">Galeries</Link></li>}
      </ul>
    </div>
  );

  

  const colInfo = (
    <div className={`${styles.col} ${styles.colInfo}`} key="colInfo">
      <h4>Information</h4>
      <ul className={styles.list}>
        {(!footerMenuVisible || footerMenuVisible.contact) && <li><Link href="/contact" data-analytics-id="Footer|Contact">Contact</Link></li>}
        {(!footerMenuVisible || footerMenuVisible.admin) && <li><Link href="/admin" data-analytics-id="Footer|Admin">Admin</Link></li>}
      </ul>
    </div>
  );

  return (
    <footer className={`${styles.footer} ${isMobileFooter ? styles.mobile : ''}`}>
      {footerBanner?.url ? (
        <div className={styles.banner} role="img" aria-label="Footer banner wrapper">
          <div
            className={styles.bannerInner}
            style={{
              backgroundImage: `url(${footerBanner.url})`,
              backgroundPosition: footerBannerFocal ? `${footerBannerFocal.x}% ${footerBannerFocal.y}%` : 'center',
              height: footerBannerHeight ? `${footerBannerHeight}px` : undefined
            }}
            role="img"
            aria-label="Footer banner"
          />
        </div>
      ) : null}
      <div className={styles.top}>
        <div className="container">
          <div className={styles.columns} style={isMobileFooter ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' } : undefined}>
            {isMobileFooter ? ([colServices, colInfo, colLogo]) : ([colLogo, colServices, colInfo])}
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className="container">
          <div className={styles.bottomInner}>
            {sanitizedBottom ? (
              <div className={styles.copy} dangerouslySetInnerHTML={{ __html: sanitizedBottom }} />
            ) : (
              <div className={styles.copy}><p style={{ margin: 0 }}>{footerBottomText || `© ${year} Maxcellens | Tous droits réservés | SIRET 889 577 250 00018 | Maxcellens@gmail.com`}</p></div>
            )}
            <div className={`${styles.socials} ${styles[iconStyle] || ''}`} style={isMobileFooter ? { justifyContent: 'center', margin: '0 auto', width: 'auto', display: 'flex' } : undefined}>
                <a href={socialInstagram || 'https://instagram.com'} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.social} style={isMobileFooter ? { width: 48, height: 48, minWidth: 48, minHeight: 48, borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : undefined}>
                {customIcons.instagram ? <img src={customIcons.instagram} alt="Instagram custom" className={styles.customIcon} style={isMobileFooter ? { width: 28, height: 28 } : undefined} /> : <span className={styles.socialLetter} aria-hidden="true" style={isMobileFooter ? { fontSize: '14px' } : undefined}>I</span>}
              </a>

              <a href={socialFacebook || 'https://facebook.com'} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={styles.social} style={isMobileFooter ? { width: 48, height: 48, minWidth: 48, minHeight: 48, borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : undefined}>
                {customIcons.facebook ? <img src={customIcons.facebook} alt="Facebook custom" className={styles.customIcon} style={isMobileFooter ? { width: 28, height: 28 } : undefined} /> : <span className={styles.socialLetter} aria-hidden="true" style={isMobileFooter ? { fontSize: '14px' } : undefined}>F</span>}
              </a>

              <a href={socialYouTube || 'https://youtube.com'} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className={styles.social} style={isMobileFooter ? { width: 48, height: 48, minWidth: 48, minHeight: 48, borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : undefined}>
                {customIcons.youtube ? <img src={customIcons.youtube} alt="YouTube custom" className={styles.customIcon} style={isMobileFooter ? { width: 28, height: 28 } : undefined} /> : <span className={styles.socialLetter} aria-hidden="true" style={isMobileFooter ? { fontSize: '14px' } : undefined}>Y</span>}
              </a>

              <a href={socialTikTok || 'https://tiktok.com'} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={styles.social} style={isMobileFooter ? { width: 48, height: 48, minWidth: 48, minHeight: 48, borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : undefined}>
                {customIcons.tiktok ? <img src={customIcons.tiktok} alt="TikTok custom" className={styles.customIcon} style={isMobileFooter ? { width: 28, height: 28 } : undefined} /> : <span className={styles.socialLetter} aria-hidden="true" style={isMobileFooter ? { fontSize: '14px' } : undefined}>T</span>}
              </a>

              <a href={socialLinkedIn || 'https://linkedin.com'} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={styles.social} style={isMobileFooter ? { width: 48, height: 48, minWidth: 48, minHeight: 48, borderRadius: '999px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : undefined}>
                {customIcons.linkedin ? <img src={customIcons.linkedin} alt="LinkedIn custom" className={styles.customIcon} style={isMobileFooter ? { width: 28, height: 28 } : undefined} /> : <span className={styles.socialLetter} aria-hidden="true" style={isMobileFooter ? { fontSize: '14px' } : undefined}>L</span>}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
