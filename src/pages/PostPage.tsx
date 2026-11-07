import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react'
import { Link, useParams } from 'react-router'
import { MDXProvider } from '@mdx-js/react'
import { ArrowLeft, ArrowRight, Clock, ExternalLink, Gauge } from 'lucide-react'
import { mdxComponents } from '../components/mdx'
import { adjacentPosts, getPost, loadPostContent, SECTIONS, type Reference } from '../lib/content'
import { NotFoundPage } from './NotFoundPage'

const cache = new Map<string, LazyExoticComponent<ComponentType>>()
function contentFor(slug: string) {
  let c = cache.get(slug)
  if (!c) {
    c = lazy(() => loadPostContent(slug))
    cache.set(slug, c)
  }
  return c
}

interface Heading {
  id: string
  text: string
  level: number
}

function Article({ slug, onHeadings }: { slug: string; onHeadings: (h: Heading[]) => void }) {
  const Content = contentFor(slug)
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const hs = [...el.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')].map((h) => ({
      id: h.id,
      text: h.textContent ?? '',
      level: h.tagName === 'H2' ? 2 : 3,
    }))
    onHeadings(hs)
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()
  }, [slug, onHeadings])
  return (
    <div ref={ref} className="prose">
      <MDXProvider components={mdxComponents}>
        <Content />
      </MDXProvider>
    </div>
  )
}

function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const els = headings.map((h) => document.getElementById(h.id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -70% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [headings])
  if (headings.length === 0) return null
  return (
    <nav className="toc" aria-label="En esta página">
      <div className="toc-title">En esta página</div>
      <ul>
        {headings.map((h) => (
          <li key={h.id} className={`toc-l${h.level}${active === h.id ? ' is-active' : ''}`}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function ReferenceList({ refs }: { refs: Reference[] }) {
  return (
    <ol className="refs">
      {refs.map((r) => (
        <li key={r.url + r.title}>
          <a href={r.url} target="_blank" rel="noreferrer">
            {r.title} <ExternalLink size={12} />
          </a>
          <span className="refs-meta">
            {r.org}
            {r.date ? ` · ${r.date}` : ''}
            {r.note ? ` — ${r.note}` : ''}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ArticleSkeleton() {
  return (
    <div className="skeleton" aria-busy="true">
      <div />
      <div />
      <div />
      <div />
    </div>
  )
}

export function PostPage() {
  const { slug = '' } = useParams()
  const meta = getPost(slug)
  const [headings, setHeadings] = useState<Heading[]>([])

  useEffect(() => {
    if (meta) {
      document.title = `${meta.title} · Agentes de IA a nivel empresarial`
      document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
    }
    setHeadings([])
  }, [meta])

  if (!meta) return <NotFoundPage />
  const section = SECTIONS.find((s) => s.id === meta.section)
  const { prev, next } = adjacentPosts(slug)

  return (
    <div className="post-layout">
      <article className="post">
        <header className="post-head">
          <div className="post-kicker">{section?.title}</div>
          <h1>{meta.title}</h1>
          <p className="post-desc">{meta.description}</p>
          <div className="post-meta">
            <span>
              <Clock size={14} /> {meta.readingMinutes} min de lectura
            </span>
            <span>
              <Gauge size={14} /> Nivel {meta.level}
            </span>
            {meta.tags?.slice(0, 4).map((t) => (
              <span key={t} className="badge">
                {t}
              </span>
            ))}
          </div>
        </header>

        <Suspense fallback={<ArticleSkeleton />}>
          <Article key={slug} slug={slug} onHeadings={setHeadings} />
        </Suspense>

        {meta.references.length > 0 && (
          <section className="post-refs">
            <h2 id="referencias">Referencias</h2>
            <p className="muted">Fuentes primarias usadas en este artículo, para profundizar o verificar.</p>
            <ReferenceList refs={meta.references} />
          </section>
        )}

        <nav className="post-nav">
          {prev ? (
            <Link to={`/guia/${prev.slug}`} className="post-nav-link">
              <span>
                <ArrowLeft size={14} /> Anterior
              </span>
              <strong>{prev.title}</strong>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/guia/${next.slug}`} className="post-nav-link is-next">
              <span>
                Siguiente <ArrowRight size={14} />
              </span>
              <strong>{next.title}</strong>
            </Link>
          )}
        </nav>
      </article>
      <aside className="post-aside">
        <Toc headings={headings} />
      </aside>
    </div>
  )
}
