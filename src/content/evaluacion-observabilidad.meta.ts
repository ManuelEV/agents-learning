import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'evaluacion-observabilidad',
  title: 'Evaluación y observabilidad de agentes',
  description: 'Cómo medir si un agente funciona: tareas, trials y graders, pass@k vs. pass^k, evals en CI/CD y en producción, y trazas OpenTelemetry de cada paso.',
  section: 'produccion',
  order: 1,
  readingMinutes: 17,
  level: 'avanzado',
  tags: ['evals', 'LLM-as-judge', 'OpenTelemetry', 'observabilidad', 'CI/CD'],
  references: [
    { title: 'Demystifying evals for AI agents', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents', org: 'Anthropic', date: '2026-01-09' },
    { title: 'How we built our multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system', org: 'Anthropic', date: '2025-06-13' },
    { title: 'Agent Quality (whitepaper, 5-Day AI Agents Intensive)', url: 'https://www.kaggle.com/whitepaper-agent-quality', org: 'Google / Kaggle', date: '2025-11' },
    { title: 'Why evaluate agents (adk eval, criterios y AgentEvaluator)', url: 'https://adk.dev/evaluate/', org: 'Google ADK Docs' },
    { title: 'AgentCore Evaluations', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations.html', org: 'AWS Docs' },
    { title: 'AgentCore Observability', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability.html', org: 'AWS Docs' },
    { title: 'OpenTelemetry GenAI semantic conventions (repositorio)', url: 'https://github.com/open-telemetry/semantic-conventions-genai', org: 'OpenTelemetry' },
    { title: 'Semantic conventions for GenAI agent spans', url: 'https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md', org: 'OpenTelemetry' },
    { title: 'MCP 2026-07-28: changelog (trace context en _meta)', url: 'https://modelcontextprotocol.io/specification/2026-07-28/changelog', org: 'MCP', date: '2026-07-28' },
    { title: 'RAGAS: métricas disponibles', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/', org: 'RAGAS' },
    { title: 'Langfuse is joining ClickHouse', url: 'https://langfuse.com/blog/joining-clickhouse', org: 'Langfuse', date: '2026-01-16' },
    { title: 'LangSmith: evaluación', url: 'https://docs.langchain.com/langsmith/evaluation', org: 'LangChain Docs' },
    { title: 'Arize Phoenix (OSS, OpenInference)', url: 'https://github.com/Arize-ai/phoenix', org: 'GitHub' },
  ],
}
