import { z } from 'zod'
import { idSchema, isoDateSchema } from './common'

/** Custom properties are operator defined, so the value type stays open but bounded. */
export const contactPropertyValueSchema = z.union([z.string(), z.number(), z.boolean()])

export const contactSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  email: z.email(),
  website: z.string().optional(),
  avatarUrl: z.url().optional(),
  plan: z.string().optional(),
  conversationsCount: z.number().int().nonnegative(),
  lastSeen: isoDateSchema,
  properties: z.record(z.string(), contactPropertyValueSchema),
})
export type Contact = z.infer<typeof contactSchema>

/** The denormalised slice of a contact carried on every conversation row. */
export const contactRefSchema = contactSchema.pick({
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
})
export type ContactRef = z.infer<typeof contactRefSchema>
