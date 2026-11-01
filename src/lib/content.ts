import type { ComponentType } from 'react'

export type SectionId = 'inicio' | 'fundamentos' | 'conectar' | 'frameworks' | 'plataformas' | 'arquitecturas' | 'casos' | 'produccion'

export interface Reference {
  title: string
  url: string
  /** Organización o autor (p. ej. "Anthropic", "AWS Docs"). */
  org: string
  /** Fecha de publicación o versión, si aplica. */
  date?: string
  note?: string
}

export interface PostMeta {
  slug: string
  title: string
  description: string
  section: SectionId
  order: number
  readingMinutes: number
  level: 'básico' | 'intermedio' | 'avanzado'
  tags?: string[]
  references: Reference[]
}

export const SECTIONS: { id: SectionId; title: string; blurb: string }[] = [
  { id: 'inicio', title: 'Empieza aquí', blurb: 'Panorama del ecosistema y ruta de aprendizaje.' },
  { id: 'fundamentos', title: 'Fundamentos', blurb: 'Qué es un agente, patrones de diseño y context engineering.' },
  { id: 'conectar', title: 'Conocimiento y protocolos', blurb: 'RAG, MCP, A2A y gateways: cómo el agente accede al mundo.' },
  { id: 'frameworks', title: 'Frameworks', blurb: 'ADK, Strands, LangGraph y el resto del ecosistema, comparados.' },
  { id: 'plataformas', title: 'Plataformas cloud', blurb: 'AWS Bedrock/AgentCore, Google Agent Platform, Microsoft Foundry, Cloudflare.' },
  { id: 'arquitecturas', title: 'Arquitecturas de referencia', blurb: 'Ejemplos completos de extremo a extremo con diagramas paso a paso.' },
  { id: 'casos', title: 'Casos reales', blurb: 'Empresas que ya operan agentes a gran escala: qué construyeron, cómo y qué aprendieron.' },
  { id: 'produccion', title: 'Producción', blurb: 'Evaluación, observabilidad, seguridad y orquestación avanzada.' },
]

const metaModules = import.meta.glob<{ meta: PostMeta }>('../content/*.meta.ts', { eager: true })
const contentModules = import.meta.glob<{ default: ComponentType }>('../content/*.mdx')

export const posts: PostMeta[] = Object.values(metaModules)
  .map((m) => m.meta)
  .sort((a, b) => {
    const sa = SECTIONS.findIndex((s) => s.id === a.section)
    const sb = SECTIONS.findIndex((s) => s.id === b.section)
    return sa - sb || a.order - b.order
  })

export function getPost(slug: string) {
  return posts.find((p) => p.slug === slug)
}

export function loadPostContent(slug: string) {
  const loader = contentModules[`../content/${slug}.mdx`]
  return loader ? loader() : Promise.reject(new Error(`Contenido no encontrado: ${slug}`))
}

export function postsBySection(section: SectionId) {
  return posts.filter((p) => p.section === section)
}

export function adjacentPosts(slug: string) {
  const i = posts.findIndex((p) => p.slug === slug)
  return { prev: i > 0 ? posts[i - 1] : undefined, next: i >= 0 && i < posts.length - 1 ? posts[i + 1] : undefined }
}
