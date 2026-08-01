import { z } from 'zod'
import { ratingSchema, timePointSchema } from '@/types'
import { apiRequest } from '@/lib/api-client'

const kpiSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  deltaPct: z.number(),
  /** Which way is good. A falling response time is an improvement; a falling volume is not. */
  goodDirection: z.enum(['up', 'down']),
})
export type Kpi = z.infer<typeof kpiSchema>

const bucketSchema = z.object({
  label: z.string(),
  count: z.number(),
  pct: z.number(),
  deltaPct: z.number(),
})
export type Bucket = z.infer<typeof bucketSchema>

export const allChannelsSchema = z.object({
  kpis: z.array(kpiSchema),
  busiestDay: z.object({ day: z.string(), count: z.number() }),
  byChannel: z.array(
    z.object({ channel: z.string(), conversations: z.number(), customers: z.number() }),
  ),
  series: z.array(timePointSchema),
  tags: z.array(bucketSchema.extend({ name: z.string() }).omit({ label: true })),
  savedReplies: z.array(bucketSchema.extend({ name: z.string() }).omit({ label: true })),
})
export type AllChannelsData = z.infer<typeof allChannelsSchema>

export const emailSchema = z.object({
  kpis: z.array(kpiSchema),
  series: z.array(timePointSchema),
  responseBuckets: z.array(bucketSchema),
  resolutionBuckets: z.array(bucketSchema),
})
export type EmailData = z.infer<typeof emailSchema>

export const happinessDataSchema = z.object({
  great: z.number(),
  okay: z.number(),
  notGood: z.number(),
  score: z.number(),
  totalRatings: z.number(),
  coveragePct: z.number(),
  deltas: z.object({ great: z.number(), okay: z.number(), notGood: z.number() }),
  ratings: z.array(ratingSchema),
})
export type HappinessData = z.infer<typeof happinessDataSchema>

export const companySchema = z.object({
  kpis: z.array(kpiSchema),
  series: z.array(timePointSchema),
  team: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      replies: z.number(),
      customersHelped: z.number(),
      /** Null, never a prediction. See FR-4.44. */
      happiness: z.number().nullable(),
      ratingCount: z.number(),
    }),
  ),
})
export type CompanyData = z.infer<typeof companySchema>

export const aiSchema = z.object({
  handled: z.number(),
  resolutionRate: z.number(),
  resolved: z.number(),
  unresolved: z.number(),
  escalated: z.number(),
  happiness: z.object({
    great: z.number(),
    okay: z.number(),
    notGood: z.number(),
    score: z.number(),
  }),
  series: z.array(
    z.object({
      date: z.string(),
      email: z.number(),
      chat: z.number(),
      messaging: z.number(),
      social: z.number(),
    }),
  ),
  tiles: z.array(
    z.object({ key: z.string(), label: z.string(), value: z.number(), suffix: z.string() }),
  ),
})
export type AiData = z.infer<typeof aiSchema>

export const satisfactionSchema = z.object({
  actualScore: z.number(),
  predictedScore: z.number(),
  coveragePct: z.number(),
  atRisk: z.number(),
  series: z.array(z.object({ date: z.string(), actual: z.number(), predicted: z.number() })),
  calibration: z.object({
    accuracyPct: z.number(),
    sampleSize: z.number(),
    grid: z.record(z.string(), z.number()),
  }),
  drivers: z.array(z.object({ label: z.string(), impactPct: z.number() })),
})
export type SatisfactionData = z.infer<typeof satisfactionSchema>

const SCHEMAS = {
  'all-channels': allChannelsSchema,
  email: emailSchema,
  happiness: happinessDataSchema,
  company: companySchema,
  ai: aiSchema,
  satisfaction: satisfactionSchema,
} as const

export type ReportType = keyof typeof SCHEMAS

export function fetchReport<T extends ReportType>(
  type: T,
  days: number,
  channel: string,
  signal?: AbortSignal,
): Promise<z.infer<(typeof SCHEMAS)[T]>> {
  return apiRequest(`/reports/${type}?days=${String(days)}&channel=${channel}`, SCHEMAS[type], {
    ...(signal ? { signal } : {}),
  }) as Promise<z.infer<(typeof SCHEMAS)[T]>>
}
