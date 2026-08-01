/**
 * The signature element: a 3px left rail whose colour encodes who produced the content.
 *
 * This exists because the single worst failure in a helpdesk is an agent mistaking an internal
 * note for a customer reply, or AI text for human text. One device, used consistently, is
 * readable at a glance and at any zoom. Introducing a second left-rail treatment anywhere would
 * dilute the only signal that prevents it.
 *
 * Implemented as a sibling element rather than a border so it can keep a fixed height and round
 * its own corners independently of the block it marks.
 */
export type Provenance = 'customer' | 'agent' | 'note' | 'ai'

export const RAIL_COLOR: Record<Provenance, string> = {
  customer: 'var(--border)',
  agent: 'var(--brand)',
  // The note rail is --warning while the note fill is --note. Two ambers, deliberately: the
  // fill has to stay light enough to read body text on.
  note: 'var(--warning)',
  ai: 'var(--ai)',
}

interface ProvenanceRailProps {
  provenance: Provenance
  /** Rounds the leading edge when the rail sits flush inside a card. */
  flush?: boolean
}

export function ProvenanceRail({ provenance, flush = false }: ProvenanceRailProps) {
  return (
    <div
      aria-hidden="true"
      // Identifiable without depending on how it happens to be styled, which keeps the origin
      // assertable in tests and inspectable in the browser.
      data-provenance={provenance}
      className="w-[3px] flex-none"
      style={{
        background: RAIL_COLOR[provenance],
        borderRadius: flush ? '8px 0 0 8px' : '2px',
      }}
    />
  )
}
