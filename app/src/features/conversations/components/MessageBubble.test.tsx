import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { RAIL_COLOR } from '@/components/ProvenanceRail'
import type { Message } from '@/types'
import { MessageBubble } from './MessageBubble'

const base = {
  id: 'm1',
  conversationId: 'c1',
  createdAt: '2026-07-31T09:00:00.000Z',
  author: { id: 'u1', name: 'Maya Chen', email: 'maya@northwind.co' },
}

const MESSAGES: Record<string, Message> = {
  customer: { ...base, type: 'customer', bodyHtml: '<p>Customer text</p>' },
  reply: {
    ...base,
    type: 'reply',
    author: { id: 'u2', name: 'Sam Oyelaran' },
    bodyHtml: '<p>Agent text</p>',
  },
  note: {
    ...base,
    type: 'note',
    author: { id: 'u2', name: 'Sam Oyelaran' },
    bodyHtml: '<p>Note text</p>',
  },
  system: {
    ...base,
    type: 'system',
    author: { id: 'system', name: 'System' },
    systemEvent: { kind: 'status', detail: 'Status changed to Pending by Sam Oyelaran' },
  },
  ai_event: {
    ...base,
    type: 'ai_event',
    author: { id: 'system', name: 'BoltSupport AI' },
    aiEvent: {
      kind: 'auto_assign',
      detail: 'Auto assigned to Priya Raman by AI, confidence 0.82',
      confidence: 0.82,
      undoableUntil: new Date(Date.now() + 60_000).toISOString(),
    },
  },
}

function railColors(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-provenance]')].map((el) =>
    el instanceof HTMLElement ? el.style.background : '',
  )
}

describe('the provenance rail', () => {
  it('gives each authored type its own rail colour', () => {
    const seen = new Map<string, string>()

    for (const type of ['customer', 'reply', 'note'] as const) {
      const message = MESSAGES[type]
      if (message === undefined) throw new Error(`missing fixture ${type}`)
      const { container, unmount } = renderWithProviders(
        <MessageBubble
          message={message}
          aiEnabled
          open
          hideDetails={false}
          onToggleOpen={vi.fn()}
          onUndoAiEvent={vi.fn()}
        />,
      )
      const colors = railColors(container)
      expect(colors, type).toHaveLength(1)
      seen.set(type, colors[0] ?? '')
      unmount()
    }

    expect(seen.get('customer')).toBe(RAIL_COLOR.customer)
    expect(seen.get('reply')).toBe(RAIL_COLOR.agent)
    expect(seen.get('note')).toBe(RAIL_COLOR.note)
    // Three types, three distinct colours. Two matching would be the failure this device exists
    // to prevent.
    expect(new Set(seen.values()).size).toBe(3)
  })

  it('gives event lines no rail, because they have no author', () => {
    for (const type of ['system', 'ai_event'] as const) {
      const message = MESSAGES[type]
      if (message === undefined) throw new Error(`missing fixture ${type}`)
      const { container, unmount } = renderWithProviders(
        <MessageBubble
          message={message}
          aiEnabled
          open
          hideDetails={false}
          onToggleOpen={vi.fn()}
          onUndoAiEvent={vi.fn()}
        />,
      )
      expect(railColors(container), type).toHaveLength(0)
      unmount()
    }
  })

  it('marks an internal note as not visible to the customer', () => {
    const message = MESSAGES['note']
    if (message === undefined) throw new Error('missing fixture')
    renderWithProviders(
      <MessageBubble
        message={message}
        aiEnabled
        open
        hideDetails={false}
        onToggleOpen={vi.fn()}
        onUndoAiEvent={vi.fn()}
      />,
    )

    expect(screen.getByText('Note')).toBeInTheDocument()
    expect(screen.getByText(/not visible to the customer/i)).toBeInTheDocument()
  })

  it('labels an agent reply so it cannot be read as a customer message', () => {
    const message = MESSAGES['reply']
    if (message === undefined) throw new Error('missing fixture')
    renderWithProviders(
      <MessageBubble
        message={message}
        aiEnabled
        open
        hideDetails={false}
        onToggleOpen={vi.fn()}
        onUndoAiEvent={vi.fn()}
      />,
    )

    expect(screen.getByText('Agent reply')).toBeInTheDocument()
  })
})

describe('AI event lines', () => {
  it('offers Undo while the window is open', () => {
    const onUndo = vi.fn()
    const message = MESSAGES['ai_event']
    if (message === undefined) throw new Error('missing fixture')
    renderWithProviders(
      <MessageBubble
        message={message}
        aiEnabled
        open
        hideDetails={false}
        onToggleOpen={vi.fn()}
        onUndoAiEvent={onUndo}
      />,
    )

    const undo = screen.getByRole('button', { name: /undo/i })
    undo.click()
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('withdraws Undo once the window has closed', () => {
    const expired = {
      ...MESSAGES['ai_event'],
      aiEvent: {
        kind: 'auto_assign' as const,
        detail: 'Auto assigned to Priya Raman by AI, confidence 0.82',
        confidence: 0.82,
        undoableUntil: new Date(Date.now() - 60_000).toISOString(),
      },
    } as Message

    renderWithProviders(
      <MessageBubble
        message={expired}
        aiEnabled
        open
        hideDetails={false}
        onToggleOpen={vi.fn()}
        onUndoAiEvent={vi.fn()}
      />,
    )

    // A promise of undo that no longer works is worse than not offering it.
    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument()
  })
})
