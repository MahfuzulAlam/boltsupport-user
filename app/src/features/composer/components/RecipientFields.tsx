import { CornerUpLeft, CornerUpRight, Lock } from 'lucide-react'
import { shortcutDisplay } from '@/lib/shortcuts'
import type { ComposerDraft } from '../hooks/use-composer-draft'

interface RecipientFieldsProps {
  draft: ComposerDraft
  recipient: string
  onUpdate: (patch: Partial<ComposerDraft>) => void
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-0.5 text-[14px]">
      <span className="flex shrink-0 items-center" style={{ color: 'var(--muted-foreground)' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

/**
 * Who this is going to, in one line.
 *
 * The leading icon carries the mode now that the tab row is gone: a reply arrow for a reply, a
 * forward arrow for a forward, a padlock for a note. Three shapes an agent reads without
 * stopping, in the place they are already looking before they start typing.
 */
export function RecipientFields({ draft, recipient, onUpdate }: RecipientFieldsProps) {
  if (draft.mode === 'note') {
    return (
      <Row label={<Lock className="size-4" aria-hidden="true" />}>
        <input
          className="min-w-0 flex-1 bg-transparent outline-none"
          placeholder="Mention a teammate with @"
          aria-label="Mention teammates"
        />
        <span className="shrink-0 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Internal only
        </span>
      </Row>
    )
  }

  /*
   * Forwarding types its own recipient.
   *
   * A reply goes to the customer whatever happens, which is why that row is a chip rather than
   * a field. A forward goes to somebody the app has never heard of, so the address has to be
   * typed, and it stays empty until it is: prefilling it with the customer would turn one
   * mistaken Enter into a message the customer was never meant to see.
   */
  if (draft.mode === 'forward') {
    return (
      <Row label={<CornerUpRight className="size-4" aria-hidden="true" />}>
        <input
          type="email"
          value={draft.to}
          onChange={(event) => {
            onUpdate({ to: event.target.value })
          }}
          className="min-w-0 flex-1 bg-transparent outline-none"
          placeholder="Who should receive this?"
          aria-label="Forward to"
          autoComplete="off"
        />
        <span className="shrink-0 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Not the customer
        </span>
      </Row>
    )
  }

  return (
    <>
      <Row label={<CornerUpLeft className="size-4" aria-hidden="true" />}>
        <span className="min-w-0 truncate">{recipient}</span>
        <span className="ml-auto flex shrink-0 gap-2 text-[13px]">
          {!draft.showCc ? (
            <button
              type="button"
              onClick={() => {
                onUpdate({ showCc: true })
              }}
              title={`Show Cc (${shortcutDisplay('showCc')})`}
              style={{ color: 'var(--brand)' }}
            >
              Cc
            </button>
          ) : null}
          {!draft.showBcc ? (
            <button
              type="button"
              onClick={() => {
                onUpdate({ showBcc: true })
              }}
              title={`Show Bcc (${shortcutDisplay('showBcc')})`}
              style={{ color: 'var(--brand)' }}
            >
              Bcc
            </button>
          ) : null}
        </span>
      </Row>

      {draft.showCc ? (
        <Row label="Cc">
          <input
            value={draft.cc}
            onChange={(event) => {
              onUpdate({ cc: event.target.value })
            }}
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder="Add people"
            aria-label="Cc"
          />
        </Row>
      ) : null}

      {draft.showBcc ? (
        <Row label="Bcc">
          <input
            value={draft.bcc}
            onChange={(event) => {
              onUpdate({ bcc: event.target.value })
            }}
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder="Add people"
            aria-label="Bcc"
          />
        </Row>
      ) : null}
    </>
  )
}
