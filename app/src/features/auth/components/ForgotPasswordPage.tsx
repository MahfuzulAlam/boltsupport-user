import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthLayout } from './AuthLayout'
import { AuthField } from './AuthField'

const forgotSchema = z.object({ email: z.email('Enter the email on your account') })
type ForgotValues = z.infer<typeof forgotSchema>

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) })

  const onSubmit = handleSubmit(() => {
    // Always reports success, whether or not the address exists, so this cannot be used to
    // discover which emails have accounts.
    setSent(true)
  })

  return (
    <AuthLayout
      title={sent ? 'Check your email' : 'Reset your password'}
      subtitle={
        sent
          ? 'If that address has an account, a reset link is on its way. The link expires in one hour.'
          : 'We will send you a link to set a new one.'
      }
      footer={
        <Link to="/login" className="text-[color:var(--brand)] hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="flex items-center gap-3 rounded-md bg-[color:var(--muted)] p-3 text-[14px]">
          <MailCheck className="size-5 shrink-0" style={{ color: 'var(--success-strong)' }} />
          <span>Nothing arrived after a few minutes? Check spam, then try again.</span>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} noValidate>
          <AuthField
            id="email"
            label="Email"
            type="email"
            autoComplete="username"
            autoFocus
            error={errors.email}
            registration={register('email')}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
