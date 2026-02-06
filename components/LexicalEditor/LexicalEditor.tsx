"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { $getRoot, $insertNodes, $getSelection, COMMAND_PRIORITY_LOW } from 'lexical';
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html';
import { mergeRegister } from '@lexical/utils';
import {
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list';
import { $isLinkNode, $toggleLink, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { ParagraphNode, TextNode, LineBreakNode } from 'lexical';
import { registerRichText } from '@lexical/rich-text';
import { registerList } from '@lexical/list';
import { useSiteStyle } from '../SiteStyle/SiteStyleProvider';
import { editorTheme } from './theme';

const nodes = [ParagraphNode, TextNode, LineBreakNode, HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode];

function RegisterRichTextPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const unregisterRich = registerRichText(editor);
    const unregisterList = registerList(editor);
    const unregisterLink = editor.registerCommand(
      TOGGLE_LINK_COMMAND,
      (payload) => {
        editor.update(() => {
          if (payload === null) {
            $toggleLink(null);
          } else if (typeof payload === 'string') {
            $toggleLink(payload, { target: '_blank', rel: 'noopener noreferrer' });
          } else {
            const isExternal = payload.target === '_blank';
            $toggleLink(payload.url ?? null, {
              target: payload.target ?? '_blank',
              rel: isExternal ? (payload.rel ?? 'noopener noreferrer') : null,
              title: payload.title ?? undefined,
            });
          }
        });
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
    return () => {
      unregisterRich();
      unregisterList();
      unregisterLink();
    };
  }, [editor]);
  return null;
}

function InitialContentPlugin({ html, onReady }: { html: string; onReady?: () => void }) {
  const [editor] = useLexicalComposerContext();
  const doneRef = useRef(false);
  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        if (html && html.trim()) {
          try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const nodesFromDom = $generateNodesFromDOM(editor, doc.body);
            $insertNodes(nodesFromDom);
          } catch (e) {
            console.warn('[LexicalEditor] parse initial HTML', e);
          }
        }
      },
      { tag: 'initial' }
    );
    onReady?.();
  }, [editor, html, onReady]);
  return null;
}

