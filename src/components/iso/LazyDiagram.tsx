import { useEffect, useState } from 'react'
import { loadDiagrams } from '../../diagrams'
import Walkthrough from '../flow/Walkthrough'
import type { IsoSpec } from './types'

export default function LazyDiagram({ ids }: { ids: string[] }) {
  const key = ids.join('|')
  const [specs, setSpecs] = useState<IsoSpec[] | null>(null)

  useEffect(() => {
    let alive = true
    setSpecs(null)
    loadDiagrams(key.split('|')).then((s) => alive && setSpecs(s))
    return () => {
      alive = false
    }
  }, [key])

  if (!specs) {
    return (
      <div className="iso-placeholder" style={{ minHeight: 420 }}>
        <div className="iso-placeholder-cube" />
        <span>Cargando diagrama…</span>
      </div>
    )
  }
  if (specs.length === 0) return <div className="iso-error">Diagrama no encontrado: {ids.join(', ')}</div>
  return <Walkthrough specs={specs} />
}
