import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'a2a',
  title: 'Agent2Agent (A2A): colaboración entre agentes',
  description: 'A2A v1.0: Agent Cards firmadas, skills, tareas y estados, mensajes y artefactos, bindings, streaming y push. MCP vs. A2A vs. AG-UI y soporte en ADK, Strands, Foundry y AgentCore.',
  section: 'conectar',
  order: 3,
  readingMinutes: 15,
  level: 'avanzado',
  tags: ['A2A', 'multiagente', 'Agent Card', 'interoperabilidad', 'AG-UI'],
  references: [
    { title: 'Especificación A2A (latest, v1.0.x)', url: 'https://a2a-protocol.org/latest/specification/', org: 'A2A' },
    { title: "What's new in A2A v1.0", url: 'https://a2a-protocol.org/latest/whats-new-v1/', org: 'A2A', date: '2026-03-12' },
    { title: 'Releases del repositorio A2A (v1.0.0, v1.0.1)', url: 'https://github.com/a2aproject/A2A/releases', org: 'GitHub', date: '2026-05-28' },
    { title: 'A new chapter for A2A: joining the Agentic AI Foundation', url: 'https://a2a-protocol.org/latest/blog/2026/08/27/a-new-chapter-for-a2a-joining-the-agentic-ai-foundation/', org: 'A2A', date: '2026-08-27' },
    { title: 'ACP se une a A2A bajo la Linux Foundation', url: 'https://lfaidata.foundation/?p=7689', org: 'LF AI & Data', date: '2025-08-29' },
    { title: 'AG-UI: introducción', url: 'https://docs.ag-ui.com/introduction', org: 'AG-UI Docs' },
    { title: 'A2A Quickstart (Exposing) con to_a2a', url: 'https://adk.dev/a2a/quickstart-exposing/', org: 'Google ADK Docs' },
    { title: 'A2A Quickstart (Consuming) con RemoteA2aAgent', url: 'https://adk.dev/a2a/quickstart-consuming/', org: 'Google ADK Docs' },
    { title: '¿Qué es Amazon Bedrock AgentCore?', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html', org: 'AWS Docs' },
    { title: 'Microsoft Foundry Agent Service: overview', url: 'https://learn.microsoft.com/en-us/azure/foundry/agents/overview', org: 'Microsoft Learn' },
    { title: 'Gemini Enterprise Agent Platform: release notes', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes', org: 'Google Cloud Docs' },
    { title: 'A2A: The Agent2Agent Protocol (curso)', url: 'https://learn.deeplearning.ai/courses/a2a-the-agent2agent-protocol', org: 'DeepLearning.AI' },
  ],
}
