import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsSection } from '@/components/settings-primitives'
import { fetchConversations } from '@/features/inbox'
import {
  aiFeatureSchema,
  type AiFeature,
  type KnowledgeBase,
  type ProvenAnswer,
  type QaEntry,
} from '@/types'
import { harvestConversations, patchKnowledge } from '../api/ai'
import { FEATURE_LABEL, KIND_META } from '../knowledge-meta'

/**
 * Which features may read one source.
 *
 * Presented as a list of features rather than as a single "on" switch because the honest answer
 * is per feature: a page of pricing copy is exactly what the customer facing agent should quote
 * and exactly what Auto Assign has no use for. Scoping here rather than in each feature's own
 * settings means adding a feature later cannot silently widen an existing source.
 */
function ScopeList({
  usedBy,
  onChange,
}: {
  usedBy: AiFeature[]
  onChange: (next: AiFeature[]) => void
}) {
  return (
    <div className="flex flex-col">
      {aiFeatureSchema.options.map((feature) => {
        const on = usedBy.includes(feature)
        return (
          <label
            key={feature}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 hover:bg-[color:var(--hover)]"
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => {
                onChange(on ? usedBy.filter((item) => item !== feature) : [...usedBy, feature])
              }}
              className="size-4 accent-[color:var(--brand)]"
            />
            <span className="text-[14px]">{FEATURE_LABEL[feature]}</span>
          </label>
        )
      })}
    </div>
  )
}

/** Question and answer pairs, written by hand for the AI and nobody else. */
function QaEditor({ source }: { source: KnowledgeBase }) {
  const queryClient = useQueryClient()
  const entries = source.entries ?? []
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')

  const save = useMutation({
    mutationFn: (next: QaEntry[]) => patchKnowledge(source.id, { entries: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-knowledge'] })
    },
  })

  const add = () => {
    if (question.trim() === '' || answer.trim() === '') return
    save.mutate([
      ...entries,
      {
        id: `qa${String(Date.now())}`,
        question: question.trim(),
        answer: answer.trim(),
      },
    ])
    setQuestion('')
    setAnswer('')
  }

  return (
    <SettingsSection
      title="Pairs"
      description="One question, one answer. Nobody but the AI reads these, so write them plainly."
    >
      {entries.length === 0 ? (
        <p className="mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Nothing here yet. The first few are usually pricing, refunds, and hours.
        </p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-lg border p-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium">{entry.question}</p>
                <p className="mt-0.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  {entry.answer}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove: ${entry.question}`}
                onClick={() => {
                  save.mutate(entries.filter((item) => item.id !== entry.id))
                }}
                className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-[color:var(--hover)]"
              >
                <Trash2 className="size-3.5" style={{ color: 'var(--muted-foreground)' }} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <div>
          <Label htmlFor="qa-question" className="mb-1.5 text-[14px] font-medium">
            Question
          </Label>
          <Input
            id="qa-question"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value)
            }}
            placeholder="How long is the refund window?"
          />
        </div>
        <div>
          <Label htmlFor="qa-answer" className="mb-1.5 text-[14px] font-medium">
            Answer
          </Label>
          <textarea
            id="qa-answer"
            value={answer}
            onChange={(event) => {
              setAnswer(event.target.value)
            }}
            rows={3}
            placeholder="30 days from the invoice date. A lead can approve anything outside that."
            className="w-full rounded-md border px-3 py-2 text-[14px] outline-none"
            style={{ borderColor: 'var(--input)', background: 'var(--background)' }}
          />
        </div>
        <div>
          <Button size="sm" disabled={question.trim() === '' || answer.trim() === ''} onClick={add}>
            <Plus className="size-3.5" />
            Add pair
          </Button>
        </div>
      </div>
    </SettingsSection>
  )
}

/**
 * Answers harvested from conversations that were already resolved.
 *
 * Everything arrives as a draft. The reply that resolved one conversation was written for one
 * customer, and it can carry an account number, a one off concession, or a promise nobody wants
 * repeated to everybody. Approval is where that gets noticed, so it is a step rather than a
 * default, and only approved answers count toward what the source knows.
 */
