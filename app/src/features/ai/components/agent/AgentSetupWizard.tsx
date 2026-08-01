import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, Globe, StickyNote, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useCollections } from '@/features/docs'
import { cn } from '@/lib/utils'
import { safeHref } from '@/lib/url'
import type { AiAgent, KnowledgeSource } from '@/types'
import { addAgentSource, patchAgent, removeAgentSource } from '@/features/ai/api/agent'
import { fetchAiAgent } from '@/features/ai/api/ai'
import { AgentPreview } from './AgentPreview'
import { AgentTestConsole } from './AgentTestConsole'
import { GuardrailsForm, type Guardrails } from './GuardrailsForm'
import { KnowledgeSourceList } from './KnowledgeSourceList'
import { IDENTITY_TEMPLATES } from './identity-templates'

type Step = 1 | 2 | 3

const SOURCE_CARDS = [
  {
    type: 'website' as const,
    icon: Globe,
    title: 'Website',
    body: 'Sync content from your public website',
  },
  {
    type: 'snippet' as const,
    icon: StickyNote,
    title: 'Snippets',
    body: 'Add quick snippets to guide responses',
  },
  {
    type: 'docs' as const,
    icon: FileText,
    title: 'Docs site',
    body: 'Connect your knowledge base articles',
  },
]

