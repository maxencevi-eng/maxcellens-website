"use no memo";
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
import { $getRoot, $insertNodes, $getSelection, $findMatchingParent, $isElementNode, COMMAND_PRIORITY_LOW } from 'lexical';
import { $generateNodesFromDOM, $generateHtmlFromNodes } from '@lexical/html';
import { mergeRegister } from '@lexical/utils';
import {
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
} from 'lexical';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, $isListNode, $isListItemNode, ListNode, ListItemNode } from '@lexical/list';
import { $isLinkNode, $toggleLink, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text';
import { LinkNode } from '@lexical/link';
import { $createParagraphNode, $createTextNode, ParagraphNode, TextNode, LineBreakNode } from 'lexical';
import { $setBlocksType, $patchStyleText, $getSelectionStyleValueForProperty } from '@lexical/selection';
import { registerRichText } from '@lexical/rich-text';
import { registerList } from '@lexical/list';
import { useSiteStyle } from '../SiteStyle/SiteStyleProvider';
import { editorTheme } from './theme';

const nodes = [ParagraphNode, TextNode, LineBreakNode, HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode];

/** Pages du site pour le lien interne (path + libellé) */
const SITE_PAGES: { path: string; label: string; group?: string }[] = [
  { path: '/', label: 'Accueil' },
  { path: '/contact', label: 'Contact' },
  { path: '/realisation', label: 'Réalisation (Film & Photo)', group: 'Réalisation' },
  { path: '/realisation?tab=film', label: 'Réalisation - Film', group: 'Réalisation' },
  { path: '/realisation?tab=photo', label: 'Réalisation - Photo', group: 'Réalisation' },
  { path: '/production', label: 'Production' },
  { path: '/portrait', label: 'Portrait (toutes les galeries)', group: 'Portrait' },
  { path: '/portrait?tab=lifestyle', label: 'Lifestyle', group: 'Portrait' },
  { path: '/portrait?tab=studio', label: 'Studio', group: 'Portrait' },
  { path: '/portrait?tab=couple', label: 'Couple', group: 'Portrait' },
  { path: '/corporate', label: 'Corporate (Film & Photo)', group: 'Corporate' },
  { path: '/corporate?tab=film', label: 'Corporate - Film', group: 'Corporate' },
  { path: '/corporate?tab=photo', label: 'Corporate - Photo', group: 'Corporate' },
  { path: '/evenement', label: 'Événement (Film & Photo)', group: 'Événement' },
  { path: '/evenement?tab=film', label: 'Événement - Film', group: 'Événement' },
  { path: '/evenement?tab=photo', label: 'Événement - Photo', group: 'Événement' },
  { path: '/animation', label: 'Animation' },
  { path: '/galeries', label: 'Galeries' },
  { path: '/projects', label: 'Projets' },
];

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
  const [blockFormat, setBlockFormat] = useState<string>('paragraph');
  const [fontFamily, setFontFamily] = useState<string>('inherit');
  const [lineHeight, setLineHeight] = useState<string>('1.25');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [isUppercase, setIsUppercase] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiPanelRef = useRef<HTMLElement | null>(null);
  const { style: siteStyle } = useSiteStyle();
  const siteFonts = (siteStyle?.fonts) || [];
  const typo = siteStyle?.typography || {};
  const quoteFamily = (f: string) => (!f ? f : /^["'].*["']$/.test(f) ? f : /[\s,]/.test(f) ? `'${f}'` : f);
  const typoFonts: { label: string; value: string }[] = [];
  if (typo.p?.family) typoFonts.push({ label: 'Corps (style site)', value: quoteFamily(typo.p.family) });
  if (typo.h1?.family) typoFonts.push({ label: 'Titre 1 (style site)', value: quoteFamily(typo.h1.family) });
  if (typo.h2?.family) typoFonts.push({ label: 'Titre 2 (style site)', value: quoteFamily(typo.h2.family) });
  if (typo.h3?.family) typoFonts.push({ label: 'Titre 3 (style site)', value: quoteFamily(typo.h3.family) });
  if (typo.h4?.family) typoFonts.push({ label: 'Titre 4 (style site)', value: quoteFamily(typo.h4.family) });
  if (typo.h5?.family) typoFonts.push({ label: 'Titre 5 (style site)', value: quoteFamily(typo.h5.family) });
  const availableFonts = [
    { label: 'Police par défaut', value: 'inherit' },
    ...typoFonts,
    { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { label: 'Georgia', value: "'Georgia', serif" },
    { label: 'Times', value: "'Times New Roman', Times, serif" },
    { label: 'Courier', value: "'Courier New', Courier, monospace" },
    ...siteFonts.map((f: { name?: string }) => ({
      label: String(f.name || '').trim(),
      value: quoteFamily(String(f.name || '')),
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
      const block = $findMatchingParent(node, (n) => $isElementNode(n) && !(n as import('lexical').ElementNode).isInline());
      if (block && $isHeadingNode(block)) {
        setBlockFormat((block as HeadingNode).getTag());
      } else {
        setBlockFormat('paragraph');
      }
      const ff = $getSelectionStyleValueForProperty(selection, 'font-family', 'inherit');
      setFontFamily(ff || 'inherit');
      const lh = $getSelectionStyleValueForProperty(selection, 'line-height', '1.25');
      setLineHeight(lh || '1.25');
      const col = $getSelectionStyleValueForProperty(selection, 'color', '#000000');
      setTextColor(col || '#000000');
      const bg = $getSelectionStyleValueForProperty(selection, 'background-color', '#ffffff');
      setBgColor(bg || '#ffffff');
      const tt = $getSelectionStyleValueForProperty(selection, 'text-transform', 'none');
      setIsUppercase(tt === 'uppercase');
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

  useEffect(() => {
    if (!showEmoji) return;
    const onDocClick = (e: MouseEvent) => {
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(e.target as Node)) setShowEmoji(false);
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [showEmoji]);

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, {
      url: linkExternal ? url : (url.startsWith('/') ? url : `/${url}`),
      target: linkExternal ? '_blank' : '_self',
      rel: linkExternal ? 'noopener noreferrer' : null,
    });
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const linkSelectValue = (() => {
    const normalized = linkUrl ? linkUrl.replace(/\/$/, '') : '';
    const found = SITE_PAGES.find((page) => page.path === linkUrl || (normalized && (normalized === page.path || linkUrl === page.path)));
    return found?.path ?? '';
  })();

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
        <button
          type="button"
          onClick={() => {
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              const next = isUppercase ? null : 'uppercase';
              $patchStyleText(selection, { 'text-transform': next });
            });
          }}
          className={isUppercase ? 'active' : ''}
          title="Majuscules"
        >
          <span style={{ textTransform: 'uppercase', fontSize: '0.85em' }}>Aa</span>
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
              {linkExternal ? (
                <input
                  ref={(el) => { linkInputRef.current = el; }}
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                    if (e.key === 'Escape') setShowLinkInput(false);
                  }}
                  placeholder="https://..."
                  style={{ width: 200, padding: '4px 8px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: 14 }}
                />
              ) : (
                <>
                  <select
                    value={linkSelectValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLinkUrl(v);
                    }}
                    style={{ padding: '4px 8px', fontSize: 14, border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, minWidth: 180 }}
                    title="Choisir une page (Portrait = galerie ciblée au chargement)"
                  >
                    <option value="">Choisir une page...</option>
                    {(Array.from(new Set(SITE_PAGES.map((page) => page.group).filter(Boolean))) as string[]).map((group) => (
                      <optgroup key={group} label={group}>
                        {SITE_PAGES.filter((page) => page.group === group).map((page) => (
                          <option key={page.path} value={page.path}>{page.label}</option>
                        ))}
                      </optgroup>
                    ))}
                    {SITE_PAGES.filter((page) => !page.group).map((page) => (
                      <option key={page.path} value={page.path}>{page.label}</option>
                    ))}
                  </select>
                  <input
                    ref={(el) => { linkInputRef.current = el; }}
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                      if (e.key === 'Escape') setShowLinkInput(false);
                    }}
                    placeholder="ou saisir un chemin (ex. /galeries)"
                    style={{ width: 180, padding: '4px 8px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: 4, fontSize: 14 }}
                  />
                </>
              )}
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
        <button
          type="button"
          onClick={() => {
            let shouldRemove = false;
            editor.getEditorState().read(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              const listItem = $findMatchingParent(selection.anchor.getNode(), $isListItemNode);
              const list = listItem?.getParent();
              if (list && $isListNode(list) && list.getListType() === 'bullet') shouldRemove = true;
            });
            if (shouldRemove) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            else editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          }}
          title="Liste à puces (recliquer pour annuler)"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => {
            let shouldRemove = false;
            editor.getEditorState().read(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              const listItem = $findMatchingParent(selection.anchor.getNode(), $isListItemNode);
              const list = listItem?.getParent();
              if (list && $isListNode(list) && list.getListType() === 'number') shouldRemove = true;
            });
            if (shouldRemove) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            else editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          }}
          title="Liste numérotée (recliquer pour annuler)"
        >
          1.
        </button>
        <button
          type="button"
          onClick={() => editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)}
          title="Retirer liste (puces ou numérotation)"
        >
          ↩
        </button>
      </div>
      <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')} title="Aligner à gauche">≡</button>
        <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')} title="Centrer">≡</button>
        <button type="button" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')} title="Aligner à droite">≡</button>
        <button
          type="button"
          onClick={() => editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false)}
          title="Retour à la ligne (sans nouveau paragraphe)"
        >
          ↵
        </button>
      </div>
      <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />
      <select
        style={{ padding: '6px 8px', minWidth: 100 }}
        value={blockFormat}
        onChange={(e) => {
          const v = e.target.value;
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            if (v === 'paragraph') {
              $setBlocksType(selection, $createParagraphNode);
            } else if (/^h[1-5]$/.test(v)) {
              $setBlocksType(selection, () => $createHeadingNode(v as 'h1' | 'h2' | 'h3' | 'h4' | 'h5'));
            }
          });
        }}
        title="Style de bloc (Paragraphe / Titres)"
      >
        <option value="paragraph">Paragraphe</option>
        <option value="h1">Titre 1</option>
        <option value="h2">Titre 2</option>
        <option value="h3">Titre 3</option>
        <option value="h4">Titre 4</option>
        <option value="h5">Titre 5</option>
      </select>
      <select
        style={{ padding: '6px 8px', minWidth: 100 }}
        value={availableFonts.some((f) => f.value === fontFamily) ? fontFamily : 'inherit'}
        onChange={(e) => {
          const v = e.target.value;
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            $patchStyleText(selection, { 'font-family': v === 'inherit' ? null : v });
          });
        }}
        title="Police (style du site)"
      >
        {availableFonts.map((f) => (
          <option key={f.label} value={f.value}>{f.label}</option>
        ))}
      </select>
      <select
        style={{ padding: '6px 8px', width: 56 }}
        value={['1', '1.15', '1.25', '1.4', '1.6', '2', 'normal'].includes(lineHeight) ? lineHeight : '1.25'}
        onChange={(e) => {
          const v = e.target.value;
          setLineHeight(v);
          editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) return;
            $patchStyleText(selection, { 'line-height': v });
          });
        }}
        title="Hauteur de ligne"
      >
        <option value="1">1</option>
        <option value="1.15">1.15</option>
        <option value="1.25">1.25</option>
        <option value="1.4">1.4</option>
        <option value="1.6">1.6</option>
        <option value="2">2</option>
        <option value="normal">normal</option>
      </select>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Couleur du texte">
        <input
          type="color"
          value={textColor}
          onChange={(e) => {
            const v = e.target.value;
            setTextColor(v);
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              $patchStyleText(selection, { color: v });
            });
          }}
          style={{ width: 24, height: 24, padding: 0, border: '1px solid rgba(0,0,0,0.2)', cursor: 'pointer' }}
        />
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Couleur de fond">
        <input
          type="color"
          value={bgColor}
          onChange={(e) => {
            const v = e.target.value;
            setBgColor(v);
            editor.update(() => {
              const selection = $getSelection();
              if (!$isRangeSelection(selection)) return;
              $patchStyleText(selection, { 'background-color': v });
            });
          }}
          style={{ width: 24, height: 24, padding: 0, border: '1px solid rgba(0,0,0,0.2)', cursor: 'pointer' }}
        />
      </span>
      <span ref={(el) => { emojiPanelRef.current = el; }} style={{ position: 'relative' }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); setShowEmoji((s) => !s); }} title="Insérer un emoji">😀</button>
        {showEmoji && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              padding: 8,
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 6,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxHeight: 200,
              overflowY: 'auto',
              zIndex: 100,
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 4,
            }}
          >
            {['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','😉','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','👍','👎','👏','🙌','👋','🤚','🖐','✋','❤️','🧡','💛','💚','💙','💜','🖤','💯','✨','🔥','⭐','🌟'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                style={{ fontSize: 18, padding: 4, cursor: 'pointer', border: 'none', background: 'transparent' }}
                onClick={() => {
                  editor.update(() => {
                    const selection = $getSelection();
                    if (!$isRangeSelection(selection)) return;
                    $insertNodes([$createTextNode(emoji)]);
                  });
                  setShowEmoji(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </span>
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
            className="lexical-content-editable richtext-content tiptap-editor"
            style={{ minHeight: 200, padding: 12, border: '1px solid #e6e6e6', borderRadius: 6, outline: 'none', color: 'var(--color-text)', background: 'var(--bg-color)' }}
            aria-placeholder="Saisir ici..."
            spellCheck={false}
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
