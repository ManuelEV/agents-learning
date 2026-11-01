import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  ChevronLeft,
  ChevronRight,
  Hand,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { LabelPortal, Scene, type CameraApi } from './Scene'
import { stepFocus } from './geometry'
import { TONE_COLOR, TONE_LABEL } from './palette'
import type { IsoSpec, Tone } from './types'

const STEP_MS = 5200

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

export default function IsoDiagram({ specs }: { specs: IsoSpec[] }) {
  const [tab, setTab] = useState(0)
  const spec = specs[tab]
  const [step, setStep] = useState(-1)
  const [selected, setSelected] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [interactive, setInteractive] = useState(() => matchMedia('(pointer: fine)').matches)
  const theme = useTheme()
  const reducedMotion = usePrefersReducedMotion()
  const frame = useRef<HTMLDivElement>(null)
  const cameraApi = useRef<CameraApi | null>(null)
  const labels = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(900)
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const compact = width < 640
  const total = spec.steps.length

  const go = useCallback(
    (next: number) => {
      setSelected(null)
      setStep(Math.max(-1, Math.min(total - 1, next)))
    },
    [total],
  )

  useEffect(() => {
    setStep(-1)
    setSelected(null)
    setPlaying(false)
  }, [tab])

  useEffect(() => {
    if (!playing) return
    if (step >= total - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => go(step + 1), step === -1 ? 900 : STEP_MS)
    return () => clearTimeout(t)
  }, [playing, step, total, go])

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === frame.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const focus = useMemo(() => (step >= 0 ? stepFocus(spec, step) : null), [spec, step])
  const flows = step >= 0 ? (spec.steps[step].flows ?? []) : []
  const selectedNode = selected ? spec.nodes.find((n) => n.id === selected) : null
  const tones = useMemo(() => [...new Set(spec.nodes.map((n) => n.tone ?? 'neutral'))] as Tone[], [spec])

  const onKey = (e: React.KeyboardEvent) => {
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

  const current = step >= 0 ? spec.steps[step] : null
  const height = fullscreen ? undefined : Math.min(spec.height ?? 460, Math.max(300, Math.round(width * 0.8)))

  return (
    <div
      ref={frame}
      className={`iso-frame${fullscreen ? ' is-fullscreen' : ''}`}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={`Diagrama interactivo: ${spec.title}`}
    >
      <div className="iso-toolbar">
        {specs.length > 1 ? (
          <div className="iso-tabs" role="tablist">
            {specs.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === tab}
                className={i === tab ? 'is-active' : ''}
                onClick={() => setTab(i)}
              >
                {s.title}
              </button>
            ))}
          </div>
        ) : (
          <div className="iso-title">{spec.title}</div>
        )}
        <div className="iso-tools">
          <button
            className={`iso-tool${interactive ? ' is-on' : ''}`}
            onClick={() => setInteractive((v) => !v)}
            title={interactive ? 'Desactivar rotación (permite hacer scroll)' : 'Activar rotación 3D'}
            aria-pressed={interactive}
          >
            <Hand size={15} />
          </button>
          <button className="iso-tool" onClick={() => cameraApi.current?.zoomBy(1.2)} title="Acercar">
            <ZoomIn size={15} />
          </button>
          <button className="iso-tool" onClick={() => cameraApi.current?.zoomBy(1 / 1.2)} title="Alejar">
            <ZoomOut size={15} />
          </button>
          <button className="iso-tool" onClick={() => cameraApi.current?.reset()} title="Restablecer vista">
            <RotateCcw size={15} />
          </button>
          <button className="iso-tool" onClick={toggleFullscreen} title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}>
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      <div className="iso-canvas" style={{ height }}>
        <Canvas
          orthographic
          flat
          dpr={[1, 2]}
          camera={{ position: [40, 40, 40], zoom: 40, near: 0.1, far: 400 }}
          gl={{ antialias: true, alpha: true }}
        >
          <LabelPortal.Provider value={labels}>
          <Scene
            spec={spec}
            focus={focus}
            flows={flows}
            selected={selected}
            onSelect={setSelected}
            theme={theme}
            reducedMotion={reducedMotion}
            cameraApi={cameraApi}
            interactive={interactive}
            compact={compact}
          />
          </LabelPortal.Provider>
        </Canvas>
        <div ref={labels} className="iso-labels" />
        {!compact && (
        <div className="iso-legend" aria-hidden>
          {tones.map((t) => (
            <span key={t}>
              <i style={{ background: TONE_COLOR[t] }} />
              {TONE_LABEL[t]}
            </span>
          ))}
        </div>
        )}
        {step === -1 && !selectedNode && (
          <div className="iso-hint">Pulsa ▶ o usa ← → para recorrer los pasos · clic en un nodo para ver detalles</div>
        )}
      </div>

      <div className="iso-panel" aria-live="polite">
        <div className="iso-controls">
          <button className="iso-btn" onClick={() => go(step - 1)} disabled={step < 0} aria-label="Paso anterior">
            <ChevronLeft size={18} />
          </button>
          <button
            className="iso-btn iso-btn-primary"
            onClick={() => {
              if (step >= total - 1) go(-1)
              setPlaying((p) => !p)
            }}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button className="iso-btn" onClick={() => go(step + 1)} disabled={step >= total - 1} aria-label="Paso siguiente">
            <ChevronRight size={18} />
          </button>
          <div className="iso-dots">
            <button className={`iso-dot${step === -1 ? ' is-active' : ''}`} onClick={() => go(-1)} aria-label="Vista general" title="Vista general">
              ◇
            </button>
            {spec.steps.map((s, i) => (
              <button
                key={i}
                className={`iso-dot${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}
                onClick={() => go(i)}
                title={s.title}
                aria-label={`Paso ${i + 1}: ${s.title}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="iso-text">
          {selectedNode ? (
            <>
              <div className="iso-step-kicker" style={{ color: TONE_COLOR[selectedNode.tone ?? 'neutral'] }}>
                {TONE_LABEL[selectedNode.tone ?? 'neutral']}
              </div>
              <h4>
                {selectedNode.label}
                {selectedNode.sub && <span className="iso-sub"> · {selectedNode.sub}</span>}
              </h4>
              <p>{inline(selectedNode.info ?? 'Sin descripción adicional.')}</p>
            </>
          ) : current ? (
            <>
              <div className="iso-step-kicker">
                Paso {step + 1} de {total}
              </div>
              <h4>{current.title}</h4>
              <p>{inline(current.body)}</p>
            </>
          ) : (
            <>
              <div className="iso-step-kicker">Vista general</div>
              <h4>{spec.title}</h4>
              <p>{inline(spec.summary)}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
