import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'comparativa-frameworks',
  title: 'Comparativa y guía de decisión',
  description: 'ADK, Strands, LangGraph y el resto lado a lado: lenguajes, multiagente, durabilidad, MCP, A2A y lock-in; guía por contexto (AWS, GCP, Azure, TS, RAG, HITL), diagrama de decisión y cómo evaluar un framework en 2 semanas.',
  section: 'frameworks',
  order: 5,
  readingMinutes: 14,
  level: 'intermedio',
  tags: ['comparativa', 'decisión', 'runtimes', 'PoC'],
  references: [
    { title: 'Agent Development Kit', url: 'https://adk.dev/', org: 'Google ADK Docs', date: '2026-10' },
    { title: 'Strands Agents', url: 'https://strandsagents.com/', org: 'Strands Docs', date: '2026-10' },
    { title: 'LangGraph overview', url: 'https://docs.langchain.com/oss/python/langgraph/overview', org: 'LangChain Docs' },
    { title: 'Microsoft Agent Framework overview', url: 'https://learn.microsoft.com/en-us/agent-framework/overview/', org: 'Microsoft Learn' },
    { title: 'What is Amazon Bedrock AgentCore', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html', org: 'AWS Docs' },
    { title: 'Agent Runtime (Gemini Enterprise Agent Platform)', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime', org: 'Google Cloud Docs' },
    { title: 'Microsoft Foundry Agent Service overview', url: 'https://learn.microsoft.com/en-us/azure/foundry/agents/overview', org: 'Microsoft Learn' },
    { title: 'AWS Prescriptive Guidance: Agentic AI frameworks', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-frameworks/introduction.html', org: 'AWS' },
    { title: 'Demystifying evals for AI agents', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents', org: 'Anthropic', date: '2026-01-09' },
    { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', org: 'Anthropic', date: '2024-12-19' },
  ],
}
