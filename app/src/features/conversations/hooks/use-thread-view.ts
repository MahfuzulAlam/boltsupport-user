import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThreadViewState {
  /** Folds the sender and visibility lines out of every message header. */
  hideDetails: boolean
  /** Wide drops the customer rail and gives the thread the whole pane. */
  wide: boolean
  toggleHideDetails: () => void
  toggleWide: () => void
}

/**
 * How an agent likes to read a thread.
 *
 * Persisted, because both of these are working habits rather than per-conversation choices.
 * Someone who hides the details to skim a long thread wants them hidden on the next one too,
 * and a preference that resets on every navigation is a preference nobody uses twice.
 */
export const useThreadView = create<ThreadViewState>()(
  persist(
    (set) => ({
      hideDetails: false,
      wide: false,
      toggleHideDetails: () => {
        set((state) => ({ hideDetails: !state.hideDetails }))
      },
      toggleWide: () => {
        set((state) => ({ wide: !state.wide }))
      },
    }),
    { name: 'boltsupport.thread-view' },
  ),
)
