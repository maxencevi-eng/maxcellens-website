"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ModalTabs from '../ui/ModalTabs';
import { useSiteStyle } from '../SiteStyle/SiteStyleProvider';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ContactFaqData {
  eyebrow?: string;
  title?: string;
  titleHighlight?: string;
  description?: string;
  items: FaqItem[];
  backgroundColor?: string;
  titleFontSize?: number;
  titleColor?: string;
  titleFontFamily?: string;
  titleFontWeight?: number;
  highlightColor?: string;
  descriptionFontSize?: number;
  descriptionColor?: string;
}

const DEFAULT_DATA: ContactFaqData = {
  eyebrow: 'FAQ',
  title: 'Vos questions,',
  titleHighlight: 'nos réponses.',
  description: 'Tout ce que vous devez savoir sur mes prestations. Une question non listée ? Écrivez-moi directement.',
  backgroundColor: '',
  items: [
    {
      question: 'Quels types de projets réalisez-vous ?',
      answer: "Je couvre principalement les événements d'entreprise (séminaires, soirées, lancements de produits), les vidéos corporate et commerciales, ainsi que les portraits professionnels. Je suis également disponible en tant que cadreur pour renforcer des équipes de production.",
    },
    {
      question: 'Dans quelles zones géographiques intervenez-vous ?',
      answer: "Je suis basé en Île-de-France (Clamart, 92) et interviens régulièrement sur Paris et sa banlieue proche. Je me déplace également partout en France pour des missions sur mesure — frais de déplacement en sus.",
    },
    {
      question: 'Quels sont vos délais de livraison ?',
      answer: "Les délais varient selon la prestation. Pour un événement, les photos retouchées sont livrées sous 7 à 14 jours. Pour une vidéo, comptez 2 à 4 semaines selon la complexité du montage.",
    },
    {
      question: 'Comment se déroule un projet vidéo ?',
      answer: "Après un premier échange pour définir vos besoins, je prépare un brief créatif. Le tournage est planifié en accord avec votre agenda. La post-production inclut montage, étalonnage et mixage son. Vous pouvez demander des ajustements avant la livraison finale.",
    },
    {
      question: 'Quels sont vos tarifs ?',
      answer: "Les tarifs sont établis sur mesure selon le type de prestation, la durée et la complexité du projet. Contactez-moi pour recevoir un devis personnalisé adapté à vos besoins.",
    },
  ],
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 6,
  border: '1px solid #e6e6e6', fontSize: 14, boxSizing: 'border-box',
};
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' };


