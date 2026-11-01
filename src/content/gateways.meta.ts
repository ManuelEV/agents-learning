import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'gateways',
  title: 'AI gateways: LLM, herramientas y MCP',
  description: 'Por qué centralizar el acceso a modelos y herramientas: claves virtuales, presupuestos, fallbacks, políticas y auditoría. LiteLLM, Cloudflare, Vercel, Kong, Portkey, Agent Router, AgentCore Gateway y más.',
  section: 'conectar',
  order: 4,
  readingMinutes: 15,
  level: 'intermedio',
  tags: ['AI gateway', 'LiteLLM', 'MCP gateway', 'fallbacks', 'FinOps'],
  references: [
    { title: 'LiteLLM Proxy: virtual keys', url: 'https://docs.litellm.ai/docs/proxy/virtual_keys', org: 'LiteLLM Docs' },
    { title: 'LiteLLM Proxy: fallbacks, retries y cooldowns', url: 'https://docs.litellm.ai/docs/proxy/reliability', org: 'LiteLLM Docs' },
    { title: 'LiteLLM: MCP gateway', url: 'https://docs.litellm.ai/docs/mcp', org: 'LiteLLM Docs' },
    { title: 'LiteLLM: proveedor AWS Bedrock', url: 'https://docs.litellm.ai/docs/providers/bedrock', org: 'LiteLLM Docs' },
    { title: 'LiteLLM como conector de modelos en ADK', url: 'https://adk.dev/agents/models/litellm/', org: 'Google ADK Docs' },
    { title: 'Cloudflare AI Gateway', url: 'https://developers.cloudflare.com/ai-gateway/', org: 'Cloudflare Docs' },
    { title: 'Vercel AI Gateway', url: 'https://vercel.com/docs/ai-gateway', org: 'Vercel Docs' },
    { title: 'Kong: plugin AI MCP Proxy', url: 'https://developer.konghq.com/plugins/ai-mcp-proxy/', org: 'Kong Docs' },
    { title: 'Portkey: documentación', url: 'https://portkey.ai/docs', org: 'Portkey Docs' },
    { title: 'Agent Router (ex Envoy AI Gateway)', url: 'https://theagentrouter.ai/', org: 'Agent Router' },
    { title: 'Guidance for a Multi-Provider Generative AI Gateway on AWS', url: 'https://aws.amazon.com/solutions/guidance/multi-provider-generative-ai-gateway-on-aws/', org: 'AWS' },
    { title: 'Amazon Bedrock AgentCore Gateway', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html', org: 'AWS Docs' },
    { title: 'Docker MCP Gateway', url: 'https://docs.docker.com/ai/mcp-catalog-and-toolkit/mcp-gateway/', org: 'Docker Docs' },
    { title: 'Modelos en ADK (incluye Apigee)', url: 'https://adk.dev/agents/models/', org: 'Google ADK Docs' },
  ],
}
