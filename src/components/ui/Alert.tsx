import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertVariant = 'error' | 'success' | 'info' | 'warning'

const styles: Record<AlertVariant, string> = {
  error: 'border-red-100 bg-red-50 text-red-800',
  success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  info: 'border-blue-100 bg-blue-50 text-blue-800',
  warning: 'border-amber-100 bg-amber-50 text-amber-800',
}

const icons: Record<AlertVariant, ReactNode> = {
  error: <XCircle className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />,
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />,
  info: <Info className="h-5 w-5 shrink-0 text-blue-500" aria-hidden="true" />,
  warning: <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />,
}

export function Alert({
  variant = 'error',
  children,
}: {
  variant?: AlertVariant
  children: ReactNode
}) {
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm font-medium shadow-sm animate-in fade-in slide-in-from-top-1 ${styles[variant]}`}
    >
      {icons[variant]}
      <div className="flex-1">{children}</div>
    </div>
  )
}
