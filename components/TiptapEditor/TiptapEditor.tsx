"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import HardBreak from '@tiptap/extension-hard-break';
import { Extension } from '@tiptap/core';
import { useSiteStyle } from '../SiteStyle/SiteStyleProvider';
// Paragraph is included in StarterKit, do not re-add it (avoids duplicate extension names)

export default function TiptapEditor({ initialContent = '', onChange, onReady, onError } : { initialContent?: string; onChange?: (html: string) => void; onReady?: () => void; onError?: (err: any) => void }) {
  console.debug('[TiptapEditor] initializing', { initialContent });

  const [showEmoji, setShowEmoji] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>('inherit');
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineHeight, setLineHeight] = useState<number>(1.4);
  const [textColor, setTextColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [format, setFormat] = useState<string>('paragraph');

  // access site-uploaded fonts so they appear in the editor font list
  const { style: siteStyle } = useSiteStyle();
  const siteFonts = (siteStyle && siteStyle.fonts) || [];
  const availableFonts = [
    { label: 'Helvetica', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { label: 'Georgia', value: "'Georgia', serif" },
    { label: 'Times', value: "'Times New Roman', Times, serif" },
    { label: 'Courier', value: "'Courier New', Courier, monospace" },
    // append uploaded fonts (quote names with spaces)
    ...siteFonts.map((f: any) => {
      const name = String(f.name || '').trim();
      const value = /[\s,]/.test(name) ? `'${name}'` : name;
      return { label: name, value };
    })
  ];

  // Minimal editor configuration to avoid runtime issues while debugging
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      // Add attributes to the textStyle mark so we can set fontSize/fontFamily/lineHeight/background reliably
      Extension.create({
        name: 'rteTextAttrs',
        addGlobalAttributes() {
          return [{
            types: ['textStyle'],
            attributes: {
              fontSize: {
                default: null,
                parseHTML: (el: any) => el.style && el.style.fontSize ? el.style.fontSize : null,
                renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}
              },
              fontFamily: {
                default: null,
                parseHTML: (el: any) => el.style && el.style.fontFamily ? el.style.fontFamily : null,
                renderHTML: attrs => attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {}
              },
              lineHeight: {
                default: null,
                parseHTML: (el: any) => el.style && el.style.lineHeight ? el.style.lineHeight : null,
                renderHTML: attrs => attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {}
              },
              fontWeight: {
                default: null,
                parseHTML: (el: any) => el.style && el.style.fontWeight ? el.style.fontWeight : null,
                renderHTML: attrs => attrs.fontWeight ? { style: `font-weight: ${attrs.fontWeight}` } : {}
              },
              background: {
                default: null,
                parseHTML: (el: any) => el.style && el.style.backgroundColor ? el.style.backgroundColor : null,
                renderHTML: attrs => attrs.background ? { style: `background-color: ${attrs.background}` } : {}
              }
            }
          }];
        }
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
      Link,
      Placeholder.configure({ placeholder: 'Saisir ici...' }),
      Image,
      HardBreak,
      // Make Enter insert a hard break (like Shift+Enter) except in list items, headings and code blocks
      Extension.create({
        name: 'enterAsHardBreak',
        addKeyboardShortcuts() {
          return {
            Enter: () => {
              try {
                const state = this.editor.state;
                const { $from } = state.selection;
                const parent = $from.parent;
                if (!parent) return false;
                const forbidden = ['listItem', 'codeBlock', 'heading'];
                if (forbidden.includes(parent.type.name)) return false;
                return this.editor.commands.setHardBreak();
              } catch (e) {
                return false;
              }
            }
          };
        }
      }),
    ],
    content: initialContent || '',
    onUpdate: ({ editor }) => {
      try {
        const html = editor.getHTML();
        console.debug('[TiptapEditor] onUpdate', { length: html.length });
        onChange?.(html);
      } catch (err) {
        console.error('[TiptapEditor] onUpdate error', err);
        onError?.(err);
      }
    },
  });

  // track last non-empty selection so clicks on toolbar (which blur the editor)
  // can still apply styles to the previously selected range
  const lastSelectionRef = useRef<{ from: number; to: number } | null>(null);
  // bump this to force re-renders when selection state changes so buttons can enable/disable
  const [, setSelVer] = useState(0);
  useEffect(() => {
    if (editor) {
      try {
        console.debug('[TiptapEditor] editor ready', editor);
        // expose to window for live debugging
        try { (window as any).__tiptapEditor = editor; } catch {}
        // attach light-weight diagnostic listeners
        editor.on('update', () => console.debug('[TiptapEditor] editor update event'));
        editor.on('transaction', () => console.debug('[TiptapEditor] editor transaction'));
        // selectionUpdate fires when user changes selection
        try {
          editor.on('selectionUpdate', () => {
            try {
              const sel = editor.state.selection;
              if (!sel.empty) {
                lastSelectionRef.current = { from: sel.from, to: sel.to };
                setSelVer(v => v + 1);
              }
            } catch (e) {}
          });
          // also capture current selection if editor was initialized with a selection
          try {
            const sel0 = editor.state.selection;
            if (sel0 && !sel0.empty) { lastSelectionRef.current = { from: sel0.from, to: sel0.to }; setSelVer(v => v + 1); }
          } catch (e) {}
        } catch (e) {}

        // Capture selection from DOM on mouseup/keyup in case toolbar clicks steal focus before selectionUpdate
        const captureSelectionFromDOM = () => {
          try {
            const s = window.getSelection();
            if (!s || s.rangeCount === 0) return;
            const range = s.getRangeAt(0);
            // ensure selection is inside editor
            const editorDom = (editor as any).view?.dom;
            if (!editorDom) return;
            if (!editorDom.contains(range.startContainer) && !editorDom.contains(range.endContainer)) return;
            const view = (editor as any).view;
            const from = view.posAtDOM(range.startContainer, range.startOffset);
            const to = view.posAtDOM(range.endContainer, range.endOffset);
            if (typeof from === 'number' && typeof to === 'number') {
              lastSelectionRef.current = { from, to };
              setSelVer(v => v + 1);
            }
          } catch (e) {}
        };
        document.addEventListener('mouseup', captureSelectionFromDOM);
        document.addEventListener('keyup', captureSelectionFromDOM);
        onReady?.();
      } catch (err) {
        console.error('[TiptapEditor] onReady handler threw', err);
        onError?.(err);
      }
    }
    return () => {
      try {
        console.debug('[TiptapEditor] destroying editor');
        document.removeEventListener('mouseup', () => {});
        document.removeEventListener('keyup', () => {});
        editor?.destroy();
      } catch (err) {
        console.error('[TiptapEditor] destroy error', err);
      }
    };
  }, [editor]);

  if (!editor) return <div style={{ padding: 12, color: 'var(--muted)' }}>Initialisation de l'éditeur...</div>;

  const insertEmoji = (emoji: string) => editor.chain().focus().insertContent(emoji).run();


  function parseStyle(style: string) {
    const obj: Record<string,string> = {};
    style.split(';').map(s => s.trim()).filter(Boolean).forEach(pair => {
      const [k,v] = pair.split(':').map(x => x && x.trim());
      if (k && v) obj[k] = v;
    });
    return obj;
  }

  function buildStyle(obj: Record<string,string>) {
    return Object.entries(obj).map(([k,v]) => `${k}: ${v}`).join('; ');
  }

  function applyStyleProps(props: { fontFamily?: string | null; fontSize?: number | null; lineHeight?: number | null; fontWeight?: string | number | null; color?: string | null; background?: string | null }) {
    try {
      const attrs = editor.getAttributes('textStyle') as any;
      const current = String(attrs.style || '');
      const sel = editor.state.selection;
      console.debug('[TiptapEditor] applyStyleProps', { props, selection: { from: sel.from, to: sel.to, empty: sel.empty }, current });
      const parsed = parseStyle(current);

      // Use explicit mark attributes (registered via our custom extension) whenever possible
      const markAttrs: any = {};
      if (props.fontFamily != null) {
        let fam: string | null = props.fontFamily === 'inherit' ? null : String(props.fontFamily);
        // ensure font-family with spaces/comma is quoted
        if (fam && /[\s,]/.test(fam) && !/^['"]/.test(fam)) fam = `'${fam}'`;
        markAttrs.fontFamily = fam;
      }
      if (props.fontSize != null) {
        markAttrs.fontSize = `${props.fontSize}px`;
      }
      if (props.lineHeight != null) {
        markAttrs.lineHeight = `${props.lineHeight}`;
      }
      if (props.fontWeight != null) {
        markAttrs.fontWeight = String(props.fontWeight);
      }

      // Prefer high-level color command when changing color (uses Color extension)
      if (props.color != null) {
        try {
          editor.chain().focus().setColor(props.color).run();
          // color handled; if only color requested, return early
          if (!props.fontFamily && !props.fontSize && !props.lineHeight && !props.background) {
            try { console.debug('[TiptapEditor] setColor command applied, returning'); } catch (e) {}
            return;
          }
        } catch (e) {
          console.warn('[TiptapEditor] setColor command threw', e);
          markAttrs.color = props.color;
        }
      }

      if (props.background != null) {
        markAttrs.background = props.background;
      }

      const hasMarkAttrs = Object.keys(markAttrs).length > 0;
      const style = hasMarkAttrs ? '' : buildStyle(parsed);
      if (hasMarkAttrs) console.debug('[TiptapEditor] applying mark attrs', markAttrs, { lastSelection: lastSelectionRef.current }); else console.debug('[TiptapEditor] applying textStyle:', style, { lastSelection: lastSelectionRef.current });
      // Remember HTML before applying so we can detect if the operation had an effect
      let beforeHTML = '<<unable to read>>';
      try { beforeHTML = editor.getHTML(); } catch (e) {}

      // If current selection is empty, try to recover it from lastSelectionRef or DOM selection
      try {
        if (editor.state.selection.empty && !lastSelectionRef.current) {
          try {
            const s = window.getSelection();
            if (s && s.rangeCount) {
              const range = s.getRangeAt(0);
              const view = (editor as any).view;
              if (view && view.dom && (view.dom.contains(range.startContainer) || view.dom.contains(range.endContainer))) {
                const from = view.posAtDOM(range.startContainer, range.startOffset);
                const to = view.posAtDOM(range.endContainer, range.endOffset);
                if (typeof from === 'number' && typeof to === 'number') {
                  lastSelectionRef.current = { from, to };
                }
              }
            }
          } catch (e) {}
        }

        if (editor.state.selection.empty && !lastSelectionRef.current) {
          console.warn('[TiptapEditor] no selection available to apply styles');
          return;
        }

        if (editor.state.selection.empty && lastSelectionRef.current) {
          const rs = lastSelectionRef.current;
          if (hasMarkAttrs) {
            editor.chain().focus().setTextSelection({ from: rs.from, to: rs.to }).setMark('textStyle', markAttrs).run();
          } else {
            editor.chain().focus().setTextSelection({ from: rs.from, to: rs.to }).setMark('textStyle', { style }).run();
          }
        } else {
          if (hasMarkAttrs) {
            editor.chain().focus().setMark('textStyle', markAttrs).run();
          } else {
            editor.chain().focus().setMark('textStyle', { style }).run();
          }
        }
      } catch (e) {
        console.warn('[TiptapEditor] setMark threw', e);
      }

      // log resulting html fragment for quick verification
      try { console.debug('[TiptapEditor] result HTML fragment', editor.getHTML().slice(0, 400)); } catch (e) {}

      // If the html didn't change or doesn't include our style attribute, try a lower-level transaction
      try {
        const afterHTML = editor.getHTML();
        if (beforeHTML === afterHTML || (style && !afterHTML.includes(style.split(';')[0].trim()))) {
          console.warn('[TiptapEditor] setMark appears to have had no effect, attempting fallback transaction');
          const state = (editor as any).state;
          const view = (editor as any).view;
          const markType = state.schema.marks.textStyle;
          if (!markType) {
            console.error('[TiptapEditor] textStyle mark not found in schema');
          } else {
            const sel = state.selection;
            const from = (lastSelectionRef.current && lastSelectionRef.current.from) || sel.from;
            const to = (lastSelectionRef.current && lastSelectionRef.current.to) || sel.to;
            console.debug('[TiptapEditor] fallback addMark', { from, to, style });

            // Log nodes covered by selection to see why mark may not be allowed
            const nodeTypes: string[] = [];
            state.doc.nodesBetween(from, to, (node: any) => { nodeTypes.push(node.type.name); });
            console.debug('[TiptapEditor] selection node types', nodeTypes);

            // Attempt to addMark across whole range
            const addAttrs = hasMarkAttrs ? markAttrs : { style };
            let tr = state.tr.addMark(from, to, markType.create(addAttrs));
            view.dispatch(tr);
            try { view.focus(); } catch (e) {}

            // Verify effect
            try { console.debug('[TiptapEditor] post-fallback HTML', editor.getHTML().slice(0,400)); } catch (e) {}

            // If still no effect, try applying per-text-node instead
            try {
              const after = editor.getHTML();
              const needle = hasMarkAttrs ? JSON.stringify(addAttrs) : style.split(';')[0].trim();
              if (beforeHTML === after || (style && !after.includes(needle))) {
                console.warn('[TiptapEditor] fallback addMark did not change HTML; applying per-text-node');
                // Re-read the current state from the view to avoid dispatching transactions created from a stale state
                const curState = view.state;
                const perNodeTr = curState.tr;
                curState.doc.nodesBetween(from, to, (node: any, pos: number) => {
                  if (node.isText) {
                    perNodeTr.addMark(pos, pos + node.text!.length, markType.create(addAttrs));
                  }
                });
                try {
                  view.dispatch(perNodeTr);
                } catch (e) {
                  // This may happen if positions are invalid relative to the current state; try applying per-node sequentially
                  console.warn('[TiptapEditor] per-node dispatch failed, trying sequential node dispatch', e);
                  try {
                    curState.doc.nodesBetween(from, to, (node: any, pos: number) => {
                      if (node.isText) {
                        const t = view.state.tr.addMark(pos, pos + node.text!.length, markType.create(addAttrs));
                        view.dispatch(t);
                      }
                    });
                  } catch (e2) {
                    console.error('[TiptapEditor] sequential per-node dispatch error', e2);
                  }
                }

                try { view.focus(); } catch (e) {}
                try { console.debug('[TiptapEditor] post-per-node HTML', editor.getHTML().slice(0,400)); } catch (e) {}

                // Verification: list marks on each text node in selection (from fresh state)
                try {
                  const verify: Array<{ pos: number; text: string; marks: any[] }> = [];
                  const freshState = view.state;
                  freshState.doc.nodesBetween(from, to, (node: any, pos: number) => {
                    if (node.isText) {
                      verify.push({ pos, text: node.text || '', marks: node.marks.map((m: any) => ({ name: m.type.name, attrs: m.attrs })) });
                    }
                  });
                  console.debug('[TiptapEditor] per-node marks after apply', verify.slice(0,20));

                } catch (e) {
                  console.error('[TiptapEditor] verify marks error', e);
                }
              }
            } catch (e) {
              console.error('[TiptapEditor] per-node fallback error', e);
            }
          }
        }
      } catch (e) {
        console.error('[TiptapEditor] fallback transaction error', e);
      }
    } catch (err) {
      console.error('[TiptapEditor] applyStyleProps error', err);
    }
  }

  // Note: image/font/advanced controls removed in minimal config to avoid extension errors.

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
        {/* History group */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button title="Annuler" onClick={() => editor.chain().focus().undo().run()} style={{ padding: 6 }}>⤺</button>
          <button title="Rétablir" onClick={() => editor.chain().focus().redo().run()} style={{ padding: 6 }}>⤻</button>
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />

        {/* Style group */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'active' : ''} title="Gras"> <strong>B</strong> </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'active' : ''} title="Italique"> <em>I</em> </button>
          <button id="rte-underline-btn" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'active' : ''} title="Souligné"> <span style={{ textDecoration: 'underline' }}>U</span> </button>
          {/* Text color: pick color first (swatch), then click A to apply to selection (Word-like flow) */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {(() => {
              const selectionAvailable = !editor.state.selection.empty || Boolean(lastSelectionRef.current);
              return (
                <button title="Appliquer couleur du texte" onClick={() => { applyStyleProps({ color: textColor }); }} style={{ padding: 6, opacity: selectionAvailable ? 1 : 0.4 }} disabled={!selectionAvailable}>
                  <span style={{ display: 'inline-block', borderBottom: `4px solid ${textColor}`, fontWeight: 700 }}>A</span>
                </button>
              );
            })()}
            <div style={{ position: 'relative' }}>
              <label title="Choisir couleur du texte" style={{ display: 'inline-block', cursor: 'pointer' }}>
                <span style={{ display: 'inline-block', width: 16, height: 12, background: textColor, border: '1px solid rgba(0,0,0,0.12)', marginLeft: 4 }} />
                <input id="rte-text-color-input" type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); }}
                  style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, border: 0, padding: 0, margin: 0, cursor: 'pointer' }} />
              </label>
            </div>

            {/* Add a simple line-break button (inserts a <br>, Shift+Enter also works) */}
            <button title="Saut de ligne (Shift+Enter)" onClick={() => { editor.chain().focus().setHardBreak().run(); }} style={{ padding: 6 }}>
              ↵
            </button>
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />

        {/* Alignment group */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button title="Aligner à gauche" onClick={() => editor.chain().focus().setTextAlign('left').run()} style={{ padding: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="14" height="2" fill="currentColor"/><rect x="3" y="8" width="14" height="2" fill="currentColor"/><rect x="3" y="12" width="10" height="2" fill="currentColor"/><rect x="3" y="16" width="14" height="2" fill="currentColor"/></svg>
          </button>
          <button title="Centrer" onClick={() => editor.chain().focus().setTextAlign('center').run()} style={{ padding: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="4" width="14" height="2" fill="currentColor"/><rect x="5" y="8" width="14" height="2" fill="currentColor"/><rect x="7" y="12" width="10" height="2" fill="currentColor"/><rect x="5" y="16" width="14" height="2" fill="currentColor"/></svg>
          </button>
          <button title="Aligner à droite" onClick={() => editor.chain().focus().setTextAlign('right').run()} style={{ padding: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="4" width="14" height="2" fill="currentColor"/><rect x="7" y="8" width="14" height="2" fill="currentColor"/><rect x="11" y="12" width="10" height="2" fill="currentColor"/><rect x="7" y="16" width="14" height="2" fill="currentColor"/></svg>
          </button>
        </div>

        {/* Background color controls placed to the right of alignment buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          {(() => {
            const selectionAvailable = !editor.state.selection.empty || Boolean(lastSelectionRef.current);
            return (
              <button title="Appliquer couleur de fond" onClick={() => { applyStyleProps({ background: bgColor }); }} style={{ padding: 6, opacity: selectionAvailable ? 1 : 0.4 }} disabled={!selectionAvailable}>
                <span style={{ display: 'inline-block', width: 16, height: 12, background: bgColor, border: '1px solid rgba(0,0,0,0.12)', margin: 6 }} />
              </button>
            );
          })()}

          <div style={{ position: 'relative' }}>
            <label title="Choisir couleur de fond" style={{ display: 'inline-block', cursor: 'pointer' }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, background: bgColor, border: '1px solid rgba(0,0,0,0.12)' }} />
              <input id="rte-bg-color-input" type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); }}
                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, border: 0, padding: 0, margin: 0, cursor: 'pointer' }} />
            </label>
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />

        {/* Lists group */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button title="Liste à puces" onClick={() => editor.chain().focus().toggleBulletList().run()} style={{ padding: 6 }}>•</button>
          <button title="Liste numérotée" onClick={() => editor.chain().focus().toggleOrderedList().run()} style={{ padding: 6 }}>1.</button>
        </div>

        <div style={{ width: 1, height: 24, background: 'rgba(0,0,0,0.08)' }} />

        {/* Typography group */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={format} onChange={(e) => {
              const v = e.target.value; setFormat(v);
              if (v === 'paragraph') {
                editor.chain().focus().setNode('paragraph').setMark('textStyle', { fontSize: null, fontFamily: null }).run();
              } else if (v.startsWith('h')) {
                const lvl = Number(v.slice(1));
                // If there's no selection (cursor), convert the whole block to heading
                const sel = editor.state.selection;
                if (sel.empty) {
                  editor.chain().focus().setNode('heading', { level: lvl }).setMark('textStyle', { fontSize: null, fontFamily: null, fontWeight: null }).run();
                } else {
                  // Apply inline heading-like style to the selection only using site style when available
                  const t = siteStyle && siteStyle.typography ? siteStyle.typography : {};
                  const hKey = `h${lvl}`;
                  const h: any = t[hKey] || {};
                  const markProps: any = {};
                  if (h.family) markProps.fontFamily = h.family;
                  if (h.size) {
                    const s = String(h.size).replace('px','').trim();
                    const num = Number(s);
                    if (!isNaN(num)) markProps.fontSize = num;
                  }
                  if (h.weight) markProps.fontWeight = h.weight;
                  if (h.lineHeight) {
                    const lh = String(h.lineHeight).trim();
                    const lhn = Number(lh);
                    if (!isNaN(lhn)) markProps.lineHeight = lhn;
                  }
                  applyStyleProps(markProps);
                }
              }
            }} style={{ padding: '6px 8px' }}>
            <option value="paragraph">Paragraphe</option>
            <option value="h1">Titre 1</option>
            <option value="h2">Titre 2</option>
            <option value="h3">Titre 3</option>
            <option value="h4">Titre 4</option>
            <option value="h5">Titre 5</option>
          </select>

          <select value={fontSize} onChange={(e) => { const v = Number(e.target.value); setFontSize(v); applyStyleProps({ fontSize: v }); }} style={{ padding: '6px 8px' }}>
            <option value={12}>12 px</option>
            <option value={14}>14 px</option>
            <option value={16}>16 px</option>
            <option value={18}>18 px</option>
            <option value={24}>24 px</option>
            <option value={32}>32 px</option>
          </select>

          <select value={lineHeight} onChange={(e) => { const v = Number(e.target.value); setLineHeight(v); applyStyleProps({ lineHeight: v }); }} style={{ padding: '6px 8px' }}>
            <option value={1.0}>1.0</option>
            <option value={1.2}>1.2</option>
            <option value={1.4}>1.4</option>
            <option value={1.6}>1.6</option>
            <option value={2.0}>2.0</option>
          </select>

          {/* Font family, size, line-height and single color control (no duplicates) */}
          {/* include site-uploaded fonts from SiteStyleProvider */}
          <select value={fontFamily} onChange={(e) => { const v = e.target.value; setFontFamily(v); applyStyleProps({ fontFamily: v }); }} style={{ padding: '6px 8px' }}>
            <option value="inherit">Police par défaut</option>
            {availableFonts.map((f: any) => (
              <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>{f.label}</option>
            ))}
          </select>

          {/* (no duplicate color control here) */}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowEmoji((s) => !s)} title="Emoji">😀</button>
          <button onClick={() => { editor.chain().focus().unsetAllMarks().clearNodes().run(); }} title="Effacer" style={{ padding: 6 }}>Clear</button>

        </div>
      </div>

      {showEmoji && (
        <div style={{ border: `1px solid var(--border)`, borderRadius: 6, padding: 8, marginBottom: 8, background: 'var(--surface)' }}>
          {['😀','😃','😅','😂','🤣','😊','😍','😘','👍','🙏','🎉','🔥','❤️','💡','✅','❌','⭐','🌟','🍀','🎵'].map(e => (
            <button key={e} onClick={() => { insertEmoji(e); setShowEmoji(false); }} style={{ fontSize: 18, padding: 6, margin: 4 }}>{e}</button>
          ))}
        </div>
      )}

      <div style={{ border: '1px solid #e6e6e6', borderRadius: 6 }}>
        <EditorContent editor={editor} className="tiptap-editor" />
      </div>


    </div>
  );
}
