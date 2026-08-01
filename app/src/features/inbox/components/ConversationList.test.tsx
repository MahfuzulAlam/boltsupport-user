import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import type { Conversation } from '@/types'
import { ConversationList } from './ConversationList'

function makeConversation(index: number): Conversation {
  const iso = new Date(Date.UTC(2026, 6, 31, 9, 0, 0) - index * 60_000).toISOString()
  return {
    id: `c${String(index)}`,
    number: 40000 + index,
    inboxId: 'in1',
    subject: `Subject ${String(index)}`,
    preview: `Preview ${String(index)}`,
    contact: {
      id: `ct${String(index)}`,
      name: `Person ${String(index)}`,
      email: `p${String(index)}@x.co`,
    },
    status: 'active',
    assigneeId: null,
    tags: [],
    priority: 'normal',
    channel: 'email',
    unread: index % 3 === 0,
    waitingSince: iso,
    createdAt: iso,
    updatedAt: iso,
    lastMessageId: `m${String(index)}`,
  }
}

/** jsdom gives every element a zero height, so the virtualizer needs a real measurement. */
function stubLayout(viewportHeight = 800): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const isScroller = this.getAttribute('role') === 'listbox'
    return {
      width: 1200,
      height: isScroller ? viewportHeight : 72,
      top: 0,
      left: 0,
      bottom: isScroller ? viewportHeight : 72,
      right: 1200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }
  })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return viewportHeight
    },
  })
}

function renderList(
  count: number,
  overrides: Partial<Parameters<typeof ConversationList>[0]> = {},
) {
  const conversations = Array.from({ length: count }, (_, index) => makeConversation(index))
  const onOpen = vi.fn()
  const onToggleSelect = vi.fn()
  const onCursorChange = vi.fn()

  const utils = renderWithProviders(
    <ConversationList
      conversations={conversations}
      rowHeight={72}
      selected={new Set()}
      users={new Map()}
      cursorIndex={0}
      onCursorChange={onCursorChange}
      hasNextPage={false}
      isFetchingNextPage={false}
      onLoadMore={vi.fn()}
      onToggleSelect={onToggleSelect}
      onSelectAll={vi.fn()}
      onSelectNone={vi.fn()}
      onOpen={onOpen}
      {...overrides}
    />,
  )
  return { ...utils, conversations, onOpen, onToggleSelect, onCursorChange }
}

describe('the virtualized queue', () => {
  beforeEach(() => {
    stubLayout()
  })

  it('sizes the scroll area for the whole folder, not just the rendered rows', () => {
    renderList(5000)

    // 5000 rows at 72px. The spacer is what makes the scrollbar honest while only a windowful
    // is ever in the DOM (NFR-1.4). How many rows that window holds depends on layout, which
    // jsdom does not do, so the count itself is verified in the browser.
    const spacer = screen.getByRole('listbox').firstElementChild
    expect(spacer).toHaveStyle({ height: '360000px' })
  })

  it('exposes the listbox pattern so the whole queue is one tab stop', () => {
    renderList(50)

    const listbox = screen.getByRole('listbox', { name: /conversations/i })
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true')
    expect(listbox).toHaveAttribute('tabindex', '0')
  })

  it('never points aria-activedescendant at a row that is not rendered', () => {
    renderList(50)

    // The cursor is published to assistive tech rather than moving DOM focus per row, but the
    // list is virtualized: a cursor scrolled out of the window has no element to point at, and
    // a dangling id loses the selection for a screen reader entirely. jsdom has no layout so
    // the virtualizer renders nothing here, which is exactly the out-of-window case.
    const listbox = screen.getByRole('listbox', { name: /conversations/i })
    const target = listbox.getAttribute('aria-activedescendant')

    if (target !== null) {
      expect(document.getElementById(target)).not.toBeNull()
    }
  })

  it('moves the cursor with J and K', async () => {
    const user = userEvent.setup()
    const { onCursorChange } = renderList(50)

    await user.keyboard('j')
    expect(onCursorChange).toHaveBeenLastCalledWith(1)
  })

  it('accumulates rapid presses instead of collapsing them into one move', async () => {
    const user = userEvent.setup()
    const { onCursorChange } = renderList(50)

    // Two presses before a re-render must land on row 2, not row 1. Holding J is how an agent
    // actually moves through a queue.
    await user.keyboard('jj')

    expect(onCursorChange).toHaveBeenLastCalledWith(2)
  })

  it('selects the row the cursor just moved to, not the one it left', async () => {
    const user = userEvent.setup()
    const { onToggleSelect } = renderList(50, { cursorIndex: 0 })

    // J then X inside one frame: X must act on row 1. Reading the render-time prop here would
    // toggle row 0 back off instead.
    await user.keyboard('jx')

    expect(onToggleSelect).toHaveBeenLastCalledWith('c1')
  })

  it('does not move above the first row', async () => {
    const user = userEvent.setup()
    const { onCursorChange } = renderList(50, { cursorIndex: 0 })

    await user.keyboard('k')
    expect(onCursorChange).toHaveBeenLastCalledWith(0)
  })

  it('selects the row under the cursor with X, without opening it', async () => {
    const user = userEvent.setup()
    const { onToggleSelect, onOpen } = renderList(50, { cursorIndex: 3 })

    await user.keyboard('x')

    expect(onToggleSelect).toHaveBeenCalledWith('c3')
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('opens the row under the cursor with Enter', async () => {
    const user = userEvent.setup()
    const { onOpen } = renderList(50, { cursorIndex: 2 })

    await user.keyboard('{Enter}')

    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'c2' }))
  })
})
