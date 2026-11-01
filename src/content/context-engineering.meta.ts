import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'context-engineering',
  title: 'Context engineering',
  description: 'El contexto como presupuesto de atención finito: system prompts, diseño de herramientas, recuperación just-in-time, compactación, memoria de corto y largo plazo, prompt caching y Agent Skills.',
  section: 'fundamentos',
  order: 3,
  readingMinutes: 17,
  level: 'intermedio',
  tags: ['contexto', 'memoria', 'prompt caching', 'herramientas', 'skills'],
  references: [
    { title: 'Effective context engineering for AI agents', url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents', org: 'Anthropic', date: '2025-09-29' },
    { title: 'Writing effective tools for agents — with agents', url: 'https://www.anthropic.com/engineering/writing-tools-for-agents', org: 'Anthropic', date: '2025-09-11' },
    { title: 'Effective harnesses for long-running agents', url: 'https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents', org: 'Anthropic', date: '2025-11-26' },
    { title: 'Building effective agents (apéndice: prompt engineering de herramientas)', url: 'https://www.anthropic.com/engineering/building-effective-agents', org: 'Anthropic', date: '2024-12-19' },
    { title: 'Prompt caching en Amazon Bedrock', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html', org: 'AWS Docs' },
    { title: 'AgentCore Memory', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory.html', org: 'AWS Docs' },
    { title: 'Memory en ADK', url: 'https://adk.dev/sessions/memory/', org: 'Google ADK Docs' },
    { title: 'LangGraph persistence (checkpointers y stores)', url: 'https://docs.langchain.com/oss/python/langgraph/persistence', org: 'LangChain Docs' },
    { title: 'Agent Skills: especificación', url: 'https://agentskills.io/specification', org: 'Agent Skills' },
    { title: 'AGENTS.md', url: 'https://agents.md/', org: 'AGENTS.md' },
    { title: 'MCP 2026-07-28: changelog', url: 'https://modelcontextprotocol.io/specification/2026-07-28/changelog', org: 'MCP', date: '2026-07-28' },
  ],
}
