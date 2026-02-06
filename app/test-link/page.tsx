"use client";
import dynamic from 'next/dynamic';
const LexicalEditor = dynamic(() => import('../../components/LexicalEditor/LexicalEditor'), { ssr: false });

export default function TestLinkPage() {
  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Test éditeur — bouton lien</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
        Sélectionnez du texte puis cliquez sur l’icône lien (🔗). La zone de saisie d’URL doit apparaître à côté du bouton (pas de fenêtre prompt).
        Si vous voyez « Dialog suppressed: prompt », testez cette page dans un navigateur normal (Chrome/Firefox) en dehors de Cursor.
      </p>
      <div style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12, background: '#fff' }}>
        <LexicalEditor
          initialContent="<p>Sélectionnez ce texte et cliquez sur le bouton lien (🔗) dans la barre d'outils.</p>"
          onChange={() => {}}
          onReady={() => {}}
        />
      </div>
    </div>
  );
}
