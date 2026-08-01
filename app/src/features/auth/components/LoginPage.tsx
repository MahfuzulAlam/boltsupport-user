import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { AuthLayout } from './AuthLayout'
import { AuthField } from './AuthField'
import { useAuth } from '../hooks/use-auth'

const loginSchema = z.object({
  email: z.email('Enter the email address you signed up with'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const signIn = useAuth((s) => s.signIn)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'sam@boltsupport.io', password: 'demo' },
  })

  const onSubmit = handleSubmit(async () => {
    setSubmitError(null)
    try {
      // No credentials leave the browser. There is no backend, so this only opens the demo gate.
      await Promise.resolve()
      signIn()
      void navigate('/', { replace: true })
    } catch {
      setSubmitError('We could not sign you in. Try again.')
    }
  })

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Your queue is waiting."
      footer={
        <span className="text-[color:var(--muted-foreground)]">
          New here?{' '}
          <Link to="/signup" className="text-[color:var(--brand)] hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
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
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
          registration={register('password')}
        />

        {submitError !== null ? (
          <p
            role="alert"
            className="mb-4 rounded-md border border-[color:var(--danger)] bg-[color:var(--danger-soft)] p-2.5 text-[13px]"
          >
            {submitError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-[color:var(--border)]" />
          <span className="text-[12px] text-[color:var(--muted-foreground)]">or</span>
          <span className="h-px flex-1 bg-[color:var(--border)]" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            signIn()
            void navigate('/', { replace: true })
          }}
        >
          Continue with SSO
        </Button>

        <p className="mt-4 text-center text-[13px]">
          <Link to="/forgot-password" className="text-[color:var(--brand)] hover:underline">
            Forgot your password?
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
