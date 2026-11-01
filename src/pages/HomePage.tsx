import { useEffect } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Boxes, Building2, Compass, Layers, Route, ShieldCheck, Workflow } from 'lucide-react'
import { Diagram } from '../components/iso/Diagram'
import { posts, postsBySection, SECTIONS } from '../lib/content'

const SECTION_ICON = {
  inicio: Compass,
  fundamentos: Layers,
  conectar: Workflow,
  frameworks: Boxes,
  plataformas: Layers,
  arquitecturas: Route,
  casos: Building2,
  produccion: ShieldCheck,
} as const

export function HomePage() {
  useEffect(() => {
    document.title = 'Agentes en la empresa · Guía práctica'
  }, [])
  const refCount = new Set(posts.flatMap((p) => p.references.map((r) => r.url))).size

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-text">
          <div className="hero-kicker">Guía práctica · actualizada a octubre de 2026</div>
          <h1>
            Construir <span className="grad">agentes de IA</span> en la empresa
          </h1>
          <p>
            Un mapa de las opciones reales para construir agentes —frameworks, RAG, MCP, A2A, gateways y plataformas cloud—, cómo
            funcionan por dentro y cómo combinarlos con buenas prácticas de producción. Cada concepto viene con diagramas
            isométricos interactivos paso a paso y referencias a la fuente oficial.
          </p>
          <div className="hero-cta">
            <Link to="/guia/ruta-de-aprendizaje" className="btn btn-primary">
              Empezar la ruta de aprendizaje <ArrowRight size={16} />
            </Link>
            <Link to="/guia/arquitectura-adk-gateway-bedrock" className="btn">
              Arquitectura ADK + AI Gateway + Bedrock
            </Link>
          </div>
          <div className="hero-stats">
            <span>
              <strong>{posts.length}</strong> artículos
            </span>
            <span>
              <strong>7</strong> niveles de aprendizaje
            </span>
            <span>
              <strong>{refCount}</strong> referencias
            </span>
          </div>
        </div>
      </section>

      <section className="home-diagram">
        <Diagram id="ecosistema" height={700} />
      </section>

      <section className="home-sections">
        {SECTIONS.map((s) => {
          const items = postsBySection(s.id)
          if (items.length === 0) return null
          const Icon = SECTION_ICON[s.id]
          return (
            <div key={s.id} className="home-section">
              <div className="home-section-head">
                <Icon size={18} />
                <h2>{s.title}</h2>
              </div>
              <p className="muted">{s.blurb}</p>
              <ul>
                {items.map((p) => (
                  <li key={p.slug}>
                    <Link to={`/guia/${p.slug}`}>
                      <span className="home-post-title">{p.title}</span>
                      <span className="home-post-desc">{p.description}</span>
                      <span className="home-post-meta">
                        {p.readingMinutes} min · {p.level}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
    </div>
  )
}
