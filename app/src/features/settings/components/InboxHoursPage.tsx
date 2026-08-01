import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Select } from '@/components/Select'
import { SettingsSection, Toggle } from '@/components/settings-primitives'
import type { InboxHours, OfficeDay } from '@/types'
import { fetchInboxSetting, patchInboxSetting } from '../api/settings'
import { useSettingsForm } from '../hooks/use-settings-form'
import { SettingsPage } from './SettingsPage'

const DAY_LABEL: Record<OfficeDay['day'], string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

/** Half hour steps, which is as fine as any support rota ever needs. */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return {
    value: String(minutes),
    label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  }
})

const TIMEZONES = [
  'Europe/Berlin',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Singapore',
  'Australia/Sydney',
].map((zone) => ({ value: zone, label: zone.replace('_', ' ') }))

export function InboxHoursPage() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const queryClient = useQueryClient()

  const saved = useQuery({
    queryKey: ['inbox-settings', inboxId, 'hours'],
    queryFn: ({ signal }) => fetchInboxSetting(inboxId, 'hours', signal),
  })
  const form = useSettingsForm<InboxHours>(saved.data)
  const value = form.value

  const save = useMutation({
    mutationFn: (patch: Partial<InboxHours>) => patchInboxSetting(inboxId, 'hours', patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-settings', inboxId] })
      form.saved()
      toast('Inbox hours updated')
    },
  })

  const setDay = (day: OfficeDay['day'], patch: Partial<OfficeDay>) => {
    if (value === undefined) return
    form.update({
      days: value.days.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)),
    })
  }

  const openDays = value?.days.filter((day) => day.open).length ?? 0

  return (
    <SettingsPage
      title="Inbox hours"
      description="When your team is on shift. Business hours SLAs and the auto reply both read this."
      save={{
        dirty: form.dirty,
        onSave: () => {
          if (form.edits !== null) save.mutate(form.edits)
        },
        onDiscard: form.discard,
        note: openDays === 0 ? 'With no open days a business hours SLA can never tick.' : '',
      }}
    >
      {value === undefined ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : (
        <>
          <SettingsSection
            title="Time zone"
            description="Every time below is in this zone, whatever a teammate's laptop says."
          >
            <Select
              value={value.timezone}
              options={TIMEZONES}
              onChange={(timezone) => {
                form.update({ timezone })
              }}
              aria-label="Time zone"
              className="max-w-[320px]"
            />
          </SettingsSection>

          <SettingsSection title="Open hours">
            {value.days.map((day) => (
              <div key={day.day} className="flex flex-wrap items-center gap-3 py-1">
                <span className="w-[110px] shrink-0">
                  <Toggle
                    checked={day.open}
                    onChange={(open) => {
                      setDay(day.day, { open })
                    }}
                    label={DAY_LABEL[day.day]}
                  />
                </span>

                {day.open ? (
                  <span className="flex items-center gap-2 text-[13px]">
                    <Select
                      value={String(day.from)}
                      options={TIME_OPTIONS}
                      onChange={(from) => {
                        setDay(day.day, { from: Number(from) })
                      }}
                      aria-label={`${DAY_LABEL[day.day]} opens`}
                      className="w-[100px]"
                    />
                    to
                    <Select
                      value={String(day.to)}
                      options={TIME_OPTIONS}
                      onChange={(to) => {
                        setDay(day.day, { to: Number(to) })
                      }}
                      aria-label={`${DAY_LABEL[day.day]} closes`}
                      className="w-[100px]"
                    />
                    {day.to <= day.from ? (
                      <span style={{ color: 'var(--danger-strong)' }}>
                        Closing time is not after opening time.
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                    Closed
                  </span>
                )}
              </div>
            ))}
          </SettingsSection>
        </>
      )}
    </SettingsPage>
  )
}