function ColorInput({ value, onChange, placeholder = 'transparent' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
        style={{ width: 36, height: 32, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2, flexShrink: 0 }} />
      <input style={{ ...inputStyle, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      {value && <button onClick={() => onChange('')} style={{ fontSize: 11, color: '#999', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>✕</button>}
    </div>
  );
}

export default function ContactFaqEditModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const { style: siteStyle } = useSiteStyle();
  const fontOptions = [
    { value: '', label: 'Par défaut (site)' },
    ...((siteStyle.fonts || []).map((f: { name: string }) => ({ value: f.name, label: f.name }))),
  ];
  const [tab, setTab] = useState('contenu');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [eyebrow, setEyebrow] = useState(DEFAULT_DATA.eyebrow ?? 'FAQ');
  const [title, setTitle] = useState(DEFAULT_DATA.title ?? '');
  const [titleHighlight, setTitleHighlight] = useState(DEFAULT_DATA.titleHighlight ?? '');
  const [description, setDescription] = useState(DEFAULT_DATA.description ?? '');
  const [items, setItems] = useState<FaqItem[]>(DEFAULT_DATA.items);
  const [backgroundColor, setBackgroundColor] = useState('');

  // Typography
  const [titleFontSize, setTitleFontSize] = useState(0);
  const [titleColor, setTitleColor] = useState('');
  const [titleFontFamily, setTitleFontFamily] = useState('');
  const [titleFontWeight, setTitleFontWeight] = useState(700);
  const [highlightColor, setHighlightColor] = useState('');
  const [descriptionFontSize, setDescriptionFontSize] = useState(0);
  const [descriptionColor, setDescriptionColor] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await fetch('/api/admin/site-settings?keys=contact_faq');
        if (!resp.ok) return;
        const j = await resp.json();
        const raw = j?.settings?.contact_faq;
        if (!raw || !mounted) return;
        const d: ContactFaqData = JSON.parse(String(raw));
        if (d.eyebrow != null) setEyebrow(d.eyebrow);
        if (d.title != null) setTitle(d.title);
        if (d.titleHighlight != null) setTitleHighlight(d.titleHighlight);
        if (d.description != null) setDescription(d.description);
        if (Array.isArray(d.items) && d.items.length > 0) setItems(d.items);
        if (d.backgroundColor != null) setBackgroundColor(d.backgroundColor);
        if (d.titleFontSize) setTitleFontSize(d.titleFontSize);
        if (d.titleColor) setTitleColor(d.titleColor);
        if (d.titleFontFamily) setTitleFontFamily(d.titleFontFamily);
        if (d.titleFontWeight) setTitleFontWeight(d.titleFontWeight);
        if (d.highlightColor) setHighlightColor(d.highlightColor);
        if (d.descriptionFontSize) setDescriptionFontSize(d.descriptionFontSize);
        if (d.descriptionColor) setDescriptionColor(d.descriptionColor);
      } catch (_) {}
    }
    load();
    return () => { mounted = false; };
  }, []);

  function updateItem(i: number, patch: Partial<FaqItem>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }
  function addItem() {
    setItems(prev => [...prev, { question: '', answer: '' }]);
  }
  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }
  function moveItem(i: number, dir: 'up' | 'down') {
    setItems(prev => {
      const arr = [...prev];
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const data: ContactFaqData = {
        eyebrow, title, titleHighlight, description, items, backgroundColor,
        titleFontSize: titleFontSize || undefined,
        titleColor: titleColor || undefined,
        titleFontFamily: titleFontFamily || undefined,
        titleFontWeight: titleFontWeight !== 700 ? titleFontWeight : undefined,
        highlightColor: highlightColor || undefined,
        descriptionFontSize: descriptionFontSize || undefined,
        descriptionColor: descriptionColor || undefined,
      };
      const resp = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'contact_faq', value: JSON.stringify(data) }),
      });
      if (!resp.ok) throw new Error('Sauvegarde échouée');
      window.dispatchEvent(new CustomEvent('site-settings-updated', { detail: { key: 'contact_faq' } }));
      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  // Live preview styles
  const previewTitleStyle: React.CSSProperties = {
    fontSize: titleFontSize ? titleFontSize : 22,
    fontWeight: titleFontWeight || 700,
    color: titleColor || undefined,
    fontFamily: titleFontFamily || undefined,
    lineHeight: 1.15,
    marginBottom: 8,
  };
  const previewHighlightStyle: React.CSSProperties = {
    color: highlightColor || 'var(--color-primary, #2d6b5f)',
  };
  const previewDescStyle: React.CSSProperties = {
    fontSize: descriptionFontSize ? descriptionFontSize : 13,
    color: descriptionColor || 'rgba(0,0,0,0.5)',
    maxWidth: 380,
    margin: '0 auto',
    lineHeight: 1.65,
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50000, padding: '70px 16px 16px', overflowY: 'auto' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', color: '#000', padding: 24, width: 700, maxWidth: '100%', borderRadius: 10, alignSelf: 'flex-start', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <strong style={{ fontSize: 16 }}>Modifier le bloc FAQ</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <ModalTabs
          tabs={[{ id: 'contenu', label: 'Entête' }, { id: 'questions', label: 'Questions' }, { id: 'style', label: 'Style' }]}
          active={tab}
          onChange={setTab}
        />

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {tab === 'contenu' && (
            <>
              {/* Live preview */}
              <div style={{ background: '#f8f8f8', borderRadius: 10, padding: '24px 20px 20px', textAlign: 'center', border: '1px solid #eee' }}>
                {eyebrow && (
                  <div style={{ display: 'inline-block', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 999, padding: '4px 14px', marginBottom: 12 }}>{eyebrow}</div>
                )}
                <div style={previewTitleStyle}>
                  {title || 'Vos questions,'}{' '}
                  <span style={previewHighlightStyle}>{titleHighlight || 'nos réponses.'}</span>
                </div>
                {description && <div style={previewDescStyle}>{description}</div>}
              </div>

              {/* Textes */}
              <div>
                <label style={lbl}>Étiquette (eyebrow)</label>
                <input style={inputStyle} value={eyebrow} onChange={e => setEyebrow(e.target.value)} placeholder="FAQ" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Titre principal</label>
                  <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Vos questions," />
                </div>
                <div>
                  <label style={lbl}>Titre mis en valeur</label>
                  <input style={inputStyle} value={titleHighlight} onChange={e => setTitleHighlight(e.target.value)} placeholder="nos réponses." />
                </div>
              </div>
              <div>
                <label style={lbl}>Sous-titre / description</label>
                <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical', fontFamily: 'inherit' }}
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Tout ce que vous devez savoir sur mes prestations..." />
              </div>

              {/* Typographie */}
              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Typographie du titre</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={lbl}>Taille (px)</label>
                    <input type="number" min={14} max={100} style={inputStyle} value={titleFontSize || ''} onChange={e => setTitleFontSize(Number(e.target.value) || 0)} placeholder="auto" />
                  </div>
                  <div>
                    <label style={lbl}>Graisse</label>
                    <select style={inputStyle} value={titleFontWeight} onChange={e => setTitleFontWeight(Number(e.target.value))}>
                      <option value={300}>Light 300</option>
                      <option value={400}>Normal 400</option>
                      <option value={500}>Medium 500</option>
                      <option value={600}>Semi-bold 600</option>
                      <option value={700}>Bold 700</option>
                      <option value={800}>Extra-bold 800</option>
                      <option value={900}>Black 900</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Police</label>
                    <select style={inputStyle} value={titleFontFamily} onChange={e => setTitleFontFamily(e.target.value)}>
                      {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Couleur du titre</label>
                    <ColorInput value={titleColor} onChange={setTitleColor} placeholder="hérité" />
                  </div>
                  <div>
                    <label style={lbl}>Couleur de la mise en valeur</label>
                    <ColorInput value={highlightColor} onChange={setHighlightColor} placeholder="couleur accent" />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Typographie du sous-titre</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={lbl}>Taille (px)</label>
                    <input type="number" min={10} max={32} style={inputStyle} value={descriptionFontSize || ''} onChange={e => setDescriptionFontSize(Number(e.target.value) || 0)} placeholder="auto" />
                  </div>
                  <div>
                    <label style={lbl}>Couleur</label>
                    <ColorInput value={descriptionColor} onChange={setDescriptionColor} placeholder="hérité" />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'questions' && (
            <>
              {items.map((item, i) => (
                <div key={i} style={{ border: '1px solid #e6e6e6', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: 13 }}>Question {i + 1}</strong>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => moveItem(i, 'up')} disabled={i === 0} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>↑</button>
                      <button onClick={() => moveItem(i, 'down')} disabled={i === items.length - 1} style={{ background: 'none', border: '1px solid #ddd', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>↓</button>
                      <button onClick={() => removeItem(i)} style={{ background: 'none', border: '1px solid #fcc', color: '#c00', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12 }}>Supprimer</button>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Question</label>
                    <input style={inputStyle} value={item.question} onChange={e => updateItem(i, { question: e.target.value })} placeholder="Votre question..." />
                  </div>
                  <div>
                    <label style={lbl}>Réponse</label>
                    <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                      value={item.answer} onChange={e => updateItem(i, { answer: e.target.value })} placeholder="La réponse..." />
                  </div>
                </div>
              ))}
              <button onClick={addItem} style={{ padding: '10px', borderRadius: 8, border: '1px dashed #ccc', background: '#fafafa', cursor: 'pointer', fontSize: 13 }}>
                + Ajouter une question
              </button>
            </>
          )}

          {tab === 'style' && (
            <div>
              <label style={lbl}>Couleur de fond</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={backgroundColor || '#ffffff'} onChange={e => setBackgroundColor(e.target.value)}
                  style={{ width: 42, height: 38, border: '1px solid #e6e6e6', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                <input style={{ ...inputStyle, flex: 1 }} value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} placeholder="transparent" />
                {backgroundColor && <button onClick={() => setBackgroundColor('')} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Réinitialiser</button>}
              </div>
            </div>
          )}

          {error && <span style={{ color: 'red', fontSize: 13 }}>{error}</span>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
            <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Annuler</button>
            <button onClick={save} disabled={saving}
              style={{ padding: '8px 22px', borderRadius: 6, border: 'none', background: '#111', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontSize: 14, fontWeight: 600 }}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
