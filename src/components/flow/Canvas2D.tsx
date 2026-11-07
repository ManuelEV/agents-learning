import { useMemo } from 'react'
import { ICONS } from '../iso/icons'
import { parseFlow } from '../iso/geometry'
import type { IsoNode, IsoSpec } from '../iso/types'
import { flowLayout, sequenceLayout, type Box } from './layout'

type CanvasProps = {
  spec: IsoSpec
  step: number
  focus: Set<string> | null
  flows: string[]
  selected: string | null
  onSelect: (id: string | null) => void
  onPickStep: (i: number) => void
  reducedMotion: boolean
}

function NodeShape({ b }: { b: Box }) {
  const { x, y, w, h, node } = b
  const x0 = x - w / 2
  const y0 = y - h / 2
  const shape = node.shape ?? 'box'
  if (shape === 'diamond' || shape === 'hex') {
    const c = shape === 'diamond' ? 14 : 10
    const pts = `${x0 + c},${y0} ${x0 + w - c},${y0} ${x0 + w},${y} ${x0 + w - c},${y0 + h} ${x0 + c},${y0 + h} ${x0},${y}`
    return (
      <>
        <polygon className="halo" points={pts} transform={`translate(${x} ${y}) scale(${(w + 10) / w} ${(h + 10) / h}) translate(${-x} ${-y})`} />
        <polygon className="box" points={pts} />
      </>
    )
  }
  const rx = shape === 'person' || shape === 'sphere' ? h / 2 : shape === 'cloud' ? 18 : 10
  const stacked = shape === 'cylinder' || shape === 'stack' || shape === 'doc'
  return (
    <>
      <rect className="halo" x={x0 - 5} y={y0 - 5} width={w + 10} height={h + 10} rx={rx + 5} />
      {stacked && <rect className="box back" x={x0 + 5} y={y0 - 5} width={w} height={h} rx={rx} />}
      <rect className="box" x={x0} y={y0} width={w} height={h} rx={rx} />
    </>
  )
}

function NodeView({ b, active, dim, selected, onClick }: { b: Box; active: boolean; dim: boolean; selected: boolean; onClick: () => void }) {
  const { x, y, w, h, node } = b
  const x0 = x - w / 2
  const y0 = y - h / 2
  const Icon = node.icon ? ICONS[node.icon] : null
  const round = node.shape === 'person' || node.shape === 'sphere'
  const tx = x0 + (Icon ? (round ? 46 : 42) : round ? 20 : 16)
  return (
    <g
      className={`fw-node${active ? ' is-active' : ''}${dim ? ' is-dim' : ''}${selected ? ' is-selected' : ''}`}
      data-tone={node.tone ?? 'neutral'}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      role="button"
      aria-label={`${node.label}${node.sub ? ` (${node.sub})` : ''}`}
    >
      <NodeShape b={b} />
      {!round && node.shape !== 'diamond' && node.shape !== 'hex' && <rect className="bar" x={x0} y={y0 + 9} width={3.5} height={h - 18} rx={2} />}
      {Icon && <Icon x={x0 + (round ? 18 : 14)} y={y - 9} width={18} height={18} className="icon" strokeWidth={2.2} />}
      <text className="lbl" x={tx} y={node.sub ? y - 3 : y + 5}>
        {node.label}
      </text>
      {node.sub && (
        <text className="sub" x={tx} y={y + 14}>
          {node.sub}
        </text>
      )}
    </g>
  )
}

