import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import type { SlaState } from '@/types'
import { SlaBadge } from './SlaBadge'

const MINUTE = 60_000

function sla(minutesFromNow: number, paused = false): SlaState {
  return {
    policyId: 's1',
    firstResponseDueAt: new Date(Date.now() + minutesFromNow * MINUTE).toISOString(),
    resolutionDueAt: null,
    paused,
    breached: minutesFromNow < 0,
  }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the SLA countdown', () => {
  it('ticks down without a refetch', async () => {
    render(<SlaBadge sla={sla(90)} />)
    expect(screen.getByText('1h 30m')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })

    // FR-5.5: the countdown is derived from the deadline on a shared clock, so a folder full of
    // these costs one interval rather than one per row.
    expect(screen.getByText('1h 29m')).toBeInTheDocument()
  })

  it('shows seconds once it is close enough to act on', () => {
    render(<SlaBadge sla={sla(4.5)} />)
    // Under ten minutes the seconds are what tell you whether to drop what you are doing.
    // The exact minute is not asserted: `useNow` is a module level clock shared by every badge,
    // so its phase carries between tests. The unit switch is what this covers.
    expect(screen.getByText(/^\d+m \d+s$/)).toBeInTheDocument()
  })

  it('drops the seconds once there is time to finish what you are doing', () => {
    render(<SlaBadge sla={sla(42)} />)
    expect(screen.getByText(/^\d+m$/)).toBeInTheDocument()
  })

  it('passes through comfortable, warning, and danger as the deadline approaches', () => {
    const { rerender, container } = render(<SlaBadge sla={sla(180)} />)
    const chip = () => container.querySelector('span')

    const comfortable = chip()?.getAttribute('style')
    rerender(<SlaBadge sla={sla(45)} />)
    const warning = chip()?.getAttribute('style')
    rerender(<SlaBadge sla={sla(5)} />)
    const critical = chip()?.getAttribute('style')

    // Three visually distinct states, not one colour with three labels.
    expect(new Set([comfortable, warning, critical]).size).toBe(3)
    expect(warning).toContain('--warning-strong')
    expect(critical).toContain('--danger')
  })

  it('says how overdue a breach is, not just that it happened', () => {
    render(<SlaBadge sla={sla(-135)} />)
    // FR-5.6. "Breached" alone does not tell you whether to apologise for two minutes or two hours,
    // so the duration is what the chip spends its width on. The word moved to the accessible name
    // once "Breached 2h 15m" turned out not to fit the column.
    expect(screen.getByText('2h 15m')).toBeInTheDocument()
    expect(screen.getByLabelText('Breached, 2h 15m overdue')).toBeInTheDocument()
  })

  it('names who the clock is waiting on when it is paused', () => {
    render(<SlaBadge sla={sla(30, true)} variant="full" />)
    expect(screen.getByText('Paused, waiting on customer')).toBeInTheDocument()
  })

  it('renders nothing when a conversation has no policy', () => {
    const { container } = render(<SlaBadge sla={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})

/**
 * The badge shares a 92px column with every other SLA state and has a fixed 24px height. Those two
 * facts together mean any label long enough to wrap spills out of the chip, which is what
 * "Breached 2h 23m" did: two lines of text inside a 24px box, in the one state that most needs to
 * look deliberate.
 */
describe('the badge fits its column', () => {
  it('never wraps, whatever state it is in', () => {
    for (const [name, state] of [
      ['comfortable', sla(1200)],
      ['warning', sla(45)],
      ['breached', sla(-180)],
      ['paused', sla(30, true)],
    ] as const) {
      const { container, unmount } = render(<SlaBadge sla={state} />)
      const chip = container.firstElementChild

      expect(chip?.className, name).toContain('whitespace-nowrap')
      // Fixed height plus a wrapping label is how the text ended up outside the chip.
      expect(chip?.className, name).toContain('h-6')
      unmount()
    }
  })

  it('spends the width on the time rather than repeating what the colour says', () => {
    render(<SlaBadge sla={sla(-143)} />)

    // The solid red fill is the breached signal, and it is the only urgency that inverts. Saying
    // it again in words cost sixty of the ninety-two pixels the chip has.
    expect(screen.queryByText(/^Breached \d/)).not.toBeInTheDocument()
  })

  it('reads as a countdown rather than an overdue time while it is still running', () => {
    render(<SlaBadge sla={sla(300)} />)
    expect(screen.getByLabelText(/^First reply due in /)).toBeInTheDocument()
  })
})
