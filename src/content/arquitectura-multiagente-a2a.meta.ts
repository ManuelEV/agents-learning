import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'arquitectura-multiagente-a2a',
  title: 'Arquitectura de referencia: respuesta a incidentes multiagente con A2A',
  description:
    'Orquestador ADK con especialistas de logs, métricas y runbooks, y un agente de remediación en Strands consumido por A2A: descubrimiento con registro, aprobación humana, identidad por agente, trazas distribuidas, presupuestos y manejo de fallos.',
  section: 'arquitecturas',
  order: 3,
  readingMinutes: 19,
  level: 'avanzado',
  tags: ['multiagente', 'A2A', 'Google ADK', 'Strands', 'SRE', 'human-in-the-loop'],
  references: [
    { title: 'Especificación A2A', url: 'https://a2a-protocol.org/latest/specification/', org: 'A2A' },
    { title: "What's new in A2A v1.0", url: 'https://a2a-protocol.org/latest/whats-new-v1/', org: 'A2A', date: '2026-03-12' },
    { title: 'Deploy A2A servers in AgentCore Runtime', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-a2a.html', org: 'AWS Docs' },
    { title: 'Sample: A2A multi-agent incident response', url: 'https://github.com/awslabs/agentcore-samples/tree/main/02-use-cases/01-conversational-agents/A2A-multi-agent-incident-response', org: 'GitHub' },
    { title: 'Consumir agentes remotos con A2A en ADK', url: 'https://adk.dev/a2a/quickstart-consuming/', org: 'Google ADK Docs' },
    { title: 'Agent-to-Agent en Strands', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agent-to-agent/', org: 'Strands Docs' },
    { title: 'How we built our multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system', org: 'Anthropic', date: '2025-06-13' },
    { title: 'Policy in AgentCore (Cedar y políticas temporales)', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html', org: 'AWS Docs' },
    { title: 'Gemini Enterprise Agent Platform: overview (Agent Registry, Agent Gateway)', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview', org: 'Google Cloud Docs' },
    { title: 'AWS Agent Registry reaches general availability', url: 'https://www.unite.ai/aws-agent-registry-reaches-general-availability/', org: 'Unite.AI', date: '2026-08-31', note: 'Fuente secundaria' },
    { title: 'OpenTelemetry semantic conventions for GenAI', url: 'https://github.com/open-telemetry/semantic-conventions-genai', org: 'OpenTelemetry' },
    { title: 'OWASP Top 10 for Agentic Applications 2026', url: 'https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/', org: 'OWASP', date: '2025-12-09' },
  ],
}
