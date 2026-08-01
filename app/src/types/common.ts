import { z } from 'zod'

/**
 * Shared primitives.
 *
 * Every domain type in this folder is defined as a zod schema first and its TypeScript type
 * inferred from it. NFR-2.7 requires parsing every API response before it reaches state, and
 * a single definition is the only way schema and type cannot drift apart.
 */

export const idSchema = z.string().min(1)
export type ID = z.infer<typeof idSchema>

/** ISO 8601 timestamp. The seed data uses Z, real APIs may send an offset. */
export const isoDateSchema = z.iso.datetime({ offset: true })
export type ISODate = z.infer<typeof isoDateSchema>

/** A confidence value from a model. Always 0 to 1, always rendered as a mono percentage. */
export const confidenceSchema = z.number().min(0).max(1)

/** Envelope for any paginated list endpoint. */
export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    /** Opaque cursor for the next page, null when this is the last one. */
    nextCursor: z.string().nullable(),
  })
}

export interface Paginated<T> {
  items: T[]
  total: number
  nextCursor: string | null
}
