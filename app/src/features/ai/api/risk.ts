import { z } from 'zod'
import {
  accountHealthSchema,
  churnAlertSchema,
  refundThreatSchema,
  sentimentDriftSchema,
  type ChurnAlert,
  type RefundThreat,
} from '@/types'
import { ApiError, apiRequest } from '@/lib/api-client'

/**
 * Risk detection requests.
 *
 * An account with no findings is the normal case, not a failure, so the three account level reads
 * turn a 404 into null rather than throwing. A missing health score should render an empty panel,
 * never an error boundary; a genuine failure still surfaces as one.
 */
async function orNull<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export function fetchAccountHealth(contactId: string, signal?: AbortSignal) {
  return orNull(
    apiRequest(`/risk/health/${contactId}`, accountHealthSchema, { ...(signal ? { signal } : {}) }),
  )
}

export function fetchSentimentDrift(contactId: string, signal?: AbortSignal) {
  return orNull(
    apiRequest(`/risk/sentiment/${contactId}`, sentimentDriftSchema, {
      ...(signal ? { signal } : {}),
    }),
  )
}

export function fetchChurnAlerts(contactId?: string, signal?: AbortSignal) {
  return apiRequest(`/risk/churn`, z.array(churnAlertSchema), {
    ...(signal ? { signal } : {}),
    searchParams: { contactId },
  })
}

export function setChurnAlertState(id: string, state: ChurnAlert['state']) {
  return apiRequest(`/risk/churn/${id}`, churnAlertSchema, { method: 'PATCH', body: { state } })
}

export function fetchRefundThreat(conversationId: string, signal?: AbortSignal) {
  return orNull(
    apiRequest(`/risk/refund-threat/${conversationId}`, refundThreatSchema, {
      ...(signal ? { signal } : {}),
    }),
  )
}

export function setRefundThreatState(id: string, state: RefundThreat['state']) {
  return apiRequest(`/risk/refund-threat/${id}`, refundThreatSchema, {
    method: 'PATCH',
    body: { state },
  })
}
