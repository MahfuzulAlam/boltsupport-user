import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ChevronDown, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SettingsSection } from '@/components/settings-primitives'
import { cn } from '@/lib/utils'
import type { DnsRecord, OutgoingEmail } from '@/types'
import { fetchInboxSetting, patchInboxSetting } from '../api/settings'
import { useSettingsForm } from '../hooks/use-settings-form'
import { SettingsPage } from './SettingsPage'

function RecordTable({ record }: { record: DnsRecord }) {
  const cells: [string, string][] = [
    ['Host', record.host],
    ['Type', record.type],
    ['Value', record.value],
  ]
  return (
    <table className="mt-2 w-full text-[13px]">
      <tbody>
        {cells.map(([label, value]) => (
          <tr key={label} className="border-t" style={{ borderColor: 'var(--border)' }}>
            <td className="w-[70px] py-1.5" style={{ color: 'var(--muted-foreground)' }}>
              {label}
            </td>
            <td className="py-1.5 font-mono break-all">{value}</td>
            <td className="w-[70px] py-1.5 text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(value)
                  toast(`${label} copied`)
                }}
              >
                <Copy className="size-3.5" aria-hidden="true" />
                Copy
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * One authentication record, expandable.
 *
 * Collapsed by default because the DNS values are long and most visits are to check the badge,
 * not to read the record. An inactive one says what breaks rather than just showing a grey pill:
 * "not active" means nothing to someone who has never configured DMARC.
 */
function AuthRow({
  name,
  active,
  current,
  recommended,
  consequence,
}: {
  name: string
  active: boolean
  current: string
  recommended: DnsRecord
  consequence: string
}) {
  const [open, setOpen] = useState(!active)
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 py-3 text-left"
      >
        <span className="text-[14px] font-medium">{name}</span>
        <span
          className="rounded px-1.5 py-0.5 text-[12px] font-medium"
          style={{
            background: active ? 'var(--success-soft)' : 'var(--muted)',
            color: active ? 'var(--success-strong)' : 'var(--muted-foreground)',
          }}
        >
          {active ? 'Active' : 'Not set up'}
        </span>
        <ChevronDown
          className={cn('ml-auto size-4 transition-transform', open && 'rotate-180')}
          style={{ color: 'var(--muted-foreground)' }}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="pb-3">
          {active ? (
            <>
              <p className="mb-1 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                Current record
              </p>
              <p className="font-mono text-[12px] break-all">{current}</p>
            </>
          ) : (
            <p
              className="flex items-start gap-2 rounded-md border p-2.5 text-[13px]"
              style={{
                borderColor: 'var(--warning)',
                background: 'hsl(38 92% 50% / 0.10)',
                color: 'var(--warning-strong)',
              }}
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{consequence}</span>
            </p>
          )}

          <p className="mt-3 mb-0 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Add this record at your DNS provider
          </p>
          <RecordTable record={recommended} />
        </div>
      ) : null}
    </div>
  )
}

export function OutgoingEmailPage() {
  const inboxId = useParams()['inboxId'] ?? 'in1'
  const queryClient = useQueryClient()

  const saved = useQuery({
    queryKey: ['inbox-settings', inboxId, 'outgoing-email'],
    queryFn: ({ signal }) => fetchInboxSetting(inboxId, 'outgoing-email', signal),
  })
  const form = useSettingsForm<OutgoingEmail>(saved.data)

  const save = useMutation({
    mutationFn: (patch: Partial<OutgoingEmail>) =>
      patchInboxSetting(inboxId, 'outgoing-email', patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox-settings', inboxId] })
      form.saved()
      toast('Outgoing email updated')
    },
  })

  const value = form.value

  return (
    <SettingsPage
      title="Outgoing email"
      description="How your replies leave the building, and whether receivers trust them."
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
          <SettingsSection title="Sending">
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Sending mode">
              {(
                [
                  {
                    value: 'boltsupport' as const,
                    title: 'Use BoltSupport',
                    body: 'We send on your behalf from your own domain. Nothing to run.',
                  },
                  {
                    value: 'smtp' as const,
                    title: 'Use custom SMTP',
                    body: 'Send through your own server. You keep full control of delivery.',
                  },
                ] as const
              ).map((option) => {
                const selected = value.mode === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      form.update({ mode: option.value })
                    }}
                    className="rounded-lg border p-3 text-left"
                    style={{
                      borderColor: selected ? 'var(--brand)' : 'var(--border)',
                      background: selected ? 'var(--brand-soft)' : 'var(--card)',
                    }}
                  >
                    <p className="mb-1 text-[14px] font-medium">{option.title}</p>
                    <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                      {option.body}
                    </p>
                  </button>
                )
              })}
            </div>

            {value.mode === 'smtp' ? (
              <div className="mt-3 grid max-w-[520px] gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="smtp-host" className="mb-1.5 block text-[13px]">
                    Host
                  </Label>
                  <Input
                    id="smtp-host"
                    value={value.smtpHost}
                    onChange={(event) => {
                      form.update({ smtpHost: event.target.value })
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-port" className="mb-1.5 block text-[13px]">
                    Port
                  </Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={value.smtpPort}
                    onChange={(event) => {
                      form.update({ smtpPort: Number(event.target.value) })
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="smtp-user" className="mb-1.5 block text-[13px]">
                    Username
                  </Label>
                  <Input
                    id="smtp-user"
                    value={value.smtpUser}
                    onChange={(event) => {
                      form.update({ smtpUser: event.target.value })
                    }}
                  />
                  {/* The password field is deliberately absent. NFR-2.5: a secret typed into a
                      settings form is a secret in the client, and this one belongs server side. */}
                  <p className="mt-1.5 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                    Set the password from the server console. It is never entered or shown here.
                  </p>
                </div>
              </div>
            ) : null}
          </SettingsSection>

          <SettingsSection
            title="Authentication"
            description="Without these, your replies are more likely to land in spam."
          >
            <AuthRow
              name="DKIM"
              active={value.dkim.active}
              current={value.dkim.current}
              recommended={value.dkim.recommended}
              consequence="Nothing signs your messages, so receivers cannot verify they came from you."
            />
            <AuthRow
              name="DMARC"
              active={value.dmarc.active}
              current={value.dmarc.current}
              recommended={value.dmarc.recommended}
              consequence="Receivers have no instruction for what to do when a message fails DKIM, so each one guesses."
            />

            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                toast('Checked your DNS', {
                  description: value.dmarc.active
                    ? 'Both records resolve.'
                    : 'DKIM resolves. DMARC is still missing.',
                })
              }}
            >
              <Check className="size-4" aria-hidden="true" />
              Test settings
            </Button>
          </SettingsSection>
        </>
      )}
    </SettingsPage>
  )
}
