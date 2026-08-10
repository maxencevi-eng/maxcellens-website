"use client";

import React, { useEffect, useState } from 'react';
import {
  AdminModal,
  AdminNotice,
  AdminSection,
  ColorField,
  SliderField,
} from '../admin';
import styles from './HeaderSettings.module.css';

type HeaderSiteSettings = {
  height: { value: number; unit: string };
  width: { value: number; unit: string };
  overlay: { color: string; opacity: number };
};

const DEFAULTS: HeaderSiteSettings = {
  height: { value: 50, unit: '%' },
  width: { value: 100, unit: '%' },
  overlay: { color: '#000000', opacity: 0.3 },
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function toNumber(val: unknown, def: number) {
  if (val === null || val === undefined || val === '') return def;
  const n = Number(val);
  return Number.isNaN(n) ? def : n;
}

/** Complète une valeur brute lue en base avec les défauts. */
function normalize(raw: any): HeaderSiteSettings {
  return {
    height: {
      value: clamp(toNumber(raw?.height?.value, 50), 10, 200),
      unit: raw?.height?.unit || '%',
    },
    width: {
      value: clamp(toNumber(raw?.width?.value, 100), 10, 200),
      unit: raw?.width?.unit || '%',
    },
    overlay: {
      color: raw?.overlay?.color || '#000000',
      opacity: clamp(toNumber(raw?.overlay?.opacity, 0.3), 0, 1),
    },
  };
}

/**
 * Réglages globaux du bandeau d'en-tête.
 *
 * Corrections par rapport à la version précédente : la modale n'était pas
 * portalisée (elle héritait du contexte d'empilement de son parent), ne
 * réagissait pas à Échap, se fermait au moindre clic à l'intérieur du
 * backdrop, et n'offrait aucun aperçu.
 */
export default function HeaderSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<HeaderSiteSettings>(DEFAULTS);
  const [baseline, setBaseline] = useState<string>(JSON.stringify(DEFAULTS));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=header_site_settings');
        if (!resp.ok) return;
        const raw = (await resp.json())?.settings?.header_site_settings;
        if (!mounted || !raw || typeof raw !== 'string') return;
        const parsed = normalize(JSON.parse(raw));
        setSettings(parsed);
        setBaseline(JSON.stringify(parsed));
      } catch (_) {
        if (mounted) setError('Chargement des réglages impossible.');
      }
    })();
    return () => { mounted = false; };
  }, [open]);

  const dirty = JSON.stringify(settings) !== baseline;

  function update(patch: Partial<HeaderSiteSettings>) {
    setSaved(false);
    setSettings((s) => ({ ...s, ...patch }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = normalize(settings);
      const resp = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'header_site_settings',
          value: JSON.stringify(payload),
        }),
      });
      if (!resp.ok) throw new Error('Échec de l’enregistrement');
      setBaseline(JSON.stringify(payload));
      setSaved(true);
      window.dispatchEvent(
        new CustomEvent('header-updated', { detail: { settings_site: payload } })
      );
    } catch (e: any) {
      setError(e?.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <AdminModal
      title="Header"
      subtitle="Ces réglages s’appliquent au bandeau d’en-tête de toutes les pages."
      size="md"
      onClose={onClose}
      dirty={dirty}
      saving={saving}
      saved={saved}
      error={error}
      onSave={save}
    >
      <HeaderPreview settings={settings} />

      <AdminSection title="Dimensions" columns={2}>
        <SliderField
          label="Hauteur"
          value={settings.height.value}
          onChange={(v) => update({ height: { ...settings.height, value: v } })}
          min={10}
          max={200}
          unit="%"
          hint="En pourcentage de la hauteur de la fenêtre."
        />
        <SliderField
          label="Largeur"
          value={settings.width.value}
          onChange={(v) => update({ width: { ...settings.width, value: v } })}
          min={10}
          max={200}
          unit="%"
        />
      </AdminSection>

      <AdminSection
        title="Voile"
        description="Assombrit l’image pour que le titre reste lisible."
      >
        <ColorField
          label="Couleur du voile"
          value={settings.overlay.color}
          onChange={(v) => update({ overlay: { ...settings.overlay, color: v } })}
          fallback="#000000"
        />
        <SliderField
          label="Opacité"
          value={Math.round(settings.overlay.opacity * 100)}
          onChange={(v) => update({ overlay: { ...settings.overlay, opacity: v / 100 } })}
          min={0}
          max={100}
          unit="%"
        />
      </AdminSection>

      {settings.overlay.opacity < 0.15 ? (
        <AdminNotice tone="warning">
          Avec un voile aussi léger, le titre risque d’être illisible sur les images
          claires.
        </AdminNotice>
      ) : null}
    </AdminModal>
  );
}

/** Aperçu schématique du bandeau, proportionnel aux réglages. */
function HeaderPreview({ settings }: { settings: HeaderSiteSettings }) {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.previewViewport}>
        <div
          className={styles.previewHeader}
          style={{
            height: `${Math.min(100, settings.height.value)}%`,
            width: `${Math.min(100, settings.width.value)}%`,
          }}
        >
          <span
            className={styles.previewOverlay}
            style={{
              background: settings.overlay.color,
              opacity: settings.overlay.opacity,
            }}
          />
          <span className={styles.previewTitle}>Titre de la page</span>
        </div>
      </div>
      <p className={styles.previewLegend}>
        {settings.height.value}% de hauteur · {settings.width.value}% de largeur ·
        voile {Math.round(settings.overlay.opacity * 100)}%
      </p>
    </div>
  );
}
