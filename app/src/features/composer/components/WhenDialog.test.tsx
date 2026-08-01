import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { sendLaterPresets, snoozePresets } from '@/lib/when'
import { WhenDialog, type WhenChoice } from './WhenDialog'

const NOW = new Date('2026-08-05T15:20:00')

function renderSnooze(onChoose: (choice: WhenChoice) => void = vi.fn()) {
  return renderWithProviders(
    <WhenDialog
      title="Snooze until"
      description="The conversation leaves the queue and comes back at the time you pick."
      presets={snoozePresets(NOW)}
      open
      onOpenChange={vi.fn()}
      onChoose={onChoose}
      now={NOW}
    />,
  )
}

describe('choosing a moment', () => {
  it('shows each preset with the time it resolves to', async () => {
    renderSnooze()

    const dialog = await screen.findByRole('dialog')
    // Anchored on the comma so "Next week" does not also match "Next weekend".
    for (const label of [/^later today,/i, /^tomorrow,/i, /^next week,/i, /^next weekend,/i]) {
      expect(within(dialog).getByRole('button', { name: label })).toBeInTheDocument()
    }
    // The resolved time is on the row, so nobody has to work out what "next weekend" means.
    expect(within(dialog).getByRole('button', { name: /^next weekend,/i })).toHaveTextContent(
      /Sat, 8:00 AM/i,
    )
  })

  it('reads back what was typed before anything is committed', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    renderSnooze(onChoose)

    await user.type(screen.getByLabelText('When'), '3 days')

    expect(screen.getByText(/Sat 8 Aug, 3:20 PM/i)).toBeInTheDocument()
    expect(onChoose).not.toHaveBeenCalled()
  })

  it('says so plainly when it cannot read the input', async () => {
    const user = userEvent.setup()
    renderSnooze()

    await user.type(screen.getByLabelText('When'), 'whenever')

    // Guessing a date the agent did not mean is worse than admitting we did not understand.
    expect(screen.getByText(/could not read that/i)).toBeInTheDocument()
  })

  it('commits the typed moment with the chosen condition', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    renderSnooze(onChoose)

    await user.click(screen.getByRole('button', { name: /condition/i }))
    await user.click(await screen.findByRole('menuitem', { name: /regardless/i }))
    await user.type(screen.getByLabelText('When'), '8 am{Enter}')

    expect(onChoose).toHaveBeenCalledWith({
      at: new Date('2026-08-06T08:00:00'),
      condition: 'regardless',
    })
  })

  it('defaults to holding off when the customer replies', async () => {
    const user = userEvent.setup()
    const onChoose = vi.fn()
    renderSnooze(onChoose)

    await user.click(screen.getByRole('button', { name: /^tomorrow,/i }))

    // The safer default: a follow up that fires after the customer already answered is the one
    // that reads as not listening.
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ condition: 'if-no-reply' }))
  })

  it('offers different presets for sending later', async () => {
    renderWithProviders(
      <WhenDialog
        title="Send later"
        description="The reply is held and goes out at the time you pick."
        presets={sendLaterPresets(NOW)}
        open
        onOpenChange={vi.fn()}
        onChoose={vi.fn()}
        now={NOW}
      />,
    )

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /^tomorrow morning,/i })).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: /^tomorrow afternoon,/i }),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /^monday morning,/i })).toBeInTheDocument()
  })
})
