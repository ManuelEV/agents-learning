import { flowLabel, parseFlow } from '../iso/geometry'
import type { IsoNode, IsoSpec, IsoZone } from '../iso/types'

/* ==========================================================================
   Layout 2D de una IsoSpec.

   flow: reutiliza `at: [x, z]` de cada nodo — x es el eje del flujo
   (izquierda → derecha) y z el de los carriles (arriba → abajo). La escala por
   eje se calcula para que ninguna caja se solape con su vecina, así que las
   specs pensadas para la vista 3D se leen bien en 2D sin tocarlas.

   sequence: un carril vertical por nodo y una fila por cada flujo de cada
   paso, en orden. Es el formato natural para protocolos (MCP, A2A, OAuth…).
   ========================================================================== */

export type Pt = { x: number; y: number }

export type Box = { id: string; node: IsoNode; x: number; y: number; w: number; h: number }

export type EdgePath = {
  key: string
  from: string
  to: string
  d: string
  /** Punta de flecha (triángulo) en `to`. */
  arrow: string
  mid: Pt
  label?: string
  dashed?: boolean
  temp?: boolean
}

export type ZoneRect = { zone: IsoZone; x: number; y: number; w: number; h: number }

export type FlowLayout = { width: number; height: number; boxes: Map<string, Box>; zones: ZoneRect[]; edges: EdgePath[] }

const MARGIN = 26

export function nodeSize(n: IsoNode): { w: number; h: number } {
  const lbl = n.label.length * 7.5
  const sub = (n.sub?.length ?? 0) * 6.2
  const w = Math.min(240, Math.max(112, Math.ceil(Math.max(lbl, sub)) + (n.icon ? 52 : 28)))
  return { w, h: n.sub ? 52 : 40 }
}

