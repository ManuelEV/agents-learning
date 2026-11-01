import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Grid, Html, Line, OrbitControls, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Theme } from '../../lib/theme'
import { NodeIcon } from './icons'
import { TONE_COLOR, scenePalette } from './palette'
import {
  boundsPoints,
  edgePath,
  midpoint,
  nodeHeight,
  nodePos,
  parseFlow,
  pathLength,
  pointAt,
  type V3,
} from './geometry'
import type { IsoEdge, IsoNode, IsoSpec, IsoZone } from './types'

export interface CameraApi {
  zoomBy: (factor: number) => void
  reset: () => void
}

type NodeState = 'normal' | 'active' | 'dim'

interface SceneProps {
  spec: IsoSpec
  focus: Set<string> | null
  flows: string[]
  selected: string | null
  onSelect: (id: string | null) => void
  theme: Theme
  reducedMotion: boolean
  cameraApi: RefObject<CameraApi | null>
  interactive: boolean
  /** Lienzo estrecho: etiquetas solo con ícono salvo en nodos activos. */
  compact: boolean
}

/**
 * Contenedor DOM estable para las etiquetas <Html>. Sin él, drei cambia de contenedor
 * tras el primer render y el desmontaje diferido de la raíz anterior deja etiquetas vacías.
 */
export const LabelPortal = createContext<RefObject<HTMLDivElement | null> | undefined>(undefined)
function usePortal() {
  return useContext(LabelPortal) as RefObject<HTMLElement> | undefined
}

const ISO_DIR = new THREE.Vector3(1, 1, 1).normalize()
const UP = new THREE.Vector3(0, 1, 0)

