import { useEffect, useState } from 'react'

/** Delays a rapidly changing value. Used for search inputs so every keystroke is not a request. */
export function useDebounce<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value)
    }, delayMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [value, delayMs])

  return debounced
}
