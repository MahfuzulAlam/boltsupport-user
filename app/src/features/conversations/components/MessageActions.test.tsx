import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { isAuthoredMessage } from '@/types'
import { useMessages } from '../hooks/use-conversation'
import { AuthoredMessage } from './AuthoredMessage'

/**
 * The message comes from the query rather than from a literal, because edit and hide are
 * optimistic cache writes: a fixture passed straight in as a prop would never see them and the
 * test would pass on a component that does nothing.
 */
function Harness({
  conversationId,
  aiEnabled = true,
  german = false,
  onDiscard,
}: {
  conversationId: string
  aiEnabled?: boolean
  german?: boolean
  onDiscard?: () => void
}) {
  const messages = useMessages(conversationId)
  const authored = (messages.data ?? []).filter(isAuthoredMessage)
  const message = german ? authored.find((item) => item.language === 'de') : authored[0]
  // Open state belongs to the thread in the real page, so the harness owns it here too.
  const [open, setOpen] = useState(true)

  // Stands in for the conversation page's own Escape binding, which navigates back to the queue.
  useHotkeys({
    discard: () => {
      onDiscard?.()
    },
  })

  if (message === undefined) return <p>Loading messages</p>
  return (
    <AuthoredMessage
      message={message}
      aiEnabled={aiEnabled}
      open={open}
      onToggleOpen={() => {
        setOpen((value) => !value)
      }}
    />
  )
}

function renderMessage(
  options: { aiEnabled?: boolean; german?: boolean; onDiscard?: () => void } = {},
) {
  // c2 carries the seeded German message; c1 is the demo thread.
  const conversationId = options.german === true ? 'c2' : 'c1'
  return renderWithProviders(
    <Routes>
      <Route
        path="/inbox/:inboxId/:folder/:conversationId"
        element={<Harness conversationId={conversationId} {...options} />}
      />
      <Route path="/inbox/:inboxId/new" element={<p>New conversation</p>} />
    </Routes>,
    { route: `/inbox/in1/assigned/${conversationId}` },
  )
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /actions for the message/i }))
  return screen.findByRole('menu')
}

describe('the per message menu', () => {
  it('offers every action on a message', async () => {
    const user = userEvent.setup()
    renderMessage()

    const menu = await openMenu(user)
    for (const name of [
      /^edit$/i,
      /^hide$/i,
      /new conversation/i,
      /show original/i,
      /copy link to thread/i,
      /ai translate/i,
    ]) {
      expect(within(menu).getByRole('menuitem', { name })).toBeInTheDocument()
    }
  })

  it('does not nest the menu inside the collapse control', async () => {
    renderMessage()

    // A menu button inside the header button would fold the message every time it opened, and
    // nested interactive elements are not reachable by keyboard either.
    const header = await screen.findByRole('button', { name: /collapse the message from/i })
    const trigger = screen.getByRole('button', { name: /actions for the message/i })
    expect(header.contains(trigger)).toBe(false)
  })

  it('edits the body in place and marks the message as edited', async () => {
    const user = userEvent.setup()
    renderMessage()

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /^edit$/i }))

    const field = await screen.findByLabelText('Message body')
    await user.clear(field)
    await user.type(field, '<p>The staging password is [redacted].</p>')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    // The edit is on the record rather than quietly replacing what someone said.
    expect(await screen.findByText('Edited')).toBeInTheDocument()
  })

  it('hides a message behind a placeholder that says so', async () => {
    const user = userEvent.setup()
    renderMessage()

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /^hide$/i }))

    expect(await screen.findByText(/is hidden/i)).toBeInTheDocument()
    // Hiding is never a dead end.
    expect(screen.getByRole('button', { name: /^show$/i })).toBeInTheDocument()
  })

  it('shows the original as text, never as markup', async () => {
    const user = userEvent.setup()
    renderMessage()

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /show original/i }))

    const dialog = await screen.findByRole('dialog')
    // The raw source is the untrusted original. Rendering it as HTML would give it a second
    // render path outside the sandboxed frame that exists to contain it.
    expect(within(dialog).getByText(/X-Spam-Score/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Content-Type: text\/html/)).toBeInTheDocument()
  })

  it('keeps Escape inside the dialog instead of leaving the conversation', async () => {
    const user = userEvent.setup()
    const discard = vi.fn()
    renderMessage({ onDiscard: discard })

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /show original/i }))
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    // Closing the raw source should not also navigate back to the queue: an overlay owns the
    // keyboard while it is up.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(discard).not.toHaveBeenCalled()
  })

  it('copies a link that points at this message', async () => {
    const user = userEvent.setup()
    // userEvent installs its own clipboard stub during setup, so the spy has to land after it.
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })

    renderMessage()
    await user.click(
      within(await openMenu(user)).getByRole('menuitem', { name: /copy link to thread/i }),
    )

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#message-c1-m1'))
    })
  })
})

describe('AI translate', () => {
  it('labels the translation and keeps the original one click away', async () => {
    const user = userEvent.setup()
    renderMessage({ german: true })

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /ai translate/i }))

    // AI-5: the output is always labelled as AI, never presented as what the customer wrote.
    expect(await screen.findByText(/translated by ai from german/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /discard the translation and show the original/i }),
    ).toBeInTheDocument()
  })

  it('marks the translation as AI generated and internal only', async () => {
    const user = userEvent.setup()
    const { container } = renderMessage({ german: true })

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /ai translate/i }))
    await screen.findByText(/translated by ai/i)

    // AI-6: a translation must never be able to leave on a customer facing surface.
    const surface = container.querySelector('[data-ai-generated="true"]')
    expect(surface).not.toBeNull()
    expect(surface?.getAttribute('data-internal')).toBe('true')
  })

  it('restores the original when the translation is discarded', async () => {
    const user = userEvent.setup()
    renderMessage({ german: true })

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /ai translate/i }))
    await screen.findByText(/translated by ai/i)

    await user.click(
      screen.getByRole('button', { name: /discard the translation and show the original/i }),
    )

    expect(screen.queryByText(/translated by ai/i)).not.toBeInTheDocument()
  })

  it('offers no AI action when AI is off for the workspace', async () => {
    const user = userEvent.setup()
    renderMessage({ aiEnabled: false })

    const menu = await openMenu(user)
    // Calm and explanatory, not an error and not a control that does nothing (AI-11).
    expect(within(menu).getByText(/ai features are turned off/i)).toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: /translate/i })).not.toBeInTheDocument()
  })
})
