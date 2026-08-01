import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { Composer } from './Composer'

/**
 * Component level checks only cover what is visible without typing.
 *
 * ProseMirror does not respond to synthetic keyboard events under jsdom, so driving the editor
 * here would be testing its jsdom compatibility rather than this codebase. The draft and send
 * logic are exercised directly in use-composer-draft.test.ts and use-send-message.test.tsx.
 */
describe('the composer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('makes a note unmistakable from a reply', async () => {
    const reply = renderWithProviders(<Composer conversationId="c1" recipient="Maya Chen" />)

    expect(document.querySelector('[data-provenance="agent"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
    reply.unmount()

    // The mode is chosen before the composer opens, from the thread, so this is how a note
    // actually arrives on screen.
    renderWithProviders(<Composer conversationId="c1" recipient="Maya Chen" initialMode="note" />)

    // The rail, the send label, and the field's accessible name all change together. One cue is
    // not enough to stop an internal note reaching a customer (FR-3.1, FR-3.2).
    expect(document.querySelector('[data-provenance="note"]')).toBeInTheDocument()
    expect(document.querySelector('[data-provenance="agent"]')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument()
    expect(await screen.findByLabelText(/internal note body/i)).toBeInTheDocument()
    expect(screen.getByText(/internal only/i)).toBeInTheDocument()
    // A note never offers a status to land the conversation in, because it does not answer anyone.
    expect(screen.queryByRole('button', { name: /status after sending/i })).not.toBeInTheDocument()
  })

  it('swaps the recipient row for a mention field in note mode', () => {
    const reply = renderWithProviders(<Composer conversationId="c1" recipient="Maya Chen" />)
    expect(screen.getByText('Maya Chen')).toBeInTheDocument()
    reply.unmount()

    renderWithProviders(<Composer conversationId="c1" recipient="Maya Chen" initialMode="note" />)

    // A note has no customer recipient, so offering one would be a lie.
    expect(screen.queryByText('Maya Chen')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/mention teammates/i)).toBeInTheDocument()
  })

  it('asks for an address before it will forward', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Composer conversationId="c1" recipient="Maya Chen" initialMode="forward" />,
    )

    // Empty, not prefilled with the customer: a forward goes to somebody else, and a prefilled
    // address turns one mistaken Enter into a message the customer was never meant to see.
    expect(await screen.findByLabelText(/forward to/i)).toHaveValue('')
    expect(screen.getByRole('button', { name: /^forward$/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^forward$/i }))
    expect(screen.queryByText(/^forwarded/i)).not.toBeInTheDocument()
  })

  it('does not let an empty reply be sent', async () => {
    renderWithProviders(<Composer conversationId="c1" recipient="Maya Chen" />)
    expect(await screen.findByRole('button', { name: /send reply/i })).toBeDisabled()
  })

  it('offers the insert menu with its shortcuts', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Composer conversationId="c1" recipient="Maya Chen" />)

    await user.click(screen.getByRole('button', { name: /insert/i }))

    const menu = await screen.findByRole('menu', { name: /insert/i })
    expect(menu).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /saved reply/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /variable/i })).toBeInTheDocument()
  })

  it('inserts a doc without leaving the composer', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Composer conversationId="c1" recipient="Maya Chen" />)

    await user.click(screen.getByRole('button', { name: /insert/i }))
    await user.click(await screen.findByRole('menuitem', { name: /insert doc/i }))

    // The lookup happens over the composer, not at /docs. Leaving to find an article is what
    // loses a half written reply, so the draft, the recipient, and the send button all stay put.
    const picker = await screen.findByRole('dialog', { name: /insert doc/i })
    expect(picker).toBeInTheDocument()
    expect(screen.getByText('Maya Chen')).toBeInTheDocument()

    await user.click((await screen.findAllByRole('option'))[0] as HTMLElement)

    expect(screen.queryByRole('dialog', { name: /insert doc/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/reply body/i)).toBeInTheDocument()
  })
})
