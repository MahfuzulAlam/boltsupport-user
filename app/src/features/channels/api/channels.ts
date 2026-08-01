import { channelSchema } from '@/types'
import { apiRequest } from '@/lib/api-client'

export interface ConnectPayload {
  account: string
  /** The scopes the modal disclosed. The client never learns them from the provider response. */
  scopes: string[]
}

export function connectChannel(inboxId: string, channelId: string, payload: ConnectPayload) {
  return apiRequest(`/inboxes/${inboxId}/channels/${channelId}/connect`, channelSchema, {
    method: 'POST',
    body: payload,
  })
}

export function disconnectChannel(inboxId: string, channelId: string) {
  return apiRequest(`/inboxes/${inboxId}/channels/${channelId}/disconnect`, channelSchema, {
    method: 'POST',
    body: {},
  })
}

export function syncChannel(inboxId: string, channelId: string) {
  return apiRequest(`/inboxes/${inboxId}/channels/${channelId}/sync`, channelSchema, {
    method: 'POST',
    body: {},
  })
}
