import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'caso-datos-analitica',
  title: 'Caso real: agentes de datos y analítica (Uber, LinkedIn, Pinterest, Meta)',
  description:
    'Cómo Uber (QueryGPT, Finch, Genie), LinkedIn (SQL Bot), Pinterest (Analytics Agent) y Meta llevaron agentes de text-to-SQL, analítica y on-call a producción: resolución de esquemas, RAG sobre catálogos, validación de SQL, permisos, evaluación, cifras con fecha y límites reconocidos.',
  section: 'casos',
  order: 5,
  readingMinutes: 22,
  level: 'avanzado',
  tags: ['text-to-SQL', 'analítica', 'catálogo de datos', 'validación de SQL', 'on-call', 'Uber', 'LinkedIn', 'Pinterest', 'Meta'],
  references: [
    { title: 'QueryGPT – Natural Language to SQL using Generative AI', url: 'https://www.uber.com/blog/query-gpt/', org: 'Uber Engineering', date: '2024-09-19' },
    { title: "Unlocking Financial Insights with Finch: Uber's Conversational AI Data Agent", url: 'https://www.uber.com/blog/unlocking-financial-insights-with-finch/', org: 'Uber Engineering', date: '2025-07-17' },
    { title: "Genie: Uber's Gen AI On-Call Copilot", url: 'https://www.uber.com/blog/genie-ubers-gen-ai-on-call-copilot/', org: 'Uber Engineering', date: '2024-10-10' },
    { title: 'Practical text-to-SQL for data analytics (SQL Bot)', url: 'https://www.linkedin.com/blog/engineering/ai/practical-text-to-sql-for-data-analytics', org: 'LinkedIn Engineering', date: '2024-12-09' },
    { title: 'Text-to-SQL for Enterprise Data Analytics (LinkedIn, KDD 2025 Agentic AI workshop)', url: 'https://arxiv.org/abs/2507.14372', org: 'arXiv', date: '2025-07-18' },
    { title: 'How we built Text-to-SQL at Pinterest', url: 'https://medium.com/pinterest-engineering/how-we-built-text-to-sql-at-pinterest-30bad30dabff', org: 'Pinterest Engineering', date: '2024-04-02' },
    { title: 'Unified Context-Intent Embeddings for Scalable Text-to-SQL', url: 'https://medium.com/pinterest-engineering/unified-context-intent-embeddings-for-scalable-text-to-sql-793635e60aac', org: 'Pinterest Engineering', date: '2026-03-06' },
    { title: 'Customer story: Pinterest (PinCat y Analytics Agent)', url: 'https://datahub.com/?p=5615', org: 'DataHub', date: '2026', note: 'Caso publicado por el proveedor' },
    { title: 'Text-to-SQL system with RAG-enhanced table selection (resumen del post de Pinterest)', url: 'https://www.zenml.io/llmops-database/text-to-sql-system-with-rag-enhanced-table-selection', org: 'ZenML', note: 'Fuente secundaria' },
    { title: 'Leveraging AI for efficient incident response', url: 'https://engineering.fb.com/2024/06/24/data-infrastructure/leveraging-ai-for-efficient-incident-response/', org: 'Meta', date: '2024-06-24' },
    { title: 'Swiggy Hermes V3: from text-to-SQL to conversational AI', url: 'https://www.infoq.com/news/2026/01/swiggy-hermes-conversational-ai', org: 'InfoQ', date: '2026-01-02' },
    { title: 'Conversational Analytics in BigQuery is now GA', url: 'https://cloud.google.com/blog/products/data-analytics/conversational-analytics-in-bigquery-now-ga', org: 'Google Cloud', date: '2026-06-30' },
    { title: 'Using the fully managed remote BigQuery MCP server to build data AI agents', url: 'https://cloud.google.com/blog/products/data-analytics/using-the-fully-managed-remote-bigquery-mcp-server-to-build-data-ai-agents', org: 'Google Cloud', date: '2026-01-07' },
    { title: 'BigQuery: ejecutar consultas (dry run y límites de bytes)', url: 'https://cloud.google.com/bigquery/docs/running-queries', org: 'Google Cloud Docs' },
    { title: 'sqlglot: parser y transpilador de SQL', url: 'https://github.com/tobymao/sqlglot', org: 'GitHub' },
  ],
}
