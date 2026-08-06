import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { getDb, resetDb } from '@/mocks/db'
import { TagsPage, UsersPage } from './ManagePages'

/**
 * Five settings pages shipped a create button that did nothing at all. These check the two ends
 * of the flow that matter: that the form reaches the store, and that a failure the server can
 * actually produce is shown rather than swallowed.
 */

function renderPage(ui: React.ReactElement) {
  resetDb()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        {ui}
        {/* The failure surfaces as a toast, so the surface it lands on has to exist here too. */}
        <Toaster />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('creating from a settings page', () => {
  it('adds a tag that the workspace can then use', async () => {
    const user = userEvent.setup()
    renderPage(<TagsPage />)

    const before = getDb().tags.length

    await user.click(screen.getByRole('button', { name: 'New tag' }))
    await user.type(screen.getByLabelText('Name'), 'escalation')
    await user.click(screen.getByRole('button', { name: 'Add tag' }))

    await waitFor(() => {
      expect(getDb().tags).toHaveLength(before + 1)
    })
    expect(getDb().tags.at(-1)?.name).toBe('escalation')
  })

  it('will not submit until the required fields are filled', async () => {
    const user = userEvent.setup()
    renderPage(<UsersPage />)

    await user.click(screen.getByRole('button', { name: 'Invite teammate' }))
    expect(screen.getByRole('button', { name: 'Send invite' })).toBeDisabled()

    // Name alone is not enough: an invite with no address goes nowhere.
    await user.type(screen.getByLabelText('Name'), 'Priya Raman')
    expect(screen.getByRole('button', { name: 'Send invite' })).toBeDisabled()

    await user.type(screen.getByLabelText('Email'), 'priya@example.com')
    expect(screen.getByRole('button', { name: 'Send invite' })).toBeEnabled()
  })

  it('says why when the server refuses', async () => {
    const user = userEvent.setup()
    renderPage(<UsersPage />)

    const existing = getDb().users[0]
    expect(existing).toBeDefined()

    await user.click(screen.getByRole('button', { name: 'Invite teammate' }))
    await user.type(screen.getByLabelText('Name'), 'Someone Else')
    await user.type(screen.getByLabelText('Email'), existing?.email ?? '')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))

    // The duplicate address is the failure somebody actually hits, so it gets the server's words.
    expect(await screen.findByText(/already invited/i)).toBeInTheDocument()
  })
})
