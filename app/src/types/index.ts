/**
 * Shared domain types. Every schema here is the zod definition; the TypeScript type is
 * inferred from it, so the validator and the type can never disagree.
 *
 * Features import from `@/types`. Feature specific shapes (form values, view models) belong
 * in that feature's own `types.ts`, not here.
 */

export * from './common'
export * from './enums'
export * from './user'
export * from './tag'
export * from './contact'
export * from './inbox'
export * from './conversation'
export * from './message'
export * from './ai'
export * from './automation'
export * from './docs'
export * from './reports'
export * from './risk'
export * from './settings'
