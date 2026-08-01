import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { StickySaveBar } from '@/components/settings-primitives'
import { useSession } from '@/features/auth'

interface ProfileForm {
  firstName: string
  lastName: string
  jobTitle: string
  pronouns: string
  location: string
  phone: string
  email: string
  billingEmail: string
  alternateEmails: string
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <>
      {title === undefined ? null : (
        <h2 className="mt-8 mb-3 text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
      )}
      <section
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        {children}
      </section>
    </>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 last:mb-0">
      <Label className="mb-1.5 text-[14px] font-medium">
        {label}
        {required === true ? (
          <span aria-hidden="true" style={{ color: 'var(--danger)' }}>
            *
          </span>
        ) : null}
      </Label>
      {hint === undefined ? null : (
        <p className="mb-1.5 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/**
 * The signed in person's own details.
 *
 * Two cards rather than one long form: who you are, which teammates see, and then the account
 * itself, which is credentials and billing. They sit apart because changing your job title and
 * changing the address that receives invoices are not the same kind of decision.
 */
export function ProfilePage() {
  const { data: session } = useSession()
  const name = session?.user.name ?? ''

  /*
   * The saved values, derived from the session every render.
   *
   * Snapshotting these into state on mount looked right and was not: the session arrives a
   * moment after the first paint, so the form kept the empty capture forever and the save bar
   * announced unsaved changes to somebody who had typed nothing.
   */
  const initial = useMemo<ProfileForm>(() => {
    const [first = '', last = ''] = (session?.user.name ?? '').split(' ')
    return {
      firstName: first,
      lastName: last,
      jobTitle: session?.user.role === 'admin' ? 'Head of support' : 'Support specialist',
      pronouns: '',
      location: '',
      phone: '',
      email: session?.user.email ?? '',
      billingEmail: session?.user.email ?? '',
      alternateEmails: '',
    }
  }, [session])

  // Only what has been typed. An empty overlay is what "nothing to save" means, which keeps the
  // save bar honest without comparing every field.
  const [edits, setEdits] = useState<Partial<ProfileForm>>({})
  const form = { ...initial, ...edits }
  const dirty = Object.keys(edits).length > 0

  const set = (key: keyof ProfileForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setEdits((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-[760px] flex-1 px-6 pt-8 pb-6">
        <h1 className="mb-5 text-[28px] font-semibold tracking-[-0.02em]">Profile</h1>

        <Card>
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="size-[76px]">
              <AvatarFallback
                className="text-[22px] font-medium"
                style={{ background: 'var(--brand)', color: 'hsl(0 0% 100%)' }}
              >
                {initials(name === '' ? '?' : name)}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              onClick={() => {
                toast('Choose a photo', { description: 'Uploading arrives with the media work.' })
              }}
            >
              Replace
            </Button>
          </div>

          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="First name" required>
              <Input value={form.firstName} onChange={set('firstName')} />
            </Field>
            <Field label="Last name" required>
              <Input value={form.lastName} onChange={set('lastName')} />
            </Field>
          </div>

          <Field label="Job title">
            <Input value={form.jobTitle} onChange={set('jobTitle')} />
          </Field>

          {/* Free text, never a picker. A fixed list of pronouns is a list that leaves people out. */}
          <Field label="Pronouns">
            <Input value={form.pronouns} onChange={set('pronouns')} placeholder="Optional" />
          </Field>

          <Field label="Location">
            <Input value={form.location} onChange={set('location')} placeholder="Optional" />
          </Field>

          <Field label="Phone number">
            <Input value={form.phone} onChange={set('phone')} placeholder="Optional" />
          </Field>
        </Card>

        <Card title="Account">
          <Field label="Email address" required>
            <Input type="email" value={form.email} onChange={set('email')} />
          </Field>

          <Field label="Billing email" required>
            <Input type="email" value={form.billingEmail} onChange={set('billingEmail')} />
          </Field>

          <Field
            label="Alternate emails"
            hint="Other addresses you might use to forward in new conversations or reply to notifications. Separate each one with a comma."
          >
            <Input
              value={form.alternateEmails}
              onChange={set('alternateEmails')}
              placeholder="Optional"
            />
          </Field>

          <Field label="Password">
            {/* A link out, never a field here. Nothing on this page should be able to read or
                echo a password back. */}
            <Button
              variant="outline"
              onClick={() => {
                toast('Check your inbox', {
                  description: 'We send a link rather than changing it in place.',
                })
              }}
            >
              Change password
            </Button>
          </Field>
        </Card>
      </div>

      <StickySaveBar
        dirty={dirty}
        note={dirty ? 'You have unsaved changes' : 'Everything is saved'}
        onDiscard={() => {
          setEdits({})
        }}
        onSave={() => {
          setEdits({})
          toast('Profile saved')
        }}
      />
    </div>
  )
}
