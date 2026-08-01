interface ListColumnsProps {
  allSelected: boolean
  onToggleAll: () => void
}

/** The 38px column strip. Widths mirror ConversationRow exactly, or the columns drift apart. */
export function ListColumns({ allSelected, onToggleAll }: ListColumnsProps) {
  return (
    <div
      className="flex h-[38px] flex-none items-center gap-3 border-b pr-[18px] pl-[15px] text-[13px]"
      style={{
        background: 'var(--muted)',
        borderColor: 'var(--border)',
        color: 'var(--muted-foreground)',
      }}
    >
      <span className="w-[3px] shrink-0" aria-hidden="true" />
      <input
        type="checkbox"
        checked={allSelected}
        onChange={onToggleAll}
        aria-label={allSelected ? 'Clear selection' : 'Select all loaded conversations'}
        className="size-4 shrink-0 accent-[color:var(--brand)]"
      />
      <span className="w-[172px] shrink-0">Customer</span>
      <span className="min-w-0 flex-1">Conversation</span>
      <span className="w-[82px] shrink-0 text-right">SLA</span>
      <span className="w-5 shrink-0 text-center" title="Predicted satisfaction">
        CSAT
      </span>
      <span className="w-[70px] shrink-0 text-right">Number</span>
      <span className="w-[74px] shrink-0 text-right">Waiting</span>
    </div>
  )
}
