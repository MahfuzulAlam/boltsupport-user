import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { queryConversations } from '@/mocks/db'
import { EMPTY_FILTER, type ListFilter } from '../hooks/use-conversation-list'
import { ListToolbar } from './ListToolbar'

/**
 * The Filter button was inert for most of this build: it rendered, it had a border, and clicking
 * it did nothing at all. These cover both halves of the fix — the menu that collects the choice
 * and the query that acts on it — because either one working alone still leaves a button that
 * lies about what it does.
 */

const USERS = [
  { id: 'u1', name: 'Priya Raman' },
  { id: 'u2', name: 'Tom Alvarez' },
]

const TAGS = [
  { id: 't1', name: 'billing' },
  { id: 't2', name: 'refund' },
]

function Harness() {
  const [filter, setFilter] = useState<ListFilter>(EMPTY_FILTER)
  return (
    <ListToolbar
      title="Unassigned"
      total={12}
      sort="waiting"
      onSortChange={() => undefined}
      filter={filter}
      onFilterChange={setFilter}
      users={USERS as never}
      tags={TAGS as never}
      density="default"
      onDensityToggle={() => undefined}
      splitView={false}
      onSplitViewToggle={() => undefined}
    />
  )
}

describe('the filter control', () => {
  it('counts what is chosen so a narrowed queue is never mistaken for an empty one', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /filter/i }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Urgent' }))

    // The menu stays open, so a second axis does not cost a second trip.
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Unassigned' }))

    // Close it first: an open Radix menu marks the rest of the page aria-hidden, so the trigger
    // is out of the accessibility tree while it is up.
    await user.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: 'Filter, 2 applied' })).toBeInTheDocument()
  })

  it('offers a way back out', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /filter/i }))
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Spam' }))
    await user.click(screen.getByRole('menuitem', { name: /clear 1 filter/i }))

    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument()
  })
})

describe('what the filter asks the server for', () => {
  it('narrows within an axis and across them', () => {
    const all = queryConversations({ limit: 5000 })
    const active = queryConversations({ limit: 5000, status: ['active'] })
    const activeUrgent = queryConversations({ limit: 5000, status: ['active'], priority: ['urgent'] })

    expect(active.total).toBeLessThan(all.total)
    expect(active.items.every((c) => c.status === 'active')).toBe(true)

    // Adding an axis can only narrow. A filter that widened when you added to it would be the
    // kind of bug an agent silently works around rather than reports.
    expect(activeUrgent.total).toBeLessThanOrEqual(active.total)
    expect(activeUrgent.items.every((c) => c.status === 'active' && c.priority === 'urgent')).toBe(
      true,
    )
  })

  it('treats several values on one axis as or', () => {
    const urgent = queryConversations({ limit: 5000, priority: ['urgent'] })
    const high = queryConversations({ limit: 5000, priority: ['high'] })
    const both = queryConversations({ limit: 5000, priority: ['urgent', 'high'] })

    expect(both.total).toBe(urgent.total + high.total)
  })

  it('makes unassigned selectable rather than only reachable by clearing', () => {
    const page = queryConversations({ limit: 5000, assigneeId: ['unassigned'] })

    expect(page.total).toBeGreaterThan(0)
    expect(page.items.every((c) => c.assigneeId === null)).toBe(true)
  })

  it('ignores an axis with nothing chosen', () => {
    const all = queryConversations({ limit: 5000 })
    const empty = queryConversations({ limit: 5000, ...EMPTY_FILTER })

    expect(empty.total).toBe(all.total)
  })
})