function roundedPath(pts: Pt[], r = 10): string {
  if (pts.length < 3) return `M${pts[0].x},${pts[0].y} L${pts[pts.length - 1].x},${pts[pts.length - 1].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1
    const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1
    const rr = Math.min(r, l1 / 2, l2 / 2)
    const a = { x: p1.x - ((p1.x - p0.x) / l1) * rr, y: p1.y - ((p1.y - p0.y) / l1) * rr }
    const b = { x: p1.x + ((p2.x - p1.x) / l2) * rr, y: p1.y + ((p2.y - p1.y) / l2) * rr }
    d += ` L${a.x},${a.y} Q${p1.x},${p1.y} ${b.x},${b.y}`
  }
  const last = pts[pts.length - 1]
  return `${d} L${last.x},${last.y}`
}

function arrowHead(tip: Pt, from: Pt): string {
  const dx = tip.x - from.x
  const dy = tip.y - from.y
  const l = Math.hypot(dx, dy) || 1
  const ux = dx / l
  const uy = dy / l
  return `${tip.x},${tip.y} ${tip.x - ux * 9 - uy * 4.5},${tip.y - uy * 9 + ux * 4.5} ${tip.x - ux * 9 + uy * 4.5},${tip.y - uy * 9 - ux * 4.5}`
}

function borderPoint(b: Box, toward: Pt): Pt {
  const w = b.w / 2 + 3
  const h = b.h / 2 + 3
  const dx = toward.x - b.x
  const dy = toward.y - b.y
  if (dx === 0 && dy === 0) return { x: b.x, y: b.y }
  const s = Math.min(w / Math.abs(dx || 1e-9), h / Math.abs(dy || 1e-9))
  return { x: b.x + dx * s, y: b.y + dy * s }
}

function longestMid(pts: Pt[]): Pt {
  let best = 0
  let mid = pts[0]
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    if (l > best) {
      best = l
      mid = { x: (pts[i].x + pts[i - 1].x) / 2, y: (pts[i].y + pts[i - 1].y) / 2 }
    }
  }
  return mid
}

function arcEdge(a: Box, b: Box, bend: number) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const off = Math.max(40, len * 0.22) * bend
  const c = { x: mx + (-dy / len) * off, y: my + (dx / len) * off }
  const p1 = borderPoint(a, c)
  const p2 = borderPoint(b, c)
  const mid = { x: 0.25 * p1.x + 0.5 * c.x + 0.25 * p2.x, y: 0.25 * p1.y + 0.5 * c.y + 0.25 * p2.y }
  return { d: `M${p1.x},${p1.y} Q${c.x},${c.y} ${p2.x},${p2.y}`, arrow: arrowHead(p2, c), mid }
}

function orthoEdge(a: Box, b: Box, route: 'x' | 'z') {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const sx = Math.sign(dx) || 1
  const sy = Math.sign(dy) || 1
  // ¿se solapan en vertical? → línea horizontal recta
  const yLo = Math.max(a.y - a.h / 2, b.y - b.h / 2)
  const yHi = Math.min(a.y + a.h / 2, b.y + b.h / 2)
  const xLo = Math.max(a.x - a.w / 2, b.x - b.w / 2)
  const xHi = Math.min(a.x + a.w / 2, b.x + b.w / 2)
  let pts: Pt[]
  if (yHi - yLo > 10 && Math.abs(dx) > (a.w + b.w) / 2) {
    const y = Math.abs(dy) < 6 ? a.y : (yLo + yHi) / 2
    pts = [
      { x: a.x + (sx * a.w) / 2, y },
      { x: b.x - (sx * b.w) / 2, y },
    ]
  } else if (xHi - xLo > 16 && Math.abs(dy) > (a.h + b.h) / 2) {
    const x = Math.abs(dx) < 6 ? a.x : (xLo + xHi) / 2
    pts = [
      { x, y: a.y + (sy * a.h) / 2 },
      { x, y: b.y - (sy * b.h) / 2 },
    ]
  } else if (route === 'z') {
    pts = [
      { x: a.x, y: a.y + (sy * a.h) / 2 },
      { x: a.x, y: b.y },
      { x: b.x - (sx * b.w) / 2, y: b.y },
    ]
  } else {
    pts = [
      { x: a.x + (sx * a.w) / 2, y: a.y },
      { x: b.x, y: a.y },
      { x: b.x, y: b.y - (sy * b.h) / 2 },
    ]
  }
  // separa la punta del borde para que la flecha no lo pise
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  const l = Math.hypot(last.x - prev.x, last.y - prev.y) || 1
  const tip = { x: last.x - ((last.x - prev.x) / l) * 3, y: last.y - ((last.y - prev.y) / l) * 3 }
  pts[pts.length - 1] = tip
  return { d: roundedPath(pts), arrow: arrowHead(tip, prev), mid: longestMid(pts) }
}

export function flowLayout(spec: IsoSpec): FlowLayout {
  const nodes = spec.nodes
  const sizes = new Map(nodes.map((n) => [n.id, nodeSize(n)]))

  // escala por eje: lo justo para que no se solapen las cajas
  let ux = 70
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const dx = Math.abs(a.at[0] - b.at[0])
      const dz = Math.abs(a.at[1] - b.at[1])
      if (dz < 1.1 && dx > 0.01) ux = Math.max(ux, ((sizes.get(a.id)!.w + sizes.get(b.id)!.w) / 2 + 34) / dx)
    }
  ux = Math.min(ux, 175)
  let uz = 44
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const sa = sizes.get(a.id)!
      const sb = sizes.get(b.id)!
      const dx = Math.abs(a.at[0] - b.at[0]) * ux
      const dz = Math.abs(a.at[1] - b.at[1])
      if (dz > 0.01 && dx < (sa.w + sb.w) / 2 + 14) uz = Math.max(uz, ((sa.h + sb.h) / 2 + 38) / dz)
    }
  uz = Math.min(uz, 120)

  const boxes = new Map<string, Box>()
  for (const n of nodes) {
    const s = sizes.get(n.id)!
    boxes.set(n.id, { id: n.id, node: n, x: n.at[0] * ux, y: n.at[1] * uz, w: s.w, h: s.h })
  }

  const zones: ZoneRect[] = (spec.zones ?? []).map((z) => {
    const x0 = Math.min(z.from[0], z.to[0])
    const x1 = Math.max(z.from[0], z.to[0])
    const z0 = Math.min(z.from[1], z.to[1])
    const z1 = Math.max(z.from[1], z.to[1])
    let l = x0 * ux
    let r = x1 * ux
    let t = z0 * uz
    let b = z1 * uz
    for (const n of nodes) {
      if (n.at[0] < x0 || n.at[0] > x1 || n.at[1] < z0 || n.at[1] > z1) continue
      const bx = boxes.get(n.id)!
      l = Math.min(l, bx.x - bx.w / 2 - 14)
      r = Math.max(r, bx.x + bx.w / 2 + 14)
      t = Math.min(t, bx.y - bx.h / 2 - 30)
      b = Math.max(b, bx.y + bx.h / 2 + 14)
    }
    return { zone: z, x: l, y: t, w: r - l, h: b - t }
  })

  // encuadre
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const b of boxes.values()) {
    minX = Math.min(minX, b.x - b.w / 2)
    maxX = Math.max(maxX, b.x + b.w / 2)
    minY = Math.min(minY, b.y - b.h / 2)
    maxY = Math.max(maxY, b.y + b.h / 2)
  }
  for (const z of zones) {
    minX = Math.min(minX, z.x)
    maxX = Math.max(maxX, z.x + z.w)
    minY = Math.min(minY, z.y)
    maxY = Math.max(maxY, z.y + z.h)
  }
  const ox = MARGIN - minX
  const oy = MARGIN - minY
  for (const b of boxes.values()) {
    b.x += ox
    b.y += oy
  }
  for (const z of zones) {
    z.x += ox
    z.y += oy
  }

  const edges: EdgePath[] = []
  const seen = new Set<string>()
  spec.edges.forEach((e, i) => {
    const a = boxes.get(e.from)
    const b = boxes.get(e.to)
    if (!a || !b) return
    seen.add(`${e.from}>${e.to}`)
    const g = e.route === 'arc' ? arcEdge(a, b, 1) : orthoEdge(a, b, e.route === 'z' ? 'z' : 'x')
    edges.push({ key: `e${i}`, from: e.from, to: e.to, ...g, label: e.label, dashed: e.dashed })
  })
  // flujos de los pasos sin arista declarada → curva temporal punteada
  for (const st of spec.steps)
    for (const f of st.flows ?? []) {
      const [from, to] = parseFlow(f)
      if (from === to || seen.has(`${from}>${to}`) || seen.has(`${to}>${from}`)) continue
      const a = boxes.get(from)
      const b = boxes.get(to)
      if (!a || !b) continue
      seen.add(`${from}>${to}`)
      edges.push({ key: `t${from}>${to}`, from, to, ...arcEdge(a, b, -1), dashed: true, temp: true })
    }

  return { width: maxX - minX + MARGIN * 2, height: maxY - minY + MARGIN * 2, boxes, zones, edges }
}

/* ------------------------------------------------------------------------ */
/* Secuencia                                                                 */
/* ------------------------------------------------------------------------ */

export type SeqLane = { id: string; node: IsoNode; x: number }
export type SeqRow = { step: number; from: string; to: string; label: string; y: number; note?: boolean }
export type SeqLayout = { width: number; height: number; lanes: SeqLane[]; rows: SeqRow[]; headY: number; headH: number; laneW: number }

export const SEQ = { headY: 10, headH: 50, row: 34, first: 84 }

export function sequenceLayout(spec: IsoSpec): SeqLayout {
  const order = spec.lanes?.length
    ? spec.lanes.map((id) => spec.nodes.find((n) => n.id === id)).filter((n): n is IsoNode => !!n)
    : [...spec.nodes].sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1])
  const n = order.length
  const width = Math.max(760, n * 158)
  const mx = 84
  const lanes = order.map((node, i) => ({ id: node.id, node, x: n === 1 ? width / 2 : mx + (i * (width - 2 * mx)) / (n - 1) }))
  const laneW = Math.min(148, (width - 2 * mx) / Math.max(1, n - 1) - 12)

  const edgeLabel = (a: string, b: string) => spec.edges.find((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a))?.label
  const rows: SeqRow[] = []
  spec.steps.forEach((st, i) => {
    const flows = st.flows ?? []
    if (!flows.length) {
      const target = st.focus?.[0] ?? order[0]?.id
      rows.push({ step: i, from: target, to: target, label: st.title.replace(/^\d+\s*·\s*/, ''), y: 0, note: true })
      return
    }
    for (const f of flows) {
      const [a, b] = parseFlow(f)
      rows.push({ step: i, from: a, to: b, label: flowLabel(f) ?? edgeLabel(a, b) ?? '', y: 0 })
    }
  })
  rows.forEach((r, i) => (r.y = SEQ.first + i * SEQ.row + 14))
  return { width, height: SEQ.first + rows.length * SEQ.row + 18, lanes, rows, headY: SEQ.headY, headH: SEQ.headH, laneW }
}
