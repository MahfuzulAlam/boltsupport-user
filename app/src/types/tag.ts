import { z } from 'zod'
import { idSchema } from './common'

export const tagSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  /** Hex swatch shown on the chip. */
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})
export type Tag = z.infer<typeof tagSchema>
