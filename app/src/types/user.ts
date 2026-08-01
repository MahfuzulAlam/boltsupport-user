import { z } from 'zod'
import { idSchema } from './common'

export const roleSchema = z.enum(['owner', 'admin', 'agent'])
export type Role = z.infer<typeof roleSchema>

export const userSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  email: z.email(),
  avatarUrl: z.url().optional(),
  role: roleSchema,
  available: z.boolean(),
  /** Open conversation count, used by load balanced routing and the Auto Assign fairness cap. */
  openCount: z.number().int().nonnegative(),
  skills: z.array(z.string()),
})
export type User = z.infer<typeof userSchema>

/** The signed in user. Auth state carries no token: the session is an httpOnly cookie (NFR-2.5). */
export const sessionSchema = z.object({
  user: userSchema,
  workspaceName: z.string().min(1),
})
export type Session = z.infer<typeof sessionSchema>
