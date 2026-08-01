import { useState } from 'react'
import { AlertTriangle, Check, Info, Loader2, Lock, Zap } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/Select'
import type { Channel } from '@/types'
import { SERVICE_WINDOW_NOTICE, type Provider } from '../providers'

type Phase = 'idle' | 'redirecting' | 'number' | 'error' | 'success'

interface ConnectChannelModalProps {
  provider: Provider
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnect: (payload: { account: string; scopes: string[] }) => Promise<Channel>
}

/** Stand-ins for the numbers a provider would return after consent. */
const NUMBER_OPTIONS = [
  { value: '+1 415 555 0142', label: '+1 415 555 0142 · San Francisco' },
  { value: '+44 20 7946 0812', label: '+44 20 7946 0812 · London' },
  { value: '+49 30 901820', label: '+49 30 901820 · Berlin' },
]

function LogoPair({ provider }: { provider: Provider }) {
  return (
    <div className="mb-4 flex items-center justify-center gap-3" aria-hidden="true">
      <span
        className="flex size-11 items-center justify-center rounded-xl text-[15px] font-semibold"
        style={{ background: provider.tile, color: 'hsl(0 0% 100%)' }}
      >
        {provider.name.charAt(0)}
      </span>
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="size-1.5 rounded-full"
            style={{
              background: 'var(--muted-foreground)',
              animation: 'popin 900ms ease-in-out infinite',
              animationDelay: `${String(index * 150)}ms`,
            }}
          />
        ))}
      </span>
      <span
        className="flex size-11 items-center justify-center rounded-xl"
        style={{ background: 'var(--brand)' }}
      >
        <Zap className="size-5" style={{ color: 'hsl(0 0% 100%)' }} />
      </span>
    </div>
  )
}

/**
 * One connect flow for every provider.
 *
 * The permissions block is the reason this is a modal rather than a button that redirects: the
 * scopes come from the provider table in this codebase and are shown before anything leaves the
 * page, so nobody arrives at a consent screen without having read what it grants (FR-6.2).
 */
export function ConnectChannelModal({
  provider,
  open,
  onOpenChange,
  onConnect,
}: ConnectChannelModalProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [number, setNumber] = useState(NUMBER_OPTIONS[0]?.value ?? '')

  const scopes = provider.scopes.map((entry) => entry.scope)

  const finish = async (account: string) => {
    try {
      await onConnect({ account, scopes })
      setPhase('success')
      window.setTimeout(() => {
        onOpenChange(false)
        setPhase('idle')
      }, 900)
    } catch {
      setError('We could not complete the connection. Nothing was changed.')
      setPhase('error')
    }
  }

  const start = () => {
    setError(null)
    setPhase('redirecting')
    // Stands in for the consent round trip. A real flow carries a state parameter and validates
    // the redirect origin before this point is reached.
    window.setTimeout(() => {
      if (provider.needsNumber === true) {
        setPhase('number')
      } else {
        void finish(`${provider.name} account`)
      }
    }, 700)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setPhase('idle')
      }}
    >
      <DialogContent className="max-w-lg">
        <LogoPair provider={provider} />
        <DialogTitle className="text-center text-[18px]">
          Connect {provider.name} to BoltSupport
        </DialogTitle>

        {phase === 'number' ? (
          <>
            <p className="mt-2 text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
              Choose the number this inbox should use.
            </p>
            <Select
              value={number}
              options={NUMBER_OPTIONS}
              onChange={setNumber}
              aria-label={`${provider.name} number`}
              className="mt-2"
            />

            <div
              className="mt-3 flex items-start gap-2 rounded-md border p-2.5 text-[13px]"
              style={{
                borderColor: 'var(--warning)',
                background: 'hsl(38 92% 50% / 0.10)',
                color: 'var(--warning-strong)',
              }}
            >
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{SERVICE_WINDOW_NOTICE}</span>
            </div>

            <Button
              className="mt-4 w-full"
              onClick={() => {
                void finish(number)
              }}
            >
              Connect {number}
            </Button>
          </>
        ) : phase === 'success' ? (
          <div className="py-6 text-center">
            <span
              className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full"
              style={{ background: 'var(--success-soft)' }}
            >
              <Check
                className="size-5"
                style={{ color: 'var(--success-strong)' }}
                aria-hidden="true"
              />
            </span>
            <p className="text-[15px] font-medium">{provider.name} connected</p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-[14px] leading-[1.6]">
              Get notified of, reply to, and manage {provider.name} conversations without leaving
              your inbox.
            </p>
            <p
              className="mt-2 text-[14px] leading-[1.6]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Give customers who reach you on {provider.name} the same experience as email:
              assignment, notes, saved replies, and reporting.
            </p>

            <section
              className="mt-4 rounded-md border p-3"
              style={{ borderColor: 'var(--border)', background: 'var(--muted)' }}
            >
              <h3 className="eyebrow mb-2">BoltSupport will be able to</h3>
              <ul>
                {provider.scopes.map((entry) => (
                  <li key={entry.scope} className="flex items-start gap-2 py-1 text-[13px]">
                    <Lock
                      className="mt-0.5 size-3.5 shrink-0"
                      style={{ color: 'var(--muted-foreground)' }}
                      aria-hidden="true"
                    />
                    <span>
                      {entry.label}{' '}
                      <span
                        className="font-mono text-[12px]"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {entry.scope}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {phase === 'error' && error !== null ? (
              <div
                className="mt-3 flex items-start gap-2 rounded-md border p-2.5 text-[13px]"
                style={{
                  borderColor: 'var(--danger)',
                  background: 'var(--danger-soft)',
                  color: 'var(--danger-strong)',
                }}
                role="alert"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            <Button className="mt-4 w-full" disabled={phase === 'redirecting'} onClick={start}>
              {phase === 'redirecting' ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Opening {provider.name}…
                </>
              ) : phase === 'error' ? (
                'Try again'
              ) : (
                `Continue with ${provider.name}`
              )}
            </Button>

            <p
              className="mt-2 text-center text-[12px]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              You can disconnect at any time from channel settings.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
