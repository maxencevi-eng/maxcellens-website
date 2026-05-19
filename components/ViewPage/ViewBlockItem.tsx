"use client";
import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ViewBlock } from './types';
import ViewTextBlock from './blocks/ViewTextBlock';
import ViewLinkBlock from './blocks/ViewLinkBlock';
import ViewVideoBlock from './blocks/ViewVideoBlock';
import ViewPhotoBlock from './blocks/ViewPhotoBlock';
import ViewMapBlock from './blocks/ViewMapBlock';
import ViewBlockModal from './ViewBlockModal';
import styles from './ViewBlockItem.module.css';

interface Props {
  block: ViewBlock;
  isAdmin: boolean;
  onUpdate: (updated: ViewBlock) => void;
  onDelete: (id: string) => void;
}

const SIZE_CLASSES: Record<string, string> = {
  square: styles.square,
  wide: styles.wide,
  compact: styles.compact,
  tall: styles.tall,
  large: styles.large,
};

function BlockContent({ block }: { block: ViewBlock }) {
  switch (block.type) {
    case 'text': return <ViewTextBlock block={block} />;
    case 'link': return <ViewLinkBlock block={block} />;
    case 'video': return <ViewVideoBlock block={block} />;
    case 'photo': return <ViewPhotoBlock block={block} />;
    case 'map': return <ViewMapBlock block={block} />;
    default: return null;
  }
}

export default function ViewBlockItem({ block, isAdmin, onUpdate, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: !isAdmin });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: block.backgroundColor || undefined,
    color: block.textColor || undefined,
    boxShadow: block.noShadow ? 'none' : undefined,
  };

  const sizeClass = SIZE_CLASSES[block.size] || styles.square;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`${styles.block} ${sizeClass} ${isDragging ? styles.dragging : ''}`}
        {...(isAdmin ? attributes : {})}
      >
        <BlockContent block={block} />

        {isAdmin && (
          <>
            <div
              className={styles.dragHandle}
              {...listeners}
              aria-label="Déplacer le bloc"
            >
              ⠿
            </div>
            <button
              className={styles.menuBtn}
              onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Modifier le bloc"
            >
              •••
            </button>
          </>
        )}

        {block.caption && (
          <div className={styles.caption}>{block.caption}</div>
        )}
      </div>

      {showModal && (
        <ViewBlockModal
          block={block}
          onClose={() => setShowModal(false)}
          onSave={(updated) => { onUpdate(updated); setShowModal(false); }}
          onDelete={(id) => { onDelete(id); setShowModal(false); }}
        />
      )}
    </>
  );
}
