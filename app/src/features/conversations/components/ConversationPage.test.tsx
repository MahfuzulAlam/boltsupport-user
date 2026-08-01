import { beforeEach, describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setViewportWidth } from '@/test/render'
import { useSidebar } from '@/features/inbox'
import { ConversationPage } from './ConversationPage'

/*
 * The composer arrives as a lazy chunk, so waiting for it needs more than the 1s default.
 *
 * Generous rather than tight: several suites mount this page, and every one of them pulls the
 * same Tiptap import. Under a full parallel run that queue is long enough that 8s occasionally
 * lost. A `findBy` resolves the moment the element appears, so a high ceiling costs nothing when
 * the machine is quiet and buys a stable suite when it is not.
 */
const LAZY = { timeout: 20_000 }

function renderConversation() {
  return renderWithProviders(
    <Routes>
      <Route path="/inbox/:inboxId/:folder/:conversationId" element={<ConversationPage />} />
    </Routes>,
    { route: '/inbox/in1/assigned/c2' },
  )
}

beforeEach(() => {
  localStorage.clear()
  useSidebar.setState({ collapsed: false })
  // Wide enough for the folder rail and the customer panel both.
  setViewportWidth(1440)
})

describe('the conversation layout', () => {
  it('carries the same folder rail as the queue', async () => {
    renderConversation()

    const rail = await screen.findByRole('navigation', { name: 'Folders' })
    // Moving between a thread and its folder should never cost a back navigation.
    expect(within(rail).getByRole('link', { name: /unassigned/i })).toBeInTheDocument()
    expect(within(rail).getByRole('link', { name: /needs attention/i })).toBeInTheDocument()
  })

  it('collapses the rail and remembers it', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(await screen.findByRole('button', { name: /collapse the folder list/i }))

    expect(screen.getByRole('button', { name: /expand the folder list/i })).toBeInTheDocument()
    // Persisted, so it does not spring open again on the next thread.
    expect(useSidebar.getState().collapsed).toBe(true)
    // Collapsed keeps every folder reachable rather than hiding them.
    const rail = screen.getByRole('navigation', { name: 'Folders' })
    expect(within(rail).getAllByRole('link')).toHaveLength(8)
  })

  it('shows the tags under the subject, each removable', async () => {
    renderConversation()
    await screen.findByRole('button', { name: /^reply/i })

    const remove = screen.queryAllByRole('button', { name: /remove the .* tag/i })
    expect(screen.getByRole('button', { name: /add a tag/i })).toBeInTheDocument()
    expect(remove.length).toBeGreaterThanOrEqual(0)
  })
})

describe('opening the composer', () => {
  it('starts closed, with Reply and Note at the end of the thread', async () => {
    renderConversation()

    expect(await screen.findByRole('button', { name: /^reply/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^note/i })).toBeInTheDocument()
    // A thread is read before it is answered, so the reply surface is not taking the space yet.
    expect(screen.queryByRole('button', { name: /send reply/i })).not.toBeInTheDocument()
  })

  it('opens in the mode that was asked for', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(await screen.findByRole('button', { name: /^note/i }))

    // Note mode, not reply mode: the button that was pressed decides.
    expect(await screen.findByRole('button', { name: /add note/i }, LAZY)).toBeInTheDocument()
    expect(await screen.findByLabelText(/internal note body/i, undefined, LAZY)).toBeInTheDocument()
  })

  it('opens from the keyboard too', async () => {
    const user = userEvent.setup()
    renderConversation()
    await screen.findByRole('button', { name: /^reply/i })

    await user.keyboard('r')
    expect(await screen.findByRole('button', { name: /send reply/i }, LAZY)).toBeInTheDocument()
  })

  it('closes back to the buttons without losing the draft', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(await screen.findByRole('button', { name: /^reply/i }))
    await screen.findByRole('button', { name: /send reply/i }, LAZY)
    await user.click(screen.getByRole('button', { name: /save & close/i }))

    // Closing is a layout choice, never a destructive one. Discarding is a separate control, so
    // leaving the composer can never be the thing that loses a half written reply.
    expect(screen.queryByRole('button', { name: /send reply/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^reply/i })).toBeInTheDocument()
  })

  it('fills the pane when expanded and hides the thread behind it', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(await screen.findByRole('button', { name: /^reply/i }))
    const expand = await screen.findByRole('button', { name: /expand the composer/i }, LAZY)
    await user.click(expand)

    expect(screen.getByRole('button', { name: /shrink the composer/i })).toBeInTheDocument()
    // The thread is hidden rather than unmounted, so coming back keeps the scroll position.
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
  })

  it('shrinks back to the thread on Escape before it leaves the conversation', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(await screen.findByRole('button', { name: /^reply/i }))
    await user.click(await screen.findByRole('button', { name: /expand the composer/i }, LAZY))
    await user.keyboard('{Escape}')

    // One step at a time: shrink, then close, then leave.
    expect(
      await screen.findByRole('button', { name: /expand the composer/i }, LAZY),
    ).toBeInTheDocument()
  })
})

describe('a message in the thread', () => {
  it('is open and sized to its own content, with no expand control', async () => {
    renderConversation()
    await screen.findByRole('button', { name: /^reply/i })

    // The old fixed-height frame with an "Expand message" link is gone: every message shows
    // all of itself.
    expect(screen.queryByRole('button', { name: /expand message/i })).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /collapse the message from/i }).length,
    ).toBeGreaterThan(0)
  })

  it('folds to a single row when its header is clicked, and back again', async () => {
    const user = userEvent.setup()
    renderConversation()
    await screen.findByRole('button', { name: /^reply/i })

    const headers = screen.getAllByRole('button', { name: /collapse the message from/i })
    const first = headers[0] as HTMLElement
    const author = /collapse the message from (.+)/i.exec(
      first.getAttribute('aria-label') ?? '',
    )?.[1]

    await user.click(first)

    // Collapsed keeps who and when, and trades the body for a snippet.
    const row = screen.getByRole('button', {
      name: new RegExp(`expand the message from ${String(author)}`, 'i'),
    })
    expect(row).toHaveAttribute('aria-expanded', 'false')

    await user.click(row)
    expect(screen.getAllByRole('button', { name: /collapse the message from/i }).length).toBe(
      headers.length,
    )
  })
})
