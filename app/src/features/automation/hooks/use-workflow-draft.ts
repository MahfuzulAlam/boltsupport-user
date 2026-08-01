import { create } from 'zustand'
import type { Action, ActionType, Condition, ConditionGroup, MatchMode } from '@/types'
import { newCondition } from '../components/condition-fields'

export type WizardStep = 1 | 2 | 3 | 4

interface WorkflowDraftState {
  step: WizardStep
  name: string
  kind: 'automatic' | 'manual'
  match: MatchMode
  conditions: Condition[]
  groups: ConditionGroup[]
  actions: Action[]
  active: boolean

  setStep: (step: WizardStep) => void
  update: (patch: Partial<Omit<WorkflowDraftState, 'setStep' | 'update' | 'reset'>>) => void
  reset: () => void
}

function initial() {
  return {
    step: 1 as WizardStep,
    name: '',
    kind: 'automatic' as const,
    match: 'all' as MatchMode,
    conditions: [newCondition()],
    groups: [] as ConditionGroup[],
    actions: [] as Action[],
    active: true,
  }
}

/**
 * The wizard's draft, held outside the component tree.
 *
 * Four steps means four unmounts, and losing a half-built rule set on a back button is the kind
 * of thing that makes someone give up on automation entirely. Zustand keeps it alive between
 * steps without threading it through the router.
 */
export const useWorkflowDraft = create<WorkflowDraftState>((set) => ({
  ...initial(),
  setStep: (step) => {
    set({ step })
  },
  update: (patch) => {
    set(patch)
  },
  reset: () => {
    set(initial())
  },
}))

let actionCounter = 0

export function newAction(type: ActionType): Action {
  actionCounter += 1
  return { id: `draft-a${String(actionCounter)}`, type }
}

/** A step is only passable if what it collects is actually usable downstream. */
export function stepError(state: WorkflowDraftState, step: WizardStep): string | null {
  if (step === 1 && state.name.trim() === '') return 'Give the workflow a name.'
  if (step === 2) {
    const empty = [...state.conditions, ...state.groups.flatMap((g) => g.conditions)].some(
      (condition) => String(condition.value).trim() === '',
    )
    if (state.kind === 'automatic' && state.conditions.length === 0) {
      return 'An automatic workflow needs at least one condition.'
    }
    if (empty) return 'Every condition needs a value.'
  }
  if (step === 3 && state.actions.length === 0) return 'Add at least one action.'
  return null
}
