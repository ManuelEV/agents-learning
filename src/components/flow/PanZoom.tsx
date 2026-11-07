import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Crosshair, Minus, Plus, Scan } from 'lucide-react'

/* ==========================================================================
   Cámara 2D para los diagramas SVG.

   - Por defecto el diagrama se AJUSTA al espacio disponible (siempre se ve
     completo). Si en un paso las piezas activas quedarían ilegibles (escala
     < READABLE), la cámara se acerca a ellas con una transición suave.
   - El lector puede acercar/alejar (+/−, Ctrl+rueda, pellizco) y arrastrar
     para moverse. Al cambiar de paso vuelve el modo automático; "Ver todo"
     restablece el encuadre completo.
   - `fit: 'width'` (secuencias): ajusta al ancho y desplaza en vertical para
     seguir las filas del paso.
   ========================================================================== */

export type Rect = { x: number; y: number; w: number; h: number }
export type ViewBox = { x: number; y: number; w: number; h: number; s: number }

type Cam = { cx: number; cy: number; s: number }

const READABLE = 0.62
const MAX_SCALE = 1.25

export function PanZoom({
  width,
  height,
  focus,
  stepKey,
  fit = 'both',
  ariaLabel,
  reducedMotion,
  onBackgroundClick,
  children,
}: {
  width: number
  height: number
  /** Región a mantener legible en este paso (coordenadas del contenido). */
  focus: Rect | null
  /** Cambia en cada paso: devuelve la cámara al modo automático. */
  stepKey: string
  fit?: 'both' | 'width'
  ariaLabel: string
  reducedMotion: boolean
  onBackgroundClick?: () => void
  children: (vb: ViewBox) => ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [cam, setCam] = useState<Cam | null>(null)
  const [manual, setManual] = useState(false)
  const [follow, setFollow] = useState(true)
  const camRef = useRef<Cam | null>(null)
  camRef.current = cam

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const clampCam = useCallback(
    (c: Cam): Cam => {
      const { w: cw, h: ch } = size
      const vw = cw / c.s
      const vh = ch / c.s
      const cx = vw >= width ? width / 2 : Math.min(Math.max(c.cx, vw / 2), width - vw / 2)
      const cy = vh >= height ? height / 2 : Math.min(Math.max(c.cy, vh / 2), height - vh / 2)
      return { cx, cy, s: c.s }
    },
    [size, width, height, fit],
  )

  const fitScale = useCallback(() => {
    const { w: cw, h: ch } = size
    if (!cw || !ch) return 1
    return fit === 'width' ? Math.min(cw / width, MAX_SCALE) : Math.min(cw / width, ch / height, MAX_SCALE)
  }, [size, width, height, fit])

  const autoTarget = useCallback((): Cam => {
    const { w: cw, h: ch } = size
    const f = fitScale()
    const all: Cam = { cx: width / 2, cy: fit === 'width' ? 0 : height / 2, s: f }
    if (!focus || !follow) return clampCam(all)
    if (fit === 'width') {
      // ajusta al ancho; si aun así es ilegible, acerca a los carriles activos
      let s = f
      if (f < READABLE) s = Math.max(f, Math.min(1, cw / (focus.w + 80)))
      return clampCam({ cx: focus.x + focus.w / 2, cy: focus.y + focus.h / 2, s })
    }
    if (f >= READABLE) return clampCam(all)
    const pad = 56
    const s = Math.max(f, Math.min(1, cw / (focus.w + pad * 2), ch / (focus.h + pad * 2)))
    return clampCam({ cx: focus.x + focus.w / 2, cy: focus.y + focus.h / 2, s })
  }, [size, fitScale, focus, follow, width, height, fit, clampCam])

  // transición animada hacia un objetivo
  const anim = useRef(0)
  const animateTo = useCallback(
    (target: Cam) => {
      cancelAnimationFrame(anim.current)
      const from = camRef.current
      if (!from || reducedMotion) {
        setCam(target)
        return
      }
      const t0 = performance.now()
      const dur = 420
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / dur)
        const e = 1 - Math.pow(1 - t, 3)
        setCam({ cx: from.cx + (target.cx - from.cx) * e, cy: from.cy + (target.cy - from.cy) * e, s: from.s + (target.s - from.s) * e })
        if (t < 1) anim.current = requestAnimationFrame(tick)
      }
      anim.current = requestAnimationFrame(tick)
    },
    [reducedMotion],
  )
  useEffect(() => () => cancelAnimationFrame(anim.current), [])

  // modo automático: al cambiar de paso, de tamaño o de foco
  useEffect(() => {
    setManual(false)
  }, [stepKey])
  const focusKey = focus ? `${Math.round(focus.x)},${Math.round(focus.y)},${Math.round(focus.w)},${Math.round(focus.h)}` : 'all'
  useEffect(() => {
    if (!size.w || !size.h || manual) return
    if (!camRef.current) setCam(autoTarget())
    else animateTo(autoTarget())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, focusKey, stepKey, manual, follow, width, height])

  const zoomBy = (k: number, at?: { x: number; y: number }) => {
    const c = camRef.current
    if (!c) return
    const both = Math.min(size.w / width, size.h / height)
    const s = Math.min(2.2, Math.max(Math.min(both, fitScale(), 0.25), c.s * k))
    let cx = c.cx
    let cy = c.cy
    if (at) {
      // mantiene fijo el punto bajo el cursor
      const px = c.cx + (at.x - size.w / 2) / c.s
      const py = c.cy + (at.y - size.h / 2) / c.s
      cx = px - (at.x - size.w / 2) / s
      cy = py - (at.y - size.h / 2) / s
    }
    setManual(true)
    cancelAnimationFrame(anim.current)
    setCam(clampCam({ cx, cy, s }))
  }

  // arrastre y pellizco
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ moved: boolean; dist: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    drag.current = { moved: false, dist: pinchDist() }
  }
  const pinchDist = () => {
    const p = [...pointers.current.values()]
    return p.length >= 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev || !drag.current) return
    const c = camRef.current
    if (!c) return
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size >= 2) {
      const d = pinchDist()
      if (drag.current.dist > 0 && d > 0) {
        const r = box.current!.getBoundingClientRect()
        const p = [...pointers.current.values()]
        zoomBy(d / drag.current.dist, { x: (p[0].x + p[1].x) / 2 - r.left, y: (p[0].y + p[1].y) / 2 - r.top })
      }
      drag.current = { moved: true, dist: d }
      return
    }
    if (!drag.current.moved && Math.hypot(dx, dy) < 3) return
    if (!drag.current.moved) (e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    drag.current.moved = true
    setManual(true)
    cancelAnimationFrame(anim.current)
    setCam(clampCam({ cx: c.cx - dx / c.s, cy: c.cy - dy / c.s, s: c.s }))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) setTimeout(() => (drag.current = null), 0)
  }
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current?.moved) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomBy(Math.exp(-e.deltaY * 0.0022), { x: e.clientX - r.left, y: e.clientY - r.top })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const vb: ViewBox | null =
    cam && size.w && size.h ? { x: cam.cx - size.w / cam.s / 2, y: cam.cy - size.h / cam.s / 2, w: size.w / cam.s, h: size.h / cam.s, s: cam.s } : null
  const isFit = !!cam && Math.abs(cam.s - Math.min(size.w / width, size.h / height, MAX_SCALE)) < 0.01

  return (
    <div
      ref={box}
      className={`fw-pz${manual ? ' is-manual' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      {vb && (
        <svg
          className="fw-svg"
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          width={size.w}
          height={size.h}
          role="img"
          aria-label={ariaLabel}
          onClick={onBackgroundClick}
        >
          {children(vb)}
        </svg>
      )}
      <div className="fw-zoom" onPointerDown={(e) => e.stopPropagation()}>
        <button className={`fw-zbtn${follow ? ' is-on' : ''}`} onClick={() => setFollow((v) => !v)} title={follow ? 'Seguir el paso: activado' : 'Seguir el paso: desactivado'} aria-pressed={follow}>
          <Crosshair size={14} />
        </button>
        <button className="fw-zbtn" onClick={() => zoomBy(1 / 1.25)} title="Alejar" aria-label="Alejar">
          <Minus size={14} />
        </button>
        <button className="fw-zbtn" onClick={() => zoomBy(1.25)} title="Acercar (o Ctrl + rueda)" aria-label="Acercar">
          <Plus size={14} />
        </button>
        <button
          className={`fw-zbtn${isFit && !manual ? '' : ' is-hint'}`}
          onClick={() => {
            // "ver todo" encuadra el diagrama completo en ambos ejes (también las secuencias largas)
            const s = Math.min(size.w / width, size.h / height, MAX_SCALE)
            setManual(true)
            cancelAnimationFrame(anim.current)
            animateTo({ cx: width / 2, cy: height / 2, s })
          }}
          title="Ver todo el diagrama"
          aria-label="Ver todo el diagrama"
        >
          <Scan size={14} />
        </button>
      </div>
    </div>
  )
}
