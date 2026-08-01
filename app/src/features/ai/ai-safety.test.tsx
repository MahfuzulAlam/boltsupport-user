import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { getDb } from '@/mocks/db'
import { PredictedSatisfactionPanel } from './components/PredictedSatisfactionPanel'
import { AiSurface } from './components/AiSurface'

/**
 * Guards for the AI safety requirements that a component test alone cannot cover.
 *
 * These are release blockers in the PRD, and the failure mode for most of them is silent: an
 * internal artifact leaking into something a customer can see looks completely normal in the
 * agent's browser.
 */

/**
 * Source read through Vite's glob rather than node:fs, so these run in the same environment as
 * every other test and need no Node types in the app tsconfig.
 *
 * The globs are deliberately narrow. An eager `?raw` glob over all of `src` forces Vite to
 * serve every module twice, which slowed the whole suite enough to start timing out unrelated
 * files. Only components can style anything, and only these modules could hold a send.
 */
const STYLED_SOURCES: Record<string, string> = import.meta.glob(
  ['/src/features/**/*.tsx', '/src/components/**/*.tsx'],
  { query: '?raw', import: 'default', eager: true },
)

const AI_SOURCES: Record<string, string> = import.meta.glob(
  ['/src/features/ai/**/*.{ts,tsx}', '/src/features/composer/hooks/use-auto-draft.ts'],
  { query: '?raw', import: 'default', eager: true },
)

const RENDERER: Record<string, string> = import.meta.glob(
  '/src/features/conversations/components/EmailIframeRenderer.tsx',
  { query: '?raw', import: 'default', eager: true },
)

const notATest = (file: string) => !file.includes('.test.')

describe('AI-6: internal artifacts stay internal', () => {
  it('marks every AI surface as internal in the DOM', () => {
    const { container } = renderWithProviders(
      <AiSurface title="AI summary">
        <p>internal only</p>
      </AiSurface>,
    )

    const surface = container.querySelector('[data-ai-generated="true"]')
    expect(surface).toHaveAttribute('data-internal', 'true')
  })

  it('marks the predicted satisfaction panel internal too', () => {
    const conversation = getDb().conversations.find(
      (c) => c.ai?.predictedSatisfaction !== undefined,
    )
    const prediction = conversation?.ai?.predictedSatisfaction
    expect(prediction).toBeDefined()

    const { container } = renderWithProviders(
      <PredictedSatisfactionPanel prediction={prediction} />,
    )
    expect(container.querySelector('[data-internal="true"]')).toBeInTheDocument()
  })

  it('always labels a prediction as predicted', () => {
    const prediction = {
      rating: 'notGood' as const,
      confidence: 0.71,
      drivers: ['Slow first response'],
      predictedAt: new Date().toISOString(),
    }
    renderWithProviders(<PredictedSatisfactionPanel prediction={prediction} />)

    // FR-4.40. A prediction shown as though it were a rating is the failure this guards.
    expect(screen.getByText(/predicted, not a real rating/i)).toBeInTheDocument()
  })

  it('demotes the prediction once a real rating exists', () => {
    const prediction = {
      rating: 'notGood' as const,
      confidence: 0.71,
      drivers: [],
      predictedAt: new Date().toISOString(),
      actualRating: 'great' as const,
    }
    renderWithProviders(<PredictedSatisfactionPanel prediction={prediction} />)

    expect(screen.getByText(/rated by the customer/i)).toBeInTheDocument()
    expect(screen.getByText(/we predicted/i)).toBeInTheDocument()
    expect(screen.queryByText(/predicted, not a real rating/i)).not.toBeInTheDocument()
  })

  it('never renders an AI artifact through the customer facing email path', () => {
    // The sandboxed iframe is the only surface a customer's own content flows through, and it
    // is fed exclusively from message bodies. If a summary, prediction, or draft were ever piped
    // into it, this is where that would show up.
    const renderer =
      RENDERER['/src/features/conversations/components/EmailIframeRenderer.tsx'] ?? ''
    expect(renderer.length).toBeGreaterThan(0)
    for (const artifact of ['summary', 'prediction', 'predictedSatisfaction', 'evaluation']) {
      expect(renderer.toLowerCase()).not.toContain(artifact.toLowerCase())
    }
  })
})

describe('AI-1: nothing sends itself', () => {
  it('keeps the send endpoint out of every AI module', () => {
    const aiFiles = Object.keys(AI_SOURCES).filter(notATest)
    expect(aiFiles.length).toBeGreaterThan(5)

    for (const file of aiFiles) {
      const source = AI_SOURCES[file] ?? ''
      // A POST to /messages is the only way a reply reaches a customer. No AI module may hold
      // one, which makes "AI never sends" a structural property rather than a promise.
      expect(source, `${file} references the send endpoint`).not.toMatch(/\/messages['"`]/)
    }
  })
})

describe('AI-5: violet belongs to AI alone', () => {
  it('is not spent on anything that is not AI', () => {
    const offenders: string[] = []

    for (const file of Object.keys(STYLED_SOURCES).filter(notATest)) {
      if (file.includes('/features/ai/')) continue
      if (file.includes('TokenProof')) continue

      const source = STYLED_SOURCES[file] ?? ''
      if (!source.includes('var(--ai)') && !source.includes('var(--ai-soft)')) continue

      // Outside the AI slice, the violet token may only appear alongside something that marks
      // the surface as AI.
      const looksAi =
        source.includes('Sparkles') ||
        source.includes('provenance="ai"') ||
        source.includes("'ai'") ||
        source.includes('AiSurface') ||
        source.includes('autoDraft') ||
        source.includes('ai: true') ||
        source.includes('ai?: boolean')
      if (!looksAi) offenders.push(file)
    }

    expect(offenders).toEqual([])
  })
})

describe('AI-11: the workspace kill switch', () => {
  it('takes effect on the first click, without a second confirmation', async () => {
    const user = userEvent.setup()
    const { AiHubPage } = await import('./components/AiHubPage')
    renderWithProviders(<AiHubPage />)

    const toggle = await screen.findByRole('switch', { name: /ai features are on/i })
    await user.click(toggle)

    // Update-then-save closes over the draft from before the update and silently does nothing.
    // For a control whose whole job is to stop the AI now, that is the worst failure available.
    await waitFor(() => {
      expect(getDb().aiSettings.enabled).toBe(false)
    })
  })

  it('shows every feature as off once the workspace switch is', async () => {
    const user = userEvent.setup()
    const { AiHubPage } = await import('./components/AiHubPage')
    renderWithProviders(<AiHubPage />)

    await user.click(await screen.findByRole('switch', { name: /ai features are on/i }))

    // AI-11 asks for calm disabled states, not errors: the cards stay, they just read off.
    await waitFor(() => {
      expect(screen.getAllByText('Workspace off').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
  })
})
