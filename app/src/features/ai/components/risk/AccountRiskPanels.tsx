import { Link } from 'react-router-dom'
import { useAiSettings } from '@/features/ai/hooks/use-ai'
import {
  useAccountHealth,
  useChurnAlerts,
  useChurnAlertState,
  useSentimentDrift,
} from '@/features/ai/hooks/use-risk'
import { ChurnAlertList } from './ChurnAlertList'
import { HealthScorePanel } from './HealthScorePanel'
import { SentimentDriftPanel } from './SentimentDriftPanel'

function Skeleton() {
  return (
    <div
      className="mb-3 h-[120px] animate-pulse rounded-lg"
      style={{ background: 'var(--muted)' }}
      aria-hidden="true"
    />
  )
}

function Failed({ what }: { what: string }) {
  // AI-7: one detector failing does not take the rest of the panel with it.
  return (
    <p className="mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
      {what} could not be loaded. The rest of this page is unaffected.
    </p>
  )
}

/**
 * The three account level detectors, in one place.
 *
 * Composed here rather than at each call site so the conversation sidebar and the customer profile
 * cannot drift into showing different subsets of the same three findings. Ordered by how quickly
 * somebody would act on them: churn first because it names something to do, then health, then the
 * sentiment trend that partly feeds it.
 */
export function AccountRiskPanels({
  contactId,
  inboxId,
}: {
  contactId: string | undefined
  /** Enables links through to the conversations behind a finding. */
  inboxId?: string
}) {
  const settings = useAiSettings()
  const health = useAccountHealth(contactId)
  const drift = useSentimentDrift(contactId)
  const churn = useChurnAlerts(contactId)
  const setState = useChurnAlertState(contactId)

  if (settings.data?.enabled === false) {
    return (
      <p className="mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
        AI features are turned off for this workspace.{' '}
        <Link to="/ai" style={{ color: 'var(--brand)' }}>
          Turn them on
        </Link>
        .
      </p>
    )
  }

  const anyOn = health.isEnabled || drift.isEnabled || churn.isEnabled
  if (!anyOn) return null

  return (
    <>
      {churn.isPending && churn.isFetching ? <Skeleton /> : null}
      {churn.isError ? <Failed what="Churn risk" /> : null}
      {churn.data !== undefined ? (
        <ChurnAlertList
          alerts={churn.data}
          inboxId={inboxId}
          pending={setState.isPending}
          onSetState={(id, state) => {
            setState.mutate({ id, state })
          }}
        />
      ) : null}

      {health.isPending && health.isFetching ? <Skeleton /> : null}
      {health.isError ? <Failed what="Account health" /> : null}
      {health.data != null ? <HealthScorePanel health={health.data} /> : null}

      {drift.isPending && drift.isFetching ? <Skeleton /> : null}
      {drift.isError ? <Failed what="The sentiment trend" /> : null}
      {drift.data != null ? <SentimentDriftPanel drift={drift.data} inboxId={inboxId} /> : null}
    </>
  )
}
