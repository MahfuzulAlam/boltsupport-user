import { useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useTheme } from '@/hooks/use-theme'
import { createQueryClient } from './query-client'
import { AppErrorBoundary } from './error-boundary'

/**
 * Everything the whole tree needs. The query client is created in state rather than at module
 * scope so a remount (or a test) gets a clean cache instead of inheriting the last one's.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  const theme = useTheme((s) => s.theme)

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster
            theme={theme}
            position="bottom-left"
            // Long enough to read and act on an Undo, which is the point of most of them.
            duration={6000}
            toastOptions={{ style: { fontFamily: 'var(--font-sans)' } }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}
