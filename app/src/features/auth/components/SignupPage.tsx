import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { AuthLayout } from './AuthLayout'
import { AuthField } from './AuthField'
import { useAuth } from '../hooks/use-auth'

const signupSchema = z.object({
  name: z.string().min(2, 'Tell us what to call you'),
  email: z.email('Enter a valid work email'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

type SignupValues = z.infer<typeof signupSchema>

export function SignupPage() {
  const navigate = useNavigate()
  const signIn = useAuth((s) => s.signIn)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema) })

  const onSubmit = handleSubmit(() => {
    signIn()
    void navigate('/', { replace: true })
  })

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Connect an inbox and send your first reply in under fifteen minutes."
      footer={
        <span className="text-[color:var(--muted-foreground)]">
          Already have an account?{' '}
          <Link to="/login" className="text-[color:var(--brand)] hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <AuthField
          id="name"
          label="Your name"
          autoComplete="name"
          autoFocus
          error={errors.name}
          registration={register('name')}
        />
        <AuthField
          id="email"
          label="Work email"
          type="email"
          autoComplete="username"
          error={errors.email}
          registration={register('email')}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password}
          registration={register('password')}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
    </AuthLayout>
  )
}