export function Scene({ spec, focus, flows, selected, onSelect, theme, reducedMotion, cameraApi, interactive, compact }: SceneProps) {
  const pal = scenePalette(theme)
  const byId = useMemo(() => new Map(spec.nodes.map((n) => [n.id, n])), [spec])

  // Flujos del paso actual → recorridos animados.
  const flowPaths = useMemo(() => {
    const out: { key: string; path: V3[]; color: string; temp: boolean }[] = []
    for (const f of flows) {
      const [a, b] = parseFlow(f)
      const na = byId.get(a)
      const nb = byId.get(b)
      if (!na || !nb) continue
      const color = TONE_COLOR[na.tone ?? 'neutral']
      const fwd = spec.edges.find((e) => e.from === a && e.to === b)
      const rev = spec.edges.find((e) => e.from === b && e.to === a)
      if (fwd) out.push({ key: f, path: edgePath(na, nb, fwd.route), color, temp: false })
      else if (rev) out.push({ key: f, path: edgePath(nb, na, rev.route).slice().reverse(), color, temp: false })
      else out.push({ key: f, path: edgePath(na, nb, 'arc'), color, temp: true })
    }
    return out
  }, [flows, byId, spec.edges])

  const activeEdges = useMemo(() => {
    const set = new Map<string, string>()
    for (const f of flows) {
      const [a, b] = parseFlow(f)
      const color = TONE_COLOR[byId.get(a)?.tone ?? 'neutral']
      set.set(`${a}|${b}`, color)
      set.set(`${b}|${a}`, color)
    }
    return set
  }, [flows, byId])

  const center = useMemo(() => {
    const pts = boundsPoints(spec)
    const xs = pts.map((p) => p[0])
    const zs = pts.map((p) => p[2])
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2] as const
  }, [spec])

  return (
    <>
      <ambientLight intensity={1.35} />
      <directionalLight position={[3, 6, 4.5]} intensity={2.1} />
      <hemisphereLight args={['#ffffff', '#445066', 0.35]} />

      <Grid
        position={[center[0], -0.002, center[1]]}
        args={[80, 80]}
        cellSize={1}
        sectionSize={4}
        cellThickness={0.5}
        sectionThickness={0.9}
        cellColor={pal.grid}
        sectionColor={pal.section}
        fadeDistance={24}
        fadeStrength={2.6}
        fadeFrom={0}
        followCamera={false}
      />

      <group
        onPointerMissed={() => onSelect(null)}
      >
        {spec.zones?.map((z) => <Zone key={z.id} zone={z} opacity={pal.zoneOpacity} />)}

        {spec.edges.map((e) => {
          const a = byId.get(e.from)
          const b = byId.get(e.to)
          if (!a || !b) return null
          const activeColor = activeEdges.get(`${e.from}|${e.to}`)
          return (
            <Edge
              key={`${e.from}-${e.to}`}
              edge={e}
              a={a}
              b={b}
              color={activeColor ?? (focus ? pal.edgeDim : pal.edge)}
              active={!!activeColor}
              compact={compact}
            />
          )
        })}

        {flowPaths.map((f) => (
          <group key={f.key}>
            {f.temp && <Line points={f.path} color={f.color} lineWidth={2.2} dashed dashSize={0.18} gapSize={0.12} />}
            <FlowParticles path={f.path} color={f.color} reducedMotion={reducedMotion} />
          </group>
        ))}

        {spec.nodes.map((n) => {
          const state: NodeState =
            selected === n.id || focus?.has(n.id) ? 'active' : focus || selected ? 'dim' : 'normal'
          return (
            <Node
              key={n.id}
              node={n}
              state={state}
              padColor={pal.pad}
              reducedMotion={reducedMotion}
              onSelect={onSelect}
              compact={compact}
            />
          )
        })}
      </group>

      <CameraRig spec={spec} api={cameraApi} interactive={interactive} />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Cámara                                                                      */
/* -------------------------------------------------------------------------- */

function CameraRig({ spec, api, interactive }: { spec: IsoSpec; api: RefObject<CameraApi | null>; interactive: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const controls = useRef<OrbitControlsImpl>(null)
  const fit = useRef({ zoom: 40, target: new THREE.Vector3() })

  useLayoutEffect(() => {
    const pts = boundsPoints(spec)
    camera.position.copy(ISO_DIR).multiplyScalar(60)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    const inv = camera.matrixWorldInverse
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    const v = new THREE.Vector3()
    for (const p of pts) {
      v.set(p[0], p[1], p[2]).applyMatrix4(inv)
      minX = Math.min(minX, v.x)
      maxX = Math.max(maxX, v.x)
      minY = Math.min(minY, v.y)
      maxY = Math.max(maxY, v.y)
    }
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
    const target = right.multiplyScalar((minX + maxX) / 2).add(up.multiplyScalar((minY + maxY) / 2))
    const spanX = maxX - minX
    const spanY = maxY - minY
    const zoom = Math.min(size.width / (spanX * 1.08 + 0.6), size.height / (spanY * 1.08 + 0.6))
    fit.current = { zoom, target: target.clone() }
    camera.position.copy(target).addScaledVector(ISO_DIR, 60)
    camera.zoom = zoom
    camera.lookAt(target)
    camera.updateProjectionMatrix()
    const c = controls.current
    if (c) {
      c.target.copy(target)
      c.update()
      c.saveState()
    }
  }, [spec, size.width, size.height, camera])

  useEffect(() => {
    api.current = {
      zoomBy: (factor) => {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, fit.current.zoom * 0.5, fit.current.zoom * 3)
        camera.updateProjectionMatrix()
      },
      reset: () => {
        controls.current?.reset()
        camera.zoom = fit.current.zoom
        camera.updateProjectionMatrix()
      },
    }
  }, [api, camera])

  // Sin rotación activa, el lienzo deja pasar el scroll táctil.
  useEffect(() => {
    gl.domElement.style.touchAction = interactive ? 'none' : 'pan-y'
  }, [gl, interactive])

  const az = Math.PI / 4
  const polar = Math.acos(1 / Math.sqrt(3))
  return (
    <OrbitControls
      ref={controls}
      enabled={interactive}
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.55}
      minAzimuthAngle={az - 0.75}
      maxAzimuthAngle={az + 0.75}
      minPolarAngle={polar - 0.45}
      maxPolarAngle={polar + 0.3}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Zonas                                                                       */
/* -------------------------------------------------------------------------- */

function Zone({ zone, opacity }: { zone: IsoZone; opacity: number }) {
  const [x0, z0] = zone.from
  const [x1, z1] = zone.to
  const w = Math.abs(x1 - x0)
  const d = Math.abs(z1 - z0)
  const cx = (x0 + x1) / 2
  const cz = (z0 + z1) / 2
  const color = TONE_COLOR[zone.tone ?? 'neutral']
  const portal = usePortal()
  return (
    <group position={[cx, 0, cz]}>
      <RoundedBox args={[w, 0.05, d]} radius={0.02} smoothness={2} position={[0, 0.0, 0]}>
        <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.9} depthWrite={false} />
      </RoundedBox>
      <Line
        points={[
          [-w / 2, 0.03, -d / 2],
          [w / 2, 0.03, -d / 2],
          [w / 2, 0.03, d / 2],
          [-w / 2, 0.03, d / 2],
          [-w / 2, 0.03, -d / 2],
        ]}
        color={color}
        lineWidth={1.2}
        dashed
        dashSize={0.25}
        gapSize={0.15}
        transparent
        opacity={0.8}
      />
      <Html position={[-w / 2 + 0.2, 0.05, d / 2 - 0.2]} zIndexRange={[5, 0]} portal={portal}>
        <div className="iso-zone-label" style={{ ['--tone' as string]: color }}>
          {zone.label}
        </div>
      </Html>
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/* Aristas y flujos                                                            */
/* -------------------------------------------------------------------------- */

function Edge({
  edge,
  a,
  b,
  color,
  active,
  compact,
}: {
  edge: IsoEdge
  a: IsoNode
  b: IsoNode
  color: string
  active: boolean
  compact: boolean
}) {
  const path = useMemo(() => edgePath(a, b, edge.route), [a, b, edge.route])
  const arrow = useMemo(() => {
    const p1 = new THREE.Vector3(...path[path.length - 1])
    const p0 = new THREE.Vector3(...path[path.length - 2])
    const dir = p1.clone().sub(p0).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir)
    return { pos: p1.toArray() as V3, quat: q }
  }, [path])
  const mid = useMemo(() => midpoint(path), [path])
  const portal = usePortal()
  return (
    <group>
      <Line
        points={path}
        color={color}
        lineWidth={active ? 3.2 : 2.2}
        dashed={edge.dashed}
        dashSize={0.2}
        gapSize={0.14}
      />
      <mesh position={arrow.pos} quaternion={arrow.quat}>
        <coneGeometry args={[active ? 0.11 : 0.09, 0.26, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {edge.label && !compact && (
        <Html position={[mid[0], mid[1] + 0.12, mid[2]]} center zIndexRange={[6, 0]} portal={portal}>
          <div className={`iso-edge-label${active ? ' is-active' : ''}`}>{edge.label}</div>
        </Html>
      )}
    </group>
  )
}

function FlowParticles({ path, color, reducedMotion }: { path: V3[]; color: string; reducedMotion: boolean }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const len = useMemo(() => pathLength(path), [path])
  const count = Math.max(2, Math.min(5, Math.round(len / 1.4)))
  const tmp = useMemo<V3>(() => [0, 0, 0], [])
  useFrame(({ clock }) => {
    const speed = reducedMotion ? 0.6 : 2.4
    const base = (clock.elapsedTime * speed) / Math.max(len, 0.5)
    refs.current.forEach((m, i) => {
      if (!m) return
      const t = (base + i / count) % 1
      pointAt(path, t, tmp)
      m.position.set(tmp[0], tmp[1] + 0.05, tmp[2])
      const s = 0.75 + Math.sin(t * Math.PI) * 0.5
      m.scale.setScalar(s)
    })
  })
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)}>
          <sphereGeometry args={[0.1, 14, 10]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

/* -------------------------------------------------------------------------- */
/* Nodos                                                                       */
/* -------------------------------------------------------------------------- */

function useNodeMaterials(color: string, padColor: string) {
  return useMemo(() => {
    const base = new THREE.Color(color)
    const main = new THREE.MeshStandardMaterial({ color: base, roughness: 0.55, metalness: 0.05, transparent: true, emissive: base, emissiveIntensity: 0 })
    const accent = new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color('#000'), 0.3), roughness: 0.6, transparent: true })
    const light = new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color('#fff'), 0.45), roughness: 0.5, transparent: true })
    const pad = new THREE.MeshStandardMaterial({ color: padColor, roughness: 0.9, transparent: true, emissive: base, emissiveIntensity: 0 })
    return { main, accent, light, pad }
  }, [color, padColor])
}

