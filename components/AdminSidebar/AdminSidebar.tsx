"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import FooterEditModal from '../FooterEditModal/FooterEditModal';
import MenuEditModal from '../MenuEditModal/MenuEditModal';
import MobileMenuEditModal from '../MobileMenuEditModal/MobileMenuEditModal';
import SocialLinksEditor from '../SocialLinksEditor/SocialLinksEditor';
import HeaderSettings from '../HeaderSettings/HeaderSettings';
import SeoCommandCenterModal from '../SeoCommandCenter/SeoCommandCenterModal';
import PageLayoutModal from '../PageLayoutModal/PageLayoutModal';
import StatisticsModal from '../Analytics/StatisticsModal';
import MaintenanceModal from '../Analytics/MaintenanceModal';
import dynamic from 'next/dynamic';

const PUBLIC_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const getStorage = (key: string) => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const setStorage = (key: string, value: string) => {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(key, value);
  } catch {}
};

const parseNumber = (val: any, def: number) => {
  const n = Number(val);
  return isNaN(n) ? def : n;
};

export default function AdminSidebar() {
  const [user, setUser] = useState<any>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [footerFile, setFooterFile] = useState<File | null>(null);
  const [footerPreview, setFooterPreview] = useState<string | null>(null);
  const [footerSize, setFooterSize] = useState<number>(36);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(36);
  const [navHeight, setNavHeight] = useState<number>(64);
  const [navGap, setNavGap] = useState<number>(6); // pixels-ish, convert to rem later
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [showFooterModal, setShowFooterModal] = useState<boolean>(false);
  const [showMenuModal, setShowMenuModal] = useState<boolean>(false);
  const [showMobileMenuModal, setShowMobileMenuModal] = useState<boolean>(false);
  const [showSocialsModal, setShowSocialsModal] = useState<boolean>(false);
  const [showHeaderModal, setShowHeaderModal] = useState<boolean>(false);
  const [showSiteStyleModal, setShowSiteStyleModal] = useState<boolean>(false);
  const [showSeoModal, setShowSeoModal] = useState<boolean>(false);
  const [showPageLayoutModal, setShowPageLayoutModal] = useState<boolean>(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState<boolean>(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState<boolean>(false);

  const SiteStyleEditor = dynamic(() => import('../SiteStyle/SiteStyleEditor'), { ssr: false });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser((data as any).user ?? null);
      if ((data as any).user) document.body.classList.add('has-admin-sidebar');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) document.body.classList.add('has-admin-sidebar');
      else document.body.classList.remove('has-admin-sidebar');
    });

    return () => {
      mounted = false;
      try {
        (listener as any)?.subscription?.unsubscribe?.();
      } catch (_) {}
      document.body.classList.remove('has-admin-sidebar');
    };
  }, []);

  // load current public images and saved logo size
  useEffect(() => {
    const logoPublic = `${PUBLIC_BASE}/storage/v1/object/public/site-assets/logos/site-logo.webp`;
    const faviconPublic = `${PUBLIC_BASE}/storage/v1/object/public/site-assets/favicons/favicon.webp`;
    const v = getStorage('siteLogoVersion') || '';
    setLogoPreview(v ? `${logoPublic}?t=${v}` : logoPublic);
    setFaviconPreview(v ? `${faviconPublic}?t=${v}` : faviconPublic);

    // footer preview/version
    const fv = getStorage('siteFooterLogoVersion') || '';
    const footerPublic = `${PUBLIC_BASE}/storage/v1/object/public/site-assets/logos/footer-logo.webp`;
    setFooterPreview(fv ? `${footerPublic}?t=${fv}` : footerPublic);

    async function loadServerSettings() {
      try {
        const keys = ['siteLogoVersion','siteFooterLogoVersion','siteLogoHeight','siteFooterLogoHeight','navHeight','navGap'].join(',');
        const resp = await fetch(`/api/admin/site-settings?keys=${encodeURIComponent(keys)}`);
        if (!resp.ok) return;
        const json = await resp.json();
        const s = json?.settings || {};
        if (s.siteLogoVersion) {
          const logoUrlWith = `${logoPublic}?t=${s.siteLogoVersion}`;
          setLogoPreview(logoUrlWith);
          setStorage('siteLogoVersion', s.siteLogoVersion);
        }
        if (s.siteFooterLogoVersion) {
          const footerUrlWith = `${footerPublic}?t=${s.siteFooterLogoVersion}`;
          setFooterPreview(footerUrlWith);
          setStorage('siteFooterLogoVersion', s.siteFooterLogoVersion);
        }
        if (s.siteLogoHeight) {
          const h = parseNumber(s.siteLogoHeight, 36);
          setLogoSize(h);
          document.documentElement.style.setProperty('--site-logo-height', `${h}px`);
          setStorage('siteLogoHeight', String(h));
        }
        if (s.siteFooterLogoHeight) {
          const fh = parseNumber(s.siteFooterLogoHeight, 36);
          setFooterSize(fh);
          document.documentElement.style.setProperty('--site-footer-logo-height', `${fh}px`);
          setStorage('siteFooterLogoHeight', String(fh));
        }
        if (s.navHeight) {
          const nh = parseNumber(s.navHeight, 64);
          setNavHeight(nh);
          try { document.documentElement.style.setProperty('--nav-height', `${nh}px`); } catch(_) {}
          setStorage('navHeight', String(nh));
        }
        if (s.navGap) {
          const ng = parseNumber(s.navGap, 6);
          setNavGap(ng);
          try { document.documentElement.style.setProperty('--nav-gap', `${ng / 10}rem`); } catch(_) {}
          setStorage('navGap', String(ng));
        }
      } catch (e) {
        // ignore
      }
    }

    try {
      const saved = getStorage('siteLogoHeight');
      if (saved) {
        const v = parseNumber(saved, 36);
        setLogoSize(v);
        document.documentElement.style.setProperty('--site-logo-height', `${v}px`);
      } else {
        document.documentElement.style.setProperty('--site-logo-height', `36px`);
      }

      const savedFooter = getStorage('siteFooterLogoHeight');
      if (savedFooter) {
        const fvNum = parseNumber(savedFooter, 36);
        setFooterSize(fvNum);
        document.documentElement.style.setProperty('--site-footer-logo-height', `${fvNum}px`);
      } else {
        document.documentElement.style.setProperty('--site-footer-logo-height', `36px`);
      }
    } catch (_) {}

    try {
      const nhSaved = getStorage('navHeight');
      if (nhSaved) {
        const n = parseNumber(nhSaved, 64);
        setNavHeight(n);
        document.documentElement.style.setProperty('--nav-height', `${n}px`);
      } else {
        document.documentElement.style.setProperty('--nav-height', `64px`);
      }
      const ngSaved = getStorage('navGap');
      if (ngSaved) {
        const g = parseNumber(ngSaved, 6);
        setNavGap(g);
        document.documentElement.style.setProperty('--nav-gap', `${g / 10}rem`);
      } else {
        document.documentElement.style.setProperty('--nav-gap', `0.6rem`);
      }
    } catch (_) {}

    // try to load persisted settings from Supabase via API
    try { loadServerSettings(); } catch (_) {}
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    document.body.classList.remove('has-admin-sidebar');
  }

  if (!user) return null;

  function toggleMenu(name: string) {
    setOpenMenu((m) => (m === name ? null : name));
    setMessage(null);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setLogoFile(f);
    setMessage(null);
    if (f) {
      const url = URL.createObjectURL(f);
      setLogoPreview(url);
    } else {
      setLogoPreview(null);
    }
  }

  function onFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFaviconFile(f);
    setMessage(null);
    if (f) setFaviconPreview(URL.createObjectURL(f));
    else setFaviconPreview(null);
  }

  function handleNavHeightChange(v: number) {
    setNavHeight(v);
    try { document.documentElement.style.setProperty('--nav-height', `${v}px`); } catch(_){}
    setStorage('navHeight', String(v));
    try { fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify({ key: 'navHeight', value: String(v) }), headers: { 'Content-Type':'application/json' } }); } catch(_){}
  }

  function handleNavGapChange(v: number) {
    setNavGap(v);
    try { document.documentElement.style.setProperty('--nav-gap', `${v/10}rem`); } catch(_){}
    setStorage('navGap', String(v));
    try { fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify({ key: 'navGap', value: String(v) }), headers: { 'Content-Type':'application/json' } }); } catch(_){}
  }

  function onFooterFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFooterFile(f);
    setMessage(null);
    if (f) setFooterPreview(URL.createObjectURL(f));
    else setFooterPreview(null);
  }

  async function uploadLogo() {
    if (!logoFile) return setMessage('Aucun fichier sélectionné');
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', logoFile);
      form.append('category', 'logos');
      const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      // get version from server and save for cache-bust
      const v = String(json?.version || Date.now());
      setStorage('siteLogoVersion', v);
      // persist to server
      try { await fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify({ key: 'siteLogoVersion', value: v }), headers: { 'Content-Type':'application/json' } }); } catch(_) {}
      const logoPublic = json?.webp || null;
      setLogoPreview(logoPublic ? `${logoPublic}?t=${v}` : null);
      setMessage('Logo importé avec succès');
    } catch (err: any) {
      setMessage(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  async function uploadFavicon() {
    if (!faviconFile) return setMessage('Aucun fichier sélectionné');
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', faviconFile);
      form.append('category', 'favicons');
      const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      const v = String(json?.version || Date.now());
      setStorage('siteLogoVersion', v);
      try { await fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify({ key: 'siteLogoVersion', value: v }), headers: { 'Content-Type':'application/json' } }); } catch(_) {}
      const favPublic = json?.webp || null;
      setFaviconPreview(favPublic ? `${favPublic}?t=${v}` : null);
      setMessage('Favicon importé avec succès');
    } catch (err: any) {
      setMessage(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  async function uploadFooterLogo() {
    if (!footerFile) return setMessage('Aucun fichier sélectionné');
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', footerFile);
      // upload under dedicated footer handling in the route
      form.append('category', 'footer');
      const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      const v = String(json?.version || Date.now());
      setStorage('siteFooterLogoVersion', v);
      try { await fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify({ key: 'siteFooterLogoVersion', value: v }), headers: { 'Content-Type':'application/json' } }); } catch(_) {}
      const favPublic = json?.webp || null;
      const previewUrl = favPublic ? `${favPublic}?t=${v}` : null;
      setFooterPreview(previewUrl);
      setMessage('Logo du footer importé avec succès');
    } catch (err: any) {
      setMessage(err?.message || String(err));
    } finally {
      setUploading(false);
    }
  }

  function handleLogoSizeChange(v: number) {
    setLogoSize(v);
    try { document.documentElement.style.setProperty('--site-logo-height', `${v}px`); } catch (_) {}
    setStorage('siteLogoHeight', String(v));
    try { fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify({ key: 'siteLogoHeight', value: String(v) }), headers: { 'Content-Type':'application/json' } }); } catch(_) {}
  }

  function handleFooterSizeChange(v: number) {
    setFooterSize(v);
    try { document.documentElement.style.setProperty('--site-footer-logo-height', `${v}px`); } catch (_) {}
    setStorage('siteFooterLogoHeight', String(v));
    try { fetch('/api/admin/site-settings', { method: 'POST', body: JSON.stringify({ key: 'siteFooterLogoHeight', value: String(v) }), headers: { 'Content-Type':'application/json' } }); } catch(_) {}
  }

  function hideSidebar() {
    setSidebarVisible(false);
    document.body.classList.remove('has-admin-sidebar');
  }

  function showSidebar() {
    setSidebarVisible(true);
    document.body.classList.add('has-admin-sidebar');
  }

  if (!sidebarVisible) {
    return (
      <button className="admin-toggle-btn" aria-label="Ouvrir admin" onClick={showSidebar}>≡</button>
    );
  }

  return (
    <aside id="admin-sidebar" aria-label="Admin sidebar">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="admin-title">Admin</div>
        <button onClick={hideSidebar} aria-label="Masquer la sidebar" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
      </div>

      <nav aria-label="Admin menu">
        <ul>
          <li>
            <button className="menu-item" onClick={() => toggleMenu('general')}>Général</button>
          </li>

          {/* submenu displayed directly under the 'Général' item */}
          {openMenu === 'general' ? (
            <li className="submenu-li">
              <div className="submenu">
                <div className="submenu-row">
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>Importer le logo du site</div>
                  <div style={{ marginTop: 8 }}>
                    <input type="file" accept="image/*" onChange={onFileChange} />
                  </div>
                  <div className="upload-row">
                    <div className="upload-preview">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Aperçu logo"
                          style={{ maxWidth: 140, maxHeight: 80, objectFit: 'contain', borderRadius: 6 }}
                          onError={() => setLogoPreview(null)}
                        />
                      ) : (
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Aperçu logo</div>
                      )}
                    </div>
                    <div className="upload-controls">
                      <div>
                        <button className="menu-item" onClick={uploadLogo} disabled={uploading}>{uploading ? 'Import...' : 'Importer'}</button>
                      </div>
                    </div>
                  </div>

                  {/* Curseur de taille placé sous l'aperçu + import */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <label style={{ fontSize: 13, color: 'var(--muted)' }}>Taille :</label>
                    <input type="range" min={24} max={120} value={logoSize} onChange={(e) => handleLogoSizeChange(Number(e.target.value))} />
                    <div style={{ fontSize: 13 }}>{logoSize}px</div>
                  </div>

                  <div style={{ height: 12 }} />

                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Importer le favicon du site</div>
                  <div style={{ marginTop: 8 }}>
                    <input type="file" accept="image/*" onChange={onFaviconChange} />
                  </div>
                  <div className="upload-row">
                    <div className="upload-preview">
                      {faviconPreview ? (
                        <img
                          src={faviconPreview}
                          alt="Aperçu favicon"
                          style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6 }}
                          onError={() => setFaviconPreview(null)}
                        />
                      ) : (
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Aperçu favicon</div>
                      )}
                    </div>
                    <div className="upload-controls">
                      <div>
                        <button className="menu-item" onClick={uploadFavicon} disabled={uploading}>{uploading ? 'Import...' : 'Importer'}</button>
                      </div>
                    </div>
                  </div>

                  {message ? <div style={{ marginTop: 8, fontSize: 13 }}>{message}</div> : null}
                </div>
              </div>
            </li>
            ) : null}

          <li><button className="menu-item" onClick={() => setShowSiteStyleModal(true)}>Style du site</button></li>

          <li><button className="menu-item" onClick={() => toggleMenu('menu')}>Menu</button></li>
          {openMenu === 'menu' ? (
            <li className="submenu-li">
              <div className="submenu">
                <div className="submenu-row">
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Hauteur de la barre de navigation</div>
                  <div style={{ marginTop: 8 }}>
                    <input type="range" min={40} max={120} value={navHeight} onChange={(e) => handleNavHeightChange(Number(e.target.value))} />
                    <div style={{ fontSize: 13, marginTop: 6 }}>{navHeight}px</div>
                  </div>

                  <div style={{ height: 12 }} />

                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Espace entre boutons</div>
                  <div style={{ marginTop: 8 }}>
                    <input type="range" min={2} max={20} value={navGap} onChange={(e) => handleNavGapChange(Number(e.target.value))} />
                    <div style={{ fontSize: 13, marginTop: 6 }}>{(navGap/10).toFixed(2)}rem</div>
                  </div>

                  <div style={{ height: 12 }} />
                  <div style={{ marginTop: 8 }}>
                    <button className="menu-item" onClick={() => setShowMenuModal(true)}>Modifier le menu</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button className="menu-item" onClick={() => setShowMobileMenuModal(true)}>Modifier le menu mobile</button>
                  </div>
                </div>
              </div>
            </li>
          ) : null}
          <li>
            <button className="menu-item" onClick={() => toggleMenu('header')}>Header</button>
          </li>
          {openMenu === 'header' ? (
            <li className="submenu-li">
              <div className="submenu">
                <div className="submenu-row">
                  <div style={{ marginTop: 8 }}>
                    <button className="menu-item" onClick={() => setShowHeaderModal(true)}>Modifier Header</button>
                  </div>
                </div>
              </div>
            </li>
          ) : null}
          <li><button className="menu-item" onClick={() => toggleMenu('footer')}>Footer</button></li>
          {openMenu === 'footer' ? (
            <li className="submenu-li">
              <div className="submenu">
                <div className="submenu-row">
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Importer le logo du footer</div>
                  <div style={{ marginTop: 8 }}>
                    <input type="file" accept="image/*" onChange={onFooterFileChange} />
                  </div>
                  <div className="upload-row">
                    <div className="upload-preview">
                      {footerPreview ? (
                        <img
                          src={footerPreview}
                          alt="Aperçu footer"
                          style={{ maxWidth: 140, maxHeight: 80, objectFit: 'contain', borderRadius: 6 }}
                          onError={() => setFooterPreview(null)}
                        />
                      ) : (
                        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Aperçu footer</div>
                      )}
                    </div>
                    <div className="upload-controls">
                      <div>
                        <button className="menu-item" onClick={uploadFooterLogo} disabled={uploading}>{uploading ? 'Import...' : 'Importer'}</button>
                      </div>
                    </div>
                  </div>

                  {/* Taille et action de modification placées sous l'aperçu */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <label style={{ fontSize: 13, color: 'var(--muted)' }}>Taille :</label>
                    <input type="range" min={24} max={120} value={footerSize} onChange={(e) => handleFooterSizeChange(Number(e.target.value))} />
                    <div style={{ fontSize: 13 }}>{footerSize}px</div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button className="menu-item" onClick={() => setShowFooterModal(true)}>Modifier le footer</button>
                  </div>
                </div>
              </div>
            </li>
          ) : null}
          {/* Style du site is available via direct button above. Removed duplicate submenu entry. */}
          <li><button className="menu-item" onClick={() => toggleMenu('reseaux')}>Réseaux</button></li>
          {openMenu === 'reseaux' ? (
            <li className="submenu-li">
              <div className="submenu">
                <div className="submenu-row">
                  <div style={{ marginTop: 8 }}>
                    <button className="menu-item" onClick={() => setShowSocialsModal(true)}>Modifier les réseaux</button>
                  </div>
                </div>
              </div>
            </li>
          ) : null}
          <li><button className="menu-item" onClick={() => setShowSeoModal(true)}>SEO</button></li>
          <li><button className="menu-item" onClick={() => toggleMenu('page')}>Page</button></li>
          {openMenu === 'page' ? (
            <li className="submenu-li">
              <div className="submenu">
                <div className="submenu-row">
                  <div style={{ marginTop: 8 }}>
                    <button className="menu-item" onClick={() => setShowPageLayoutModal(true)}>Dimensions & mise en page</button>
                  </div>
                </div>
              </div>
            </li>
          ) : null}
          <li><button className="menu-item" onClick={() => toggleMenu('statistiques')}>Statistiques</button></li>
          {openMenu === 'statistiques' ? (
            <li className="submenu-li">
              <div className="submenu">
                <div className="submenu-row">
                  <div style={{ marginTop: 8 }}>
                    <button className="menu-item" onClick={() => setShowStatisticsModal(true)}>Dashboard</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button className="menu-item" onClick={() => setShowMaintenanceModal(true)}>Maintenance</button>
                  </div>
                </div>
              </div>
            </li>
          ) : null}
        </ul>
      </nav>

      <div className="signout">
        <div style={{ fontSize: 13, marginBottom: 8 }}>{user.email}</div>
        <button className="signout-btn" onClick={signOut}>Déconnexion</button>
      </div>

      {showFooterModal ? (
        <FooterEditModal onClose={() => setShowFooterModal(false)} onSaved={() => { setMessage('Footer mis à jour'); }} />
      ) : null}

      {showMenuModal ? (
        <MenuEditModal onClose={() => setShowMenuModal(false)} onSaved={() => { setMessage('Menu mis à jour'); }} />
      ) : null}

      {showSocialsModal ? (
        <SocialLinksEditor onClose={() => setShowSocialsModal(false)} onSaved={() => { setMessage('Réseaux mis à jour'); }} />
      ) : null}

      {showMobileMenuModal ? (
        <MobileMenuEditModal onClose={() => setShowMobileMenuModal(false)} onSaved={() => { setMessage('Menu mobile mis à jour'); }} />
      ) : null}

      {showSiteStyleModal ? (
        <SiteStyleEditor onClose={() => setShowSiteStyleModal(false)} />
      ) : null}

      {showHeaderModal ? (
        <HeaderSettings open={true} onClose={() => setShowHeaderModal(false)} />
      ) : null}

      {showSeoModal ? (
        <SeoCommandCenterModal onClose={() => setShowSeoModal(false)} onSaved={() => { setMessage('SEO mis à jour'); }} />
      ) : null}

      {showPageLayoutModal ? (
        <PageLayoutModal onClose={() => setShowPageLayoutModal(false)} onSaved={() => { setMessage('Mise en page enregistrée'); }} />
      ) : null}

      {showStatisticsModal ? (
        <StatisticsModal onClose={() => setShowStatisticsModal(false)} />
      ) : null}

      {showMaintenanceModal ? (
        <MaintenanceModal onClose={() => setShowMaintenanceModal(false)} />
      ) : null}

    </aside>
  );
}
