import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pause, Play, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { SettingsSection, StickySaveBar, Toggle } from '@/components/settings-primitives'
import { useInboxes } from '@/features/inbox'
import { PROVIDERS, CHANNEL_ORDER } from '@/features/channels'
import { cn } from '@/lib/utils'
import type { AgentStatus, AiAgent } from '@/types'
import { patchAgent, removeAgentSource, resyncAgentSource } from '@/features/ai/api/agent'
import { AgentTestConsole } from './AgentTestConsole'
import { GuardrailsForm, type Guardrails } from './GuardrailsForm'
import { KnowledgeSourceList } from './KnowledgeSourceList'

const TABS = ['Overview', 'Knowledge', 'Identity', 'Guardrails', 'Deployment', 'Test'] as const
type Tab = (typeof TABS)[number]

const STATUS_STYLE: Record<AgentStatus, { bg: string; fg: string; label: string }> = {
  draft: { bg: 'var(--muted)', fg: 'var(--muted-foreground)', label: 'Draft' },
  live: { bg: 'var(--success-soft)', fg: 'var(--success-strong)', label: 'Live' },
  paused: { bg: 'hsl(38 92% 50% / 0.16)', fg: 'var(--warning-strong)', label: 'Paused' },
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg border p-3.5"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-mono text-[24px] leading-none font-medium">{value}</p>
    </div>
  )
}

/**
 * The management console.
 *
 * Status is the first thing on the page because it is the only thing on it that a customer can
 * see the effect of. Draft and Paused both mean "nobody is being answered", and the pill says so
 * rather than leaving it to be inferred from a toggle position.
 */
