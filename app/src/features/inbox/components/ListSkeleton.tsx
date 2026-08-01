import { Skeleton } from '@/components/ui/skeleton'

interface ListSkeletonProps {
  rowHeight: number
}

/** Rows at the real height, so the list does not jump when the first page lands. */
export function ListSkeleton({ rowHeight }: ListSkeletonProps) {
  return (
    <div
      className="flex-1 overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label="Loading conversations"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b pr-[18px] pl-[15px]"
          style={{ height: rowHeight, borderColor: 'var(--border)' }}
        >
          <span className="w-[3px] shrink-0" />
          <Skeleton className="size-4 shrink-0 rounded-sm" />
          <div className="flex w-[172px] shrink-0 items-center gap-2.5">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-[64px] shrink-0" />
          <Skeleton className="size-[9px] shrink-0 rounded-full" />
          <Skeleton className="h-3 w-[52px] shrink-0" />
          <Skeleton className="h-3 w-[48px] shrink-0" />
        </div>
      ))}
    </div>
  )
}
