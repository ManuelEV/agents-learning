import { diagrams } from '../../diagrams'
import IsoDiagram from './IsoDiagram'

export default function LazyDiagram({ ids }: { ids: string[] }) {
  const specs = ids.map((id) => diagrams[id]).filter(Boolean)
  if (specs.length === 0) {
    return <div className="iso-error">Diagrama no encontrado: {ids.join(', ')}</div>
  }
  return <IsoDiagram specs={specs} />
}
