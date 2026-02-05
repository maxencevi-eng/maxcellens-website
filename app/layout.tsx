// app/layout.tsx
import '../styles/globals.css';
import Header from '../components/Header/Header';
import Container from '../components/Container/Container';
import Footer from '../components/Footer/Footer';
import AdminSidebarClient from '../components/AdminSidebar/AdminSidebarClient';
import SiteStyleProvider from '../components/SiteStyle/SiteStyleProvider';
import DisableImageSave from '../components/DisableImageSave/DisableImageSave';
import PageLayoutProvider from '../components/PageLayoutModal/PageLayoutProvider';
import AnalyticsCollector from '../components/Analytics/AnalyticsCollector';
import { BlockVisibilityProvider } from '../components/BlockVisibility';
import { Metadata } from 'next';
import type { ReactNode } from 'react';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maxcellens-website.vercel.app';
const baseUrl = siteUrl.replace(/\/$/, '');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

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
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Maxcellens — Vidéaste & Photographe Indépendant' }],
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
  try {
    if (supabaseAdmin) {
      const keys = ['navHeight','navGap','navFontFamily','navFontSize','navFontWeight','navTextColor','navHoverTextColor','navBgColor','siteLogoHeight','site_style'];
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
      if (map.siteLogoVersion) cssVars += `--site-logo-version: ${map.siteLogoVersion};`;

      // If site_style saved, parse and include its CSS variables and @font-face rules
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

          if (ss.typography) {
              function quoteFamilyServer(f: any) {
              try {
                const s = String(f || '');
                if (!s) return s;
                if (/^["'].*["']$/.test(s)) return s;
                if (/[,\s]/.test(s)) return `'${s}'`;
                return s;
              } catch (e) { return f; }
            }

            function normSizeServer(v: any) {
              try {
                if (v == null) return v;
                const s = String(v).trim();
                if (/^\d+$/.test(s)) return `${s}px`;
                return s;
              } catch (e) { return v; }
            }

            if (ss.typography.h1) {
              if (ss.typography.h1.family) cssVars += `--font-h1-family: ${quoteFamilyServer(ss.typography.h1.family)};`;
              if (ss.typography.h1.size) cssVars += `--font-h1-size: ${normSizeServer(ss.typography.h1.size)};`;
              if (ss.typography.h1.weight) cssVars += `--font-h1-weight: ${ss.typography.h1.weight};`;
            }
            if (ss.typography.h2) {
              if (ss.typography.h2.family) cssVars += `--font-h2-family: ${quoteFamilyServer(ss.typography.h2.family)};`;
              if (ss.typography.h2.size) cssVars += `--font-h2-size: ${normSizeServer(ss.typography.h2.size)};`;
              if (ss.typography.h2.weight) cssVars += `--font-h2-weight: ${ss.typography.h2.weight};`;
            }
            if (ss.typography.h3) {
              if (ss.typography.h3.family) cssVars += `--font-h3-family: ${quoteFamilyServer(ss.typography.h3.family)};`;
              if (ss.typography.h3.size) cssVars += `--font-h3-size: ${normSizeServer(ss.typography.h3.size)};`;
              if (ss.typography.h3.weight) cssVars += `--font-h3-weight: ${ss.typography.h3.weight};`;
            }
            if (ss.typography.h4) {
              if (ss.typography.h4.family) cssVars += `--font-h4-family: ${quoteFamilyServer(ss.typography.h4.family)};`;
              if (ss.typography.h4.size) cssVars += `--font-h4-size: ${normSizeServer(ss.typography.h4.size)};`;
              if (ss.typography.h4.weight) cssVars += `--font-h4-weight: ${ss.typography.h4.weight};`;
            }
            if (ss.typography.h5) {
              if (ss.typography.h5.family) cssVars += `--font-h5-family: ${quoteFamilyServer(ss.typography.h5.family)};`;
              if (ss.typography.h5.size) cssVars += `--font-h5-size: ${normSizeServer(ss.typography.h5.size)};`;
              if (ss.typography.h5.weight) cssVars += `--font-h5-weight: ${ss.typography.h5.weight};`;
            }
            if (ss.typography.p) {
              if (ss.typography.p.family) cssVars += `--font-body-family: ${quoteFamilyServer(ss.typography.p.family)};`;
              if (ss.typography.p.size) cssVars += `--font-body-size: ${normSizeServer(ss.typography.p.size)};`;
              if (ss.typography.p.weight) cssVars += `--font-body-weight: ${ss.typography.p.weight};`;
            }
          }

          // fonts -> @font-face server-side injection
          if (Array.isArray(ss.fonts) && ss.fonts.length) {
            const fontRules = ss.fonts.map((f: any) => {
              const family = String(f.name).replace(/"/g, '');
              const w = f.weight || '400';
              const st = f.style || 'normal';
              const u = String(f.url || f.publicUrl || f.path || '');
              return `@font-face{font-family: "${family}"; src: url('${u}') format('woff2'); font-weight: ${w}; font-style: ${st}; font-display: swap;}`;
            }).join('\n');
            cssVars += `\n/* site fonts */\n`;
            // store font rules separately so we can inject them in the head style block
            // use a marker in styleTag later
            cssVars += `--_site_font_rules: ${encodeURIComponent(fontRules)};`;
          }

        } catch (e) {
          // parse error: ignore
        }
      }
    }
  } catch (e) {
    // ignore server-side failure and fall back to CSS defaults
  }

  // Inject font rules if present encoded in cssVars (decode below)
  let styleTag = cssVars ? `<style>:root{${cssVars}}</style>` : '';
  const preloadLinks: string[] = [];
  if (cssVars && cssVars.includes('--_site_font_rules:')) {
    try {
      const m = cssVars.match(/--_site_font_rules:\s*([^;]+);/);
      if (m && m[1]) {
        const decoded = decodeURIComponent(m[1]);
        styleTag += `<style id="site-fonts">${decoded}</style>`;
        // also add preload links for woff2 Fonts referenced in rules
        try {
          const urls: string[] = [];
          decoded.replace(/url\(['"]?([^'"\)]+)['"]?\)/g, (_: string, u: string) => { if (u && !urls.includes(u)) urls.push(u); return ''; });
          for (const u of urls) preloadLinks.push(`<link rel="preload" href="${u}" as="font" type="font/woff2" crossorigin>`);
        } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
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
  const fontNonBlocking = `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" media="print" onload="this.media='all'" /><noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" /></noscript>`;
  // ensure a viewport meta is present so matchMedia reports expected widths on mobile devices
  const headContent = `<meta name="viewport" content="width=device-width, initial-scale=1" />\n${faviconLinks}\n${fontNonBlocking}\n${styleTag}`;

  return (
    <html lang="fr" className="wf-loading" suppressHydrationWarning>
      <head suppressHydrationWarning dangerouslySetInnerHTML={{ __html: headContent }} />
      <body>
        <SiteStyleProvider>
          <PageLayoutProvider>
            <BlockVisibilityProvider>
              <DisableImageSave />
              <AnalyticsCollector />
              <AdminSidebarClient />
            <Header />
            <main>
              <Container>
                <div className="content-inner">
                  {children}
                </div>
              </Container>
            </main>
            <Footer />
            </BlockVisibilityProvider>
          </PageLayoutProvider>
        </SiteStyleProvider>
      </body>
    </html>
  );
}
