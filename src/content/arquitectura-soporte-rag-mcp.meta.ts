import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'arquitectura-soporte-rag-mcp',
  title: 'Arquitectura de referencia: asistente de soporte con RAG y MCP',
  description:
    'Asistente de atención al cliente para un retailer: canales, RAG sobre políticas con búsqueda híbrida, reranking, citas y ACL, servidores MCP de pedidos, CRM y tickets, reembolsos con aprobación humana, escalamiento, guardrails y evaluaciones.',
  section: 'arquitecturas',
  order: 2,
  readingMinutes: 18,
  level: 'avanzado',
  tags: ['soporte', 'RAG', 'MCP', 'human-in-the-loop', 'guardrails', 'evals'],
  references: [
    { title: 'Contextual Retrieval', url: 'https://www.anthropic.com/news/contextual-retrieval', org: 'Anthropic', date: '2024-09-19' },
    { title: 'Demystifying evals for AI agents', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents', org: 'Anthropic', date: '2026-01-09' },
    { title: 'Writing effective tools for agents', url: 'https://www.anthropic.com/engineering/writing-tools-for-agents', org: 'Anthropic', date: '2025-09' },
    { title: 'KnowledgeBaseVectorSearchConfiguration (filtros, HYBRID, reranking)', url: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_KnowledgeBaseVectorSearchConfiguration.html', org: 'AWS Docs' },
    { title: 'Reranking en Knowledge Bases', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/rerank-use.html', org: 'AWS Docs' },
    { title: 'Bedrock Guardrails', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html', org: 'AWS Docs' },
    { title: 'Policy in AgentCore: condiciones Cedar', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-conditions.html', org: 'AWS Docs' },
    { title: 'Tool confirmation (human-in-the-loop) en ADK', url: 'https://adk.dev/tools-custom/confirmation/', org: 'Google ADK Docs' },
    { title: 'MCP tools en ADK', url: 'https://adk.dev/tools-custom/mcp-tools/', org: 'Google ADK Docs' },
    { title: 'Especificación MCP 2026-07-28: seguridad', url: 'https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices', org: 'MCP', date: '2026-07-28' },
    { title: 'RAGAS: métricas disponibles', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/', org: 'RAGAS' },
    { title: 'OWASP Top 10 for LLM Applications 2025', url: 'https://genai.owasp.org/llm-top-10/', org: 'OWASP', date: '2025' },
    { title: 'A practical guide to building agents (PDF)', url: 'https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf', org: 'OpenAI', date: '2025-04' },
  ],
}
