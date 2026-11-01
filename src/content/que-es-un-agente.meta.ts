import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'que-es-un-agente',
  title: '¿Qué es un agente de IA?',
  description: 'El loop agéntico por dentro: modelo, herramientas, contexto y harness. Cuándo conviene un agente y cuándo un workflow.',
  section: 'fundamentos',
  order: 1,
  readingMinutes: 12,
  level: 'básico',
  tags: ['loop agéntico', 'tool calling', 'workflows'],
  references: [
    { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', org: 'Anthropic', date: '2024-12-19' },
    { title: 'A practical guide to building agents (PDF)', url: 'https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf', org: 'OpenAI', date: '2025-04' },
    { title: 'Introduction to Agents (whitepaper, 5-Day AI Agents Intensive)', url: 'https://blog.google/innovation-and-ai/technology/developers-tools/ai-agents-intensive-recap/', org: 'Google / Kaggle', date: '2025-11' },
    { title: 'Effective context engineering for AI agents', url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents', org: 'Anthropic', date: '2025-09-29' },
    { title: 'Tool use con la Converse API', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html', org: 'AWS Docs' },
    { title: 'AWS Prescriptive Guidance: Agentic AI patterns', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/introduction.html', org: 'AWS' },
    { title: 'Function tools en ADK', url: 'https://adk.dev/tools-custom/function-tools/', org: 'Google ADK Docs' },
  ],
}
