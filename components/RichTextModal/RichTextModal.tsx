"use client";
import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Modal from '../Modal/Modal';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';

// Lexical rich text editor (remplace TipTap)
const LexicalEditor = dynamic(() => import('../LexicalEditor/LexicalEditor'), { ssr: false });

export default function RichTextModal({ title = 'Éditeur', initial = '', onClose, onSave } : { title?: string; initial?: string; onClose: () => void; onSave: (html: string) => void }) {
  const [value, setValue] = useState(initial);
  const [editorReady, setEditorReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderEditor, setRenderEditor] = useState(false);



  // For Lexical we'll first ensure the package can be imported, then wait for the editor instance
  const readyTimer = React.useRef<number | null>(null);

  async function attemptLoad() {
    try {
      await import('@lexical/react/LexicalComposer');
      console.debug('[RichTextModal] Lexical package available');
      // start a timeout that will mark loadError if the editor instance doesn't report ready
      if (readyTimer.current) {
        clearTimeout(readyTimer.current);
        readyTimer.current = null;
      }
      readyTimer.current = window.setTimeout(() => {
        setLoadError('L’éditeur riche n’a pas pu s\'initialiser correctement (délai dépassé).');
        readyTimer.current = null;
      }, 8000) as unknown as number;
    } catch (err: any) {
      console.warn('[RichTextModal] Lexical failed to load', err);
      setLoadError(String(err?.message || err));
    }
  }

  useEffect(() => {
    console.debug('[RichTextModal] mounting, setting up global error listeners');
    // delay rendering the editor until the modal is painted and in its final DOM container
    // this avoids the editor being initialized inside a node that is then moved by a portal
    requestAnimationFrame(() => {
      // small additional delay to allow modal animation/portal mounting
      setTimeout(() => setRenderEditor(true), 50);
    });
    attemptLoad();

    const isTrustedTypesCreateHTMLError = (msg: any) => {
      if (!msg) return false;
      const s = String(msg);
      return s.includes('TrustedTypePolicy') || s.includes("createHTML") || s.includes('Policy default');
    };

    const onGlobalError = (ev: ErrorEvent) => {
      const msg = ev.error?.message || ev.message;
      if (isTrustedTypesCreateHTMLError(msg)) {
        console.warn('[RichTextModal] Ignored TrustedTypes createHTML error', msg);
        return;
      }
      console.error('[RichTextModal] global error captured', ev.error || ev.message, ev);
      setLoadError(String(ev.error?.message || ev.message || 'Erreur inconnue'));
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      const reasonMsg = ev.reason && (ev.reason.message || ev.reason);
      if (isTrustedTypesCreateHTMLError(reasonMsg)) {
        console.warn('[RichTextModal] Ignored TrustedTypes createHTML rejection', reasonMsg);
        return;
      }
      console.error('[RichTextModal] unhandled rejection', ev.reason);
      setLoadError(String(ev.reason?.message || ev.reason || 'Rejection inconnue'));
    };
    window.addEventListener('error', onGlobalError);
    window.addEventListener('unhandledrejection', onRejection as any);

    return () => {
      if (readyTimer.current) { clearTimeout(readyTimer.current); readyTimer.current = null; }
      window.removeEventListener('error', onGlobalError);
      window.removeEventListener('unhandledrejection', onRejection as any);
    };
  }, []);

  // Allow LexicalEditor to signal readiness via onReady prop instead of DOM probing
  function handleEditorReady() {
    // clear pending timer to avoid a late timeout turning on the error UI
    if (readyTimer.current) { clearTimeout(readyTimer.current); readyTimer.current = null; }
    setEditorReady(true);
    setLoadError(null);
  }



  function handleEditorError(err: any) {
    console.warn('[RichTextModal] Lexical editor error', err);
    setLoadError(String(err?.message || err));
    setEditorReady(false);
  }




  const handleSave = () => {
    if (!editorReady) {
      setLoadError('L\'éditeur riche n\'est pas prêt.');
      return;
    }
    onSave(value);
  };

  return (
    <Modal title={title} onClose={onClose} footer={<>
      <button onClick={onClose} style={{ padding: '8px 12px' }}>Annuler</button>
      <button onClick={handleSave} className="menu-item" style={{ padding: '8px 12px' }}>Enregistrer</button>
    </>}>
      <div>
        <div style={{ position: 'relative' }}>
          {/* Always render the component so it can initialize and call onReady */}
          {!loadError && renderEditor ? (
            <ErrorBoundary onError={handleEditorError}>
              <LexicalEditor initialContent={value} onChange={(html) => setValue(html)} onReady={handleEditorReady} onError={handleEditorError} />
            </ErrorBoundary>
          ) : null}

          {/* Loading overlay until editor signals readiness */}
          {!editorReady && !loadError ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(255,255,255,0.6)' }}>
              <div style={{ color: 'var(--muted)' }}>Chargement de l'éditeur...</div>
            </div>
          ) : null}
        </div>

        {/* Show error if the editor failed to initialize */}
        {loadError ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 8, color: 'orange' }}>{loadError}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={() => { setLoadError(null); attemptLoad(); }}>Réessayer</button>
              <button className="btn-ghost" onClick={() => { setLoadError('Chargement annulé'); setEditorReady(false); }}>Annuler</button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
