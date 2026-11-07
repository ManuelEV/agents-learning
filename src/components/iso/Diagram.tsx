import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'

const LazyDiagram = lazy(() => import('./LazyDiagram'))

class DiagramBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false }
  static getDerivedStateFromError() {
    return { error: true }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="iso-error">
          No se pudo renderizar el diagrama. El contenido del artículo sigue siendo válido.
        </div>
      )
    }
    return this.props.children
  }
}

function Placeholder({ height }: { height: number }) {
  return (
    <div className="iso-placeholder" style={{ minHeight: height }}>
      <div className="iso-placeholder-cube" />
      <span>Cargando diagrama…</span>
    </div>
  )
}

/**
 * Diagrama interactivo paso a paso para usar en MDX (2D por defecto, 3D opcional).
 * `<Diagram id="agent-loop" />` o, con pestañas, `<Diagram ids={["a", "b"]} />`.
 */
export function Diagram({ id, ids, height = 660 }: { id?: string; ids?: string[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const list = ids ?? (id ? [id] : [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <figure ref={ref} className="iso-figure not-prose">
      {visible ? (
        <DiagramBoundary>
          <Suspense fallback={<Placeholder height={height} />}>
            <LazyDiagram ids={list} />
          </Suspense>
        </DiagramBoundary>
      ) : (
        <Placeholder height={height} />
      )}
    </figure>
  )
}