function ProvenEditor({ source }: { source: KnowledgeBase }) {
  const queryClient = useQueryClient()
  const answers = source.answers ?? []
  const [picking, setPicking] = useState(false)

  const resolved = useQuery({
    queryKey: ['conversations', 'resolved-for-harvest'],
    queryFn: ({ signal }) => fetchConversations({ folder: 'closed', limit: 12 }, signal),
    enabled: picking,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ai-knowledge'] })

  const setAnswers = useMutation({
    mutationFn: (next: ProvenAnswer[]) => patchKnowledge(source.id, { answers: next }),
    onSuccess: invalidate,
  })

  const harvest = useMutation({
    mutationFn: (conversationIds: string[]) => harvestConversations(source.id, conversationIds),
    onSuccess: async (updated) => {
      setPicking(false)
      await invalidate()
      const drafted = (updated.answers ?? []).filter((answer) => answer.state === 'draft').length
      toast(`${String(drafted)} waiting for review`, {
        description: 'Nothing is used until you approve it.',
      })
    },
  })

  const setState = (id: string, state: ProvenAnswer['state']) => {
    setAnswers.mutate(answers.map((answer) => (answer.id === id ? { ...answer, state } : answer)))
  }

  const drafts = answers.filter((answer) => answer.state === 'draft')
  const approved = answers.filter((answer) => answer.state === 'approved')

  return (
    <>
      <SettingsSection
        title="Pick conversations"
        description="Choose resolved conversations worth keeping. Each becomes a draft answer for you to approve."
      >
        {picking ? (
          <>
            {resolved.isPending ? (
              <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                Loading resolved conversations
              </p>
            ) : (
              <ul className="mb-3 flex flex-col gap-1.5">
                {(resolved.data?.items ?? []).map((conversation) => {
                  const already = answers.some(
                    (answer) => answer.conversationId === conversation.id,
                  )
                  return (
                    <li
                      key={conversation.id}
                      className="flex items-center gap-3 rounded-lg border p-2.5"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">{conversation.subject}</p>
                        <p
                          className="truncate text-[12px]"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          {conversation.contact.name} &middot; #{conversation.number}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={already || harvest.isPending}
                        onClick={() => {
                          harvest.mutate([conversation.id])
                        }}
                      >
                        {already ? 'Added' : 'Use this'}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPicking(false)
              }}
            >
              Done
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              setPicking(true)
            }}
          >
            <Plus className="size-3.5" />
            Choose conversations
          </Button>
        )}
      </SettingsSection>

      <SettingsSection
        title={`Waiting for review${drafts.length === 0 ? '' : ` (${String(drafts.length)})`}`}
        description="Read each one for anything that was true for that customer only."
      >
        {drafts.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Nothing waiting.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {drafts.map((answer) => (
              <li
                key={answer.id}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <p className="text-[14px] font-medium">{answer.question}</p>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  {answer.answer}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setState(answer.id, 'approved')
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setState(answer.id, 'rejected')
                    }}
                  >
                    Discard
                  </Button>
                  <Link
                    to={`/search?q=${encodeURIComponent(answer.conversationSubject)}`}
                    className="ml-auto flex items-center gap-1 text-[13px]"
                    style={{ color: 'var(--brand)' }}
                  >
                    Open the thread
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection
        title={`In use (${String(approved.length)})`}
        description="Approved answers. These are what the features you granted below can quote."
      >
        {approved.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Nothing approved yet, so this source teaches nothing.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {approved.map((answer) => (
              <li
                key={answer.id}
                className="flex items-start gap-3 rounded-lg border p-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{answer.question}</p>
                  <p className="mt-0.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                    {answer.answer}
                  </p>
                  {answer.similarCount > 0 ? (
                    <p className="mt-1 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                      {answer.similarCount} later conversations looked like this one.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  aria-label={`Withdraw: ${answer.question}`}
                  onClick={() => {
                    setState(answer.id, 'draft')
                  }}
                  className="shrink-0 rounded-md px-2 py-1 text-[13px] hover:bg-[color:var(--hover)]"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Withdraw
                </button>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
    </>
  )
}

export function KnowledgeDetail({
  source,
  onBack,
  onScope,
}: {
  source: KnowledgeBase
  onBack: () => void
  onScope: (usedBy: AiFeature[]) => void
}) {
  const meta = KIND_META[source.kind]

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 pt-6 pb-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-[14px]"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        All sources
      </button>

      <PageHeader title={source.label} description={meta.blurb} />

      {source.kind === 'qa' ? <QaEditor source={source} /> : null}
      {source.kind === 'proven' ? <ProvenEditor source={source} /> : null}

      {source.kind === 'documentation' ? (
        <SettingsSection
          title="Articles"
          description="Every published article is included, and stays in step as you edit them."
        >
          <p className="mb-3 text-[14px]">
            <span className="font-mono">{source.itemCount}</span> articles indexed. Drafts are
            excluded until you publish them.
          </p>
          <Link
            to="/docs"
            className="flex items-center gap-1 text-[14px]"
            style={{ color: 'var(--brand)' }}
          >
            Open the knowledge base
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </SettingsSection>
      ) : null}

      {source.kind === 'website' ? (
        <SettingsSection
          title="Pages"
          description="Fetched weekly. This is the only source nobody on your team has read."
        >
          <p className="text-[14px]">{source.url === undefined ? 'No address set.' : source.url}</p>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {source.status === 'indexing'
              ? 'Fetching now. Pages appear as they are indexed.'
              : `${String(source.itemCount)} pages indexed.`}
          </p>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="Which features may read this"
        description="A source nothing reads is stored and indexed, but it changes no answers."
      >
        <ScopeList usedBy={source.usedBy} onChange={onScope} />
      </SettingsSection>
    </div>
  )
}
