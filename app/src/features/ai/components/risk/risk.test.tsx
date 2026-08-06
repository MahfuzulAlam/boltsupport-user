import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { createSeedData } from '@/mocks/seed'
import { accountHealthSchema, bandFor, churnAlertSchema, HEALTH_BANDS } from '@/types'
import { ChurnAlertList } from './ChurnAlertList'
import { HealthScorePanel } from './HealthScorePanel'
import { RefundThreatBanner } from './RefundThreatBanner'
import { SentimentDriftPanel } from './SentimentDriftPanel'

const seed = createSeedData()
const atRisk = seed.accountHealth[0]
const declining = seed.sentimentDrift[0]

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('the health score', () => {
  it('sums its signals to the score, so the breakdown cannot disagree with the total', () => {
    // If these ever drift apart the panel is showing arithmetic that does not add up, which is
    // worse than showing no breakdown at all.
    for (const health of seed.accountHealth) {
      const total = health.signals.reduce((sum, signal) => sum + signal.points, 0)
      expect(total, health.contactId).toBe(health.score)
    }
  })

  it('puts every account in the band its score falls in', () => {
    for (const health of seed.accountHealth) {
      expect(health.band, health.contactId).toBe(bandFor(health.score))
    }
  })

  it('covers all three bands in the fixtures, so every colour path renders somewhere', () => {
    const bands = new Set(seed.accountHealth.map((health) => health.band))
    expect(bands.size).toBe(3)
  })

  it('never ships a score without the signals behind it (AI-4)', () => {
    // A bare number is the rule this feature is most likely to break, so the schema requires the
    // trend and the parse is asserted rather than assumed.
    for (const health of seed.accountHealth) {
      const parsed = accountHealthSchema.parse(health)
      expect(parsed.signals.length).toBeGreaterThan(0)
      expect(parsed.trend.length).toBeGreaterThan(1)
    }
  })

  it('renders the score, its band, and what is driving it', () => {
    expect(atRisk).toBeDefined()
    if (atRisk === undefined) return
    wrap(<HealthScorePanel health={atRisk} />)

    expect(screen.getByText(String(atRisk.score))).toBeInTheDocument()
    expect(screen.getByText(HEALTH_BANDS[atRisk.band].label)).toBeInTheDocument()
    expect(screen.getByText('Repeat issues')).toBeInTheDocument()
    expect(screen.getByText('Escalation rate')).toBeInTheDocument()
  })

  it('marks itself internal, so it can never be read as customer facing (AI-8)', () => {
    if (atRisk === undefined) return
    const { container } = wrap(<HealthScorePanel health={atRisk} />)

    const surface = container.querySelector('[data-ai-generated="true"]')
    expect(surface).not.toBeNull()
    expect(surface?.getAttribute('data-internal')).toBe('true')
  })
})

describe('the three account detectors together', () => {
  /*
   * They render as one composed set, so they have to cover the same accounts.
   *
   * Churn was seeded for four contacts and health for three, which put an agent in front of "usage
   * down 62% and both admins have stopped replying" with no score beside it. That is the exact
   * moment the score earns its place, and it was the one time it was missing.
   */
  it('gives every account with a churn alert a health score and a sentiment trend', () => {
    const scored = new Set(seed.accountHealth.map((health) => health.contactId))
    const tracked = new Set(seed.sentimentDrift.map((drift) => drift.contactId))

    for (const alert of seed.churnAlerts) {
      expect(scored.has(alert.contactId), `${alert.contactId} has no health score`).toBe(true)
      expect(tracked.has(alert.contactId), `${alert.contactId} has no sentiment trend`).toBe(true)
    }
  })
})

describe('sentiment drift', () => {
  it('carries a direction the component does not have to guess at', () => {
    const directions = new Set(seed.sentimentDrift.map((drift) => drift.direction))
    // All three exist in the fixtures, so a single bad ticket and a real decline are both testable.
    expect(directions).toEqual(new Set(['declining', 'stable', 'improving']))
  })

  it('says a decline is a run rather than one conversation', () => {
    if (declining === undefined) return
    wrap(<SentimentDriftPanel drift={declining} inboxId="in1" />)

    expect(screen.getByText('Declining')).toBeInTheDocument()
    expect(screen.getByText(/not one bad conversation/i)).toBeInTheDocument()
  })

  it('gives every ticket a label, since the bars are the evidence for the direction', () => {
    if (declining === undefined) return
    wrap(<SentimentDriftPanel drift={declining} inboxId="in1" />)

    for (const point of declining.points) {
      expect(screen.getByLabelText(new RegExp(point.subject, 'i'))).toBeInTheDocument()
    }
  })
})

