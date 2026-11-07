import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Hand, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useTheme } from '../../lib/theme'
import { LabelPortal, Scene, type CameraApi } from './Scene'
import type { IsoSpec } from './types'

/** Vista isométrica 3D (three.js). Se carga solo cuando el lector la activa. */
export default function Iso3D({
  spec,
  focus,
  flows,
  selected,
  onSelect,
  height,
  compact,
  reducedMotion,
}: {
  spec: IsoSpec
  focus: Set<string> | null
  flows: string[]
  selected: string | null
  onSelect: (id: string | null) => void
  height?: number
  compact: boolean
  reducedMotion: boolean
}) {
  const theme = useTheme()
  const cameraApi = useRef<CameraApi | null>(null)
  const labels = useRef<HTMLDivElement>(null)
  const [interactive, setInteractive] = useState(() => matchMedia('(pointer: fine)').matches)

  return (
    <div className="iso-canvas" style={{ height }}>
      <Canvas orthographic flat dpr={[1, 2]} camera={{ position: [40, 40, 40], zoom: 40, near: 0.1, far: 400 }} gl={{ antialias: true, alpha: true }}>
        <LabelPortal.Provider value={labels}>
          <Scene
            spec={spec}
            focus={focus}
            flows={flows}
            selected={selected}
            onSelect={onSelect}
            theme={theme}
            reducedMotion={reducedMotion}
            cameraApi={cameraApi}
            interactive={interactive}
            compact={compact}
          />
        </LabelPortal.Provider>
      </Canvas>
      <div ref={labels} className="iso-labels" />
      <div className="fw-3d-tools">
        <button
          className={`iso-tool${interactive ? ' is-on' : ''}`}
          onClick={() => setInteractive((v) => !v)}
          title={interactive ? 'Desactivar rotación (permite hacer scroll)' : 'Activar rotación 3D'}
          aria-pressed={interactive}
        >
          <Hand size={15} />
        </button>
        <button className="iso-tool" onClick={() => cameraApi.current?.zoomBy(1.2)} title="Acercar" aria-label="Acercar">
          <ZoomIn size={15} />
        </button>
        <button className="iso-tool" onClick={() => cameraApi.current?.zoomBy(1 / 1.2)} title="Alejar" aria-label="Alejar">
          <ZoomOut size={15} />
        </button>
        <button className="iso-tool" onClick={() => cameraApi.current?.reset()} title="Restablecer vista" aria-label="Restablecer vista">
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  )
}
