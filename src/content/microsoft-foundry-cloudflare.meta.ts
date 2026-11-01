import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'microsoft-foundry-cloudflare',
  title: 'Microsoft Foundry, Cloudflare y comparativa multinube',
  description: 'Foundry Agent Service (prompt y hosted agents, Toolboxes MCP, Entra Agent ID, A2A, Claude, Teams), Cloudflare (Agents SDK sobre Durable Objects, MCP remoto, AI Gateway, Workers AI, AI Search) y una comparativa AWS/GCP/Azure/Cloudflare para decidir.',
  section: 'plataformas',
  order: 3,
  readingMinutes: 17,
  level: 'intermedio',
  tags: ['Microsoft Foundry', 'Agent Framework', 'Cloudflare', 'Durable Objects', 'multinube'],
  references: [
    { title: 'What is Microsoft Foundry Agent Service?', url: 'https://learn.microsoft.com/en-us/azure/foundry/agents/overview', org: 'Microsoft Learn', date: '2026-10-26' },
    { title: 'Hosted agents in Foundry Agent Service', url: 'https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/hosted-agents', org: 'Microsoft Learn', date: '2026-10-19' },
    { title: 'Claude models in Microsoft Foundry', url: 'https://learn.microsoft.com/azure/foundry/foundry-models/concepts/claude-models', org: 'Microsoft Learn', date: '2026-09-21' },
    { title: 'Microsoft Agent Framework overview', url: 'https://learn.microsoft.com/en-us/agent-framework/overview/', org: 'Microsoft Learn' },
    { title: 'Microsoft Agent Framework version 1.0', url: 'https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/', org: 'Microsoft', date: '2026-04' },
    { title: 'Cloudflare Agents', url: 'https://developers.cloudflare.com/agents/', org: 'Cloudflare Docs' },
    { title: 'Agent class (Agents SDK)', url: 'https://developers.cloudflare.com/agents/agent-class/', org: 'Cloudflare Docs' },
    { title: 'Build a remote MCP server', url: 'https://developers.cloudflare.com/agents/guides/remote-mcp-server/', org: 'Cloudflare Docs' },
    { title: 'Cloudflare AI Gateway', url: 'https://developers.cloudflare.com/ai-gateway/', org: 'Cloudflare Docs' },
    { title: 'AI Gateway: Amazon Bedrock provider', url: 'https://developers.cloudflare.com/ai-gateway/usage/providers/bedrock/', org: 'Cloudflare Docs' },
    { title: 'Cloudflare AI Search', url: 'https://developers.cloudflare.com/ai-search/', org: 'Cloudflare Docs' },
    { title: 'What is Amazon Bedrock AgentCore?', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html', org: 'AWS Docs' },
    { title: 'Gemini Enterprise Agent Platform overview', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview', org: 'Google Cloud Docs' },
  ],
}
