import { create } from 'zustand'

export interface RangePreset {
  days: number
  label: string
}

export const RANGE_PRESETS: RangePreset[] = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
  { days: 365, label: 'Last 12 months' },
]

interface RangeState {
  days: number
  compare: boolean
  setDays: (days: number) => void
  setCompare: (compare: boolean) => void
}

/**
 * The date range, shared across every report.
 *
 * Held outside the tree because moving between reports should not reset it: a lead comparing
 * last quarter's email volume against last quarter's happiness would otherwise re-pick the range
 * on every tab.
 */
export const useReportRange = create<RangeState>((set) => ({
  days: 30,
  compare: true,
  setDays: (days) => {
    set({ days })
  },
  setCompare: (compare) => {
    set({ compare })
  },
}))
