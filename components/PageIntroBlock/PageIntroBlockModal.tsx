"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import ModalTabs from '../ui/ModalTabs';
import { compressImageClient } from '@/lib/compressImageClient';
import {
  Camera, Video, Film, Play, Aperture, Image, Images,
  Users, User, UserPlus, UserCheck, UserCog,
  Heart, Star, Sparkles, Wand2, Paintbrush, Palette,
  Building2, Home, Landmark, MapPin, Globe,
  Share2, Megaphone, MessageSquare, Mail, Phone,
  LayoutGrid, Layers, Monitor, Smartphone, MonitorPlay,
  Sun, Moon, Sunset, Lightbulb, Zap,
  Award, Trophy, Medal, CheckCircle2, Target, Shield,
  Pencil, Edit3, Scissors, Sliders, Settings,
  ArrowRight, TrendingUp, ChevronRight,
  Clock, Calendar, Timer,
  Eye, Focus, Scan, Lock,
  Plus, Trash2, Upload,
} from 'lucide-react';
import type { PageIntroBlockData, PageIntroFeature, TitleStyleKey, AlignKey } from './pageIntroDefaults';
import { AVAILABLE_ICONS, TITLE_FONT_SIZE_MIN, TITLE_FONT_SIZE_MAX } from './pageIntroDefaults';

const RichTextModal = dynamic(() => import('../RichTextModal/RichTextModal'), { ssr: false });

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Camera, Video, Film, Play, Aperture, Image, Images,
  Users, User, UserPlus, UserCheck, UserCog,
  Heart, Star, Sparkles, Wand2, Paintbrush, Palette,
  Building2, Home, Landmark, MapPin, Globe,
  Share2, Megaphone, MessageSquare, Mail, Phone,
  LayoutGrid, Layers, Monitor, Smartphone, MonitorPlay,
  Sun, Moon, Sunset, Lightbulb, Zap,
  Award, Trophy, Medal, CheckCircle2, Target, Shield,
  Pencil, Edit3, Scissors, Sliders, Settings,
  ArrowRight, TrendingUp, ChevronRight,
  Clock, Calendar, Timer,
  Eye, Focus, Scan, Lock,
};

function LucideIcon({ name, size = 20, color, strokeWidth = 1.5 }: { name?: string; size?: number; color?: string; strokeWidth?: number }) {
  if (!name) return null;
  const Comp = ICON_MAP[name];
  if (!Comp) return null;
  return <Comp size={size} color={color || 'currentColor'} strokeWidth={strokeWidth} />;
}

const clamp = (n: number) => Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, n));
const getValidStyle = (s: any, def: TitleStyleKey = 'p'): TitleStyleKey =>
  ['p', 'h1', 'h2', 'h3', 'h4', 'h5'].includes(s) ? s : def;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #e6e6e6',
  borderRadius: 6, fontSize: 14, boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' };

const TITLE_STYLE_OPTIONS: { value: TitleStyleKey; label: string }[] = [
  { value: 'p', label: 'Paragraphe' },
  { value: 'h1', label: 'Titre 1' },
  { value: 'h2', label: 'Titre 2' },
  { value: 'h3', label: 'Titre 3' },
  { value: 'h4', label: 'Titre 4' },
  { value: 'h5', label: 'Titre 5' },
];

