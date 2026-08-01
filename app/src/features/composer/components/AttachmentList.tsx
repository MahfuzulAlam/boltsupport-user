import { useEffect, useRef, useState } from 'react'
import { Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'
import { checkAttachment, formatBytes, MAX_ATTACHMENT_BYTES } from '@/lib/attachments'

export interface PendingAttachment {
  id: string
  name: string
  size: number
  type: string
}

interface AttachmentListProps {
  attachments: PendingAttachment[]
  onAdd: (files: PendingAttachment[]) => void
  onRemove: (id: string) => void
  /** Set by the parent so the slash menu's Attachment item can open the picker. */
  registerPicker: (open: () => void) => void
}

/**
 * Attachments, validated before they are ever listed.
 *
 * A rejected file is reported by name and reason rather than silently dropped, because an agent
 * who thinks they attached a log and did not will send a reply that reads as nonsense.
 */
export function AttachmentList({
  attachments,
  onAdd,
  onRemove,
  registerPicker,
}: AttachmentListProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // Handing the opener upward is a side effect, so it belongs in an effect. Doing it during
  // render reads a ref before it is attached and re-registers on every keystroke.
  useEffect(() => {
    registerPicker(() => {
      inputRef.current?.click()
    })
  }, [registerPicker])

  const accept = (files: FileList | null) => {
    if (files === null) return
    const accepted: PendingAttachment[] = []

    for (const file of files) {
      const check = checkAttachment(file)
      if (check.ok) {
        accepted.push({
          id: `${file.name}-${String(file.size)}-${String(accepted.length)}`,
          name: file.name,
          size: file.size,
          type: file.type,
        })
      } else {
        toast.error('That file was not attached', { description: check.message })
      }
    }

    if (accepted.length > 0) onAdd(accepted)
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => {
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        accept(event.dataTransfer.files)
      }}
      className="rounded-md"
      style={
        dragging
          ? {
              outline: '2px dashed var(--brand)',
              outlineOffset: 2,
              background: 'var(--brand-soft)',
            }
          : undefined
      }
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        aria-label="Attach files"
        onChange={(event) => {
          accept(event.target.files)
          event.target.value = ''
        }}
      />

      {attachments.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[13px]"
              style={{ borderColor: 'var(--border)' }}
            >
              <Paperclip
                className="size-3.5 shrink-0"
                style={{ color: 'var(--muted-foreground)' }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
              <span className="font-mono text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                {formatBytes(attachment.size)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${attachment.name}`}
                onClick={() => {
                  onRemove(attachment.id)
                }}
                className="flex size-5 items-center justify-center rounded hover:bg-[color:var(--hover)]"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {dragging ? (
        <p className="py-3 text-center text-[13px]" style={{ color: 'var(--brand)' }}>
          Drop files to attach, {formatBytes(MAX_ATTACHMENT_BYTES)} max
        </p>
      ) : null}
    </div>
  )
}
