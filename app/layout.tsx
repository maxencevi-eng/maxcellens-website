// app/layout.tsx
import '../styles/globals.css';
// Tokens du design system admin — importés après globals.css pour que les
// variables --adm-* puissent référencer celles du centre de style du site.
import '../components/admin/tokens.css';
// Normalise les corps de modales pas encore réécrits avec les primitives.
import '../components/admin/legacy.css';
import Header from '../components/Header/Header';
import Container from '../components/Container/Container';
import Footer from '../components/Footer/Footer';
import AdminSidebarClient from '../components/AdminSidebar/AdminSidebarClient';
import AdminDialogHost from '../components/admin/AdminDialogHost';
import SiteStyleProvider from '../components/SiteStyle/SiteStyleProvider';
import DisableImageSave from '../components/DisableImageSave/DisableImageSave';
import PageLayoutProvider from '../components/PageLayoutModal/PageLayoutProvider';
import AnalyticsCollector from '../components/Analytics/AnalyticsCollector';
import InitialLoadSplash from '../components/InitialLoadSplash/InitialLoadSplash';
import { BlockVisibilityProvider } from '../components/BlockVisibility';
import TransitionProvider from '../components/PageTransition/TransitionProvider';
import PageTransitionOverlay from '../components/PageTransition/PageTransitionOverlay';
import SpaScrollTarget from '../components/PageTransition/SpaScrollTarget';
import { Metadata } from 'next';
import type { ReactNode } from 'react';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { fontFaceCss, typographyCssVars } from '../lib/typography';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maxcellens.com';
const baseUrl = siteUrl.replace(/\/$/, '');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
// Preconnect URL for Supabase
const supabaseOrigin = supabaseUrl.replace(/^(https?:\/\/[^\/]+).*$/, '$1');

