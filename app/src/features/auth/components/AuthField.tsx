import type { FieldError, UseFormRegisterReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface AuthFieldProps {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  autoFocus?: boolean
  placeholder?: string
  error?: FieldError | undefined
  registration: UseFormRegisterReturn
}

/**
 * One labelled field with its error. Errors are wired through aria-describedby and
 * aria-invalid so a screen reader hears the problem, not just a red border.
 */
export function AuthField({
  id,
  label,
  type = 'text',
  autoComplete,
  autoFocus,
  placeholder,
  error,
  registration,
}: AuthFieldProps) {
  const errorId = `${id}-error`

  return (
    <div className="mb-4">
      <Label htmlFor={id} className="mb-1.5 text-[13px]">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-invalid={error !== undefined}
        aria-describedby={error === undefined ? undefined : errorId}
        // Credentials should not be spell checked or offered up for autofill suggestions.
        spellCheck={type === 'password' ? false : undefined}
        {...registration}
      />
      {error !== undefined ? (
        <p id={errorId} className="mt-1.5 text-[13px] text-[color:var(--danger)]">
          {error.message}
        </p>
      ) : null}
    </div>
  )
}
