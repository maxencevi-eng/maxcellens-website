"use client";

import React from 'react';
import {
  AdminNotice,
  AdminSection,
  ImageField,
  NumberField,
  SegmentedField,
  SelectField,
  SliderField,
  TextField,
  ToggleField,
} from '../../admin';
import ColorControl from './ColorControl';
import {
  columnCount,
  type ButtonData,
  type ColumnsData,
  type EmbedData,
  type HeadingData,
  type ImageBlockData,
  type RichTextData,
  type SeparatorData,
  type SpacerData,
} from './blockDefs';

/** Props communes à tous les éditeurs de bloc. */
export type EditorProps<T> = {
  data: T;
  onChange: (next: T) => void;
};

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Gauche' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Droite' },
];

/** Marges verticales — présentes sur presque tous les blocs. */
function SpacingSection<T extends { marginTop: number; marginBottom: number }>({
  data,
  onChange,
}: EditorProps<T>) {
  return (
    <AdminSection title="Espacement" columns={2}>
      <SliderField
        label="Marge au-dessus"
        value={data.marginTop}
        onChange={(v) => onChange({ ...data, marginTop: v })}
        min={0}
        max={160}
      />
      <SliderField
        label="Marge en dessous"
        value={data.marginBottom}
        onChange={(v) => onChange({ ...data, marginBottom: v })}
        min={0}
        max={160}
      />
    </AdminSection>
  );
}

/* ── Séparateur ───────────────────────────────────────────────────────── */
export function SeparatorEditor({ data, onChange }: EditorProps<SeparatorData>) {
  return (
    <>
      <AdminSection title="Apparence">
        <SegmentedField
          label="Style"
          value={data.style}
          onChange={(v) => onChange({ ...data, style: v as SeparatorData['style'] })}
          options={[
            { value: 'solid', label: 'Trait' },
            { value: 'dashed', label: 'Tirets' },
            { value: 'dotted', label: 'Points' },
            { value: 'gradient', label: 'Dégradé' },
            { value: 'ornament', label: 'Ornement' },
          ]}
        />
        <ColorControl
          label="Couleur"
          value={data.color}
          onChange={(c) => onChange({ ...data, color: c })}
        />
      </AdminSection>

      <AdminSection title="Dimensions" columns={2}>
        <SliderField
          label="Épaisseur"
          value={data.thickness}
          onChange={(v) => onChange({ ...data, thickness: v })}
          min={1}
          max={12}
        />
        <SliderField
          label="Largeur"
          value={data.widthPercent}
          onChange={(v) => onChange({ ...data, widthPercent: v })}
          min={10}
          max={100}
          unit="%"
        />
      </AdminSection>

      <SpacingSection data={data} onChange={onChange} />
    </>
  );
}

/* ── Espace ───────────────────────────────────────────────────────────── */
export function SpacerEditor({ data, onChange }: EditorProps<SpacerData>) {
  return (
    <AdminSection
      title="Hauteur"
      description="Réglable séparément pour le bureau et le mobile."
      columns={2}
    >
      <SliderField
        label="Bureau"
        value={data.heightDesktop}
        onChange={(v) => onChange({ ...data, heightDesktop: v })}
        min={0}
        max={320}
      />
      <SliderField
        label="Mobile"
        value={data.heightMobile}
        onChange={(v) => onChange({ ...data, heightMobile: v })}
        min={0}
        max={200}
      />
    </AdminSection>
  );
}