function HtmlOnChangePlugin({
  onChange,
}: {
  onChange: (html: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState, ed) => {
        editorState.read(() => {
          try {
            const html = $generateHtmlFromNodes(ed, null);
            onChangeRef.current(html);
          } catch (e) {
            console.warn('[LexicalEditor] generateHtml', e);
          }
        });
      }}
    />
  );
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  /** true = externe (nouvel onglet), false = interne (même onglet) */
  const [linkExternal, setLinkExternal] = useState(true);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const { style: siteStyle } = useSiteStyle();
  const siteFonts = (siteStyle?.fonts) || [];
  const availableFonts = [
    { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { label: 'Georgia', value: "'Georgia', serif" },
    { label: 'Times', value: "'Times New Roman', Times, serif" },
    { label: 'Courier', value: "'Courier New', Courier, monospace" },
    ...siteFonts.map((f: { name?: string }) => ({
      label: String(f.name || '').trim(),
      value: /[\s,]/.test(String(f.name || '')) ? `'${f.name}'` : String(f.name || ''),
    })),
  ].filter((f) => f.label);

  const updateToolbar = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));
    });
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => updateToolbar()),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    if (showLinkInput) linkInputRef.current?.focus();
  }, [showLinkInput]);

  const applyLink = () => {
    if (!linkUrl.trim()) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
      url: linkUrl.trim(),
      target: linkExternal ? '_blank' : '_self',
      rel: linkExternal ? 'noopener noreferrer' : null,
    });
    setLinkUrl('');
    setShowLinkInput(false);
  };

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button type="button" onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Annuler">⤺</button>
        <button type="button" onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Rétablir">⤻</button>
      </div>
      <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
          className={isBold ? 'active' : ''}
          title="Gras"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
          className={isItalic ? 'active' : ''}
          title="Italique"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
          className={isUnderline ? 'active' : ''}
          title="Souligné"
        >
          <span style={{ textDecoration: 'underline' }}>U</span>
        </button>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => {
              if (!showLinkInput && isLink) {
                editor.getEditorState().read(() => {
                  const s = $getSelection();
                  if ($isRangeSelection(s)) {
                    const n = s.anchor.getNode().getParent();
                    if ($isLinkNode(n)) {
                      setLinkUrl(n.getURL());
                      setLinkExternal(n.getTarget() === '_blank');
                    }
                  }
                });
              }
              setShowLinkInput((s) => !s);
            }}
            className={isLink ? 'active' : ''}
            title="Lien"
          >
            🔗
          </button>
          {showLinkInput && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#fff', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', flexWrap: 'wrap' }}>
              <input
                ref={linkInputRef}
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                  if (e.key === 'Escape') setShowLinkInput(false);
                }}
                placeholder="/page ou https://..."
                style={{ width: 200, padding: '4px 8px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: 14 }}
              />
              <select
                value={linkExternal ? 'external' : 'internal'}
                onChange={(e) => setLinkExternal(e.target.value === 'external')}
                style={{ padding: '4px 6px', fontSize: 13, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4 }}
                title="Interne = même onglet, Externe = nouvel onglet"
              >
                <option value="internal">Interne (même onglet)</option>
                <option value="external">Externe (nouvel onglet)</option>
              </select>
              <button type="button" onClick={applyLink} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}>Appliquer</button>
              <button type="button" onClick={() => { setShowLinkInput(false); setLinkUrl(''); }} style={{ padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
            </span>
          )}
        </div>
      </div>
      <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button type="button" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="Liste à puces">•</button>
        <button type="button" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} title="Liste numérotée">1.</button>
        <button type="button" onClick={() => editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)} title="Retirer liste">↩</button>
      </div>
      <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')} title="Aligner à gauche">≡</button>
        <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')} title="Centrer">≡</button>
        <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')} title="Aligner à droite">≡</button>
      </div>
      <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />
      <select
        style={{ padding: '6px 8px' }}
        onChange={(e) => {
          const v = e.target.value;
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            if (v === 'paragraph') {
              selection.getNodes().forEach((n) => {
                const p = n.getParent();
                if (p && ($isHeadingNode(p) || $isQuoteNode(p))) {
                  // Simplification: on ne change pas le type de bloc ici pour éviter les imports lourds
                }
              });
            } else if (/^h[1-6]$/.test(v)) {
              const level = parseInt(v.slice(1), 10) as 1 | 2 | 3 | 4 | 5 | 6;
              const heading = $createHeadingNode(`h${level}` as 'h1');
              // Insert/format would go here
            }
          });
        }}
      >
        <option value="paragraph">Paragraphe</option>
        <option value="h1">Titre 1</option>
        <option value="h2">Titre 2</option>
        <option value="h3">Titre 3</option>
        <option value="h4">Titre 4</option>
        <option value="h5">Titre 5</option>
      </select>
      <select style={{ padding: '6px 8px' }}>
        <option value="inherit">Police par défaut</option>
        {availableFonts.map((f) => (
          <option key={f.label} value={f.value}>{f.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function LexicalEditor({
  initialContent = '',
  onChange,
  onReady,
  onError,
}: {
  initialContent?: string;
  onChange?: (html: string) => void;
  onReady?: () => void;
  onError?: (err: unknown) => void;
}) {
  const initialConfig = React.useMemo(
    () => ({
      namespace: 'LexicalEditor',
      theme: editorTheme,
      nodes,
      onError: (error: Error, editor: import('lexical').LexicalEditor) => {
        console.error('[LexicalEditor]', error);
        onError?.(error);
      },
      editorState: null,
    }),
    [onError]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <RegisterRichTextPlugin />
      <InitialContentPlugin html={initialContent} onReady={onReady} />
      <ToolbarPlugin />
      <RichTextPlugin
        contentEditable={
          <ContentEditable
            className="lexical-content-editable"
            style={{ minHeight: 120, padding: 12, border: '1px solid #e6e6e6', borderRadius: 6, outline: 'none' }}
            aria-placeholder="Saisir ici..."
            placeholder={<div style={{ position: 'absolute', top: 12, left: 12, color: 'var(--muted)', pointerEvents: 'none' }}>Saisir ici...</div>}
          />
        }
        ErrorBoundary={LexicalErrorBoundary}
      />
      <HistoryPlugin />
      <LinkPlugin />
      <ListPlugin />
      <HtmlOnChangePlugin onChange={onChange ?? (() => {})} />
    </LexicalComposer>
  );
}
