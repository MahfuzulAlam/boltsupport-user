import { StubPage } from '@/components/StubPage'

/**
 * Routes that are registered but not built yet.
 *
 * Declaring them as data rather than as forty near identical files means the whole route map
 * exists from step 3, every nav item resolves to a real page header, and the remaining work is
 * visible in one place. Each entry is replaced by its real component in the listed step.
 */
export interface StubRoute {
  path: string
  title: string
  description: string
  step: number
  covers?: string[]
}

export const STUB_ROUTES: StubRoute[] = []

export function renderStub(route: StubRoute) {
  return (
    <StubPage
      title={route.title}
      description={route.description}
      step={route.step}
      {...(route.covers ? { covers: route.covers } : {})}
    />
  )
}
