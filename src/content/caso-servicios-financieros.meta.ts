import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'caso-servicios-financieros',
  title: 'Caso real: agentes en servicios financieros y seguros',
  description:
    "Morgan Stanley, JPMorgan, Moody's, Allianz y Robinhood: qué construyeron, con qué arquitectura publicada y cómo resuelven evaluación antes de producción, trazabilidad, humano en el loop, residencia de datos y gestión de modelos en industrias reguladas.",
  section: 'casos',
  order: 6,
  readingMinutes: 20,
  level: 'intermedio',
  tags: ['Servicios financieros', 'Seguros', 'Gobernanza', 'Evaluaciones', 'Bedrock', 'Multiagente'],
  references: [
    { title: 'Morgan Stanley uses AI evals to shape the future of financial services', url: 'https://openai.com/index/morgan-stanley/', org: 'OpenAI', date: '2024-12-04', note: 'Caso de estudio del proveedor' },
    { title: 'LLM Suite named 2025 Innovation of the Year by American Banker', url: 'https://www.jpmorganchase.com/about/technology/blog/llmsuite-ab-award', org: 'JPMorganChase', date: '2025-06-03' },
    { title: "Here's JPMorgan Chase's blueprint to become the world's first fully AI-powered megabank", url: 'https://www.cnbc.com/2025/09/30/jpmorgan-chase-fully-ai-connected-megabank.html', org: 'CNBC', date: '2025-09-30' },
    { title: "AWS re:Invent 2025 – Moody's: Architecting a multi-agent system on AWS (IND3303)", url: 'https://www.youtube.com/watch?v=HC8jSzNmNpU', org: 'AWS', date: '2025-12' },
    { title: "Resumen de la sesión IND3303 (Moody's) basado en transcripción", url: 'https://www.zenml.io/llmops-database/multi-agent-ai-system-for-financial-intelligence-and-risk-analysis', org: 'ZenML', note: 'Fuente secundaria' },
    { title: "Moody's Agentic Solutions (anuncio)", url: 'https://www.moodys.com/web/en/us/creditview/blog/agentic-solutions-announcement.html', org: "Moody's", date: '2025-09-16' },
    { title: "Moody's brings decision-grade credit intelligence to AWS Marketplace", url: 'https://www.moodys.com/web/en/us/media-relations/press-releases/moodys-brings-decision-grade-credit-intelligence-to-aws-marketplace.html', org: "Moody's", date: '2026-04-16' },
    { title: 'When the storm clears, so should the claim queue (Project Nemo)', url: 'https://www.allianz.com/en/mediacenter/news/articles/251103-when-the-storm-clears-so-should-the-claim-queue.html', org: 'Allianz', date: '2025-11-03' },
    { title: 'AWS re:Invent 2025 – The next frontier: Building the agentic future of Financial Services (INV209)', url: 'https://www.youtube.com/watch?v=_Wi_4I40bqQ', org: 'AWS', date: '2025-12' },
    { title: 'AWS re:Invent 2025 – Fine-tuning models for accuracy and latency at Robinhood Markets (IND392)', url: 'https://www.youtube.com/watch?v=vQ8P-_u2tH4', org: 'AWS', date: '2025-12' },
    { title: 'Resumen de la sesión IND392 (Robinhood) basado en transcripción', url: 'https://dev.to/kazuya_dev/aws-reinvent-2025-fine-tuning-models-for-accuracy-and-latency-at-robinhood-markets-ind392-1d6c', org: 'DEV Community', note: 'Auto-generado; fuente secundaria' },
    { title: 'Financial institutions advance mission-critical workloads and agentic AI at re:Invent 2025', url: 'https://aws.amazon.com/blogs/industries/financial-institutions-advance-mission-critical-workloads-and-agentic-ai-at-reinvent-2025', org: 'AWS', date: '2026-01-14' },
    { title: 'BBVA and OpenAI collaborate to transform global banking', url: 'https://openai.com/index/bbva-collaboration-expansion/', org: 'OpenAI', date: '2025-12-12' },
    { title: 'Agencies Overhaul Model Risk Management Guidance for Banks', url: 'https://www.orrick.com/en/Insights/2026/04/Agencies-Overhaul-Model-Risk-Management-Guidance-for-Banks-Heres-What-Changed', org: 'Orrick', date: '2026-04-24' },
    { title: 'EU AI Act Omnibus Agreement — Postponed High-Risk Deadlines', url: 'https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/', org: 'Gibson Dunn', date: '2026-05-27' },
    { title: 'Inferencia entre regiones en Amazon Bedrock', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html', org: 'AWS Docs' },
  ],
}
