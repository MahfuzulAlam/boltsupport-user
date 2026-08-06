import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initTheme } from '@/hooks/use-theme'
import { initAccent } from '@/lib/theme'
import { App } from './App'

/*
 * Resolve the theme before the first paint so the page never flashes the wrong one.
 *
 * Mode first, then accent: each accent has a light and a dark value, so it can only be resolved
 * once the document knows which one it is in.
 */
initTheme()
initAccent()

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root is missing from index.html')
}

/**
 * The mock API must be listening before anything renders, otherwise the first queries race the
 * service worker registration and fail for no reason a user could act on.
 *
 * It is behind a flag because MSW is ~167KB gzipped, which would eat most of the 250KB initial
 * budget in NFR-1.6 on its own. While there is no backend it defaults on, and the budget is
 * measured against the app chunk; set VITE_ENABLE_MOCK_API=false to build against a real API
 * and the chunk is never fetched.
 */
const MOCK_API_ENABLED = import.meta.env['VITE_ENABLE_MOCK_API'] !== 'false'

async function bootstrap(root: HTMLElement): Promise<void> {
  if (MOCK_API_ENABLED) {
    const { startMockApi } = await import('@/mocks/browser')
    await startMockApi()
  }

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap(container)
