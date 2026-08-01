import { useSyncExternalStore } from 'react'

/**
 * One shared clock for every live countdown on screen.
 *
 * A virtualized folder shows forty SLA badges at once, and giving each its own interval means
 * forty timers waking independently and forty separate renders per second. A single interval
 * with a subscriber set ticks once and lets React batch the result, which matters because this
 * screen has a 100ms interaction budget to protect.
 */
const subscribers = new Set<() => void>()
let timer: number | undefined
let now = Date.now()

function tick(): void {
  now = Date.now()
  for (const notify of subscribers) notify()
}

function subscribe(onStoreChange: () => void): () => void {
  subscribers.add(onStoreChange)
  if (timer === undefined) {
    // Align to the next whole second so every countdown flips together rather than drifting
    // against its neighbours.
    timer = window.setInterval(tick, 1000)
  }
  return () => {
    subscribers.delete(onStoreChange)
    if (subscribers.size === 0 && timer !== undefined) {
      window.clearInterval(timer)
      timer = undefined
    }
  }
}

function getSnapshot(): number {
  return now
}

/** Milliseconds since the epoch, refreshed once a second while anything is subscribed. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
