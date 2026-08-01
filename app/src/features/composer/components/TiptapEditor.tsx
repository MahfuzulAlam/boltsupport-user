import { useEffect } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { MergeField } from '../merge-field'
import type { ComposerMode } from '../hooks/use-composer-draft'

interface TiptapEditorProps {
  mode: ComposerMode
  html: string
  onChange: (html: string) => void
  onSlashTrigger: () => void
  /** Receives the instance for imperative commands. Store it in a ref, never in state. */
  onReady?: (editor: Editor) => void
}

const PLACEHOLDER: Record<ComposerMode, string> = {
  reply: 'Type your reply. Press / for saved replies, Command and Enter to send.',
  note: 'Write an internal note. Only your team sees this.',
  forward: 'Add a line for whoever you are sending this to. The thread is quoted below.',
}

/**
 * The reply surface.
 *
 * `data-rich-text-editor` is what tells the global hotkey layer to cede Cmd+K here, where it
 * means insert a link rather than open the palette. The rule is declared once in
 * `src/lib/shortcuts.ts` and honoured by this attribute.
 */
export function TiptapEditor({ mode, html, onChange, onSlashTrigger, onReady }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      MergeField,
      Placeholder.configure({ placeholder: PLACEHOLDER[mode] }),
    ],
    content: html,
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[96px] text-[15px] leading-[1.6]',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': mode === 'note' ? 'Internal note body' : 'Reply body',
      },
      handleKeyDown: (_view, event) => {
        // "/" on an empty line opens the insert menu, the way the slash menu is discovered.
        if (event.key === '/' && editor?.isEmpty === true) {
          event.preventDefault()
          onSlashTrigger()
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (instance.isDestroyed) return
      onChange(instance.getHTML())
    },
  })

  useEffect(() => {
    if (editor !== null && !editor.isDestroyed) onReady?.(editor)
  }, [editor, onReady])

  // Restoring a draft, or clearing after a send, has to reach the editor without wiping what
  // the agent is currently typing.
  useEffect(() => {
    // `isDestroyed` matters: StrictMode mounts, tears down, and remounts, and reading from a
    // destroyed editor throws inside ProseMirror's serializer. Unguarded, that crash escapes to
    // the route boundary and takes the whole conversation screen down with it.
    if (editor === null || editor.isDestroyed) return
    if (html !== editor.getHTML()) {
      editor.commands.setContent(html, { emitUpdate: false })
    }
    // Only when the incoming value genuinely differs, never on every keystroke.
  }, [editor, html])

  return <EditorContent editor={editor} data-rich-text-editor />
}
