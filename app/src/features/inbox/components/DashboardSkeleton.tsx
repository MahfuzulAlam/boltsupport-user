import { Skeleton } from '@/components/ui/skeleton'

/**
 * Matches the real card's height and internal rhythm, so the layout does not jump when the data
 * lands. A skeleton that is the wrong shape is worse than none.
 */
export function DashboardSkeleton() {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(316px,1fr))] gap-4"
      role="status"
      aria-busy="true"
      aria-label="Loading inboxes"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <div className="flex items-start gap-2 px-4 pt-4 pb-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="size-4 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pb-4">
            {Array.from({ length: 6 }, (_, row) => (
              <Skeleton key={row} className="h-3.5 w-full" />
            ))}
          </div>
          <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}
