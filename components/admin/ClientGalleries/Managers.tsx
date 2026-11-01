"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Star, Trash2, Upload } from 'lucide-react';
import { AdminButton, SegmentedField, TextField, confirmDialog } from '..';
import {
  normalizeDesign,
  normalizeDownload,
  normalizeFavorites,
  type AdminGallery,
  type Template,
  type TemplateSettings,
  type Watermark,
} from '../../../lib/clientGalleries/types';
import { adminApi } from './api';
import { applyWatermark } from './renditions';
import { AccessFields, DesignFields, DownloadFields, FavoritesFields, TagInput, WatermarkSelect } from './shared';
import s from './cg.module.css';

/* ── Modèles ──────────────────────────────────────────────────────────── */

export function TemplatesManager({
  templates,
  watermarks,
  galleries,
  onChange,
  onGalleries,
  toast,
}: {
  templates: Template[];
  watermarks: Watermark[];
  galleries: AdminGallery[];
  onChange: (t: Template[]) => void;
  onGalleries: (updated: AdminGallery[]) => void;
  toast: (m: string) => void;
}) {
  const [selId, setSelId] = useState<string | null>(templates[0]?.id || null);
  const sel = templates.find((t) => t.id === selId) || null;
  const [draft, setDraft] = useState<Template | null>(sel);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(sel ? JSON.parse(JSON.stringify(sel)) : null), [selId]); // eslint-disable-line react-hooks/exhaustive-deps

  const st: TemplateSettings = draft?.settings || {};
  const set = (patch: Partial<TemplateSettings>) => draft && setDraft({ ...draft, settings: { ...draft.settings, ...patch } });
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(sel);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const j = await adminApi<{ template: Template }>('/templates', {
        method: 'PATCH',
        json: { id: draft.id, name: draft.name, description: draft.description, settings: draft.settings },
      });
      onChange(templates.map((t) => (t.id === j.template.id ? j.template : t)));
      setDraft(j.template);
      toast('Modèle enregistré');
    } catch (e: any) {
      toast(e.message);
    }
    setSaving(false);
  };
  const create = async () => {
    const j = await adminApi<{ template: Template }>('/templates', { method: 'POST', json: { name: 'Nouveau modèle', settings: {} } });
    onChange([...templates, j.template]);
    setSelId(j.template.id);
  };
  const makeDefault = async (id: string) => {
    await adminApi('/templates', { method: 'PATCH', json: { id, is_default: true } });
    onChange(templates.map((t) => ({ ...t, is_default: t.id === id })));
    toast('Modèle par défaut');
  };
  const users = draft ? galleries.filter((g) => g.template_id === draft.id && !g.deleted_at) : [];
  const propagate = async () => {
    if (!draft || !users.length) return;
    if (
      !(await confirmDialog({
        title: `Appliquer « ${draft.name} » à ${users.length} galerie${users.length > 1 ? 's' : ''} ?`,
        message:
          'Accès, téléchargement, filigrane, favoris et présentation de ces galeries seront remplacés par ceux du modèle. Titres, mots de passe, fichiers et dates ne changent pas.',
        confirmLabel: 'Appliquer',
      }))
    )
      return;
    try {
      const j = await adminApi<{ galleries: AdminGallery[] }>('/bulk', {
        method: 'POST',
        json: { ids: users.map((g) => g.id), action: 'patch', patch: { apply_template: draft.id } },
      });
      onGalleries(j.galleries);
      toast(`Modèle appliqué à ${j.galleries.length} galerie(s)`);
    } catch (e: any) {
      toast(e.message);
    }
  };

  const remove = async (t: Template) => {
    if (!(await confirmDialog({ title: `Supprimer « ${t.name} » ?`, message: 'Les galeries déjà créées avec ce modèle ne changent pas.', tone: 'danger', confirmLabel: 'Supprimer' }))) return;
    await adminApi(`/templates?id=${t.id}`, { method: 'DELETE' });
    const rest = templates.filter((x) => x.id !== t.id);
    onChange(rest);
    setSelId(rest[0]?.id || null);
  };

  return (
    <div className={s.edCols}>
      <div className={s.card2} style={{ padding: 10 }}>
        {templates.map((t) => (
          <button key={t.id} className={s.nav} aria-current={t.id === selId} onClick={() => setSelId(t.id)}>
            <span className={s.label}>{t.name}</span>
            {t.is_default ? <Star size={13} style={{ marginLeft: 'auto', color: '#c08a1a' }} fill="#c08a1a" /> : null}
          </button>
        ))}
        <button className={s.nav} onClick={create} style={{ color: 'var(--adm-accent)' }}>
          <Plus size={15} /> Nouveau modèle
        </button>
      </div>

      {draft ? (
        <div>
          <div className={s.card2}>
            <div className={s.inline}>
              <TextField label="Nom du modèle" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <AdminButton variant="primary" loading={saving} disabled={!dirty} onClick={save}>
                {dirty ? 'Enregistrer le modèle' : 'Enregistré'}
              </AdminButton>
              {!draft.is_default ? (
                <AdminButton variant="secondary" leadingIcon={<Star size={14} />} onClick={() => makeDefault(draft.id)}>
                  Par défaut
                </AdminButton>
              ) : null}
              <AdminButton variant="dangerGhost" leadingIcon={<Trash2 size={14} />} onClick={() => remove(draft)}>
                Supprimer
              </AdminButton>
            </div>
            <p>
              {users.length
                ? `${users.length} galerie${users.length > 1 ? 's' : ''} créée${users.length > 1 ? 's' : ''} avec ce modèle. Modifier le modèle ne les change pas, sauf si vous l’appliquez.`
                : 'Aucune galerie créée avec ce modèle pour l’instant.'}
            </p>
            {users.length ? (
              <div style={{ marginTop: 10 }}>
                <AdminButton size="sm" variant="secondary" onClick={propagate} disabled={dirty} title={dirty ? 'Enregistrez d’abord le modèle' : undefined}>
                  Appliquer le modèle à ces {users.length} galerie{users.length > 1 ? 's' : ''}
                </AdminButton>
              </div>
            ) : null}
            <div className={s.stack}>
              <TextField label="Description" value={draft.description || ''} onChange={(v) => setDraft({ ...draft, description: v })} placeholder="À quoi sert ce modèle ?" />
              <TagInput label="Tags ajoutés aux galeries créées avec ce modèle" value={st.tags || []} onChange={(tags) => set({ tags })} placeholder="corporate, portraits…" />
            </div>
          </div>
          <div className={s.card2}>
            <h3>Accès et expiration</h3>
            <div className={s.stack}>
              <AccessFields
                mode={st.access_mode || 'password'}
                magic={st.magic_link_enabled !== false}
                emailGate={!!st.email_gate}
                onChange={(p) => set(p as any)}
              />
              <TextField
                label="Expiration (mois après la création)"
                value={st.expiry_months ? String(st.expiry_months) : ''}
                placeholder="Jamais"
                onChange={(v) => set({ expiry_months: Number(v.replace(/\D/g, '')) || null })}
              />
            </div>
          </div>
          <div className={s.card2}>
            <h3>Téléchargement</h3>
            <div className={s.stack}>
              <DownloadFields value={normalizeDownload(st.download)} onChange={(v) => set({ download: v })} />
            </div>
          </div>
          <div className={s.card2}>
            <h3>Filigrane et favoris</h3>
            <div className={s.stack}>
              <WatermarkSelect
                value={st.watermark_id || (st.watermark ? watermarks[0]?.id || null : null)}
                watermarks={watermarks}
                onChange={(id) => set({ watermark_id: id, watermark: false })}
              />
              <FavoritesFields value={normalizeFavorites(st.favorites)} onChange={(v) => set({ favorites: v })} />
            </div>
          </div>
          <div className={s.card2}>
            <h3>Présentation</h3>
            <div className={s.stack}>
              <DesignFields value={normalizeDesign(st.design)} onChange={(v) => set({ design: v })} />
            </div>
          </div>
          <div className={s.card2}>
            <h3>Message de partage</h3>
            <p>
              Variables : {'{client}'} {'{titre}'} {'{lien}'} {'{motdepasse}'} {'{motdepasse_ligne}'} {'{expiration_ligne}'} {'{pin}'}
            </p>
            <textarea className={s.textarea} value={st.share_message || ''} placeholder="Message par défaut" onChange={(e) => set({ share_message: e.target.value })} />
          </div>
          {dirty ? (
            <div className={s.saveBar}>
              Modifications non enregistrées
              <AdminButton variant="ghost" onClick={() => setDraft(sel)}>
                Annuler
              </AdminButton>
              <AdminButton variant="primary" loading={saving} onClick={save}>
                Enregistrer le modèle
              </AdminButton>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={s.empty}>Aucun modèle.</div>
      )}
    </div>
  );
}

/* ── Filigranes ───────────────────────────────────────────────────────── */

const SAMPLE = 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=70';

export function WatermarkPreview({ wm, src = SAMPLE }: { wm: Watermark; src?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const c = ref.current;
      if (!c || !alive) return;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      await applyWatermark(c, wm);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [wm, src]);
  return <canvas ref={ref} className={s.wmCanvas} />;
}

const POS: Watermark['position'][] = ['tl', 'tc', 'tr', 'cl', 'c', 'cr', 'bl', 'bc', 'br'];

export function WatermarksManager({
  watermarks,
  onChange,
  toast,
}: {
  watermarks: Watermark[];
  onChange: (w: Watermark[]) => void;
  toast: (m: string) => void;
}) {
  const [selId, setSelId] = useState<string | null>(watermarks[0]?.id || null);
  const sel = watermarks.find((w) => w.id === selId) || null;
  const [draft, setDraft] = useState<Watermark | null>(sel);
  const [saving, setSaving] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(sel ? { ...sel } : null), [selId]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(sel);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const j = await adminApi<{ watermark: Watermark }>('/watermarks', { method: 'PATCH', json: draft });
      onChange(watermarks.map((w) => (w.id === j.watermark.id ? j.watermark : w)));
      setDraft(j.watermark);
      toast('Filigrane enregistré — les galeries concernées proposeront de régénérer leurs aperçus');
    } catch (e: any) {
      toast(e.message);
    }
    setSaving(false);
  };
  const create = async () => {
    const j = await adminApi<{ watermark: Watermark }>('/watermarks', { method: 'POST', json: {} });
    onChange([...watermarks, j.watermark]);
    setSelId(j.watermark.id);
  };
  const remove = async (w: Watermark) => {
    if (!(await confirmDialog({ title: `Supprimer « ${w.name} » ?`, message: 'Les galeries qui l’utilisent passeront sans filigrane.', tone: 'danger', confirmLabel: 'Supprimer' }))) return;
    await adminApi(`/watermarks?id=${w.id}`, { method: 'DELETE' });
    const rest = watermarks.filter((x) => x.id !== w.id);
    onChange(rest);
    setSelId(rest[0]?.id || null);
  };
  const pickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !draft) return;
    if (f.size > 290_000) return toast('Logo trop lourd (300 Ko max) — exportez un PNG plus petit');
    const r = new FileReader();
    r.onload = () => setDraft({ ...draft, kind: 'image', image_data: String(r.result) });
    r.readAsDataURL(f);
  };

  return (
    <div className={s.edCols}>
      <div className={s.card2} style={{ padding: 10 }}>
        {watermarks.map((w) => (
          <button key={w.id} className={s.nav} aria-current={w.id === selId} onClick={() => setSelId(w.id)}>
            <span className={s.label}>{w.name}</span>
          </button>
        ))}
        <button className={s.nav} onClick={create} style={{ color: 'var(--adm-accent)' }}>
          <Plus size={15} /> Nouveau filigrane
        </button>
      </div>
      {draft ? (
        <div className={s.card2}>
          <div className={s.wmGrid}>
            <div className={s.stack} style={{ marginTop: 0 }}>
              <TextField label="Nom" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <SegmentedField
                label="Type"
                value={draft.kind}
                onChange={(v) => setDraft({ ...draft, kind: v })}
                options={[
                  { value: 'text', label: 'Texte' },
                  { value: 'image', label: 'Logo PNG' },
                ]}
              />
              {draft.kind === 'text' ? (
                <>
                  <TextField label="Texte" value={draft.text || ''} onChange={(v) => setDraft({ ...draft, text: v })} />
                  <div>
                    <span className={s.lbl}>Couleur</span>
                    <input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
                  </div>
                </>
              ) : (
                <div>
                  <AdminButton variant="secondary" leadingIcon={<Upload size={14} />} onClick={() => logoInput.current?.click()}>
                    {draft.image_data ? 'Remplacer le logo' : 'Choisir un logo PNG'}
                  </AdminButton>
                  <input ref={logoInput} type="file" accept="image/png,image/webp,image/svg+xml" hidden onChange={pickLogo} />
                </div>
              )}
              <div>
                <span className={s.lbl}>Position</span>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div className={s.posGrid}>
                    {POS.map((p) => (
                      <button key={p} aria-pressed={draft.position === p} onClick={() => setDraft({ ...draft, position: p })} aria-label={p} />
                    ))}
                  </div>
                  <AdminButton size="sm" variant={draft.position === 'tile' ? 'primary' : 'secondary'} onClick={() => setDraft({ ...draft, position: 'tile' })}>
                    Mosaïque
                  </AdminButton>
                </div>
              </div>
              {(
                [
                  ['scale', 'Taille', 0.03, 0.6, 0.01, (v: number) => `${Math.round(v * 100)} %`],
                  ['opacity', 'Opacité', 0.05, 1, 0.05, (v: number) => `${Math.round(v * 100)} %`],
                  ['margin', 'Marge', 0, 0.15, 0.005, (v: number) => `${Math.round(v * 100)} %`],
                ] as const
              ).map(([k, label, min, max, step, fmt]) => (
                <div key={k}>
                  <span className={s.lbl}>
                    {label} : {fmt(draft[k] as number)}
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={draft[k] as number}
                    onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--adm-accent)' }}
                  />
                </div>
              ))}
              <AdminButton variant="dangerGhost" leadingIcon={<Trash2 size={14} />} onClick={() => remove(draft)}>
                Supprimer ce filigrane
              </AdminButton>
            </div>
            <div>
              <WatermarkPreview wm={draft} />
              <p className={s.muted}>Aperçu réel : c’est exactement ce qui sera incrusté dans les photos affichées.</p>
            </div>
          </div>
          {dirty ? (
            <div className={s.saveBar}>
              Modifications non enregistrées
              <AdminButton variant="ghost" onClick={() => setDraft(sel)}>
                Annuler
              </AdminButton>
              <AdminButton variant="primary" loading={saving} onClick={save}>
                Enregistrer
              </AdminButton>
            </div>
          ) : null}
        </div>
      ) : (
        <div className={s.empty}>Aucun filigrane.</div>
      )}
    </div>
  );
}
