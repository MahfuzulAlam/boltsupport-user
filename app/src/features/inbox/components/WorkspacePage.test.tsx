import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '@/test/render'
import { server } from '@/mocks/server'
import { getDb, inboxesWithCounts } from '@/mocks/db'
import { WorkspacePage } from './WorkspacePage'

describe('the workspace dashboard', () => {
  it('renders a card per inbox with counts that match the data', async () => {
    // Computed, not the stored seed values: the card links into the folder, so the number on
    // the card has to be the number the folder actually holds.
    const [firstInbox] = inboxesWithCounts()
    if (firstInbox === undefined) throw new Error('seed has no inboxes')

    renderWithProviders(<WorkspacePage />)

    const card = await screen.findByRole('region', { name: firstInbox.name })
    const unassigned = within(card).getByRole('link', { name: /unassigned/i })

    expect(unassigned).toHaveTextContent(String(firstInbox.counts.unassigned))
    // Each count is a link into that folder, which is the whole point of the card.
    expect(unassigned).toHaveAttribute('href', `/inbox/${firstInbox.id}/unassigned`)
  })

  it('links every folder row to its own folder', async () => {
    const [firstInbox] = inboxesWithCounts()
    if (firstInbox === undefined) throw new Error('seed has no inboxes')

    renderWithProviders(<WorkspacePage />)
    const card = await screen.findByRole('region', { name: firstInbox.name })

    for (const [label, folder] of [
      ['Chats', 'chats'],
      ['Mine', 'mine'],
      ['Assigned', 'assigned'],
      ['Drafts', 'drafts'],
      ['Needs attention', 'needs-attention'],
    ] as const) {
      // Anchored at the start: an unanchored /Assigned/ also matches "Unassigned". No \b at
      // the end, because the accessible name runs the label into the count ("Chats5").
      expect(
        within(card).getByRole('link', { name: new RegExp(`^${label}`, 'i') }),
      ).toHaveAttribute('href', `/inbox/${firstInbox.id}/${folder}`)
    }
  })

  it('shows the AI strip when AI is on for the workspace', async () => {
    renderWithProviders(<WorkspacePage />)

    expect(await screen.findAllByText(/AI resolved/i)).not.toHaveLength(0)
    expect(await screen.findByRole('region', { name: /agent/i })).toBeInTheDocument()
  })

  it('hides every AI surface when the workspace kill switch is off, without erroring', async () => {
    // AI-11: turning AI off produces a calm absence, not a broken or greyed out dashboard.
    server.use(
      http.get('/api/ai/settings', () =>
        HttpResponse.json({ ...getDb().aiSettings, enabled: false }),
      ),
    )

    renderWithProviders(<WorkspacePage />)

    await screen.findByRole('region', { name: 'Support' })
    expect(screen.queryByText(/AI resolved/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /agent/i })).not.toBeInTheDocument()
    // The rest of the dashboard is untouched.
    expect(screen.getByRole('region', { name: /knowledge base/i })).toBeInTheDocument()
  })

  it('still renders the inboxes when the AI service fails', async () => {
    // AI-10: model failure never blocks the underlying workflow.
    server.use(http.get('/api/ai/inbox-stats', () => new HttpResponse(null, { status: 500 })))
    server.use(http.get('/api/ai/agent', () => new HttpResponse(null, { status: 500 })))

    renderWithProviders(<WorkspacePage />)

    expect(await screen.findByRole('region', { name: 'Support' })).toBeInTheDocument()
  })

  it('offers a retry when the inboxes cannot be loaded', async () => {
    server.use(http.get('/api/inboxes', () => new HttpResponse(null, { status: 500 })))

    renderWithProviders(<WorkspacePage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/could not load your inboxes/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('invites the first inbox when the workspace is empty', async () => {
    server.use(http.get('/api/inboxes', () => HttpResponse.json([])))

    renderWithProviders(<WorkspacePage />)

    expect(await screen.findByText(/no inboxes yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create your first inbox/i })).toBeInTheDocument()
  })

  it('shows a skeleton before the data arrives, not an empty screen', async () => {
    renderWithProviders(<WorkspacePage />)

    expect(screen.getByLabelText(/loading inboxes/i)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByLabelText(/loading inboxes/i)).not.toBeInTheDocument()
    })
  })

  it('labels channel icons, since the glyphs are generic', async () => {
    renderWithProviders(<WorkspacePage />)
    const card = await screen.findByRole('region', { name: 'Support' })

    expect(within(card).getByRole('img', { name: /email, connected/i })).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: /whatsapp, not connected/i })).toBeInTheDocument()
  })
})
