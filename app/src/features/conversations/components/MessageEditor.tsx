import { useEffect, useRef, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MessageEditorProps {
  bodyHtml: string
  onSave: (bodyHtml: string) => void
  onCancel: () => void
}

/**
 * Editing a message in place.
 *
 * Deliberately a plain textarea over the HTML rather than the rich text editor: the reason this
 * action exists is redaction, so what an agent needs is to see and delete an exact string, and a
 * WYSIWYG surface hides half of what they are trying to remove. It also cannot mangle the markup
 * of an email it did not author.
 */
export function MessageEditor({ bodyHtml, onSave, onCancel }: MessageEditorProps) {
  const [value, setValue] = useState(bodyHtml)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  const dirty = value.trim() !== bodyHtml.trim() && value.trim() !== ''

  return (
    <div>
      <div
        className="mb-2 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px]"
        style={{ background: 'var(--warning-soft)', color: 'var(--foreground)' }}
      >
        <ShieldAlert
          className="size-3.5 shrink-0"
          style={{ color: 'var(--warning-strong)' }}
          aria-hidden="true"
        />
        <span>
          Editing changes what everyone on your team sees. The message is marked as edited.
        </span>
      </div>

      <textarea
        ref={ref}
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel()
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && dirty) onSave(value)
        }}
        aria-label="Message body"
        spellCheck={false}
        className="min-h-[160px] w-full resize-y rounded-md border p-3 font-mono text-[13px] leading-[1.6] outline-none"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      />

      <div className="mt-2 flex items-center gap-2">
        <Button
          disabled={!dirty}
          onClick={() => {
            onSave(value)
          }}
        >
          Save changes
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
