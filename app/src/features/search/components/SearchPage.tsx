import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, MessageSquare, SearchIcon, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/EmptyState'
import { useDebounce } from '@/hooks/use-debounce'
import { fetchTags, fetchUsers, useInboxes } from '@/features/inbox'
import { cn } from '@/lib/utils'
import { fetchSearch, type SearchHit } from '../api/search'
import { FilterChip, type ChipOption } from './FilterChip'
import { Highlight } from './Highlight'

type Kind = SearchHit['kind']

const TABS: { kind: Kind; label: string; icon: typeof MessageSquare }[] = [
  { kind: 'conversation', label: 'Conversations', icon: MessageSquare },
  { kind: 'contact', label: 'Contacts', icon: User },
  { kind: 'article', label: 'Docs', icon: BookOpen },
]

const ANY = 'any'

const STATUS_OPTIONS: ChipOption[] = [
  { value: ANY, label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
]

const DATE_OPTIONS: ChipOption[] = [
  { value: ANY, label: 'Any time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
]

/**
 * Global search.
 *
 * The query lives in the URL so a result set can be shared or reopened; the chips are local,
 * because a half-built filter is not worth a history entry.
 */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)
  const debounced = useDebounce(query, 250)

  const [tab, setTab] = useState<Kind>('conversation')
  const [inboxId, setInboxId] = useState(ANY)
  const [status, setStatus] = useState(ANY)
  const [assigneeId, setAssigneeId] = useState(ANY)
  const [tagId, setTagId] = useState(ANY)
  /**
   * The date chip stores the cutoff it meant when it was chosen, rather than recomputing it on
   * every render. "Last 24 hours" is answered once, at the moment it is asked.
   */
  const [date, setDate] = useState({ days: ANY, cutoff: 0 })
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLInputElement>(null)

  // A search page whose field is not focused makes you click before you can type.
  useEffect(() => {
    fieldRef.current?.focus()
  }, [])

  // Keep the address bar in step with what is actually being searched.
  useEffect(() => {
    if (debounced === urlQuery) return
    setParams(debounced === '' ? {} : { q: debounced }, { replace: true })
  }, [debounced, urlQuery, setParams])

  const results = useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => fetchSearch(debounced, signal),
    enabled: debounced.trim() !== '',
  })

  const inboxes = useInboxes()
  const users = useQuery({ queryKey: ['users'], queryFn: ({ signal }) => fetchUsers(signal) })
  const tags = useQuery({ queryKey: ['tags'], queryFn: ({ signal }) => fetchTags(signal) })

  const hits = useMemo(() => results.data ?? [], [results.data])

  const filtered = useMemo(
    () =>
      hits.filter((hit) => {
        if (hit.kind !== tab) return false
        if (inboxId !== ANY && hit.inboxId !== inboxId) return false
        if (status !== ANY && hit.status !== status) return false
        if (assigneeId !== ANY && hit.assigneeId !== assigneeId) return false
        if (tagId !== ANY && !(hit.tagIds ?? []).includes(tagId)) return false
        if (date.cutoff !== 0 && Date.parse(hit.updatedAt ?? '') < date.cutoff) return false
        return true
      }),
    [hits, tab, inboxId, status, assigneeId, tagId, date.cutoff],
  )

  const counts = useMemo(
    () => ({
      conversation: hits.filter((hit) => hit.kind === 'conversation').length,
      contact: hits.filter((hit) => hit.kind === 'contact').length,
      article: hits.filter((hit) => hit.kind === 'article').length,
    }),
    [hits],
  )

  const active = Math.min(cursor, Math.max(filtered.length - 1, 0))

  /**
   * Roving focus over the results.
   *
   * The rows are real links, so Enter, middle click, and Command click all behave the way an
   * agent expects without this component reimplementing any of them. All the arrow keys do is
   * decide which link is focused.
   */
  const focusRow = (index: number) => {
    setCursor(index)
    listRef.current?.querySelectorAll<HTMLAnchorElement>('[role="option"]')[index]?.focus()
  }

  const onFieldKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' && filtered.length > 0) {
      event.preventDefault()
      focusRow(0)
    }
  }

  const onListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusRow(Math.min(active + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (active === 0) {
        setCursor(0)
        fieldRef.current?.focus()
      } else {
        focusRow(active - 1)
      }
    }
  }

  const chipsForTab = tab === 'conversation'

  return (
    <div className="mx-auto w-full max-w-[860px] px-6 pt-6 pb-10">
      <Input
        ref={fieldRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setCursor(0)
        }}
        onKeyDown={onFieldKeyDown}
        placeholder="Search conversations, customers, and docs"
        aria-label="Search"
        className="mb-3 h-11 text-[15px]"
      />

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {chipsForTab ? (
          <>
            <FilterChip
              label="In"
              value={inboxId}
              onChange={setInboxId}
              options={[
                { value: ANY, label: 'Any inbox' },
                ...(inboxes.data ?? []).map((inbox) => ({ value: inbox.id, label: inbox.name })),
              ]}
            />
            <FilterChip
              label="Status"
              value={status}
              onChange={setStatus}
              options={STATUS_OPTIONS}
            />
            <FilterChip
              label="Assignee"
              value={assigneeId}
              onChange={setAssigneeId}
              options={[
                { value: ANY, label: 'Anyone' },
                ...(users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
              ]}
            />
            <FilterChip
              label="Tag"
              value={tagId}
              onChange={setTagId}
              options={[
                { value: ANY, label: 'Any tag' },
                ...(tags.data ?? []).map((tag) => ({ value: tag.id, label: tag.name })),
              ]}
            />
          </>
        ) : null}
        <FilterChip
          label="Date"
          value={date.days}
          onChange={(value) => {
            setDate({
              days: value,
              cutoff: value === ANY ? 0 : Date.now() - Number(value) * 24 * 60 * 60 * 1000,
            })
          }}
          options={DATE_OPTIONS}
        />
      </div>

      <div
        className="mb-3 flex items-center gap-1 border-b"
        style={{ borderColor: 'var(--border)' }}
        role="tablist"
        aria-label="Result type"
      >
        {TABS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={tab === kind}
            onClick={() => {
              setTab(kind)
              setCursor(0)
            }}
            className="relative flex h-9 items-center gap-1.5 px-3 text-[13px] font-medium"
            style={{ color: tab === kind ? 'var(--brand)' : 'var(--muted-foreground)' }}
          >
            {label}
            <span className="font-mono text-[12px]">{counts[kind]}</span>
            {tab === kind ? (
              <span
                className="absolute right-0 -bottom-px left-0 h-[2px]"
                style={{ background: 'var(--brand)' }}
              />
            ) : null}
          </button>
        ))}
      </div>

      {debounced.trim() === '' ? (
        <EmptyState
          icon={SearchIcon}
          title="Search everything"
          description="Conversations by subject or number, customers by name or email, and every article in your docs."
        />
      ) : results.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Searching
        </p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matches"
          description={
            counts[tab] === 0
              ? `Nothing here matched “${debounced}”. Try another tab.`
              : 'Your filters ruled out every match. Clear one to widen the search.'
          }
        />
      ) : (
        <div
          ref={listRef}
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
          role="listbox"
          aria-label="Search results"
        >
          {filtered.map((hit, index) => (
            <Link
              key={`${hit.kind}-${hit.id}`}
              to={hit.href}
              role="option"
              aria-selected={index === active}
              tabIndex={index === active ? 0 : -1}
              onFocus={() => {
                setCursor(index)
              }}
              onKeyDown={onListKeyDown}
              className={cn(
                'flex w-full items-center gap-3 border-b px-3 py-2.5 text-left text-[13px] last:border-b-0 hover:bg-[color:var(--hover)]',
                index === active && 'bg-[color:var(--hover)]',
              )}
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  <Highlight text={hit.title} query={debounced} />
                </span>
                <span
                  className="block truncate text-[12px]"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  <Highlight text={hit.subtitle} query={debounced} />
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
