import { create } from 'zustand'

/**
 * Row density (FR-1.10). 72px is the default three line anatomy; 84px gives the same content
 * more breathing room. Persisted per user, because an agent picks one and keeps it.
 *
 * The list is virtualized, so this has to be a single fixed number per mode rather than
 * intrinsic height: the virtualizer measures from it to decide what to render.
 */
export type Density = 'default' | 'comfortable'

export const ROW_HEIGHT: Record<Density, number> = {
  default: 72,
  comfortable: 84,
}

const STORAGE_KEY = 'boltsupport.density'

function read(): Density {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'comfortable' ? 'comfortable' : 'default'
  } catch {
    return 'default'
  }
}

interface DensityState {
  density: Density
  rowHeight: number
  setDensity: (density: Density) => void
  toggleDensity: () => void
}

export const useListDensity = create<DensityState>()((set, get) => ({
  density: read(),
  rowHeight: ROW_HEIGHT[read()],
  setDensity: (density) => {
    try {
      localStorage.setItem(STORAGE_KEY, density)
    } catch {
      // A blocked write only means the choice does not survive a reload.
    }
    set({ density, rowHeight: ROW_HEIGHT[density] })
  },
  toggleDensity: () => {
    get().setDensity(get().density === 'default' ? 'comfortable' : 'default')
  },
}))