export const metadata: Metadata = {
  title: {
    default: 'Maxcellens | Vidéaste & Photographe Indépendant — Création vidéo et photo',
    template: '%s | Maxcellens',
  },
  description: 'Vidéaste et photographe indépendant. Création vidéo et photo : portrait, événementiel, corporate et réalisation. Paris, Île-de-France et France.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'Maxcellens | Vidéaste & Photographe Indépendant — Création vidéo et photo',
    description: 'Vidéaste et photographe indépendant. Création vidéo et photo : portrait, événementiel, corporate et réalisation. Paris et France.',
    url: `${baseUrl}/`,
    type: 'website',
    siteName: 'Maxcellens',
    locale: 'fr_FR',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Maxcellens — Vidéaste & Photographe Indépendant' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Maxcellens | Vidéaste & Photographe Indépendant — Création vidéo et photo',
    description: 'Vidéaste et photographe indépendant. Création vidéo et photo : portrait, événementiel, corporate et réalisation.',
  },
  robots: {
    index: true,
    follow: true,
  },
  // verification is now rendered dynamically from DB (google_site_verification setting)
  icons: supabaseUrl
    ? [
        { url: `${supabaseUrl}/storage/v1/object/public/site-assets/favicons/favicon.webp`, type: 'image/webp', sizes: '32x32' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
      ]
    : '/favicon.svg',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // attempt to read server-side site settings so initial HTML contains
  // navigation CSS variables and avoids a visual jump when client JS runs
  let cssVars = '';
  let googleVerificationCode = '';
  let siteFontRules = '';
  // Preload critical font/style resources if known
  let fontLinks = '';

  try {
    if (supabaseAdmin) {
      const keys = ['navHeight','navGap','navFontFamily','navFontSize','navFontWeight','navTextColor','navHoverTextColor','navBgColor','siteLogoHeight','siteFooterLogoHeight','site_style','google_site_verification'];
      const { data } = await supabaseAdmin.from('site_settings').select('key,value').in('key', keys as any);
      const map: Record<string,string> = {};
      (data || []).forEach((r: any) => { if (r && typeof r.key !== 'undefined') map[r.key] = String(r.value || ''); });

      if (map.navHeight) cssVars += `--nav-height: ${Number(map.navHeight)}px;`;
      if (map.navGap) cssVars += `--nav-gap: ${Number(map.navGap)/10}rem;`;
      if (map.navFontFamily) cssVars += `--nav-font-family: ${map.navFontFamily};`;
      if (map.navFontSize) cssVars += `--nav-font-size: ${Number(map.navFontSize)}rem;`;
      if (map.navFontWeight) cssVars += `--nav-font-weight: ${map.navFontWeight};`;
      if (map.navTextColor) cssVars += `--nav-text-color: ${map.navTextColor};`;
      if (map.navHoverTextColor) cssVars += `--nav-hover-text-color: ${map.navHoverTextColor};`;
      if (map.navActiveTextColor) cssVars += `--nav-active-text-color: ${map.navActiveTextColor};`;
      if (map.navMobileActiveTextColor) cssVars += `--nav-mobile-active-text-color: ${map.navMobileActiveTextColor};`;
      if (map.navBgColor) cssVars += `--nav-bg-color: ${map.navBgColor};`;
      if (map.siteLogoHeight) cssVars += `--site-logo-height: ${Number(map.siteLogoHeight)}px;`;
      // Injectée dès le rendu serveur : le Footer la chargeait uniquement côté
      // client, le logo apparaissait donc brièvement à la mauvaise taille.
      if (map.siteFooterLogoHeight) cssVars += `--site-footer-logo-height: ${Number(map.siteFooterLogoHeight)}px;`;
      if (map.siteLogoVersion) cssVars += `--site-logo-version: ${map.siteLogoVersion};`;
      if (map.google_site_verification) googleVerificationCode = map.google_site_verification;

      // Style du site : couleurs, variables typographiques et polices importées
      if (map.site_style) {
        try {
          const ss = JSON.parse(map.site_style);
          if (ss.colors) {
            if (ss.colors.bgColor) cssVars += `--bg-color: ${ss.colors.bgColor}; --bg: ${ss.colors.bgColor};`;
            if (ss.colors.blockBgColor) cssVars += `--block-bg: ${ss.colors.blockBgColor};`;
            if (ss.colors.primary) cssVars += `--color-primary: ${ss.colors.primary};`;
            if (ss.colors.secondary) cssVars += `--color-secondary: ${ss.colors.secondary};`;
            if (ss.colors.accent) cssVars += `--color-accent: ${ss.colors.accent};`;
            if (ss.colors.text) cssVars += `--color-text: ${ss.colors.text}; --fg: ${ss.colors.text};`;
          }
          Object.entries(typographyCssVars(ss.typography)).forEach(([k, v]) => { cssVars += `${k}: ${v};`; });
          siteFontRules = fontFaceCss(ss.fonts);
        } catch (e) {
          // parse error: ignore
        }
      }
    }
  } catch (e) {
    // ignore server-side failure and fall back to CSS defaults
  }

  let styleTag = cssVars ? `<style>:root{${cssVars}}</style>` : '';
  const preloadLinks: string[] = [];
  if (siteFontRules) {
    styleTag += `<style id="site-fonts">${siteFontRules}</style>`;
    // Précharge uniquement les fichiers woff2 (les autres formats sont chargés à la demande).
    const urls = new Set<string>();
    siteFontRules.replace(/url\('([^']+\.woff2[^']*)'\)/gi, (_: string, u: string) => { urls.add(u); return ''; });
    urls.forEach((u) => preloadLinks.push(`<link rel="preload" href="${u}" as="font" type="font/woff2" crossorigin>`));
  }

  // If we have a site logo version, preload the versioned logo and expose it to client via a small script
  try {
    const match = cssVars.match(/--site-logo-version:\s*([^;]+);/);
    if (match && match[1]) {
      const ver = match[1];
      const supa = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const logoUrl = `${supa}/storage/v1/object/public/site-assets/logos/site-logo.webp?t=${ver}`;
      preloadLinks.push(`<link rel="preload" href="${logoUrl}" as="image">`);
      styleTag += `<script>window.__siteLogoVersion = ${JSON.stringify(String(ver))};</script>`;
    }
  } catch (e) {}

  // Append preload links into the head html
  if (preloadLinks.length) styleTag = preloadLinks.join('\n') + '\n' + styleTag;

  // Swap wf-loading -> wf-loaded when fonts are ready; short delay after so first paint uses correct font; then site-ready for social/icons
  const fontLoaderScript = `<script>(function(){try{var fontTimeout=1800;var delayAfterFonts=180;function setLoaded(){document.documentElement.classList.remove('wf-loading');document.documentElement.classList.add('wf-loaded');setTimeout(function(){document.documentElement.classList.add('site-ready');},delayAfterFonts);}function setFailed(){document.documentElement.classList.remove('wf-loading');document.documentElement.classList.add('wf-failed');setTimeout(function(){document.documentElement.classList.add('site-ready');},delayAfterFonts);}if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){setTimeout(setLoaded,delayAfterFonts);});setTimeout(function(){if(document.documentElement.classList.contains('wf-loading')){setFailed();}},fontTimeout);}else{setTimeout(function(){setLoaded();},delayAfterFonts);}}catch(e){document.documentElement.classList.add('site-ready');} })()</script>`;

  // shim to avoid TrustedTypes 'createHTML' runtime error in some hosting environments
  const trustedTypesShim = `<script>(function(){try{if(window&&window.trustedTypes&&window.trustedTypes.defaultPolicy&&typeof window.trustedTypes.defaultPolicy.createHTML!=='function'){try{Object.defineProperty(window.trustedTypes.defaultPolicy,'createHTML',{configurable:true,writable:true,value:function(s){return String(s);}});}catch(e){try{var p=window.trustedTypes.createPolicy('default-shim',{createHTML:function(s){return String(s)}});if(p&&typeof p.createHTML==='function'){try{window.trustedTypes.defaultPolicy=createProxy(p);}catch(_){/* ignore */}}}catch(_){}}}function createProxy(p){return {createHTML:function(s){return p.createHTML(s)},createScriptURL:p.createScriptURL?function(u){return p.createScriptURL(u)}:undefined};}}catch(e){} })()</script>`;

  // inject font loader after previously generated styleTag so it runs early
  if (styleTag) styleTag = styleTag + '\n' + fontLoaderScript + '\n' + trustedTypesShim; else styleTag = fontLoaderScript + '\n' + trustedTypesShim;

  // Favicon: Supabase si dispo, sinon fallback local pour éviter erreur SEO (favicon manquant)
  const faviconSupabase = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/site-assets/favicons/favicon.webp`
    : '';
  const faviconLinks = faviconSupabase
    ? `<link rel="icon" href="${faviconSupabase}" type="image/webp" sizes="32x32" />\n<link rel="shortcut icon" href="${faviconSupabase}" type="image/webp" />\n<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`
    : '<link rel="icon" href="/favicon.svg" type="image/svg+xml" />';

  // Playfair Display : chargement non bloquant (évite render-blocking, améliore LCP mobile)
  // Use dns-prefetch instead of preconnect to avoid Lighthouse "unused preconnect" warning
  // when the font stylesheet loads asynchronously via media="print" trick
  const fontNonBlocking = `<link rel="dns-prefetch" href="https://fonts.googleapis.com" /><link rel="dns-prefetch" href="https://fonts.gstatic.com" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" media="print" onload="this.media='all'" /><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" /></noscript>`;
  // Google Search Console verification (dynamic from DB)
  const googleVerifMeta = googleVerificationCode ? `<meta name="google-site-verification" content="${googleVerificationCode.replace(/"/g, '&quot;')}" />` : '';
  // ensure a viewport meta is present so matchMedia reports expected widths on mobile devices
  // Added preconnect for supabase
  const preconnectSupabase = supabaseUrl ? `<link rel="preconnect" href="${supabaseUrl.replace(/^(https?:\/\/[^\/]+).*$/, '$1')}" crossorigin="anonymous" />` : '';
  const headContent = `<meta name="viewport" content="width=device-width, initial-scale=1" />\n${preconnectSupabase}\n${googleVerifMeta}\n${faviconLinks}\n${fontNonBlocking}\n${styleTag}`;

  return (
    <html lang="fr" className="wf-loading" suppressHydrationWarning>
      <head suppressHydrationWarning dangerouslySetInnerHTML={{ __html: headContent }} />
      <body>
        <InitialLoadSplash />
        <TransitionProvider>
        <PageTransitionOverlay />
        <SpaScrollTarget />
        <SiteStyleProvider>
          <PageLayoutProvider>
            <BlockVisibilityProvider>
              <DisableImageSave />
              <AnalyticsCollector />
              <AdminSidebarClient />
              {/* Confirmations et saisies de l'admin, rendues dans le site
                  plutôt que par les boîtes natives du navigateur. */}
              <AdminDialogHost />
            <div id="site-content">
            <Header />
            <main>
              <Container>
                <div className="content-inner">
                  {children}
                </div>
              </Container>
            </main>
            <Footer />
            </div>
            </BlockVisibilityProvider>
          </PageLayoutProvider>
        </SiteStyleProvider>
        </TransitionProvider>
      </body>
    </html>
  );
}
