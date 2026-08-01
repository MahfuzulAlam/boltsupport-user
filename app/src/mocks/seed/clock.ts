/**
 * The instant the seed dataset is generated from.
 *
 * This is captured once at module load rather than hardcoded to a date. An earlier version
 * pinned it to the PRD's 31 July 2026, which made timestamps reproducible but broke every live
 * surface: SLA deadlines were generated relative to the frozen clock while the countdown badge
 * compares against the real one, so a conversation due "in 8 minutes" rendered as breached by
 * however long ago that date was. Relative times like "23m ago" were wrong the same way.
 *
 * Determinism comes from the seeded RNG below, which is what actually needs to be stable: which
 * conversations exist, their order, subjects, assignees, and tags. Timestamps hanging off the
 * real clock is the correct behaviour for a fixture that drives live countdowns.
 */
export const SEED_NOW = new Date()

/** Everything generated from randomness uses this, so a reload never reshuffles the queue. */
export const SEED_RANDOM_SEED = 20260731
