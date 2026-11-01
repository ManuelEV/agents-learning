import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'casos-reales',
  title: 'Casos reales: qué aprendieron las empresas que operan agentes a escala',
  description:
    'Síntesis de más de 30 casos documentados —soporte, migraciones de código, investigación multiagente, datos, finanzas y plataformas internas—: cómo leerlos con criterio, qué patrones se repiten y qué significan para un stack ADK + AI gateway + Bedrock.',
  section: 'casos',
  order: 1,
  readingMinutes: 16,
  level: 'intermedio',
  tags: ['casos reales', 'lecciones', 'producción', 'escala'],
  references: [
    { title: 'How we built our multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system', org: 'Anthropic', date: '2025-06-13' },
    { title: 'Don’t build multi-agents', url: 'https://cognition.com/blog/dont-build-multi-agents', org: 'Cognition', date: '2025-06-12' },
    { title: "Designing MCP Gateway: Uber's MCP Management Platform", url: 'https://www.uber.com/blog/designing-mcp-gateway/', org: 'Uber Engineering', date: '2026-10-01' },
    { title: "Navigating the LLM Landscape: Uber's Innovation with GenAI Gateway", url: 'https://www.uber.com/blog/genai-gateway/', org: 'Uber Engineering', date: '2024-07-11' },
    { title: 'The AI engineering stack we built internally, on the platform we ship', url: 'https://blog.cloudflare.com/internal-ai-engineering-stack/', org: 'Cloudflare', date: '2026-04-20' },
    { title: 'Path to high-quality LLM-based Dasher support automation', url: 'https://careersatdoordash.com/blog/large-language-modules-based-dasher-support-automation/', org: 'DoorDash Engineering', date: '2024-09-17' },
    { title: 'Accelerating Large-Scale Test Migration with LLMs', url: 'https://airbnb.tech/?p=366', org: 'Airbnb Engineering', date: '2025-03' },
    { title: 'Migrating Code At Scale With LLMs At Google (arXiv:2504.09691)', url: 'https://arxiv.org/abs/2504.09691', org: 'Google Research', date: '2025-04-13' },
    { title: 'Background Coding Agents: Predictable Results Through Strong Feedback Loops (Honk, Part 3)', url: 'https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3', org: 'Spotify Engineering', date: '2025-12-09' },
    { title: 'Text-to-SQL for Enterprise Data Analytics (LinkedIn)', url: 'https://arxiv.org/abs/2507.14372', org: 'arXiv', date: '2025-07-18' },
    { title: 'Morgan Stanley uses AI evals to shape the future of financial services', url: 'https://openai.com/index/morgan-stanley/', org: 'OpenAI', date: '2024-12-04' },
    { title: 'When the storm clears, so should the claim queue (Project Nemo)', url: 'https://www.allianz.com/en/mediacenter/news/articles/251103-when-the-storm-clears-so-should-the-claim-queue.html', org: 'Allianz', date: '2025-11-03' },
    { title: 'Klarna vuelve a invertir en agentes humanos (cita entrevista de Bloomberg)', url: 'https://www.customerexperiencedive.com/news/klarna-reinvests-human-talent-customer-service-AI-chatbot/747586/', org: 'CX Dive', date: '2025-05-09' },
    { title: 'Block scaled MCP to 12,000 employees across 15 job functions', url: 'https://allthingsopen.org/articles/block-scaled-mcp-12000-employees-15-job-functions', org: 'All Things Open', date: '2025-12-02' },
    { title: 'ZenML LLMOps Database (casos de producción resumidos)', url: 'https://www.zenml.io/llmops-database', org: 'ZenML', note: 'Índice útil para encontrar más casos; verifica siempre la fuente original' },
  ],
}
