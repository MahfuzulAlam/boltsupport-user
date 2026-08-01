import { CHANNEL_META } from '@/lib/channels'
import type { Channel } from '@/types'

interface ChannelIconRowProps {
  channels: Channel[]
}

/**
 * The connected channels on an inbox card.
 *
 * Disconnected channels are dimmed rather than hidden, so an admin can see at a glance what is
 * available but not yet set up instead of wondering whether the product supports it.
 */
export function ChannelIconRow({ channels }: ChannelIconRowProps) {
  return (
    <ul className="flex items-center gap-1.5">
      {channels.map((channel) => {
        const meta = CHANNEL_META[channel.type]
        const connected = channel.status === 'connected'
        const label = connected
          ? `${meta.label}, connected${channel.account === undefined ? '' : ` as ${channel.account}`}`
          : `${meta.label}, not connected`

        return (
          <li key={channel.id}>
            <meta.icon
              className="size-4"
              style={{ color: connected ? 'var(--muted-foreground)' : 'var(--border)' }}
              aria-label={label}
              role="img"
            />
          </li>
        )
      })}
    </ul>
  )
}
