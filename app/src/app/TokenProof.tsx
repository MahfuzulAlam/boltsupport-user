import { cn } from '@/lib/utils'

/**
 * Living proof sheet for the design system. Every token, face, and density anchor renders
 * here so a regression is visible rather than theoretical, and so both themes get exercised
 * on every change. Step 3 replaces the app entry with the router; this page stays reachable.
 */

interface Swatch {
  name: string
  token: string
  note?: string
}

const SURFACES: Swatch[] = [
  { name: 'background', token: 'var(--background)', note: 'cards, dialogs, top of stack' },
  { name: 'app', token: 'var(--app)', note: 'page ground behind cards' },
  { name: 'card', token: 'var(--card)' },
  { name: 'muted', token: 'var(--muted)', note: 'column headers, chips' },
  { name: 'hover', token: 'var(--hover)' },
  { name: 'border', token: 'var(--border)', note: '1px rules, never shadows' },
]

const INK: Swatch[] = [
  { name: 'foreground', token: 'var(--foreground)' },
  { name: 'muted-foreground', token: 'var(--muted-foreground)' },
  { name: 'primary', token: 'var(--primary)', note: 'ink buttons' },
  { name: 'primary-foreground', token: 'var(--primary-foreground)' },
]

const ACCENTS: Swatch[] = [
  { name: 'brand', token: 'var(--brand)', note: 'links, active nav, focus, the bolt' },
  { name: 'brand-soft', token: 'var(--brand-soft)', note: 'row selection' },
  { name: 'ai', token: 'var(--ai)', note: 'AI content ONLY' },
  { name: 'ai-soft', token: 'var(--ai-soft)', note: 'AI surfaces, 7% alpha' },
  { name: 'note', token: 'var(--note)', note: 'internal note fill' },
  { name: 'warning', token: 'var(--warning)', note: 'note rail and border' },
]

const CHROME: Swatch[] = [
  { name: 'chrome', token: 'var(--chrome)', note: 'the dark top bar' },
  { name: 'chrome-foreground', token: 'var(--chrome-foreground)' },
  { name: 'chrome-hover', token: 'var(--chrome-hover)' },
  { name: 'chrome-line', token: 'var(--chrome-line)' },
]

const SEMANTIC: Swatch[] = [
  { name: 'success', token: 'var(--success)' },
  { name: 'success-soft', token: 'var(--success-soft)' },
  { name: 'warning-strong', token: 'var(--warning-strong)', note: 'at risk SLA text' },
  { name: 'danger', token: 'var(--danger)', note: 'Needs Attention, SLA breach' },
  { name: 'danger-soft', token: 'var(--danger-soft)' },
  { name: 'info', token: 'var(--info)' },
]

const RAILS = [
  { origin: 'Customer message', token: 'var(--border)', tint: 'transparent' },
  { origin: 'Agent reply', token: 'var(--brand)', tint: 'transparent' },
  { origin: 'Internal note', token: 'var(--warning)', tint: 'var(--note)' },
  { origin: 'AI generated', token: 'var(--ai)', tint: 'var(--ai-soft)' },
]

const TYPE_SCALE = [
  { size: 36, label: '36px serif, the two zero state headlines only', face: 'var(--font-serif)' },
  { size: 26, label: '26px mono, KPI figures', face: 'var(--font-mono)' },
  { size: 24, label: '24px, page h1, tracking -0.015em' },
  { size: 20, label: '20px, list titles' },
  { size: 18, label: '18px, conversation title' },
  { size: 16, label: '16px, card titles' },
  { size: 15, label: '15px, nav, list subjects, message bodies' },
  { size: 14, label: '14px, base UI text' },
  { size: 13, label: '13px, secondary text, table cells' },
  { size: 12, label: '12px, uppercase labels, status chips' },
  { size: 11, label: '11px, kbd chips and micro labels. Hard floor.' },
]

const DENSITY = [
  { name: 'Top bar', value: '56px' },
  { name: 'Sidebar row', value: '40px' },
  { name: 'Conversation row', value: '72px default / 84px comfortable' },
  { name: 'Sidebar width', value: '244px' },
  { name: 'Right rail', value: '326px' },
  { name: 'Reading pane', value: '760px max' },
]

