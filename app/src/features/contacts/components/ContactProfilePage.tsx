import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNowStrict } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'
import { EXTERNAL_LINK_ATTRS, safeHref } from '@/lib/url'
import { SatisfactionDot } from '@/features/ai'
import { fetchContact, fetchContactHistory } from '../api/contacts'

/**
 * One customer: who they are, what the workspace knows about them, and everything they have
 * asked. The history is the point, since it is what an agent checks before answering "again?".
 */
export function ContactProfilePage() {
  const contactId = useParams()['contactId'] ?? ''

  const contact = useQuery({
    queryKey: ['contact', contactId],
    queryFn: ({ signal }) => fetchContact(contactId, signal),
  })

  const history = useQuery({
    queryKey: ['contact-history', contactId],
    queryFn: ({ signal }) => fetchContactHistory(contactId, signal),
    enabled: contact.isSuccess,
  })

  if (contact.isPending) {
    return (
      <div className="mx-auto w-full max-w-[960px] px-6 pt-6">
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      </div>
    )
  }

  if (contact.isError) {
    return (
      <div className="mx-auto w-full max-w-[960px] px-6 pt-6">
        <PageHeader title="Customer" />
        <p className="text-[15px]">
          {contact.error instanceof ApiError
            ? contact.error.userMessage
            : 'That customer could not be loaded.'}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/customers">Back to customers</Link>
        </Button>
      </div>
    )
  }

  const record = contact.data
  const website = safeHref(record.website === undefined ? undefined : `https://${record.website}`)
  const threads = history.data?.items ?? []

  return (
    <div className="mx-auto w-full max-w-[960px] px-6 pt-6 pb-10">
      <PageHeader title={record.name} description={record.email} />

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <aside
          className="h-fit rounded-lg border p-4"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback
                className="text-[15px] font-medium"
                style={{ background: 'var(--brand)', color: 'hsl(0 0% 100%)' }}
              >
                {record.name
                  .split(' ')
                  .map((part) => part.charAt(0))
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{record.name}</p>
              <a
                href={`mailto:${record.email}`}
                className="block truncate text-[13px]"
                style={{ color: 'var(--brand)' }}
              >
                {record.email}
              </a>
            </div>
          </div>

          {website !== undefined ? (
            <a
              href={website}
              {...EXTERNAL_LINK_ATTRS}
              className="mb-3 block truncate text-[13px]"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {record.website}
            </a>
          ) : null}

          <h2 className="eyebrow mt-4 mb-2">Customer information</h2>
          <dl>
            {record.plan !== undefined ? (
              <div className="flex justify-between gap-3 py-1 text-[13px]">
                <dt style={{ color: 'var(--muted-foreground)' }}>Plan</dt>
                <dd>{record.plan}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3 py-1 text-[13px]">
              <dt style={{ color: 'var(--muted-foreground)' }}>Last seen</dt>
              <dd>{formatDistanceToNowStrict(new Date(record.lastSeen), { addSuffix: true })}</dd>
            </div>
            {Object.entries(record.properties)
              // Plan and the website already have their own rows above; a custom property that
              // repeats one of them reads as two sources of truth for the same fact.
              .filter(([label]) => !['Plan', 'Company'].includes(label))
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-1 text-[13px]">
                  <dt style={{ color: 'var(--muted-foreground)' }}>{label}</dt>
                  <dd className="truncate text-right">{String(value)}</dd>
                </div>
              ))}
          </dl>
        </aside>

        <section>
          <h2 className="mb-2 text-[16px] font-semibold tracking-[-0.01em]">
            Conversations{' '}
            <span className="font-mono text-[14px]" style={{ color: 'var(--muted-foreground)' }}>
              {threads.length}
            </span>
          </h2>

          {history.isPending ? (
            <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              Loading
            </p>
          ) : threads.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              This is their first conversation with you.
            </p>
          ) : (
            <div
              className="overflow-hidden rounded-lg border"
              style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
            >
              {threads.map((thread) => (
                <Link
                  key={thread.id}
                  to={`/inbox/${thread.inboxId}/${thread.status === 'closed' ? 'closed' : 'assigned'}/${thread.id}`}
                  className="flex items-center gap-3 border-b px-3 py-2.5 text-[13px] last:border-b-0 hover:bg-[color:var(--hover)]"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{thread.subject}</span>
                  <SatisfactionDot prediction={thread.ai?.predictedSatisfaction} />
                  <span
                    className="w-[70px] shrink-0 capitalize"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {thread.status}
                  </span>
                  <span className="w-[64px] shrink-0 text-right font-mono">#{thread.number}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
