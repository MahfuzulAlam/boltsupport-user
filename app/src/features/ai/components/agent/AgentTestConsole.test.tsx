import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { AgentTestConsole } from './AgentTestConsole'

async function ask(text: string) {
  const user = userEvent.setup()
  renderWithProviders(<AgentTestConsole />)
  await user.type(screen.getByLabelText(/ask the agent/i), text)
  await user.click(screen.getByRole('button', { name: /^ask$/i }))
}

describe('the agent test console', () => {
  it('cites what an answer came from', async () => {
    await ask('How do I add a teammate?')

    const cited = await screen.findByText(/add a teammate without billing access/i)
    expect(cited).toBeInTheDocument()
    expect(screen.getByText(/^\d+%$/)).toBeInTheDocument()
  })

  it('says so when nothing matched instead of answering anyway', async () => {
    await ask('what is the airspeed velocity of a swallow')

    // AI-8: an answer with no source behind it is the one most likely to be wrong, so the
    // absence is stated rather than left as an empty row of chips.
    expect(await screen.findByText(/no source matched this question/i)).toBeInTheDocument()
    expect(screen.getByText(/hand this to a teammate/i)).toBeInTheDocument()
  })

  it('refuses a topic on the avoid list and explains which one', async () => {
    await ask('I want a refund for last month')

    // The seed puts "refunds" on the avoid list. The refusal names the rule so an operator can
    // tell a guardrail from a knowledge gap.
    expect(await screen.findByText(/not able to help with refunds/i)).toBeInTheDocument()
    expect(screen.getByText(/topics to avoid list/i)).toBeInTheDocument()
  })

  it('tells the operator what goes with an escalation', async () => {
    await ask('something nothing in the sources covers at all')

    // FR-4.49. The handover is only useful if the human gets the context with it.
    expect(await screen.findByText(/full transcript and a summary go with it/i)).toBeInTheDocument()
  })
})