function SwatchGrid({ title, swatches }: { title: string; swatches: Swatch[] }) {
  return (
    <section className="mb-8">
      <h3 className="eyebrow mb-3">{title}</h3>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {swatches.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-3"
          >
            <div
              className="size-10 flex-none rounded-md border border-[color:var(--border)]"
              style={{ background: s.token }}
            />
            <div className="min-w-0">
              <div className="font-mono text-[13px] font-medium">{s.name}</div>
              {s.note ? (
                <div className="truncate text-[12px] text-[color:var(--muted-foreground)]">
                  {s.note}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="eyebrow mb-3">{title}</h3>
      <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4">
        {children}
      </div>
    </section>
  )
}

export function TokenProof() {
  return (
    <main className="mx-auto w-full max-w-[960px] px-6 pt-6 pb-12">
      <h1 className="mb-1 text-[24px] font-semibold tracking-[-0.015em]">Design tokens</h1>
      <p className="mb-8 text-[15px] text-[color:var(--muted-foreground)]">
        Every color, face, and density anchor the product uses. Toggle the theme to check both.
      </p>

      <SwatchGrid title="Surfaces" swatches={SURFACES} />
      <SwatchGrid title="Ink" swatches={INK} />
      <SwatchGrid title="Accents, three meanings, no overlap" swatches={ACCENTS} />
      <SwatchGrid title="Top bar chrome" swatches={CHROME} />
      <SwatchGrid title="Semantic" swatches={SEMANTIC} />

      <Panel title="Provenance rail, the signature element">
        <div className="flex flex-col gap-2">
          {RAILS.map((r) => (
            <div
              key={r.origin}
              className="flex gap-3 rounded-md p-2"
              style={{ background: r.tint }}
            >
              <div
                className="w-[3px] flex-none rounded-[2px]"
                style={{ background: r.token }}
                aria-hidden="true"
              />
              <span className="text-[15px]">{r.origin}</span>
            </div>
          ))}
          <p className="mt-1 text-[13px] text-[color:var(--muted-foreground)]">
            System events carry no rail. They render as a compact centered line.
          </p>
        </div>
      </Panel>

      <Panel title="Typography">
        <div className="flex flex-col gap-3">
          {TYPE_SCALE.map((t) => (
            <div key={t.size} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span
                style={{ fontSize: `${String(t.size)}px`, fontFamily: t.face }}
                className={cn(t.size >= 20 && 'tracking-[-0.015em]')}
              >
                Respond on time
              </span>
              <span className="text-[13px] text-[color:var(--muted-foreground)]">{t.label}</span>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2 border-t border-[color:var(--border)] pt-3">
            <span className="text-[13px]">Keyboard chips:</span>
            <kbd className="kbd">⌘K</kbd>
            <kbd className="kbd">J</kbd>
            <kbd className="kbd">?</kbd>
            <span className="ml-2 font-mono text-[13px] text-[color:var(--muted-foreground)]">
              mono means a machine produced it: 48213 · 82% · 1h 12m
            </span>
          </div>
        </div>
      </Panel>

      <Panel title="Density anchors">
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-6 gap-y-2">
          {DENSITY.map((d) => (
            <div key={d.name} className="flex justify-between gap-4 text-[13px]">
              <dt className="text-[color:var(--muted-foreground)]">{d.name}</dt>
              <dd className="font-mono">{d.value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel title="Radii and elevation">
        <div className="flex flex-wrap items-end gap-4">
          {[
            { r: 'var(--radius-sm)', l: '4px chips, kbd' },
            { r: 'var(--radius-md)', l: '6px buttons, inputs' },
            { r: 'var(--radius-lg)', l: '8px cards, dialogs' },
            { r: 'var(--radius-pill)', l: '14px pills' },
          ].map((x) => (
            <div key={x.l} className="flex flex-col items-center gap-2">
              <div
                className="size-14 border border-[color:var(--border)] bg-[color:var(--muted)]"
                style={{ borderRadius: x.r }}
              />
              <span className="text-[12px] text-[color:var(--muted-foreground)]">{x.l}</span>
            </div>
          ))}
          <div className="flex flex-col items-center gap-2">
            <div
              className="size-14 rounded-lg bg-[color:var(--card)]"
              style={{ boxShadow: 'var(--shadow-md)' }}
            />
            <span className="text-[12px] text-[color:var(--muted-foreground)]">
              shadow-md, popovers only
            </span>
          </div>
        </div>
      </Panel>
    </main>
  )
}
