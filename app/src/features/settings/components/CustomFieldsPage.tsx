import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import type { CustomField } from '@/types'
import { fetchCustomFields } from '../api/settings'
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
        <Button size="sm">New field</Button>
      </div>

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
