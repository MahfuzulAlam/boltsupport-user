import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/Select'

export interface CreateField {
  name: string
  label: string
  placeholder?: string
  /** A short line under the control, for anything the label cannot carry. */
  hint?: string
  /** Absent means a single line input. */
  options?: { value: string; label: string }[]
  multiline?: boolean
  /** Only required fields gate the submit button. */
  required?: boolean
}

interface CreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  fields: CreateField[]
  submitLabel: string
  pending?: boolean
  onSubmit: (values: Record<string, string>) => void
}

/**
 * The one create form, filled in per page.
 *
 * Five settings pages had a create button that did nothing, and writing five separate dialogs
 * would have meant five chances for the Enter key, the disabled state, or the reset-on-close to
 * behave slightly differently. The differences between these forms are their fields and their
 * wording, so those are what the caller passes and nothing else.
 */
export function CreateDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  submitLabel,
  pending = false,
  onSubmit,
}: CreateDialogProps) {
  const blank = () =>
    Object.fromEntries(fields.map((field) => [field.name, field.options?.[0]?.value ?? '']))

  const [values, setValues] = useState<Record<string, string>>(blank)

  /*
   * Cleared on open, not on close, and during render rather than in an effect.
   *
   * Wiping the fields as the dialog leaves means the text visibly empties during the close
   * animation, which reads as the form being discarded rather than submitted. Doing it here
   * instead of in an effect avoids the extra committed render an effect would cost, which is
   * long enough to show the previous values in a reopened dialog.
   */
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setValues(blank())
  }

  const value = (field: CreateField) => values[field.name] ?? ''

  const complete = fields
    .filter((field) => field.required === true)
    .every((field) => value(field).trim() !== '')

  const submit = () => {
    if (!complete || pending) return
    onSubmit(
      Object.fromEntries(Object.entries(values).map(([key, raw]) => [key, raw.trim()])),
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3.5">
          {fields.map((field) => (
            <div key={field.name}>
              <Label htmlFor={`create-${field.name}`} className="mb-1.5 text-[14px] font-medium">
                {field.label}
              </Label>

              {field.options !== undefined ? (
                <Select
                  value={value(field)}
                  onChange={(next) => {
                    setValues((current) => ({ ...current, [field.name]: next }))
                  }}
                  options={field.options}
                  aria-label={field.label}
                />
              ) : field.multiline === true ? (
                <textarea
                  id={`create-${field.name}`}
                  value={value(field)}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }}
                  placeholder={field.placeholder}
                  rows={4}
                  className="w-full rounded-md border px-3 py-2 text-[14px] outline-none"
                  style={{ borderColor: 'var(--input)', background: 'var(--background)' }}
                />
              ) : (
                <Input
                  id={`create-${field.name}`}
                  value={value(field)}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, [field.name]: event.target.value }))
                  }}
                  onKeyDown={(event) => {
                    // Enter submits from any single line field, which is where the hands already
                    // are. A textarea keeps Enter for what it is normally for.
                    if (event.key === 'Enter') submit()
                  }}
                  placeholder={field.placeholder}
                />
              )}

              {field.hint === undefined ? null : (
                <p className="mt-1 text-[12px]" style={{ color: 'var(--muted-foreground)' }}>
                  {field.hint}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button disabled={!complete || pending} onClick={submit}>
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
