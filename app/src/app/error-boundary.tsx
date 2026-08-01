import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'

interface FallbackProps {
  title: string
  message: string
  onRetry?: () => void
}

/** Every error state says what happened and offers a way forward. */
function ErrorFallback({ title, message, onRetry }: FallbackProps) {
  return (
    <div className="mx-auto w-full max-w-[560px] px-6 py-16 text-center" role="alert">
      <div
        className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg"
        style={{ background: 'var(--danger-soft)' }}
        aria-hidden="true"
      >
        <TriangleAlert className="size-6" style={{ color: 'var(--danger-strong)' }} />
      </div>
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>
      <p className="mt-1.5 text-[15px]" style={{ color: 'var(--muted-foreground)' }}>
        {message}
      </p>
      {onRetry !== undefined ? (
        <Button className="mt-5" onClick={onRetry}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Route level boundary. React Router renders this instead of the route when its loader or its
 * render throws, so one broken screen never takes the shell down with it.
 */
export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <ErrorFallback
        title="That page does not exist"
        message="The link may be out of date, or the conversation may have been moved."
        onRetry={() => void navigate('/')}
      />
    )
  }

  const message =
    error instanceof ApiError
      ? error.userMessage
      : 'Something on this screen failed. The rest of the app is still fine.'

  return (
    <ErrorFallback
      title="This screen could not load"
      message={message}
      onRetry={() => void navigate(0)}
    />
  )
}

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  error: Error | null
}

/**
 * Top level boundary for render errors outside the router's reach.
 *
 * It deliberately logs only the error, never component props or state, because those routinely
 * hold message bodies and PII (NFR-2.10).
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error.name, error.message, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <ErrorFallback
          title="BoltSupport hit an unexpected error"
          message="Reloading usually clears it. If it keeps happening, let us know what you were doing."
          onRetry={() => {
            window.location.reload()
          }}
        />
      )
    }
    return this.props.children
  }
}
