import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Code2, Database, Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react'
import { flowLabel, parseFlow, stepFocus } from '../iso/geometry'
import { TONE_COLOR, TONE_LABEL } from '../iso/palette'
import type { IsoSpec, Tone } from '../iso/types'
import { FlowCanvas, SequenceCanvas } from './Canvas2D'
import { CodeView, resolveLines } from './CodeView'
import { MessageList } from './Messages'
import './walkthrough.css'

const Iso3D = lazy(() => import('../iso/Iso3D'))

/** Formato mínimo para textos de pasos: `código`, **negrita** y *cursiva*. */
export function inline(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>
    return <Fragment key={i}>{p}</Fragment>
  })
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

type Side = 'datos' | 'codigo'

/**
 * Recorrido interactivo de un diagrama: lienzo 2D (flujo o secuencia) o 3D,
 * reproductor por pasos, narración y un panel lateral sincronizado con el paso
 * que muestra el dato que viaja (payload / messages) y las líneas de código que
 * lo producen.
 */
export default function Walkthrough({ specs }: { specs: IsoSpec[] }) {
  const [tab, setTab] = useState(0)
  const spec = specs[tab]
  const total = spec.steps.length
  const [step, setStep] = useState(-1)
  const [selected, setSelected] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<'2d' | '3d'>('2d')
  const [sidePref, setSidePref] = useState<Side | null>(null)
  const [fileOverride, setFileOverride] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const frame = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const go = useCallback(
    (next: number) => {
      setSelected(null)
      setFileOverride(null)
      setStep(Math.max(-1, Math.min(total - 1, next)))
    },
    [total],
  )

  useEffect(() => {
    setStep(-1)
    setSelected(null)
    setPlaying(false)
    setFileOverride(null)
  }, [tab])

  const current = step >= 0 ? spec.steps[step] : null
  const hasData = spec.steps.some((s) => s.data)
  const files = spec.code ? Object.entries(spec.code) : []
  const hasCode = files.length > 0
  const hasSide = hasData || hasCode

  useEffect(() => {
    if (!playing) return
    if (step >= total - 1) {
      setPlaying(false)
      return
    }
    const long = current && (current.data || current.code)
    const t = setTimeout(() => go(step + 1), step === -1 ? 900 : long ? 6800 : 5200)
    return () => clearTimeout(t)
  }, [playing, step, total, go, current])

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === frame.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const focus = useMemo(() => (step >= 0 ? stepFocus(spec, step) : null), [spec, step])

  // si el diagrama no cabe (móvil), desplaza el lienzo hacia lo que está activo
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sc = scroller.current
    if (!sc || sc.scrollWidth <= sc.clientWidth + 4) return
    const els = sc.querySelectorAll<SVGGraphicsElement>('.fw-node.is-active, .fw-lane.is-active .head')
    if (!els.length) {
      if (step < 0) sc.scrollTo({ left: 0, behavior: 'smooth' })
      return
    }
    const base = sc.getBoundingClientRect().left
    let l = Infinity
    let r = -Infinity
    els.forEach((el) => {
      const b = el.getBoundingClientRect()
      l = Math.min(l, b.left - base + sc.scrollLeft)
      r = Math.max(r, b.right - base + sc.scrollLeft)
    })
    sc.scrollTo({ left: Math.max(0, (l + r) / 2 - sc.clientWidth / 2), behavior: 'smooth' })
  }, [step, tab, selected, view])
  const flows = current?.flows ?? []
  const nodeById = useMemo(() => new Map(spec.nodes.map((n) => [n.id, n])), [spec])
  const selectedNode = selected ? nodeById.get(selected) : null
  const tones = useMemo(() => [...new Set(spec.nodes.map((n) => n.tone ?? 'neutral'))] as Tone[], [spec])
  const compact = width < 640
  const sequence = spec.layout === 'sequence'

  // panel lateral: qué pestaña mostrar
  const autoSide: Side = current?.data ? 'datos' : current?.code ? 'codigo' : hasData ? 'datos' : 'codigo'
  const side: Side = sidePref === 'datos' && hasData ? 'datos' : sidePref === 'codigo' && hasCode ? 'codigo' : hasData || hasCode ? autoSide : 'datos'
  const fileKey = fileOverride ?? current?.code?.file ?? files[0]?.[0]
  const file = fileKey ? spec.code?.[fileKey] : undefined
  const stepFile = current?.code ? (current.code.file ?? files[0]?.[0]) : undefined
  const codeLines = file && current?.code && stepFile === fileKey ? resolveLines(file.source, current.code.hl) : []

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('pre')) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(step + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(step - 1)
    }
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void frame.current?.requestFullscreen?.()
  }

  const canvasProps = { spec, step, focus, flows, selected, onSelect: setSelected, onPickStep: go, reducedMotion }
  const h3d = fullscreen ? undefined : Math.min(spec.height ?? 460, Math.max(300, Math.round(width * 0.8)))

  return (
    <div
      ref={frame}
      className={`fw-frame${fullscreen ? ' is-fullscreen' : ''}`}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={`Diagrama interactivo: ${spec.title}`}
    >
      <div className="fw-toolbar">
        {specs.length > 1 ? (
          <div className="fw-tabs" role="tablist">
            {specs.map((s, i) => (
              <button key={s.id} role="tab" aria-selected={i === tab} className={i === tab ? 'is-active' : ''} onClick={() => setTab(i)}>
                {s.title}
              </button>
            ))}
          </div>
        ) : (
          <div className="fw-title">{spec.title}</div>
        )}
        <div className="fw-tools">
          <div className="fw-seg" role="group" aria-label="Tipo de vista">
            <button className={view === '2d' ? 'is-active' : ''} onClick={() => setView('2d')} aria-pressed={view === '2d'} title={sequence ? 'Diagrama de secuencia' : 'Diagrama de flujo'}>
              {sequence ? 'Secuencia' : '2D'}
            </button>
            <button className={view === '3d' ? 'is-active' : ''} onClick={() => setView('3d')} aria-pressed={view === '3d'} title="Vista isométrica 3D">
              3D
            </button>
          </div>
          <button className="iso-tool" onClick={toggleFullscreen} title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'} aria-label="Pantalla completa">
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      <div className="fw-stage">
        {view === '2d' ? (
          <div className="fw-scroll" ref={scroller}>{sequence ? <SequenceCanvas {...canvasProps} /> : <FlowCanvas {...canvasProps} />}</div>
        ) : (
          <Suspense fallback={<div className="iso-placeholder" style={{ minHeight: h3d }}>Cargando vista 3D…</div>}>
            <Iso3D spec={spec} focus={focus} flows={flows} selected={selected} onSelect={setSelected} height={h3d} compact={compact} reducedMotion={reducedMotion} />
          </Suspense>
        )}
        {!compact && (
          <div className="fw-legend" aria-hidden>
            {tones.map((t) => (
              <span key={t}>
                <i style={{ background: TONE_COLOR[t] }} />
                {TONE_LABEL[t]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="fw-player">
        <div className="fw-player-btns">
          <button className="fw-btn" onClick={() => go(-1)} aria-label="Volver a la vista general" title="Vista general">
            <RotateCcw size={15} />
          </button>
          <button className="fw-btn" onClick={() => go(step - 1)} disabled={step < 0} aria-label="Paso anterior" title="Anterior (←)">
            <ChevronLeft size={18} />
          </button>
          <button
            className="fw-btn fw-btn-primary"
            onClick={() => {
              if (step >= total - 1) go(-1)
              setPlaying((p) => !p)
            }}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
            title={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="fw-btn" onClick={() => go(step + 1)} disabled={step >= total - 1} aria-label="Paso siguiente" title="Siguiente (→)">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="fw-track">
          {spec.steps.map((s, i) => (
            <button
              key={i}
              className={`fw-seg-step${i < step ? ' done' : ''}${i === step ? ' current' : ''}`}
              onClick={() => go(i)}
              title={`${i + 1}. ${s.title}`}
              aria-label={`Paso ${i + 1}: ${s.title}`}
            />
          ))}
        </div>
        <span className="fw-count">{step < 0 ? `0/${total}` : `${step + 1}/${total}`}</span>
      </div>

      <div className={`fw-detail${hasSide ? ' has-side' : ''}`} aria-live="polite">
        <div className="fw-narr" key={`${tab}-${step}-${selected ?? ''}`}>
          {selectedNode ? (
            <>
              <div className="fw-kicker" style={{ color: TONE_COLOR[selectedNode.tone ?? 'neutral'] }}>
                {TONE_LABEL[selectedNode.tone ?? 'neutral']}
              </div>
              <h4>
                {selectedNode.label}
                {selectedNode.sub && <span className="fw-sub"> · {selectedNode.sub}</span>}
              </h4>
              <p>{inline(selectedNode.info ?? 'Sin descripción adicional.')}</p>
            </>
          ) : current ? (
            <>
              <div className="fw-kicker">
                Paso {step + 1} de {total}
              </div>
              <h4>{current.title.replace(/^\d+\s*·\s*/, '')}</h4>
              <p>{inline(current.body)}</p>
              {flows.length > 0 && (
                <div className="fw-pills">
                  {flows.map((f, i) => {
                    const [a, b] = parseFlow(f)
                    const na = nodeById.get(a)
                    const nb = nodeById.get(b)
                    const lbl = flowLabel(f)
                    return (
                      <span key={i} className="fw-pill" data-tone={na?.tone ?? 'neutral'}>
                        {na?.label ?? a}
                        <ArrowRight size={11} />
                        {nb?.label ?? b}
                        {lbl && <em> · {lbl}</em>}
                      </span>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="fw-kicker">Vista general</div>
              <h4>{spec.title}</h4>
              <p>{inline(spec.summary)}</p>
              <p className="fw-hint">Pulsa ▶ o usa ← → para recorrer los pasos · clic en un nodo para ver qué hace{hasSide ? ' · a la derecha, el dato y el código de cada paso' : ''}.</p>
            </>
          )}
        </div>

        {hasSide && (
          <div className="fw-side">
            <div className="fw-side-tabs" role="tablist">
              {hasData && (
                <button role="tab" aria-selected={side === 'datos'} className={side === 'datos' ? 'is-active' : ''} onClick={() => setSidePref('datos')}>
                  <Database size={13} /> Datos
                  {current?.data && <i className="fw-dot" />}
                </button>
              )}
              {hasCode && (
                <button role="tab" aria-selected={side === 'codigo'} className={side === 'codigo' ? 'is-active' : ''} onClick={() => setSidePref('codigo')}>
                  <Code2 size={13} /> Código
                  {current?.code && <i className="fw-dot" />}
                </button>
              )}
            </div>
            <div className="fw-side-body" key={`${side}-${tab}-${step}`}>
              {side === 'datos' ? (
                current?.data ? (
                  'messages' in current.data ? (
                    <div className="fw-panel">
                      <div className="fw-panel-head">{current.data.title}</div>
                      <MessageList messages={current.data.messages} highlight={current.data.hl} newFrom={current.data.newFrom} />
                    </div>
                  ) : (
                    <CodeView
                      code={current.data.content}
                      lang={current.data.lang}
                      title={current.data.title}
                      highlight={resolveLines(current.data.content, current.data.hl)}
                      dim={false}
                    />
                  )
                ) : (
                  <div className="fw-empty">{step < 0 ? 'Recorre los pasos para ver los payloads, mensajes y respuestas reales que viajan entre las piezas.' : 'En este paso no viaja un dato nuevo: la acción ocurre dentro del componente destacado.'}</div>
                )
              ) : file ? (
                <CodeView
                  code={file.source}
                  lang={file.lang}
                  title={
                    files.length > 1 ? (
                      <span className="fw-files">
                        {files.map(([k, f]) => (
                          <button key={k} className={k === fileKey ? 'is-active' : ''} onClick={() => setFileOverride(k)}>
                            {f.title}
                          </button>
                        ))}
                      </span>
                    ) : (
                      file.title
                    )
                  }
                  highlight={codeLines}
                />
              ) : null}
              {side === 'codigo' && current && !current.code && <div className="fw-note">Este paso no corresponde a una línea concreta del código.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
