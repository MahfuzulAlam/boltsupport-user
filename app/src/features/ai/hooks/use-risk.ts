import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ChurnAlert, RefundThreat } from '@/types'
import {
  fetchAccountHealth,
  fetchChurnAlerts,
  fetchRefundThreat,
  fetchSentimentDrift,
  setChurnAlertState,
  setRefundThreatState,
} from '../api/risk'
import { useAiSettings } from './use-ai'

/**
 * The four detectors, as hooks.
 *
 * Each is gated on both the workspace kill switch and its own toggle, so switching a detector off
 * stops the request rather than hiding the result. AI-7 wants a calm disabled state, and a panel
 * that quietly keeps polling something nobody is looking at is the version of that which shows up
 * on a bill.
 */
function useEnabled(feature: 'healthScore' | 'sentimentDrift' | 'silentChurn' | 'refundThreat') {
  const settings = useAiSettings()
  return settings.data?.enabled === true && settings.data[feature].enabled
}

export function useAccountHealth(contactId: string | undefined) {
  const on = useEnabled('healthScore')
  const query = useQuery({
    queryKey: ['risk', 'health', contactId],
    queryFn: ({ signal }) => fetchAccountHealth(contactId ?? '', signal),
    enabled: on && contactId !== undefined,
  })
  // Surfaced so a container can tell "switched off" apart from "still loading", which are the same
  // shape in TanStack Query and mean opposite things to somebody looking at an empty panel.
  return { ...query, isEnabled: on }
}

export function useSentimentDrift(contactId: string | undefined) {
  const on = useEnabled('sentimentDrift')
  const query = useQuery({
    queryKey: ['risk', 'sentiment', contactId],
    queryFn: ({ signal }) => fetchSentimentDrift(contactId ?? '', signal),
    enabled: on && contactId !== undefined,
  })
  return { ...query, isEnabled: on }
}

export function useChurnAlerts(contactId?: string) {
  const on = useEnabled('silentChurn')
  const query = useQuery({
    queryKey: ['risk', 'churn', contactId ?? 'all'],
    queryFn: ({ signal }) => fetchChurnAlerts(contactId, signal),
    enabled: on,
  })
  return { ...query, isEnabled: on }
}

export function useRefundThreat(conversationId: string | undefined) {
  const on = useEnabled('refundThreat')
  const query = useQuery({
    queryKey: ['risk', 'refund-threat', conversationId],
    queryFn: ({ signal }) => fetchRefundThreat(conversationId ?? '', signal),
    enabled: on && conversationId !== undefined,
  })
  return { ...query, isEnabled: on }
}

/** Acknowledging or dismissing a churn alert. Dismissal is calibration data, not a no-op (AI-6). */
export function useChurnAlertState(contactId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: ChurnAlert['state'] }) =>
      setChurnAlertState(id, state),
    onSuccess: async (alert) => {
      await queryClient.invalidateQueries({ queryKey: ['risk', 'churn', contactId ?? 'all'] })
      toast(alert.state === 'dismissed' ? 'Alert dismissed' : 'Alert acknowledged', {
        description:
          alert.state === 'dismissed'
            ? 'Recorded, so the detector can learn what you do not want flagged.'
            : 'It stays on the account until the reason stops being true.',
      })
    },
  })
}

export function useRefundThreatState(conversationId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, state }: { id: string; state: RefundThreat['state'] }) =>
      setRefundThreatState(id, state),
    onSuccess: async (threat) => {
      await queryClient.invalidateQueries({
        queryKey: ['risk', 'refund-threat', conversationId],
      })
      toast(threat.state === 'escalated' ? 'Escalated to a lead' : 'Refund threat dismissed', {
        description:
          threat.state === 'escalated'
            ? 'They can see the thread and the phrase that fired this.'
            : 'Recorded for calibration. The banner stays down on this conversation.',
      })
    },
  })
}
