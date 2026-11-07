import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ExternalLink, Search } from 'lucide-react'
import { posts, SECTIONS, type PostMeta, type Reference } from '../lib/content'

interface Entry extends Reference {
  usedIn: PostMeta[]
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function ReferencesPage() {
  const [q, setQ] = useState('')
  const [org, setOrg] = useState<string>('')

  useEffect(() => {
    document.title = 'Referencias · Agentes de IA a nivel empresarial'
  }, [])

  const entries = useMemo(() => {
    const map = new Map<string, Entry>()
    for (const p of posts) {
      for (const r of p.references) {
        const key = r.url.replace(/\/$/, '')
        const e = map.get(key)
        if (e) {
          if (!e.usedIn.includes(p)) e.usedIn.push(p)
        } else map.set(key, { ...r, usedIn: [p] })
      }
    }
    return [...map.values()].sort((a, b) => a.org.localeCompare(b.org) || a.title.localeCompare(b.title))
  }, [])

  const orgs = useMemo(() => {
    const counts = new Map<string, number>()
    entries.forEach((e) => counts.set(e.org, (counts.get(e.org) ?? 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])

  const filtered = entries.filter((e) => {
    if (org && e.org !== org) return false
    if (!q) return true
    return normalize([e.title, e.org, e.url, e.note ?? ''].join(' ')).includes(normalize(q))
  })

  return (
    <div className="page-wide">
      <header className="post-head">
        <div className="post-kicker">Recursos</div>
        <h1>Referencias</h1>
        <p className="post-desc">
          Las {entries.length} fuentes citadas en la guía, deduplicadas. Priorizamos documentación oficial, especificaciones y
          publicaciones de ingeniería de los propios proveedores. Cada entrada indica en qué artículos se usa.
        </p>
      </header>

      <div className="refs-toolbar">
        <label className="refs-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar por título, organización o URL…" />
        </label>
        <div className="refs-orgs">
          <button className={org === '' ? 'is-active' : ''} onClick={() => setOrg('')}>
            Todas
          </button>
          {orgs.slice(0, 14).map(([o, n]) => (
            <button key={o} className={org === o ? 'is-active' : ''} onClick={() => setOrg(o === org ? '' : o)}>
              {o} <span>{n}</span>
            </button>
          ))}
        </div>
      </div>

      <ul className="refs-table">
        {filtered.map((e) => (
          <li key={e.url}>
            <div className="refs-main">
              <a href={e.url} target="_blank" rel="noreferrer">
                {e.title} <ExternalLink size={12} />
              </a>
              <span className="refs-meta">
                {e.org}
                {e.date ? ` · ${e.date}` : ''}
                {e.note ? ` — ${e.note}` : ''}
              </span>
              <span className="refs-url">{e.url.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="refs-used">
              {e.usedIn.map((p) => (
                <Link key={p.slug} to={`/guia/${p.slug}`} title={SECTIONS.find((s) => s.id === p.section)?.title}>
                  {p.title}
                </Link>
              ))}
            </div>
          </li>
        ))}
        {filtered.length === 0 && <li className="muted">Sin resultados.</li>}
      </ul>
    </div>
  )
}
