import type { MDXComponents } from 'mdx/types'
import { Diagram } from '../iso/Diagram'
import { Anchor, Table } from './Anchor'
import { Callout } from './Callout'
import { Card, Cards } from './Cards'
import { CodeBlock } from './CodeBlock'
import { CodeTabs } from './CodeTabs'
import { Roadmap } from './Roadmap'
import { Badge, KeyPoints, Steps } from './Steps'

export const mdxComponents: MDXComponents = {
  pre: CodeBlock,
  a: Anchor,
  table: Table,
  Callout,
  Card,
  Cards,
  CodeTabs,
  Diagram,
  Steps,
  Badge,
  KeyPoints,
  Roadmap,
}
