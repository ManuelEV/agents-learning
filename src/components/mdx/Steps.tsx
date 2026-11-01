import type { ReactNode } from 'react'

/** Lista numerada con estilo de "pasos". Envuelve una lista ordenada de Markdown. */
export function Steps({ children }: { children: ReactNode }) {
  return <div className="steps">{children}</div>
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'ga' | 'preview' | 'deprecated'
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

/** Bloque de "ideas clave". */
export function KeyPoints({ title = 'Ideas clave', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="keypoints">
      <div className="keypoints-title">{title}</div>
      {children}
    </div>
  )
}
