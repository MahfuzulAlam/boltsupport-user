import { useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StickySaveBar, Toggle } from '@/components/settings-primitives'
import { useInboxes } from '@/features/inbox'

/** Good enough to catch a typo, loose enough not to argue about valid addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface AutoBcc {
  enabled: boolean
  addresses: string
  inboxIds: string[]
}

const DEFAULTS: AutoBcc = { enabled: false, addresses: '', inboxIds: [] }

function parseAddresses(raw: string): string[] {
  return raw
    .split(',')
    .map((address) => address.trim())
    .filter((address) => address !== '')
}

/**
 * A copy of every reply, sent somewhere else.
 *
 * Usually a CRM or an archive, which is why the destination is typed rather than picked from
 * teammates. It is also the one setting on these pages that quietly sends customer email to a
 * third party, so the invalid case is refused rather than saved and silently dropped later.
 */
export function AutoBccPage() {
  const inboxes = useInboxes()
  const all = inboxes.data ?? []

  const [saved, setSaved] = useState<AutoBcc>(DEFAULTS)
  const [edits, setEdits] = useState<Partial<AutoBcc>>({})
  const value = { ...saved, ...edits }
  const dirty = Object.keys(edits).length > 0

  const addresses = parseAddresses(value.addresses)
  const invalid = addresses.filter((address) => !EMAIL.test(address))
  const missing = value.enabled && addresses.length === 0

  const set = <K extends keyof AutoBcc>(key: K, next: AutoBcc[K]) => {
    setEdits((current) => ({ ...current, [key]: next }))
  }

  const toggleInbox = (inboxId: string) => {
    set(
      'inboxIds',
      value.inboxIds.includes(inboxId)
        ? value.inboxIds.filter((id) => id !== inboxId)
        : [...value.inboxIds, inboxId],
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-[760px] flex-1 px-6 pt-8 pb-6">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">Auto Bcc</h1>
        <p className="mb-6 text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
          Send a copy of every reply you write to an address outside BoltSupport.
        </p>

        <section
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <Toggle
            checked={value.enabled}
            onChange={(next) => {
              set('enabled', next)
            }}
            label="Enable auto Bcc"
          />

          <div className="mt-5">
            <Label htmlFor="bcc" className="mb-1 text-[14px] font-medium">
              Bcc address
            </Label>
            <p className="mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Separate multiple addresses with a comma.
            </p>
            <Input
              id="bcc"
              value={value.addresses}
              placeholder="archive@example.com"
              onChange={(event) => {
                set('addresses', event.target.value)
              }}
            />

            {invalid.length > 0 ? (
              <p className="mt-1.5 text-[13px]" style={{ color: 'var(--danger-strong)' }}>
                {invalid.length === 1 ? 'This is not an address: ' : 'These are not addresses: '}
                <span className="font-mono">{invalid.join(', ')}</span>
              </p>
            ) : null}
            {missing ? (
              <p className="mt-1.5 text-[13px]" style={{ color: 'var(--danger-strong)' }}>
                Add an address, or turn auto Bcc off.
              </p>
            ) : null}
          </div>

          <p className="mt-5 mb-1 text-[14px] font-medium">Inboxes</p>
          <p className="mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Leave every box clear to copy replies from all of them.
          </p>

          {all.map((inbox) => (
            <label
              key={inbox.id}
              className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px]"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={value.inboxIds.includes(inbox.id)}
                onChange={() => {
                  toggleInbox(inbox.id)
                }}
              />
              <span
                aria-hidden="true"
                className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border"
                style={{
                  borderColor: value.inboxIds.includes(inbox.id) ? 'var(--brand)' : 'var(--border)',
                  background: value.inboxIds.includes(inbox.id) ? 'var(--brand)' : 'transparent',
                }}
              >
                {value.inboxIds.includes(inbox.id) ? (
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: 'hsl(0 0% 100%)' }}
                  />
                ) : null}
              </span>
              {inbox.name}
            </label>
          ))}
        </section>
      </div>

      <StickySaveBar
        dirty={dirty && invalid.length === 0 && !missing}
        note={
          dirty && (invalid.length > 0 || missing)
            ? 'Fix the address before saving'
            : dirty
              ? 'You have unsaved changes'
              : 'Everything is saved'
        }
        onDiscard={() => {
          setEdits({})
        }}
        onSave={() => {
          setSaved(value)
          setEdits({})
          toast(value.enabled ? 'Auto Bcc is on' : 'Auto Bcc is off')
        }}
      />
    </div>
  )
}
