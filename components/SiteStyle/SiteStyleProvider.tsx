"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';

type ColorSettings = {
  bgColor?: string;
  primary?: string;
  secondary?: string;
  accent?: string;
  text?: string;
};

type FontMeta = { name: string; url: string; style?: string; weight?: string };

type TypographySettings = Record<
  string,
  { family?: string; size?: string; weight?: string }
>;

export type SiteStyle = {
  colors?: ColorSettings;
  typography?: TypographySettings;
  fonts?: FontMeta[];
};

const defaultState: SiteStyle = {};

const SiteStyleContext = createContext<{
  style: SiteStyle;
  setStyle: (s: SiteStyle) => void;
  saveStyle: (s?: SiteStyle) => Promise<void>;
}>({ style: defaultState, setStyle: () => {}, saveStyle: async () => {} });

export function useSiteStyle() {
  return useContext(SiteStyleContext);
}

export default function SiteStyleProvider({ children }: { children: React.ReactNode }) {
  const [style, _setStyle] = useState<SiteStyle>(defaultState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=site_style');
        if (!resp.ok) return;
        const json = await resp.json();
        const raw = json?.settings?.site_style;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (mounted) _setStyle(parsed);
          } catch (e) {
            console.warn('Failed to parse site_style', e);
          }
        }
      } catch (e) {
        console.warn('Failed to load site_style', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // apply CSS variables when style changes
    function applyCss(s: SiteStyle) {
      try {
        const root = document.documentElement;
        if (!s) return;
        const c = s.colors || {};
        if (c.bgColor) {
          root.style.setProperty('--bg-color', c.bgColor);
          // map to legacy variable used across the site
          root.style.setProperty('--bg', c.bgColor);
        }
        if (c.primary) root.style.setProperty('--color-primary', c.primary);
        if (c.secondary) root.style.setProperty('--color-secondary', c.secondary);
        if (c.accent) root.style.setProperty('--color-accent', c.accent);
        if (c.text) {
          root.style.setProperty('--color-text', c.text);
          // map to legacy variable used across the site
          root.style.setProperty('--fg', c.text);
        }

        const t = s.typography || {};
        function quoteFamily(f: string) {
          if (!f) return f;
          if (/^["'].*["']$/.test(f)) return f;
          if (/[\s,]/.test(f)) return `'${f}'`;
          return f;
        }

        function normSize(v?: string) {
          if (!v) return v;
          const s = String(v).trim();
          if (/^\d+$/.test(s)) return `${s}px`;
          return s;
        }

        if (t.h1) {
          if (t.h1.family) root.style.setProperty('--font-h1-family', quoteFamily(t.h1.family));
          if (t.h1.size) root.style.setProperty('--font-h1-size', normSize(t.h1.size));
          if (t.h1.weight) root.style.setProperty('--font-h1-weight', t.h1.weight);
        }
        if (t.h2) {
          if (t.h2.family) root.style.setProperty('--font-h2-family', quoteFamily(t.h2.family));
          if (t.h2.size) root.style.setProperty('--font-h2-size', normSize(t.h2.size));
          if (t.h2.weight) root.style.setProperty('--font-h2-weight', t.h2.weight);
        }
        if (t.h3) {
          if (t.h3.family) root.style.setProperty('--font-h3-family', quoteFamily(t.h3.family));
          if (t.h3.size) root.style.setProperty('--font-h3-size', normSize(t.h3.size));
          if (t.h3.weight) root.style.setProperty('--font-h3-weight', t.h3.weight);
        }
        if (t.h4) {
          if (t.h4.family) root.style.setProperty('--font-h4-family', quoteFamily(t.h4.family));
          if (t.h4.size) root.style.setProperty('--font-h4-size', normSize(t.h4.size));
          if (t.h4.weight) root.style.setProperty('--font-h4-weight', t.h4.weight);
        }
        if (t.h5) {
          if (t.h5.family) root.style.setProperty('--font-h5-family', quoteFamily(t.h5.family));
          if (t.h5.size) root.style.setProperty('--font-h5-size', normSize(t.h5.size));
          if (t.h5.weight) root.style.setProperty('--font-h5-weight', t.h5.weight);
        }
        if (t.p) {
          if (t.p.family) root.style.setProperty('--font-body-family', quoteFamily(t.p.family));
          if (t.p.size) root.style.setProperty('--font-body-size', normSize(t.p.size));
          if (t.p.weight) root.style.setProperty('--font-body-weight', t.p.weight);
        }

        // fonts: generate @font-face rules
        const fonts = s.fonts || [];
        const styleTagId = 'site-fonts';
        let tag = document.getElementById(styleTagId) as HTMLStyleElement | null;
        if (!tag) {
          tag = document.createElement('style');
          tag.id = styleTagId;
          document.head.appendChild(tag);
        }
        const rules = fonts.map((f, idx) => {
          const fontFamily = f.name.replace(/"/g, '').trim();
          const weight = f.weight || '400';
          const styleVal = f.style || 'normal';
          return `@font-face{font-family: "${fontFamily}"; src: url('${f.url}') format('woff2'); font-weight: ${weight}; font-style: ${styleVal}; font-display: swap;}`;
        }).join('\n');
        tag.innerHTML = rules;

      } catch (e) {
        console.warn('applyCss failed', e);
      }
    }

    applyCss(style);
  }, [style]);

  async function saveStyle(s?: SiteStyle) {
    const toSave = s || style;
    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'site_style', value: JSON.stringify(toSave) })
      });
    } catch (e) {
      console.warn('saveStyle failed', e);
    }
  }

  function setStyle(s: SiteStyle) {
    _setStyle(s);
  }

  return (
    <SiteStyleContext.Provider value={{ style, setStyle, saveStyle }}>
      {children}
    </SiteStyleContext.Provider>
  );
}
