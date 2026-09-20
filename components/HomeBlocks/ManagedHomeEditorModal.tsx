"use client";
import React from 'react';
import HomeBlockModal, { type HomeBlockKey } from './HomeBlockModal';
import ClientsEditModal from '../Clients/ClientsEditModal';
import type { PageBlock } from '../PageBuilder/pageTypes';

export default function ManagedHomeEditorModal({ block, onSave, onClose }: {
  block: PageBlock;
  onSave: (data: Record<string, unknown>) => Promise<boolean> | boolean;
  onClose: () => void;
}) {
  if (block.type === 'home_clients') return <ClientsEditModal premium settingsData={block.data as Record<string, string>} onSaveData={onSave} onClose={onClose} />;
  return <HomeBlockModal blockKey={block.type as HomeBlockKey} initialData={block.data as any} onSaveData={onSave} onClose={onClose} onSaved={() => {}} />;
}
