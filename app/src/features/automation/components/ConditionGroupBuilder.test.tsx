import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import type { Tag } from '@/types'
import { ConditionGroupBuilder, type ConditionSet } from './ConditionGroupBuilder'
import { hasNegativeOrTrap } from './condition-fields'

const TAGS: Tag[] = [
  { id: 't1', name: 'billing', color: '#2563eb' },
  { id: 't2', name: 'refund', color: '#dc2626' },
]

/** The builder is controlled, so tests drive it through a tiny stateful host. */
function Host({
  initial,
  onChange,
}: {
  initial: ConditionSet
  onChange?: (s: ConditionSet) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <ConditionGroupBuilder
      value={value}
      tags={TAGS}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

const oneCondition: ConditionSet = {
  match: 'all',
  conditions: [{ id: 'c1', field: 'subject', operator: 'contains', value: 'refund' }],
  groups: [],
}

describe('the condition builder', () => {
  it('warns about a negative OR, which matches almost everything', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Host
        initial={{
          match: 'any',
          conditions: [
            { id: 'c1', field: 'status', operator: 'is_not', value: 'closed' },
            { id: 'c2', field: 'status', operator: 'is_not', value: 'spam' },
          ],
          groups: [],
        }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/match almost everything/i)

    // Switching to ALL makes the rule mean what the author intended, so the warning clears.
    await user.selectOptions(screen.getByLabelText('Match mode'), 'all')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('does not cry wolf on a single negative, or on a negative AND', () => {
    expect(hasNegativeOrTrap('any', [])).toBe(false)
    expect(
      hasNegativeOrTrap('any', [{ id: 'a', field: 'status', operator: 'is_not', value: 'closed' }]),
    ).toBe(false)
    expect(
      hasNegativeOrTrap('all', [
        { id: 'a', field: 'status', operator: 'is_not', value: 'closed' },
        { id: 'b', field: 'status', operator: 'is_not', value: 'spam' },
      ]),
    ).toBe(false)
  })

  it('keeps the operator list honest when the field changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Host initial={oneCondition} />)

    expect(screen.getByLabelText('Condition operator')).toHaveValue('contains')

    // "contains" is meaningless on a status, so switching fields must not strand it.
    await user.selectOptions(screen.getByLabelText('Condition field'), 'status')
    const operator = screen.getByLabelText('Condition operator')
    expect(operator).toHaveValue('is')
    expect(within(operator).queryByText('contains')).not.toBeInTheDocument()
  })

  it('commits the default it displays when a field becomes a picker', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<Host initial={oneCondition} onChange={onChange} />)

    await user.selectOptions(screen.getByLabelText('Condition field'), 'status')

    // Showing "Active" while storing an empty string produces a rule that saves something other
    // than what it displays, and the wizard then refuses to advance for no visible reason.
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        conditions: [expect.objectContaining({ field: 'status', value: 'active' })],
      }),
    )
    expect(screen.getByLabelText('Condition value')).toHaveValue('active')
  })

  it('refuses to remove the last condition, because an empty rule matches everything', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Host initial={oneCondition} />)

    expect(screen.getByRole('button', { name: /remove condition/i })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /add condition/i }))
    const removes = screen.getAllByRole('button', { name: /remove condition/i })
    expect(removes).toHaveLength(2)
    expect(removes[0]).toBeEnabled()
  })

  it('nests exactly one level deep and no further', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Host initial={oneCondition} />)

    await user.click(screen.getByRole('button', { name: /add group/i }))
    expect(screen.getByText(/nested group/i)).toBeInTheDocument()

    // A second "Add group" would turn this into a parenthesis editor, which the lead persona
    // explicitly does not want.
    expect(screen.queryByRole('button', { name: /add group/i })).not.toBeInTheDocument()
  })

  it('reports every edit back to its owner', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithProviders(<Host initial={oneCondition} onChange={onChange} />)

    await user.selectOptions(screen.getByLabelText('Match mode'), 'any')
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ match: 'any' }))
  })
})
