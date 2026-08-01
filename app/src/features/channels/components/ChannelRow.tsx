import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { format, formatDistanceToNowStrict } from 'date-fns'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Channel } from '@/types'
import { SERVICE_WINDOW_NOTICE, type Provider } from '../providers'

interface ChannelRowProps {
  channel: Channel
  provider: Provider
  syncing: boolean
  onConnect: () => void
  onSync: () => void
  onDisconnect: () => void
}

export function ChannelRow({
  channel,
  provider,
  syncing,
  onConnect,
  onSync,
  onDisconnect,
}: ChannelRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const connected = channel.status === 'connected'

  return (
    <section
      aria-label={provider.name}
      className="border-b last:border-b-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex h-20 items-center gap-3 px-4">
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-[15px] font-semibold"
          style={{ background: provider.tile, color: 'hsl(0 0% 100%)' }}
          aria-hidden="true"
        >
          {provider.name.charAt(0)}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[15px] font-medium">
            {provider.name}
            {connected ? (
              <span
                className="rounded px-1.5 py-0.5 text-[12px] font-medium"
                style={{ background: 'var(--success-soft)', color: 'var(--success-strong)' }}
              >
                Connected
              </span>
            ) : null}
            {!provider.available ? (
              <span
                className="rounded px-1.5 py-0.5 text-[12px] font-medium"
                style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
              >
                Coming soon
              </span>
            ) : null}
          </p>
          <p className="truncate text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {connected && channel.account !== undefined ? channel.account : provider.description}
          </p>
        </div>

        {connected ? (
          <button
            type="button"
            onClick={() => {
              setExpanded((open) => !open)
            }}
            aria-expanded={expanded}
            aria-label={`${provider.name} details`}
            className="flex size-9 items-center justify-center rounded-md"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
          </button>
        ) : (
          <Button variant="outline" size="sm" disabled={!provider.available} onClick={onConnect}>
            Connect
          </Button>
        )}
      </div>

      {connected && expanded ? (
        <div className="px-4 pb-4" style={{ background: 'var(--muted)' }}>
          <dl className="pt-3">
            <div className="flex gap-3 py-1 text-[13px]">
              <dt className="w-[130px] shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                Connected account
              </dt>
              <dd>{channel.account ?? '—'}</dd>
            </div>
            <div className="flex gap-3 py-1 text-[13px]">
              <dt className="w-[130px] shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                Connected
              </dt>
              <dd>
                {channel.connectedAt === undefined
                  ? '—'
                  : format(new Date(channel.connectedAt), 'd MMM yyyy')}
              </dd>
            </div>
            <div className="flex gap-3 py-1 text-[13px]">
              <dt className="w-[130px] shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                Last sync
              </dt>
              <dd className="font-mono">
                {channel.lastSyncAt === undefined
                  ? '—'
                  : `${formatDistanceToNowStrict(new Date(channel.lastSyncAt))} ago`}
              </dd>
            </div>
            <div className="flex gap-3 py-1 text-[13px]">
              <dt className="w-[130px] shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                Granted scopes
              </dt>
              <dd className="flex flex-wrap gap-1">
                {channel.scopes.length === 0
                  ? '—'
                  : channel.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded px-1.5 py-0.5 font-mono text-[12px]"
                        style={{ background: 'var(--card)', color: 'var(--muted-foreground)' }}
                      >
                        {scope}
                      </span>
                    ))}
              </dd>
            </div>
          </dl>

          {provider.needsNumber === true ? (
            <p
              className="mt-2 flex items-start gap-2 rounded-md border p-2.5 text-[13px]"
              style={{
                borderColor: 'var(--warning)',
                background: 'hsl(38 92% 50% / 0.10)',
                color: 'var(--warning-strong)',
              }}
            >
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{SERVICE_WINDOW_NOTICE}</span>
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={syncing} onClick={onSync}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>

            {confirming ? (
              <>
                <span className="ml-auto text-[13px]">
                  Disconnect {provider.name}? Conversations already here stay put.
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setConfirming(false)
                    onDisconnect()
                  }}
                  style={{ background: 'var(--danger)', color: 'hsl(0 0% 100%)' }}
                >
                  Yes, disconnect {provider.name}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirming(false)
                  }}
                >
                  Keep it
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                style={{ color: 'var(--danger-strong)' }}
                onClick={() => {
                  setConfirming(true)
                }}
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
