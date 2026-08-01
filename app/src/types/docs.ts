import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

export const collectionSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  domain: z.string(),
  private: z.boolean(),
  articleCount: z.number().int().nonnegative(),
})
export type Collection = z.infer<typeof collectionSchema>

export const categorySchema = z.object({
  id: idSchema,
  collectionId: idSchema,
  name: z.string().min(1),
  articleCount: z.number().int().nonnegative(),
})
export type Category = z.infer<typeof categorySchema>

export const articleSchema = z.object({
  id: idSchema,
  collectionId: idSchema,
  categoryId: idSchema.nullable(),
  title: z.string(),
  slug: z.string(),
  bodyHtml: z.string(),
  /** AI suggested articles always land here, never published (spec section 18). */
  status: z.enum(['draft', 'published']),
  updatedAt: isoDateSchema,
  keywords: z.array(z.string()),
  relatedIds: z.array(idSchema),
  seo: z.object({
    /** Counters in the editor target 55 and 155. */
    titleTag: z.string(),
    metaDescription: z.string(),
  }),
})
export type Article = z.infer<typeof articleSchema>

export const savedReplySchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  bodyHtml: z.string(),
  usageCount: z.number().int().nonnegative(),
})
export type SavedReply = z.infer<typeof savedReplySchema>
