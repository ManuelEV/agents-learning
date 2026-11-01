import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'seguridad-gobernanza',
  title: 'Seguridad y gobernanza de agentes',
  description: 'Modelo de amenazas, OWASP para LLMs y agentes, prompt injection indirecta, identidad y políticas por tool call, guardrails, seguridad MCP, cadena de suministro y marcos de gobierno.',
  section: 'produccion',
  order: 2,
  readingMinutes: 19,
  level: 'avanzado',
  tags: ['OWASP', 'prompt injection', 'identidad', 'Cedar', 'guardrails', 'gobernanza'],
  references: [
    { title: 'OWASP Top 10 for LLM Applications 2025', url: 'https://genai.owasp.org/llm-top-10/', org: 'OWASP', date: '2024-11' },
    { title: 'OWASP Top 10 for Agentic Applications for 2026', url: 'https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/', org: 'OWASP', date: '2025-12-09' },
    { title: 'MCP: Security Best Practices (2026-07-28)', url: 'https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices', org: 'MCP', date: '2026-07-28' },
    { title: 'MCP: Authorization (2026-07-28)', url: 'https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization', org: 'MCP', date: '2026-07-28' },
    { title: 'MCP Security Notification: Tool Poisoning Attacks', url: 'https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks', org: 'Invariant Labs', date: '2025-04' },
    { title: 'A practical guide to building agents (PDF)', url: 'https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf', org: 'OpenAI', date: '2025-04' },
    { title: 'Policy in Amazon Bedrock AgentCore', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html', org: 'AWS Docs' },
    { title: 'Use the ApplyGuardrail API in your application', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-independent-api.html', org: 'AWS Docs' },
    { title: 'Callbacks en ADK: tipos y before_tool_callback', url: 'https://adk.dev/callbacks/types-of-callbacks/', org: 'Google ADK Docs' },
    { title: 'Agent Identity overview', url: 'https://docs.cloud.google.com/iam/docs/agent-identity-overview', org: 'Google Cloud Docs' },
    { title: 'What is Microsoft Entra Agent ID?', url: 'https://learn.microsoft.com/en-us/entra/agent-id/what-is-microsoft-entra-agent-id', org: 'Microsoft Learn' },
    { title: 'LiteLLM: avisos de seguridad (incidente PyPI de marzo de 2026)', url: 'https://docs.litellm.ai/blog/tags/security', org: 'LiteLLM Docs', date: '2026-03' },
    { title: 'The Dual LLM pattern for building AI assistants that can resist prompt injection', url: 'https://simonwillison.net/2023/Apr/25/dual-llm-pattern/', org: 'Simon Willison', date: '2023-04-25' },
    { title: 'NIST AI 600-1: Generative AI Profile (AI RMF)', url: 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf', org: 'NIST', date: '2024-07' },
    { title: 'Announcing the AI Agent Standards Initiative (CAISI)', url: 'https://www.nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure', org: 'NIST', date: '2026-02-17' },
  ],
}
