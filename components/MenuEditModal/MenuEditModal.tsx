"use client";

import React from 'react';
import MenuEditor from './MenuEditor';

/**
 * Menu de bureau. L'implémentation est partagée avec le menu mobile
 * (voir `MenuEditor`) : les deux fichiers étaient auparavant des copies.
 */
export default function MenuEditModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  return <MenuEditor scope="desktop" onClose={onClose} onSaved={onSaved} />;
}
