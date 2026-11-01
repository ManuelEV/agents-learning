import type { IsoSpec } from '../components/iso/types'

/**
 * Registro automático: cada archivo `src/diagrams/*.ts` exporta uno o más IsoSpec.
 * Se indexan por `spec.id`.
 */
const modules = import.meta.glob<Record<string, unknown>>('./*.ts', { eager: true })

export const diagrams: Record<string, IsoSpec> = {}
for (const [file, mod] of Object.entries(modules)) {
  if (file.endsWith('index.ts')) continue
  for (const value of Object.values(mod)) {
    if (value && typeof value === 'object' && 'nodes' in value && 'steps' in value && 'id' in value) {
      const spec = value as IsoSpec
      if (diagrams[spec.id]) console.warn(`Diagrama duplicado: ${spec.id}`)
      diagrams[spec.id] = spec
    }
  }
}
