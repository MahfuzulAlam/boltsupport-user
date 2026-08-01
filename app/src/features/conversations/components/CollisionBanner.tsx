import { formatDistanceToNowStrict } from 'date-fns'
import { Eye, PenLine } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Presence, User } from '@/types'

interface CollisionBannerProps {
  presence: Presence[]
  users: Map<string, User>
  since: string
}

/**
 * Collision detection (FR-2.1, FR-2.2).
 *
 * Viewing is amber and quiet; replying escalates to danger, because two agents typing at once
 * is the moment a customer gets two contradictory answers. Both are shown before a send is
 * attempted, which is the only point where the information is still useful.
 */
export function CollisionBanner({ presence, users, since }: CollisionBannerProps) {
  const replying = presence.find((entry) => entry.state === 'replying')
  const entry = replying ?? presence[0]
  if (entry === undefined) return null

  const user = users.get(entry.userId)
  const name = user?.name ?? 'A teammate'
  const isReplying = entry.state === 'replying'

  return (
    <div
      role="status"
      className="mx-[18px] mt-3 flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-[13px]"
      style={{
        background: isReplying ? 'var(--danger-soft)' : 'var(--note)',
        border: `1px solid ${isReplying ? 'var(--danger)' : 'var(--warning)'}`,
      }}
    >
      <Avatar className="size-[22px]">
        <AvatarFallback
          className="text-[10px] font-medium"
          style={{
            background: 'var(--muted)',
            color: 'var(--muted-foreground)',
            boxShadow: `0 0 0 2px ${isReplying ? 'var(--danger)' : 'var(--warning)'}`,
          }}
        >
          {name
            .split(' ')
            .map((part) => part.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {isReplying ? (
        <PenLine className="size-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Eye className="size-3.5 shrink-0" aria-hidden="true" />
      )}

      <span className="font-medium">
        {isReplying
          ? `${name} is replying to this conversation right now.`
          : `${name} is looking at this conversation.`}
      </span>

      <span className="ml-auto font-mono text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
        since {formatDistanceToNowStrict(new Date(since))} ago
      </span>
    </div>
  )
}
