"use client";

import React, { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import {
  AdminModal,
  AdminNotice,
  AdminSection,
  NumberField,
  SliderField,
} from '../admin';
import {
  applyLayoutVars,
  DEFAULT_LAYOUT,
  normalizeLayout,
  PAGE_LAYOUT_UPDATED,
  type LayoutSection,
  type PageLayout,
} from './pageLayout';
import styles from './PageLayoutModal.module.css';

type Device = 'desktop' | 'mobile';

/**
 * Dimensions & mise en page.
 *
 * Corrections apportées à la version précédente :
 *  · « Espace entre sections » n'avait aucun effet (variables CSS écrites mais
 *    jamais consommées) — désormais câblé sur `.page-blocks`.
 *  · « Marge verticale » était enregistrée en base sans champ ni variable —
 *    désormais exposée et appliquée à `.content-inner`.
 *  · Les réglages ne s'appliquaient qu'à l'enregistrement — l'aperçu est
 *    maintenant instantané, avec retour à l'état initial si on annule.
 */
export default function PageLayoutModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [device, setDevice] = useState<Device>('desktop');
  const [layout, setLayout] = useState<PageLayout>(DEFAULT_LAYOUT);
  const [baseline, setBaseline] = useState<string>(JSON.stringify(DEFAULT_LAYOUT));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/page-layout')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        const next = normalizeLayout(data);
        setLayout(next);
        setBaseline(JSON.stringify(next));
      })
      .catch(() => { if (mounted) setError('Chargement impossible'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  /** Aperçu en direct : on écrit les variables sans persister. */
  function update(key: keyof LayoutSection, value: number) {
    setSaved(false);
    setLayout((prev) => {
      const next = { ...prev, [device]: { ...prev[device], [key]: value } };
      applyLayoutVars(next);
      return next;
    });
  }

  const dirty = JSON.stringify(layout) !== baseline;

  /** Annuler doit rendre la page à son état d'avant l'ouverture. */
  function handleClose() {
    if (dirty) {
      try { applyLayoutVars(JSON.parse(baseline)); } catch (_) {}
    }
    onClose();
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const resp = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'page_layout', value: JSON.stringify(layout) }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error((j as any)?.error || 'Échec de l’enregistrement');
      }
      applyLayoutVars(layout);
      setBaseline(JSON.stringify(layout));
      setSaved(true);
      try {
        window.dispatchEvent(new CustomEvent(PAGE_LAYOUT_UPDATED, { detail: layout }));
      } catch (_) {}
      onSaved?.();
    } catch (e: any) {
      setError(e?.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  }

  const s = layout[device];
  const isDesktop = device === 'desktop';

  return (
    <AdminModal
      title="Dimensions & mise en page"
      subtitle="Largeurs, marges et espacements du site. L’aperçu est instantané."
      size="lg"
      onClose={handleClose}
      tabs={[
        { id: 'desktop', label: 'Bureau', icon: <Monitor size={14} aria-hidden="true" /> },
        { id: 'mobile', label: 'Mobile', icon: <Smartphone size={14} aria-hidden="true" /> },
      ]}
      activeTab={device}
      onTabChange={(id) => setDevice(id as Device)}
      dirty={dirty}
      saving={saving}
      saved={saved}
      error={error}
      onSave={save}
    >
      {loading ? (
        <AdminNotice>Chargement des réglages…</AdminNotice>
      ) : (
        <>
          <LayoutPreview section={s} device={device} />

          <AdminSection
            title="Largeurs"
            description="Le corps contient toute la page ; la zone contenu contient les blocs et le texte."
            columns={2}
          >
            <NumberField
              label="Largeur max. du corps de la page"
              value={s.containerMaxWidth}
              onChange={(v) => update('containerMaxWidth', v)}
              min={isDesktop ? 800 : 280}
              max={isDesktop ? 2000 : 1200}
              unit="px"
            />
            <NumberField
              label="Largeur max. de la zone contenu"
              value={s.contentInnerMaxWidth}
              onChange={(v) => update('contentInnerMaxWidth', v)}
              min={isDesktop ? 560 : 280}
              max={isDesktop ? 2400 : 1400}
              unit="px"
            />
          </AdminSection>

          <AdminSection
            title="Marges"
            description="Marges extérieures du corps de page et marge intérieure appliquée à chaque bloc."
            columns={2}
          >
            <SliderField
              label="Marge horizontale"
              value={s.marginHorizontal}
              onChange={(v) => update('marginHorizontal', v)}
              min={0}
              max={isDesktop ? 80 : 48}
            />
            <SliderField
              label="Marge verticale"
              value={s.marginVertical}
              onChange={(v) => update('marginVertical', v)}
              min={0}
              max={isDesktop ? 120 : 80}
              hint="Espace au-dessus et en dessous de la zone contenu."
            />
            <SliderField
              label="Marge intérieure des blocs"
              value={s.blockInnerPadding}
              onChange={(v) => update('blockInnerPadding', v)}
              min={0}
              max={isDesktop ? 120 : 80}
            />
            <SliderField
              label="Espace entre sections"
              value={s.sectionGap}
              onChange={(v) => update('sectionGap', v)}
              min={0}
              max={isDesktop ? 120 : 80}
              hint="Écart vertical ajouté entre deux blocs successifs."
            />
          </AdminSection>

          <AdminSection title="Hauteur" columns={2}>
            <NumberField
              label="Hauteur min. de la zone contenu"
              value={s.contentInnerMinHeight}
              onChange={(v) => update('contentInnerMinHeight', v)}
              min={0}
              max={isDesktop ? 2000 : 1200}
              unit="px"
              hint="0 = aucune hauteur minimale."
            />
          </AdminSection>
        </>
      )}
    </AdminModal>
  );
}

/** Schéma proportionnel des réglages en cours — repère visuel, pas une maquette. */
function LayoutPreview({ section, device }: { section: LayoutSection; device: Device }) {
  const outerWidth = device === 'desktop' ? 1200 : 420;
  const scale = 100 / outerWidth;
  const bodyPct = Math.min(100, (section.containerMaxWidth * scale));
  const contentPct = Math.min(
    bodyPct,
    (Math.min(section.contentInnerMaxWidth, section.containerMaxWidth) * scale)
  );

  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.previewViewport}>
        <div className={styles.previewBody} style={{ width: `${bodyPct}%` }}>
          <div
            className={styles.previewContent}
            style={{
              width: `${(contentPct / bodyPct) * 100}%`,
              paddingTop: Math.min(28, section.marginVertical / 2),
              paddingBottom: Math.min(28, section.marginVertical / 2),
            }}
          >
            <span
              className={styles.previewBlock}
              style={{ padding: Math.min(20, section.blockInnerPadding / 1.5) }}
            >
              Bloc
            </span>
            <span
              className={styles.previewBlock}
              style={{
                padding: Math.min(20, section.blockInnerPadding / 1.5),
                marginTop: Math.min(40, section.sectionGap),
              }}
            >
              Bloc
            </span>
          </div>
        </div>
      </div>
      <p className={styles.previewLegend}>
        Corps {section.containerMaxWidth}px · contenu {section.contentInnerMaxWidth}px ·
        marges {section.marginHorizontal}/{section.marginVertical}px ·
        écart {section.sectionGap}px
      </p>
    </div>
  );
}
