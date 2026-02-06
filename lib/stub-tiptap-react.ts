/**
 * Stub pour @tiptap/react : le projet utilise Lexical, pas TipTap.
 * Ce fichier évite les erreurs HMR/Turbopack quand un ancien chunk référence encore @tiptap/react.
 */
import React from 'react';

export function useEditor() {
  return null;
}
export function EditorContent(_props: unknown) {
  return React.createElement('div', { 'data-stub': 'tiptap' });
}
export default { useEditor, EditorContent };
