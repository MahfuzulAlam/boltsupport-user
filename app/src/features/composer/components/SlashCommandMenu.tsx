import { useEffect, useRef } from 'react'
import {
  Blocks,
  BookOpen,
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  Paperclip,
  Quote,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { shortcutDisplay, type ShortcutId } from '@/lib/shortcuts'

export type SlashAction =
  | 'saved-reply'
  | 'insert-doc'
  | 'draft-with-ai'
  | 'attachment'
  | 'variable'
  | 'image'
  | 'link'
  | 'code'
  | 'blockquote'

interface SlashCommandMenuProps {
  open: boolean
  aiEnabled: boolean
  onSelect: (action: SlashAction) => void
  onClose: () => void
}

interface Item {
  action: SlashAction
  label: string
  icon: LucideIcon
  shortcut?: ShortcutId
  ai?: boolean
}

const ITEMS: Item[] = [
  { action: 'saved-reply', label: 'Saved reply', icon: Zap, shortcut: 'savedReplies' },
  { action: 'insert-doc', label: 'Insert doc', icon: BookOpen, shortcut: 'docsSearch' },
  {
    action: 'draft-with-ai',
    label: 'Draft with AI',
    icon: Sparkles,
    shortcut: 'draftWithAi',
    ai: true,
  },
  { action: 'attachment', label: 'Attachment', icon: Paperclip },
  { action: 'variable', label: 'Variable', icon: Blocks },
  { action: 'image', label: 'Image', icon: ImageIcon },
  { action: 'link', label: 'Link', icon: LinkIcon },
  { action: 'code', label: 'Code', icon: Code },
  { action: 'blockquote', label: 'Blockquote', icon: Quote },
]

export function SlashCommandMenu({ open, aiEnabled, onSelect, onClose }: SlashCommandMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, onClose])

  if (!open) return null

  const items = ITEMS.filter((item) => item.ai !== true || aiEnabled)

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Insert"
      className="absolute bottom-[52px] left-2 z-[60] w-[262px] rounded-lg p-1.5"
      style={{
        background: 'var(--popover)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        animation: 'popin 140ms ease-out',
      }}
    >
      <p className="eyebrow px-2 pt-1 pb-1.5">Insert</p>
      {items.map((item) => (
        <button
          key={item.action}
          type="button"
          role="menuitem"
          onClick={() => {
            onSelect(item.action)
          }}
          className="flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[14px] hover:bg-[color:var(--hover)]"
          style={item.ai === true ? { color: 'var(--ai)', fontWeight: 500 } : undefined}
        >
          <item.icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{item.label}</span>
          {item.shortcut !== undefined ? (
            <kbd className="kbd ml-auto">{shortcutDisplay(item.shortcut)}</kbd>
          ) : null}
        </button>
      ))}
    </div>
  )
}
