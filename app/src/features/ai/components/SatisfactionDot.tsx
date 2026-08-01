import type { Csat, PredictedSatisfaction } from '@/types'

interface SatisfactionDotProps {
  prediction: PredictedSatisfaction | undefined
}

const RATING_COLOR: Record<Csat, string> = {
  great: 'var(--success)',
  okay: 'var(--muted-foreground)',
  notGood: 'var(--danger)',
}

const RATING_LABEL: Record<Csat, string> = {
  great: 'Great',
  okay: 'Okay',
  notGood: 'Not good',
}

/**
 * A triage aid, not a scarlet letter.
 *
 * Deliberately a 9px dot: it should be findable when scanning for at risk threads and ignorable
 * otherwise. The tooltip always says "Predicted", because a prediction shown as though it were a
 * real rating is the failure mode this feature has to avoid (FR-4.40).
 */
export function SatisfactionDot({ prediction }: SatisfactionDotProps) {
  if (prediction === undefined) return null

  const actual = prediction.actualRating
  const rating = actual ?? prediction.rating
  const confidence = Math.round(prediction.confidence * 100)

  const label =
    actual === undefined
      ? `Predicted: ${RATING_LABEL[rating]}, ${String(confidence)}% confidence${
          prediction.drivers[0] === undefined
            ? ''
            : `, driven by ${prediction.drivers[0].toLowerCase()}`
        }`
      : `Rated ${RATING_LABEL[actual]} by the customer`

  return (
    <span
      className="inline-block size-[9px] rounded-full"
      style={{
        background: RATING_COLOR[rating],
        // An actual rating is a fact; a prediction is a guess. The ring distinguishes them
        // without spending another colour.
        boxShadow: actual === undefined ? 'none' : '0 0 0 2px var(--background)',
        outline: actual === undefined ? 'none' : `1px solid ${RATING_COLOR[rating]}`,
      }}
      role="img"
      aria-label={label}
      title={label}
    />
  )
}
