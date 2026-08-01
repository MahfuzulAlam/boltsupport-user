import type { Csat, PredictedSatisfaction } from '@/types'
import { AiSurface } from './AiSurface'

interface PredictedSatisfactionPanelProps {
  prediction: PredictedSatisfaction | undefined
}

const RATING_STYLE: Record<Csat, { label: string; bg: string; fg: string }> = {
  great: { label: 'Great', bg: 'var(--success-soft)', fg: 'var(--success-strong)' },
  okay: { label: 'Okay', bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
  notGood: { label: 'Not good', bg: 'var(--danger-soft)', fg: 'var(--danger-strong)' },
}

/**
 * Predicted satisfaction (FR-4.39, FR-4.40).
 *
 * Two rules shape this panel. It is always labelled as a prediction, never presented as a
 * rating. And the moment a real rating exists the prediction is demoted to a calibration
 * footnote, because an actual answer from the customer outranks a guess about them.
 *
 * It renders inside AiSurface, which marks it `data-internal` so it can never be mistaken for
 * something customer facing (AI-6).
 */
export function PredictedSatisfactionPanel({ prediction }: PredictedSatisfactionPanelProps) {
  if (prediction === undefined) return null

  const actual = prediction.actualRating
  const confidence = Math.round(prediction.confidence * 100)

  if (actual !== undefined) {
    return (
      <AiSurface title="Satisfaction">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 items-center rounded px-2 text-[13px] font-semibold"
            style={{ background: RATING_STYLE[actual].bg, color: RATING_STYLE[actual].fg }}
          >
            {RATING_STYLE[actual].label}
          </span>
          <span className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            rated by the customer
          </span>
        </div>
        <p className="mt-2 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
          We predicted {RATING_STYLE[prediction.rating].label} at{' '}
          <span className="font-mono">{confidence}%</span>.
        </p>
      </AiSurface>
    )
  }

  return (
    <AiSurface title="Predicted satisfaction">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex h-6 items-center rounded px-2 text-[13px] font-semibold"
          style={{
            background: RATING_STYLE[prediction.rating].bg,
            color: RATING_STYLE[prediction.rating].fg,
          }}
        >
          {RATING_STYLE[prediction.rating].label}
        </span>
        <span className="font-mono text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          {confidence}% confidence
        </span>
      </div>

      <p className="mt-1.5 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        Predicted, not a real rating
      </p>

      {prediction.drivers.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {prediction.drivers.map((driver) => (
            <span
              key={driver}
              className="rounded px-1.5 py-0.5 text-[12px]"
              style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
            >
              {driver}
            </span>
          ))}
        </div>
      ) : null}
    </AiSurface>
  )
}
