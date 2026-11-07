// Valida las specs de src/diagrams/*.ts sin navegador.
// Uso: node scripts/check-diagrams.mjs [archivo.ts ...]
// Requiere Node >= 23.6 (type stripping). Los archivos de diagramas solo deben usar `import type`.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const dir = resolve('src/diagrams')
const args = process.argv.slice(2)
const files = args.length ? args.map((a) => resolve(a)) : readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'manifest.ts').map((f) => join(dir, f))

const HEIGHT = { box: 0.75, tall: 1.45, cylinder: 0.9, stack: 0.85, sphere: 1.45, person: 1.25, diamond: 1.25, hex: 0.55, doc: 0.5, cloud: 0.8 }
const W = 820
const H = 460
// Proyección isométrica: cámara en dirección (1,1,1).
const s2 = Math.SQRT1_2
const s6 = 1 / Math.sqrt(6)
function project([x, y, z]) {
  return [(x - z) * s2, (2 * y - x - z) * s6]
}

const NL = String.fromCharCode(10)
let errors = 0
let warnings = 0
const seen = new Map()

for (const file of files) {
  const mod = await import(pathToFileURL(file).href)
  const specs = Object.values(mod).filter((v) => v && typeof v === 'object' && 'nodes' in v && 'steps' in v)
  if (specs.length === 0) {
    console.log(`⚠  ${file}: no exporta ningún IsoSpec`)
    warnings++
  }
  for (const spec of specs) {
    const tag = `[${spec.id}]`
    const err = (m) => (errors++, console.log(`✖ ${tag} ${m}`))
    const warn = (m) => (warnings++, console.log(`⚠ ${tag} ${m}`))
    if (seen.has(spec.id)) err(`id duplicado (también en ${seen.get(spec.id)})`)
    seen.set(spec.id, file)
    const ids = new Set()
    for (const n of spec.nodes) {
      if (ids.has(n.id)) err(`nodo duplicado ${n.id}`)
      ids.add(n.id)
      if (!Array.isArray(n.at) || n.at.length !== 2) err(`nodo ${n.id} sin at:[x,z]`)
      if (n.label.length > 22) warn(`etiqueta larga (${n.label.length} chars) en ${n.id}: "${n.label}" — usa sub para detalles`)
      if (n.sub && n.sub.length > 26) warn(`sub larga en ${n.id}: "${n.sub}"`)
      if (!n.info) warn(`nodo ${n.id} sin info (texto al hacer clic)`)
    }
    for (const e of spec.edges) {
      if (!ids.has(e.from)) err(`arista desde nodo inexistente ${e.from}`)
      if (!ids.has(e.to)) err(`arista hacia nodo inexistente ${e.to}`)
    }
    const files = spec.code ?? {}
    const fileKeys = Object.keys(files)
    for (const [k, f] of Object.entries(files)) {
      if (!f.title || !f.lang || typeof f.source !== 'string') err(`code.${k} incompleto (title, lang, source)`)
      else if (f.source.split(NL).length > 70) warn(`code.${k} tiene ${f.source.split(NL).length} líneas: recorta a lo esencial (≤ 60)`)
    }
    if (spec.layout === 'sequence') {
      for (const l of spec.lanes ?? []) if (!ids.has(l)) err(`lanes: nodo inexistente ${l}`)
      const rows = spec.steps.reduce((n, st) => n + Math.max(1, st.flows?.length ?? 0), 0)
      if (rows > 22) warn(`secuencia con ${rows} filas: considera dividir`)
    }
    let withCode = 0
    let withData = 0
    spec.steps.forEach((st, i) => {
      for (const f of st.flows ?? []) {
        const [a, b] = f.split(':')[0].split('>').map((s) => s.trim())
        if (!ids.has(a) || !ids.has(b)) err(`paso ${i + 1}: flujo inválido "${f}"`)
      }
      if (st.code) {
        withCode++
        const key = st.code.file ?? fileKeys[0]
        const file = files[key]
        if (!file) err(`paso ${i + 1}: code.file "${key}" no existe en spec.code`)
        else {
          const lines = file.source.split(NL)
          for (const h of st.code.hl ?? []) {
            if (typeof h === 'number') {
              if (h < 1 || h > lines.length) err(`paso ${i + 1}: línea ${h} fuera de rango en ${key}`)
            } else if (!lines.some((l) => l.includes(h))) err(`paso ${i + 1}: code.hl "${h}" no aparece en ${key}`)
          }
          if (!st.code.hl?.length) warn(`paso ${i + 1}: code sin hl`)
        }
      }
      if (st.data) {
        withData++
        if ('messages' in st.data) {
          if (!Array.isArray(st.data.messages) || !st.data.messages.length) err(`paso ${i + 1}: data.messages vacío`)
        } else {
          if (typeof st.data.content !== 'string' || !st.data.lang) err(`paso ${i + 1}: data sin content/lang`)
          else {
            if (st.data.lang === 'json') {
              try {
                JSON.parse(st.data.content)
              } catch {
                warn(`paso ${i + 1}: data JSON no parsea (¿comentarios o "…"?)`)
              }
            }
            for (const h of st.data.hl ?? []) if (!st.data.content.includes(h)) err(`paso ${i + 1}: data.hl "${h}" no aparece en el payload`)
            if (st.data.content.split(NL).length > 60) warn(`paso ${i + 1}: payload de ${st.data.content.split(NL).length} líneas (recorta a ≤ 50)`)
          }
        }
      }
      for (const fid of st.focus ?? []) if (!ids.has(fid)) err(`paso ${i + 1}: focus inexistente ${fid}`)
      if (!st.flows?.length && !st.focus?.length) warn(`paso ${i + 1} sin flows ni focus`)
    })
    if (spec.steps.length < 3) warn(`solo ${spec.steps.length} pasos`)
    if (spec.steps.length > 10) warn(`${spec.steps.length} pasos: considera dividir`)

    // Distancia mínima entre nodos (mundo).
    for (let i = 0; i < spec.nodes.length; i++)
      for (let j = i + 1; j < spec.nodes.length; j++) {
        const a = spec.nodes[i]
        const b = spec.nodes[j]
        const d = Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1])
        if (d < 2.2) err(`nodos ${a.id} y ${b.id} demasiado cerca (${d.toFixed(2)} < 2.2)`)
      }

    // Encuadre como en CameraRig y colisión de etiquetas en píxeles.
    const pts = []
    for (const n of spec.nodes) {
      const r = 0.95
      const h = (HEIGHT[n.shape ?? 'box'] ?? 0.75) * (n.scale ?? 1) + (n.elevation ?? 0) + 0.9
      const [x, z] = n.at
      const y = n.elevation ?? 0
      pts.push([x - r, y, z - r], [x + r, y, z + r], [x - r, y, z + r], [x + r, y, z - r], [x, y + h, z])
    }
    for (const zn of spec.zones ?? []) {
      const [x0, z0] = zn.from
      const [x1, z1] = zn.to
      pts.push([x0, 0, z0], [x1, 0, z1], [x0, 0, z1], [x1, 0, z0])
    }
    const pr = pts.map(project)
    const xs = pr.map((p) => p[0])
    const ys = pr.map((p) => p[1])
    const spanX = Math.max(...xs) - Math.min(...xs)
    const spanY = Math.max(...ys) - Math.min(...ys)
    const zoom = Math.min(W / (spanX * 1.08 + 0.6), H / (spanY * 1.08 + 0.6))
    if (zoom < 26) warn(`[3D] diagrama muy extenso: zoom ${zoom.toFixed(1)} px/unidad (<26). Etiquetas pueden solaparse; compacta o divide.`)
    const aspect = spanX / spanY
    if (aspect < 1.1) warn(`[3D] relación de aspecto ${aspect.toFixed(2)} (muy alto): aprovecha el ancho usando más el eje x y z negativo.`)

    const rects = spec.nodes.map((n) => {
      const h = (HEIGHT[n.shape ?? 'box'] ?? 0.75) * (n.scale ?? 1) + (n.elevation ?? 0) + 0.32
      const [px, py] = project([n.at[0], h, n.at[1]])
      const chars = Math.max(n.label.length, (n.sub ?? '').length * 0.88)
      const w = chars * 6.9 + (n.icon ? 40 : 22)
      const hh = n.sub ? 36 : 24
      return { id: n.id, cx: px * zoom, cy: -py * zoom, w, h: hh }
    })
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]
        const b = rects[j]
        const ox = (a.w + b.w) / 2 - Math.abs(a.cx - b.cx)
        const oy = (a.h + b.h) / 2 - Math.abs(a.cy - b.cy)
        if (ox > 4 && oy > 2) warn(`[3D] etiquetas ${a.id} y ${b.id} se solapan (~${Math.round(ox)}×${Math.round(oy)} px)`)
      }
    if (fileKeys.length && withCode === 0) warn(`spec.code definido pero ningún paso lo resalta`)
    console.log(
      `✓ ${tag} ${spec.layout === 'sequence' ? 'secuencia · ' : ''}${spec.nodes.length} nodos, ${spec.edges.length} aristas, ${spec.steps.length} pasos · datos ${withData}/${spec.steps.length} · código ${withCode}/${spec.steps.length} · zoom3D ${zoom.toFixed(1)}`,
    )
  }
}
// Manifiesto id → archivo para la carga diferida (src/diagrams/index.ts). Se regenera al validar todos los archivos.
if (!args.length && !errors) {
  const entries = [...seen.entries()].map(([id, file]) => [id, basename(file, '.ts')]).sort((a, b) => a[0].localeCompare(b[0]))
  const body = entries.map(([id, f]) => `  '${id}': '${f}',`).join('\n')
  const out = `// Generado por scripts/check-diagrams.mjs — no editar a mano.\nexport const DIAGRAM_FILES: Record<string, string> = {\n${body}\n}\n`
  const path = join(dir, 'manifest.ts')
  const prev = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : ''
  if (prev !== out) {
    writeFileSync(path, out)
    console.log(`↻ src/diagrams/manifest.ts actualizado (${entries.length} diagramas)`)
  }
}
console.log(`\n${errors} errores, ${warnings} advertencias`)
process.exit(errors ? 1 : 0)