/* ── Bouton ───────────────────────────────────────────────────────────── */
export function ButtonEditor({
  data,
  onChange,
  pageOptions,
}: EditorProps<ButtonData> & { pageOptions?: { value: string; label: string }[] }) {
  const isKnownPage = (pageOptions || []).some((o) => o.value === data.href);

  return (
    <>
      <AdminSection title="Contenu">
        <TextField
          label="Libellé"
          value={data.label}
          onChange={(v) => onChange({ ...data, label: v })}
          placeholder="En savoir plus"
        />
        {pageOptions && pageOptions.length ? (
          <SelectField
            label="Page du site"
            value={isKnownPage ? data.href : ''}
            onChange={(v) => onChange({ ...data, href: v })}
            options={pageOptions}
            placeholder="— Lien personnalisé —"
            hint="Choisissez une page, ou saisissez une adresse ci-dessous."
          />
        ) : null}
        <TextField
          label="Adresse du lien"
          value={data.href}
          onChange={(v) => onChange({ ...data, href: v })}
          placeholder="/contact ou https://…"
          mono
        />
        <ToggleField
          label="Ouvrir dans un nouvel onglet"
          checked={data.newTab}
          onChange={(v) => onChange({ ...data, newTab: v })}
        />
      </AdminSection>

      <AdminSection title="Apparence" columns={2}>
        <SegmentedField
          label="Style"
          value={data.variant}
          onChange={(v) => onChange({ ...data, variant: v as '1' | '2' })}
          options={[
            { value: '1', label: 'Principal' },
            { value: '2', label: 'Secondaire' },
          ]}
          hint="Défini dans Style du site > Boutons."
        />
        <SegmentedField
          label="Taille"
          value={data.size}
          onChange={(v) => onChange({ ...data, size: v as ButtonData['size'] })}
          options={[
            { value: 'sm', label: 'Petit' },
            { value: 'md', label: 'Moyen' },
            { value: 'lg', label: 'Grand' },
          ]}
        />
        <SegmentedField
          label="Alignement"
          value={data.align}
          onChange={(v) => onChange({ ...data, align: v as ButtonData['align'] })}
          options={ALIGN_OPTIONS}
        />
        <ToggleField
          label="Pleine largeur sur mobile"
          checked={data.fullWidthMobile}
          onChange={(v) => onChange({ ...data, fullWidthMobile: v })}
          hint="Cible tactile plus confortable sur petit écran."
        />
      </AdminSection>

      <SpacingSection data={data} onChange={onChange} />
    </>
  );
}

/* ── Titre ────────────────────────────────────────────────────────────── */
export function HeadingEditor({ data, onChange }: EditorProps<HeadingData>) {
  return (
    <>
      <AdminSection title="Contenu">
        <TextField
          label="Sur-titre"
          value={data.eyebrow}
          onChange={(v) => onChange({ ...data, eyebrow: v })}
          placeholder="Optionnel"
        />
        <TextField
          label="Titre"
          value={data.text}
          onChange={(v) => onChange({ ...data, text: v })}
        />
      </AdminSection>

      <AdminSection title="Apparence" columns={2}>
        <SelectField
          label="Niveau"
          value={data.level}
          onChange={(v) => onChange({ ...data, level: v as HeadingData['level'] })}
          options={[
            { value: 'h1', label: 'Titre 1' },
            { value: 'h2', label: 'Titre 2' },
            { value: 'h3', label: 'Titre 3' },
            { value: 'h4', label: 'Titre 4' },
            { value: 'h5', label: 'Titre 5' },
            { value: 'p', label: 'Paragraphe' },
          ]}
          hint="La police vient du centre de style."
        />
        <SegmentedField
          label="Alignement"
          value={data.align}
          onChange={(v) => onChange({ ...data, align: v as HeadingData['align'] })}
          options={ALIGN_OPTIONS}
        />
        <NumberField
          label="Taille personnalisée"
          value={data.fontSize}
          onChange={(v) => onChange({ ...data, fontSize: v })}
          min={0}
          max={200}
          unit="px"
          hint="0 = taille héritée du centre de style."
        />
        <div>
          <ColorControl
            label="Couleur"
            value={data.color}
            onChange={(c) => onChange({ ...data, color: c })}
          />
        </div>
      </AdminSection>

      <SpacingSection data={data} onChange={onChange} />
    </>
  );
}

/* ── Texte riche ──────────────────────────────────────────────────────── */
export function RichTextEditor({ data, onChange }: EditorProps<RichTextData>) {
  return (
    <>
      <AdminSection
        title="Contenu"
        description="Balises autorisées : titres, paragraphes, listes, liens, gras, italique."
      >
        <TextField
          label="HTML"
          value={data.html}
          onChange={(v) => onChange({ ...data, html: v })}
          multiline={10}
          mono
        />
      </AdminSection>

      <AdminSection title="Mise en forme" columns={2}>
        <SegmentedField
          label="Alignement"
          value={data.align}
          onChange={(v) => onChange({ ...data, align: v as RichTextData['align'] })}
          options={ALIGN_OPTIONS}
        />
        <NumberField
          label="Largeur maximale"
          value={data.maxWidth}
          onChange={(v) => onChange({ ...data, maxWidth: v })}
          min={0}
          max={1400}
          unit="px"
          hint="0 = largeur de la zone de contenu."
        />
      </AdminSection>

      <SpacingSection data={data} onChange={onChange} />
    </>
  );
}

