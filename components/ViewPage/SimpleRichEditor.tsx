"use client";
import React, { useRef, useEffect, useCallback } from 'react';
import styles from './SimpleRichEditor.module.css';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLS: { cmd: string; label: string; title: string }[] = [
  { cmd: 'bold',          label: '<b>B</b>',   title: 'Gras' },
  { cmd: 'italic',        label: '<i>I</i>',   title: 'Italique' },
  { cmd: 'underline',     label: '<u>U</u>',   title: 'Souligné' },
  { cmd: 'strikeThrough', label: '<s>S</s>',   title: 'Barré' },
  { cmd: 'justifyLeft',   label: '⬅',          title: 'Gauche' },
  { cmd: 'justifyCenter', label: '☰',          title: 'Centre' },
  { cmd: 'justifyRight',  label: '➡',          title: 'Droite' },
  { cmd: 'insertUnorderedList', label: '•—',   title: 'Liste' },
];

export default function SimpleRichEditor({ value, onChange, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialise content once on mount
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function execCmd(cmd: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function execCmdWithValue(cmd: string, val: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function handleInput() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        {TOOLS.map(({ cmd, label, title }) => (
          <button
            key={cmd}
            type="button"
            title={title}
            className={styles.toolBtn}
            onMouseDown={(e) => { e.preventDefault(); execCmd(cmd); }}
            dangerouslySetInnerHTML={{ __html: label }}
          />
        ))}
        <label className={styles.colorTool} title="Couleur du texte">
          A
          <input
            type="color"
            className={styles.colorInput}
            defaultValue="#000000"
            onChange={(e) => execCmdWithValue('foreColor', e.target.value)}
          />
        </label>
        <label className={styles.fontSizeTool} title="Taille">
          <select
            className={styles.fontSizeSelect}
            defaultValue=""
            onChange={(e) => { if (e.target.value) execCmdWithValue('fontSize', e.target.value); }}
          >
            <option value="" disabled>Taille</option>
            {[1,2,3,4,5,6,7].map((n) => (
              <option key={n} value={String(n)}>{[10,13,16,18,24,32,48][n-1]}px</option>
            ))}
          </select>
        </label>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className={styles.editor}
        onInput={handleInput}
        data-placeholder={placeholder || 'Votre texte ici…'}
      />
    </div>
  );
}
