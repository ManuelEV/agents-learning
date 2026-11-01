import type { Theme } from '../../lib/theme'
import type { Tone } from './types'

/** Color base por "tono" semántico (igual en ambos temas). */
export const TONE_COLOR: Record<Tone, string> = {
  user: '#f2b632',
  agent: '#5b7cfa',
  model: '#b45ae0',
  tool: '#1fb894',
  data: '#3a9bef',
  gateway: '#f0782f',
  infra: '#8b95a5',
  guard: '#ef4f5a',
  protocol: '#1fb6d0',
  memory: '#e05aa8',
  neutral: '#a3acb9',
}

export const TONE_LABEL: Record<Tone, string> = {
  user: 'Usuario / canal',
  agent: 'Agente',
  model: 'Modelo (LLM)',
  tool: 'Herramienta',
  data: 'Datos / conocimiento',
  gateway: 'Gateway',
  infra: 'Infraestructura',
  guard: 'Seguridad / guardrail',
  protocol: 'Protocolo',
  memory: 'Memoria / estado',
  neutral: 'Otro',
}

export function scenePalette(theme: Theme) {
  return theme === 'dark'
    ? { edge: '#8a95aa', edgeDim: '#3b4456', pad: '#2a3142', grid: '#181e2c', section: '#232b3c', zoneOpacity: 0.16 }
    : { edge: '#7d889b', edgeDim: '#cdd3dc', pad: '#dfe4ec', grid: '#e8ebf1', section: '#d9dee7', zoneOpacity: 0.14 }
}