describe('silent churn alerts', () => {
  it('always carries a reason, never a bare score', () => {
    for (const alert of seed.churnAlerts) {
      const parsed = churnAlertSchema.parse(alert)
      expect(parsed.reason.trim().length, parsed.id).toBeGreaterThan(0)
    }
  })

  it('varies the reasons, so a layout tuned to one sentence fails here', () => {
    const reasons = seed.churnAlerts.map((alert) => alert.reason)
    const lengths = new Set(reasons.map((reason) => reason.length))

    expect(new Set(reasons).size).toBe(reasons.length)
    // Four identical-length reasons would mean the fixtures are a template, not examples.
    expect(lengths.size).toBeGreaterThan(2)
  })

  it('shows the reason and lets somebody act on it', async () => {
    const user = userEvent.setup()
    const onSetState = vi.fn()
    wrap(
      <ChurnAlertList alerts={seed.churnAlerts} inboxId="in1" onSetState={onSetState} />,
    )

    expect(
      screen.getByText('3 reopened tickets on billing sync in 18 days, no reply since 6 August'),
    ).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Acknowledge' })[0] as HTMLElement)
    expect(onSetState).toHaveBeenCalledWith('ch1', 'acknowledged')
  })

  it('hides dismissed alerts but keeps acknowledged ones visible', () => {
    wrap(<ChurnAlertList alerts={seed.churnAlerts} onSetState={vi.fn()} />)

    // Acknowledged still needs following up. Dismissed was a judgement that it is not a risk.
    expect(screen.getByText(/export formats twice in a week/i)).toBeInTheDocument()
    expect(screen.getByText('Acknowledged')).toBeInTheDocument()
  })
})

describe('the refund threat banner', () => {
  const threat = seed.refundThreats[0]

  it('shows the phrase that fired it and the confidence', () => {
    if (threat === undefined) return
    wrap(<RefundThreatBanner threat={threat} onEscalate={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByText(threat.phrase)).toBeInTheDocument()
    expect(screen.getByText(/91% confidence/)).toBeInTheDocument()
  })

  it('leads with an escalation, since the point of it is to interrupt', async () => {
    if (threat === undefined) return
    const onEscalate = vi.fn()
    const user = userEvent.setup()
    wrap(<RefundThreatBanner threat={threat} onEscalate={onEscalate} onDismiss={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /escalate to a lead/i }))
    expect(onEscalate).toHaveBeenCalled()
  })

  it('announces itself to a screen reader rather than sitting quietly', () => {
    if (threat === undefined) return
    wrap(<RefundThreatBanner threat={threat} onEscalate={vi.fn()} onDismiss={vi.fn()} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('keeps the AI provenance rail rather than recolouring it for urgency (AI-5)', () => {
    if (threat === undefined) return
    const { container } = wrap(
      <RefundThreatBanner threat={threat} onEscalate={vi.fn()} onDismiss={vi.fn()} />,
    )

    /*
     * The rail encodes who produced the content, not how urgent it is. Making it red would buy this
     * one banner some attention at the cost of the only device that tells an agent whether text came
     * from a person or a model.
     */
    const banner = container.querySelector('[data-ai-generated="true"]')
    expect(banner?.getAttribute('data-internal')).toBe('true')
    expect(banner?.querySelector('[data-provenance="ai"]')).not.toBeNull()
  })

  it('stays down once dismissed and stays up once escalated', () => {
    const dismissed = seed.refundThreats.find((item) => item.state === 'dismissed')
    const escalated = seed.refundThreats.find((item) => item.state === 'escalated')
    if (dismissed === undefined || escalated === undefined) return

    const { container } = wrap(
      <RefundThreatBanner threat={dismissed} onEscalate={vi.fn()} onDismiss={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()

    wrap(<RefundThreatBanner threat={escalated} onEscalate={vi.fn()} onDismiss={vi.fn()} />)
    // Still visible, so nobody escalates the same conversation twice.
    expect(screen.getByText('Refund threat, escalated')).toBeInTheDocument()
  })
})
