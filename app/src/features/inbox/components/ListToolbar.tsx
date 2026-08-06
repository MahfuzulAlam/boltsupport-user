import { ArrowUpDown, Columns2, Rows3, SlidersHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Tag, User } from '@/types'
import {
  EMPTY_FILTER,
  filterCount,
  type ListFilter,
  type ListSort,
} from '../hooks/use-conversation-list'
import type { Density } from '../hooks/use-list-density'

interface ListToolbarProps {
  title: string
  total: number
  sort: ListSort
  onSortChange: (sort: ListSort) => void
  filter: ListFilter
  onFilterChange: (filter: ListFilter) => void
  /** Everyone who can hold a conversation, for the assignee axis. */
  users: User[]
  tags: Tag[]
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

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
]

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
]

/** Add or remove, keeping the result sorted so the query key does not depend on click order. */
function toggle<T extends string>(chosen: T[], value: string): T[] {
  const next = chosen.includes(value as T)
    ? chosen.filter((item) => item !== value)
    : [...chosen, value as T]
  return [...next].sort()
}

function FilterSection({
  label,
  options,
  chosen,
  onToggle,
}: {
  label: string
  options: { value: string; label: string }[]
  chosen: string[]
  onToggle: (value: string) => void
}) {
  return (
    <>
      <DropdownMenuLabel className="eyebrow">{label}</DropdownMenuLabel>
      {options.map((option) => (
        <DropdownMenuCheckboxItem
          key={option.value}
          checked={chosen.includes(option.value)}
          // The menu stays open: choosing one facet is rarely the whole thought, and reopening it
          // four times to build one filter is the kind of friction that stops people filtering.
          onSelect={(event) => {
            event.preventDefault()
          }}
          onCheckedChange={() => {
            onToggle(option.value)
          }}
        >
          {option.label}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  )
}

export function ListToolbar({
  title,
  total,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  users,
  tags,
  density,
  onDensityToggle,
  splitView,
  onSplitViewToggle,
}: ListToolbarProps) {
  const active = filterCount(filter)

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
        {/*
         * Filter, which for a long time was a button that did nothing.
         *
         * Four axes in one menu rather than a row of separate dropdowns, because the question an
         * agent has is "what am I looking at" and the answer should be readable in one place. The
         * count on the button is there so a filtered queue can never be mistaken for an empty one.
         */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              // The badge next to the word reads as "Filter2" if it is left to the name
              // calculation, so the count is spelled out instead.
              aria-label={active === 0 ? 'Filter' : `Filter, ${String(active)} applied`}
              className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px]"
              style={
                active > 0
                  ? { borderColor: 'var(--brand)', color: 'var(--brand)' }
                  : { borderColor: 'var(--border)' }
              }
            >
              <SlidersHorizontal className="size-3.5" />
              Filter
              {active > 0 ? (
                <span
                  aria-hidden="true"
                  className="flex size-[18px] items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{ background: 'var(--brand)', color: 'hsl(0 0% 100%)' }}
                >
                  {active}
                </span>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[420px] w-[250px] overflow-y-auto">
            <FilterSection
              label="Status"
              options={STATUS_OPTIONS}
              chosen={filter.status}
              onToggle={(value) => {
                onFilterChange({ ...filter, status: toggle(filter.status, value) })
              }}
            />
            <FilterSection
              label="Priority"
              options={PRIORITY_OPTIONS}
              chosen={filter.priority}
              onToggle={(value) => {
                onFilterChange({ ...filter, priority: toggle(filter.priority, value) })
              }}
            />
            <FilterSection
              label="Assignee"
              options={[
                { value: 'unassigned', label: 'Unassigned' },
                ...users.map((user) => ({ value: user.id, label: user.name })),
              ]}
              chosen={filter.assigneeId}
              onToggle={(value) => {
                onFilterChange({ ...filter, assigneeId: toggle(filter.assigneeId, value) })
              }}
            />
            {tags.length > 0 ? (
              <FilterSection
                label="Tag"
                options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
                chosen={filter.tagId}
                onToggle={(value) => {
                  onFilterChange({ ...filter, tagId: toggle(filter.tagId, value) })
                }}
              />
            ) : null}

            {active > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    onFilterChange(EMPTY_FILTER)
                  }}
                >
                  Clear {active} filter{active === 1 ? '' : 's'}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

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