function Node({
  node,
  state,
  padColor,
  reducedMotion,
  onSelect,
  compact,
}: {
  node: IsoNode
  state: NodeState
  padColor: string
  reducedMotion: boolean
  onSelect: (id: string) => void
  compact: boolean
}) {
  const color = TONE_COLOR[node.tone ?? 'neutral']
  const mats = useNodeMaterials(color, padColor)
  const lift = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const gl = useThree((s) => s.gl)
  const portal = usePortal()
  const s = node.scale ?? 1
  const shape = node.shape ?? 'box'
  const h = nodeHeight(node) - (node.elevation ?? 0)

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])

  useFrame(({ clock }, dt) => {
    const k = 1 - Math.pow(0.0015, dt)
    const active = state === 'active'
    const dim = state === 'dim'
    if (lift.current) {
      const ty = active ? 0.16 : 0
      lift.current.position.y += (ty - lift.current.position.y) * k
    }
    const targetOpacity = dim ? 0.28 : 1
    for (const m of [mats.main, mats.accent, mats.light]) m.opacity += (targetOpacity - m.opacity) * k
    mats.pad.opacity += ((dim ? 0.4 : 1) - mats.pad.opacity) * k
    const pulse = active && !reducedMotion ? 0.22 + Math.sin(clock.elapsedTime * 3) * 0.08 : active ? 0.22 : 0
    mats.main.emissiveIntensity += (pulse - mats.main.emissiveIntensity) * k
    mats.pad.emissiveIntensity += ((active ? 0.55 : 0) - mats.pad.emissiveIntensity) * k
    if (spin.current && !reducedMotion) spin.current.rotation.y += dt * 0.5
    if (ring.current) {
      const m = ring.current.material as THREE.MeshBasicMaterial
      const sc = active ? 1 + ((clock.elapsedTime * 0.8) % 1) * 0.6 : 1
      ring.current.scale.setScalar(sc)
      m.opacity = active ? 0.6 * (1 - ((clock.elapsedTime * 0.8) % 1)) : 0
    }
  })

  const [x, y, z] = nodePos(node)
  const labelState = state === 'dim' ? ' is-dim' : state === 'active' ? ' is-active' : ''
  const iconOnly = compact && state !== 'active' && !!node.icon

  return (
    <group
      position={[x, y, z]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        gl.domElement.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = ''
      }}
    >
      {/* Pilar bajo nodos elevados (efecto "plataforma") */}
      {y > 0.05 && (
        <mesh position={[0, -y / 2, 0]} material={mats.pad}>
          <boxGeometry args={[1.45 * s, y, 1.45 * s]} />
        </mesh>
      )}
      {/* Base / baldosa */}
      <RoundedBox args={[1.55 * s, 0.06, 1.55 * s]} radius={0.025} smoothness={2} position={[0, 0.03, 0]} material={mats.pad} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.065, 0]}>
        <ringGeometry args={[0.78 * s, 0.86 * s, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} />
      </mesh>

      <group ref={lift}>
        <group scale={s}>
          <ShapeMesh shape={shape} mats={mats} spinRef={spin} />
        </group>
      </group>

      <Html position={[0, h + 0.32, 0]} center zIndexRange={[10, 0]} portal={portal}>
        <button
          type="button"
          className={`iso-label${labelState}${iconOnly ? ' is-icon' : ''}${compact ? ' is-compact' : ''}`}
          title={node.label}
          style={{ ['--tone' as string]: color }}
          onClick={(e) => {
            e.stopPropagation()
            onSelect(node.id)
          }}
        >
          {node.icon && <NodeIcon name={node.icon} />}
          {!iconOnly && (
            <span className="iso-label-text">
              <span className="iso-label-main">{node.label}</span>
              {node.sub && !compact && <span className="iso-label-sub">{node.sub}</span>}
            </span>
          )}
        </button>
      </Html>
    </group>
  )
}

