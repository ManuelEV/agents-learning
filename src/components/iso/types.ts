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

/** Lenguajes del resaltador del panel de código. */
export type CodeLang = 'python' | 'ts' | 'js' | 'json' | 'bash' | 'http' | 'yaml' | 'text'

/** Archivo de código que el diagrama recorre paso a paso. */
export interface CodeFile {
  title: string
  lang: CodeLang
  source: string
}

/** Bloques de la Messages API (Anthropic). Otros proveedores usan nombres distintos, misma idea. */
export type MsgBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: unknown; is_error?: boolean }

export interface ApiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | MsgBlock[]
  /** Nota corta junto al rol (p. ej. "llamada 2"). */
  note?: string
}

/**
 * Dato concreto que viaja en el paso: un payload (JSON, HTTP, YAML…) o el arreglo `messages`.
 * `hl` resalta las líneas que contienen alguno de esos textos (payload) o los índices de mensajes.
 */
export type StepData =
  | { title: string; lang: CodeLang; content: string; hl?: string[] }
  | { title: string; messages: ApiMessage[]; hl?: number[]; newFrom?: number }

/** Líneas del código que ejecuta el paso. `hl`: textos a buscar o números de línea (1-based). */
export interface StepCode {
  /** Clave en `spec.code`. Por defecto, el primer archivo. */
  file?: string
  hl: (string | number)[]
}

export interface IsoStep {
  title: string
  body: string
  /** Nodos destacados. Si se omite, se usan los extremos de `flows`. */
  focus?: string[]
  /**
   * Flujos animados en formato "origen>destino". Admite etiqueta opcional:
   * "agent>model: messages.create" (se muestra en la flecha del diagrama de secuencia).
   */
  flows?: string[]
  /** Payload o mensajes que viajan en este paso (pestaña "Datos"). */
  data?: StepData
  /** Líneas de código que corresponden a este paso (pestaña "Código"). */
  code?: StepCode
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
  /** Alto del lienzo en px (por defecto 460). Solo aplica a la vista 3D. */
  height?: number
  /**
   * Tipo de diagrama 2D: `flow` (cajas y flechas, por defecto) o `sequence`
   * (carriles verticales con mensajes en orden; ideal para protocolos).
   */
  layout?: 'flow' | 'sequence'
  /** Solo `sequence`: orden de los carriles (ids de nodos). Por defecto, todos los nodos por `at[0]`. */
  lanes?: string[]
  /** Archivos de código que los pasos resaltan (clave → archivo). */
  code?: Record<string, CodeFile>
}
