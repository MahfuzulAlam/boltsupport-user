import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Zap } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useArticles, useSavedReplies } from '@/features/docs'

export type InsertSource = 'doc' | 'saved-reply'

interface InsertPickerProps {
  source: InsertSource
  /**
   * Receives HTML to drop at the cursor. The composer keeps ownership of the editor; this
   * component never touches it, which is what keeps the insert from becoming a navigation.
   */
  onInsert: (html: string) => void
  onClose: () => void
}

interface Row {
  id: string
  title: string
  subtitle: string
  /** What lands in the reply when this row is chosen. */
  html: string
}

/**
 * Search docs or saved replies and drop one into the reply, in place.
 *
 * Leaving the composer to find an article is the thing that loses a half-written reply, so this
 * is deliberately a panel over the composer rather than a route: the draft, the recipients, and
 * the cursor all survive the lookup.
 */
export function InsertPicker({ source, onInsert, onClose }: InsertPickerProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const fieldRef = useRef<HTMLInputElement>(null)

  const articles = useArticles()
  const savedReplies = useSavedReplies()

  const rows: Row[] = useMemo(() => {
    const needle = query.trim().toLowerCase()

    if (source === 'doc') {
      return (articles.data ?? [])
        .filter((article) => article.status === 'published')
        .filter(
          (article) =>
            needle === '' ||
            article.title.toLowerCase().includes(needle) ||
            article.keywords.some((keyword) => keyword.includes(needle)),
        )
        .slice(0, 8)
        .map((article) => ({
          id: article.id,
          title: article.title,
          subtitle: `/${article.slug}`,
          // A link, not the body: customers get the maintained version, and the reply stays short.
          html: `<p><a href="https://docs.boltsupport.io/${article.slug}">${article.title}</a></p>`,
        }))
    }

    return (savedReplies.data ?? [])
      .filter((reply) => needle === '' || reply.name.toLowerCase().includes(needle))
      .slice(0, 8)
      .map((reply) => ({
        id: reply.id,
        title: reply.name,
        subtitle: `used ${String(reply.usageCount)}×`,
        html: reply.bodyHtml,
      }))
  }, [source, query, articles.data, savedReplies.data])

  // A narrowing search must never leave the cursor pointing past the end of the list.
  const active = Math.min(cursor, Math.max(rows.length - 1, 0))

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (panelRef.current !== null && !panelRef.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onClose])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  // The panel exists to be typed into, so it takes focus on open. Without this the first
  // keystroke would land back in the reply body.
  useEffect(() => {
    fieldRef.current?.focus()
  }, [])

  const choose = (row: Row | undefined) => {
    if (row === undefined) return
    onInsert(row.html)
    onClose()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor(Math.min(active + 1, rows.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor(Math.max(active - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(rows[active])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  const isPending = source === 'doc' ? articles.isPending : savedReplies.isPending
  const Icon = source === 'doc' ? BookOpen : Zap

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={source === 'doc' ? 'Insert doc' : 'Insert saved reply'}
      className="absolute right-0 bottom-full left-0 z-30 mb-2 overflow-hidden rounded-lg border shadow-lg"
      style={{ borderColor: 'var(--border)', background: 'var(--popover)' }}
    >
      <div
        className="flex items-center gap-2 border-b px-2.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <Icon
          className="size-4 shrink-0"
          style={{ color: 'var(--muted-foreground)' }}
          aria-hidden="true"
        />
        <Input
          ref={fieldRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setCursor(0)
          }}
          // The keys are handled where focus actually is. Moving through the list never takes
          // focus off the field, so narrowing and choosing stay one continuous motion.
          onKeyDown={onKeyDown}
          placeholder={source === 'doc' ? 'Search docs' : 'Search saved replies'}
          aria-label={source === 'doc' ? 'Search docs' : 'Search saved replies'}
          className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {isPending ? (
        <p className="px-3 py-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : rows.length === 0 ? (
        <p className="px-3 py-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          {source === 'doc'
            ? 'No published article matches. Drafts stay out of replies.'
            : 'No saved reply matches.'}
        </p>
      ) : (
        <ul ref={listRef} className="max-h-[240px] overflow-y-auto py-1" role="listbox">
          {rows.map((row, index) => (
            <li key={row.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                data-active={index === active ? 'true' : undefined}
                onMouseEnter={() => {
                  setCursor(index)
                }}
                onClick={() => {
                  choose(row)
                }}
                className={cn(
                  'flex h-[38px] w-full items-center gap-2.5 px-3 text-left text-[13px]',
                  index === active && 'bg-[color:var(--hover)]',
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{row.title}</span>
                <span
                  className="shrink-0 font-mono text-[12px]"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  {row.subtitle}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className="flex items-center gap-2 border-t px-3 py-1.5 text-[12px]"
        style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
      >
        <span className="kbd">↑↓</span> move
        <span className="kbd">↵</span> insert
        <span className="kbd">esc</span> close
      </div>
    </div>
  )
}
