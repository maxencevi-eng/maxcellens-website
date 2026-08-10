"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import {
  AdminButton,
  AdminCard,
  AdminModal,
  AdminNotice,
  AdminSection,
  ColorField,
  SegmentedField,
  SelectField,
  SliderField,
  TextField,
  ToggleField,
} from '../admin';
import { useSiteStyle } from './SiteStyleProvider';
import type {
  AdminUiSettings,
  BackgroundStyle,
  SiteStyle,
  TypographyKey,
} from './SiteStyleProvider';
import styles from './SiteStyle.module.css';

type Tab = 'colors' | 'buttons' | 'typography' | 'background' | 'admin';

const TYPO_ROWS: { key: TypographyKey; label: string; placeholder: string; defaultWeight: number }[] = [
  { key: 'h1', label: 'Titre 1', placeholder: '32px', defaultWeight: 800 },
  { key: 'h2', label: 'Titre 2', placeholder: '28px', defaultWeight: 600 },
  { key: 'h3', label: 'Titre 3', placeholder: '22px', defaultWeight: 600 },
  { key: 'h4', label: 'Titre 4', placeholder: '18px', defaultWeight: 600 },
  { key: 'h5', label: 'Titre 5', placeholder: '16px', defaultWeight: 600 },
  { key: 'p', label: 'Paragraphe', placeholder: '16px', defaultWeight: 400 },
];

const SYSTEM_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';

const BACKGROUND_PRESETS: { value: BackgroundStyle; label: string; desc: string }[] = [
  { value: 'none', label: 'Aucun', desc: 'Fond uni, sans texture' },
  { value: 'grain', label: 'Grain', desc: 'Texture granuleuse, effet argentique' },
  { value: 'dots', label: 'Points', desc: 'Grille de micro-points' },
  { value: 'lines', label: 'Lignes', desc: 'Hachures diagonales discrètes' },
  { value: 'custom', label: 'Image', desc: 'Votre propre texture ou motif' },
];

/**
 * Centre de style du site.
 *
 * Ajouts par rapport à la version précédente :
 *  · onglet « Interface admin » — l'accent de l'admin dérive des boutons du
 *    site, et la densité des contrôles est réglable ;
 *  · contrôle de contraste WCAG sur chaque paire fond / texte ;
 *  · l'aperçu en direct est temporisé (l'ancien réécrivait les variables CSS
 *    à chaque frappe clavier) ;
 *  · annuler restaure l'état d'avant l'ouverture.
 */
