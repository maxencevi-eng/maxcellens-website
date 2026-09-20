"use client";

import React, { useState } from 'react';
import ModalTabs from '../../ui/ModalTabs';
import VideoCardField from './VideoCardField';
import { AdminButton, AdminSection, ImageField, NumberField, SelectField, SliderField, TextField, ToggleField } from '../../admin';
import ColorControl from './ColorControl';
import { EMPTY_IMAGE_CARD, type ImageCard, type ImageCardsData } from './imageCardsDefs';
import type { EditorProps } from './BlockEditors';

type Props = EditorProps<ImageCardsData> & { lateral?: boolean; pageOptions?: { value: string; label: string }[] };

export function ImageCardsEditor({ data, onChange, lateral = false, pageOptions = [] }: Props) {
  const [tab, setTab] = useState('title');
  const set = <K extends keyof ImageCardsData>(key: K, value: ImageCardsData[K]) => onChange({ ...data, [key]: value });
  const updateCard = (index: number, changes: Partial<ImageCard>) => set('cards', data.cards.map((card, i) => i === index ? { ...card, ...changes } : card));
  function moveCard(index: number, direction: number) {
    const cards = [...data.cards];
    const target = index + direction;
    if (target < 0 || target >= cards.length) return;
    [cards[index], cards[target]] = [cards[target], cards[index]];
    set('cards', cards);
  }
  return <>
    <ModalTabs active={tab} onChange={setTab} tabs={[{ id: 'title', label: 'Titres et lien' }, { id: 'cards', label: lateral ? 'Images' : 'Videos' }, { id: 'style', label: 'Style' }, { id: 'spacing', label: 'Espacement' }]} />
    {tab === 'title' && <>
    <AdminSection title="Titres">
      <TextField label="Sur-titre" value={data.eyebrow} onChange={v => set('eyebrow', v)} />
      <TextField label="Titre" value={data.title} onChange={v => set('title', v)} multiline={2} />
      <TextField label="Sous-titre" value={data.subtitle} onChange={v => set('subtitle', v)} multiline={2} />
      <SelectField label="Niveau du titre" value={data.headingLevel} onChange={v => set('headingLevel', v as ImageCardsData['headingLevel'])} options={['h1', 'h2', 'h3', 'h4', 'h5', 'p'].map(value => ({ value, label: value }))} />
      <NumberField label="Taille du titre" value={data.titleSize} onChange={v => set('titleSize', v)} min={12} max={120} unit="px" />
      <SelectField label="Alignement du texte" value={data.titleAlign} onChange={v => set('titleAlign', v as ImageCardsData['titleAlign'])} options={[{ value: 'left', label: 'Gauche' }, { value: 'center', label: 'Centre' }, { value: 'right', label: 'Droite' }]} />
      {lateral && <SelectField label="Emplacement du titre" value={data.titlePosition} onChange={v => set('titlePosition', v as 'left' | 'right')} options={[{ value: 'left', label: 'À gauche des images' }, { value: 'right', label: 'À droite des images' }]} />}
      <ColorControl label="Couleur des textes du bloc" value={data.color} onChange={v => set('color', v)} />
    </AdminSection>
    <AdminSection title="Lien du bloc" description="Facultatif : affiché à côté du titre ou sous le titre latéral.">
      <TextField label="Texte du lien" value={data.ctaLabel} onChange={v => set('ctaLabel', v)} />
      <TextField label="Destination" value={data.ctaHref} onChange={v => set('ctaHref', v)} placeholder="/realisation ou https://…" />
      <ToggleField label="Ouvrir dans un nouvel onglet" checked={data.ctaNewTab} onChange={v => set('ctaNewTab', v)} />
    </AdminSection>
    </>}
    {tab === 'cards' && <AdminSection title="Cartes" description="Ajoutez vos images et leurs liens, puis choisissez leur ordre.">
      {data.cards.map((card, index) => <details key={index} open={data.cards.length === 1 ? true : undefined} style={{ border: '1px solid var(--admin-border, #ddd)', padding: 16, borderRadius: 8, display: 'grid', gap: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Carte {index + 1} - {card.title || "Sans titre"}</summary>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <strong style={{ flex: 1 }}>Carte {index + 1}</strong>
          <AdminButton onClick={() => moveCard(index, -1)} disabled={index === 0}>Monter</AdminButton>
          <AdminButton onClick={() => moveCard(index, 1)} disabled={index === data.cards.length - 1}>Descendre</AdminButton>
          <AdminButton onClick={() => set('cards', data.cards.filter((_, i) => i !== index))}>Supprimer</AdminButton>
        </div>
        {!lateral && <VideoCardField card={card} onChange={patch => updateCard(index, patch)} />}
        <ImageField label={lateral ? "Image" : "Couverture (facultative pour YouTube)"} value={card.image} onChange={image => updateCard(index, { image })} folder="pages/image-cards" page="page" deleteFromStorage={false} />
        <TextField label="Texte alternatif" value={card.alt} onChange={alt => updateCard(index, { alt })} />
        <TextField label="Titre de la carte" value={card.title} onChange={title => updateCard(index, { title })} />
        <TextField label="Sous-titre de la carte" value={card.subtitle} onChange={subtitle => updateCard(index, { subtitle })} />
        {lateral && <><TextField label="Lien de la carte" value={card.href} onChange={href => updateCard(index, { href })} placeholder="/contact ou https://…" />
        {pageOptions.length > 0 && <SelectField label="Choisir une page du site" value={pageOptions.some(p => p.value === card.href) ? card.href : ''} onChange={href => updateCard(index, { href })} options={[{ value: '', label: 'Lien personnalisé ou aucun' }, ...pageOptions]} />}
        <ToggleField label="Ouvrir dans un nouvel onglet" checked={card.newTab} onChange={newTab => updateCard(index, { newTab })} />
        </>}
        <SliderField label="Cadrage horizontal" value={card.focusX} onChange={focusX => updateCard(index, { focusX })} min={0} max={100} unit="%" />
        <SliderField label="Cadrage vertical" value={card.focusY} onChange={focusY => updateCard(index, { focusY })} min={0} max={100} unit="%" />
      </details>)}
      <AdminButton onClick={() => set('cards', [...data.cards, { ...EMPTY_IMAGE_CARD }])}>Ajouter une carte</AdminButton>
    </AdminSection>
    }
    {tab === 'style' && <AdminSection title="Apparence et disposition" columns={2}>
      <NumberField label="Cartes par ligne sur ordinateur" value={data.columns} onChange={v => set('columns', v)} min={1} max={8} />
      <NumberField label="Espace entre les cartes" value={data.gap} onChange={v => set('gap', v)} min={0} max={80} unit="px" />
      <SelectField label="Format des images" value={data.ratio} onChange={v => set('ratio', v)} options={['21:9', '16:9', '4:3', '3:2', '1:1', '4:5'].map(value => ({ value, label: value }))} />
      <NumberField label="Arrondi des cartes" value={data.cardRadius} onChange={v => set('cardRadius', v)} min={0} max={64} unit="px" />
      <NumberField label="Taille des titres des cartes" value={data.cardTitleSize} onChange={v => set('cardTitleSize', v)} min={10} max={48} unit="px" />
      <SliderField label="Intensité du dégradé" value={data.overlayOpacity} onChange={v => set('overlayOpacity', v)} min={0} max={100} unit="%" />
      <ColorControl label="Fond du bloc" value={data.background} onChange={v => set('background', v)} />
      <ColorControl label="Textes des cartes" value={data.cardColor} onChange={v => set('cardColor', v)} />
      <NumberField label="Arrondi supérieur du bloc" value={data.radiusTop} onChange={v => set('radiusTop', v)} min={0} max={100} unit="px" />
      <NumberField label="Arrondi inférieur du bloc" value={data.radiusBottom} onChange={v => set('radiusBottom', v)} min={0} max={100} unit="px" />
    </AdminSection>
    }
    {tab === 'spacing' && <AdminSection title="Espacement" columns={2}>
      <NumberField label="Marge au-dessus" value={data.marginTop} onChange={v => set('marginTop', v)} min={0} max={240} unit="px" />
      <NumberField label="Marge en dessous" value={data.marginBottom} onChange={v => set('marginBottom', v)} min={0} max={240} unit="px" />
      <NumberField label="Espace intérieur supérieur" value={data.paddingTop} onChange={v => set('paddingTop', v)} min={0} max={240} unit="px" />
      <NumberField label="Espace intérieur inférieur" value={data.paddingBottom} onChange={v => set('paddingBottom', v)} min={0} max={240} unit="px" />
      <NumberField label="Marges latérales intérieures" value={data.paddingX} onChange={v => set('paddingX', v)} min={0} max={160} unit="px" />
    </AdminSection>
    }
  </>;
}
export function ServiceImageCardsEditor(props: Props) {
  return <ImageCardsEditor {...props} lateral />;
}
