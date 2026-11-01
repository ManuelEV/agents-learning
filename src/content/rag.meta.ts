import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'rag',
  title: 'RAG para agentes empresariales',
  description: 'De naive a agentic RAG: ingesta, chunking, búsqueda híbrida con RRF, reranking, Contextual Retrieval, GraphRAG, permisos, vector stores y evaluación.',
  section: 'conectar',
  order: 1,
  readingMinutes: 16,
  level: 'intermedio',
  tags: ['RAG', 'búsqueda híbrida', 'reranking', 'Knowledge Bases', 'vector stores'],
  references: [
    { title: 'Introducing Contextual Retrieval', url: 'https://www.anthropic.com/news/contextual-retrieval', org: 'Anthropic', date: '2024-09' },
    { title: 'GraphRAG: documentación', url: 'https://microsoft.github.io/graphrag/', org: 'Microsoft' },
    { title: 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization', url: 'https://arxiv.org/abs/2404.16130', org: 'arXiv', date: '2024-04' },
    { title: 'Ragas: métricas disponibles', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/', org: 'RAGAS' },
    { title: 'Configurar un vector store para Knowledge Bases', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html', org: 'AWS Docs' },
    { title: 'Retrieve (API de Bedrock Agent Runtime)', url: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html', org: 'AWS Docs' },
    { title: 'Usar un modelo de reranking en Amazon Bedrock', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/rerank-use.html', org: 'AWS Docs' },
    { title: 'Amazon S3 Vectors ya es GA', url: 'https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-vectors-generally-available/', org: 'AWS', date: '2025-12-02' },
    { title: 'RAG Engine: opciones de base vectorial', url: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/vector-db-choices', org: 'Google Cloud Docs' },
    { title: 'Cloudflare AI Search', url: 'https://developers.cloudflare.com/ai-search/', org: 'Cloudflare Docs' },
    { title: 'OWASP Top 10 for LLM Applications 2025 (LLM08: Vector and Embedding Weaknesses)', url: 'https://genai.owasp.org/llm-top-10/', org: 'OWASP', date: '2024-11' },
    { title: 'Function tools en ADK', url: 'https://adk.dev/tools-custom/function-tools/', org: 'Google ADK Docs' },
  ],
}
