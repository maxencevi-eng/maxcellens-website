import React, { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

export default function App() {
  const [html, setHtml] = useState('<p>Initial content</p>')
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Placeholder.configure({ placeholder: 'Write here...' })],
    content: html,
    onUpdate: ({ editor }) => setHtml(editor.getHTML())
  })

  return (
    <div style={{ padding: 24 }}>
      <h2>TipTap minimal repro</h2>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => { editor?.chain().focus().toggleBold().run() }}>Bold</button>
        <button onClick={() => { editor?.chain().focus().toggleItalic().run() }}>Italic</button>
      </div>
      <div style={{ border: '1px solid #ddd', borderRadius: 6 }}>
        {editor ? <EditorContent editor={editor} /> : <div style={{ padding: 16 }}>Editor not initialized</div>}
      </div>
      <h3>Output HTML</h3>
      <pre style={{ background: '#f6f6f6', padding: 12 }}>{html}</pre>
    </div>
  )
}
