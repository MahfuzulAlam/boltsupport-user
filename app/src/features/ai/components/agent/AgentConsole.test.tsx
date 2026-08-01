import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { getDb } from '@/mocks/db'
import { AgentPage } from './AgentPage'

async function renderConsole() {
  const view = renderWithProviders(<AgentPage />)
  await screen.findByRole('tab', { name: 'Overview' })
  return view
}

describe('the agent console', () => {
  it('ships as a draft and says what that means', async () => {
    await renderConsole()

    // FR-4.47. "Draft" on its own is a word; the sentence is what tells an operator no customer
    // has seen this.
    expect(getDb().aiAgent.status).toBe('draft')
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText(/no customer has seen it/i)).toBeInTheDocument()
  })

  it('will not go live without an explicit confirmation that names the channels', async () => {
    const user = userEvent.setup()
    await renderConsole()

    await user.click(screen.getByRole('button', { name: /launch/i }))

    // The first click asks. Nothing has changed yet.
    expect(getDb().aiAgent.status).toBe('draft')
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/never takes account actions/i)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /^launch$/i }))
    await waitFor(() => {
      expect(getDb().aiAgent.status).toBe('live')
    })
  })

  it('can be backed out of without launching', async () => {
    const user = userEvent.setup()
    await renderConsole()

    await user.click(screen.getByRole('button', { name: /launch/i }))
    await user.click(await screen.findByRole('button', { name: /not yet/i }))

    expect(getDb().aiAgent.status).toBe('draft')
  })

  it('says when instructions were found in crawled content', async () => {
    const user = userEvent.setup()
    await renderConsole()

    await user.click(screen.getByRole('tab', { name: 'Knowledge' }))

    // AI-3. The seed flags one source, so this renders against real data rather than a prop.
    expect(
      await screen.findByText(/instructions found in crawled content were ignored/i),
    ).toBeInTheDocument()
    // A failed crawl is not silent either: the agent knows less than the operator thinks.
    expect(screen.getByText(/this source did not index/i)).toBeInTheDocument()
  })

  it('cannot deploy to a channel that is not connected', async () => {
    const user = userEvent.setup()
    await renderConsole()

    await user.click(screen.getByRole('tab', { name: 'Deployment' }))

    // WhatsApp is disconnected in the seed, so turning the agent on there would promise
    // something the workspace cannot deliver.
    expect(await screen.findByRole('switch', { name: /whatsapp/i })).toBeDisabled()
    expect(screen.getByRole('switch', { name: /live chat widget/i })).toBeEnabled()
  })

  it('offers no way to make the agent act on an account', async () => {
    const user = userEvent.setup()
    await renderConsole()

    // FR-4.50: it answers and escalates, nothing else. If a control for refunds, cancellations,
    // or account changes ever appears, this is where it gets caught.
    for (const tab of ['Overview', 'Knowledge', 'Identity', 'Guardrails', 'Deployment']) {
      await user.click(screen.getByRole('tab', { name: tab }))
      const forbidden = screen.queryAllByRole('button', {
        name: /issue a refund|cancel (the )?(subscription|account)|change the plan|update billing/i,
      })
      expect(forbidden, `${tab} offers an account action`).toHaveLength(0)
    }
  })
})
