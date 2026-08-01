import { create } from 'zustand'

/**
 * The demo sign in gate.
 *
 * A real deployment has no client side auth state at all: the session is an httpOnly cookie and
 * "signed in" means the session request succeeded. There is no backend here, so this flag exists
 * only to make the login screen reachable and the app genuinely behind it.
 *
 * It is a boolean, not a credential, so sessionStorage is appropriate. Nothing token shaped is
 * ever written here (NFR-2.5), and this whole module is deleted when a real API arrives.
 */
const DEMO_GATE_KEY = 'boltsupport.demo-gate'

function readGate(): boolean {
  try {
    return sessionStorage.getItem(DEMO_GATE_KEY) === 'open'
  } catch {
    return false
  }
}

function writeGate(open: boolean): void {
  try {
    if (open) sessionStorage.setItem(DEMO_GATE_KEY, 'open')
    else sessionStorage.removeItem(DEMO_GATE_KEY)
  } catch {
    // A blocked write just means the gate does not survive a reload.
  }
}

interface AuthState {
  isSignedIn: boolean
  signIn: () => void
  signOut: () => void
}

export const useAuth = create<AuthState>()((set) => ({
  isSignedIn: readGate(),
  signIn: () => {
    writeGate(true)
    set({ isSignedIn: true })
  },
  signOut: () => {
    writeGate(false)
    set({ isSignedIn: false })
  },
}))
