"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  AdminButton,
  AdminCard,
  AdminEmpty,
  AdminModal,
  AdminNotice,
  AdminSection,
  TextField,
  ToggleField,
  promptDialog,
} from '../admin';
import { supabase } from '../../lib/supabase';
import { slugify, validateSlug, type SitePageSummary } from './pageTypes';
import styles from './PagesManagerModal.module.css';

/**
 * Gestionnaire de pages : créer, renommer, publier, réordonner, supprimer.
 *
 * La suppression est douce (corbeille 30 jours, cf. sql/page_builder.sql) et
 * demande de saisir le titre — une page emporte tous ses blocs.
 */
export default function PagesManagerModal({ onClose }: { onClose: () => void }) {
  const [pages, setPages] = useState<SitePageSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const authHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  const load = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const resp = await fetch('/api/pages', headers ? { headers } : undefined);
      const json = await resp.json();
      setPages(Array.isArray(json?.pages) ? json.pages : []);
    } catch (e: any) {
      setError('Chargement des pages impossible.');
      setPages([]);
    }
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  // Le slug suit le titre tant que l'utilisateur ne l'a pas édité lui-même.
  const effectiveSlug = slugTouched ? slugify(newSlug) : slugify(newTitle);
  const slugCheck = effectiveSlug ? validateSlug(effectiveSlug) : null;

  async function createPage() {
    if (!newTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error('Session expirée — reconnectez-vous.');
      const resp = await fetch('/api/pages', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: newTitle.trim(), slug: effectiveSlug }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Création impossible');
      setNewTitle('');
      setNewSlug('');
      setSlugTouched(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Création impossible');
    } finally {
      setBusy(false);
    }
  }

  async function patchPage(id: string, patch: Record<string, unknown>) {
    setError(null);
    const previous = pages;
    // Reflet immédiat dans la liste
    setPages((prev) =>
      (prev || []).map((p) => (p.id === id ? ({ ...p, ...camelPatch(patch) } as SitePageSummary) : p))
    );
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error('Session expirée — reconnectez-vous.');
      const resp = await fetch(`/api/pages/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Modification impossible');
      await load();
    } catch (e: any) {
      setPages(previous);
      setError(e?.message || 'Modification impossible');
    }
  }

  async function movePage(index: number, direction: 'up' | 'down') {
    const list = pages || [];
    const j = direction === 'up' ? index - 1 : index + 1;
    if (j < 0 || j >= list.length) return;
    const a = list[index];
    const b = list[j];
    // Échange des positions : deux PATCH, la liste est rechargée ensuite
    await patchPage(a.id, { position: b.position });
    await patchPage(b.id, { position: a.position });
  }

  async function deletePage(page: SitePageSummary) {
    // La saisie du titre est exigée par le dialogue lui-même : le bouton de
    // confirmation reste inactif tant qu'elle ne correspond pas.
    const typed = await promptDialog({
      title: `Supprimer « ${page.title} » ?`,
      message:
        `Cette page et ses ${page.blockCount} bloc(s) seront retirés du site. ` +
        `Elle reste récupérable pendant 30 jours.`,
      label: 'Titre de la page',
      placeholder: page.title,
      mustMatch: page.title,
      confirmLabel: 'Supprimer la page',
      tone: 'danger',
    });
    if (typed === null) return;

    setBusy(true);
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error('Session expirée — reconnectez-vous.');
      const resp = await fetch(`/api/pages/${page.id}`, { method: 'DELETE', headers });
      if (!resp.ok) {
        const json = await resp.json().catch(() => ({}));
        throw new Error((json as any)?.error || 'Suppression impossible');
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Suppression impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminModal
      title="Pages du site"
      subtitle="Créez, publiez et organisez les pages gérées depuis l’administration."
      size="lg"
      onClose={onClose}
      footer={<AdminButton variant="primary" onClick={onClose}>Terminé</AdminButton>}
    >
      {error ? <AdminNotice tone="danger">{error}</AdminNotice> : null}

      <AdminSection
        title="Nouvelle page"
        description="Une page est créée en brouillon : elle n’est visible que de vous jusqu’à publication."
      >
        <TextField
          label="Titre"
          value={newTitle}
          onChange={setNewTitle}
          placeholder="Tarifs"
          required
        />
        <TextField
          label="Adresse (slug)"
          value={slugTouched ? newSlug : effectiveSlug}
          onChange={(v) => { setSlugTouched(true); setNewSlug(v); }}
          placeholder="tarifs"
          mono
          hint={effectiveSlug ? `La page sera accessible sur /${effectiveSlug}` : undefined}
          error={slugCheck && !slugCheck.ok ? slugCheck.reason : null}
        />
        <AdminButton
          variant="primary"
          leadingIcon={<Plus size={14} aria-hidden="true" />}
          loading={busy}
          disabled={!newTitle.trim() || (slugCheck ? !slugCheck.ok : true)}
          onClick={createPage}
        >
          Créer la page
        </AdminButton>
      </AdminSection>

      <AdminSection title={`Pages existantes${pages ? ` (${pages.length})` : ''}`}>
        {pages === null ? (
          <AdminNotice>Chargement…</AdminNotice>
        ) : pages.length === 0 ? (
          <AdminEmpty>
            Aucune page créée depuis l’administration. Les pages historiques du site
            (Accueil, Contact, Portrait…) restent gérées dans le code.
          </AdminEmpty>
        ) : (
          pages.map((page, index) => (
            <AdminCard
              key={page.id}
              title={page.title}
              actions={
                <>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    iconOnly
                    aria-label="Monter"
                    disabled={index === 0}
                    onClick={() => movePage(index, 'up')}
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    iconOnly
                    aria-label="Descendre"
                    disabled={index === pages.length - 1}
                    onClick={() => movePage(index, 'down')}
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                  </AdminButton>
                  <AdminButton
                    size="sm"
                    variant="dangerGhost"
                    iconOnly
                    aria-label={`Supprimer ${page.title}`}
                    onClick={() => deletePage(page)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </AdminButton>
                </>
              }
            >
              <div className={styles.row}>
                <span
                  className={`${styles.badge} ${
                    page.status === 'published' ? styles.badgePublished : styles.badgeDraft
                  }`}
                >
                  {page.status === 'published' ? 'Publiée' : 'Brouillon'}
                </span>
                <span className={styles.meta}>/{page.slug}</span>
                <span className={styles.meta}>
                  {page.blockCount} bloc{page.blockCount > 1 ? 's' : ''}
                </span>
                <Link href={`/${page.slug}`} className={styles.openLink}>
                  <ExternalLink size={13} aria-hidden="true" />
                  Ouvrir et modifier
                </Link>
              </div>

              <div className={styles.controls}>
                <AdminButton
                  size="sm"
                  variant={page.status === 'published' ? 'secondary' : 'primary'}
                  leadingIcon={
                    page.status === 'published'
                      ? <EyeOff size={14} aria-hidden="true" />
                      : <Eye size={14} aria-hidden="true" />
                  }
                  onClick={() =>
                    patchPage(page.id, {
                      status: page.status === 'published' ? 'draft' : 'published',
                    })
                  }
                >
                  {page.status === 'published' ? 'Dépublier' : 'Publier'}
                </AdminButton>

                <ToggleField
                  label="Afficher dans le menu"
                  checked={page.showInMenu}
                  onChange={(v) => patchPage(page.id, { showInMenu: v })}
                />
              </div>
            </AdminCard>
          ))
        )}
      </AdminSection>

      <AdminNotice>
        Pour modifier le contenu d’une page, ouvrez-la : les blocs s’éditent
        directement sur la page, avec un bouton « Ajouter un bloc » entre chaque
        section.
      </AdminNotice>
    </AdminModal>
  );
}

/** Traduit un patch API (snake_case côté serveur) vers le résumé affiché. */
function camelPatch(patch: Record<string, unknown>): Partial<SitePageSummary> {
  const out: Partial<SitePageSummary> = {};
  if (typeof patch.title === 'string') out.title = patch.title;
  if (typeof patch.slug === 'string') out.slug = patch.slug;
  if (patch.status === 'draft' || patch.status === 'published') out.status = patch.status;
  if (typeof patch.showInMenu === 'boolean') out.showInMenu = patch.showInMenu;
  if (typeof patch.position === 'number') out.position = patch.position;
  return out;
}
