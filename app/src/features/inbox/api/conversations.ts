import {
  conversationSchema,
  inboxSchema,
  paginatedSchema,
  tagSchema,
  userSchema,
  viewSchema,
  type ConvStatus,
  type Folder,
  type Priority,
} from '@/types'
import { apiRequest } from '@/lib/api-client'
import { z } from 'zod'

/**
 * Typed requests for the inbox slice. The schema lives beside the request so the response is
 * validated at the only place it can enter the app (NFR-2.7).
 */

const conversationPageSchema = paginatedSchema(conversationSchema)
export type ConversationPage = z.infer<typeof conversationPageSchema>

export interface ConversationListParams {
  inboxId?: string
  folder?: Folder
  sort?: 'newest' | 'oldest' | 'waiting' | 'sla'
  search?: string
  cursor?: string
  limit?: number
}

export function fetchConversations(
  params: ConversationListParams = {},
  signal?: AbortSignal,
): Promise<ConversationPage> {
  return apiRequest('/conversations', conversationPageSchema, {
    ...(signal ? { signal } : {}),
    searchParams: {
      inboxId: params.inboxId,
      folder: params.folder,
      sort: params.sort,
      q: params.search,
      cursor: params.cursor,
      limit: params.limit,
    },
  })
}

export function fetchInboxes(signal?: AbortSignal) {
  return apiRequest('/inboxes', z.array(inboxSchema), { ...(signal ? { signal } : {}) })
}

export function fetchTags(signal?: AbortSignal) {
  return apiRequest('/tags', z.array(tagSchema), { ...(signal ? { signal } : {}) })
}

export function fetchViews(signal?: AbortSignal) {
  return apiRequest('/views', z.array(viewSchema), { ...(signal ? { signal } : {}) })
}

export function fetchUsers(signal?: AbortSignal) {
  return apiRequest('/users', z.array(userSchema), { ...(signal ? { signal } : {}) })
}

export interface ConversationPatch {
  assigneeId?: string | null
  status?: ConvStatus
  priority?: Priority
  unread?: boolean
  subject?: string
  /** Ids, not tag objects: the server owns the name and colour. */
  tagIds?: string[]
  /** Moving the conversation to another inbox. */
  inboxId?: string
  followerIds?: string[]
}

export function patchConversation(id: string, patch: ConversationPatch) {
  return apiRequest(`/conversations/${id}`, conversationSchema, {
    method: 'PATCH',
    body: patch,
  })
}

export function deleteConversation(id: string) {
  return apiRequest(`/conversations/${id}`, conversationSchema, { method: 'DELETE' })
}

/** Undo for a delete. The record is held rather than erased, so this really does bring it back. */
export function restoreConversation(id: string) {
  return apiRequest(`/conversations/${id}/restore`, conversationSchema, { method: 'POST' })
}
