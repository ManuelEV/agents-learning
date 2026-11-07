import { diagrams } from '../../diagrams'
import Walkthrough from '../flow/Walkthrough'

export default function LazyDiagram({ ids }: { ids: string[] }) {
  const specs = ids.map((id) => diagrams[id]).filter(Boolean)
  if (specs.length === 0) {
    return <div className="iso-error">Diagrama no encontrado: {ids.join(', ')}</div>
  }
  return <Walkthrough specs={specs} />
}
