import { Zap } from 'lucide-react'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: React.ReactNode
  footer?: React.ReactNode
}

/** Centered card shared by login, signup, and password reset. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-full items-center justify-center bg-[color:var(--app)] px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Zap className="size-6" style={{ fill: 'var(--brand)', stroke: 'var(--brand)' }} />
          <span className="text-[20px] font-semibold tracking-[-0.015em]">BoltSupport</span>
        </div>

        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-6">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 mb-5 text-[14px] text-[color:var(--muted-foreground)]">{subtitle}</p>
          {children}
        </div>

        {footer ? <div className="mt-4 text-center text-[14px]">{footer}</div> : null}
      </div>
    </div>
  )
}
