import { Bot, Cog, User, Wrench } from 'lucide-react'
import type { ApiMessage, MsgBlock } from '../iso/types'

/* Visor del arreglo `messages` que el harness envía a la API del modelo.
   Usa la forma de la Messages API de Anthropic (bloques text / tool_use /
   tool_result); OpenAI (`tool_calls`, rol `tool`) y Gemini (`functionCall` /
   `functionResponse`) siguen la misma estructura con otros nombres. */

const ROLE: Record<ApiMessage['role'], { tone: string; label: string; Icon: typeof User }> = {
  system: { tone: 'infra', label: 'system', Icon: Cog },
  user: { tone: 'user', label: 'user', Icon: User },
  assistant: { tone: 'model', label: 'assistant', Icon: Bot },
  tool: { tone: 'tool', label: 'tool', Icon: Wrench },
}

function compact(v: unknown): string {
  return typeof v === 'string' ? v : JSON.stringify(v)
}

function BlockView({ b }: { b: MsgBlock }) {
  if (b.type === 'text') return <div className="fw-msg-text">{b.text}</div>
  if (b.type === 'tool_use')
    return (
      <div className="fw-msg-block" data-tone="tool">
        <span className="fw-msg-block-label">
          tool_use · {b.name} <span className="muted">({b.id})</span>
        </span>
        {compact(b.input)}
      </div>
    )
  return (
    <div className="fw-msg-block" data-tone={b.is_error ? 'guard' : 'tool'}>
      <span className="fw-msg-block-label">
        tool_result{b.is_error ? ' · error' : ''} <span className="muted">({b.tool_use_id})</span>
      </span>
      {compact(b.content)}
    </div>
  )
}

export function MessageList({
  messages,
  highlight = [],
  newFrom,
}: {
  messages: ApiMessage[]
  highlight?: number[]
  newFrom?: number
}) {
  return (
    <div className="fw-msgs">
      {messages.map((m, i) => {
        const r = ROLE[m.role]
        return (
          <div
            key={i}
            className={`fw-msg${newFrom !== undefined && i >= newFrom ? ' is-new' : ''}${highlight.includes(i) ? ' is-hl' : ''}`}
            data-tone={r.tone}
          >
            <div className="fw-msg-role">
              <r.Icon size={12} /> {r.label}
              {m.note && <span className="fw-msg-note">· {m.note}</span>}
            </div>
            {typeof m.content === 'string' ? (
              <div className="fw-msg-text">{m.content}</div>
            ) : (
              m.content.map((b, j) => <BlockView key={j} b={b} />)
            )}
          </div>
        )
      })}
    </div>
  )
}