function Packet({ d, reverse, delay = 0 }: { d: string; reverse: boolean; delay?: number }) {
  return (
    <circle r={5.5} className="fw-packet">
      <animateMotion dur="1.3s" begin={`${delay}s`} repeatCount="indefinite" path={d} keyPoints={reverse ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear" />
    </circle>
  )
}

export function FlowCanvas({ spec, focus, flows, selected, onSelect, reducedMotion }: CanvasProps) {
  const L = useMemo(() => flowLayout(spec), [spec])
  const pairs = flows.map(parseFlow)
  const flowOf = (a: string, b: string) => pairs.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a))
  const toneOf = (id: string) => L.boxes.get(id)?.node.tone ?? 'neutral'

  return (
    <svg
      className="fw-svg"
      viewBox={`0 0 ${L.width} ${L.height}`}
      style={{ minWidth: Math.min(L.width, 720) }}
      role="img"
      aria-label={spec.title}
      onClick={() => onSelect(null)}
    >
      {L.zones.map((z) => (
        <g key={z.zone.id} className="fw-zone" data-tone={z.zone.tone ?? 'neutral'}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={14} />
          <text x={z.x + 12} y={z.y + 18}>
            {z.zone.label}
          </text>
        </g>
      ))}
      {L.edges.map((e) => {
        const fi = flowOf(e.from, e.to)
        const on = fi >= 0
        if (e.temp && !on) return null
        const reverse = on && pairs[fi][0] === e.to
        const src = reverse ? e.to : e.from
        const dim = focus && !on
        const lw = (e.label?.length ?? 0) * 6.3 + 12
        return (
          <g
            key={e.key}
            className={`fw-edge${on ? ' is-active' : ''}${e.dashed ? ' is-dashed' : ''}${dim ? ' is-dim' : ''}`}
            data-tone={toneOf(src)}
          >
            <path className="line" d={e.d} />
            <polygon className="arrow" points={e.arrow} />
            {e.label && (
              <g className="elabel">
                <rect x={e.mid.x - lw / 2} y={e.mid.y - 9} width={lw} height={18} rx={5} />
                <text x={e.mid.x} y={e.mid.y + 4} textAnchor="middle">
                  {e.label}
                </text>
              </g>
            )}
            {on && !reducedMotion && <Packet d={e.d} reverse={reverse} delay={fi * 0.18} />}
          </g>
        )
      })}
      {[...L.boxes.values()].map((b) => {
        const active = !!focus?.has(b.id)
        return (
          <NodeView
            key={b.id}
            b={b}
            active={active || selected === b.id}
            dim={!!focus && !active && selected !== b.id}
            selected={selected === b.id}
            onClick={() => onSelect(selected === b.id ? null : b.id)}
          />
        )
      })}
    </svg>
  )
}

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, Math.max(4, max - 1))}…` : s
}

export function SequenceCanvas({ spec, step, selected, onSelect, onPickStep, reducedMotion }: CanvasProps) {
  const L = useMemo(() => sequenceLayout(spec), [spec])
  const laneX = new Map(L.lanes.map((l) => [l.id, l.x]))
  const node = new Map<string, IsoNode>(spec.nodes.map((n) => [n.id, n]))
  const cur = new Set(L.rows.filter((r) => r.step === step).flatMap((r) => [r.from, r.to]))

  return (
    <svg
      className="fw-svg fw-seq"
      viewBox={`0 0 ${L.width} ${L.height}`}
      style={{ minWidth: Math.min(L.width, 720) }}
      role="img"
      aria-label={`Diagrama de secuencia: ${spec.title}`}
      onClick={() => onSelect(null)}
    >
      {L.lanes.map((l) => {
        const Icon = l.node.icon ? ICONS[l.node.icon] : null
        const on = cur.has(l.id) || selected === l.id
        const w = L.laneW
        const label = truncate(l.node.label, Math.floor((w - (Icon ? 36 : 16)) / 7.4))
        const sub = l.node.sub ? truncate(l.node.sub, Math.floor((w - 12) / 6.1)) : null
        return (
          <g key={l.id} className={`fw-lane${on ? ' is-active' : ''}`} data-tone={l.node.tone ?? 'neutral'}>
            <line className="life" x1={l.x} x2={l.x} y1={L.headY + L.headH} y2={L.height - 6} />
            <g
              className="head"
              role="button"
              aria-label={l.node.label}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(selected === l.id ? null : l.id)
              }}
            >
              <rect x={l.x - w / 2} y={L.headY} width={w} height={L.headH} rx={10} />
              {Icon && <Icon x={l.x - w / 2 + 9} y={L.headY + (sub ? 8 : 16)} width={16} height={16} className="icon" strokeWidth={2.2} />}
              <text className="lbl" x={l.x + (Icon ? 9 : 0)} y={L.headY + (sub ? 21 : 30)} textAnchor="middle">
                {label}
              </text>
              {sub && (
                <text className="sub" x={l.x} y={L.headY + 38} textAnchor="middle">
                  {sub}
                </text>
              )}
            </g>
          </g>
        )
      })}
      {L.rows.map((r, i) => {
        const isCur = r.step === step
        const state = step < 0 ? 'is-overview' : isCur ? 'is-current' : r.step < step ? 'is-past' : 'is-future'
        const tone = node.get(r.from)?.tone ?? 'neutral'
        const pick = (e: React.MouseEvent) => {
          e.stopPropagation()
          onPickStep(r.step)
        }
        const x1 = laneX.get(r.from) ?? 0
        if (r.note) {
          const w = Math.min(260, r.label.length * 6.4 + 24)
          return (
            <g key={i} className={`fw-row fw-note ${state}`} data-tone={tone} onClick={pick}>
              <rect x={x1 - w / 2} y={r.y - 12} width={w} height={22} rx={6} />
              <text x={x1} y={r.y + 3} textAnchor="middle">
                {truncate(r.label, Math.floor((w - 16) / 6.4))}
              </text>
            </g>
          )
        }
        if (r.from === r.to) {
          const d = `M${x1 + 4},${r.y - 8} C${x1 + 56},${r.y - 18} ${x1 + 56},${r.y + 10} ${x1 + 7},${r.y + 4}`
          return (
            <g key={i} className={`fw-row ${state}`} data-tone={tone} onClick={pick}>
              <rect className="hit" x={x1} y={r.y - 18} width={180} height={30} />
              <path className="line" d={d} />
              <polygon className="arrow" points={`${x1 + 6},${r.y + 4} ${x1 + 15},${r.y - 1} ${x1 + 15},${r.y + 8}`} />
              <text className="rlabel" x={x1 + 62} y={r.y + 4}>
                {truncate(r.label, 28)}
              </text>
              {isCur && !reducedMotion && (
                <circle r={5} className="fw-packet">
                  <animateMotion dur="1.2s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          )
        }
        const x2 = laneX.get(r.to) ?? 0
        const dir = x2 >= x1 ? 1 : -1
        const a = x1 + dir * 4
        const b = x2 - dir * 6
        const d = `M${a},${r.y} L${b},${r.y}`
        const span = Math.abs(x2 - x1)
        return (
          <g key={i} className={`fw-row ${state}`} data-tone={tone} onClick={pick}>
            <rect className="hit" x={Math.min(x1, x2)} y={r.y - 20} width={span} height={28} />
            <path className="line" d={d} />
            <polygon className="arrow" points={`${b + dir * 2},${r.y} ${b - dir * 8},${r.y - 5} ${b - dir * 8},${r.y + 5}`} />
            {r.label && (
              <text className="rlabel" x={(x1 + x2) / 2} y={r.y - 7} textAnchor="middle">
                {truncate(r.label, Math.floor(span / 6.6))}
              </text>
            )}
            <text className="rnum" x={Math.min(x1, x2) - 10} y={r.y + 4} textAnchor="end">
              {r.step + 1}
            </text>
            {isCur && !reducedMotion && (
              <circle r={5.5} className="fw-packet">
                <animateMotion dur="1.1s" repeatCount="indefinite" path={d} />
              </circle>
            )}
          </g>
        )
      })}
    </svg>
  )
}
