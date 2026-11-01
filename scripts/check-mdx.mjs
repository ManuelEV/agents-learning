// Compila archivos MDX para detectar errores de sintaxis sin levantar Vite.
// Uso: node scripts/check-mdx.mjs [src/content/archivo.mdx ...]  (sin args: todos)
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'

const dir = resolve('src/content')
const args = process.argv.slice(2)
const files = args.length ? args.map((a) => resolve(a)) : readdirSync(dir).filter((f) => f.endsWith('.mdx')).map((f) => join(dir, f))
const KNOWN = new Set(['Callout', 'Card', 'Cards', 'CodeTabs', 'Diagram', 'Steps', 'Badge', 'KeyPoints', 'Roadmap'])

let failed = 0
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  try {
    await compile(src, { remarkPlugins: [remarkGfm], providerImportSource: '@mdx-js/react' })
    // Ignora bloques de código y código inline (genéricos TS como <Env> no son componentes).
    const prose = src.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '')
    const used = [...prose.matchAll(/<([A-Z][A-Za-z]+)/g)].map((m) => m[1])
    const unknown = [...new Set(used.filter((u) => !KNOWN.has(u)))]
    if (unknown.length) {
      failed++
      console.log(`✖ ${f}: componentes desconocidos: ${unknown.join(', ')}`)
    } else console.log(`✓ ${f}`)
  } catch (e) {
    failed++
    console.log(`✖ ${f}\n   ${e.message}${e.line ? ` (línea ${e.line}:${e.column})` : ''}`)
  }
}
process.exit(failed ? 1 : 0)
