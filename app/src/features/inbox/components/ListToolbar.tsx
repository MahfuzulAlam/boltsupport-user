import { ArrowUpDown, Columns2, Rows3, SlidersHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ListSort } from '../hooks/use-conversation-list'
import type { Density } from '../hooks/use-list-density'

interface ListToolbarProps {
  title: string
  total: number
  sort: ListSort
  onSortChange: (sort: ListSort) => void
  density: Density
  onDensityToggle: () => void
  splitView: boolean
  onSplitViewToggle: () => void
}

const SORT_LABEL: Record<ListSort, string> = {
  waiting: 'Waiting longest',
  newest: 'Newest',
  oldest: 'Oldest',
  sla: 'SLA due soonest',
}

export function ListToolbar({
  title,
  total,
  sort,
  onSortChange,
  density,
  onDensityToggle,
  splitView,
  onSplitViewToggle,
}: ListToolbarProps) {
  return (
    <div
      className="flex h-14 flex-none items-center gap-2 border-b px-[18px]"
      style={{ borderColor: 'var(--border)' }}
    >
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>
      <span className="font-mono text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
        {total}
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px]"
          style={{ borderColor: 'var(--border)' }}
        >
          <SlidersHorizontal className="size-3.5" />
          Filter
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px]"
              style={{ borderColor: 'var(--border)' }}
            >
              <ArrowUpDown className="size-3.5" />
              {SORT_LABEL[sort]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {(Object.keys(SORT_LABEL) as ListSort[]).map((key) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={sort === key}
                onCheckedChange={() => {
                  onSortChange(key)
                }}
              >
                {SORT_LABEL[key]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={onDensityToggle}
          aria-pressed={density === 'comfortable'}
          title={
            density === 'comfortable'
              ? 'Switch to default density'
              : 'Switch to comfortable density'
          }
          aria-label="Row density"
          className="flex size-8 items-center justify-center rounded-md border"
          style={{
            borderColor: density === 'comfortable' ? 'var(--brand)' : 'var(--border)',
            background: density === 'comfortable' ? 'var(--brand-soft)' : undefined,
            color: density === 'comfortable' ? 'var(--brand)' : 'var(--muted-foreground)',
          }}
        >
          <Rows3 className="size-4" />
        </button>

        <button
          type="button"
          onClick={onSplitViewToggle}
          aria-pressed={splitView}
          aria-label="Split view"
          title={splitView ? 'Hide the preview pane' : 'Show the preview pane'}
          className="flex size-8 items-center justify-center rounded-md border"
          style={{
            borderColor: splitView ? 'var(--brand)' : 'var(--border)',
            background: splitView ? 'var(--brand-soft)' : undefined,
            color: splitView ? 'var(--brand)' : 'var(--muted-foreground)',
          }}
        >
          <Columns2 className="size-4" />
        </button>
      </div>
    </div>
  )
}
