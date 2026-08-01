import { Sparkles } from 'lucide-react'

/**
 * The chat widget, drawn in CSS.
 *
 * No image asset, so it never goes stale against the real widget and costs nothing to ship. The
 * whole thing is decorative: a screen reader announcing this mock conversation would read it as
 * a real one.
 */
export function WidgetMock({ angled = true }: { angled?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-xl p-8"
      style={{ background: 'var(--brand-soft)' }}
    >
      <div
        className="w-[280px] overflow-hidden rounded-2xl border shadow-xl"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--card)',
          transform: angled ? 'rotate(-3deg) translateY(-6px)' : undefined,
        }}
      >
        <header
          className="flex items-center gap-2.5 px-3.5 py-3"
          style={{ background: 'var(--chrome)' }}
        >
          <span
            className="flex size-7 items-center justify-center rounded-lg"
            style={{ background: 'var(--ai)' }}
          >
            <Sparkles className="size-3.5" style={{ color: 'hsl(0 0% 100%)' }} />
          </span>
          <span className="text-[13px] font-medium" style={{ color: 'hsl(0 0% 100%)' }}>
            Bolt
          </span>
          <span className="ml-auto size-2 rounded-full" style={{ background: 'var(--success)' }} />
        </header>

        <div className="flex flex-col gap-2 px-3.5 py-4">
          <p
            className="max-w-[80%] self-end rounded-2xl rounded-br-md px-3 py-2 text-[12px]"
            style={{ background: 'var(--brand)', color: 'hsl(0 0% 100%)' }}
          >
            How do I add a teammate?
          </p>
          <p
            className="max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 text-[12px] leading-[1.5]"
            style={{ background: 'var(--muted)' }}
          >
            Open Manage, then Users, and choose Invite. You can give them access without billing
            permissions.
          </p>
          <p
            className="flex items-center gap-1 pl-1 text-[11px]"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <Sparkles className="size-2.5" style={{ color: 'var(--ai)' }} />
            From “Add a teammate without billing access”
          </p>
        </div>

        <div
          className="border-t px-3.5 py-2.5 text-[12px]"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
        >
          Ask a question…
        </div>
      </div>
    </div>
  )
}