const ALIGN_OPTIONS: { value: AlignKey; label: string }[] = [
  { value: '', label: 'Par défaut' },
  { value: 'left', label: 'Gauche' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Droite' },
];

function FontSizeInput({ value, onChange }: { value: number | ''; onChange: (v: number | '') => void }) {
  const [raw, setRaw] = useState(value === '' ? '' : String(value));
  useEffect(() => { setRaw(value === '' ? '' : String(value)); }, [value]);
  return (
    <input
      type="number"
      min={TITLE_FONT_SIZE_MIN}
      max={TITLE_FONT_SIZE_MAX}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={(e) => {
        const n = Number(e.target.value);
        const v = e.target.value === '' ? '' : clamp(n);
        onChange(v);
        setRaw(v === '' ? '' : String(v));
      }}
      placeholder="px"
      style={{ width: 64, padding: '8px 10px', border: '1px solid #e6e6e6', borderRadius: 6, fontSize: 14 }}
      title={`Taille (${TITLE_FONT_SIZE_MIN}–${TITLE_FONT_SIZE_MAX} px)`}
    />
  );
}

function TitleFields({
  label, value, onValue, style, onStyle, fontSize, onFontSize, color, onColor, align, onAlign,
}: {
  label: string; value: string; onValue: (v: string) => void;
  style: TitleStyleKey; onStyle: (v: TitleStyleKey) => void;
  fontSize: number | ''; onFontSize: (v: number | '') => void;
  color: string; onColor: (v: string) => void;
  align: AlignKey; onAlign: (v: AlignKey) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={labelStyle}>{label}</label>
        <input style={inputStyle} value={value} onChange={(e) => onValue(e.target.value)} placeholder={label} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={labelStyle}>Style</label>
          <select style={{ ...inputStyle }} value={style} onChange={(e) => onStyle(e.target.value as TitleStyleKey)}>
            {TITLE_STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Taille (px)</label>
          <FontSizeInput value={fontSize} onChange={onFontSize} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={labelStyle}>Alignement</label>
          <select style={{ ...inputStyle }} value={align} onChange={(e) => onAlign(e.target.value as AlignKey)}>
            {ALIGN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Couleur</label>
          <input type="color" value={color || '#ffffff'} onChange={(e) => onColor(e.target.value)}
            style={{ width: 42, height: 38, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
        </div>
      </div>
    </div>
  );
}

/** Icon picker modal-in-modal */
function IconPicker({ current, onSelect, onClose }: { current?: string; onSelect: (name: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const filtered = AVAILABLE_ICONS.filter(n => n.toLowerCase().includes(search.toLowerCase()));
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 50001,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, width: 380, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 15 }}>Choisir une icône</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <input
          style={{ ...inputStyle }}
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, overflowY: 'auto', maxHeight: 380 }}>
          {filtered.map(name => {
            const Comp = ICON_MAP[name];
            if (!Comp) return null;
            const isActive = name === current;
            return (
              <button
                key={name}
                title={name}
                onClick={() => { onSelect(name); onClose(); }}
                style={{
                  border: isActive ? '2px solid #000' : '1px solid #e6e6e6',
                  background: isActive ? '#f5f5f5' : 'transparent',
                  borderRadius: 8, padding: 10, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Comp size={20} strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Props {
  pageKey: string;
  settingsKey: string;
  initialData: PageIntroBlockData;
  onClose: () => void;
}

export default function PageIntroBlockModal({ pageKey, settingsKey, initialData, onClose }: Props) {
  const [tab, setTab] = useState('contenu');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingHtml, setEditingHtml] = useState(false);

  // Contenu tab
  const [eyebrow, setEyebrow] = useState(initialData.eyebrow ?? '');
  const [eyebrowColor, setEyebrowColor] = useState(initialData.eyebrowColor ?? '');
  const [title, setTitle] = useState(initialData.title ?? '');
  const [titleStyle, setTitleStyle] = useState<TitleStyleKey>(getValidStyle(initialData.titleStyle, 'h2'));
  const [titleFontSize, setTitleFontSize] = useState<number | ''>(initialData.titleFontSize ?? '');
  const [titleColor, setTitleColor] = useState(initialData.titleColor ?? '');
  const [titleAlign, setTitleAlign] = useState<AlignKey>(initialData.titleAlign ?? '');
  const [html, setHtml] = useState(initialData.html ?? '');

  // Features / colonnes
  const [features, setFeatures] = useState<PageIntroFeature[]>(() => {
    const f = initialData.features ?? [];
    if (f.length === 0) return [
      { iconName: 'Camera', iconType: 'lucide', title: '', description: '' },
      { iconName: 'Star', iconType: 'lucide', title: '', description: '' },
      { iconName: 'Sparkles', iconType: 'lucide', title: '', description: '' },
    ];
    return f;
  });
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  const [uploadingIconIndex, setUploadingIconIndex] = useState<number | null>(null);

  // Keywords
  const [keywords, setKeywords] = useState<string[]>(initialData.keywords ?? []);
  const [newKeyword, setNewKeyword] = useState('');
  const [keywordsColor, setKeywordsColor] = useState(initialData.keywordsColor ?? '');
  const [keywordsBorderColor, setKeywordsBorderColor] = useState(initialData.keywordsBorderColor ?? '');
  const [keywordsBackground, setKeywordsBackground] = useState(initialData.keywordsBackground ?? '');

  // Eyebrow extended
  const [eyebrowFontSize, setEyebrowFontSize] = useState<number | ''>(initialData.eyebrowFontSize ?? '');

  // Style tab
  const [backgroundColor, setBackgroundColor] = useState(initialData.backgroundColor ?? '');
  const [borderRadiusTop, setBorderRadiusTop] = useState<number | ''>(initialData.borderRadiusTop ?? '');
  const [borderRadiusBottom, setBorderRadiusBottom] = useState<number | ''>(initialData.borderRadiusBottom ?? '');
  const [paddingTop, setPaddingTop] = useState<number | ''>(initialData.paddingTop ?? '');
  const [paddingBottom, setPaddingBottom] = useState<number | ''>(initialData.paddingBottom ?? '');

  // --- Feature helpers ---
  function updateFeature(index: number, patch: Partial<PageIntroFeature>) {
    setFeatures(prev => prev.map((f, i) => i === index ? { ...f, ...patch } : f));
  }

  function addFeature() {
    setFeatures(prev => [...prev, { iconName: 'Star', iconType: 'lucide', title: '', description: '' }]);
  }

  function removeFeature(index: number) {
    setFeatures(prev => prev.filter((_, i) => i !== index));
  }

  async function uploadIconImage(file: File, index: number) {
    setUploadingIconIndex(index);
    setError(null);
    try {
      const compressed = await compressImageClient(file);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('page', pageKey);
      fd.append('kind', 'image');
      fd.append('folder', `${pageKey}/intro-icons`);
      const old = features[index]?.iconImage?.path;
      if (old) fd.append('old_path', old);
      const resp = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) {
        updateFeature(index, { iconImage: { url: j.url, path: j.path ?? undefined }, iconType: 'image' });
      }
    } catch (e: any) {
      setError(e?.message ?? 'Erreur upload');
    } finally {
      setUploadingIconIndex(null);
    }
  }

  // --- Keywords helpers ---
  function addKeyword() {
    const kw = newKeyword.trim();
    if (kw && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw]);
    }
    setNewKeyword('');
  }

  function removeKeyword(index: number) {
    setKeywords(prev => prev.filter((_, i) => i !== index));
  }

  // --- Save ---
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const d: PageIntroBlockData = {
        eyebrow, eyebrowColor,
        eyebrowFontSize: eyebrowFontSize === '' ? undefined : eyebrowFontSize,
        keywordsColor, keywordsBorderColor, keywordsBackground,
        title, titleStyle,
        titleFontSize: titleFontSize === '' ? undefined : titleFontSize,
        titleColor, titleAlign,
        html,
        features,
        keywords,
        backgroundColor,
        borderRadiusTop: borderRadiusTop === '' ? undefined : borderRadiusTop,
        borderRadiusBottom: borderRadiusBottom === '' ? undefined : borderRadiusBottom,
        paddingTop: paddingTop === '' ? undefined : paddingTop,
        paddingBottom: paddingBottom === '' ? undefined : paddingBottom,
      };
      const resp = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingsKey, value: JSON.stringify(d) }),
      });
      if (!resp.ok) throw new Error('Sauvegarde échouée');
      try {
        window.dispatchEvent(new CustomEvent('site-settings-updated', {
          detail: { key: settingsKey, value: JSON.stringify(d) },
        }));
      } catch (_) {}
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  // --- Render ---
  const TABS = [
    { id: 'contenu', label: 'Contenu' },
    { id: 'colonnes', label: 'Colonnes' },
    { id: 'motscles', label: 'Mots-clés' },
    { id: 'style', label: 'Style' },
  ];

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    zIndex: 50000, padding: '70px 16px 16px', overflowY: 'auto',
  };
  const boxStyle: React.CSSProperties = {
    background: '#fff', color: '#000', padding: 24,
    width: 580, maxWidth: '100%', borderRadius: 10,
    alignSelf: 'flex-start', boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
  };

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <strong style={{ fontSize: 16 }}>Modifier le bloc intro</strong>
            <button type="button" onClick={onClose} aria-label="Fermer"
              style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>

          <ModalTabs tabs={TABS} active={tab} onChange={setTab} />

        {/* ── CONTENU ── */}
        {tab === 'contenu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Eyebrow */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Label eyebrow (ex: ÉVÉNEMENT)</label>
              <input style={inputStyle} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="ÉVÉNEMENT" />
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={labelStyle}>Taille (px)</label>
                  <FontSizeInput value={eyebrowFontSize} onChange={setEyebrowFontSize} />
                </div>
                <div>
                  <label style={labelStyle}>Couleur texte & lignes</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="color" value={eyebrowColor || '#888888'} onChange={(e) => setEyebrowColor(e.target.value)}
                      style={{ width: 42, height: 38, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                    {eyebrowColor && (
                      <button onClick={() => setEyebrowColor('')} style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}>↺</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <TitleFields
              label="Titre principal"
              value={title} onValue={setTitle}
              style={titleStyle} onStyle={setTitleStyle}
              fontSize={titleFontSize} onFontSize={setTitleFontSize}
              color={titleColor} onColor={setTitleColor}
              align={titleAlign} onAlign={setTitleAlign}
            />

            {/* HTML description */}
            <div>
              <label style={labelStyle}>Texte description (HTML riche)</label>
              <div
                dangerouslySetInnerHTML={{ __html: html || '<em style="color:#aaa">Cliquez pour éditer...</em>' }}
                onClick={() => setEditingHtml(true)}
                style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12, minHeight: 80, background: '#fafafa', fontSize: 13, lineHeight: 1.6, cursor: 'pointer' }}
              />
              <button onClick={() => setEditingHtml(true)}
                style={{ marginTop: 6, padding: '6px 14px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                ✏️ Éditer le texte
              </button>
            </div>
          </div>
        )}

        {/* ── COLONNES ── */}
        {tab === 'colonnes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} style={{ border: '1px solid #e6e6e6', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 13 }}>Colonne {i + 1}</strong>
                  {features.length > 1 && (
                    <button onClick={() => removeFeature(i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c00', fontSize: 13 }}>
                      <Trash2 size={15} /> Supprimer
                    </button>
                  )}
                </div>

                {/* Icon selector */}
                <div>
                  <label style={labelStyle}>Icône</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Preview */}
                    <div style={{ width: 44, height: 44, border: '1px solid #e6e6e6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                      {f.iconType === 'image' && f.iconImage?.url ? (
                        <img src={f.iconImage.url} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
                      ) : (
                        <LucideIcon name={f.iconName} size={22} />
                      )}
                    </div>

                    {/* Pick Lucide */}
                    <button onClick={() => setIconPickerIndex(i)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                      Choisir une icône
                    </button>

                    {/* Upload image */}
                    <label style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Upload size={14} />
                      {uploadingIconIndex === i ? 'Upload...' : 'Importer image'}
                      <input type="file" accept="image/*,.svg" hidden onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadIconImage(file, i);
                        e.target.value = '';
                      }} />
                    </label>

                    {/* Remove icon */}
                    {(f.iconName || f.iconImage) && (
                      <button onClick={() => updateFeature(i, { iconName: undefined, iconImage: null })}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fcc', background: '#fff8f8', cursor: 'pointer', fontSize: 13, color: '#c00' }}>
                        Supprimer icône
                      </button>
                    )}

                    {/* Icon color */}
                    {f.iconType !== 'image' && f.iconName && (
                      <div>
                        <label style={{ ...labelStyle, marginBottom: 0, fontSize: 11 }}>Couleur icône</label>
                        <input type="color" value={f.iconColor || '#ffffff'} onChange={(e) => updateFeature(i, { iconColor: e.target.value })}
                          style={{ width: 38, height: 34, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2, display: 'block' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Title */}
                <TitleFields
                  label="Titre de la colonne"
                  value={f.title ?? ''} onValue={(v) => updateFeature(i, { title: v })}
                  style={getValidStyle(f.titleStyle, 'p')} onStyle={(v) => updateFeature(i, { titleStyle: v })}
                  fontSize={f.titleFontSize ?? ''} onFontSize={(v) => updateFeature(i, { titleFontSize: v === '' ? undefined : v })}
                  color={f.titleColor ?? ''} onColor={(v) => updateFeature(i, { titleColor: v })}
                  align={f.titleAlign ?? ''} onAlign={(v) => updateFeature(i, { titleAlign: v })}
                />

                {/* Description */}
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                    value={f.description ?? ''}
                    onChange={(e) => updateFeature(i, { description: e.target.value })}
                    placeholder="Texte de description..."
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <label style={labelStyle}>Style</label>
                      <select style={{ ...inputStyle }} value={f.descriptionStyle ?? 'p'} onChange={(e) => updateFeature(i, { descriptionStyle: e.target.value as TitleStyleKey })}>
                        {TITLE_STYLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Taille (px)</label>
                      <FontSizeInput
                        value={f.descriptionFontSize ?? ''}
                        onChange={(v) => updateFeature(i, { descriptionFontSize: v === '' ? undefined : v })}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Couleur</label>
                      <input type="color" value={f.descriptionColor || '#aaaaaa'}
                        onChange={(e) => updateFeature(i, { descriptionColor: e.target.value })}
                        style={{ width: 42, height: 38, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {features.length < 6 && (
              <button onClick={addFeature}
                style={{ padding: '10px', borderRadius: 8, border: '1px dashed #ccc', background: '#fafafa', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Plus size={15} /> Ajouter une colonne
              </button>
            )}
          </div>
        )}

        {/* ── MOTS-CLÉS ── */}
        {tab === 'motscles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
              Les mots-clés apparaissent sous le bloc intro comme des tags cliquables.
            </p>

            {/* Existing keywords */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {keywords.map((kw, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 14px', borderRadius: 999, border: '1px solid #ddd', background: '#f9f9f9', fontSize: 13 }}>
                  {kw}
                  <button onClick={() => removeKeyword(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', lineHeight: 1, padding: 0, fontSize: 14 }}>
                    ✕
                  </button>
                </div>
              ))}
              {keywords.length === 0 && <em style={{ color: '#aaa', fontSize: 13 }}>Aucun mot-clé</em>}
            </div>

            {/* Add keyword */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
                placeholder="Nouveau mot-clé..."
              />
              <button onClick={addKeyword}
                style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#111', color: '#fff', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Ajouter
              </button>
            </div>

            {/* Reorder hint */}
            {keywords.length > 1 && (
              <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>Les mots-clés s'affichent dans l'ordre ci-dessus.</p>
            )}

            {/* Keyword colors */}
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
              <label style={{ ...labelStyle, marginBottom: 10 }}>Apparence des tags</label>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <label style={labelStyle}>Couleur texte</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="color" value={keywordsColor || '#aaaaaa'} onChange={(e) => setKeywordsColor(e.target.value)}
                      style={{ width: 42, height: 38, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                    {keywordsColor && <button onClick={() => setKeywordsColor('')} style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}>↺</button>}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Couleur bordure</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="color" value={keywordsBorderColor || '#444444'} onChange={(e) => setKeywordsBorderColor(e.target.value)}
                      style={{ width: 42, height: 38, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                    {keywordsBorderColor && <button onClick={() => setKeywordsBorderColor('')} style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}>↺</button>}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Fond du tag</label>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="color" value={keywordsBackground || '#000000'} onChange={(e) => setKeywordsBackground(e.target.value)}
                      style={{ width: 42, height: 38, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                    {keywordsBackground && <button onClick={() => setKeywordsBackground('')} style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer' }}>↺</button>}
                  </div>
                </div>
              </div>
              {/* Preview */}
              <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(keywords.length > 0 ? keywords.slice(0, 3) : ['Exemple']).map((kw, i) => (
                  <span key={i} style={{
                    padding: '4px 12px', borderRadius: 999,
                    border: `1px solid ${keywordsBorderColor || 'rgba(0,0,0,0.2)'}`,
                    color: keywordsColor || '#555',
                    background: keywordsBackground || 'transparent',
                    fontSize: 12,
                  }}>{kw}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STYLE ── */}
        {tab === 'style' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Couleur de fond</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={backgroundColor || '#0f0f12'} onChange={(e) => setBackgroundColor(e.target.value)}
                  style={{ width: 42, height: 38, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                <input style={{ ...inputStyle, flex: 1 }} value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} placeholder="#0f0f12 ou transparent" />
                {backgroundColor && <button onClick={() => setBackgroundColor('')} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Réinitialiser</button>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Arrondi haut (px)</label>
                <input type="number" style={inputStyle} value={borderRadiusTop} onChange={(e) => setBorderRadiusTop(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" min={0} />
              </div>
              <div>
                <label style={labelStyle}>Arrondi bas (px)</label>
                <input type="number" style={inputStyle} value={borderRadiusBottom} onChange={(e) => setBorderRadiusBottom(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" min={0} />
              </div>
              <div>
                <label style={labelStyle}>Padding haut (px)</label>
                <input type="number" style={inputStyle} value={paddingTop} onChange={(e) => setPaddingTop(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Auto" min={0} />
              </div>
              <div>
                <label style={labelStyle}>Padding bas (px)</label>
                <input type="number" style={inputStyle} value={paddingBottom} onChange={(e) => setPaddingBottom(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Auto" min={0} />
              </div>
            </div>
          </div>
        )}

          {/* Footer — save/cancel always visible at bottom of box */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            {error && <span style={{ color: 'red', fontSize: 13, flex: 1, alignSelf: 'center' }}>{error}</span>}
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
            <button onClick={save} disabled={saving}
              style={{ padding: '8px 22px', borderRadius: 6, border: 'none', background: '#111', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontSize: 14, fontWeight: 600 }}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      {/* Icon picker overlay */}
      {iconPickerIndex !== null && (
        <IconPicker
          current={features[iconPickerIndex]?.iconName}
          onSelect={(name) => updateFeature(iconPickerIndex, { iconName: name, iconType: 'lucide', iconImage: null })}
          onClose={() => setIconPickerIndex(null)}
        />
      )}

      {/* Rich text editor */}
      {editingHtml && (
        <RichTextModal
          title="Éditer la description"
          initial={html}
          onClose={() => setEditingHtml(false)}
          onSave={(newHtml) => { setHtml(newHtml); setEditingHtml(false); }}
        />
      )}
    </>,
    document.body
  );
}
