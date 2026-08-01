import { Bell } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Notification {
  id: string
  text: string
  at: Date
  tone: 'brand' | 'danger' | 'ai'
}

/**
 * Fixture content until the notification feed is real.
 *
 * Timestamps are resolved once at module load rather than during render: reading the clock in a
 * render pass is impure, and the value would change between two renders of the same list.
 */
const MINUTES_AGO = [
  { id: 'n1', text: 'Maya Chen replied to #48213', minutesAgo: 4, tone: 'brand' as const },
  { id: 'n2', text: 'SLA breach in 12 minutes on #48190', minutesAgo: 17, tone: 'danger' as const },
  {
    id: 'n3',
    text: 'Auto Draft prepared 4 replies for review',
    minutesAgo: 36,
    tone: 'ai' as const,
  },
]

const LOADED_AT = Date.now()

const NOTIFICATIONS: Notification[] = MINUTES_AGO.map(({ minutesAgo, ...rest }) => ({
  ...rest,
  at: new Date(LOADED_AT - minutesAgo * 60_000),
}))

const TONE_COLOR: Record<Notification['tone'], string> = {
  brand: 'var(--brand)',
  danger: 'var(--danger-strong)',
  ai: 'var(--ai)',
}

export function NotificationsPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications, 3 unread"
          className="relative flex size-9 items-center justify-center rounded-md"
          style={{ color: 'var(--chrome-foreground)' }}
        >
          <Bell className="size-[18px]" />
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 size-[7px] rounded-full"
            style={{ background: 'var(--brand)', border: '1.5px solid var(--chrome)' }}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[324px] p-0">
        <div className="border-b px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[14px] font-medium">Notifications</span>
        </div>
        <ul>
          {NOTIFICATIONS.map((item) => {
            const at = item.at
            return (
              <li
                key={item.id}
                className="flex items-start gap-2.5 border-b px-3 py-2.5 last:border-b-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ background: TONE_COLOR[item.tone] }}
                />
                <div className="min-w-0">
                  <p className="text-[14px]">{item.text}</p>
                  <p
                    className="font-mono text-[12px]"
                    style={{ color: 'var(--muted-foreground)' }}
                    title={at.toISOString()}
                  >
                    {formatDistanceToNowStrict(at, { addSuffix: true })}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
