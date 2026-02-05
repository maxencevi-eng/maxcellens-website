"use client";

import React, { useEffect } from 'react';

/**
 * Bloque le clic-droit "Enregistrer sous" et le glisser-déposer sur toutes les images du site
 * pour empêcher l'enregistrement facile des photos (visiteurs et admins).
 */
export default function DisableImageSave() {
  useEffect(() => {
    function preventImageContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'IMG') e.preventDefault();
    }
    function preventImageDrag(e: DragEvent) {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'IMG') e.preventDefault();
    }
    document.addEventListener('contextmenu', preventImageContextMenu, { capture: true });
    document.addEventListener('dragstart', preventImageDrag, { capture: true });
    return () => {
      document.removeEventListener('contextmenu', preventImageContextMenu, { capture: true });
      document.removeEventListener('dragstart', preventImageDrag, { capture: true });
    };
  }, []);

  return null;
}
