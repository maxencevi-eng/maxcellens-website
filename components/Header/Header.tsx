"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const [open, setOpen] = useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const logoUrl = `${supabaseUrl}/storage/v1/object/public/site-assets/logos/site-logo.webp`;
  const [logoSrc, setLogoSrc] = useState<string>(logoUrl);

  useEffect(() => {
    // Prefer server-injected version if available, fallback to localStorage
    let v = '';
    try {
      if (typeof window !== 'undefined' && (window as any).__siteLogoVersion) {
        v = (window as any).__siteLogoVersion as string;
      } else if (typeof window !== 'undefined') {
        v = localStorage.getItem('siteLogoVersion') || '';
      }
    } catch (_) { v = '' }
    setLogoSrc(v ? `${logoUrl}?t=${v}` : logoUrl);

    function onStorage(e: StorageEvent) {
      if (e.key === 'siteLogoVersion') {
        const newV = e.newValue || '';
        setLogoSrc(newV ? `${logoUrl}?t=${newV}` : logoUrl);
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [logoUrl]);

  // social links
  const [socialLinks, setSocialLinks] = useState<{ instagram?: string; facebook?: string; youtube?: string; tiktok?: string; linkedin?: string }>({});
  const [iconStyle, setIconStyle] = useState<string>('style-outline');
  const [customIcons, setCustomIcons] = useState<{ [k: string]: string }>({});
  // hide nav/social until we have applied server/local settings to avoid flicker
  const [socialLoaded, setSocialLoaded] = useState(false);
  const [navLoaded, setNavLoaded] = useState(false);
  const headerReady = socialLoaded && navLoaded;
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=socialInstagram,socialFacebook,socialYouTube,socialTikTok,socialLinkedIn,socialIconStyle,socialIcon_instagram,socialIcon_facebook,socialIcon_youtube,socialIcon_tiktok,socialIcon_linkedin');
        if (!resp.ok) return;
        const j = await resp.json();
        const s = j?.settings || {};
        if (!mounted) return;
        setSocialLinks({
          instagram: s.socialInstagram || (typeof window !== 'undefined' ? localStorage.getItem('socialInstagram') || '' : ''),
          facebook: s.socialFacebook || (typeof window !== 'undefined' ? localStorage.getItem('socialFacebook') || '' : ''),
          youtube: s.socialYouTube || (typeof window !== 'undefined' ? localStorage.getItem('socialYouTube') || '' : ''),
          tiktok: s.socialTikTok || (typeof window !== 'undefined' ? localStorage.getItem('socialTikTok') || '' : ''),
          linkedin: s.socialLinkedIn || (typeof window !== 'undefined' ? localStorage.getItem('socialLinkedIn') || '' : ''),
        });
        if (s.socialIconStyle) setIconStyle(String(s.socialIconStyle)); else { try { const v = typeof window !== 'undefined' ? localStorage.getItem('socialIconStyle') || '' : ''; if (v) setIconStyle(v); } catch(_){} }
        try {
          if (s.socialIcon_instagram) setCustomIcons(prev => ({ ...prev, instagram: String(s.socialIcon_instagram) }));
          if (s.socialIcon_facebook) setCustomIcons(prev => ({ ...prev, facebook: String(s.socialIcon_facebook) }));
          if (s.socialIcon_youtube) setCustomIcons(prev => ({ ...prev, youtube: String(s.socialIcon_youtube) }));
          if (s.socialIcon_tiktok) setCustomIcons(prev => ({ ...prev, tiktok: String(s.socialIcon_tiktok) }));
          if (s.socialIcon_linkedin) setCustomIcons(prev => ({ ...prev, linkedin: String(s.socialIcon_linkedin) }));
        } catch(_){}
      } catch (_) {
        try {
          setSocialLinks({
            instagram: typeof window !== 'undefined' ? localStorage.getItem('socialInstagram') || '' : '',
            facebook: typeof window !== 'undefined' ? localStorage.getItem('socialFacebook') || '' : '',
            youtube: typeof window !== 'undefined' ? localStorage.getItem('socialYouTube') || '' : '',
            tiktok: typeof window !== 'undefined' ? localStorage.getItem('socialTikTok') || '' : '',
            linkedin: typeof window !== 'undefined' ? localStorage.getItem('socialLinkedIn') || '' : '',
          });
          try { const v = typeof window !== 'undefined' ? localStorage.getItem('socialIconStyle') || '' : ''; if (v) setIconStyle(v); } catch(_){}
        } catch (_) {}
      }
    }
    load();
    function onSettings(e?: Event) {
      // if detail provided, use it for immediate update
      try {
        const det = (e as any)?.detail;
        if (det && det.key && det.url) {
          const key = String(det.key);
          if (key === 'socialIcon_instagram') setCustomIcons(prev => ({ ...prev, instagram: String(det.url) }));
          if (key === 'socialIcon_facebook') setCustomIcons(prev => ({ ...prev, facebook: String(det.url) }));
          if (key === 'socialIcon_youtube') setCustomIcons(prev => ({ ...prev, youtube: String(det.url) }));
          if (key === 'socialIcon_tiktok') setCustomIcons(prev => ({ ...prev, tiktok: String(det.url) }));
          if (key === 'socialIcon_linkedin') setCustomIcons(prev => ({ ...prev, linkedin: String(det.url) }));
          return;
        }
      } catch(_){}

      // no detail: re-fetch authoritative values from server, fallback to localStorage
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
        // fallback to localStorage values
        try { const si = localStorage.getItem('socialInstagram'); if (si) setSocialLinks((p) => ({ ...p, instagram: si })); } catch(_){ }
      })();
    }
    window.addEventListener('site-settings-updated', onSettings as EventListener);
    return () => { mounted = false; window.removeEventListener('site-settings-updated', onSettings as EventListener); };
  }, []);

  // prefer locally-saved custom icons immediately (localStorage) so header shows uploaded icons without waiting for server
  useEffect(() => {
    try { const si = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_instagram') : null; if (si) setCustomIcons(prev => ({ ...prev, instagram: si })); } catch(_){}
    try { const sf = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_facebook') : null; if (sf) setCustomIcons(prev => ({ ...prev, facebook: sf })); } catch(_){}
    try { const sy = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_youtube') : null; if (sy) setCustomIcons(prev => ({ ...prev, youtube: sy })); } catch(_){}
    try { const st = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_tiktok') : null; if (st) setCustomIcons(prev => ({ ...prev, tiktok: st })); } catch(_){}
    try { const sl = typeof window !== 'undefined' ? localStorage.getItem('socialIcon_linkedin') : null; if (sl) setCustomIcons(prev => ({ ...prev, linkedin: sl })); } catch(_){}
  }, []);


  // load nav customization (font, colors, gap, height) from server or localStorage
  useEffect(() => {
    let mounted = true;
    async function loadNav() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=navHeight,navGap,navFontFamily,navFontSize,navFontWeight,navTextColor,navHoverTextColor,navActiveTextColor,navBgColor,navMobileActiveTextColor');
        if (resp.ok) {
          const j = await resp.json();
          const s = j?.settings || {};
          if (!mounted) return;
          if (s.navHeight) {
            try { document.documentElement.style.setProperty('--nav-height', `${s.navHeight}px`); } catch(_){}
          } else {
            try { const v = localStorage.getItem('navHeight'); if (v) document.documentElement.style.setProperty('--nav-height', `${v}px`); } catch(_){}
          }
          if (s.navGap) {
            try { document.documentElement.style.setProperty('--nav-gap', `${Number(s.navGap)/10}rem`); } catch(_){}
          } else {
            try { const v = localStorage.getItem('navGap'); if (v) document.documentElement.style.setProperty('--nav-gap', `${Number(v)/10}rem`); } catch(_){}
          }
          if (s.navFontFamily) { try { const fallback = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'; document.documentElement.style.setProperty('--nav-font-family', `${String(s.navFontFamily)}, ${fallback}`); } catch(_){} }
          if (s.navFontSize) { try { document.documentElement.style.setProperty('--nav-font-size', `${s.navFontSize}px`); } catch(_){} }
          if (s.navFontWeight) { try { document.documentElement.style.setProperty('--nav-font-weight', String(s.navFontWeight)); } catch(_){} }
          if (s.navTextColor) { try { document.documentElement.style.setProperty('--nav-text-color', String(s.navTextColor)); } catch(_){} }
          if (s.navHoverTextColor) { try { document.documentElement.style.setProperty('--nav-hover-text-color', String(s.navHoverTextColor)); } catch(_){} }
          if (s.navActiveTextColor) { try { document.documentElement.style.setProperty('--nav-active-text-color', String(s.navActiveTextColor)); } catch(_){} }
          if (s.navMobileActiveTextColor) { try { document.documentElement.style.setProperty('--nav-mobile-active-text-color', String(s.navMobileActiveTextColor)); } catch(_){} }
          if (s.navBgColor) { try { document.documentElement.style.setProperty('--nav-bg-color', String(s.navBgColor)); } catch(_){} }
          // mark nav as ready after applying server settings
          try { setNavLoaded(true); } catch(_){ }
        } else {
          // fallback to localStorage
          try { const nh = localStorage.getItem('navHeight'); if (nh) document.documentElement.style.setProperty('--nav-height', `${nh}px`); } catch(_){ }
          try { const ng = localStorage.getItem('navGap'); if (ng) document.documentElement.style.setProperty('--nav-gap', `${Number(ng)/10}rem`); } catch(_){ }
          try { setNavLoaded(true); } catch(_){ }
        }
      } catch (_) {
        try { const nh = localStorage.getItem('navHeight'); if (nh) document.documentElement.style.setProperty('--nav-height', `${nh}px`); } catch(_){ }
        try { setNavLoaded(true); } catch(_){ }
      }
    }
    loadNav();
    return () => { mounted = false; };
  }, []);

  const pathname = usePathname();
  // close the mobile menu whenever route changes (robust for programmatic navigation)
  React.useEffect(() => { setOpen(false); }, [pathname]);
  function normalizePath(p: string) {
    try { return String(p || '').replace(/\/+$|\/$/g, '').replace(/\/\//g, '/') || '/'; } catch(_) { return String(p || '').replace(/\/+$/g, '') || '/'; }
  }

  function linkClass(href: string) {
    const p = normalizePath(pathname || '');
    const h = normalizePath(href || '');
    // match exact, prefix (/foo and /foo/...), or root
    const isActive = (h === '/' && p === '/') || (p === h) || (h !== '/' && p.startsWith(h + '/')) || p.startsWith(h);
    return `${styles.link} ${isActive ? styles.active : ''}`;
  }

  const [imgError, setImgError] = useState(false);
  // start with an empty object on both server and client to avoid hydration mismatch
  const [navVisible, setNavVisible] = useState<{ [k: string]: boolean }>({});
  const [navMobileVisible, setNavMobileVisible] = useState<{ [k: string]: boolean }>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadVisible() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=navMenuVisible,navMobileMenuVisible');
        if (resp.ok) {
          const j = await resp.json();
          const s = j?.settings || {};
          if (!mounted) return;
          if (s.navMenuVisible) {
            try { const parsed = JSON.parse(String(s.navMenuVisible)); setNavVisible(parsed); try{ localStorage.setItem('navMenuVisible', JSON.stringify(parsed)); }catch(_){} } catch(_){}
          } else {
            try { const l = localStorage.getItem('navMenuVisible'); if (l) setNavVisible(JSON.parse(l)); } catch(_){}
          }
          if (s.navMobileMenuVisible) {
            try { const parsed = JSON.parse(String(s.navMobileMenuVisible)); setNavMobileVisible(parsed); try{ localStorage.setItem('navMobileMenuVisible', JSON.stringify(parsed)); }catch(_){} } catch(_){}
          } else {
            try { const l = localStorage.getItem('navMobileMenuVisible'); if (l) setNavMobileVisible(JSON.parse(l)); } catch(_){}
          }
        } else {
          try { const l = localStorage.getItem('navMenuVisible'); if (l) setNavVisible(JSON.parse(l)); } catch(_){}
          try { const l2 = localStorage.getItem('navMobileMenuVisible'); if (l2) setNavMobileVisible(JSON.parse(l2)); } catch(_){}
        }
      } catch (_) {
        try { const l = localStorage.getItem('navMenuVisible'); if (l) setNavVisible(JSON.parse(l)); } catch(_){}
        try { const l2 = localStorage.getItem('navMobileMenuVisible'); if (l2) setNavMobileVisible(JSON.parse(l2)); } catch(_){}
      }
    }
    loadVisible();

    function onSiteSettings() {
      try { const l = localStorage.getItem('navMenuVisible'); if (l) setNavVisible(JSON.parse(l)); } catch(_){}
      try { const l2 = localStorage.getItem('navMobileMenuVisible'); if (l2) setNavMobileVisible(JSON.parse(l2)); } catch(_){}
    }
    window.addEventListener('site-settings-updated', onSiteSettings as EventListener);

    // setup isMobile matchMedia
    try {
      const mq = window.matchMedia('(max-width: 900px)');
      const apply = () => {
        const is = Boolean(mq.matches);
        setIsMobile(is);
        try { document.documentElement.classList.toggle('mobile-mode', is); } catch(_) {}
      };
      apply();
      if (mq.addEventListener) mq.addEventListener('change', apply);
      else if ((mq as any).addListener) (mq as any).addListener(apply);
      return () => {
        mounted = false;
        window.removeEventListener('site-settings-updated', onSiteSettings as EventListener);
        try { document.documentElement.classList.remove('mobile-mode'); } catch(_) {}
        if (mq.removeEventListener) mq.removeEventListener('change', apply);
        else if ((mq as any).removeListener) (mq as any).removeListener(apply);
      };
    } catch (_) {
      return () => { mounted = false; window.removeEventListener('site-settings-updated', onSiteSettings as EventListener); };
    }
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.contentWrap}>
        <div className={styles.inner}>
          <div className={styles.left}>
            <Link href="/" className={styles.logo} data-measure="logo">
              {!imgError ? (
                <img
                  src={logoSrc}
                  alt="Maxcellens"
                  onError={() => setImgError(true)}
                  onLoad={() => setImgError(false)}
                />
              ) : (
                <span style={{ position: 'relative', fontWeight: 800, color: 'var(--fg)' }}>Maxcellens</span>
              )}
              <span style={{position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden'}}>Maxcellens</span>
            </Link>

            <div className={`${styles.social} ${styles[iconStyle] || ''}`} aria-hidden={false}>
              <a href={socialLinks.instagram || 'https://instagram.com'} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={styles.socialLink}>
                {customIcons.instagram ? <img src={customIcons.instagram} alt="Instagram custom" className={styles.customIcon} /> : (
                  <svg className={styles.socialPlaceholder} viewBox="0 0 24 24" aria-hidden="true" role="img"><rect x="4" y="4" width="16" height="16" rx="4" ry="4"/><circle cx="12" cy="12" r="4" /></svg>
                )}
              </a>

              <a href={socialLinks.facebook || 'https://facebook.com'} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={styles.socialLink}>
                {customIcons.facebook ? <img src={customIcons.facebook} alt="Facebook custom" className={styles.customIcon} /> : (
                  <svg className={styles.socialPlaceholder} viewBox="0 0 24 24" aria-hidden="true" role="img"><circle cx="12" cy="12" r="8"/></svg>
                )}
              </a>

              <a href={socialLinks.youtube || 'https://youtube.com'} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className={styles.socialLink}>
                {customIcons.youtube ? <img src={customIcons.youtube} alt="YouTube custom" className={styles.customIcon} /> : (
                  <svg className={styles.socialPlaceholder} viewBox="0 0 24 24" aria-hidden="true" role="img"><polygon points="9,7 16,12 9,17"/></svg>
                )}
              </a>

              <a href={socialLinks.tiktok || 'https://tiktok.com'} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className={styles.socialLink}>
                {customIcons.tiktok ? <img src={customIcons.tiktok} alt="TikTok custom" className={styles.customIcon} /> : (
                  <svg className={styles.socialPlaceholder} viewBox="0 0 24 24" aria-hidden="true" role="img"><path d="M16 7c-1 0-2 0-2 0v6c0 3-3 3-3 3-2 0-3-1-3-3s1-3 3-3h1V7h4z"/></svg>
                )}
              </a>

              <a href={socialLinks.linkedin || 'https://linkedin.com'} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={styles.socialLink}>
                {customIcons.linkedin ? <img src={customIcons.linkedin} alt="LinkedIn custom" className={styles.customIcon} /> : (
                  <svg className={styles.socialPlaceholder} viewBox="0 0 24 24" aria-hidden="true" role="img"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                )}
              </a>
            </div>
          </div>

          <button className={styles.menuButton} onClick={() => setOpen(!open)} aria-label="Menu">
            <span className={styles.hamburger} aria-hidden="true" />
          </button>

          <div className={styles.center}>
            <nav data-measure="nav" className={`${styles.nav} ${open ? styles.open : ''}`} aria-label="Main navigation">
              { ((isMobile ? navMobileVisible : navVisible).realisation ?? true) ? <Link href="/realisation" className={linkClass('/realisation')} onClick={() => setOpen(false)}>Réalisation</Link> : null }
              { ((isMobile ? navMobileVisible : navVisible).evenement ?? true) ? <Link href="/evenement" className={linkClass('/evenement')} onClick={() => setOpen(false)}>Évènement</Link> : null }
              { ((isMobile ? navMobileVisible : navVisible).corporate ?? true) ? <Link href="/corporate" className={linkClass('/corporate')} onClick={() => setOpen(false)}>Corporate</Link> : null }
              { ((isMobile ? navMobileVisible : navVisible).portrait ?? true) ? <Link href="/portrait" className={linkClass('/portrait')} onClick={() => setOpen(false)}>Portrait</Link> : null }
              { ((isMobile ? navMobileVisible : navVisible).galleries ?? true) ? <Link href="/galeries" className={linkClass('/galeries')} onClick={() => setOpen(false)}>Galeries</Link> : null }
              { ((isMobile ? navMobileVisible : navVisible).contact ?? true) ? <Link href="/contact" className={linkClass('/contact')} onClick={() => setOpen(false)}>Contact</Link> : null }
              { ((isMobile ? navMobileVisible : navVisible).admin ?? true) ? <Link href="/admin" className={linkClass('/admin')} onClick={() => setOpen(false)}>Admin</Link> : null }
            </nav>
          </div>
        </div>
      </div>

      {/* DevMeasure removed */}

      {open ? (
        <div className={styles.mobileOverlay} onClick={() => setOpen(false)} />
      ) : null}
    </header>
  );
}