export default function SiteStyleEditor({ onClose }: { onClose: () => void }) {
  const { style, setStyle, saveStyle } = useSiteStyle();
  const [tab, setTab] = useState<Tab>('colors');
  const [local, setLocal] = useState<SiteStyle>(() => style || {});
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(style || {}));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const fontInputRef = useRef<HTMLInputElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  /** Passe à true à la première modification de l'utilisateur. */
  const touched = useRef(false);

  /**
   * Synchronisation avec le provider.
   *
   * `SiteStyleProvider` charge le style de façon asynchrone : au montage il
   * vaut encore `{}`. Capturer la référence de comparaison une seule fois à
   * l'initialisation la figeait donc sur `{}`, et la modale se croyait
   * modifiée en permanence — le garde-fou de fermeture se déclenchait même
   * juste après un enregistrement réussi.
   *
   * On suit donc le provider tant que l'utilisateur n'a rien saisi.
   */
  useEffect(() => {
    if (touched.current) return;
    setLocal(style || {});
    setBaseline(JSON.stringify(style || {}));
  }, [style]);

  /**
   * Aperçu en direct, temporisé.
   * L'ancienne version appliquait le style dans un `useEffect([local])` sans
   * délai : chaque caractère saisi déclenchait une réécriture complète des
   * variables CSS et des règles @font-face.
   */
  useEffect(() => {
    if (!touched.current) return;
    const t = setTimeout(() => setStyle(local), 90);
    return () => clearTimeout(t);
  }, [local, setStyle]);

  const dirty = JSON.stringify(local) !== baseline;

  /** Marque le formulaire comme saisi : le provider ne l'écrasera plus. */
  function markTouched() {
    touched.current = true;
    setSaved(false);
  }

  function updateColors(next: Record<string, any>) {
    markTouched();
    setLocal((s) => ({ ...s, colors: { ...(s.colors || {}), ...next } }));
  }

  function updateTypography(key: TypographyKey, next: Record<string, any>) {
    markTouched();
    setLocal((s) => ({
      ...s,
      typography: {
        ...(s.typography || {}),
        [key]: { ...(s.typography?.[key] || {}), ...next },
      },
    }));
  }

  function updateBackground(next: Record<string, any>) {
    markTouched();
    setLocal((s) => ({ ...s, background: { ...(s.background || {}), ...next } }));
  }

  function updateAdmin(next: Partial<AdminUiSettings>) {
    markTouched();
    setLocal((s) => ({ ...s, admin: { ...(s.admin || {}), ...next } }));
  }

  async function handleFontUpload(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const resp = await fetch('/api/admin/upload-font', { method: 'POST', body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Échec de l’import');
      const url = json?.publicUrl || json?.url;
      if (!url) throw new Error('Réponse sans URL');
      const name = file.name.replace(/\.[^.]+$/, '') || `police-${Date.now()}`;
      touched.current = true;
      setLocal((s) => ({ ...s, fonts: [...(s.fonts || []), { name, url }] }));
      setMessage(`Police « ${name} » importée.`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleBgUpload(file: File) {
    setUploadingBg(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('page', 'site');
      fd.append('kind', 'image');
      fd.append('folder', 'site/backgrounds');
      const resp = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Échec de l’import');
      if (!json?.url) throw new Error('Réponse sans URL');
      updateBackground({ imageUrl: json.url, style: 'custom' });
      setMessage('Image de fond importée.');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setUploadingBg(false);
    }
  }

  function removeFont(index: number) {
    touched.current = true;
    setLocal((s) => ({ ...s, fonts: (s.fonts || []).filter((_, i) => i !== index) }));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      setStyle(local);
      await saveStyle(local);
      // Nouvelle référence de comparaison : sans cela la modale se croyait
      // encore modifiée et redemandait confirmation à la fermeture.
      setBaseline(JSON.stringify(local));
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  }

  /** Annuler : on rend au site son apparence d'avant l'ouverture. */
  function handleClose() {
    if (dirty) {
      try { setStyle(JSON.parse(baseline)); } catch (_) {}
    }
    onClose();
  }

  const fontOptions = useMemo(
    () => [
      { value: '', label: '(hérité)' },
      { value: SYSTEM_FONT, label: 'Police système' },
      ...(local.fonts || []).map((f) => ({ value: f.name, label: f.name })),
    ],
    [local.fonts]
  );

  const c = local.colors || {};
  const bg = local.colors?.bgColor || '#ffffff';
  const blockBg = local.colors?.blockBgColor || '#fafaf9';

  return (
    <AdminModal
      title="Style du site"
      subtitle="Couleurs, boutons, typographies, fond et interface d’administration."
      size="lg"
      onClose={handleClose}
      tabs={[
        { id: 'colors', label: 'Couleurs' },
        { id: 'buttons', label: 'Boutons' },
        { id: 'typography', label: 'Typographie', badge: (local.fonts || []).length || undefined },
        { id: 'background', label: 'Fond' },
        { id: 'admin', label: 'Interface admin' },
      ]}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
      dirty={dirty}
      saving={saving}
      saved={saved}
      error={error}
      onSave={onSave}
    >
      {message ? <AdminNotice tone="success">{message}</AdminNotice> : null}

      {/* ── Couleurs ─────────────────────────────────────────────────── */}
      {tab === 'colors' && (
        <>
          <AdminSection
            title="Surfaces"
            description="Le contraste est mesuré face à la couleur de texte."
            columns={2}
          >
            <ColorField
              label="Fond de la page"
              value={c.bgColor}
              onChange={(v) => updateColors({ bgColor: v })}
              fallback="#ffffff"
              contrastAgainst={c.text || '#111111'}
            />
            <ColorField
              label="Fond des blocs"
              value={c.blockBgColor}
              onChange={(v) => updateColors({ blockBgColor: v })}
              fallback="#fafaf9"
              contrastAgainst={c.text || '#111111'}
            />
          </AdminSection>

          <AdminSection title="Texte et accents" columns={2}>
            <ColorField
              label="Couleur du texte"
              value={c.text}
              onChange={(v) => updateColors({ text: v })}
              fallback="#111111"
              contrastAgainst={blockBg}
            />
            <ColorField
              label="Couleur primaire"
              value={c.primary}
              onChange={(v) => updateColors({ primary: v })}
              fallback="#0070f3"
              contrastAgainst={bg}
            />
            <ColorField
              label="Couleur secondaire"
              value={c.secondary}
              onChange={(v) => updateColors({ secondary: v })}
              fallback="#111111"
              contrastAgainst={bg}
            />
            <ColorField
              label="Couleur d’accent"
              value={c.accent}
              onChange={(v) => updateColors({ accent: v })}
              fallback="#ff4081"
              contrastAgainst={bg}
            />
          </AdminSection>

          <AdminSection title="Liens hypertextes" columns={3}>
            <ColorField
              label="Par défaut"
              value={c.link}
              onChange={(v) => updateColors({ link: v })}
              fallback="#0070f3"
              contrastAgainst={blockBg}
            />
            <ColorField
              label="Au survol"
              value={c.linkHover}
              onChange={(v) => updateColors({ linkHover: v })}
              fallback="#005bb5"
              contrastAgainst={blockBg}
            />
            <ColorField
              label="Au clic"
              value={c.linkActive}
              onChange={(v) => updateColors({ linkActive: v })}
              fallback="#004080"
              contrastAgainst={blockBg}
            />
          </AdminSection>
        </>
      )}

      {/* ── Boutons ──────────────────────────────────────────────────── */}
      {tab === 'buttons' && (
        <>
          <AdminNotice>
            Ces deux styles sont utilisés par tous les boutons du site (CTA, liens
            principaux). Le style 1 sert aussi d’accent à l’interface d’administration.
          </AdminNotice>

          <AdminSection title="Style 1 — bouton principal" columns={2}>
            <ColorField
              label="Fond"
              value={c.button1?.bg}
              onChange={(v) => updateColors({ button1: { ...(c.button1 || {}), bg: v } })}
              fallback="#213431"
              contrastAgainst={c.button1?.color || '#ffffff'}
            />
            <ColorField
              label="Texte"
              value={c.button1?.color}
              onChange={(v) => updateColors({ button1: { ...(c.button1 || {}), color: v } })}
              fallback="#ffffff"
              contrastAgainst={c.button1?.bg || '#213431'}
            />
          </AdminSection>

          <AdminSection title="Style 2 — bouton secondaire" columns={2}>
            <ColorField
              label="Fond"
              value={c.button2?.bg}
              onChange={(v) => updateColors({ button2: { ...(c.button2 || {}), bg: v } })}
              fallback="#ffffff"
              contrastAgainst={c.button2?.color || '#213431'}
            />
            <ColorField
              label="Texte"
              value={c.button2?.color}
              onChange={(v) => updateColors({ button2: { ...(c.button2 || {}), color: v } })}
              fallback="#213431"
              contrastAgainst={c.button2?.bg || '#ffffff'}
            />
          </AdminSection>

          <AdminSection title="Aperçu">
            <div className={styles.buttonPreview}>
              <button type="button" className="btn-site-1">Bouton principal</button>
              <button type="button" className="btn-site-2">Bouton secondaire</button>
            </div>
          </AdminSection>
        </>
      )}

      {/* ── Typographie ──────────────────────────────────────────────── */}
      {tab === 'typography' && (
        <>
          <AdminSection
            title="Polices importées"
            description="Formats acceptés : .woff2, .woff, .ttf, .otf."
            actions={
              <AdminButton
                size="sm"
                variant="secondary"
                loading={uploading}
                leadingIcon={<Upload size={14} aria-hidden="true" />}
                onClick={() => fontInputRef.current?.click()}
              >
                Importer
              </AdminButton>
            }
          >
            <input
              ref={fontInputRef}
              type="file"
              accept=".woff,.woff2,.ttf,.otf"
              className={styles.hiddenInput}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFontUpload(f);
                e.target.value = '';
              }}
            />
            {(local.fonts || []).length === 0 ? (
              <AdminNotice>
                Aucune police importée. Les titres utilisent la police système.
              </AdminNotice>
            ) : (
              <ul className={styles.fontList}>
                {(local.fonts || []).map((f, i) => (
                  <li key={`${f.name}-${i}`} className={styles.fontItem}>
                    <span className={styles.fontSample} style={{ fontFamily: `'${f.name}'` }}>
                      {f.name}
                    </span>
                    <AdminButton
                      size="sm"
                      variant="dangerGhost"
                      iconOnly
                      aria-label={`Retirer la police ${f.name}`}
                      onClick={() => removeFont(i)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </AdminButton>
                  </li>
                ))}
              </ul>
            )}
          </AdminSection>

          {TYPO_ROWS.map((row) => (
            <AdminSection key={row.key} title={row.label} columns={3}>
              <SelectField
                label="Police"
                value={local.typography?.[row.key]?.family || ''}
                onChange={(v) => updateTypography(row.key, { family: v })}
                options={fontOptions}
              />
              <TextField
                label="Taille"
                value={local.typography?.[row.key]?.size || ''}
                onChange={(v) => updateTypography(row.key, { size: v })}
                placeholder={row.placeholder}
                hint="px, rem ou clamp()"
              />
              <TextField
                label="Graisse"
                value={String(local.typography?.[row.key]?.weight ?? row.defaultWeight)}
                onChange={(v) => updateTypography(row.key, { weight: v })}
                placeholder={String(row.defaultWeight)}
              />
            </AdminSection>
          ))}
        </>
      )}

      {/* ── Fond ─────────────────────────────────────────────────────── */}
      {tab === 'background' && (
        <>
          <AdminNotice>
            L’effet se superpose aux couleurs de blocs, comme une texture visible sur
            toute la page.
          </AdminNotice>

          <AdminSection title="Texture">
            <div className={styles.presetGrid}>
              {BACKGROUND_PRESETS.map((p) => {
                const active = (local.background?.style || 'none') === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    className={`${styles.preset} ${active ? styles.presetActive : ''}`}
                    onClick={() => updateBackground({ style: p.value })}
                    aria-pressed={active}
                  >
                    <span className={styles.presetLabel}>{p.label}</span>
                    <span className={styles.presetDesc}>{p.desc}</span>
                  </button>
                );
              })}
            </div>
          </AdminSection>

          {(local.background?.style || 'none') !== 'none' ? (
            <AdminSection title="Intensité">
              <SliderField
                label="Opacité de l’effet"
                value={Math.round((local.background?.opacity ?? 0.08) * 100)}
                onChange={(v) => updateBackground({ opacity: v / 100 })}
                min={0}
                max={40}
                unit="%"
              />
            </AdminSection>
          ) : null}

          {local.background?.style === 'custom' ? (
            <AdminSection
              title="Image personnalisée"
              actions={
                <AdminButton
                  size="sm"
                  variant="secondary"
                  loading={uploadingBg}
                  leadingIcon={<Upload size={14} aria-hidden="true" />}
                  onClick={() => bgInputRef.current?.click()}
                >
                  Importer
                </AdminButton>
              }
            >
              <input
                ref={bgInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleBgUpload(f);
                  e.target.value = '';
                }}
              />
              {local.background?.imageUrl ? (
                <AdminCard
                  actions={
                    <AdminButton
                      size="sm"
                      variant="dangerGhost"
                      leadingIcon={<Trash2 size={14} aria-hidden="true" />}
                      onClick={() => updateBackground({ imageUrl: '' })}
                    >
                      Retirer
                    </AdminButton>
                  }
                >
                  <img
                    src={local.background.imageUrl}
                    alt=""
                    className={styles.bgPreview}
                  />
                </AdminCard>
              ) : (
                <AdminNotice tone="warning">
                  Aucune image importée — la texture personnalisée ne s’affichera pas.
                </AdminNotice>
              )}

              <SegmentedField
                label="Mode d’affichage"
                value={local.background?.imageMode || 'repeat'}
                onChange={(v) => updateBackground({ imageMode: v })}
                options={[
                  { value: 'repeat', label: 'Motif répété' },
                  { value: 'fixed', label: 'Image fixe' },
                ]}
              />
            </AdminSection>
          ) : null}
        </>
      )}

      {/* ── Interface admin ──────────────────────────────────────────── */}
      {tab === 'admin' && (
        <>
          <AdminNotice>
            L’espace d’administration reprend par défaut la couleur du bouton principal
            du site. Vous pouvez la découpler ici sans toucher au site public.
          </AdminNotice>

          <AdminSection title="Accent">
            <ToggleField
              label="Suivre la couleur des boutons du site"
              checked={local.admin?.followSiteAccent !== false}
              onChange={(v) => updateAdmin({ followSiteAccent: v })}
              hint="Décoché, l’admin utilise sa propre couleur d’accent."
            />
            {local.admin?.followSiteAccent === false ? (
              <ColorField
                label="Accent de l’interface admin"
                value={local.admin?.accent}
                onChange={(v) => updateAdmin({ accent: v })}
                fallback="#213431"
                contrastAgainst={local.admin?.accentInk || '#ffffff'}
              />
            ) : null}
            {local.admin?.followSiteAccent === false ? (
              <ColorField
                label="Texte sur l’accent"
                value={local.admin?.accentInk}
                onChange={(v) => updateAdmin({ accentInk: v })}
                fallback="#ffffff"
                contrastAgainst={local.admin?.accent || '#213431'}
              />
            ) : null}
          </AdminSection>

          <AdminSection title="Densité">
            <SegmentedField
              label="Taille des contrôles"
              value={local.admin?.density || 'comfortable'}
              onChange={(v) => updateAdmin({ density: v as AdminUiSettings['density'] })}
              options={[
                { value: 'comfortable', label: 'Confort' },
                { value: 'compact', label: 'Compact' },
              ]}
              hint="Compact réduit la hauteur des champs et des boutons d’environ 15 %."
            />
          </AdminSection>
        </>
      )}
    </AdminModal>
  );
}
