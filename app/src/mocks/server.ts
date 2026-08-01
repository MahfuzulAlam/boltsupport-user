import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** The Node equivalent of the browser worker, used by Vitest. */
export const server = setupServer(...handlers)
