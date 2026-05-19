"use client";
import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { ViewBlock } from './types';
import ViewBlockItem from './ViewBlockItem';
import styles from './ViewBlockGrid.module.css';

interface Props {
  blocks: ViewBlock[];
  isAdmin: boolean;
  onReorder: (blocks: ViewBlock[]) => void;
  onUpdate: (updated: ViewBlock) => void;
  onDelete: (id: string) => void;
}

export default function ViewBlockGrid({ blocks, isAdmin, onReorder, onUpdate, onDelete }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(blocks, oldIndex, newIndex));
  }

  if (!blocks.length && !isAdmin) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={rectSortingStrategy}>
        <div className={styles.grid}>
          {blocks.map((block) => (
            <ViewBlockItem
              key={block.id}
              block={block}
              isAdmin={isAdmin}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
