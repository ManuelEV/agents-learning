import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'google-agent-platform',
  title: 'Google Cloud: Gemini Enterprise Agent Platform',
  description: 'Lo que antes era Vertex AI: Agent Runtime, Sessions y Memory Bank, Agent Gateway y Agent Registry, Model Armor, RAG Engine y Agent Search, Claude en Model Garden, y cómo desplegar ADK en Agent Runtime, Cloud Run o GKE.',
  section: 'plataformas',
  order: 2,
  readingMinutes: 15,
  level: 'intermedio',
  tags: ['Google Cloud', 'Agent Runtime', 'Agent Gateway', 'ADK', 'Model Armor'],
  references: [
    { title: 'Gemini Enterprise Agent Platform overview', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview', org: 'Google Cloud Docs' },
    { title: 'Name changes from Vertex AI', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes', org: 'Google Cloud Docs' },
    { title: 'Agent Platform release notes', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes', org: 'Google Cloud Docs', date: '2026-10' },
    { title: 'Scale agents with Agent Runtime', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime', org: 'Google Cloud Docs' },
    { title: 'Agent Gateway overview', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/govern/gateways/agent-gateway-overview', org: 'Google Cloud Docs' },
    { title: 'Governing agentic workloads with Agent Gateway (codelab)', url: 'https://codelabs.developers.google.com/cloudnet-agent-gateway', org: 'Google Codelabs' },
    { title: 'RAG Engine: vector database choices', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/vector-db-choices', org: 'Google Cloud Docs' },
    { title: 'Agent Search', url: 'https://cloud.google.com/products/gemini-enterprise-agent-platform/agent-search', org: 'Google Cloud Docs' },
    { title: 'Gemini Enterprise FAQ', url: 'https://cloud.google.com/gemini-enterprise/faq', org: 'Google Cloud Docs' },
    { title: 'Deploy ADK agents', url: 'https://adk.dev/deploy/', org: 'Google ADK Docs' },
    { title: 'Deploy to Agent Runtime (ADK CLI)', url: 'https://adk.dev/deploy/agent-runtime/deploy/', org: 'Google ADK Docs' },
    { title: 'Deploy to Cloud Run (ADK CLI)', url: 'https://adk.dev/deploy/cloud-run/', org: 'Google ADK Docs' },
  ],
}
