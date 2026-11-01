import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ExternalLink } from 'lucide-react'

export function Cards({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`cards cards-${cols}`}>{children}</div>
}

export function Card({ title, href, tag, children }: { title: string; href?: string; tag?: string; children?: ReactNode }) {
  const external = href?.startsWith('http')
  const body = (
    <>
      <div className="card-head">
        <span className="card-title">{title}</span>
        {tag && <span className="badge">{tag}</span>}
      </div>
      {children && <div className="card-body">{children}</div>}
      {href && (
        <span className="card-cta">
          {external ? (
            <>
              Documentación <ExternalLink size={13} />
            </>
          ) : (
            <>
              Leer <ArrowRight size={13} />
            </>
          )}
        </span>
      )}
    </>
  )
  if (!href) return <div className="card">{body}</div>
  if (external)
    return (
      <a className="card card-link" href={href} target="_blank" rel="noreferrer">
        {body}
      </a>
    )
  return (
    <Link className="card card-link" to={href}>
      {body}
    </Link>
  )
}
