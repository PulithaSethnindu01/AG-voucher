import { Loader2 } from 'lucide-react'

interface SpinnerProps {
  className?: string
  label?: string
}

export function Spinner({ className = 'h-5 w-5', label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-500">
      <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
      {label && <span className="text-sm">{label}</span>}
    </span>
  )
}

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Spinner className="h-8 w-8" label={label} />
    </div>
  )
}
