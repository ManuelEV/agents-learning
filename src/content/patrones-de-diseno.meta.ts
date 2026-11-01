import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'patrones-de-diseno',
  title: 'Patrones de diseño de agentes',
  description: 'Chaining, routing, paralelización, orquestador-workers, evaluator-optimizer y agentes autónomos: cuándo usar cada uno, cuánto cuestan y cómo se implementan en ADK y Strands.',
  section: 'fundamentos',
  order: 2,
  readingMinutes: 16,
  level: 'intermedio',
  tags: ['patrones', 'workflows', 'multiagente', 'orquestación'],
  references: [
    { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', org: 'Anthropic', date: '2024-12-19' },
    { title: 'A practical guide to building agents (PDF)', url: 'https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf', org: 'OpenAI', date: '2025-04' },
    { title: 'How we built our multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system', org: 'Anthropic', date: '2025-06-13' },
    { title: 'Graph workflows en ADK 2.0', url: 'https://adk.dev/graphs/', org: 'Google ADK Docs' },
    { title: 'Parallel agents (workflow agents)', url: 'https://adk.dev/agents/workflow-agents/parallel-agents/', org: 'Google ADK Docs' },
    { title: 'Loop agents (workflow agents)', url: 'https://adk.dev/agents/workflow-agents/loop-agents/', org: 'Google ADK Docs' },
    { title: 'Agents as Tools', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agents-as-tools/', org: 'Strands Docs' },
    { title: 'Swarm (multi-agent)', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/swarm/', org: 'Strands Docs' },
    { title: 'Graph (multi-agent)', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/graph/', org: 'Strands Docs' },
    { title: 'OpenAI Agents SDK (handoffs y agents-as-tools)', url: 'https://openai.github.io/openai-agents-python/', org: 'OpenAI' },
    { title: 'Agentic AI patterns: workflow patterns', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agentic-workflow-patterns.html', org: 'AWS' },
  ],
}
