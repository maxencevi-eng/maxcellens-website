"use client";

import React, { useCallback, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, Download, Mail, MessageCircle, RefreshCw } from 'lucide-react';
import { AdminButton, AdminModal, SegmentedField, SelectField, TextField, ToggleField } from '..';
import {
  clientUrl,
  formatBytes,
  renderShareMessage,
  type AdminGallery,
  type DesignSettings,
  type DownloadSettings,
  type FavoriteSettings,
  type Folder,
  type Watermark,
} from '../../../lib/clientGalleries/types';
import { adminApi, copyText, siteOrigin } from './api';
import s from './cg.module.css';

/* ── Toast ── */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  const node = msg ? (
    <div className={s.toast} role="status">
      <Check size={15} /> {msg}
    </div>
  ) : null;
  return { show, node };
}

/* ── Statut affiché ── */
export type DisplayStatus = 'published' | 'draft' | 'expired' | 'expiring' | 'trash';
export function statusOf(g: AdminGallery): DisplayStatus {
  if (g.deleted_at) return 'trash';
  if (g.expires_at) {
    const t = new Date(g.expires_at).getTime();
    if (t < Date.now()) return 'expired';
    if (g.status === 'published' && t - Date.now() < 14 * 86400000) return 'expiring';
  }
  return g.status;
}
export function statusLabel(g: AdminGallery): string {
  const st = statusOf(g);
  if (st === 'expiring') {
    const d = Math.max(0, Math.ceil((new Date(g.expires_at!).getTime() - Date.now()) / 86400000));
    return `Expire dans ${d} j`;
  }
  return { published: 'Publiée', draft: 'Brouillon', expired: 'Expirée', trash: 'Corbeille' }[st] as string;
}

