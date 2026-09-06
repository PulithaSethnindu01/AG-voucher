import type { ReactNode } from 'react'

type BadgeTone = 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'brand'

const toneStyles: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  red: 'bg-red-50 text-red-700 border-red-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
}

export function Badge({ tone = 'slate', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`badge border ${toneStyles[tone]} shadow-sm shadow-black/5`}>
      {children}
    </span>
  )
}
