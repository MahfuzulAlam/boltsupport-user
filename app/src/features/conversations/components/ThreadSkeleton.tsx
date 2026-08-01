import { Skeleton } from '@/components/ui/skeleton'

interface ThreadSkeletonProps {
  /** Rendered inside an existing thread column rather than as the whole screen. */
  inline?: boolean
}

export function ThreadSkeleton({ inline = false }: ThreadSkeletonProps) {
  const body = (
    <div aria-busy="true" aria-label="Loading the conversation">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex gap-3.5 py-3.5">
          <div
            className="w-[3px] flex-none rounded-[2px]"
            style={{ background: 'var(--border)' }}
          />
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="ml-auto h-3 w-16" />
            </div>
            <Skeleton className="mb-2 h-3.5 w-full" />
            <Skeleton className="mb-2 h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )

  if (inline) return body

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex h-14 flex-none items-center gap-3 border-b px-[18px]"
        style={{ borderColor: 'var(--border)' }}
      >
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="ml-auto h-7 w-20 rounded-md" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 pt-1.5">
        <div className="mx-auto max-w-[760px]">{body}</div>
      </div>
    </div>
  )
}
