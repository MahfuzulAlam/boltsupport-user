import { Check, Circle, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'

const BENEFITS = [
  'Prioritize important conversations',
  'Improve response times',
  'Measure performance over time',
]

/** Faded rows behind the floating card. Content is decorative, so the whole block is hidden. */
const GHOST_ROWS = [
  { target: 'Urgent', company: 'Northwind', chip: '15m' },
  { target: 'High', company: 'Cobalt Systems', chip: '1h' },
  { target: 'Normal', company: 'Meridian', chip: '4h' },
  { target: 'Low', company: 'Halcyon Labs', chip: '8h' },
]

/**
 * The preview panel.
 *
 * The design specification asks for a violet tint here. AI-5 reserves violet for AI output and
 * nothing else, and an SLA preview is not AI output, so this uses the brand tint instead. The
 * newer PRD wins the conflict, and a structural test enforces it.
 */
function Illustration() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden min-h-[320px] overflow-hidden rounded-xl p-6 lg:block"
      style={{ background: 'var(--brand-soft)' }}
    >
      <div className="opacity-40">
        <div
          className="mb-2 flex items-center gap-3 text-[12px] font-medium"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <span className="w-[80px]">Target</span>
          <span className="flex-1">Company</span>
          <span>Respond in</span>
        </div>
        {GHOST_ROWS.map((row) => (
          <div
            key={row.target}
            className="flex items-center gap-3 border-t py-2.5 text-[13px]"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="w-[80px]">{row.target}</span>
            <span className="flex-1">{row.company}</span>
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[12px]"
              style={{ background: 'var(--muted)' }}
            >
              {row.chip}
            </span>
          </div>
        ))}
      </div>

      <div
        className="absolute right-8 bottom-8 left-8 rounded-lg border p-4 shadow-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      >
        <p className="mb-3 text-[15px] font-semibold">Enterprise SLA</p>

        <div className="flex items-center gap-2.5 py-1.5">
          <Timer className="size-4 shrink-0" style={{ color: 'var(--warning-strong)' }} />
          <span className="flex-1 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Respond in
          </span>
          <span className="font-mono text-[13px] font-medium">12m 24s</span>
        </div>

        <div className="flex items-center gap-2.5 py-1.5">
          <Circle
            className="size-4 shrink-0"
            style={{ color: 'var(--muted-foreground)', strokeDasharray: '3 3' }}
          />
          <span className="flex-1 text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
            Resolve in
          </span>
          <span className="font-mono text-[13px] font-medium">2d 16h</span>
        </div>
      </div>
    </div>
  )
}

/**
 * The SLA zero state.
 *
 * Native SLA management is the clearest gap in the incumbent (G2 in the PRD), so this screen is
 * persuading rather than working. It is one of exactly two places allowed the serif display
 * face, and the preview is built in CSS so there is no image asset to go stale.
 */
export function SlaZeroState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2">
      <div>
        <h1
          className="mb-3 text-[36px] leading-[1.1] tracking-[-0.01em]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Respond on time, every time
        </h1>
        <p className="mb-5 max-w-[46ch] text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
          Set response and resolution time goals so your team knows what is urgent.
        </p>

        <ul className="mb-6 flex flex-col gap-2">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2.5 text-[15px]">
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--success-soft)' }}
              >
                <Check
                  className="size-3"
                  style={{ color: 'var(--success-strong)' }}
                  aria-hidden="true"
                />
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        {/* One action. "Learn more" used to sit beside it and go nowhere, and the list of what
            an SLA gets you is right above, so it was pointing at what the reader had just read. */}
        <Button size="lg" onClick={onCreate}>
          Create SLA policy
        </Button>
      </div>

      <Illustration />
    </div>
  )
}
