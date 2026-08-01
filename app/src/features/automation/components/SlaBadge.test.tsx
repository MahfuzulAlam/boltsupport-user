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
    // FR-5.6. "Breached" alone does not tell you whether to apologise for two minutes or two hours.
    expect(screen.getByText('Breached 2h 15m')).toBeInTheDocument()
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
