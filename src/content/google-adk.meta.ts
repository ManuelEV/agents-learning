import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'google-adk',
  title: 'Google ADK a fondo',
  description: 'Agent Development Kit 2.x: agentes, herramientas, callbacks, sesiones, grafos Workflow, Claude en Bedrock vía LiteLLM, MCP, A2A, evaluación y despliegue en GCP o AWS.',
  section: 'frameworks',
  order: 1,
  readingMinutes: 24,
  level: 'intermedio',
  tags: ['Google ADK', 'LiteLLM', 'Bedrock', 'multiagente', 'callbacks'],
  references: [
    { title: 'Agent Development Kit (documentación oficial)', url: 'https://adk.dev/', org: 'Google ADK Docs', date: '2026-10' },
    { title: 'ADK 2.0: novedades y migración', url: 'https://adk.dev/2.0/', org: 'Google ADK Docs', date: '2026-05-19' },
    { title: 'Graph workflows', url: 'https://adk.dev/graphs/', org: 'Google ADK Docs' },
    { title: 'Event loop del runtime', url: 'https://adk.dev/runtime/event-loop/', org: 'Google ADK Docs' },
    { title: 'Function tools y Agent-as-a-Tool', url: 'https://adk.dev/tools-custom/function-tools/', org: 'Google ADK Docs' },
    { title: 'Callbacks', url: 'https://adk.dev/callbacks/', org: 'Google ADK Docs' },
    { title: 'MCP tools en ADK', url: 'https://adk.dev/tools-custom/mcp-tools/', org: 'Google ADK Docs' },
    { title: 'Modelos vía LiteLLM (incluye aviso de seguridad)', url: 'https://adk.dev/agents/models/litellm/', org: 'Google ADK Docs' },
    { title: 'A2A: consumir agentes remotos', url: 'https://adk.dev/a2a/quickstart-consuming/', org: 'Google ADK Docs' },
    { title: 'Evaluación de agentes', url: 'https://adk.dev/evaluate/', org: 'Google ADK Docs' },
    { title: 'Despliegue en Cloud Run', url: 'https://adk.dev/deploy/cloud-run/', org: 'Google ADK Docs' },
    { title: 'Proveedor Bedrock en LiteLLM', url: 'https://docs.litellm.ai/docs/providers/bedrock', org: 'LiteLLM Docs' },
    { title: 'Sample oficial: ADK en AgentCore Runtime', url: 'https://github.com/awslabs/agentcore-samples/tree/main/03-integrations/agentic-frameworks/adk', org: 'GitHub' },
    { title: 'google/adk-python', url: 'https://github.com/google/adk-python', org: 'GitHub' },
  ],
}
