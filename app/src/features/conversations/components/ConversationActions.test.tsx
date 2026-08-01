import { beforeEach, describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setViewportWidth } from '@/test/render'
import { useSidebar } from '@/features/inbox'
import { useThreadView } from '../hooks/use-thread-view'
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

function renderConversation(route = '/inbox/in1/assigned/c2') {
  return renderWithProviders(
    <Routes>
      <Route path="/inbox/:inboxId/:folder/:conversationId" element={<ConversationPage />} />
      <Route path="/inbox/:inboxId/:folder" element={<p>Back in the folder</p>} />
    </Routes>,
    { route },
  )
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /conversation actions/i }))
  return screen.findByRole('menu')
}

beforeEach(() => {
  localStorage.clear()
  useSidebar.setState({ collapsed: false })
  useThreadView.setState({ hideDetails: false, wide: false })
  setViewportWidth(1440)
})

describe('the conversation menu', () => {
  it('carries every conversation level action, each with its key', async () => {
    const user = userEvent.setup()
    renderConversation()

    const menu = await openMenu(user)
    for (const name of [
      /^follow/i,
      /^forward/i,
      /^move/i,
      /^spam/i,
      /^delete/i,
      /hide details/i,
      /layout/i,
      /collapse all/i,
      /expand all/i,
      /previous conversation/i,
      /next conversation/i,
    ]) {
      expect(within(menu).getByRole('menuitem', { name })).toBeInTheDocument()
    }
  })

  it('folds and unfolds the whole thread at once', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /collapse all/i }))

    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /collapse the message from/i })).toHaveLength(
        0,
      )
    })
    const folded = screen.getAllByRole('button', { name: /expand the message from/i })
    expect(folded.length).toBeGreaterThan(1)

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /expand all/i }))

    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /expand the message from/i })).toHaveLength(0)
    })
  })

  it('drops the customer rail for the wide layout and puts it back', async () => {
    const user = userEvent.setup()
    renderConversation()

    expect(
      await screen.findByRole('complementary', { name: /customer and ai/i }),
    ).toBeInTheDocument()

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /wide layout/i }))
    expect(
      screen.queryByRole('complementary', { name: /customer and ai/i }),
    ).not.toBeInTheDocument()

    // The label follows the state, so the item always says what pressing it will do.
    await user.click(
      within(await openMenu(user)).getByRole('menuitem', { name: /regular layout/i }),
    )
    expect(screen.getByRole('complementary', { name: /customer and ai/i })).toBeInTheDocument()
  })

  it('hides the sender lines without hiding the messages', async () => {
    const user = userEvent.setup()
    renderConversation()
    await screen.findByRole('button', { name: /^reply/i })

    expect(screen.getAllByText(/^From /).length).toBeGreaterThan(0)

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /hide details/i }))

    expect(screen.queryByText(/^From /)).not.toBeInTheDocument()
    // The messages themselves are untouched: this folds metadata, not content.
    expect(
      screen.getAllByRole('button', { name: /collapse the message from/i }).length,
    ).toBeGreaterThan(0)
  })

  it('opens the composer in forward mode with an empty address', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /^forward/i }))

    const to = await screen.findByLabelText(/forward to/i, {}, LAZY)
    // Never prefilled with the customer: a forward goes somewhere else by definition.
    expect(to).toHaveValue('')
    expect(screen.getByRole('button', { name: /^forward$/i })).toBeInTheDocument()
  })

  it('asks before deleting, and takes the agent back to the folder', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /^delete/i }))

    // Destructive and outward facing, so it is a decision rather than a click.
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /delete conversation/i }))

    expect(await screen.findByText(/back in the folder/i)).toBeInTheDocument()
  })

  it('offers a move to every other inbox', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /^move/i }))

    const dialog = await screen.findByRole('dialog', { name: /move conversation/i })
    // The inbox it is already in stays listed and marked, so a move reads as a change of place.
    expect(within(dialog).getByText(/here now/i)).toBeInTheDocument()
    expect(within(dialog).getAllByRole('button').length).toBeGreaterThan(1)
  })

  it('follows and unfollows, and counts who is watching', async () => {
    const user = userEvent.setup()
    renderConversation()

    await user.click(within(await openMenu(user)).getByRole('menuitem', { name: /^follow/i }))

    /*
     * Open once, then let findBy retry on the item.
     *
     * Reopening the menu inside a waitFor retry re-toggles it on every attempt, which is how this
     * test failed under a loaded parallel run while passing on its own. The wait belongs on the
     * assertion, never on the interaction.
     */
    await openMenu(user)
    expect(await screen.findByRole('menuitem', { name: /^unfollow/i })).toBeInTheDocument()
  })
})
