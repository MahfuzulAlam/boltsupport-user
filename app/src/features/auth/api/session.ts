import { sessionSchema } from '@/types'
import { apiRequest } from '@/lib/api-client'

/**
 * The session carries no token. Authentication is an httpOnly, Secure, SameSite cookie the
 * client never reads (NFR-2.5), so "am I signed in" is answered by whether this request
 * succeeds, not by inspecting storage.
 */
export function fetchSession(signal?: AbortSignal) {
  return apiRequest('/session', sessionSchema, { ...(signal ? { signal } : {}) })
}
