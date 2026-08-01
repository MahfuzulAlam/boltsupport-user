import { Link } from 'react-router-dom'
import { formatDistanceToNowStrict } from 'date-fns'
import { Mail, UserRound } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { safeHref, EXTERNAL_LINK_ATTRS } from '@/lib/url'
import type { Contact, Conversation } from '@/types'
import { AiSummaryPanel, PredictedSatisfactionPanel } from '@/features/ai'
import { SidebarCard } from './SidebarCard'

interface ConversationSidebarProps {
  conversation: Conversation
  contact: Contact | undefined
  otherConversations: Conversation[]
  aiEnabled: boolean
  messageCount: number
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-[13px]">
      <span style={{ color: 'var(--muted-foreground)' }}>{label}</span>
      <span className="truncate text-right">{value}</span>
    </div>
  )
}

/**
 * The right rail: who this is, what else they have asked, and what the app knows about them.
 *
 * Each panel is its own bordered card so the boundaries are visible at a glance rather than
 * inferred from a hairline. The AI summary and predicted satisfaction stay pinned on top in their
 * own violet treatment (FR-4.1), because AI output is deliberately not styled like the customer
 * context underneath it.
 */
export function ConversationSidebar({
  conversation,
  contact,
  otherConversations,
  aiEnabled,
  messageCount,
}: ConversationSidebarProps) {
  const website = safeHref(
    contact?.website === undefined ? undefined : `https://${contact.website}`,
  )

  return (
    <aside
      aria-label="Customer and AI panels"
      className="w-[326px] flex-none overflow-y-auto border-l p-3.5"
      style={{ borderColor: 'var(--border)', background: 'var(--app)' }}
    >
      {/* Pinned above everything else: the first thing an agent should see (FR-4.1). */}
      <AiSummaryPanel
        conversation={conversation}
        aiEnabled={aiEnabled}
        messageCount={messageCount}
      />

      {aiEnabled ? (
        <PredictedSatisfactionPanel prediction={conversation.ai?.predictedSatisfaction} />
      ) : null}

      <section
        className="mb-3 rounded-lg border p-3.5"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
        aria-label="Customer"
      >
        <Avatar className="mb-2.5 size-11">
          <AvatarFallback
            className="text-[15px] font-medium"
            style={{ background: 'var(--brand)', color: 'hsl(0 0% 100%)' }}
          >
            {conversation.contact.name
              .split(' ')
              .map((part) => part.charAt(0))
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <p className="truncate text-[16px] font-semibold" title={conversation.contact.name}>
          {conversation.contact.name}
        </p>
        <a
          href={`mailto:${conversation.contact.email}`}
          className="block truncate text-[13px]"
          style={{ color: 'var(--brand)' }}
        >
          {conversation.contact.email}
        </a>
        {website !== undefined ? (
          <a
            href={website}
            {...EXTERNAL_LINK_ATTRS}
            className="mt-0.5 block truncate text-[13px] font-medium"
          >
            {contact?.website}
          </a>
        ) : null}
      </section>

      <SidebarCard
        title="Conversations"
        meta={otherConversations.length === 0 ? undefined : otherConversations.length}
      >
        {otherConversations.length === 0 ? (
          <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            This is their first conversation with you.
          </p>
        ) : (
          <ul className="flex flex-col">
            {otherConversations.map((other) => (
              <li key={other.id}>
                <Link
                  to={`/inbox/${other.inboxId}/${other.status === 'closed' ? 'closed' : 'assigned'}/${other.id}`}
                  className="flex items-start gap-2 rounded-md px-1.5 py-1.5 hover:bg-[color:var(--hover)]"
                >
                  <Mail
                    className="mt-0.5 size-3.5 shrink-0"
                    style={{ color: 'var(--muted-foreground)' }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]">{other.subject}</span>
                    <span className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                      <span className="capitalize">{other.status}</span> ·{' '}
                      {formatDistanceToNowStrict(new Date(other.updatedAt), { addSuffix: true })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SidebarCard>

      <SidebarCard title="Customer information">
        {contact === undefined ? (
          <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Loading
          </p>
        ) : (
          <>
            <Link
              to={`/customers/${contact.id}`}
              className="mb-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px] font-medium hover:bg-[color:var(--hover)]"
              style={{ color: 'var(--brand)' }}
            >
              <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{contact.name}</span>
            </Link>
            {contact.plan !== undefined ? <PropertyRow label="Plan" value={contact.plan} /> : null}
            <PropertyRow
              label="Last seen"
              value={formatDistanceToNowStrict(new Date(contact.lastSeen), { addSuffix: true })}
            />
            {Object.entries(contact.properties).map(([label, value]) => (
              <PropertyRow key={label} label={label} value={String(value)} />
            ))}
          </>
        )}
      </SidebarCard>

      <SidebarCard title="Billing" defaultOpen={false}>
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          App panels connect from Manage then Integrations.
        </p>
      </SidebarCard>
    </aside>
  )
}
