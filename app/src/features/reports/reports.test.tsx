import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { server } from '@/mocks/server'
import { toCsv } from './lib/csv'
import { useReportRange } from './hooks/use-report-range'
import { AllChannelsReport } from './components/AllChannelsReport'
import { EmailReport } from './components/EmailReport'
import { HappinessReport } from './components/HappinessReport'
import { CompanyReport } from './components/CompanyReport'
import { AiReport } from './components/AiReport'
import { SatisfactionReport } from './components/SatisfactionReport'

const REPORTS = [
  {
    name: 'All channels',
    type: 'all-channels',
    Component: AllChannelsReport,
    what: 'conversations',
  },
  { name: 'Email', type: 'email', Component: EmailReport, what: 'email conversations' },
  { name: 'Happiness', type: 'happiness', Component: HappinessReport, what: 'ratings' },
  { name: 'Company', type: 'company', Component: CompanyReport, what: 'activity' },
  { name: 'AI', type: 'ai', Component: AiReport, what: 'AI activity' },
  {
    name: 'Satisfaction',
    type: 'satisfaction',
    Component: SatisfactionReport,
    what: 'satisfaction data',
  },
] as const

/** An empty period is a normal thing to look at, so every report has to handle it. */
const EMPTY_PAYLOAD: Record<string, Record<string, unknown>> = {
  'all-channels': {
    kpis: [
      { key: 'total', label: 'Total conversations', value: 0, deltaPct: 0, goodDirection: 'up' },
    ],
    busiestDay: { day: '—', count: 0 },
    byChannel: [],
    series: [],
    tags: [],
    savedReplies: [],
  },
  email: {
    kpis: [
      {
        key: 'conversations',
        label: 'Email conversations',
        value: 0,
        deltaPct: 0,
        goodDirection: 'up',
      },
    ],
    series: [],
    responseBuckets: [],
    resolutionBuckets: [],
  },
  happiness: {
    great: 0,
    okay: 0,
    notGood: 0,
    score: 0,
    totalRatings: 0,
    coveragePct: 0,
    deltas: { great: 0, okay: 0, notGood: 0 },
    ratings: [],
  },
  company: {
    kpis: [
      { key: 'helped', label: 'Customers helped', value: 0, deltaPct: 0, goodDirection: 'up' },
    ],
    series: [],
    team: [],
  },
  ai: {
    handled: 0,
    resolutionRate: 0,
    resolved: 0,
    unresolved: 0,
    escalated: 0,
    happiness: { great: 0, okay: 0, notGood: 0, score: 0 },
    series: [],
    tiles: [],
  },
  satisfaction: {
    actualScore: 0,
    predictedScore: 0,
    coveragePct: 0,
    atRisk: 0,
    series: [],
    calibration: { accuracyPct: 0, sampleSize: 0, grid: {} },
    drivers: [],
  },
}

beforeEach(() => {
  useReportRange.setState({ days: 30, compare: true })
})

describe.each(REPORTS)('the $name report', ({ name, type, Component, what }) => {
  it('offers a CSV export and a compare toggle', async () => {
    renderWithProviders(<Component />)
    await screen.findByRole('heading', { name })

    // FR-7.2 and FR-7.3 apply to all six. The shared shell is what makes that structural.
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /compare to previous period/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Date range')).toBeInTheDocument()
  })

  it('says so when the period is empty instead of drawing an empty chart', async () => {
    server.use(http.get(`/api/reports/${type}`, () => HttpResponse.json(EMPTY_PAYLOAD[type])))
    renderWithProviders(<Component />)

    expect(
      await screen.findByText(new RegExp(`no ${what} in this period`, 'i')),
    ).toBeInTheDocument()
  })

  it('actually writes a file when exporting', async () => {
    const user = userEvent.setup()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    renderWithProviders(<Component />)
    await screen.findByRole('heading', { name })
    await user.click(screen.getByRole('button', { name: /export csv/i }))

    expect(createUrl).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    click.mockRestore()
    createUrl.mockRestore()
  })
})

describe('the compare toggle', () => {
  it('hides the deltas when it is off', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AllChannelsReport />)

    // Wait for the data, not just the shell: the deltas only exist once the numbers arrive.
    await screen.findByText('Total conversations')
    const deltas = () => document.querySelectorAll('[title$="the previous period"]')
    await waitFor(() => {
      expect(deltas().length).toBeGreaterThan(0)
    })

    await user.click(screen.getByRole('switch', { name: /compare to previous period/i }))
    expect(deltas()).toHaveLength(0)
  })
})

describe('the Company team table', () => {
  it('never shows a predicted score, only ratings customers gave', async () => {
    renderWithProviders(<CompanyReport />)
    await screen.findByRole('heading', { name: 'Company' })

    const table = await screen.findByRole('table')
    // FR-4.44. A predicted number in a performance table is a figure about a person that
    // nobody actually gave them.
    expect(within(table).queryByText(/predicted/i)).not.toBeInTheDocument()
    expect(screen.getByText(/predicted scores never appear in this table/i)).toBeInTheDocument()
  })

  it('leaves happiness blank for someone with no ratings rather than inventing one', async () => {
    server.use(
      http.get('/api/reports/company', () =>
        HttpResponse.json({
          kpis: [
            {
              key: 'helped',
              label: 'Customers helped',
              value: 9,
              deltaPct: 4,
              goodDirection: 'up',
            },
          ],
          series: [],
          team: [
            {
              userId: 'u9',
              name: 'New Starter',
              replies: 3,
              customersHelped: 2,
              happiness: null,
              ratingCount: 0,
            },
          ],
        }),
      ),
    )
    renderWithProviders(<CompanyReport />)

    expect(await screen.findByText(/no ratings yet/i)).toBeInTheDocument()
  })

  it('exports a blank cell, not a made up number, for an unrated agent', () => {
    const csv = toCsv([
      ['Agent', 'Replies', 'Customers helped', 'Happiness score', 'Ratings'],
      ['New Starter', 3, 2, null, 0],
    ])
    expect(csv.split('\r\n')[1]).toBe('New Starter,3,2,,0')
  })
})

describe('the Satisfaction report', () => {
  it('shows the calibration grid so the accuracy figure can be checked', async () => {
    renderWithProviders(<SatisfactionReport />)
    await screen.findByRole('heading', { name: 'Satisfaction' })

    // An accuracy percentage with no confusion grid is unfalsifiable: a model that always
    // guesses Great scores well in a happy month.
    await waitFor(() => {
      expect(screen.getByText('Calibration')).toBeInTheDocument()
    })
    expect(screen.getByText('Actual')).toBeInTheDocument()
  })

  it('states the rating coverage next to the score', async () => {
    renderWithProviders(<SatisfactionReport />)
    await screen.findByRole('heading', { name: 'Satisfaction' })

    // FR-7.6: a score drawn from 8% of conversations means something different from one at 60%.
    expect(await screen.findByText(/actual ratings cover .* of conversations/i)).toBeInTheDocument()
  })
})
