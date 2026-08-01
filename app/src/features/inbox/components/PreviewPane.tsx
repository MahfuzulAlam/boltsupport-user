import { Link } from 'react-router-dom'
import { SlaBadge } from '@/features/automation'
import { SatisfactionDot } from '@/features/ai'
import type { Conversation } from '@/types'

interface PreviewPaneProps {
  conversation: Conversation | undefined
  inboxId: string
  folder: string
}

/**
 * Split view preview.
 *
 * Shows only fields the domain model already holds as plain text. Message bodies are untrusted
 * HTML and render exclusively through the sandboxed iframe in the conversation view (NFR-2.1),
 * so they deliberately do not appear here.
 */
export function PreviewPane({ conversation, inboxId, folder }: PreviewPaneProps) {
  return (
    <aside
      aria-label="Preview"
      className="flex w-[412px] flex-none flex-col border-l"
      style={{ borderColor: 'var(--border)', background: 'var(--background)' }}
    >
      {conversation === undefined ? (
        <div
          className="flex flex-1 items-center justify-center px-6 text-center text-[13px]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Select a conversation to preview it here.
        </div>
      ) : (
        <>
          <div
            className="flex h-12 flex-none items-center gap-2 border-b px-4"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
              {conversation.subject}
            </span>
            <span className="font-mono text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
              #{conversation.number}
            </span>
            <Link
              to={`/inbox/${inboxId}/${folder}/${conversation.id}`}
              className="flex h-7 items-center rounded-md px-2.5 text-[13px] font-medium"
              style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            >
              Open
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <p className="eyebrow mb-3">Read only preview</p>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <SlaBadge sla={conversation.sla} variant="full" />
              <SatisfactionDot prediction={conversation.ai?.predictedSatisfaction} />
              {conversation.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded px-1.5 text-[12px]"
                  style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                >
                  {tag.name}
                </span>
              ))}
            </div>

            <div className="flex gap-3.5">
              <div
                className="w-[3px] flex-none rounded-[2px]"
                style={{ background: 'var(--border)' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{conversation.contact.name}</p>
                <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  {conversation.contact.email}
                </p>
                <p className="mt-2 text-[15px] leading-[1.6] text-pretty">{conversation.preview}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
