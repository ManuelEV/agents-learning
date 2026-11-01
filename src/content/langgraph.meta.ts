import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'langgraph',
  title: 'LangGraph y LangChain 1.x',
  description: 'Grafos de estado, reducers, checkpointers y thread_id, ejecución durable, interrupts con Command(resume), subgrafos y supervisor, streaming, create_agent con middleware y Bedrock vía langchain-aws.',
  section: 'frameworks',
  order: 3,
  readingMinutes: 17,
  level: 'intermedio',
  tags: ['LangGraph', 'LangChain', 'HITL', 'checkpointers', 'durabilidad'],
  references: [
    { title: 'LangGraph overview', url: 'https://docs.langchain.com/oss/python/langgraph/overview', org: 'LangChain Docs', date: '2026-10' },
    { title: 'Interrupts (human-in-the-loop)', url: 'https://docs.langchain.com/oss/python/langgraph/interrupts', org: 'LangChain Docs' },
    { title: 'Persistence: checkpointers y stores', url: 'https://docs.langchain.com/oss/python/langgraph/persistence', org: 'LangChain Docs' },
    { title: 'Durable execution', url: 'https://docs.langchain.com/oss/python/langgraph/durable-execution', org: 'LangChain Docs' },
    { title: 'Agents (create_agent)', url: 'https://docs.langchain.com/oss/python/langchain/agents', org: 'LangChain Docs' },
    { title: 'Middleware', url: 'https://docs.langchain.com/oss/python/langchain/middleware', org: 'LangChain Docs' },
    { title: 'ChatBedrockConverse (integración Bedrock)', url: 'https://docs.langchain.com/oss/python/integrations/chat/bedrock', org: 'LangChain Docs' },
    { title: 'Product naming changes: LangSmith Deployment y LangSmith Studio', url: 'https://changelog.langchain.com/announcements/product-naming-changes-langsmith-deployment-and-langsmith-studio', org: 'LangChain Docs', date: '2025-10' },
    { title: 'langchain-ai/langgraph', url: 'https://github.com/langchain-ai/langgraph', org: 'GitHub', date: '2026-10-30' },
    { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', org: 'Anthropic', date: '2024-12-19' },
  ],
}
