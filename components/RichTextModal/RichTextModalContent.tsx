"use client";
import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Modal from '../Modal/Modal';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';

const LexicalEditor = dynamic(() => import('./LexicalEditorClient'), { ssr: false });

export default function RichTextModalContent({ title = 'Éditeur', initial = '', onClose, onSave }: { title?: string; initial?: string; onClose: () => void; onSave: (html: string) => void }) {
  const [value, setValue] = useState(initial);
  const [editorReady, setEditorReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderEditor, setRenderEditor] = useState(false);
  const readyTimer = React.useRef<number | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      setTimeout(() => setRenderEditor(true), 50);
    });
    if (readyTimer.current) {
      clearTimeout(readyTimer.current);
      readyTimer.current = null;
    }
    readyTimer.current = window.setTimeout(() => {
      setLoadError('L\'éditeur riche n\'a pas pu s\'initialiser correctement (délai dépassé).');
      readyTimer.current = null;
    }, 8000) as unknown as number;

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

  function handleEditorReady() {
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

  const editorKey = `editor-${title}-${(initial ?? '').length}`;

  return (
    <Modal title={title} onClose={onClose} bodyClassName="rich-text-modal-body" footer={<>
      <button onClick={onClose} style={{ padding: '8px 12px' }}>Annuler</button>
      <button onClick={handleSave} className="menu-item" style={{ padding: '8px 12px' }}>Enregistrer</button>
    </>}>
      <div style={{ minHeight: 320 }}>
        <div style={{ position: 'relative', minHeight: 280 }}>
          {!loadError && renderEditor ? (
            <ErrorBoundary onError={handleEditorError}>
              <LexicalEditor
                key={editorKey}
                initialContent={value}
                onChange={(html) => setValue(html)}
                onReady={handleEditorReady}
                onError={handleEditorError}
              />
            </ErrorBoundary>
          ) : null}

          {!editorReady && !loadError ? (
            <div style={{ position: 'absolute', inset: 0, minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: 'rgba(255,255,255,0.6)' }}>
              <div style={{ color: 'var(--muted)' }}>Chargement de l'éditeur...</div>
            </div>
          ) : null}
        </div>

        {loadError ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 8, color: 'orange' }}>{loadError}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={() => { setLoadError(null); setEditorReady(false); setRenderEditor(false); setTimeout(() => setRenderEditor(true), 0); }}>Réessayer</button>
              <button className="btn-ghost" onClick={() => { setLoadError('Chargement annulé'); setEditorReady(false); }}>Annuler</button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
