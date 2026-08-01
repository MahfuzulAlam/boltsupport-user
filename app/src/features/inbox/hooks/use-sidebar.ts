import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
}

/**
 * Whether the folder rail is collapsed.
 *
 * Persisted, because this is a workspace habit rather than a per-screen choice: someone who
 * collapses it to read a long thread wants it collapsed on the next thread too, and having it
 * spring back open on every navigation is the reason people stop using the control.
 */
export const useSidebar = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => {
        set((state) => ({ collapsed: !state.collapsed }))
      },
      setCollapsed: (collapsed) => {
        set({ collapsed })
      },
    }),
    { name: 'boltsupport.sidebar' },
  ),
)
