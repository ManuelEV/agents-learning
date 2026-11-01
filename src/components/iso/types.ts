/**
 * Especificación declarativa de un diagrama isométrico.
 *
 * Coordenadas: `at: [x, z]` sobre el plano del suelo.
 *  - x crece hacia abajo-derecha en pantalla (eje "de flujo").
 *  - z crece hacia abajo-izquierda (eje de "carriles"); z negativo va arriba-derecha.
 * Una unidad ≈ el ancho de un nodo; usa separaciones de 2.5–3.5 entre nodos.
 */
export type Tone =
  | 'user'
  | 'agent'
  | 'model'
  | 'tool'
  | 'data'
  | 'gateway'
  | 'infra'
  | 'guard'
  | 'protocol'
  | 'memory'
  | 'neutral'

export type Shape =
  | 'box'
  | 'tall'
  | 'cylinder'
  | 'stack'
  | 'sphere'
  | 'person'
  | 'diamond'
  | 'hex'
  | 'doc'
  | 'cloud'

export type IconName =
  | 'user'
  | 'users'
  | 'bot'
  | 'brain'
  | 'wrench'
  | 'database'
  | 'network'
  | 'shield'
  | 'server'
  | 'cloud'
  | 'file'
  | 'search'
  | 'layers'
  | 'workflow'
  | 'key'
  | 'eye'
  | 'branch'
  | 'message'
  | 'gauge'
  | 'cpu'
  | 'globe'
  | 'lock'
  | 'boxes'
  | 'scroll'
  | 'plug'
  | 'router'
  | 'sparkles'
  | 'book'
  | 'timer'
  | 'check'
  | 'code'
  | 'mail'
  | 'chart'
  | 'list'
  | 'repeat'
  | 'split'
  | 'merge'
  | 'flag'
  | 'hand'
  | 'zap'
  | 'terminal'
  | 'card'
  | 'link'
  | 'filter'
  | 'trophy'
  | 'graduation'

export interface IsoNode {
  id: string
  label: string
  /** Texto secundario bajo la etiqueta (p. ej. el producto concreto). */
  sub?: string
  at: [number, number]
  shape?: Shape
  tone?: Tone
  icon?: IconName
  /** Escala uniforme del nodo (1 = normal). */
  scale?: number
  /** Altura extra sobre el suelo (para "niveles"). */
  elevation?: number
  /** Descripción que aparece al hacer clic en el nodo. */
  info?: string
}

export interface IsoZone {
  id: string
  label: string
  from: [number, number]
  to: [number, number]
  tone?: Tone
}

export interface IsoEdge {
  from: string
  to: string
  label?: string
  /** 'x' = primero a lo largo de x (por defecto), 'z' = primero a lo largo de z, 'arc' = arco aéreo. */
  route?: 'x' | 'z' | 'arc'
  dashed?: boolean
}

export interface IsoStep {
  title: string
  body: string
  /** Nodos destacados. Si se omite, se usan los extremos de `flows`. */
  focus?: string[]
  /** Flujos animados en formato "origen>destino". */
  flows?: string[]
}

export interface IsoSpec {
  id: string
  title: string
  /** Texto de la vista general (antes del paso 1). */
  summary: string
  nodes: IsoNode[]
  edges: IsoEdge[]
  zones?: IsoZone[]
  steps: IsoStep[]
  /** Alto del lienzo en px (por defecto 460). */
  height?: number
}
