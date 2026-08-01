import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * Starts the mock API. Called from main.tsx before the app renders so no request can race the
 * worker registration. Unhandled requests pass through, which keeps Vite's own dev traffic
 * (HMR, module loads, fonts) working normally.
 */
export async function startMockApi(): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}
