import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'caso-investigacion-multiagente',
  title: 'Caso real: sistemas multiagente de investigación profunda',
  description:
    'Cómo construyeron sus sistemas orquestador-trabajadores Anthropic (Research), LinkedIn (Hiring Assistant), Thomson Reuters (Deep Research en Westlaw) y Exa: roles, paralelismo, presupuesto de tokens, evaluación, manejo de errores, resultados y cuándo no conviene multiagente.',
  section: 'casos',
  order: 4,
  readingMinutes: 22,
  level: 'avanzado',
  tags: ['multiagente', 'orquestador-trabajadores', 'deep research', 'evaluación', 'casos reales'],
  references: [
    { title: 'How we built our multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system', org: 'Anthropic', date: '2025-06-13' },
    { title: 'How we engineered LinkedIn’s Hiring Assistant', url: 'https://www.linkedin.com/blog/engineering/ai/how-we-engineered-linkedins-hiring-assistant', org: 'LinkedIn', date: '2025-10-21' },
    { title: 'Hiring Assistant, LinkedIn’s first AI agent for recruiters, to launch globally in English', url: 'https://news.linkedin.com/2025/hiring-assistant-globally-available', org: 'LinkedIn', date: '2025-09-03' },
    { title: 'Thomson Reuters is changing legal research forever: meet Deep Research', url: 'https://www.thomsonreuters.com/en-us/posts/innovation/thomson-reuters-is-changing-legal-research-forever-meet-deep-research/', org: 'Thomson Reuters', date: '2025-08-05' },
    { title: 'Thomson Reuters launches CoCounsel Legal with agentic AI and Deep Research', url: 'https://www.thomsonreuters.com/en/press-releases/2025/august/thomson-reuters-launches-cocounsel-legal-transforming-legal-work-with-agentic-ai-and-deep-research', org: 'Thomson Reuters', date: '2025-08-05' },
    { title: 'Deep Research in Westlaw and CoCounsel: building agents that research like lawyers', url: 'https://medium.com/tr-labs-ml-engineering-blog/deep-research-in-westlaw-and-cocounsel-building-agents-that-research-like-lawyers-508ad5c70e45', org: 'Thomson Reuters', date: '2025', note: 'TR Labs; no se pudo leer el original (acceso bloqueado), se usó el resumen de ZenML' },
    { title: 'Thomson Reuters brings agentic AI to legal workflows', url: 'https://www.constellationr.com/insights/news/thomson-reuters-brings-agentic-ai-legal-workflows', org: 'Constellation Research', date: '2025-08-05', note: 'Fuente secundaria (entrevista a TR)' },
    { title: 'Agentic AI for legal research: building Deep Research in Westlaw and CoCounsel', url: 'https://zenml.io/llmops-database/agentic-ai-for-legal-research-building-deep-research-in-westlaw-and-cocounsel', org: 'ZenML', note: 'Fuente secundaria (resumen del post de TR Labs)' },
    { title: 'How Exa built a web research multi-agent system with LangGraph and LangSmith', url: 'https://www.langchain.com/blog/exa', org: 'LangChain', date: '2025-06-30' },
    { title: 'Integrating Deep Research into Harvey', url: 'https://www.harvey.ai/blog/integrating-deep-research-into-harvey', org: 'Harvey', date: '2025-07-03' },
    { title: 'Introducing deep research', url: 'https://openai.com/index/introducing-deep-research/', org: 'OpenAI', date: '2025-02-02' },
    { title: 'Deep research system card', url: 'https://cdn.openai.com/deep-research-system-card.pdf', org: 'OpenAI', date: '2025-02-25' },
    { title: 'Don’t build multi-agents', url: 'https://cognition.com/blog/dont-build-multi-agents', org: 'Cognition', date: '2025-06-12' },
    { title: 'Parallel agents (workflow agents)', url: 'https://adk.dev/agents/workflow-agents/parallel-agents/', org: 'Google ADK Docs' },
    { title: 'Build context-rich research agents with Deep Agents and Bedrock AgentCore', url: 'https://aws.amazon.com/blogs/machine-learning/build-context-rich-research-agents-with-deep-agents-and-bedrock-agentcore/', org: 'AWS', date: '2026-06-15' },
  ],
}
