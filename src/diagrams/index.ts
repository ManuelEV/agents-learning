import type { IsoSpec } from '../components/iso/types'
import { DIAGRAM_FILES } from './manifest'

/**
 * Registro de diagramas con carga diferida: cada `src/diagrams/*.ts` es su propio
 * chunk y una página solo descarga los archivos de los diagramas que muestra.
 * `manifest.ts` (id → archivo) lo regenera `node scripts/check-diagrams.mjs`.
 * Si un id no está en el manifiesto, se cargan todos los archivos (más lento, pero no falla).
 */
const loaders = import.meta.glob<Record<string, unknown>>(['./*.ts', '!./index.ts', '!./manifest.ts'])

const cache = new Map<string, IsoSpec>()

function isSpec(v: unknown): v is IsoSpec {
  return !!v && typeof v === 'object' && 'nodes' in v && 'steps' in v && 'id' in v
}

export async function loadDiagrams(ids: string[]): Promise<IsoSpec[]> {
  const pending = ids.filter((id) => !cache.has(id))
  if (pending.length) {
    const known = pending.every((id) => DIAGRAM_FILES[id])
    const paths = known ? [...new Set(pending.map((id) => `./${DIAGRAM_FILES[id]}.ts`))] : Object.keys(loaders)
    const mods = await Promise.all(paths.filter((p) => loaders[p]).map((p) => loaders[p]()))
    for (const mod of mods) for (const v of Object.values(mod)) if (isSpec(v)) cache.set(v.id, v)
  }
  return ids.map((id) => cache.get(id)).filter((s): s is IsoSpec => !!s)
}
