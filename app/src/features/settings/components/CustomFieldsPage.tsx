import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { CustomField } from '@/types'
import { createCustomField, fetchCustomFields } from '../api/settings'
import { CreateDialog } from './CreateDialog'
import { SettingsPage } from './SettingsPage'

const TYPE_LABEL: Record<CustomField['type'], string> = {
  text: 'Text',
  number: 'Number',
  dropdown: 'Dropdown',
  date: 'Date',
  checkbox: 'Checkbox',
}

export function CustomFieldsPage() {
  const fields = useQuery({
    queryKey: ['custom-fields'],
    queryFn: ({ signal }) => fetchCustomFields(signal),
  })

  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: (values: Record<string, string>) =>
      createCustomField({
        label: values['label'] ?? '',
        type: values['type'] ?? 'text',
        appliesTo: values['appliesTo'] ?? 'conversation',
      }),
    onSuccess: async (field) => {
      setCreating(false)
      await queryClient.invalidateQueries({ queryKey: ['custom-fields'] })
      toast(`${field.label} added`, {
        description:
          field.appliesTo === 'conversation'
            ? 'It shows in the conversation sidebar.'
            : 'It shows on the customer profile.',
      })
    },
  })

  const rows = fields.data ?? []
  const groups = [
    { key: 'conversation' as const, title: 'On a conversation' },
    { key: 'contact' as const, title: 'On a customer' },
  ]

  return (
    <SettingsPage
      title="Custom fields"
      description="Extra properties your team fills in, shown in the conversation sidebar."
    >
      <div className="mb-3 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setCreating(true)
          }}
        >
          New field
        </Button>
      </div>

      <CreateDialog
        open={creating}
        onOpenChange={setCreating}
        title="New field"
        description="A field starts optional. Dropdown choices are added once it exists."
        submitLabel="Create field"
        pending={create.isPending}
        onSubmit={(values) => {
          create.mutate(values)
        }}
        fields={[
          { name: 'label', label: 'Label', placeholder: 'Order number', required: true },
          {
            name: 'type',
            label: 'Type',
            options: (Object.keys(TYPE_LABEL) as CustomField['type'][]).map((key) => ({
              value: key,
              label: TYPE_LABEL[key],
            })),
          },
          {
            name: 'appliesTo',
            label: 'Shows on',
            options: [
              { value: 'conversation', label: 'A conversation' },
              { value: 'contact', label: 'A customer' },
            ],
          },
        ]}
      />

      {fields.isPending ? (
        <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
          Loading
        </p>
      ) : (
        groups.map((group) => {
          const inGroup = rows.filter((field) => field.appliesTo === group.key)
          return (
            <section key={group.key} className="mb-5">
              <h2 className="eyebrow mb-2">{group.title}</h2>
              {inGroup.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>
                  Nothing here yet.
                </p>
              ) : (
                <div
                  className="overflow-hidden rounded-lg border"
                  style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
                >
                  {inGroup.map((field) => (
                    <div
                      key={field.id}
                      className="flex flex-wrap items-center gap-3 border-b px-3 py-2.5 text-[13px] last:border-b-0"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span className="min-w-[140px] flex-1 truncate font-medium">
                        {field.label}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[12px]"
                        style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                      >
                        {TYPE_LABEL[field.type]}
                      </span>
                      {field.required ? (
                        <span
                          className="rounded px-1.5 py-0.5 text-[12px] font-medium"
                          style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
                        >
                          Required
                        </span>
                      ) : null}
                      {field.options.length > 0 ? (
                        <span style={{ color: 'var(--muted-foreground)' }}>
                          {field.options.join(', ')}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })
      )}
    </SettingsPage>
  )
}
