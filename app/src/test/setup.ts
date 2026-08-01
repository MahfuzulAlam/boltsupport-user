import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '@/mocks/server'
import { setMockLatency } from '@/mocks/handlers'
import { resetDb } from '@/mocks/db'

// Tests should not pay the artificial latency that exists to exercise loading states.
setMockLatency(0)

// `error` rather than `bypass`: a request the mock does not know about is almost always a typo
// in a URL, and failing loudly beats a silent real network call in CI.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  // Handlers mutate the store, so rebuild it between tests to keep them independent.
  resetDb()
})

afterAll(() => {
  server.close()
})

// jsdom implements neither of these, and the shell reads both on mount.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

/**
 * jsdom has no layout, so it ships no `scrollTo` on an element.
 *
 * Anything that pins itself to the newest row calls it from a rAF, which lands after the test has
 * already moved on: the throw surfaces as an unhandled error and fails the whole run even though
 * every assertion passed. A no-op is honest here, since there is nothing to scroll.
 */
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {}
}

/**
 * jsdom has no ResizeObserver. A no-op stub is not enough: TanStack Virtual learns its viewport
 * height through one, and with a silent stub it measures zero and renders no rows at all. This
 * reports the element's rect once on observe, which is what a virtualized list needs to work in
 * a test.
 */
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    #callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.#callback = callback
    }

    observe(target: Element) {
      this.#callback(
        [{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry],
        this,
      )
    }

    unobserve() {}
    disconnect() {}
  }
}