export function fmtDate(d: string | null | undefined, withTime = false) {
  if (!d) return '';
  const date = new Date(d.length === 10 ? d + 'T12:00:00' : d);
  return withTime
    ? date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const ACCESS_LABEL = { password: 'Mot de passe', link: 'Lien direct', public: 'Publique' } as const;

export function galleryLink(g: AdminGallery, magic = false) {
  return clientUrl(siteOrigin(), g.slug, magic ? g.magic_token : null);
}
export function previewLink(g: AdminGallery) {
  return `${clientUrl(siteOrigin(), g.slug)}?preview=${g.preview_token}`;
}

/* ── Export CSV (Excel FR : BOM + séparateur ;) ── */
export function galleriesCsv(list: AdminGallery[], folders: Folder[]): string {
  const folderName = new Map(folders.map((f) => [f.id, f.name]));
  const esc = (v: any) => {
    const t = v == null ? '' : String(v);
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const head = [
    'Titre', 'Client', 'E-mail', 'Dossier', 'Date évènement', 'Statut', 'Accès', 'Lien', 'Mot de passe',
    'Lien magique', 'PIN téléchargement', 'Téléchargement', 'Expiration', 'Éléments', 'Poids', 'Vues',
    'Téléchargements', 'Première ouverture', 'Créée le',
  ];
  const rows = list.map((g) => [
    g.title,
    g.client_name,
    g.client_email,
    g.folder_id ? folderName.get(g.folder_id) : '',
    g.event_date ? fmtDate(g.event_date) : '',
    statusLabel(g),
    ACCESS_LABEL[g.access_mode],
    galleryLink(g),
    g.access_mode === 'password' ? g.password : '',
    g.magic_token ? galleryLink(g, true) : '',
    g.download.enabled && g.download.pin ? g.download_pin : '',
    g.download.enabled ? g.download.sizes.map((x) => (x === 'original' ? 'HD' : 'web')).join(' + ') : 'Désactivé',
    g.expires_at ? fmtDate(g.expires_at) : '',
    g.photo_count,
    formatBytes(g.bytes_total),
    g.view_count,
    g.download_count,
    g.first_viewed_at ? fmtDate(g.first_viewed_at, true) : 'Jamais',
    fmtDate(g.created_at),
  ]);
  return '﻿' + [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

/* ── Partage ── */
export function ShareDialog({ gallery, onClose, onChange }: { gallery: AdminGallery; onClose: () => void; onChange?: (g: AdminGallery) => void }) {
  const [g, setG] = useState(gallery);
  const [copied, setCopied] = useState<string | null>(null);
  const link = galleryLink(g);
  const magic = g.magic_token ? galleryLink(g, true) : null;
  const [msg, setMsg] = useState(() => renderShareMessage(g.share_message, g, link));

  const copy = async (k: string, t: string) => {
    if (await copyText(t)) {
      setCopied(k);
      setTimeout(() => setCopied(null), 1600);
    }
  };
  const regen = async () => {
    const j = await adminApi<{ gallery: AdminGallery }>(`/${g.id}`, { method: 'PATCH', json: { regenerate_password: true } });
    setG(j.gallery);
    setMsg(renderShareMessage(j.gallery.share_message, j.gallery, link));
    onChange?.(j.gallery);
  };
  const downloadQr = () => {
    const svg = document.getElementById('cg-share-qr');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 1024;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 64, 64, 896, 896);
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = `QR-${g.slug}.png`;
      a.click();
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  };

  const CopyBtn = ({ k, text }: { k: string; text: string }) => (
    <AdminButton size="sm" variant="secondary" onClick={() => copy(k, text)} leadingIcon={copied === k ? <Check size={14} /> : <Copy size={14} />}>
      {copied === k ? 'Copié' : 'Copier'}
    </AdminButton>
  );

  return (
    <AdminModal title="Partager la galerie" subtitle={g.title} size="lg" onClose={onClose} footer={null}>
      {g.status !== 'published' ? (
        <div className={s.notice}>Cette galerie est en <b>brouillon</b> : publiez-la pour que le lien fonctionne.</div>
      ) : null}
      <div className={s.shareGrid}>
        <div className={s.stack} style={{ marginTop: 0 }}>
          <div>
            <span className={s.lbl}>Lien</span>
            <div className={s.field}>
              <input readOnly value={link} onFocus={(e) => e.target.select()} />
              <CopyBtn k="link" text={link} />
            </div>
          </div>
          {g.access_mode === 'password' ? (
            <div>
              <span className={s.lbl}>Mot de passe</span>
              <div className={s.field}>
                <input readOnly value={g.password || ''} data-mono="true" onFocus={(e) => e.target.select()} />
                <AdminButton size="sm" variant="ghost" iconOnly aria-label="Nouveau mot de passe" title="Nouveau mot de passe (révoque les accès ouverts)" onClick={regen}>
                  <RefreshCw size={14} />
                </AdminButton>
                <CopyBtn k="pw" text={g.password || ''} />
              </div>
            </div>
          ) : null}
          {magic && g.access_mode === 'password' ? (
            <div>
              <span className={s.lbl}>Lien magique — ouvre sans mot de passe</span>
              <div className={s.field}>
                <input readOnly value={magic} onFocus={(e) => e.target.select()} />
                <CopyBtn k="magic" text={magic} />
              </div>
            </div>
          ) : null}
          {g.download.enabled && g.download.pin && g.download_pin ? (
            <div>
              <span className={s.lbl}>PIN de téléchargement</span>
              <div className={s.field}>
                <input readOnly value={g.download_pin} data-mono="true" />
                <CopyBtn k="pin" text={g.download_pin} />
              </div>
            </div>
          ) : null}
        </div>
        <div className={s.qr}>
          <QRCodeSVG id="cg-share-qr" value={magic && g.access_mode === 'password' ? magic : link} size={256} level="M" marginSize={0} />
          {magic && g.access_mode === 'password' ? 'QR = lien magique' : 'Scanner pour ouvrir'}
          <div style={{ marginTop: 8 }}>
            <AdminButton size="sm" variant="ghost" onClick={downloadQr} leadingIcon={<Download size={14} />}>
              PNG
            </AdminButton>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <span className={s.lbl}>Message prêt à envoyer</span>
        <textarea className={s.textarea} value={msg} onChange={(e) => setMsg(e.target.value)} rows={9} />
      </div>
      <div className={s.btnRow}>
        <AdminButton variant="primary" onClick={() => copy('msg', msg)} leadingIcon={copied === 'msg' ? <Check size={15} /> : <Copy size={15} />}>
          {copied === 'msg' ? 'Message copié' : 'Copier le message'}
        </AdminButton>
        <AdminButton
          variant="secondary"
          leadingIcon={<Mail size={15} />}
          onClick={() => {
            window.location.href = `mailto:${encodeURIComponent(g.client_email || '')}?subject=${encodeURIComponent(`Vos photos — ${g.title}`)}&body=${encodeURIComponent(msg)}`;
          }}
        >
          E-mail
        </AdminButton>
        <AdminButton
          variant="secondary"
          leadingIcon={<MessageCircle size={15} />}
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener')}
        >
          WhatsApp
        </AdminButton>
      </div>
    </AdminModal>
  );
}

/* ── Blocs de réglages partagés (galerie et modèle) ── */

export function AccessFields({
  mode,
  magic,
  emailGate,
  onChange,
}: {
  mode: 'password' | 'link' | 'public';
  magic: boolean;
  emailGate: boolean;
  onChange: (patch: { access_mode?: any; magic_link_enabled?: boolean; email_gate?: boolean }) => void;
}) {
  return (
    <>
      <SegmentedField
        label="Accès"
        value={mode}
        onChange={(v) => onChange({ access_mode: v })}
        options={[
          { value: 'password', label: 'Mot de passe' },
          { value: 'link', label: 'Lien direct' },
          { value: 'public', label: 'Publique' },
        ]}
        hint={
          mode === 'password'
            ? 'Le client saisit un code. Le lien magique lui évite la saisie.'
            : mode === 'link'
              ? 'Toute personne ayant le lien voit la galerie. Jamais référencée.'
              : 'Accessible à tous via le lien (non référencée par Google).'
        }
      />
      {mode === 'password' ? (
        <ToggleField label="Lien magique" hint="Un lien qui ouvre la galerie sans saisir le mot de passe." checked={magic} onChange={(v) => onChange({ magic_link_enabled: v })} />
      ) : null}
      <ToggleField label="Demander nom et e-mail à l'entrée" hint="Vous saurez qui a ouvert la galerie." checked={emailGate} onChange={(v) => onChange({ email_gate: v })} />
    </>
  );
}

export function DownloadFields({ value, onChange }: { value: DownloadSettings; onChange: (v: DownloadSettings) => void }) {
  const toggle = <K extends 'sizes' | 'scopes'>(key: K, item: any) => {
    const list = new Set<any>(value[key]);
    list.has(item) ? list.delete(item) : list.add(item);
    onChange({ ...value, [key]: Array.from(list) });
  };
  return (
    <>
      <ToggleField
        label="Autoriser le téléchargement"
        hint="Désactivé : aucun bouton côté client, et le serveur refuse les demandes."
        checked={value.enabled}
        onChange={(v) => onChange({ ...value, enabled: v, sizes: v && !value.sizes.length ? ['original'] : value.sizes, scopes: v && !value.scopes.length ? ['photo', 'all'] : value.scopes })}
      />
      {value.enabled ? (
        <>
          <div>
            <span className={s.lbl}>Tailles proposées</span>
            <div className={s.checks}>
              <label>
                <input type="checkbox" checked={value.sizes.includes('original')} onChange={() => toggle('sizes', 'original')} /> Originaux HD
              </label>
              <label>
                <input type="checkbox" checked={value.sizes.includes('web')} onChange={() => toggle('sizes', 'web')} /> Web (2560 px)
              </label>
            </div>
          </div>
          <div>
            <span className={s.lbl}>Le client peut télécharger</span>
            <div className={s.checks}>
              {(
                [
                  ['photo', 'Élément par élément'],
                  ['set', 'Une section'],
                  ['all', 'Toute la galerie (ZIP)'],
                  ['favorites', 'Ses favoris'],
                ] as const
              ).map(([k, l]) => (
                <label key={k}>
                  <input type="checkbox" checked={value.scopes.includes(k)} onChange={() => toggle('scopes', k)} /> {l}
                </label>
              ))}
            </div>
          </div>
          <ToggleField label="PIN de téléchargement" hint="Code à 4 chiffres demandé au moment de télécharger." checked={value.pin} onChange={(v) => onChange({ ...value, pin: v })} />
        </>
      ) : null}
    </>
  );
}

export function FavoritesFields({ value, onChange }: { value: FavoriteSettings; onChange: (v: FavoriteSettings) => void }) {
  return (
    <>
      <ToggleField label="Favoris" hint="Le client marque ses photos préférées (sélection pour retouche, tirages…)." checked={value.enabled} onChange={(v) => onChange({ ...value, enabled: v })} />
      {value.enabled ? (
        <TextField
          label="Limite de sélection"
          placeholder="Illimitée"
          value={value.limit ? String(value.limit) : ''}
          onChange={(v) => onChange({ ...value, limit: Number(v.replace(/\D/g, '')) || null })}
          hint="Nombre maximum de favoris par visiteur."
        />
      ) : null}
    </>
  );
}

export function WatermarkSelect({ value, watermarks, onChange }: { value: string | null; watermarks: Watermark[]; onChange: (id: string | null) => void }) {
  return (
    <SelectField
      label="Filigrane"
      value={value || ''}
      onChange={(v) => onChange(v || null)}
      options={[{ value: '', label: 'Aucun filigrane' }, ...watermarks.map((w) => ({ value: w.id, label: w.name }))]}
      hint="Incrusté dans les photos affichées. Les originaux téléchargés restent intacts."
    />
  );
}

/* Mini-illustrations des couvertures */
const COVERS: { id: DesignSettings['cover']; label: string; art: React.ReactNode }[] = [
  { id: 'full', label: 'Plein cadre', art: <><i style={{ inset: 0, background: 'linear-gradient(#8aa,#465)' }} /><i style={{ left: 8, bottom: 8, width: '45%', height: 6, background: '#fff', borderRadius: 2 }} /></> },
  { id: 'center', label: 'Centrée', art: <><i style={{ inset: 0, background: 'linear-gradient(#a98,#543)' }} /><i style={{ left: '25%', top: '45%', width: '50%', height: 6, background: '#fff', borderRadius: 2 }} /></> },
  { id: 'split', label: 'Divisée', art: <><i style={{ right: 0, top: 0, bottom: 0, width: '55%', background: 'linear-gradient(#9ab,#567)' }} /><i style={{ left: 8, top: '45%', width: '30%', height: 6, background: '#333', borderRadius: 2 }} /></> },
  { id: 'frame', label: 'Cadre', art: <><i style={{ inset: 7, borderRadius: 4, background: 'linear-gradient(#bba,#665)' }} /><i style={{ left: 14, bottom: 14, width: '40%', height: 5, background: '#fff', borderRadius: 2 }} /></> },
  { id: 'editorial', label: 'Éditorial', art: <><i style={{ left: 8, top: 8, width: '70%', height: 9, background: '#333', borderRadius: 2 }} /><i style={{ left: 8, right: 8, top: 24, bottom: 8, background: 'linear-gradient(#a9b,#546)', borderRadius: 2 }} /></> },
  { id: 'minimal', label: 'Minimale', art: <><i style={{ left: '22%', top: '30%', width: '56%', height: 8, background: '#333', borderRadius: 2 }} /><i style={{ left: '35%', top: '52%', width: '30%', height: 4, background: '#999', borderRadius: 2 }} /></> },
];
const THEMES: { id: DesignSettings['theme']; label: string; bg: string; ink: string }[] = [
  { id: 'light', label: 'Clair', bg: '#f2f0eb', ink: '#1b1f1d' },
  { id: 'sand', label: 'Sable', bg: '#e9e3d8', ink: '#1b1f1d' },
  { id: 'stone', label: 'Pierre', bg: '#eceeed', ink: '#1d2422' },
  { id: 'night', label: 'Nuit', bg: '#121614', ink: '#ecefeb' },
];
const FONTS: { id: DesignSettings['font']; label: string; css: React.CSSProperties }[] = [
  { id: 'serif', label: 'Classique', css: { fontFamily: '"Playfair Display", Georgia, serif' } },
  { id: 'sans', label: 'Léger', css: { fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 300 } },
  { id: 'modern', label: 'Moderne', css: { fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, letterSpacing: '-0.04em' } },
];

export function DesignFields({ value, onChange }: { value: DesignSettings; onChange: (v: DesignSettings) => void }) {
  return (
    <>
      <div>
        <span className={s.lbl}>Couverture</span>
        <div className={s.pick}>
          {COVERS.map((c) => (
            <button key={c.id} type="button" className={s.pickBtn} aria-pressed={value.cover === c.id} onClick={() => onChange({ ...value, cover: c.id })}>
              <div className={s.mini} style={{ background: c.id === 'split' || c.id === 'editorial' || c.id === 'minimal' || c.id === 'frame' ? '#f2f0eb' : undefined }}>
                {c.art}
              </div>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className={s.lbl}>Ambiance</span>
        <div className={s.pick}>
          {THEMES.map((t) => (
            <button key={t.id} type="button" className={s.pickBtn} aria-pressed={value.theme === t.id} onClick={() => onChange({ ...value, theme: t.id })}>
              <div className={s.swatch} style={{ background: t.bg, color: t.ink, fontFamily: 'Georgia, serif' }}>
                Aa
              </div>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className={s.lbl}>Typographie des titres</span>
        <div className={s.pick}>
          {FONTS.map((f) => (
            <button key={f.id} type="button" className={s.pickBtn} aria-pressed={value.font === f.id} onClick={() => onChange({ ...value, font: f.id })}>
              <div className={s.swatch} style={{ background: '#fff', ...f.css, fontSize: 20 }}>
                Titre
              </div>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className={s.lbl}>Images par ligne (sur ordinateur)</span>
        <div className={s.pick} style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {[2, 3, 4, 5, 6].map((n) => (
            <button key={n} type="button" className={s.pickBtn} aria-pressed={value.columns === n} onClick={() => onChange({ ...value, columns: n })}>
              <div className={s.colsArt} style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
                {Array.from({ length: n * 2 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <b style={{ fontSize: 15 }}>{n}</b>
              <span style={{ fontSize: 11.5, marginTop: -6 }}>
                {n === 2 ? 'très grandes' : n === 3 ? 'grandes' : n === 4 ? 'moyennes' : n === 5 ? 'petites' : 'très petites'}
              </span>
            </button>
          ))}
        </div>
        <p className={s.muted} style={{ margin: '6px 0 0', fontSize: 12 }}>
          Réduit automatiquement sur tablette et mobile. En grille justifiée, c’est une moyenne : les formats sont respectés.
        </p>
      </div>
      <div className={s.row2}>
        <SegmentedField
          label="Grille"
          value={value.grid}
          onChange={(v) => onChange({ ...value, grid: v })}
          options={[
            { value: 'justified', label: 'Justifiée' },
            { value: 'masonry', label: 'Mosaïque' },
            { value: 'square', label: 'Carrée' },
          ]}
        />
        <div>
          <span className={s.lbl}>Espacement : {value.gap} px</span>
          <input type="range" min={0} max={24} value={value.gap} onChange={(e) => onChange({ ...value, gap: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--adm-accent)' }} />
        </div>
      </div>
    </>
  );
}

/**
 * Saisie de tags en étiquettes : Entrée, virgule ou point-virgule valide le
 * tag en cours ; Retour arrière sur un champ vide retire le dernier. Un texte
 * collé « a, b, c » donne trois tags.
 */
export function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const parts = raw
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const lower = new Set(value.map((t) => t.toLowerCase()));
    const next = [...value];
    for (const p of parts) {
      if (!lower.has(p.toLowerCase())) {
        next.push(p);
        lower.add(p.toLowerCase());
      }
    }
    onChange(next);
    setText('');
  };
  return (
    <div>
      {label ? <span className={s.lbl}>{label}</span> : null}
      <div className={s.tagBox} onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}>
        {value.map((t) => (
          <span key={t} className={s.tagChip}>
            {t}
            <button type="button" aria-label={`Retirer ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
              ×
            </button>
          </span>
        ))}
        <input
          value={text}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]/.test(v)) add(v);
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(text)}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text');
            if (/[,;\n]/.test(t)) {
              e.preventDefault();
              add(text + t);
            }
          }}
        />
      </div>
      <p className={s.muted} style={{ margin: '6px 0 0', fontSize: 12 }}>
        Entrée ou virgule pour valider chaque tag.
      </p>
    </div>
  );
}

export function FolderSelect({ value, folders, onChange, label = 'Dossier' }: { value: string | null; folders: Folder[]; onChange: (v: string | null) => void; label?: string }) {
  return (
    <SelectField
      label={label}
      value={value || ''}
      onChange={(v) => onChange(v || null)}
      options={[{ value: '', label: 'Aucun dossier' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]}
    />
  );
}
