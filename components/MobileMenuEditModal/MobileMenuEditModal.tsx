"use client";

import React from 'react';
import MenuEditor from '../MenuEditModal/MenuEditor';

/**
 * Menu mobile. Même éditeur que le menu de bureau, avec ses propres variables
 * CSS (`--nav-mobile-*`) et ses propres clés de réglages.
 */
export default function MobileMenuEditModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  return <MenuEditor scope="mobile" onClose={onClose} onSaved={onSaved} />;
}
