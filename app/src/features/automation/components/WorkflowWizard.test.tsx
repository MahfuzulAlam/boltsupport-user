import { beforeEach, describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { getDb } from '@/mocks/db'
import { useWorkflowDraft } from '../hooks/use-workflow-draft'
import { WorkflowWizard } from './WorkflowWizard'

function renderWizard() {
  return renderWithProviders(
    <Routes>
      <Route path="/inbox/:inboxId/settings/workflows/new" element={<WorkflowWizard />} />
    </Routes>,
    { route: '/inbox/in1/settings/workflows/new' },
  )
}

beforeEach(() => {
  useWorkflowDraft.getState().reset()
})

describe('the workflow wizard', () => {
  it('will not advance past a step whose answer is missing', async () => {
    const user = userEvent.setup()
    renderWizard()

    // Step 1 needs a name. Blocking here is what keeps the summary from being the first place
    // you learn something is wrong.
    expect(screen.getByRole('button', { name: /next step/i })).toBeDisabled()

    await user.type(screen.getByLabelText('Name'), 'Route refunds')
    await user.click(screen.getByRole('button', { name: /next step/i }))
    expect(await screen.findByLabelText('Match mode')).toBeInTheDocument()
  })

  it('keeps the draft when you step backwards', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText('Name'), 'Route refunds')
    await user.click(screen.getByRole('button', { name: /next step/i }))
    await user.click(await screen.findByRole('button', { name: /^back$/i }))

    expect(screen.getByLabelText('Name')).toHaveValue('Route refunds')
  })

  it('reads the finished rule back as a sentence, with names rather than ids', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.type(screen.getByLabelText('Name'), 'Route refunds')
    await user.click(screen.getByRole('button', { name: /next step/i }))

    await user.selectOptions(await screen.findByLabelText('Condition field'), 'tag')
    await waitFor(() => {
      expect(screen.getByLabelText('Condition value')).toBeInTheDocument()
    })
    await user.selectOptions(screen.getByLabelText('Condition value'), 't1')
    await user.click(screen.getByRole('button', { name: /next step/i }))

    await user.click(await screen.findByRole('button', { name: /add action/i }))
    await user.selectOptions(screen.getByLabelText('Action 1 type'), 'assign')
    await user.selectOptions(screen.getByLabelText('Action 1 value'), 'u2')
    await user.click(screen.getByRole('button', { name: /next step/i }))

    const summary = await screen.findByLabelText('Rule summary')
    expect(summary).toHaveTextContent(/Tag is billing/i)
    // Every action carries its value. "Assign to" with nothing after it is a rule the summary
    // cannot actually describe, which is what an uncommitted picker default produces.
    expect(summary).toHaveTextContent(/Assign to \w+/i)
    expect(summary).not.toHaveTextContent(/\bt1\b/)
    expect(summary).not.toHaveTextContent(/\bu2\b/)
  })

  it('creates the workflow the summary described', async () => {
    const user = userEvent.setup()
    renderWizard()
    const before = getDb().workflows.length

    await user.type(screen.getByLabelText('Name'), 'Tag every billing thread')
    await user.click(screen.getByRole('button', { name: /next step/i }))
    await user.type(await screen.findByLabelText('Condition value'), 'invoice')
    await user.click(screen.getByRole('button', { name: /next step/i }))
    await user.click(await screen.findByRole('button', { name: /add action/i }))
    await user.click(screen.getByRole('button', { name: /next step/i }))
    await user.click(await screen.findByRole('button', { name: /create workflow/i }))

    await waitFor(() => {
      expect(getDb().workflows.length).toBe(before + 1)
    })
    const created = getDb().workflows.at(-1)
    expect(created?.name).toBe('Tag every billing thread')
    expect(created?.inboxId).toBe('in1')
    expect(created?.actions).toHaveLength(1)
  })

  it('warns on the summary when a rule would fire on everything', async () => {
    const user = userEvent.setup()
    renderWizard()

    // A manual workflow may legitimately have no conditions, which is exactly the case that
    // needs saying out loud before it is switched on.
    await user.type(screen.getByLabelText('Name'), 'Escalate')
    await user.selectOptions(screen.getByLabelText('Workflow type'), 'manual')
    await user.click(screen.getByRole('button', { name: /next step/i }))
    await user.click(await screen.findByRole('button', { name: /remove condition/i }))
    await user.click(screen.getByRole('button', { name: /next step/i }))
    await user.click(await screen.findByRole('button', { name: /add action/i }))
    await user.click(screen.getByRole('button', { name: /next step/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/every conversation in the inbox/i)
    expect(screen.getByLabelText('Rule summary')).toHaveTextContent(/every conversation/i)
  })
})
