import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'panorama',
  title: 'Panorama: las opciones para construir agentes en 2026',
  description:
    'Un mapa del ecosistema —modelos, frameworks, protocolos, gateways y plataformas— para ubicar cada pieza antes de profundizar. Incluye qué cambió en 2026.',
  section: 'inicio',
  order: 1,
  readingMinutes: 14,
  level: 'básico',
  tags: ['ecosistema', 'decisiones', 'arquitectura'],
  references: [
    { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', org: 'Anthropic', date: '2024-12-19' },
    { title: 'Linux Foundation anuncia la Agentic AI Foundation (AAIF)', url: 'https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation', org: 'Linux Foundation', date: '2025-12-09' },
    { title: 'Especificación MCP 2026-07-28', url: 'https://modelcontextprotocol.io/specification/2026-07-28', org: 'MCP', date: '2026-07-28' },
    { title: 'A2A: a new chapter, joining the Agentic AI Foundation', url: 'https://a2a-protocol.org/latest/blog/2026/08/27/a-new-chapter-for-a2a-joining-the-agentic-ai-foundation/', org: 'A2A', date: '2026-08-27' },
    { title: '¿Qué es Amazon Bedrock AgentCore?', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html', org: 'AWS Docs' },
    { title: 'Cambios de nombre de Vertex AI a Gemini Enterprise Agent Platform', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes', org: 'Google Cloud Docs' },
    { title: 'Microsoft Foundry Agent Service', url: 'https://learn.microsoft.com/en-us/azure/foundry/agents/overview', org: 'Microsoft Learn' },
    { title: 'Agent Development Kit (ADK)', url: 'https://adk.dev/', org: 'Google ADK Docs' },
    { title: 'Strands Agents', url: 'https://strandsagents.com/', org: 'AWS' },
    { title: 'Bedrock Agents (Classic) — no disponible para nuevos clientes', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html', org: 'AWS Docs' },
    { title: 'Donating Agent Skills to the Agentic AI Foundation', url: 'https://anthropic.com/news/donating-agent-skills-to-the-agentic-ai-foundation', org: 'Anthropic', date: '2026-10-22' },
    { title: 'Multi-provider generative AI gateway on AWS', url: 'https://aws.amazon.com/solutions/guidance/multi-provider-generative-ai-gateway-on-aws/', org: 'AWS' },
  ],
}
