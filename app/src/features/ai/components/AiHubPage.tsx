import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Toggle } from '@/components/settings-primitives'
import { useAiSettings } from '../hooks/use-ai'
import { fetchAiAgent } from '../api/ai'
import { useAiSettingsForm } from '../hooks/use-ai-settings-form'

interface FeatureCard {
  key: string
  name: string
  what: string
  to: string
  on: boolean
  metric: string
  metricLabel: string
}

export function AiHubPage() {
  const settings = useAiSettings()
  const form = useAiSettingsForm()
  const agent = useQuery({
    queryKey: ['ai-agent'],
    queryFn: ({ signal }) => fetchAiAgent(signal),
    retry: false,
  })

  const data = settings.data
  const workspaceOn = data?.enabled ?? false

  const cards: FeatureCard[] =
    data === undefined
      ? []
      : [
          {
            key: 'summary',
            name: 'Summary',
            what: 'Condenses a long thread so you can pick it up without reading all of it.',
            to: '/ai/evaluation',
            on: workspaceOn,
            metric: 'On demand',
            metricLabel: 'never automatic',
          },
          {
            key: 'auto-draft',
            name: 'Auto draft',
            what: 'Writes a reply for you to edit. It never sends anything itself.',
            to: '/ai/auto-draft',
            on: data.autoDraft.enabled,
            metric: `${String(Math.round(data.autoDraft.lowConfidenceThreshold * 100))}%`,
            metricLabel: 'low confidence cutoff',
          },
          {
            key: 'auto-assign',
            name: 'Auto assign',
            what: 'Routes a new conversation to whoever has handled ones like it.',
            to: '/ai/auto-assign',
            on: data.autoAssign.enabled,
            metric: `${String(Math.round(data.autoAssign.threshold * 100))}%`,
            metricLabel: 'confidence threshold',
          },
          {
            key: 'auto-tag',
            name: 'Auto tag',
            what: 'Suggests tags from a list you control. It can never invent one.',
            to: '/ai/auto-tag',
            on: data.autoTag.enabled,
            metric: String(data.autoTag.allowedTagIds.length),
            metricLabel: 'tags allowed',
          },
          {
            key: 'evaluation',
            name: 'Evaluation',
            what: 'Checks a reply before you send it. It never blocks Send.',
            to: '/ai/evaluation',
            on: data.evaluation.enabled,
            metric: `${String(Math.round(data.evaluation.samplingRate * 100))}%`,
            metricLabel: 'of replies sampled',
          },
          {
            key: 'satisfaction',
            name: 'Predicted satisfaction',
            what: 'Flags a conversation heading for a bad rating while you can still rescue it.',
            to: '/ai/satisfaction',
            on: data.satisfaction.enabled,
            metric: data.satisfaction.visibleTo === 'leads' ? 'Leads' : 'Everyone',
            metricLabel: 'can see predictions',
          },
        ]

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 pt-6 pb-10">
      <PageHeader
        title="AI"
        description="Six features that suggest. A person decides every time."
      />

      {/* AI-11. The kill switch is the first control on the page, because the reason to reach
          for it is usually urgent. */}
      <div
        className="mb-4 rounded-lg border p-3.5"
        style={{
          borderColor: workspaceOn ? 'var(--border)' : 'var(--warning)',
          background: workspaceOn ? 'var(--card)' : 'hsl(38 92% 50% / 0.10)',
        }}
      >
        <Toggle
          checked={workspaceOn}
          onChange={(enabled) => {
            // Saved immediately rather than behind a save bar: reaching for a kill switch is
            // urgent, and a second click to confirm it is a second chance to be too late.
            form.saveNow({ enabled })
          }}
          label="AI features are on for this workspace"
          description={
            workspaceOn
              ? 'Turning this off disables every feature below at once, without losing their settings.'
              : 'Everything below is off. The screens stay reachable and calm, they simply do nothing.'
          }
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.key}
            to={card.to}
            className="rounded-lg border p-3.5 transition-colors hover:bg-[color:var(--hover)]"
            style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          >
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="size-4" style={{ color: 'var(--ai)' }} aria-hidden="true" />
              <span className="text-[15px] font-medium">{card.name}</span>
              <span
                className="ml-auto rounded px-1.5 py-0.5 text-[12px] font-medium"
                style={
                  workspaceOn && card.on
                    ? { background: 'var(--success-soft)', color: 'var(--success-strong)' }
                    : { background: 'var(--muted)', color: 'var(--muted-foreground)' }
                }
              >
                {!workspaceOn ? 'Workspace off' : card.on ? 'On' : 'Off'}
              </span>
            </div>
            <p className="mb-2.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              {card.what}
            </p>
            <p className="flex items-baseline gap-1.5">
              <span className="font-mono text-[18px] font-medium">{card.metric}</span>
              <span className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                {card.metricLabel}
              </span>
            </p>
          </Link>
        ))}
      </div>

      <Link
        to="/ai/agent"
        className="mt-2 block rounded-lg border p-3.5 transition-colors hover:bg-[color:var(--hover)]"
        style={{ borderColor: 'var(--ai)', background: 'var(--ai-soft)' }}
      >
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="size-4" style={{ color: 'var(--ai)' }} aria-hidden="true" />
          <span className="text-[15px] font-medium">AI Agent</span>
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[12px] font-medium capitalize"
            style={
              agent.data?.status === 'live'
                ? { background: 'var(--success-soft)', color: 'var(--success-strong)' }
                : { background: 'var(--muted)', color: 'var(--muted-foreground)' }
            }
          >
            {agent.data?.status ?? 'Not set up'}
          </span>
        </div>
        <p className="mb-2.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          The only AI here that talks to customers, and only once you launch it.
        </p>
        <p className="flex items-baseline gap-1.5">
          <span className="font-mono text-[18px] font-medium">
            {agent.data === undefined
              ? '—'
              : `${String(Math.round(agent.data.stats.resolutionRate * 100))}%`}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
            resolution rate
          </span>
        </p>
      </Link>
    </div>
  )
}
