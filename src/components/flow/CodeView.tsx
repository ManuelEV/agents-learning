import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import type { CodeLang } from '../iso/types'

/* Resaltador mínimo y sin dependencias para el panel "Código" de los diagramas.
   Se ejecuta en el navegador (las líneas resaltadas cambian en cada paso), así
   que no usa Shiki: basta con reglas por lenguaje para Python, TS/JS, JSON,
   YAML, Bash y HTTP. */

type Rule = [cls: string, re: RegExp]

const PY_KW =
  'def|class|return|if|elif|else|for|while|in|not|and|or|import|from|as|with|try|except|finally|raise|async|await|yield|lambda|None|True|False|pass|break|continue|global|is|match|case'
const TS_KW =
  'const|let|var|function|return|if|else|for|while|of|in|new|class|extends|import|from|export|default|async|await|try|catch|finally|throw|type|interface|null|undefined|true|false|this|typeof|as|switch|case|break'

const RULES: Record<CodeLang, Rule[]> = {
  python: [
    ['c', /#[^\n]*/y],
    ['s', /[rfb]?("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y],
    ['d', /@[\w.]+/y],
    ['n', /\b\d+(?:\.\d+)?\b/y],
    ['k', new RegExp(`\\b(?:${PY_KW})\\b`, 'y')],
    ['b', /\b(?:print|len|str|int|float|dict|list|json|self|range|isinstance|os)\b/y],
    ['f', /\b[A-Za-z_]\w*(?=\()/y],
  ],
  ts: [
    ['c', /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
    ['s', /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/y],
    ['d', /@[\w.]+/y],
    ['n', /\b\d+(?:\.\d+)?\b/y],
    ['k', new RegExp(`\\b(?:${TS_KW})\\b`, 'y')],
    ['f', /\b[A-Za-z_$][\w$]*(?=\()/y],
    ['p', /\b[A-Za-z_$][\w$]*(?=\s*:(?!:))/y],
  ],
  js: [],
  json: [
    ['p', /"(?:\\.|[^"\\])*"(?=\s*:)/y],
    ['s', /"(?:\\.|[^"\\])*"/y],
    ['n', /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/y],
    ['k', /\b(?:true|false|null)\b/y],
  ],
  yaml: [
    ['c', /#[^\n]*/y],
    ['p', /^[ \t-]*[\w.\-/"]+(?=\s*:(?:\s|$))/my],
    ['s', /"(?:\\.|[^"\\\n])*"|'[^'\n]*'/y],
    ['n', /\b\d+(?:\.\d+)?\b/y],
    ['k', /\b(?:true|false|null)\b/y],
  ],
  bash: [
    ['c', /#[^\n]*/y],
    ['s', /"(?:\\.|[^"\\])*"|'[^']*'/y],
    ['k', /\b(?:export|curl|npm|npx|pip|python|uv|git|cd|echo|agentcore|aws|gcloud|az|docker|adk)\b/y],
    ['p', /--?[\w-]+/y],
  ],
  http: [
    ['k', /\b(?:GET|POST|PUT|DELETE|PATCH|HTTP\/[\d.]+)\b/y],
    ['p', /^[\w-]+(?=:)/my],
    ['s', /"(?:\\.|[^"\\])*"/y],
    ['n', /\b\d{3}\b/y],
  ],
  text: [],
}
RULES.js = RULES.ts

type Seg = [cls: string, text: string]

function tokenize(code: string, lang: CodeLang): Seg[] {
  const rules = RULES[lang] ?? []
  if (!rules.length) return [['', code]]
  const out: Seg[] = []
  let i = 0
  let plain = ''
  const flush = () => {
    if (plain) out.push(['', plain])
    plain = ''
  }
  outer: while (i < code.length) {
    for (const [cls, re] of rules) {
      re.lastIndex = i
      const m = re.exec(code)
      if (m && m[0].length > 0) {
        const prev = code[i - 1]
        if ((cls === 'k' || cls === 'n' || cls === 'b' || cls === 'f') && prev && /[\w$]/.test(prev)) continue
        flush()
        out.push([cls, m[0]])
        i += m[0].length
        continue outer
      }
    }
    plain += code[i]
    i++
  }
  flush()
  return out
}

function toLines(segs: Seg[]): Seg[][] {
  const lines: Seg[][] = [[]]
  for (const [cls, text] of segs) {
    text.split('\n').forEach((p, idx) => {
      if (idx > 0) lines.push([])
      if (p) lines[lines.length - 1].push([cls, p])
    })
  }
  return lines
}

/** Líneas (1-based) de `code` que contienen alguno de los textos, o los números dados tal cual. */
export function resolveLines(code: string, hl: (string | number)[] | undefined): number[] {
  if (!hl?.length) return []
  const lines = code.split('\n')
  const out = new Set<number>()
  for (const h of hl) {
    if (typeof h === 'number') out.add(h)
    else lines.forEach((l, i) => l.includes(h) && out.add(i + 1))
  }
  return [...out].sort((a, b) => a - b)
}

export function CodeView({
  code,
  lang = 'text',
  title,
  highlight,
  dim = true,
  maxHeight = 360,
  right,
}: {
  code: string
  lang?: CodeLang
  title?: ReactNode
  /** Líneas resaltadas (1-based). */
  highlight?: number[]
  /** Atenúa las líneas no resaltadas cuando hay resaltado. */
  dim?: boolean
  maxHeight?: number
  right?: ReactNode
}) {
  const src = code.replace(/\n$/, '')
  const lines = useMemo(() => toLines(tokenize(src, lang)), [src, lang])
  const preRef = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const hl = new Set(highlight ?? [])
  const hlKey = (highlight ?? []).join(',')

  useEffect(() => {
    const pre = preRef.current
    if (!pre) return
    if (!highlight?.length) return
    const el = pre.querySelector<HTMLElement>(`[data-ln="${Math.min(...highlight)}"]`)
    if (!el) return
    pre.scrollTo({ top: Math.max(0, el.offsetTop - pre.clientHeight / 3), behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlKey, code])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* sin portapapeles */
    }
  }

  return (
    <div className="fw-code">
      <div className="fw-code-head">
        {title && <span className="fw-code-title">{title}</span>}
        {right}
        <span className="fw-code-lang">{lang}</span>
        <button className="fw-code-copy" onClick={copy} aria-label="Copiar código" title="Copiar">
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <pre ref={preRef} style={{ maxHeight }}>
        {lines.map((segs, i) => {
          const n = i + 1
          const on = hl.has(n)
          const cls = ['ln', on && 'hl', dim && hl.size > 0 && !on && 'dim'].filter(Boolean).join(' ')
          return (
            <span key={i} className={cls} data-ln={n}>
              <span className="ln-num">{n}</span>
              {segs.map(([c, t], j) =>
                c ? (
                  <span key={j} className={`tk-${c}`}>
                    {t}
                  </span>
                ) : (
                  t
                ),
              )}
            </span>
          )
        })}
      </pre>
    </div>
  )
}
