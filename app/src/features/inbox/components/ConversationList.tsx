import { useCallback, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { useNow } from '@/hooks/use-now'
import type { Conversation, User } from '@/types'
import { ConversationRow } from './ConversationRow'

interface ConversationListProps {
  conversations: Conversation[]
  rowHeight: number
  selected: ReadonlySet<string>
  users: Map<string, User>
  /** Controlled by the page, so status and assign chords can act on the row under the cursor. */
  cursorIndex: number
  onCursorChange: (index: number) => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
  onOpen: (conversation: Conversation) => void
}

/**
 * The virtualized queue.
 *
 * Implements the listbox pattern from NFR-3.3: the container owns focus and a roving cursor,
 * rows are options with tabIndex -1. That keeps the whole list one tab stop instead of five
 * thousand, which is the difference between keyboard operable and keyboard hostile.
 *
 * The cursor is deliberately separate from selection. J and K move it, X toggles selection under
 * it, and Enter opens it, so an agent can review a row before committing to acting on it.
 */
export function ConversationList({
  conversations,
  rowHeight,
  selected,
  users,
  cursorIndex,
  onCursorChange,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onToggleSelect,
  onSelectAll,
  onSelectNone,
  onOpen,
}: ConversationListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const now = useNow()

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  })

  const items = virtualizer.getVirtualItems()

  // Fetch the next page once the tail comes into view, so scrolling never stalls at a boundary.
  const lastItem = items[items.length - 1]
  useEffect(() => {
    if (lastItem === undefined || !hasNextPage || isFetchingNextPage) return
    if (lastItem.index >= conversations.length - 8) onLoadMore()
  }, [lastItem, hasNextPage, isFetchingNextPage, conversations.length, onLoadMore])

  /**
   * Mirrors the cursor so rapid presses accumulate.
   *
   * Reading `cursorIndex` from props here loses moves: two J presses inside one frame both see
   * the pre-render value and compute the same target, so holding the key crawls or stalls. The
   * ref advances immediately, and the prop stays the source of truth for rendering.
   */
  const cursorRef = useRef(cursorIndex)
  useEffect(() => {
    cursorRef.current = cursorIndex
  }, [cursorIndex])

  const moveCursor = useCallback(
    (delta: number) => {
      const next = Math.min(
        Math.max(cursorRef.current + delta, 0),
        Math.max(conversations.length - 1, 0),
      )
      cursorRef.current = next
      virtualizer.scrollToIndex(next, { align: 'auto' })
      onCursorChange(next)
    },
    [conversations.length, onCursorChange, virtualizer],
  )

  const atCursor = conversations[cursorIndex]

  // Actions read the ref, not the prop, for the same reason moveCursor does: a J immediately
  // followed by an X would otherwise act on the row the cursor just left.
  const conversationAtCursor = useCallback(() => conversations[cursorRef.current], [conversations])

  useHotkeys({
    listDown: () => {
      moveCursor(1)
    },
    listUp: () => {
      moveCursor(-1)
    },
    listSelect: () => {
      const target = conversationAtCursor()
      if (target !== undefined) onToggleSelect(target.id)
    },
    listOpen: () => {
      const target = conversationAtCursor()
      if (target !== undefined) onOpen(target)
    },
    selectAll: onSelectAll,
    selectNone: onSelectNone,
  })

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-multiselectable="true"
      aria-label="Conversations"
      tabIndex={0}
      /* Only while the cursor row is actually rendered. The list is virtualized, so a cursor
         scrolled out of the window would leave this pointing at an id that is not in the DOM,
         and a screen reader following it loses the selection entirely. */
      aria-activedescendant={
        atCursor !== undefined && items.some((item) => item.index === cursorIndex)
          ? `row-${atCursor.id}`
          : undefined
      }
      className="flex-1 overflow-y-auto outline-none"
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {items.map((item) => {
          const conversation = conversations[item.index]
          if (conversation === undefined) return null
          return (
            <div
              key={conversation.id}
              id={`row-${conversation.id}`}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${String(item.start)}px)` }}
            >
              <ConversationRow
                conversation={conversation}
                height={rowHeight}
                selected={selected.has(conversation.id)}
                focused={item.index === cursorIndex}
                now={now}
                presenceUsers={users}
                onToggleSelect={onToggleSelect}
                onOpen={onOpen}
              />
            </div>
          )
        })}
      </div>

      {isFetchingNextPage ? (
        <div
          className="flex h-14 items-center justify-center text-[13px]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Loading more
        </div>
      ) : null}
    </div>
  )
}
