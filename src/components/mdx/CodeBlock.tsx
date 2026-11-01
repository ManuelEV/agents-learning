import { useRef, useState, type ComponentProps } from 'react'
import { Check, Copy } from 'lucide-react'

const LANG_LABEL: Record<string, string> = {
  python: 'Python',
  py: 'Python',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  js: 'JavaScript',
  javascript: 'JavaScript',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  java: 'Java',
  go: 'Go',
  csharp: 'C#',
  http: 'HTTP',
  hcl: 'Terraform',
  dockerfile: 'Dockerfile',
  sql: 'SQL',
  md: 'Markdown',
  text: 'Texto',
}

type PreProps = ComponentProps<'pre'> & { 'data-title'?: string; 'data-lang'?: string }

export function CodeBlock(props: PreProps) {
  const { children, className, 'data-title': title, 'data-lang': dataLang, ...rest } = props
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const langClass = (className ?? '').split(' ').find((c) => c.startsWith('language-'))
  const lang = dataLang ?? langClass?.replace('language-', '')
  const label = lang ? (LANG_LABEL[lang] ?? lang) : 'Código'

  const copy = async () => {
    const text = ref.current?.innerText ?? ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* portapapeles no disponible */
    }
  }

  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span className="codeblock-title">{title ?? label}</span>
        {title && lang && <span className="codeblock-lang">{label}</span>}
        <button className="codeblock-copy" onClick={copy} aria-label="Copiar código">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
      <pre ref={ref} className={className} {...rest}>
        {children}
      </pre>
    </div>
  )
}
