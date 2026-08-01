import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNowStrict } from 'date-fns'
import { fetchConversations, fetchInboxes } from '@/features/inbox'
import { ApiError, apiRequest } from '@/lib/api-client'
import { z } from 'zod'
import type { Folder } from '@/types'

/**
 * Step 2 proof sheet: seed data reaching the screen through the real pipeline
 * (MSW handler, api-client, zod parse, TanStack Query) rather than an import.
 *
 * It also exercises the failure path on demand, because a schema guard nobody has watched
 * fail is a guard nobody knows works.
 */

const FOLDERS: Folder[] = ['unassigned', 'mine', 'assigned', 'needs-attention', 'closed', 'spam']

function StateBox({ tone, children }: { tone: 'muted' | 'danger'; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border p-4 text-[13px]"
      style={{
        borderColor: tone === 'danger' ? 'var(--danger)' : 'var(--border)',
        background: tone === 'danger' ? 'var(--danger-soft)' : 'var(--muted)',
      }}
    >
      {children}
    </div>
  )
}

function InboxCounts() {
  const { data, isPending, error } = useQuery({
    queryKey: ['inboxes'],
    queryFn: ({ signal }) => fetchInboxes(signal),
  })

  if (isPending) return <StateBox tone="muted">Loading inboxes…</StateBox>
  if (error) return <StateBox tone="danger">{(error as ApiError).userMessage}</StateBox>

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
      {data.map((inbox) => (
        <div
          key={inbox.id}
          className="rounded-lg border p-3"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <div className="text-[15px] font-semibold">{inbox.name}</div>
          <div className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            {inbox.email}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 text-[13px]">
            {Object.entries(inbox.counts).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <dt style={{ color: 'var(--muted-foreground)' }}>{key}</dt>
                <dd
                  className="font-mono"
                  style={{
                    color:
                      key === 'needsAttention' && value > 0 ? 'var(--danger-strong)' : undefined,
                    fontWeight: key === 'needsAttention' && value > 0 ? 600 : undefined,
                  }}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

function ConversationList() {
  const [folder, setFolder] = useState<Folder>('unassigned')
  const { data, isPending, error } = useQuery({
    queryKey: ['conversations', folder],
    queryFn: ({ signal }) => fetchConversations({ folder, limit: 8 }, signal),
  })

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {FOLDERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFolder(f)
            }}
            className="h-7 rounded-md border px-3 text-[13px]"
            style={{
              borderColor: folder === f ? 'var(--brand)' : 'var(--border)',
              background: folder === f ? 'var(--brand-soft)' : 'transparent',
              color: folder === f ? 'var(--brand)' : 'inherit',
              fontWeight: folder === f ? 600 : 400,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {isPending ? (
        <StateBox tone="muted">Loading conversations…</StateBox>
      ) : error ? (
        <StateBox tone="danger">{(error as ApiError).userMessage}</StateBox>
      ) : data.items.length === 0 ? (
        <StateBox tone="muted">Nothing in this folder.</StateBox>
      ) : (
        <div
          className="overflow-hidden rounded-lg border"
          style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        >
          <div
            className="px-3 py-2 text-[13px]"
            style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
          >
            <span className="font-mono">{data.total}</span> in {folder}, showing{' '}
            <span className="font-mono">{data.items.length}</span>
          </div>
          {data.items.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 border-t px-3 py-2 text-[13px]"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="w-[150px] shrink-0 truncate">{c.contact.name}</span>
              <span
                className="min-w-0 flex-1 truncate"
                style={{ fontWeight: c.unread ? 600 : 400 }}
              >
                {c.subject}
              </span>
              {c.sla?.breached === true ? (
                <span
                  className="rounded px-1.5 font-mono text-[12px]"
                  style={{ background: 'var(--danger)', color: 'white' }}
                >
                  Breached
                </span>
              ) : null}
              <span className="w-[64px] shrink-0 text-right font-mono">{c.number}</span>
              <span
                className="w-[80px] shrink-0 text-right font-mono"
                style={{ color: 'var(--muted-foreground)' }}
                title={c.waitingSince}
              >
                {formatDistanceToNowStrict(new Date(c.waitingSince))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SchemaGuardProof() {
  const [result, setResult] = useState<string | null>(null)

  async function probe() {
    const schema = z.object({ items: z.array(z.object({ id: z.string() })), total: z.number() })
    try {
      await apiRequest('/dev/malformed-conversations', schema)
      setResult('No error, which would mean the guard is not working.')
    } catch (error) {
      const apiError = error as ApiError
      setResult(
        `${apiError.kind} error. Bad fields: ${apiError.issues?.join(', ') ?? 'none'}. Shown to the user as: "${apiError.userMessage}"`,
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
        Calls an endpoint that returns a deliberately wrong shape. The response is rejected at the
        boundary and never reaches state.
      </p>
      <button
        type="button"
        onClick={() => void probe()}
        className="h-8 w-fit rounded-md px-3 text-[13px] font-medium"
        style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
      >
        Request a malformed response
      </button>
      {result !== null ? <StateBox tone="danger">{result}</StateBox> : null}
    </div>
  )
}

export function DataProof() {
  return (
    <main className="mx-auto w-full max-w-[960px] px-6 pt-6 pb-12">
      <h1 className="mb-1 text-[24px] font-semibold tracking-[-0.015em]">Mock API</h1>
      <p className="mb-8 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
        Seed data reaching the screen through MSW, the api client, a zod parse, and TanStack Query.
      </p>

      <h3 className="eyebrow mb-3">Inboxes</h3>
      <div className="mb-8">
        <InboxCounts />
      </div>

      <h3 className="eyebrow mb-3">Computed folders</h3>
      <div className="mb-8">
        <ConversationList />
      </div>

      <h3 className="eyebrow mb-3">The schema guard</h3>
      <SchemaGuardProof />
    </main>
  )
}
