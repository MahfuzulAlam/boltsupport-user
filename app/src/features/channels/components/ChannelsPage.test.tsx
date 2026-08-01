import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { getDb } from '@/mocks/db'
import { PROVIDERS } from '../providers'
import { ChannelsPage } from './ChannelsPage'

function renderChannels() {
  return renderWithProviders(
    <Routes>
      <Route path="/inbox/:inboxId/settings/channels" element={<ChannelsPage />} />
    </Routes>,
    { route: '/inbox/in1/settings/channels' },
  )
}

describe('connecting a channel', () => {
  it('discloses every scope before anything can be granted', async () => {
    const user = userEvent.setup()
    renderChannels()

    await user.click(
      within(await screen.findByRole('region', { name: 'Instagram' })).getByRole('button', {
        name: /connect/i,
      }),
    )

    const dialog = await screen.findByRole('dialog')
    // FR-6.2. The consent button is only reachable past this list, and the list is the
    // provider table in this codebase rather than anything a server said.
    for (const entry of PROVIDERS.instagram.scopes) {
      expect(within(dialog).getByText(entry.scope)).toBeInTheDocument()
      expect(within(dialog).getByText(entry.label)).toBeInTheDocument()
    }
    expect(
      within(dialog).getByRole('button', { name: /continue with instagram/i }),
    ).toBeInTheDocument()
  })

  it('stores the scopes it disclosed, not something the provider returned', async () => {
    const user = userEvent.setup()
    renderChannels()

    await user.click(
      within(await screen.findByRole('region', { name: 'Messenger' })).getByRole('button', {
        name: /connect/i,
      }),
    )
    await user.click(await screen.findByRole('button', { name: /continue with messenger/i }))

    await waitFor(() => {
      const channel = getDb()
        .inboxes.find((i) => i.id === 'in1')
        ?.channels.find((c) => c.type === 'messenger')
      expect(channel?.status).toBe('connected')
      expect(channel?.scopes).toEqual(PROVIDERS.messenger.scopes.map((s) => s.scope))
    })
  })

  it('makes WhatsApp explain the 24 hour window before finishing', async () => {
    const user = userEvent.setup()
    renderChannels()

    await user.click(
      within(await screen.findByRole('region', { name: 'WhatsApp' })).getByRole('button', {
        name: /connect/i,
      }),
    )
    await user.click(await screen.findByRole('button', { name: /continue with whatsapp/i }))

    // FR-6.5. Without this an agent's free form reply on day two is rejected by the provider
    // and nothing in the product explains why.
    expect(await screen.findByText(/24 hours after a customer/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/whatsapp number/i)).toBeInTheDocument()
  })

  it('requires a second, explicit step to disconnect', async () => {
    const user = userEvent.setup()
    renderChannels()

    await user.click(await screen.findByRole('button', { name: /email details/i }))
    await user.click(screen.getByRole('button', { name: /^disconnect$/i }))

    // FR-6.4: the first click asks, it does not act.
    expect(screen.getByText(/disconnect email\?/i)).toBeInTheDocument()
    expect(
      getDb()
        .inboxes.find((i) => i.id === 'in1')
        ?.channels.find((c) => c.type === 'email')?.status,
    ).toBe('connected')

    await user.click(screen.getByRole('button', { name: /yes, disconnect email/i }))
    await waitFor(() => {
      expect(
        getDb()
          .inboxes.find((i) => i.id === 'in1')
          ?.channels.find((c) => c.type === 'email')?.status,
      ).toBe('disconnected')
    })
  })

  it('shows what a connected channel actually granted', async () => {
    const user = userEvent.setup()
    renderChannels()

    const row = await screen.findByRole('region', { name: 'Email' })
    await user.click(within(row).getByRole('button', { name: /email details/i }))

    // FR-6.3: account, date, scopes, last sync.
    expect(within(row).getAllByText('support@boltsupport.io').length).toBeGreaterThan(1)
    expect(within(row).getByText('mail.read')).toBeInTheDocument()
    expect(within(row).getByText('mail.send')).toBeInTheDocument()
    expect(within(row).getByText(/last sync/i)).toBeInTheDocument()
    expect(within(row).getByText(/connected account/i)).toBeInTheDocument()
  })
})
