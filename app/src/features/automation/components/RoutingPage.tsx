import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { Input } from '@/components/ui/input'
import { SettingsSection, StickySaveBar, Toggle } from '@/components/settings-primitives'
import { useAiSettings } from '@/features/ai'
import { cn } from '@/lib/utils'
import type { RoutingStrategy } from '@/types'
import { fetchRouting, patchRouting, type RoutingConfig } from '../api/automation'
import { useRuleVocabulary } from '../hooks/use-rule-vocabulary'

const STRATEGIES: { value: RoutingStrategy; title: string; body: string; ai?: boolean }[] = [
  {
    value: 'round_robin',
    title: 'Round robin',
    body: 'Each new conversation goes to the next person in the rotation. Simple and predictable.',
  },
  {
    value: 'load_balanced',
    title: 'Load balanced',
    body: 'Goes to whoever has the fewest open conversations, respecting their cap.',
  },
  {
    value: 'ai_assisted',
    title: 'AI assisted',
    body: 'Uses the Auto Assign model to match a conversation to whoever handled ones like it.',
    ai: true,
  },
  {
    value: 'manual',
    title: 'Manual',
    body: 'Nothing is assigned automatically. Everything lands in Unassigned for someone to claim.',
  },
]

export function RoutingPage() {
  const queryClient = useQueryClient()
  const { users } = useRuleVocabulary()
  const aiSettings = useAiSettings()
  const [draft, setDraft] = useState<RoutingConfig | null>(null)

  const routing = useQuery({
    queryKey: ['routing'],
    queryFn: ({ signal }) => fetchRouting(signal),
  })

  const save = useMutation({
    mutationFn: (next: RoutingConfig) => patchRouting(next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['routing'] })
      setDraft(null)
      toast('Routing updated')
    },
  })

  const saved = routing.data
  const current = draft ?? saved

  if (current === undefined || saved === undefined) {
    return (
      <div className="w-full pt-6">
        <PageHeader title="Routing" />
      </div>
    )
  }

  const patch = (next: Partial<RoutingConfig>) => {
    setDraft({ ...current, ...next })
  }
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved)

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex-1 overflow-y-auto pt-6 pb-4">
        <PageHeader title="Routing" description="How new conversations find an owner." />

        <SettingsSection title="Strategy">
          <div
            className="grid gap-2 sm:grid-cols-2"
            role="radiogroup"
            aria-label="Routing strategy"
          >
            {STRATEGIES.map((strategy) => {
              const selected = current.strategy === strategy.value
              return (
                <button
                  key={strategy.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    patch({ strategy: strategy.value })
                  }}
                  className={cn('rounded-lg border p-3 text-left')}
                  style={{
                    borderColor: selected ? 'var(--brand)' : 'var(--border)',
                    background: selected ? 'var(--brand-soft)' : 'var(--card)',
                    ...(selected ? { boxShadow: '0 0 0 1px var(--brand)' } : {}),
                  }}
                >
                  <p className="mb-1 flex items-center gap-1.5 text-[14px] font-medium">
                    {strategy.ai === true ? (
                      <Sparkles
                        className="size-3.5"
                        style={{ color: 'var(--ai)' }}
                        aria-hidden="true"
                      />
                    ) : null}
                    {strategy.title}
                  </p>
                  <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                    {strategy.body}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Two settings pages own one behaviour between them, so each points at the other
              rather than showing a second copy of the threshold that can drift. */}
          {current.strategy === 'ai_assisted' ? (
            <p
              className="mt-3 rounded-md border p-2.5 text-[13px]"
              style={{ borderColor: 'var(--ai)', background: 'var(--ai-soft)' }}
            >
              Assigning above{' '}
              <span className="font-mono">
                {Math.round((aiSettings.data?.autoAssign.threshold ?? 0.8) * 100)}%
              </span>{' '}
              confidence. Anything below stays unassigned.{' '}
              <Link to="/ai/auto-assign" style={{ color: 'var(--brand)' }}>
                Auto Assign settings
              </Link>
            </p>
          ) : null}
        </SettingsSection>

        <SettingsSection
          title="Rotation"
          description="Who is in the rotation, and how much each person can hold at once."
        >
          {current.rotation.map((entry) => {
            const user = users.find((item) => item.id === entry.userId)
            return (
              <div key={entry.userId} className="flex items-center gap-3 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[14px]">
                  {user?.name ?? entry.userId}
                </span>

                <label
                  htmlFor={`max-${entry.userId}`}
                  className="flex items-center gap-2 text-[13px]"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Max at once
                  <Input
                    id={`max-${entry.userId}`}
                    type="number"
                    min={1}
                    value={entry.maxConcurrent}
                    aria-label={`${user?.name ?? entry.userId} maximum concurrent conversations`}
                    onChange={(event) => {
                      const max = Number(event.target.value)
                      if (max > 0) {
                        patch({
                          rotation: current.rotation.map((item) =>
                            item.userId === entry.userId ? { ...item, maxConcurrent: max } : item,
                          ),
                        })
                      }
                    }}
                    className="h-8 w-[72px]"
                  />
                </label>

                <Toggle
                  checked={entry.available}
                  onChange={(available) => {
                    patch({
                      rotation: current.rotation.map((item) =>
                        item.userId === entry.userId ? { ...item, available } : item,
                      ),
                    })
                  }}
                  label={entry.available ? 'Available' : 'Away'}
                />
              </div>
            )
          })}
        </SettingsSection>
      </div>

      <StickySaveBar
        dirty={dirty}
        note=""
        onDiscard={() => {
          setDraft(null)
        }}
        onSave={() => {
          if (draft !== null) save.mutate(draft)
        }}
      />
    </div>
  )
}
