import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'strands-agents',
  title: 'AWS Strands Agents',
  description: 'El SDK model-driven de AWS: Agent, @tool, MCPClient, proveedores de modelos, Agents as Tools, Swarm, Graph y A2A, Strands Harness y despliegue en AgentCore Runtime con OpenTelemetry.',
  section: 'frameworks',
  order: 2,
  readingMinutes: 17,
  level: 'intermedio',
  tags: ['Strands', 'AWS', 'AgentCore', 'multiagente', 'OpenTelemetry'],
  references: [
    { title: 'Strands Agents (documentación oficial)', url: 'https://strandsagents.com/', org: 'Strands Docs', date: '2026-10' },
    { title: 'strands-agents/sdk-python', url: 'https://github.com/strands-agents/sdk-python', org: 'GitHub', date: '2026-10-30' },
    { title: 'Agents as Tools', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agents-as-tools/', org: 'Strands Docs' },
    { title: 'Swarm', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/swarm/', org: 'Strands Docs' },
    { title: 'Graph', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/graph/', org: 'Strands Docs' },
    { title: 'Agent-to-Agent (A2A)', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agent-to-agent/', org: 'Strands Docs' },
    { title: 'Session management', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/agents/session-management/', org: 'Strands Docs' },
    { title: 'Traces con OpenTelemetry', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/observability-evaluation/traces/', org: 'Strands Docs' },
    { title: 'Deploy to Bedrock AgentCore (Python)', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/deploy/deploy_to_bedrock_agentcore/python/', org: 'Strands Docs' },
    { title: 'Get started con la CLI de AgentCore', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html', org: 'AWS Docs' },
    { title: 'Contrato de servicio de AgentCore Runtime', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-service-contract.html', org: 'AWS Docs' },
    { title: 'How we built our multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system', org: 'Anthropic', date: '2025-06-13' },
  ],
}
