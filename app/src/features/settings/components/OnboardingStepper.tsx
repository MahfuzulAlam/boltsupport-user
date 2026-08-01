import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Sparkles, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/settings-primitives'
import { cn } from '@/lib/utils'

const STEPS = ['Name your inbox', 'Connect a channel', 'Invite teammates', 'Turn on AI'] as const
type Step = 0 | 1 | 2 | 3

/**
 * Each AI feature in one plain sentence, plus the thing people actually want to know.
 *
 * The reassurance is repeated per feature rather than stated once at the top, because this is
 * the screen where somebody decides whether to trust any of it, and a single line above four
 * switches is a line that gets skimmed.
 */
const AI_FEATURES = [
  {
    key: 'draft',
    name: 'Draft replies for me',
    what: 'Writes a first draft you can edit. You still press Send.',
  },
  {
    key: 'tag',
    name: 'Suggest tags',
    what: 'Picks from tags you already use. It cannot invent one.',
  },
  {
    key: 'assign',
    name: 'Route new conversations',
    what: 'Sends a conversation to whoever has handled ones like it before.',
  },
  {
    key: 'summary',
    name: 'Summarize long threads',
    what: 'Condenses a thread when you ask. Never shown to a customer.',
  },
]

interface OnboardingStepperProps {
  onDone: () => void
}

/**
 * First run.
 *
 * Four steps, all skippable, because a helpdesk with one inbox and no AI is a working helpdesk
 * and the setup should not pretend otherwise.
 */
export function OnboardingStepper({ onDone }: OnboardingStepperProps) {
  const [step, setStep] = useState<Step>(0)
  const [inboxName, setInboxName] = useState('Support')
  const [invites, setInvites] = useState('')
  const [ai, setAi] = useState<Record<string, boolean>>({
    draft: true,
    tag: true,
    assign: false,
    summary: true,
  })

  const next = () => {
    if (step === 3) onDone()
    else setStep((step + 1) as Step)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--background)' }}
      role="dialog"
      aria-label="Set up your workspace"
    >
      <header
        className="flex h-14 flex-none items-center gap-3 border-b px-4"
        style={{ borderColor: 'var(--border)' }}
      >
        <ol className="mx-auto flex items-center gap-1">
          {STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-1">
              <span
                className="flex h-7 items-center gap-2 rounded-md px-2.5 text-[13px]"
                style={{
                  background: index === step ? 'var(--brand-soft)' : 'transparent',
                  color:
                    index === step
                      ? 'var(--brand)'
                      : index < step
                        ? 'var(--foreground)'
                        : 'var(--muted-foreground)',
                }}
                aria-current={index === step ? 'step' : undefined}
              >
                <span
                  className="flex size-5 items-center justify-center rounded-full font-mono text-[11px]"
                  style={{
                    background:
                      index < step
                        ? 'var(--success)'
                        : index === step
                          ? 'var(--brand)'
                          : 'var(--muted)',
                    color: index <= step ? 'hsl(0 0% 100%)' : 'var(--muted-foreground)',
                  }}
                >
                  {index < step ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
              {index < STEPS.length - 1 ? (
                <span
                  className="h-px w-4"
                  style={{ background: 'var(--border)' }}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onDone}
          aria-label="Close setup"
          className="flex size-9 items-center justify-center rounded-md"
        >
          <X className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-[520px]">
          {step === 0 ? (
            <>
              <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.015em]">
                Name your inbox
              </h1>
              <p className="mb-5 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
                One shared place for everything customers send you. You can add more later.
              </p>
              <Label htmlFor="onboarding-inbox" className="mb-1.5 block text-[13px]">
                Inbox name
              </Label>
              <Input
                id="onboarding-inbox"
                value={inboxName}
                onChange={(event) => {
                  setInboxName(event.target.value)
                }}
                className="max-w-[360px]"
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.015em]">
                Connect a channel
              </h1>
              <p className="mb-5 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
                Forward your support address here, or connect chat, WhatsApp, and the rest.
              </p>
              <div
                className="rounded-lg border p-4"
                style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
              >
                <p className="mb-1 text-[14px] font-medium">Email is ready</p>
                <p className="mb-3 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  Forward mail to your new inbox address and it appears here. Everything else
                  connects from the channels screen.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/inbox/in1/settings/channels">Connect more channels</Link>
                </Button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.015em]">
                Invite teammates
              </h1>
              <p className="mb-5 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
                A shared inbox works better with more than one person in it. Skip this if you are
                starting alone.
              </p>
              <Label htmlFor="onboarding-invites" className="mb-1.5 block text-[13px]">
                Email addresses
              </Label>
              <Input
                id="onboarding-invites"
                value={invites}
                onChange={(event) => {
                  setInvites(event.target.value)
                }}
                placeholder="ada@example.com, jonas@example.com"
              />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.015em]">
                Turn on AI, or do not
              </h1>
              <p className="mb-4 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
                Every one of these suggests something for you to accept or reject. None of them send
                anything to a customer on their own.
              </p>

              <div
                className="rounded-lg border"
                style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
              >
                {AI_FEATURES.map((feature) => (
                  <div
                    key={feature.key}
                    className={cn('border-b p-3.5 last:border-b-0')}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <Toggle
                      checked={ai[feature.key] ?? false}
                      onChange={(on) => {
                        setAi((current) => ({ ...current, [feature.key]: on }))
                      }}
                      label={feature.name}
                      description={feature.what}
                    />
                  </div>
                ))}
              </div>

              <p
                className="mt-3 flex items-start gap-2 rounded-md border p-2.5 text-[13px]"
                style={{ borderColor: 'var(--ai)', background: 'var(--ai-soft)' }}
              >
                <Sparkles className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--ai)' }} />
                <span>
                  You can turn all of this off in one switch later, and every screen keeps working
                  without it.
                </span>
              </p>
            </>
          ) : null}
        </div>
      </div>

      <footer
        className="flex flex-none items-center gap-2 border-t px-6 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        {step > 0 ? (
          <Button
            variant="outline"
            onClick={() => {
              setStep((step - 1) as Step)
            }}
          >
            Back
          </Button>
        ) : null}

        <Button variant="ghost" onClick={onDone}>
          Skip setup
        </Button>

        <Button className="ml-auto" onClick={next} disabled={step === 0 && inboxName.trim() === ''}>
          {step === 3 ? 'Finish' : 'Next'}
        </Button>
      </footer>
    </div>
  )
}
