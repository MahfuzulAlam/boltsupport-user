import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { StickySaveBar } from '@/components/settings-primitives'
import type { NotificationChannels, NotificationPrefs } from '@/types'
import { fetchNotificationPrefs, patchNotificationPrefs } from '../api/settings'
import { useSettingsForm } from '../hooks/use-settings-form'

type Channel = keyof NotificationChannels

const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'browser', label: 'Browser' },
]

interface EventRow {
  id: string
  label: string
}

interface EventTable {
  /** Sits above the table as its own heading, when the table needs one. */
  section?: string
  /** The first column header, which doubles as the sentence each row completes. */
  prompt: string
  rows: EventRow[]
}

/**
 * Every notification, grouped by who caused it.
 *
 * The first column is a sentence stem and each row finishes it, so a row reads as the thing it
 * is rather than as a setting name. That is what lets a table this long be scanned instead of
 * studied.
 */
const TABLES: EventTable[] = [
  {
    section: 'General',
    prompt: 'Notify me when...',
    rows: [
      { id: 'new-conversation', label: 'There is a new conversation' },
      { id: 'assigned-to-me', label: 'A conversation is assigned to me' },
      { id: 'assigned-to-other', label: 'A conversation is assigned to someone else' },
      { id: 'following-updated', label: 'A conversation I am following is updated' },
      { id: 'mentioned', label: 'I am @mentioned in a conversation' },
      { id: 'team-mentioned', label: 'My team is @mentioned in a conversation' },
      { id: 'chat-available', label: 'A new chat comes in and I am available' },
      { id: 'chat-assigned', label: 'Somebody assigns a chat to me' },
      { id: 'chat-reply', label: 'A contact replies to a chat' },
    ],
  },
  {
    section: 'Customer',
    prompt: 'Notify me when a contact replies...',
    rows: [
      { id: 'customer-unassigned', label: 'To an unassigned conversation' },
      { id: 'customer-mine', label: 'To one of my conversations' },
      { id: 'customer-other', label: 'To a conversation owned by someone else' },
    ],
  },
  {
    section: 'Team',
    prompt: 'Notify me when a teammate replies or adds a note...',
    rows: [
      { id: 'user-unassigned', label: 'To an unassigned conversation' },
      { id: 'user-mine', label: 'To one of my conversations' },
      { id: 'user-other', label: 'To a conversation owned by someone else' },
    ],
  },
  {
    section: 'Alerts',
    prompt: 'Notify me when...',
    rows: [
      { id: 'sla-breach', label: 'An SLA is about to breach' },
      { id: 'rated-not-good', label: 'A conversation is rated Not good' },
      { id: 'ai-escalation', label: 'The AI agent escalates to a human' },
    ],
  },
]

const EMPTY: NotificationChannels = { email: false, mobile: false, browser: false }

function ChannelBox({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="flex size-[22px] items-center justify-center rounded-md border transition-colors"
      style={{
        borderColor: on ? 'var(--brand)' : 'var(--border)',
        background: on ? 'var(--brand)' : 'transparent',
      }}
    >
      {on ? <Check className="size-3.5" style={{ color: 'hsl(0 0% 100%)' }} /> : null}
    </button>
  )
}

/**
 * Two cards rather than a dropdown.
 *
 * Choosing between one set of rules and one set per inbox decides how much of this page an agent
 * ever has to think about again, so it is spelled out rather than hidden behind a select.
 */
function MethodCards({
  value,
  onChange,
}: {
  value: 'default' | 'custom'
  onChange: (next: 'default' | 'custom') => void
}) {
  const options = [
    { key: 'default' as const, title: 'Default', body: 'Use the same settings for every inbox' },
    {
      key: 'custom' as const,
      title: 'Custom',
      body: 'Change the settings depending on the inbox',
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const active = value === option.key
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              onChange(option.key)
            }}
            className="rounded-xl border p-4 text-center"
            style={{
              borderColor: active ? 'var(--brand)' : 'var(--border)',
              background: active ? 'var(--brand-soft)' : 'var(--card)',
            }}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="text-[15px] font-semibold">{option.title}</span>
              <span
                aria-hidden="true"
                className="flex size-[18px] items-center justify-center rounded-full border-2"
                style={{ borderColor: active ? 'var(--brand)' : 'var(--border)' }}
              >
                {active ? (
                  <span className="size-2 rounded-full" style={{ background: 'var(--brand)' }} />
                ) : null}
              </span>
            </span>
            <span className="mt-1 block text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              {option.body}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const saved = useQuery({
    queryKey: ['notification-prefs'],
    queryFn: ({ signal }) => fetchNotificationPrefs(signal),
  })
  const form = useSettingsForm<NotificationPrefs>(saved.data)
  const value = form.value

  const save = useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) => patchNotificationPrefs(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notification-prefs'] })
      form.saved()
      toast('Notifications updated')
    },
  })

  const toggle = (eventId: string, channel: Channel) => {
    if (value === undefined) return
    const current = value.events[eventId] ?? EMPTY
    form.update({
      events: { ...value.events, [eventId]: { ...current, [channel]: !current[channel] } },
    })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-[860px] flex-1 px-6 pt-8 pb-6">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">Notifications</h1>
        <p className="mb-6 text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
          Control what you get told about, and where. Anything aimed at you personally is on by
          default; anything about the queue in general is not.
        </p>

        {value === undefined ? (
          <p className="text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
            Loading
          </p>
        ) : (
          <>
            <h2 className="mb-3 text-[17px] font-semibold tracking-[-0.01em]">Method</h2>
            <MethodCards
              value={value.method}
              onChange={(method) => {
                form.update({ method })
              }}
            />

            {TABLES.map((table) => (
              <section key={table.prompt + (table.section ?? '')}>
                {table.section === undefined ? null : (
                  <h2 className="mt-8 mb-3 text-[17px] font-semibold tracking-[-0.01em]">
                    {table.section}
                  </h2>
                )}

                <div
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
                >
                  <table className="w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <th className="px-4 py-3 text-left text-[14px] font-semibold">
                          {table.prompt}
                        </th>
                        {CHANNELS.map((channel) => (
                          <th
                            key={channel.key}
                            scope="col"
                            className="w-[92px] px-2 py-3 text-center text-[14px] font-semibold"
                          >
                            {channel.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, index) => {
                        const channels = value.events[row.id] ?? EMPTY
                        return (
                          <tr
                            key={row.id}
                            className={index === 0 ? undefined : 'border-t'}
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <td className="px-4 py-3 text-[14px]">{row.label}</td>
                            {CHANNELS.map((channel) => (
                              <td key={channel.key} className="px-2 py-3">
                                <span className="flex justify-center">
                                  <ChannelBox
                                    on={channels[channel.key]}
                                    label={`${channel.label}: ${row.label}`}
                                    onToggle={() => {
                                      toggle(row.id, channel.key)
                                    }}
                                  />
                                </span>
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      <StickySaveBar
        dirty={form.dirty}
        note={form.dirty ? 'You have unsaved changes' : 'Everything is saved'}
        onDiscard={form.discard}
        onSave={() => {
          if (form.edits !== null) save.mutate(form.edits)
        }}
      />
    </div>
  )
}
