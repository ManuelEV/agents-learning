import type { ReactNode } from 'react'
import { CircleCheck, Info, Lightbulb, ShieldAlert, TriangleAlert } from 'lucide-react'

const VARIANTS = {
  info: { icon: Info, label: 'Nota' },
  tip: { icon: Lightbulb, label: 'Recomendación' },
  warning: { icon: TriangleAlert, label: 'Atención' },
  danger: { icon: ShieldAlert, label: 'Riesgo' },
  success: { icon: CircleCheck, label: 'En resumen' },
} as const

export function Callout({
  type = 'info',
  title,
  children,
}: {
  type?: keyof typeof VARIANTS
  title?: string
  children: ReactNode
}) {
  const v = VARIANTS[type]
  const Icon = v.icon
  return (
    <aside className={`callout callout-${type}`}>
      <div className="callout-head">
        <Icon size={16} aria-hidden />
        <span>{title ?? v.label}</span>
      </div>
      <div className="callout-body">{children}</div>
    </aside>
  )
}
