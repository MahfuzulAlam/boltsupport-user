import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'
import { csatSchema } from './enums'

/** A figure plus its change against the previous period. Every KPI tile renders one. */
export const metricSchema = z.object({
  value: z.number(),
  deltaPct: z.number(),
})
export type Metric = z.infer<typeof metricSchema>

export const ratingSchema = z.object({
  id: idSchema,
  conversationNumber: z.number().int().positive(),
  customer: z.string(),
  agent: z.string(),
  date: isoDateSchema,
  rating: csatSchema,
  comment: z.string().optional(),
})
export type Rating = z.infer<typeof ratingSchema>

/** One point on a report time series. */
export const timePointSchema = z.object({
  date: z.string(),
  value: z.number(),
  previous: z.number().optional(),
})
export type TimePoint = z.infer<typeof timePointSchema>

/**
 * Happiness is NPS shaped: percent Great minus percent Not good (FR-7.5). Coverage travels
 * with it because a score from 8% of conversations means something different from one at 60%
 * (FR-7.6), and reporting it alone is how a satisfaction number becomes misleading.
 */
export const happinessSchema = z.object({
  great: z.number().int().nonnegative(),
  okay: z.number().int().nonnegative(),
  notGood: z.number().int().nonnegative(),
  score: z.number(),
  totalRatings: z.number().int().nonnegative(),
  coveragePct: z.number(),
})
export type Happiness = z.infer<typeof happinessSchema>
