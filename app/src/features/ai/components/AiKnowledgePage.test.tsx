import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { getDb, resetDb } from '@/mocks/db'
import { aiFeatureSchema } from '@/types'
import { FEATURE_LABEL } from '../knowledge-meta'
import { AiKnowledgePage } from './AiKnowledgePage'

/** The Open button on one named card, since every card has one. */
async function openButtonFor(label: string) {
  const card = (await screen.findByText(label)).closest('div[class*="rounded-xl"]')
  return within(card as HTMLElement).getByRole('button', { name: 'Open' })
}

/**
 * The knowledge layer is the thing every other AI feature reads from, so the rules that matter
 * are the ones about what can and cannot become an answer: a harvested reply is never live until
 * somebody approves it, scoping is per feature, and a source nobody granted reaches nothing.
 */

function renderPage() {
  resetDb()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AiKnowledgePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('the knowledge layer', () => {
  it('lists a source of every kind', async () => {
    renderPage()

    expect(await screen.findByText('Help centre')).toBeInTheDocument()
    expect(screen.getByText('Policies and facts')).toBeInTheDocument()
    expect(screen.getByText('Proven answers')).toBeInTheDocument()
    expect(screen.getByText('boltsupport.io/pricing')).toBeInTheDocument()
  })

  it('says out loud when a source carries text aimed at the model', async () => {
    renderPage()

    // The crawled page is the untrusted one, and the warning belongs on the source rather than
    // only on the answer that quotes it (AI-2, AI-3).
    expect(await screen.findByText(/tries to instruct the AI/i)).toBeInTheDocument()
  })

  it('scopes a source per feature rather than on or off', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await openButtonFor('Help centre'))

    const summary = await screen.findByRole('checkbox', { name: 'Summary' })
    expect(summary).toBeChecked()

    await user.click(summary)

    await waitFor(() => {
      expect(getDb().knowledgeBases[0]?.usedBy).not.toContain('summary')
    })
    // Revoking one feature leaves the others alone.
    expect(getDb().knowledgeBases[0]?.usedBy).toContain('autoDraft')
  })

  it('offers every feature as a scope, so adding one cannot be forgotten here', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await openButtonFor('Help centre'))

    // Read off the schema rather than restated, so a seventh feature fails here until somebody
    // decides what it is allowed to read.
    for (const feature of aiFeatureSchema.options) {
      expect(
        screen.getByRole('checkbox', { name: FEATURE_LABEL[feature] }),
        feature,
      ).toBeInTheDocument()
    }
  })
})

describe('answers harvested from resolved conversations', () => {
  it('counts only approved answers, so a draft teaches nothing', () => {
    resetDb()
    const proven = getDb().knowledgeBases.find((source) => source.kind === 'proven')

    const approved = proven?.answers?.filter((answer) => answer.state === 'approved') ?? []
    const drafts = proven?.answers?.filter((answer) => answer.state === 'draft') ?? []

    expect(drafts.length).toBeGreaterThan(0)
    // The card's count is what somebody trusts to tell them whether the source is doing anything.
    expect(proven?.itemCount).toBe(approved.length)
  })

  it('keeps the thread it came from, so an agent can check the original', () => {
    resetDb()
    const proven = getDb().knowledgeBases.find((source) => source.kind === 'proven')

    for (const answer of proven?.answers ?? []) {
      expect(answer.conversationId).not.toBe('')
      expect(answer.conversationSubject).not.toBe('')
    }
  })
})

describe('the shape of the source list', () => {
  it('renders which features read each source', async () => {
    renderPage()

    const card = (await screen.findByText('Help centre')).closest('div[class*="rounded-xl"]')
    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).getByText('Auto draft')).toBeInTheDocument()
  })
})
