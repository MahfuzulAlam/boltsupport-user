import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Select } from '@/components/Select'
import { StickySaveBar } from '@/components/settings-primitives'
import { useSession } from '@/features/auth'
import { useInboxes } from '@/features/inbox'

/**
 * The four roles, widest first.
 *
 * Each says what it can do rather than what it is called, because "Admin" means something
 * different at every company and the consequence is what somebody is actually choosing.
 */
const ROLES = [
  { value: 'owner', label: 'Account owner', hint: 'Everything, including billing and deletion' },
  { value: 'admin', label: 'Administrator', hint: 'Everything except billing' },
  { value: 'agent', label: 'Agent', hint: 'Work conversations in the inboxes they can see' },
  { value: 'viewer', label: 'Viewer', hint: 'Read conversations and reports, change nothing' },
] as const

type Role = (typeof ROLES)[number]['value']
type ChannelKey = 'email' | 'chat'

interface Access {
  role: Role
  /** Per inbox, per channel. Absent means no access at all to that inbox. */
  inboxes: Record<string, { email: boolean; chat: boolean }>
}

function AccessBox({
  on,
  locked,
  label,
  onToggle,
}: {
  on: boolean
  locked: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      disabled={locked}
      onClick={onToggle}
      className="flex size-[22px] items-center justify-center rounded-md border disabled:cursor-default disabled:opacity-60"
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
 * What this person can reach.
 *
 * The role decides the ceiling and the table decides the reach, which is why they sit on one
 * page: an owner with two inboxes ticked is still an owner, and reading the role without the
 * inboxes tells you half the answer.
 */
export function AccountPermissionsPage() {
  const { data: session } = useSession()
  const inboxes = useInboxes()
  const all = inboxes.data ?? []

  /*
   * The role is read off the session, not assumed.
   *
   * This page used to open on "Account owner" for everybody, including the seeded admin whose
   * name is printed directly above it. A permissions screen that overstates what you can do is
   * worse than one that is missing: you plan around the answer it gives you. Until the session
   * lands the fallback is the narrowest role, so the page never claims access nobody has.
   */
  const base = useMemo<Access>(
    () => ({ role: session?.user.role ?? 'agent', inboxes: {} }),
    [session?.user.role],
  )

  const [saved, setSaved] = useState<Partial<Access>>({})
  const [edits, setEdits] = useState<Partial<Access>>({})
  const value: Access = { ...base, ...saved, ...edits }
  const dirty = Object.keys(edits).length > 0

  /*
   * An owner has every inbox by definition.
   *
   * Showing the boxes ticked but disabled is more honest than hiding the table: it says the
   * access exists and that the role is what grants it, so demoting the role is the way to change
   * it rather than hunting for a checkbox that would not have held anyway.
   */
  const unrestricted = value.role === 'owner' || value.role === 'admin'

  const access = (inboxId: string) => value.inboxes[inboxId] ?? { email: false, chat: false }

  const toggle = (inboxId: string, channel: ChannelKey) => {
    const current = access(inboxId)
    setEdits((edit) => ({
      ...edit,
      inboxes: {
        ...value.inboxes,
        [inboxId]: { ...current, [channel]: !current[channel] },
      },
    }))
  }

  const role = ROLES.find((item) => item.value === value.role)

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-[760px] flex-1 px-6 pt-8 pb-6">
        <h1 className="mb-1 text-[28px] font-semibold tracking-[-0.02em]">Permissions</h1>
        <p className="mb-6 text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
          What {session?.user.name ?? 'this person'} has access to.
        </p>

        <section
          className="rounded-xl border p-5"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <p className="text-[14px] font-medium">Role</p>
          <p className="mb-2 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Permissions follow the role this person has in the company.
          </p>
          <Select
            value={value.role}
            onChange={(next) => {
              setEdits((edit) => ({ ...edit, role: next as Role }))
            }}
            options={ROLES.map((item) => ({ value: item.value, label: item.label }))}
            aria-label="Role"
          />
          {role === undefined ? null : (
            <p className="mt-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              {role.hint}.
            </p>
          )}
        </section>

        <h2 className="mt-8 mb-1 text-[17px] font-semibold tracking-[-0.01em]">Inbox access</h2>
        <p className="mb-3 text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
          {unrestricted
            ? 'This role reaches every inbox. Change the role to limit it.'
            : 'Limit the inboxes this person can open.'}
        </p>

        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="px-4 py-3 text-left text-[14px] font-semibold">Inbox name</th>
                <th
                  scope="col"
                  className="w-[92px] px-2 py-3 text-center text-[14px] font-semibold"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="w-[92px] px-2 py-3 text-center text-[14px] font-semibold"
                >
                  Chat
                </th>
              </tr>
            </thead>
            <tbody>
              {all.map((inbox, index) => {
                const current = access(inbox.id)
                return (
                  <tr
                    key={inbox.id}
                    className={index === 0 ? undefined : 'border-t'}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <td className="px-4 py-3 text-[14px]">{inbox.name}</td>
                    {(['email', 'chat'] as const).map((channel) => (
                      <td key={channel} className="px-2 py-3">
                        <span className="flex justify-center">
                          <AccessBox
                            on={unrestricted || current[channel]}
                            locked={unrestricted}
                            label={`${channel === 'email' ? 'Email' : 'Chat'} access to ${inbox.name}`}
                            onToggle={() => {
                              toggle(inbox.id, channel)
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
          toast('Permissions saved')
        }}
      />
    </div>
  )
}
