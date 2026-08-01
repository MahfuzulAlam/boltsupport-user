import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Sparkles } from 'lucide-react'
import { useReportRange } from '../hooks/use-report-range'

/**
 * Chart wrappers.
 *
 * Recharts is configured once here rather than per report: the axis styling, the tick density,
 * and the tooltip are chrome, and six reports each setting their own is how one ends up with a
 * different grey. The colours come from the token sheet through CSS variables, so dark mode
 * needs nothing extra.
 */

const AXIS = {
  stroke: 'var(--muted-foreground)',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
}

const TOOLTIP_STYLE = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
}

/** Dates are stored as ISO; the axis wants something a human reads at a glance. */
function shortDate(value: unknown): string {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime())
    ? text
    : parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export interface SeriesPoint {
  date: string
  value: number
  previous?: number
}

export function VolumeBarChart({ data, label }: { data: SeriesPoint[]; label: string }) {
  const compare = useReportRange((state) => state.compare)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
        {compare ? (
          <Bar
            dataKey="previous"
            name="Previous period"
            fill="var(--muted)"
            radius={[3, 3, 0, 0]}
          />
        ) : null}
        <Bar dataKey="value" name={label} fill="var(--brand)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TrendLineChart({ data, label }: { data: SeriesPoint[]; label: string }) {
  const compare = useReportRange((state) => state.compare)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
        {compare ? (
          <Line
            type="monotone"
            dataKey="previous"
            name="Previous period"
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
          />
        ) : null}
        <Line
          type="monotone"
          dataKey="value"
          name={label}
          stroke="var(--brand)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function CompareAreaChart({ data, label }: { data: SeriesPoint[]; label: string }) {
  const compare = useReportRange((state) => state.compare)
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="area-current" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
        {compare ? (
          <Area
            type="monotone"
            dataKey="previous"
            name="Previous period"
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            fill="none"
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="value"
          name={label}
          stroke="var(--brand)"
          strokeWidth={2}
          fill="url(#area-current)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export interface DonutSlice {
  name: string
  value: number
  color: string
}

export function DonutChart({ data }: { data: DonutSlice[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={2}>
          {data.map((slice) => (
            <Cell key={slice.name} fill={slice.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export interface StackedPoint {
  date: string
  email: number
  chat: number
  messaging: number
  social: number
}

/** Channel colours. Violet is reserved for AI output, so no channel gets it. */
const STACK_COLORS = {
  email: 'var(--brand)',
  chat: 'var(--info)',
  messaging: 'var(--success)',
  social: 'var(--warning)',
} as const

export function ChannelStackChart({ data }: { data: StackedPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        {(['email', 'chat', 'messaging', 'social'] as const).map((key, index, all) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="channels"
            fill={STACK_COLORS[key]}
            radius={index === all.length - 1 ? [3, 3, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** A ring gauge for a single percentage. Used for the three happiness figures. */
export function RingGauge({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: string
}) {
  const data = [
    { name: label, value, color },
    { name: 'rest', value: Math.max(0, 100 - value), color: 'var(--muted)' },
  ]
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={48}
            outerRadius={64}
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[20px] font-medium">{value}%</span>
        <span className="text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
          {label}
        </span>
      </div>
    </div>
  )
}

export interface ActualPredictedPoint {
  date: string
  actual: number
  predicted: number
}

/**
 * The legend for a chart that mixes a measured series with a predicted one.
 *
 * The predicted entry carries the sparkle, because AI-5 does not let the violet travel alone and
 * because a dash pattern is a weak way to say "this number is a guess" next to one that is not.
 */
function ActualPredictedLegend() {
  return (
    <div className="flex items-center justify-center gap-4 text-[13px]">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full" style={{ background: 'var(--brand)' }} />
        Actual
      </span>
      <span className="flex items-center gap-1.5" style={{ color: 'var(--ai)' }}>
        <Sparkles className="size-3" aria-hidden="true" />
        Predicted
      </span>
    </div>
  )
}

/**
 * Actual against predicted, on one axis.
 *
 * Lives here rather than in the report so it shares the axis and the date formatting with every
 * other chart: the first version of this drew raw ISO dates while its neighbours drew "2 Jul".
 */
export function ActualVsPredictedChart({ data }: { data: ActualPredictedPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={shortDate} />
        <Legend content={<ActualPredictedLegend />} />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke="var(--brand)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="predicted"
          name="Predicted"
          stroke="var(--ai)"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
