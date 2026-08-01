import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { InsertPicker } from './InsertPicker'

describe('the insert picker', () => {
  it('inserts the chosen article as a link and closes', async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(<InsertPicker source="doc" onInsert={onInsert} onClose={onClose} />)

    const options = await screen.findAllByRole('option')
    await user.click(options[0] as HTMLElement)

    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(String(onInsert.mock.calls[0]?.[0])).toMatch(/^<p><a href="https:\/\/docs\./)
    expect(onClose).toHaveBeenCalled()
  })

  it('offers only published articles', async () => {
    const onInsert = vi.fn()
    renderWithProviders(<InsertPicker source="doc" onInsert={onInsert} onClose={() => undefined} />)

    await screen.findAllByRole('option')
    // A draft is unfinished by definition; putting one in front of a customer is the mistake
    // the status field exists to prevent.
    expect(screen.queryByText(/getting started with drafts/i)).not.toBeInTheDocument()
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(0)
  })

  it('narrows as you type and inserts the highlighted row on Enter', async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    renderWithProviders(<InsertPicker source="doc" onInsert={onInsert} onClose={() => undefined} />)

    const before = (await screen.findAllByRole('option')).length
    expect(before).toBeGreaterThan(1)

    await user.type(screen.getByLabelText(/search docs/i), 'refund')
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1)
    })
    expect(screen.getByRole('option')).toHaveTextContent(/refund policy/i)

    await user.keyboard('{Enter}')
    expect(onInsert).toHaveBeenCalledTimes(1)
  })

  it('inserts a saved reply body rather than a link', async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    renderWithProviders(
      <InsertPicker source="saved-reply" onInsert={onInsert} onClose={() => undefined} />,
    )

    const options = await screen.findAllByRole('option')
    await user.click(options[0] as HTMLElement)

    expect(onInsert).toHaveBeenCalledTimes(1)
    expect(String(onInsert.mock.calls[0]?.[0])).not.toMatch(/docs\.boltsupport/)
  })
})
