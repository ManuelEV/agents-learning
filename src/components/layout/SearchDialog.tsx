import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { CornerDownLeft, Search } from 'lucide-react'
import { posts, SECTIONS } from '../../lib/content'

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => input.current?.focus(), [])

  const results = useMemo(() => {
    const terms = normalize(q).split(/\s+/).filter(Boolean)
    if (terms.length === 0) return posts.slice(0, 8)
    return posts
      .map((p) => {
        const hay = normalize([p.title, p.description, ...(p.tags ?? []), ...p.references.map((r) => r.title)].join(' '))
        const title = normalize(p.title)
        let score = 0
        for (const t of terms) {
          if (!hay.includes(t)) return null
          score += title.includes(t) ? 3 : 1
        }
        return { p, score }
      })
      .filter((x): x is { p: (typeof posts)[number]; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p)
  }, [q])

  useEffect(() => setActive(0), [q])

  const go = (slug: string) => {
    navigate(`/guia/${slug}`)
    onClose()
  }

  return (
    <div className="search" role="dialog" aria-modal="true" aria-label="Buscar">
      <div className="search-backdrop" onClick={onClose} />
      <div className="search-panel">
        <div className="search-input">
          <Search size={18} />
          <input
            ref={input}
            value={q}
            placeholder="Buscar: MCP, Bedrock, RAG, ADK…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActive((a) => Math.min(results.length - 1, a + 1))
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActive((a) => Math.max(0, a - 1))
              }
              if (e.key === 'Enter' && results[active]) go(results[active].slug)
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="search-results">
          {results.length === 0 && <li className="search-empty">Sin resultados para “{q}”.</li>}
          {results.map((p, i) => (
            <li key={p.slug}>
              <button className={i === active ? 'is-active' : ''} onMouseEnter={() => setActive(i)} onClick={() => go(p.slug)}>
                <span className="search-kicker">{SECTIONS.find((s) => s.id === p.section)?.title}</span>
                <span className="search-title">{p.title}</span>
                <span className="search-desc">{p.description}</span>
                {i === active && <CornerDownLeft size={14} className="search-enter" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