function StepDots({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${String(step)} of 3`}>
      {([1, 2, 3] as const).map((dot) => (
        <span
          key={dot}
          className="h-2 rounded-full transition-all"
          style={{
            width: dot === step ? 22 : 8,
            background: dot <= step ? 'var(--ai)' : 'var(--border)',
          }}
        />
      ))}
    </div>
  )
}

/**
 * The three step setup, full screen.
 *
 * Nothing here can make the agent visible to a customer. It ends on a choice between saving a
 * draft and an explicit launch, and the launch names the channels first (FR-4.47).
 */
export function AgentSetupWizard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>(1)
  const [sourceType, setSourceType] = useState<KnowledgeSource['type']>('website')
  const [url, setUrl] = useState('')
  const [snippetTitle, setSnippetTitle] = useState('')
  const [confirmExit, setConfirmExit] = useState(false)
  const [confirmLaunch, setConfirmLaunch] = useState(false)

  const agentQuery = useQuery({
    queryKey: ['ai-agent'],
    queryFn: ({ signal }) => fetchAiAgent(signal),
  })
  const collections = useCollections()

  const [identity, setIdentity] = useState<{ name: string; identity: string } | null>(null)
  const [guardrails, setGuardrails] = useState<Guardrails | null>(null)

  const agent: AiAgent | undefined = agentQuery.data
  const name = identity?.name ?? agent?.name ?? ''
  const identityText = identity?.identity ?? agent?.identity ?? ''
  const rails = guardrails ?? agent?.guardrails

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['ai-agent'] })

  const addSource = useMutation({
    mutationFn: addAgentSource,
    onSuccess: () => {
      void refresh()
      setUrl('')
      setSnippetTitle('')
    },
  })

  const dropSource = useMutation({
    mutationFn: removeAgentSource,
    onSuccess: () => void refresh(),
  })

  const save = useMutation({
    mutationFn: (status: AiAgent['status']) =>
      patchAgent({
        name,
        identity: identityText,
        status,
        ...(rails === undefined ? {} : { guardrails: rails }),
      }),
    onSuccess: (updated) => {
      void refresh()
      toast(
        updated.status === 'live' ? `${updated.name} is live` : `${updated.name} saved as a draft`,
        {
          description:
            updated.status === 'live'
              ? 'Customers can reach it on the channels you selected.'
              : 'Nothing is customer facing until you launch it.',
        },
      )
      void navigate('/ai/agent')
    },
  })

  const sources = agent?.sources ?? []
  const canAdvance = step === 1 ? sources.length > 0 : true
  const validUrl = safeHref(url) !== undefined && url.startsWith('https://')

  return (
    <div
      // One full height column on a phone, where the preview is hidden anyway. Splitting into
      // rows here would give the form a 56px cell and nowhere to scroll.
      className="fixed inset-0 z-50 grid lg:grid-cols-[60%_40%]"
      style={{ background: 'var(--background)' }}
    >
      <div className="flex min-h-0 flex-col">
        <header
          className="flex h-14 flex-none items-center gap-3 border-b px-4"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            onClick={() => {
              if (step === 1) setConfirmExit(true)
              else setStep((step - 1) as Step)
            }}
            aria-label="Back"
            className="flex size-9 items-center justify-center rounded-md"
          >
            <ArrowLeft className="size-4" />
          </button>

          <div className="mx-auto">
            <StepDots step={step} />
          </div>

          <button
            type="button"
            onClick={() => {
              setConfirmExit(true)
            }}
            aria-label="Close setup"
            className="flex size-9 items-center justify-center rounded-md"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[520px]">
            {step === 1 ? (
              <>
                <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.015em]">
                  Teach your AI agent what it should know
                </h1>
                <p className="mb-5 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
                  Share content that will help the agent answer questions accurately.
                </p>

                <p className="eyebrow mb-2">Choose a source</p>
                <div
                  className="mb-4 grid gap-2 sm:grid-cols-3"
                  role="radiogroup"
                  aria-label="Source type"
                >
                  {SOURCE_CARDS.map((card) => {
                    const selected = sourceType === card.type
                    return (
                      <button
                        key={card.type}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => {
                          setSourceType(card.type)
                        }}
                        className={cn('rounded-lg border p-3 text-left')}
                        style={{
                          borderColor: selected ? 'var(--ai)' : 'var(--border)',
                          background: selected ? 'var(--ai-soft)' : 'var(--card)',
                        }}
                      >
                        <card.icon
                          className="mb-1.5 size-4"
                          style={{ color: selected ? 'var(--ai)' : 'var(--muted-foreground)' }}
                          aria-hidden="true"
                        />
                        <p className="text-[14px] font-medium">{card.title}</p>
                        <p className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                          {card.body}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {sourceType === 'website' ? (
                  <div className="mb-4 flex items-center gap-2">
                    <Input
                      value={url}
                      onChange={(event) => {
                        setUrl(event.target.value)
                      }}
                      placeholder="https://"
                      aria-label="Website URL"
                      className="h-9"
                    />
                    <Button
                      size="sm"
                      disabled={!validUrl || addSource.isPending}
                      onClick={() => {
                        addSource.mutate({
                          type: 'website',
                          label: url.replace(/^https:\/\//, ''),
                          url,
                        })
                      }}
                    >
                      Add website
                    </Button>
                  </div>
                ) : null}

                {sourceType === 'snippet' ? (
                  <div className="mb-4 flex items-center gap-2">
                    <Input
                      value={snippetTitle}
                      onChange={(event) => {
                        setSnippetTitle(event.target.value)
                      }}
                      placeholder="Refund window"
                      aria-label="Snippet title"
                      className="h-9"
                    />
                    <Button
                      size="sm"
                      disabled={snippetTitle.trim() === '' || addSource.isPending}
                      onClick={() => {
                        addSource.mutate({ type: 'snippet', label: snippetTitle.trim() })
                      }}
                    >
                      Add snippet
                    </Button>
                  </div>
                ) : null}

                {sourceType === 'docs' ? (
                  <div className="mb-4 flex flex-col gap-1.5">
                    {(collections.data ?? []).map((collection) => {
                      const already = sources.some((source) => source.label === collection.domain)
                      return (
                        <label
                          key={collection.id}
                          className="flex items-center gap-2.5 text-[13px]"
                        >
                          <input
                            type="checkbox"
                            checked={already}
                            disabled={already || addSource.isPending}
                            onChange={() => {
                              addSource.mutate({
                                type: 'docs',
                                label: collection.domain,
                                url: `https://${collection.domain}`,
                              })
                            }}
                          />
                          {collection.name}
                          <span
                            className="font-mono text-[12px]"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            {collection.articleCount} articles
                          </span>
                        </label>
                      )
                    })}
                  </div>
                ) : null}

                <KnowledgeSourceList
                  sources={sources}
                  onRemove={(id) => {
                    dropSource.mutate(id)
                  }}
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.015em]">
                  Define the agent’s identity
                </h1>
                <p className="mb-5 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
                  Keep your agent on brand. Refine its tone, vocabulary, and critical context.
                </p>

                <Label htmlFor="agent-name" className="mb-1 block text-[13px]">
                  Name
                </Label>
                <p className="mb-1.5 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                  For internal use only
                </p>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(event) => {
                    setIdentity({ name: event.target.value, identity: identityText })
                  }}
                  className="mb-4 max-w-[320px]"
                />

                <Label htmlFor="agent-identity" className="mb-1 block text-[13px]">
                  Identity
                </Label>
                <p className="mb-1.5 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                  Define the agent’s role, audience, and voice
                </p>
                <textarea
                  id="agent-identity"
                  value={identityText}
                  onChange={(event) => {
                    setIdentity({ name, identity: event.target.value })
                  }}
                  placeholder="Describe the agent's purpose, tone, and context..."
                  rows={7}
                  className="mb-3 w-full rounded-md border p-3 text-[14px] leading-[1.6]"
                  style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
                />

                <div className="flex flex-wrap gap-1.5">
                  {IDENTITY_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => {
                        setIdentity({ name, identity: template.text })
                      }}
                      className="rounded-[13px] border px-2.5 py-1 text-[12px]"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                  Templates fill the box and stay fully editable.
                </p>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.015em]">
                  Test your agent before customers do
                </h1>
                <p className="mb-5 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
                  Ask it the awkward questions. Watch where it hands over.
                </p>

                <AgentTestConsole />

                <h2 className="eyebrow mt-6 mb-2">Before you launch</h2>
                {rails !== undefined ? (
                  <GuardrailsForm value={rails} onChange={setGuardrails} />
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <footer
          className="flex flex-none items-center gap-2 border-t px-6 py-3"
          style={{ borderColor: 'var(--border)' }}
        >
          {step < 3 ? (
            <Button
              className="w-full"
              disabled={!canAdvance}
              onClick={() => {
                setStep((step + 1) as Step)
              }}
            >
              Next
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={save.isPending}
                onClick={() => {
                  save.mutate('draft')
                }}
              >
                Save as draft
              </Button>
              <Button
                className="ml-auto"
                disabled={save.isPending}
                onClick={() => {
                  setConfirmLaunch(true)
                }}
              >
                Launch agent
              </Button>
            </>
          )}
        </footer>
      </div>

      <AgentPreview step={step} name={name} />

      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent className="max-w-md">
          <DialogTitle>Leave setup?</DialogTitle>
          <DialogDescription>
            Sources you added are already saved. The name, identity, and guardrails on this screen
            are not.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setConfirmExit(false)
              }}
            >
              Keep editing
            </Button>
            <Button
              onClick={() => {
                void navigate('/ai/agent')
              }}
            >
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmLaunch} onOpenChange={setConfirmLaunch}>
        <DialogContent className="max-w-md">
          <DialogTitle>Launch {name}?</DialogTitle>
          <DialogDescription>
            {(agent?.deployment.channelIds ?? []).length === 0
              ? 'No channels are selected yet, so nothing will reach customers until you turn one on under Deployment.'
              : 'It will start answering customers on the channels you turned on under Deployment. It answers questions and hands over to a person; it never takes account actions.'}
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
                save.mutate('live')
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
