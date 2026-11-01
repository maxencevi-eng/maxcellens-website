"use client";

import React, { useState } from 'react';
import { AdminButton, AdminModal, SelectField, TextField } from '..';
import { slugify, type AdminGallery, type Folder, type Template } from '../../../lib/clientGalleries/types';
import { adminApi } from './api';
import { FolderSelect } from './shared';
import s from './cg.module.css';

function templateOptions(templates: Template[]) {
  return templates.map((t) => ({ value: t.id, label: `${t.name}${t.is_default ? ' ★' : ''}` }));
}
function defaultTemplate(templates: Template[]) {
  return (templates.find((t) => t.is_default) || templates[0])?.id || '';
}

function TemplateSummary({ t }: { t?: Template }) {
  if (!t) return null;
  const st = t.settings || {};
  const dl = st.download;
  const bits = [
    { password: 'Mot de passe', link: 'Lien direct', public: 'Publique' }[st.access_mode || 'password'],
    dl?.enabled === false ? 'Téléchargement désactivé' : `Téléchargement ${(dl?.sizes || ['original']).map((x) => (x === 'original' ? 'HD' : 'web')).join(' + ')}`,
    st.watermark || st.watermark_id ? 'Filigrane' : 'Sans filigrane',
    st.favorites?.enabled ? `Favoris${st.favorites.limit ? ` (${st.favorites.limit} max)` : ''}` : null,
    st.expiry_months ? `Expire après ${st.expiry_months} mois` : 'Sans expiration',
  ].filter(Boolean);
  return (
    <p className={s.muted} style={{ marginTop: 6 }}>
      {t.description ? `${t.description} — ` : ''}
      {bits.join(' · ')}
    </p>
  );
}

/* ── Nouvelle galerie ─────────────────────────────────────────────────── */

export function NewGalleryDialog({
  templates,
  folders,
  defaultFolder,
  onClose,
  onCreated,
}: {
  templates: Template[];
  folders: Folder[];
  defaultFolder?: string | null;
  onClose: () => void;
  onCreated: (g: AdminGallery) => void;
}) {
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [folder, setFolder] = useState<string | null>(defaultFolder || null);
  const [tpl, setTpl] = useState(defaultTemplate(templates));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const j = await adminApi<{ gallery: AdminGallery }>('', {
        method: 'POST',
        json: { title, client_name: client, client_email: email, event_date: date || null, folder_id: folder, template_id: tpl },
      });
      onCreated(j.gallery);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <AdminModal
      title="Nouvelle galerie"
      size="md"
      onClose={onClose}
      error={error}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            Annuler
          </AdminButton>
          <AdminButton variant="primary" loading={busy} disabled={!title.trim()} onClick={create}>
            Créer et ajouter les fichiers
          </AdminButton>
        </>
      }
    >
      <div className={s.stack} style={{ marginTop: 0 }}>
        <TextField label="Titre" value={title} onChange={setTitle} placeholder="20261108 - Séminaire Kering" required />
        <p className={s.muted} style={{ marginTop: -6 }}>
          Adresse : /client/{slugify(title || 'titre')}
        </p>
        <div className={s.row2}>
          <TextField label="Client" value={client} onChange={setClient} placeholder="Nom du client" />
          <TextField label="E-mail du client" type="email" value={email} onChange={setEmail} placeholder="Pour l'envoi et l'export" />
        </div>
        <div className={s.row2}>
          <div>
            <span className={s.lbl}>Date de l'évènement</span>
            <div className={s.field}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <FolderSelect value={folder} folders={folders} onChange={setFolder} />
        </div>
        <div>
          <SelectField label="Modèle de réglages" value={tpl} onChange={setTpl} options={templateOptions(templates)} />
          <TemplateSummary t={templates.find((t) => t.id === tpl)} />
        </div>
        <p className={s.muted}>Un mot de passe est généré automatiquement. Tout reste modifiable ensuite.</p>
      </div>
    </AdminModal>
  );
}

