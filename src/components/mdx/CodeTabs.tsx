import { Children, isValidElement, useState, type ReactNode } from 'react'

/**
 * Pestañas para alternar entre bloques de código equivalentes.
 * En MDX: <CodeTabs labels={["ADK", "Strands"]}> + un bloque de código por pestaña + </CodeTabs>
 */
export function CodeTabs({ labels, children }: { labels: string[]; children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement)
  const [active, setActive] = useState(0)
  return (
    <div className="codetabs">
      <div className="codetabs-bar" role="tablist">
        {labels.map((l, i) => (
          <button
            key={l}
            role="tab"
            aria-selected={i === active}
            className={i === active ? 'is-active' : ''}
            onClick={() => setActive(i)}
          >
            {l}
          </button>
        ))}
      </div>
      {items.map((item, i) => (
        <div key={i} hidden={i !== active}>
          {item}
        </div>
      ))}
    </div>
  )
}
