"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import {
  AdminButton,
  AdminModal,
  AdminNotice,
  AdminSection,
  SliderField,
} from '../index';
import styles from './SiteIdentityModal.module.css';

const PUBLIC_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const ASSETS = {
  logo: {
    label: 'Logo du site',
    category: 'logos',
    publicPath: 'logos/site-logo.webp',
    versionKey: 'siteLogoVersion',
    heightKey: 'siteLogoHeight',
    cssVar: '--site-logo-height',
    min: 24,
    max: 120,
    fallback: 36,
  },
  favicon: {
    label: 'Favicon',
    category: 'favicons',
    publicPath: 'favicons/favicon.webp',
    versionKey: 'siteLogoVersion',
    heightKey: null,
    cssVar: null,
    min: 0,
    max: 0,
    fallback: 0,
  },
  footer: {
    label: 'Logo du footer',
    category: 'footer',
    publicPath: 'logos/footer-logo.webp',
    versionKey: 'siteFooterLogoVersion',
    heightKey: 'siteFooterLogoHeight',
    cssVar: '--site-footer-logo-height',
    min: 8,
    max: 120,
    fallback: 36,
  },
} as const;

type AssetKey = keyof typeof ASSETS;

/**
 * Identité visuelle : logo, favicon, logo du footer.
 *
 * Ces trois imports étaient noyés dans des sous-menus dépliants de la barre
 * latérale, avec la logique d'upload recopiée trois fois. Ils ont désormais
 * leur propre écran.
 */
export default function SiteIdentityModal({ onClose }: { onClose: () => void }) {
  const [previews, setPreviews] = useState<Record<AssetKey, string | null>>({
    logo: null,
    favicon: null,
    footer: null,
  });
  const [sizes, setSizes] = useState<{ logo: number; footer: number }>({
    logo: 36,
    footer: 36,
  });
  const [busy, setBusy] = useState<AssetKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = `${PUBLIC_BASE}/storage/v1/object/public/site-assets`;

    (async () => {
      try {
        const keys = ['siteLogoVersion', 'siteFooterLogoVersion', 'siteLogoHeight', 'siteFooterLogoHeight'];
        const resp = await fetch(`/api/admin/site-settings?keys=${keys.join(',')}`);
        const s = resp.ok ? (await resp.json())?.settings || {} : {};

        const v = s.siteLogoVersion ? `?t=${s.siteLogoVersion}` : '';
        const fv = s.siteFooterLogoVersion ? `?t=${s.siteFooterLogoVersion}` : '';
        setPreviews({
          logo: `${base}/${ASSETS.logo.publicPath}${v}`,
          favicon: `${base}/${ASSETS.favicon.publicPath}${v}`,
          footer: `${base}/${ASSETS.footer.publicPath}${fv}`,
        });

        const logoH = Number(s.siteLogoHeight) || 36;
        const footerH = Number(s.siteFooterLogoHeight) || 36;
        setSizes({ logo: logoH, footer: footerH });
        document.documentElement.style.setProperty('--site-logo-height', `${logoH}px`);
        document.documentElement.style.setProperty('--site-footer-logo-height', `${footerH}px`);
      } catch (_) {
        setError('Impossible de charger les réglages actuels');
      }
    })();
  }, []);

  async function persist(key: string, value: string) {
    try {
      await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      try { localStorage.setItem(key, value); } catch (_) {}
    } catch (_) {}
  }

  async function upload(assetKey: AssetKey, file: File) {
    const asset = ASSETS[assetKey];
    setBusy(assetKey);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', asset.category);
      const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Échec de l’import');

      const version = String(json?.version || Date.now());
      await persist(asset.versionKey, version);
      const url = json?.webp ? `${json.webp}?t=${version}` : null;
      setPreviews((p) => ({ ...p, [assetKey]: url }));
      setMessage(`${asset.label} importé.`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(null);
    }
  }

  function changeSize(assetKey: 'logo' | 'footer', value: number) {
    const asset = ASSETS[assetKey];
    setSizes((s) => ({ ...s, [assetKey]: value }));
    if (asset.cssVar) {
      document.documentElement.style.setProperty(asset.cssVar, `${value}px`);
    }
    if (asset.heightKey) persist(asset.heightKey, String(value));
  }

  return (
    <AdminModal
      title="Identité visuelle"
      subtitle="Logo, favicon et logo du pied de page."
      size="md"
      onClose={onClose}
      footer={
        <AdminButton variant="primary" onClick={onClose}>
          Terminé
        </AdminButton>
      }
    >
      {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}
      {message ? <AdminNotice tone="success">{message}</AdminNotice> : null}

      <AdminSection
        title="Logo du site"
        description="Affiché dans la barre de navigation. Converti en WebP à l’import."
      >
        <AssetRow
          assetKey="logo"
          preview={previews.logo}
          busy={busy === 'logo'}
          onFile={(f) => upload('logo', f)}
        />
        <SliderField
          label="Hauteur d’affichage"
          value={sizes.logo}
          onChange={(v) => changeSize('logo', v)}
          min={ASSETS.logo.min}
          max={ASSETS.logo.max}
        />
      </AdminSection>

      <AdminSection
        title="Favicon"
        description="Icône affichée dans l’onglet du navigateur. Format carré recommandé."
      >
        <AssetRow
          assetKey="favicon"
          preview={previews.favicon}
          busy={busy === 'favicon'}
          onFile={(f) => upload('favicon', f)}
          small
        />
      </AdminSection>

      <AdminSection title="Logo du pied de page">
        <AssetRow
          assetKey="footer"
          preview={previews.footer}
          busy={busy === 'footer'}
          onFile={(f) => upload('footer', f)}
        />
        <SliderField
          label="Hauteur d’affichage"
          value={sizes.footer}
          onChange={(v) => changeSize('footer', v)}
          min={ASSETS.footer.min}
          max={ASSETS.footer.max}
        />
      </AdminSection>
    </AdminModal>
  );
}

function AssetRow({
  assetKey,
  preview,
  busy,
  onFile,
  small,
}: {
  assetKey: AssetKey;
  preview: string | null;
  busy: boolean;
  onFile: (file: File) => void;
  small?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [broken, setBroken] = useState(false);

  return (
    <div className={styles.row}>
      <div className={`${styles.preview} ${small ? styles.previewSmall : ''}`}>
        {preview && !broken ? (
          <img src={preview} alt="" onError={() => setBroken(true)} />
        ) : (
          <span className={styles.empty}>Aucun fichier</span>
        )}
      </div>
      <div className={styles.actions}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className={styles.hidden}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setBroken(false);
              onFile(f);
            }
            e.target.value = '';
          }}
        />
        <AdminButton
          size="sm"
          variant="secondary"
          loading={busy}
          leadingIcon={<Upload size={14} aria-hidden="true" />}
          onClick={() => inputRef.current?.click()}
        >
          {preview && !broken ? 'Remplacer' : 'Importer'}
        </AdminButton>
      </div>
    </div>
  );
}
