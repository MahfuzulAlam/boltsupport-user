import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '@/test/render'
import { server } from '@/mocks/server'
import { getDb } from '@/mocks/db'
import { AutoTagSettingsPage } from './AutoTagSettingsPage'

async function removeAllTags(user: ReturnType<typeof userEvent.setup>) {
  for (;;) {
    const buttons = screen.queryAllByRole('button', { name: /^remove /i })
    const first = buttons[0]
    if (first === undefined) break
    await user.click(first)
  }
}

describe('the allowed tag set', () => {
  it('cannot be emptied while auto apply stays on', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/ai/settings', () =>
        HttpResponse.json({
          ...getDb().aiSettings,
          autoTag: { ...getDb().aiSettings.autoTag, mode: 'auto' },
        }),
      ),
    )

    renderWithProviders(<AutoTagSettingsPage />)
    const autoCard = await screen.findByRole('button', { name: /auto apply above a threshold/i })
    expect(autoCard).toHaveAttribute('aria-pressed', 'true')

    await removeAllTags(user)

    // FR-4.28 is enforced, not merely described: emptying the list drops the mode back.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /auto apply above a threshold/i })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })
    expect(screen.getByRole('button', { name: /suggest only/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('disables the auto apply card entirely while the list is empty', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AutoTagSettingsPage />)
    await screen.findByRole('button', { name: /suggest only/i })

    await removeAllTags(user)

    expect(screen.getByRole('button', { name: /auto apply above a threshold/i })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      /auto apply stays off while this list is empty/i,
    )
  })

  it('states that the model can never invent a tag', async () => {
    renderWithProviders(<AutoTagSettingsPage />)

    expect(
      await screen.findByText(/can only choose from this list\. It can never invent a new tag/i),
    ).toBeInTheDocument()
  })

  it('keeps the save bar disabled until something actually changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AutoTagSettingsPage />)

    const save = await screen.findByRole('button', { name: /save changes/i })
    expect(save).toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: /^remove /i })[0] as HTMLElement)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled()
    })
  })

  it('restores the stored settings on discard', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AutoTagSettingsPage />)
    await screen.findByRole('button', { name: /suggest only/i })

    const before = screen.getAllByRole('button', { name: /^remove /i }).length
    await user.click(screen.getAllByRole('button', { name: /^remove /i })[0] as HTMLElement)
    await user.click(screen.getByRole('button', { name: /discard/i }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^remove /i })).toHaveLength(before)
    })
  })
})

describe('the threshold', () => {
  it('spells out the consequence of the number rather than just showing it', async () => {
    renderWithProviders(<AutoTagSettingsPage />)

    // A bare percentage tells an operator nothing about what it will do.
    expect(await screen.findByText(/confidence threshold/i)).toBeInTheDocument()
    expect(screen.getByText(/wait in the review queue/i)).toBeInTheDocument()
  })
})