type Mats = ReturnType<typeof useNodeMaterials>

function ShapeMesh({ shape, mats, spinRef }: { shape: string; mats: Mats; spinRef: RefObject<THREE.Group | null> }) {
  switch (shape) {
    case 'tall':
      return (
        <group>
          <RoundedBox args={[0.95, 1.38, 0.95]} radius={0.07} smoothness={3} position={[0, 0.75, 0]} material={mats.main} />
          {[0.45, 0.8, 1.15].map((yy) => (
            <mesh key={yy} position={[0, yy, 0.48]} material={mats.light}>
              <boxGeometry args={[0.6, 0.06, 0.02]} />
            </mesh>
          ))}
        </group>
      )
    case 'cylinder':
      return (
        <group>
          <mesh position={[0, 0.5, 0]} material={mats.main}>
            <cylinderGeometry args={[0.55, 0.55, 0.84, 40]} />
          </mesh>
          {[0.36, 0.64].map((yy) => (
            <mesh key={yy} position={[0, yy, 0]} material={mats.accent}>
              <cylinderGeometry args={[0.565, 0.565, 0.035, 40]} />
            </mesh>
          ))}
          <mesh position={[0, 0.925, 0]} material={mats.light}>
            <cylinderGeometry args={[0.55, 0.55, 0.01, 40]} />
          </mesh>
        </group>
      )
    case 'stack':
      return (
        <group>
          {[0.17, 0.45, 0.73].map((yy, i) => (
            <mesh key={yy} position={[0, yy, 0]} material={i === 2 ? mats.light : mats.main}>
              <cylinderGeometry args={[0.58, 0.58, 0.2, 6]} />
            </mesh>
          ))}
        </group>
      )
    case 'sphere':
      return (
        <group>
          <mesh position={[0, 0.1, 0]} material={mats.accent}>
            <cylinderGeometry args={[0.3, 0.42, 0.12, 6]} />
          </mesh>
          <group ref={spinRef} position={[0, 0.78, 0]}>
            <mesh material={mats.main}>
              <icosahedronGeometry args={[0.52, 0]} />
            </mesh>
          </group>
        </group>
      )
    case 'person':
      return (
        <group>
          <mesh position={[0, 0.52, 0]} material={mats.main}>
            <capsuleGeometry args={[0.26, 0.4, 6, 16]} />
          </mesh>
          <mesh position={[0, 1.08, 0]} material={mats.light}>
            <sphereGeometry args={[0.2, 20, 16]} />
          </mesh>
        </group>
      )
    case 'diamond':
      return (
        <group position={[0, 0.62, 0]} scale={[1, 0.9, 1]}>
          <mesh material={mats.main}>
            <octahedronGeometry args={[0.6, 0]} />
          </mesh>
        </group>
      )
    case 'hex':
      return (
        <group>
          <mesh position={[0, 0.24, 0]} material={mats.main}>
            <cylinderGeometry args={[0.64, 0.64, 0.42, 6]} />
          </mesh>
          <mesh position={[0, 0.47, 0]} material={mats.light}>
            <cylinderGeometry args={[0.4, 0.5, 0.06, 6]} />
          </mesh>
        </group>
      )
    case 'doc':
      return (
        <group>
          {[0, 1, 2].map((i) => (
            <RoundedBox
              key={i}
              args={[0.78, 0.08, 0.98]}
              radius={0.02}
              smoothness={2}
              position={[-0.08 + i * 0.08, 0.08 + i * 0.13, 0.08 - i * 0.08]}
              material={i === 2 ? mats.light : mats.main}
            />
          ))}
        </group>
      )
    case 'cloud':
      return (
        <group position={[0, 0.1, 0]}>
          {(
            [
              [-0.32, 0.3, 0.05, 0.34],
              [0.3, 0.3, -0.05, 0.36],
              [0, 0.5, 0, 0.4],
              [0.02, 0.28, 0.3, 0.3],
            ] as const
          ).map(([px, py, pz, r], i) => (
            <mesh key={i} position={[px, py, pz]} material={i === 2 ? mats.light : mats.main}>
              <sphereGeometry args={[r, 20, 14]} />
            </mesh>
          ))}
        </group>
      )
    default:
      return (
        <group>
          <RoundedBox args={[1.12, 0.66, 1.12]} radius={0.08} smoothness={3} position={[0, 0.4, 0]} material={mats.main} />
          <RoundedBox args={[0.7, 0.05, 0.7]} radius={0.02} smoothness={2} position={[0, 0.745, 0]} material={mats.light} />
        </group>
      )
  }
}
