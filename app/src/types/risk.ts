import { z } from 'zod'
import { confidenceSchema, idSchema, isoDateSchema } from './common'

/**
 * Risk detection: four features that watch for trouble rather than help write a reply.
 *
 * Three of them are account level and slow moving, so they belong in a sidebar where somebody
 * notices them while doing something else. The fourth is a single conversation firing in real time,
 * and it interrupts. That difference in kind is why the refund threat is modelled separately rather
 * than as a fourth kind of account signal.
 *
 * All four are internal only (AI-8). None of them is ever quoted to a customer, and none of them
 * may appear in an agent performance ranking.
 */

/* ------------------------------------------------------------------ health */

/**
 * Three bands, not a gradient.
 *
 * A number between 0 and 100 invites false precision: nobody can act on the difference between 61
 * and 64. The bands are the decision, the score is the ordering inside it.
 */
export const healthBandSchema = z.enum(['healthy', 'watch', 'at_risk'])
export type HealthBand = z.infer<typeof healthBandSchema>

export const HEALTH_BANDS = {
  healthy: { label: 'Healthy', min: 0, max: 39 },
  watch: { label: 'Watch', min: 40, max: 69 },
  at_risk: { label: 'At risk', min: 70, max: 100 },
} as const satisfies Record<HealthBand, { label: string; min: number; max: number }>

export function bandFor(score: number): HealthBand {
  if (score >= HEALTH_BANDS.at_risk.min) return 'at_risk'
  if (score >= HEALTH_BANDS.watch.min) return 'watch'
  return 'healthy'
}

export const healthSignalKeySchema = z.enum([
  'repeat_issues',
  'resolution_drift',
  'response_latency',
  'escalation_rate',
  'sentiment_trend',
])
export type HealthSignalKey = z.infer<typeof healthSignalKeySchema>

/**
 * One contributing signal.
 *
 * Points rather than weights, and they sum to the score, so the breakdown is an explanation rather
 * than a decoration. AI-4 forbids a bare score anywhere in this product; here the breakdown is the
 * "Why?", which is why it is required on the model rather than optional.
 */
export const healthSignalSchema = z.object({
  key: healthSignalKeySchema,
  /** Risk points this signal contributes. The signals sum to the score. */
  points: z.number().int().min(0).max(100),
  /** The measured value, already formatted, for example "4 in 30 days" or "+38%". */
  value: z.string().min(1),
  /** Which way it moved against the previous window. */
  direction: z.enum(['worse', 'better', 'flat']),
  /** One sentence on what was measured and why it counts. */
  detail: z.string().min(1),
})
export type HealthSignal = z.infer<typeof healthSignalSchema>

/** One reading, for the trend line. */
export const healthPointSchema = z.object({
  at: isoDateSchema,
  score: z.number().int().min(0).max(100),
})
export type HealthPoint = z.infer<typeof healthPointSchema>

export const accountHealthSchema = z.object({
  contactId: idSchema,
  score: z.number().int().min(0).max(100),
  band: healthBandSchema,
  /** Oldest first. A current score with no history cannot tell you whether it is improving. */
  trend: z.array(healthPointSchema).min(2),
  signals: z.array(healthSignalSchema),
  updatedAt: isoDateSchema,
})
export type AccountHealth = z.infer<typeof accountHealthSchema>

/* --------------------------------------------------------------- sentiment */

/**
 * Direction is computed and stored, not derived in the component.
 *
 * The whole point of this feature is telling a single bad ticket apart from a real decline, and
 * that judgement needs the window the detector used. A component holding the last few values would
 * re-derive it from whatever happened to be loaded, which is how the same account ends up reading
 * "declining" on one screen and "stable" on another.
 */
export const sentimentDirectionSchema = z.enum(['stable', 'declining', 'improving'])
export type SentimentDirection = z.infer<typeof sentimentDirectionSchema>

export const sentimentPointSchema = z.object({
  conversationId: idSchema,
  subject: z.string(),
  at: isoDateSchema,
  /** Minus one is angry, zero is neutral, plus one is delighted. */
  sentiment: z.number().min(-1).max(1),
})
export type SentimentPoint = z.infer<typeof sentimentPointSchema>

export const sentimentDriftSchema = z.object({
  contactId: idSchema,
  direction: sentimentDirectionSchema,
  /** Mean over the recent window. */
  current: z.number().min(-1).max(1),
  /** Mean over the window before it, which is what makes the direction meaningful. */
  previous: z.number().min(-1).max(1),
  /** How many tickets each window covers. */
  windowSize: z.number().int().positive(),
  /** Oldest first, one entry per ticket in both windows. */
  points: z.array(sentimentPointSchema).min(2),
  updatedAt: isoDateSchema,
})
export type SentimentDrift = z.infer<typeof sentimentDriftSchema>

/* ------------------------------------------------------------- silent churn */

export const churnRiskSchema = z.enum(['low', 'medium', 'high'])
export type ChurnRisk = z.infer<typeof churnRiskSchema>

/**
 * A churn alert is a sentence, not a number.
 *
 * The failure mode this feature exists to avoid is an account going quiet, and quiet does not
 * announce itself. A score of 0.78 tells nobody what to do about it. The reason is mandatory on the
 * model and there is deliberately no UI slot for the score on its own, so a future change cannot
 * quietly drop the explanation and leave the number behind.
 */
export const churnAlertSchema = z.object({
  id: idSchema,
  contactId: idSchema,
  /** Human readable and required. This is the feature. */
  reason: z.string().min(1),
  risk: churnRiskSchema,
  confidence: confidenceSchema,
  detectedAt: isoDateSchema,
  /** When the customer last said anything. Absent means never. */
  lastInboundAt: isoDateSchema.optional(),
  /** The conversations behind the reason, so somebody can check it rather than believe it. */
  evidence: z.array(z.object({ conversationId: idSchema, subject: z.string() })).default([]),
  state: z.enum(['open', 'acknowledged', 'dismissed']),
})
export type ChurnAlert = z.infer<typeof churnAlertSchema>

/* ------------------------------------------------------------ refund threat */

/**
 * A refund threat, on one conversation, right now.
 *
 * Different in kind from the three above: those describe an account drifting over weeks and can
 * wait in a sidebar. This one is a customer saying the word in the message an agent is reading, and
 * the cost of noticing it an hour later is the refund. So it renders as a banner in the thread with
 * an escalation action, not as a badge somewhere quiet.
 */
export const refundThreatSchema = z.object({
  id: idSchema,
  conversationId: idSchema,
  /** The message that fired it, so the banner can point at the evidence. */
  messageId: idSchema,
  confidence: confidenceSchema,
  /** The customer's own words. Untrusted text, rendered as data and never as instructions. */
  phrase: z.string().min(1),
  detectedAt: isoDateSchema,
  state: z.enum(['open', 'escalated', 'dismissed']),
})
export type RefundThreat = z.infer<typeof refundThreatSchema>
