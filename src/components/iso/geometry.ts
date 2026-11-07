import type { IsoEdge, IsoNode, IsoSpec, Shape } from './types'

export type V3 = [number, number, number]

/** Radio aproximado de la huella de cada forma sobre el suelo. */
const FOOTPRINT: Record<Shape, number> = {
  box: 0.62,
  tall: 0.55,
  cylinder: 0.58,
  stack: 0.6,
  sphere: 0.55,
  person: 0.42,
  diamond: 0.6,
  hex: 0.62,
  doc: 0.55,
  cloud: 0.7,
}

/** Altura visual de cada forma (para colocar etiquetas). */
const HEIGHT: Record<Shape, number> = {
  box: 0.75,
  tall: 1.45,
  cylinder: 0.9,
  stack: 0.85,
  sphere: 1.45,
  person: 1.25,
  diamond: 1.25,
  hex: 0.55,
  doc: 0.5,
  cloud: 0.8,
}

export const EDGE_Y = 0.07

export function footprint(n: IsoNode) {
  return FOOTPRINT[n.shape ?? 'box'] * (n.scale ?? 1)
}

export function nodeHeight(n: IsoNode) {
  return HEIGHT[n.shape ?? 'box'] * (n.scale ?? 1) + (n.elevation ?? 0)
}

export function nodePos(n: IsoNode): V3 {
  return [n.at[0], n.elevation ?? 0, n.at[1]]
}

/**
 * Ruta de una arista: polilínea "Manhattan" sobre el suelo (estilo isométrico)
 * o arco aéreo. Los extremos se recortan para no entrar en los nodos.
 */
export function edgePath(a: IsoNode, b: IsoNode, route: IsoEdge['route'] = 'x'): V3[] {
  const [ax, az] = a.at
  const [bx, bz] = b.at
  const ra = footprint(a) + 0.08
  const rb = footprint(b) + 0.14
  const ya = (a.elevation ?? 0) + EDGE_Y
  const yb = (b.elevation ?? 0) + EDGE_Y

  if (route === 'arc') {
    const dx = bx - ax
    const dz = bz - az
    const len = Math.hypot(dx, dz) || 1
    const ux = dx / len
    const uz = dz / len
    const start: V3 = [ax + ux * ra, ya + 0.4, az + uz * ra]
    const end: V3 = [bx - ux * rb, yb + 0.4, bz - uz * rb]
    const lift = 0.9 + len * 0.18
    const pts: V3[] = []
    for (let i = 0; i <= 32; i++) {
      const t = i / 32
      const x = start[0] + (end[0] - start[0]) * t
      const z = start[2] + (end[2] - start[2]) * t
      const y = start[1] + (end[1] - start[1]) * t + Math.sin(Math.PI * t) * lift
      pts.push([x, y, z])
    }
    return pts
  }

  const sameX = Math.abs(ax - bx) < 0.01
  const sameZ = Math.abs(az - bz) < 0.01
  if (sameX || sameZ) {
    const dx = Math.sign(bx - ax)
    const dz = Math.sign(bz - az)
    return [
      [ax + dx * ra, ya, az + dz * ra],
      [bx - dx * rb, yb, bz - dz * rb],
    ]
  }

  if (route === 'z') {
    const dz = Math.sign(bz - az)
    const dx = Math.sign(bx - ax)
    return [
      [ax, ya, az + dz * ra],
      [ax, ya, bz],
      [bx - dx * rb, yb, bz],
    ]
  }
  const dx = Math.sign(bx - ax)
  const dz = Math.sign(bz - az)
  return [
    [ax + dx * ra, ya, az],
    [bx, ya, az],
    [bx, yb, bz - dz * rb],
  ]
}

export function pathLength(path: V3[]) {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const [x0, y0, z0] = path[i - 1]
    const [x1, y1, z1] = path[i]
    total += Math.hypot(x1 - x0, y1 - y0, z1 - z0)
  }
  return total
}

/** Punto a la fracción t ∈ [0,1] del recorrido. */
export function pointAt(path: V3[], t: number, out: V3 = [0, 0, 0]): V3 {
  const total = pathLength(path)
  let target = Math.max(0, Math.min(1, t)) * total
  for (let i = 1; i < path.length; i++) {
    const [x0, y0, z0] = path[i - 1]
    const [x1, y1, z1] = path[i]
    const seg = Math.hypot(x1 - x0, y1 - y0, z1 - z0)
    if (target <= seg || i === path.length - 1) {
      const k = seg === 0 ? 0 : Math.min(1, target / seg)
      out[0] = x0 + (x1 - x0) * k
      out[1] = y0 + (y1 - y0) * k
      out[2] = z0 + (z1 - z0) * k
      return out
    }
    target -= seg
  }
  return out
}

export function midpoint(path: V3[]): V3 {
  return pointAt(path, 0.5)
}

export function parseFlow(flow: string): [string, string] {
  const [from, to] = flow.split(':')[0].split('>').map((s) => s.trim())
  return [from, to]
}

/** Etiqueta opcional de un flujo "a>b: etiqueta". */
export function flowLabel(flow: string): string | undefined {
  const i = flow.indexOf(':')
  return i >= 0 ? flow.slice(i + 1).trim() || undefined : undefined
}

/** Nodos destacados de un paso. */
export function stepFocus(spec: IsoSpec, stepIndex: number): Set<string> | null {
  const step = spec.steps[stepIndex]
  if (!step) return null
  if (step.focus) return new Set(step.focus)
  const ids = new Set<string>()
  for (const f of step.flows ?? []) {
    const [a, b] = parseFlow(f)
    ids.add(a)
    ids.add(b)
  }
  return ids
}

/** Puntos que delimitan el contenido (para encuadrar la cámara). */
export function boundsPoints(spec: IsoSpec): V3[] {
  const pts: V3[] = []
  for (const n of spec.nodes) {
    const r = footprint(n) + 0.3
    const h = nodeHeight(n) + 0.9
    const [x, y, z] = nodePos(n)
    pts.push([x - r, y, z - r], [x + r, y, z + r], [x - r, y, z + r], [x + r, y, z - r], [x, y + h, z])
  }
  for (const zone of spec.zones ?? []) {
    const [x0, z0] = zone.from
    const [x1, z1] = zone.to
    pts.push([x0, 0, z0], [x1, 0, z1], [x0, 0, z1], [x1, 0, z0], [x0, 0.6, z0])
  }
  for (const e of spec.edges) {
    if (e.route !== 'arc') continue
    const a = spec.nodes.find((n) => n.id === e.from)
    const b = spec.nodes.find((n) => n.id === e.to)
    if (a && b) pts.push(midpoint(edgePath(a, b, 'arc')))
  }
  return pts
}
