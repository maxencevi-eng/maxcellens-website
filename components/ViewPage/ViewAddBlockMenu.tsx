"use client";
import React, { useState, useRef, useEffect } from 'react';
import type { ViewBlockType } from './types';
import styles from './ViewAddBlockMenu.module.css';

interface Props {
  onAdd: (type: ViewBlockType) => void;
}

const BLOCK_TYPES: { type: ViewBlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    type: 'text', label: 'Texte', desc: 'Paragraphe, citation…',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={20} height={20}><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="16" y2="12" /><line x1="4" y1="17" x2="12" y2="17" /></svg>,
  },
  {
    type: 'link', label: 'Lien', desc: 'URL avec prévisualisation',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={20} height={20}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  },
  {
    type: 'video', label: 'Vidéo', desc: 'YouTube, Vimeo…',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={20} height={20}><polygon points="5,3 19,12 5,21" /></svg>,
  },
  {
    type: 'photo', label: 'Photo', desc: 'Image ou galerie',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={20} height={20}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21,15 16,10 5,21" /></svg>,
  },
  {
    type: 'map', label: 'Carte', desc: 'Google Maps',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={20} height={20}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /><circle cx="12" cy="9" r="2.5" /></svg>,
  },
];

export default function ViewAddBlockMenu({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [open]);

  function handleAdd(type: ViewBlockType) {
    onAdd(type);
    setOpen(false);
  }

  return (
    <div className={styles.wrap} ref={ref}>
      {open && (
        <div className={styles.menu}>
          <div className={styles.menuTitle}>Ajouter un bloc</div>
          {BLOCK_TYPES.map(({ type, label, icon, desc }) => (
            <button key={type} className={styles.menuItem} onClick={() => handleAdd(type)}>
              <span className={styles.menuIcon}>{icon}</span>
              <span>
                <span className={styles.menuLabel}>{label}</span>
                <span className={styles.menuDesc}>{desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        className={styles.addBtn}
        onClick={() => setOpen((o) => !o)}
        aria-label="Ajouter un bloc"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={20} height={20}>
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Ajouter un bloc
      </button>
    </div>
  );
}
