import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CircleCheck, ExternalLink, Flag, Timer } from 'lucide-react'
import { ROADMAP } from '../../data/roadmap'
import { getPost } from '../../lib/content'

/** Ruta de aprendizaje interactiva (niveles 0 → 6). */
export function Roadmap() {
  const [open, setOpen] = useState(0)
  const lvl = ROADMAP[open]
  return (
    <div className="roadmap not-prose">
      <ol className="roadmap-rail" role="tablist" aria-label="Niveles de la ruta">
        {ROADMAP.map((l, i) => (
          <li key={l.level}>
            <button
              role="tab"
              aria-selected={i === open}
              className={`roadmap-step${i === open ? ' is-active' : ''}${i < open ? ' is-done' : ''}`}
              onClick={() => setOpen(i)}
            >
              <span className="roadmap-num">{l.level}</span>
              <span className="roadmap-step-title">{l.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="roadmap-card" role="tabpanel">
        <div className="roadmap-card-head">
          <div>
            <div className="roadmap-kicker">Nivel {lvl.level}</div>
            <h3>{lvl.title}</h3>
            <p className="roadmap-tagline">{lvl.tagline}</p>
          </div>
          <span className="roadmap-weeks">
            <Timer size={14} /> {lvl.weeks}
          </span>
        </div>
        <p className="roadmap-goal">{lvl.goal}</p>

        <div className="roadmap-grid">
          <section>
            <h4>Temas</h4>
            <ul>
              {lvl.topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
          <section>
            <h4>
              <Flag size={14} /> Proyecto hito: {lvl.project.title}
            </h4>
            <p>{lvl.project.detail}</p>
            <h4>Sabes que terminaste cuando…</h4>
            <ul className="roadmap-done">
              {lvl.done.map((d) => (
                <li key={d}>
                  <CircleCheck size={14} /> {d}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="roadmap-links">
          <div>
            <h4>En esta guía</h4>
            {lvl.guide.map((g) =>
              getPost(g.slug) ? (
                <Link key={g.slug} to={`/guia/${g.slug}`} className="roadmap-link">
                  {g.label} <ArrowRight size={13} />
                </Link>
              ) : null,
            )}
          </div>
          <div>
            <h4>Recursos externos</h4>
            {lvl.resources.map((r) => (
              <a key={r.url + r.title} href={r.url} target="_blank" rel="noreferrer" className="roadmap-link">
                {r.title} <span className="roadmap-org">· {r.org}</span> <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </div>

        <div className="roadmap-nav">
          <button disabled={open === 0} onClick={() => setOpen(open - 1)}>
            ← Nivel anterior
          </button>
          <button disabled={open === ROADMAP.length - 1} onClick={() => setOpen(open + 1)}>
            Siguiente nivel →
          </button>
        </div>
      </div>
    </div>
  )
}
