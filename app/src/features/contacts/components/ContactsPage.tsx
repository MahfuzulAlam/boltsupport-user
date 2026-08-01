import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { formatDistanceToNowStrict } from 'date-fns'
import { Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { useDebounce } from '@/hooks/use-debounce'
import { fetchContacts } from '../api/contacts'

const ROW_HEIGHT = 48

/**
 * Contacts.
 *
 * Virtualized for the same reason the queue is (NFR-1.4): a workspace that has been running for
 * a year has tens of thousands of these, and the table has to stay responsive while someone
 * types into the filter.
 */
export function ContactsPage() {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 200)
  const scrollRef = useRef<HTMLDivElement>(null)

  const contacts = useQuery({
    queryKey: ['contacts', debounced],
    queryFn: ({ signal }) => fetchContacts(debounced, signal),
  })

  const rows = contacts.data?.items ?? []
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  return (
    <div className="mx-auto flex h-full w-full max-w-[960px] flex-col px-6 pt-6 pb-4">
      <PageHeader
        title="Customers"
        description={
          contacts.data === undefined
            ? undefined
            : `${String(contacts.data.total)} people have contacted you.`
        }
        actions={
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            placeholder="Search by name or email"
            aria-label="Search contacts"
            className="w-[260px]"
          />
        }
      />

      {contacts.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search === '' ? 'No customers yet' : 'Nobody matches that'}
          description={
            search === ''
              ? 'People who write in will appear here automatically.'
              : 'Try part of a name or an email address.'
          }
        />
      ) : (
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <div
            className="flex h-9 flex-none items-center gap-3 border-b px-3 text-[13px]"
            style={{
              background: 'var(--muted)',
              borderColor: 'var(--border)',
              color: 'var(--muted-foreground)',
            }}
          >
            <span className="min-w-0 flex-1">Name</span>
            <span className="w-[220px] shrink-0">Email</span>
            <span className="w-[110px] shrink-0 text-right">Conversations</span>
            <span className="w-[100px] shrink-0 text-right">Last seen</span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
              {virtualizer.getVirtualItems().map((item) => {
                const contact = rows[item.index]
                if (contact === undefined) return null
                return (
                  <div
                    key={contact.id}
                    className="absolute top-0 left-0 w-full"
                    style={{ transform: `translateY(${String(item.start)}px)` }}
                  >
                    <Link
                      to={`/customers/${contact.id}`}
                      className="flex items-center gap-3 border-b px-3 text-[13px] hover:bg-[color:var(--hover)]"
                      style={{ height: ROW_HEIGHT, borderColor: 'var(--border)' }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{contact.name}</span>
                        {contact.plan !== undefined ? (
                          <span
                            className="block truncate text-[12px]"
                            style={{ color: 'var(--muted-foreground)' }}
                          >
                            {contact.plan}
                          </span>
                        ) : null}
                      </span>
                      <span
                        className="w-[220px] shrink-0 truncate"
                        style={{ color: 'var(--muted-foreground)' }}
                      >
                        {contact.email}
                      </span>
                      <span className="w-[110px] shrink-0 text-right font-mono">
                        {contact.conversationsCount}
                      </span>
                      <span
                        className="w-[100px] shrink-0 text-right font-mono"
                        style={{ color: 'var(--muted-foreground)' }}
                        title={new Date(contact.lastSeen).toLocaleString()}
                      >
                        {formatDistanceToNowStrict(new Date(contact.lastSeen))}
                      </span>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
