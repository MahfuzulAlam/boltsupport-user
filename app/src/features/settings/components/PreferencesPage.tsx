import { useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/Select'
import { StickySaveBar, Toggle } from '@/components/settings-primitives'
import { ACCENTS, ACCENT_LIST, useAccent, type Accent } from '@/hooks/use-accent'
import { cn } from '@/lib/utils'

/** Enough of the world to be useful without pretending to be a full tz database. */
const TIME_ZONES = [
  '(GMT-08:00) Pacific Time',
  '(GMT-05:00) Eastern Time',
  '(GMT+00:00) Coordinated Universal Time',
  '(GMT+01:00) Central European Time',
  '(GMT+03:00) East Africa Time',
  '(GMT+05:30) India Standard Time',
  '(GMT+06:00) Bangladesh Standard Time',
  '(GMT+09:00) Japan Standard Time',
  '(GMT+11:00) Australian Eastern Time',
]

interface Preferences {
  timeZone: string
  timeFormat: '12' | '24'
  maxChats: string
  reassign: boolean
  shortcuts: boolean
  autoFollow: boolean
}

const DEFAULTS: Preferences = {
  timeZone: '(GMT+00:00) Coordinated Universal Time',
  timeFormat: '12',
  maxChats: '3',
  reassign: false,
  shortcuts: true,
  autoFollow: false,
}

function Section({
  title,
  description,
  children,
}: {
  title?: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <>
      {title === undefined ? null : (
        <h2 className="mt-8 mb-1 text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
      )}
      {description === undefined ? null : (
        <p className="mb-3 text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
          {description}
        </p>
      )}
      <section
        className={cn(
          'rounded-xl border p-5',
          title !== undefined && description === undefined && 'mt-3',
        )}
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        {children}
      </section>
    </>
  )
}

function Radio({
  checked,
  onSelect,
  label,
}: {
  checked: boolean
  onSelect: () => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px]">
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
        className="sr-only"
        name="time-format"
      />
      <span
        aria-hidden="true"
        className="flex size-[18px] shrink-0 items-center justify-center rounded-full border-2"
        style={{ borderColor: checked ? 'var(--brand)' : 'var(--border)' }}
      >
        {checked ? (
          <span className="size-2 rounded-full" style={{ background: 'var(--brand)' }} />
        ) : null}
      </span>
      {label}
    </label>
  )
}

/**
 * The colour an agent picks for themselves.
 *
 * Applied the instant it is clicked rather than on save, because the only way to judge an accent
 * is to see the app wearing it. It is a personal setting, so there is nothing to lose by trying
 * one on.
 */
function AccentPicker({ value, onPick }: { value: Accent; onPick: (accent: Accent) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {ACCENT_LIST.map((accent) => {
        const definition = ACCENTS[accent]
        const active = accent === value
        return (
          <button
            key={accent}
            type="button"
            onClick={() => {
              onPick(accent)
            }}
            aria-pressed={active}
            aria-label={definition.label}
            className="flex flex-col items-center gap-1.5"
          >
            <span
              className="flex size-10 items-center justify-center rounded-full transition-transform"
              style={{
                background: `hsl(${definition.light})`,
                boxShadow: active ? '0 0 0 3px var(--card), 0 0 0 5px var(--foreground)' : 'none',
              }}
            >
              {active ? <Check className="size-4" style={{ color: 'hsl(0 0% 100%)' }} /> : null}
            </span>
            <span className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
              {definition.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function PreferencesPage() {
  const accent = useAccent((s) => s.accent)
  const setAccent = useAccent((s) => s.setAccent)

  const [saved, setSaved] = useState<Preferences>(DEFAULTS)
  const [edits, setEdits] = useState<Partial<Preferences>>({})
  const value = { ...saved, ...edits }
  const dirty = Object.keys(edits).length > 0

  const set = <K extends keyof Preferences>(key: K, next: Preferences[K]) => {
    setEdits((current) => ({ ...current, [key]: next }))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-[760px] flex-1 px-6 pt-8 pb-6">
        <h1 className="mb-5 text-[28px] font-semibold tracking-[-0.02em]">Preferences</h1>

        <Section>
          <p className="mb-1.5 text-[14px] font-medium">Time zone</p>
          <Select
            value={value.timeZone}
            onChange={(next) => {
              set('timeZone', next)
            }}
            options={TIME_ZONES.map((zone) => ({ value: zone, label: zone }))}
            aria-label="Time zone"
          />

          <p className="mt-5 mb-1 text-[14px] font-medium">Time format</p>
          <Radio
            checked={value.timeFormat === '12'}
            onSelect={() => {
              set('timeFormat', '12')
            }}
            label="12 hour (e.g. 2:13 pm)"
          />
          <Radio
            checked={value.timeFormat === '24'}
            onSelect={() => {
              set('timeFormat', '24')
            }}
            label="24 hour (e.g. 14:13)"
          />

          <p className="mt-5 text-[14px] font-medium">Maximum chats</p>
          <p className="mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            We recommend 3 to keep response times snappy.
          </p>
          <Input
            type="number"
            min={1}
            max={10}
            className="w-[120px]"
            value={value.maxChats}
            onChange={(event) => {
              set('maxChats', event.target.value)
            }}
            aria-label="Maximum chats"
          />
        </Section>

        <Section
          title="Colour theme"
          description="Pick an accent for your account. It only changes what you see."
        >
          <AccentPicker value={accent} onPick={setAccent} />
        </Section>

        <Section
          title="Conversation reassignment"
          description="Automatically reassign your conversations that become active while you are away."
        >
          <Toggle
            checked={value.reassign}
            onChange={(next) => {
              set('reassign', next)
            }}
            label="Reassign conversations"
          />
        </Section>

        <Section title="Advanced">
          <Toggle
            checked={value.shortcuts}
            onChange={(next) => {
              set('shortcuts', next)
            }}
            label="Keyboard shortcuts"
            description="Navigate and act on conversations without touching your mouse."
          />
          <Toggle
            checked={value.autoFollow}
            onChange={(next) => {
              set('autoFollow', next)
            }}
            label="Auto follow when mentioned"
            description="Follow a conversation automatically when someone @mentions you in a note."
          />
        </Section>
      </div>

      <StickySaveBar
        dirty={dirty}
        note={dirty ? 'You have unsaved changes' : 'Everything is saved'}
        onDiscard={() => {
          setEdits({})
        }}
        onSave={() => {
          setSaved(value)
          setEdits({})
          toast('Preferences saved')
        }}
      />
    </div>
  )
}
