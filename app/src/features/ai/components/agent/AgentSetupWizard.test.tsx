import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { server } from '@/mocks/server'
import { getDb } from '@/mocks/db'
import { AgentSetupWizard } from './AgentSetupWizard'
import { AgentLanding } from './AgentLanding'
import { AgentPage } from './AgentPage'

describe('the agent landing', () => {
  it('leads with containment rather than capability', () => {
    renderWithProviders(<AgentLanding />)

    const heading = screen.getByRole('heading', { name: /resolve questions automatically/i })
    // The second of exactly two serif headlines in the product.
    expect(heading).toHaveStyle({ fontFamily: 'var(--font-serif)' })

    expect(screen.getByText(/stays private until you launch it/i)).toBeInTheDocument()
    expect(screen.getByText(/escalates to a human when it cannot help/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /customize your agent/i })).toHaveAttribute(
      'href',
      '/ai/agent/setup',
    )
  })

  it('shows when the workspace has no agent at all', async () => {
    server.use(http.get('/api/ai/agent', () => new HttpResponse(null, { status: 404 })))
    renderWithProviders(<AgentPage />)

    expect(
      await screen.findByRole('heading', { name: /resolve questions automatically/i }),
    ).toBeInTheDocument()
  })
})

describe('the agent setup wizard', () => {
  it('will not leave step one without a source to answer from', async () => {
    server.use(
      http.get('/api/ai/agent', () => HttpResponse.json({ ...getDb().aiAgent, sources: [] })),
    )
    const user = userEvent.setup()
    renderWithProviders(<AgentSetupWizard />)

    expect(await screen.findByRole('button', { name: /^next$/i })).toBeDisabled()

    await user.type(screen.getByLabelText(/website url/i), 'https://example.com')
    expect(screen.getByRole('button', { name: /add website/i })).toBeEnabled()
  })

  it('refuses a URL that is not https', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AgentSetupWizard />)

    await user.type(await screen.findByLabelText(/website url/i), 'javascript:alert(1)')
    // NFR-2.4: the scheme allowlist is the same one the rest of the app uses.
    expect(screen.getByRole('button', { name: /add website/i })).toBeDisabled()
  })

  it('starts a new crawl as queued rather than claiming pages it has not read', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AgentSetupWizard />)

    await user.type(await screen.findByLabelText(/website url/i), 'https://example.com')
    await user.click(screen.getByRole('button', { name: /add website/i }))

    await waitFor(() => {
      expect(getDb().aiAgent.sources.some((s) => s.label === 'example.com')).toBe(true)
    })
    const added = getDb().aiAgent.sources.find((s) => s.label === 'example.com')
    expect(added?.status).toBe('queued')
    expect(added?.pages).toBe(0)
  })

  it('fills the identity box from a template instead of leaving it blank', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AgentSetupWizard />)

    await user.click(await screen.findByRole('button', { name: /^next$/i }))
    const box = await screen.findByLabelText('Identity')

    await user.click(screen.getByRole('button', { name: /concise ecommerce/i }))
    // A complete, editable answer rather than a prompt skeleton: a blank box is why this step
    // gets abandoned.
    expect((box as HTMLTextAreaElement).value).toContain('orders, shipping, and returns')
  })

  it('saves as a draft without ever going live', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AgentSetupWizard />)

    await user.click(await screen.findByRole('button', { name: /^next$/i }))
    await user.click(await screen.findByRole('button', { name: /^next$/i }))
    await user.click(await screen.findByRole('button', { name: /save as draft/i }))

    await waitFor(() => {
      expect(getDb().aiAgent.status).toBe('draft')
    })
  })

  it('makes launching a separate, confirmed decision', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AgentSetupWizard />)

    await user.click(await screen.findByRole('button', { name: /^next$/i }))
    await user.click(await screen.findByRole('button', { name: /^next$/i }))
    await user.click(await screen.findByRole('button', { name: /launch agent/i }))

    // Still a draft: the button opened a question, it did not answer one.
    expect(getDb().aiAgent.status).toBe('draft')
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/never takes account actions/i)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /^launch$/i }))
    await waitFor(() => {
      expect(getDb().aiAgent.status).toBe('live')
    })
  })
})