/* ── Image ────────────────────────────────────────────────────────────── */
export function ImageEditor({ data, onChange }: EditorProps<ImageBlockData>) {
  return (
    <>
      <AdminSection title="Image">
        <ImageField
          value={data.image}
          onChange={(v) => onChange({ ...data, image: v })}
          folder="pages/images"
          page="page"
        />
        <TextField
          label="Texte alternatif"
          value={data.alt}
          onChange={(v) => onChange({ ...data, alt: v })}
          hint="Décrit l’image pour les lecteurs d’écran et le référencement."
        />
        <TextField
          label="Légende"
          value={data.caption}
          onChange={(v) => onChange({ ...data, caption: v })}
          placeholder="Optionnel"
        />
      </AdminSection>

      <AdminSection title="Affichage" columns={2}>
        <SelectField
          label="Format"
          value={data.ratio}
          onChange={(v) => onChange({ ...data, ratio: v as ImageBlockData['ratio'] })}
          options={[
            { value: 'auto', label: 'Proportions d’origine' },
            { value: '21:9', label: '21:9 — panoramique' },
            { value: '16:9', label: '16:9' },
            { value: '4:3', label: '4:3' },
            { value: '3:2', label: '3:2' },
            { value: '1:1', label: '1:1 — carré' },
            { value: '4:5', label: '4:5 — portrait' },
          ]}
        />
        <SliderField
          label="Arrondi des coins"
          value={data.radius}
          onChange={(v) => onChange({ ...data, radius: v })}
          min={0}
          max={48}
        />
      </AdminSection>

      <SpacingSection data={data} onChange={onChange} />
    </>
  );
}

/* ── Colonnes ─────────────────────────────────────────────────────────── */
export function ColumnsEditor({
  data,
  onChange,
  children,
}: EditorProps<ColumnsData> & { children?: React.ReactNode }) {
  /** Change la disposition en préservant le contenu déjà saisi. */
  function setLayout(layout: ColumnsData['layout']) {
    const count = columnCount(layout);
    const columns = Array.from({ length: count }, (_, i) => data.columns[i] || []);
    // Le contenu des colonnes supprimées est fusionné dans la dernière
    // colonne conservée plutôt que perdu silencieusement.
    if (data.columns.length > count) {
      const overflow = data.columns.slice(count).flat();
      if (overflow.length) columns[count - 1] = [...columns[count - 1], ...overflow];
    }
    onChange({ ...data, layout, columns });
  }

  return (
    <>
      <AdminSection title="Disposition">
        <SegmentedField
          label="Colonnes"
          value={data.layout}
          onChange={(v) => setLayout(v as ColumnsData['layout'])}
          options={[
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: 'wide-left', label: 'Large / étroite' },
            { value: 'wide-right', label: 'Étroite / large' },
          ]}
          hint="Sur mobile, les colonnes s’empilent automatiquement."
        />
        <SliderField
          label="Espace entre colonnes"
          value={data.gap}
          onChange={(v) => onChange({ ...data, gap: v })}
          min={0}
          max={80}
        />
        <SegmentedField
          label="Alignement vertical"
          value={data.verticalAlign}
          onChange={(v) => onChange({ ...data, verticalAlign: v as ColumnsData['verticalAlign'] })}
          options={[
            { value: 'start', label: 'Haut' },
            { value: 'center', label: 'Milieu' },
            { value: 'end', label: 'Bas' },
          ]}
        />
      </AdminSection>

      {children}

      <SpacingSection data={data} onChange={onChange} />
    </>
  );
}

/* ── Intégration externe ──────────────────────────────────────────────── */
export function EmbedEditor({ data, onChange }: EditorProps<EmbedData>) {
  return (
    <>
      <AdminNotice tone="warning">
        Le code est assaini à l’enregistrement : seules les intégrations de
        confiance (lecteurs vidéo, cartes, formulaires) sont conservées.
      </AdminNotice>

      <AdminSection title="Code d’intégration">
        <TextField
          label="HTML"
          value={data.html}
          onChange={(v) => onChange({ ...data, html: v })}
          multiline={8}
          mono
          placeholder='<iframe src="…"></iframe>'
        />
        <NumberField
          label="Rapport hauteur / largeur"
          value={data.ratioPercent}
          onChange={(v) => onChange({ ...data, ratioPercent: v })}
          min={0}
          max={200}
          unit="%"
          hint="56.25 = 16:9. 0 = hauteur naturelle du contenu."
        />
      </AdminSection>

      <SpacingSection data={data} onChange={onChange} />
    </>
  );
}
