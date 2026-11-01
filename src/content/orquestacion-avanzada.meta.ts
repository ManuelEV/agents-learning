import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'orquestacion-avanzada',
  title: 'Orquestación avanzada',
  description: 'Topologías multiagente, aislamiento de contexto, ejecución durable, human-in-the-loop, tareas largas, manejo de fallas y agentes dirigidos por eventos.',
  section: 'produccion',
  order: 3,
  readingMinutes: 18,
  level: 'avanzado',
  tags: ['multiagente', 'ejecución durable', 'human-in-the-loop', 'event-driven', 'resiliencia'],
  references: [
    { title: 'How we built our multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system', org: 'Anthropic', date: '2025-06-13' },
    { title: 'Effective harnesses for long-running agents', url: 'https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents', org: 'Anthropic', date: '2025-11-26' },
    { title: 'Announcing the OpenAI Agents SDK integration', url: 'https://temporal.io/blog/announcing-openai-agents-sdk-integration', org: 'Temporal', date: '2026-03-23' },
    { title: 'Interrupts (human-in-the-loop) en LangGraph', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts', org: 'LangChain Docs' },
    { title: 'Human input en graph workflows', url: 'https://adk.dev/graphs/human-input/', org: 'Google ADK Docs' },
    { title: 'Swarm (multi-agent)', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/swarm/', org: 'Strands Docs' },
    { title: 'A2A Protocol Specification', url: 'https://a2a-protocol.org/latest/specification/', org: 'A2A' },
    { title: 'MCP 2026-07-28: changelog (MRTR y extensión Tasks)', url: 'https://modelcontextprotocol.io/specification/2026-07-28/changelog', org: 'MCP', date: '2026-07-28' },
    { title: 'Agentic AI patterns: workflow patterns', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agentic-workflow-patterns.html', org: 'AWS' },
    { title: 'Esperar un callback con task token (Step Functions)', url: 'https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html', org: 'AWS Docs' },
    { title: 'OWASP Top 10 for Agentic Applications 2026', url: 'https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/', org: 'OWASP', date: '2025-12-09' },
    { title: 'A practical guide to building agents (PDF)', url: 'https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf', org: 'OpenAI', date: '2025-04' },
  ],
}