export function AgentConsole({ agent }: { agent: AiAgent }) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('Overview')
  const [identity, setIdentity] = useState<{ name: string; identity: string } | null>(null)
  const [guardrails, setGuardrails] = useState<Guardrails | null>(null)
  const [confirmLaunch, setConfirmLaunch] = useState(false)
  const inboxes = useInboxes()

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['ai-agent'] })

  const save = useMutation({
    mutationFn: patchAgent,
    onSuccess: () => {
      void refresh()
      setIdentity(null)
      setGuardrails(null)
      toast('Agent updated')
    },
  })

  const setStatus = useMutation({
    mutationFn: (status: AgentStatus) => patchAgent({ status }),
    onSuccess: (updated) => {
      void refresh()
      toast(
        updated.status === 'live'
          ? `${updated.name} is answering customers`
          : `${updated.name} is paused`,
      )
    },
  })

  const drop = useMutation({
    mutationFn: removeAgentSource,
    onSuccess: () => void refresh(),
  })

  const resync = useMutation({
    mutationFn: resyncAgentSource,
    onSuccess: () => {
      void refresh()
      toast('Source resynced')
    },
  })

  const style = STATUS_STYLE[agent.status]
  const name = identity?.name ?? agent.name
  const identityText = identity?.identity ?? agent.identity
  const rails = guardrails ?? agent.guardrails

  // Every channel the workspace has, with whether it is actually connected anywhere.
  const connectedTypes = new Set(
    (inboxes.data ?? []).flatMap((inbox) =>
      inbox.channels.filter((channel) => channel.status === 'connected').map((c) => c.type),
    ),
  )

  return (
    <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <PageHeader
          title={agent.name}
          description="Answers customer questions from your approved content, and hands over when it cannot."
          actions={
            <>
              <span
                className="flex h-7 items-center rounded-[14px] px-2.5 text-[13px] font-medium"
                style={{ background: style.bg, color: style.fg }}
              >
                {style.label}
              </span>
              {agent.status === 'live' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatus.mutate('paused')
                  }}
                >
                  <Pause className="size-4" aria-hidden="true" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setConfirmLaunch(true)
                  }}
                >
                  <Play className="size-4" aria-hidden="true" />
                  Launch
                </Button>
              )}
            </>
          }
        />

        <div
          className="mb-4 flex items-center gap-1 overflow-x-auto border-b"
          style={{ borderColor: 'var(--border)' }}
          role="tablist"
          aria-label="Agent settings"
        >
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              onClick={() => {
                setTab(item)
              }}
              className="relative h-9 shrink-0 px-3 text-[13px] font-medium"
              style={{ color: tab === item ? 'var(--brand)' : 'var(--muted-foreground)' }}
            >
              {item}
              {tab === item ? (
                <span
                  className="absolute right-0 -bottom-px left-0 h-[2px]"
                  style={{ background: 'var(--brand)' }}
                />
              ) : null}
            </button>
          ))}
        </div>

        {tab === 'Overview' ? (
          <>
            {agent.status !== 'live' ? (
              <p
                className="mb-4 flex items-start gap-2 rounded-md border p-2.5 text-[13px]"
                style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
              >
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: 'var(--muted-foreground)' }}
                  aria-hidden="true"
                />
                <span>
                  {agent.status === 'draft'
                    ? 'This agent is a draft. No customer has seen it, and none will until you launch it.'
                    : 'This agent is paused. Conversations go to the inbox instead.'}
                </span>
              </p>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-3">
              <Stat label="Conversations handled" value={String(agent.stats.handled)} />
              <Stat
                label="Resolution rate"
                value={`${String(Math.round(agent.stats.resolutionRate * 100))}%`}
              />
              <Stat
                label="Escalation rate"
                value={`${String(Math.round(agent.stats.escalationRate * 100))}%`}
              />
            </div>

            <p className="mt-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Escalations carry the full transcript and a summary into the inbox, so whoever picks
              one up starts with the context.
            </p>
          </>
        ) : null}

        {tab === 'Knowledge' ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                The agent can only answer from what is indexed here.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/ai/agent/setup">Add source</Link>
              </Button>
            </div>
            <KnowledgeSourceList
              sources={agent.sources}
              onRemove={(id) => {
                drop.mutate(id)
              }}
              onResync={(id) => {
                resync.mutate(id)
              }}
            />
          </>
        ) : null}

        {tab === 'Identity' ? (
          <SettingsSection title="Identity">
            <Label htmlFor="console-name" className="mb-1.5 block text-[13px]">
              Name
            </Label>
            <Input
              id="console-name"
              value={name}
              onChange={(event) => {
                setIdentity({ name: event.target.value, identity: identityText })
              }}
              className="mb-4 max-w-[320px]"
            />

            <Label htmlFor="console-identity" className="mb-1.5 block text-[13px]">
              How it should sound
            </Label>
            <textarea
              id="console-identity"
              value={identityText}
              onChange={(event) => {
                setIdentity({ name, identity: event.target.value })
              }}
              rows={7}
              className="w-full rounded-md border p-3 text-[14px] leading-[1.6]"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            />
          </SettingsSection>
        ) : null}

        {tab === 'Guardrails' ? (
          <SettingsSection title="Guardrails">
            <GuardrailsForm value={rails} onChange={setGuardrails} full />
          </SettingsSection>
        ) : null}

        {tab === 'Deployment' ? (
          <SettingsSection
            title="Channels"
            description="Where customers can reach the agent. A channel has to be connected first."
          >
            {CHANNEL_ORDER.map((type) => {
              const provider = PROVIDERS[type]
              const connected = connectedTypes.has(type)
              const on = agent.deployment.channelIds.includes(type)
              return (
                <div key={type} className={cn('flex items-center gap-3 py-1.5')}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{provider.name}</span>
                    {!connected ? (
                      <span className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                        Not connected.{' '}
                        <Link to="/inbox/in1/settings/channels" style={{ color: 'var(--brand)' }}>
                          Connect channels
                        </Link>
                      </span>
                    ) : null}
                  </span>
                  <Toggle
                    checked={on}
                    disabled={!connected}
                    onChange={(next) => {
                      save.mutate({
                        deployment: {
                          channelIds: next
                            ? [...agent.deployment.channelIds, type]
                            : agent.deployment.channelIds.filter((id) => id !== type),
                        },
                      })
                    }}
                    label={`${provider.name} ${on ? 'on' : 'off'}`}
                  />
                </div>
              )
            })}
          </SettingsSection>
        ) : null}

        {tab === 'Test' ? <AgentTestConsole /> : null}
      </div>

      {tab === 'Identity' || tab === 'Guardrails' ? (
        <StickySaveBar
          dirty={identity !== null || guardrails !== null}
          note=""
          onDiscard={() => {
            setIdentity(null)
            setGuardrails(null)
          }}
          onSave={() => {
            save.mutate({
              name,
              identity: identityText,
              ...(guardrails === null ? {} : { guardrails }),
            })
          }}
        />
      ) : null}

      <Dialog open={confirmLaunch} onOpenChange={setConfirmLaunch}>
        <DialogContent className="max-w-md">
          <DialogTitle>Launch {agent.name}?</DialogTitle>
          <DialogDescription>
            {agent.deployment.channelIds.length === 0
              ? 'No channels are turned on, so nothing will reach customers until you enable one under Deployment.'
              : `It will answer customers on ${agent.deployment.channelIds
                  .map((id) => PROVIDERS[id as keyof typeof PROVIDERS]?.name ?? id)
                  .join(
                    ', ',
                  )}. It answers questions and hands over to a person; it never takes account actions.`}
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmLaunch(false)
              }}
            >
              Not yet
            </Button>
            <Button
              onClick={() => {
                setConfirmLaunch(false)
                setStatus.mutate('live')
              }}
            >
              Launch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
