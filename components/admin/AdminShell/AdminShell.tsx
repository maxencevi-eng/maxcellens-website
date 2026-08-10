"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, PanelLeftClose, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import AdminButton from '../AdminButton';
import {
  ADMIN_ENTRIES,
  ADMIN_GROUPS,
  SIDEBAR_HIDDEN_ENTRIES,
  findEntry,
  searchEntries,
  type AdminEntry,
} from './registry';
import styles from './AdminShell.module.css';

const WIDTH_STORAGE_KEY = 'adminSidebarWidth';
const MIN_WIDTH = 260;
const MAX_WIDTH = 460;

/**
 * Coque de l'espace d'administration.
 *
 * Remplace `AdminSidebar` : le menu est rendu depuis `registry.tsx`, les
 * modales sont ouvertes par identifiant, la largeur est redimensionnable et
 * persistée, et une recherche (⌘/Ctrl + K) donne accès à tout sans naviguer
 * dans des sous-menus dépliants.
 */
export default function AdminShell() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  /** Pile : une entrée peut en ouvrir une autre par-dessus. */
  const [openEntries, setOpenEntries] = useState<string[]>([]);
  const [width, setWidth] = useState(320);
  const [resizing, setResizing] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  /* ── Session ────────────────────────────────────────────────────────── */
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser((data as any)?.user ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (!u) {
        setOpen(false);
        setOpenEntries([]);
        document.body.classList.remove('has-admin-sidebar');
      }
    });
    return () => {
      mounted = false;
      try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {}
      document.body.classList.remove('has-admin-sidebar');
    };
  }, []);

  /* ── Largeur persistée ──────────────────────────────────────────────── */
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(WIDTH_STORAGE_KEY));
      if (saved >= MIN_WIDTH && saved <= MAX_WIDTH) setWidth(saved);
    } catch (_) {}
  }, []);

  /**
   * La largeur pilote le décalage du contenu du site (padding du body et
   * position du header fixe). Une seule variable, plus de `340` en dur.
   */
  useEffect(() => {
    document.documentElement.style.setProperty('--adm-sidebar-width', `${width}px`);
    document.documentElement.style.setProperty(
      '--admin-sidebar-open-width',
      `${width}px`
    );
  }, [width]);

  useEffect(() => {
    document.body.classList.toggle('has-admin-sidebar', open);
  }, [open]);

  /* ── Redimensionnement ──────────────────────────────────────────────── */
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);

    function onMove(ev: MouseEvent) {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX));
      setWidth(next);
    }
    function onUp() {
      setResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      // Lecture directe : `width` du closure serait périmé ici
      const final = Number(
        document.documentElement.style.getPropertyValue('--adm-sidebar-width').replace('px', '')
      );
      if (final >= MIN_WIDTH && final <= MAX_WIDTH) {
        try { localStorage.setItem(WIDTH_STORAGE_KEY, String(final)); } catch (_) {}
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  /* ── Ouverture / fermeture des entrées ──────────────────────────────── */
  const openEntry = useCallback((id: string) => {
    if (!findEntry(id)) return;
    setOpenEntries((s) => (s.includes(id) ? s : [...s, id]));
  }, []);

  const closeEntry = useCallback((id: string) => {
    setOpenEntries((s) => s.filter((x) => x !== id));
  }, []);

  /* ── Raccourci ⌘K / Ctrl+K ──────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        // Le champ n'existe qu'une fois la barre ouverte
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [user]);

  const results = useMemo(() => searchEntries(query), [query]);
  const searching = query.trim().length > 0;

  useEffect(() => setHighlight(0), [query]);

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = results[highlight];
      if (entry) {
        openEntry(entry.id);
        setQuery('');
      }
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    document.body.classList.remove('has-admin-sidebar');
  }

  if (!user) return null;

  if (!open) {
    return (
      <button
        type="button"
        className={styles.handle}
        aria-label="Ouvrir l’administration"
        data-admin-ui=""
        onClick={() => setOpen(true)}
      >
        <Menu size={18} aria-hidden="true" />
      </button>
    );
  }

  return (
    <>
      <aside
        id="admin-sidebar"
        className={styles.shell}
        aria-label="Administration"
        data-admin-ui=""
        style={{ width }}
      >
        <div className={styles.header}>
          <Link href="/admin" className={styles.brand}>
            <span className={styles.brandDot} aria-hidden="true" />
            Administration
          </Link>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Masquer le panneau"
            onClick={() => setOpen(false)}
          >
            <PanelLeftClose size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.searchWrap}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              className={styles.search}
              placeholder="Rechercher un réglage…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              aria-label="Rechercher un réglage"
            />
            {!query ? <kbd className={styles.kbd}>⌘K</kbd> : null}
          </div>
        </div>

        <nav className={styles.nav} aria-label="Réglages">
          {searching ? (
            results.length === 0 ? (
              <p className={styles.noResult}>Aucun réglage ne correspond à « {query} ».</p>
            ) : (
              <ul className={styles.list}>
                {results.map((entry, i) => (
                  <EntryButton
                    key={entry.id}
                    entry={entry}
                    highlighted={i === highlight}
                    showDescription
                    onClick={() => {
                      openEntry(entry.id);
                      setQuery('');
                    }}
                  />
                ))}
              </ul>
            )
          ) : (
            ADMIN_GROUPS.map((group) => {
              const entries = ADMIN_ENTRIES.filter(
                (e) => e.group === group.id && !SIDEBAR_HIDDEN_ENTRIES.has(e.id)
              );
              if (!entries.length) return null;
              return (
                <div key={group.id}>
                  <p className={styles.groupLabel}>{group.label}</p>
                  <ul className={styles.list}>
                    {entries.map((entry) => (
                      <EntryButton
                        key={entry.id}
                        entry={entry}
                        onClick={() => openEntry(entry.id)}
                      />
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </nav>

        <div className={styles.footer}>
          <span className={styles.user} title={user.email}>{user.email}</span>
          <AdminButton
            variant="dangerGhost"
            size="sm"
            block
            leadingIcon={<LogOut size={14} aria-hidden="true" />}
            onClick={signOut}
          >
            Déconnexion
          </AdminButton>
        </div>

        <button
          type="button"
          className={`${styles.resizer} ${resizing ? styles.resizerActive : ''}`}
          aria-label="Redimensionner le panneau"
          onMouseDown={startResize}
        />
      </aside>

      {/* Les modales ouvertes, dans l'ordre d'empilement */}
      {openEntries.map((id) => {
        const entry = findEntry(id);
        if (!entry) return null;
        return (
          <React.Fragment key={id}>
            {entry.render({ close: () => closeEntry(id), open: openEntry })}
          </React.Fragment>
        );
      })}
    </>
  );
}

function EntryButton({
  entry,
  onClick,
  highlighted,
  showDescription,
}: {
  entry: AdminEntry;
  onClick: () => void;
  highlighted?: boolean;
  showDescription?: boolean;
}) {
  const Icon = entry.icon;
  return (
    <li>
      <button
        type="button"
        className={`${styles.item} ${highlighted ? styles.itemHighlighted : ''}`}
        onClick={onClick}
        title={entry.description}
      >
        <Icon size={17} className={styles.itemIcon} aria-hidden="true" />
        <span className={styles.itemText}>
          <span className={styles.itemLabel}>{entry.label}</span>
          {showDescription ? (
            <span className={styles.itemDescription}>{entry.description}</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
