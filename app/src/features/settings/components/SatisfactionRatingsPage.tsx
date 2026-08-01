import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SettingsSection, Toggle } from '@/components/settings-primitives'
import { cn } from '@/lib/utils'
import type { SatisfactionSettings } from '@/types'
import { fetchInboxSetting, patchInboxSetting } from '../api/settings'
import { useSettingsForm } from '../hooks/use-settings-form'
import { SettingsPage } from './SettingsPage'

const CADENCE = [
  {
    value: 'every' as const,
    title: 'Every closed conversation',
    body: 'Highest coverage, and the fastest way to teach regulars to ignore the email.',
  },
  {
    value: 'first-close' as const,
    title: 'The first close only',
    body: 'One ask per conversation, no matter how many times it reopens.',
  },
  {
    value: 'weekly' as const,
    title: 'At most once a week per customer',
    body: 'Kindest to people who write in often. Lower coverage.',
  },
]

export function SatisfactionRatingsPage() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const queryClient = useQueryClient()

  const saved = useQuery({
    queryKey: ['inbox-settings', inboxId, 'satisfaction'],
    queryFn: ({ signal }) => fetchInboxSetting(inboxId, 'satisfaction', signal),
  })
  const form = useSettingsForm<SatisfactionSettings>(saved.data)
  const value = form.value

  const save = useMutation({
    mutationFn: (patch: Partial<SatisfactionSettings>) =>
      patchInboxSetting(inboxId, 'satisfaction', patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-settings', inboxId] })
      form.saved()
      toast('Satisfaction ratings updated')
    },
  })

  return (
    <SettingsPage
      title="Satisfaction ratings"
      description="Ask customers how it went after you close a conversation."
      save={{
        dirty: form.dirty,
        onSave: () => {
          if (form.edits !== null) save.mutate(form.edits)
        },
        onDiscard: form.discard,
      }}
    >
      {value === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : (
        <>
          <SettingsSection title="Asking">
            <Toggle
              checked={value.enabled}
              onChange={(enabled) => {
                form.update({ enabled })
              }}
              label="Ask for a rating"
              description="Great, Okay, or Not good, with an optional comment."
            />

            <div className="mt-2 grid gap-2" role="radiogroup" aria-label="How often to ask">
              {CADENCE.map((option) => {
                const selected = value.askAfter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!value.enabled}
                    onClick={() => {
                      form.update({ askAfter: option.value })
                    }}
                    className={cn('rounded-lg border p-3 text-left disabled:opacity-45')}
                    style={{
                      borderColor: selected ? 'var(--brand)' : 'var(--border)',
                      background: selected ? 'var(--brand-soft)' : 'var(--card)',
                    }}
                  >
                    <p className="mb-0.5 text-[14px] font-medium">{option.title}</p>
                    <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                      {option.body}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Coverage is the number that makes a happiness score readable, so the page that
                sets the cadence is where it belongs. */}
            <p className="mt-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              How many people actually answer shows up as rating coverage on the{' '}
              <Link to="/reports/happiness" style={{ color: 'var(--brand)' }}>
                Happiness report
              </Link>
              .
            </p>
          </SettingsSection>

          <SettingsSection title="Wording">
            <Label htmlFor="csat-question" className="mb-1.5 block text-[13px]">
              Question
            </Label>
            <Input
              id="csat-question"
              value={value.question}
              disabled={!value.enabled}
              onChange={(event) => {
                form.update({ question: event.target.value })
              }}
              className="mb-4 max-w-[520px]"
            />

            <Label htmlFor="csat-follow-up" className="mb-1.5 block text-[13px]">
              Follow up
            </Label>
            <Input
              id="csat-follow-up"
              value={value.followUpQuestion}
              disabled={!value.enabled}
              onChange={(event) => {
                form.update({ followUpQuestion: event.target.value })
              }}
              className="max-w-[520px]"
            />
            <p className="mt-1.5 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
              Shown after they pick a rating. Optional to answer.
            </p>
          </SettingsSection>
        </>
      )}
    </SettingsPage>
  )
}
