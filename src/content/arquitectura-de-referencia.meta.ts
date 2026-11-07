import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'arquitectura-de-referencia',
  title: 'Arquitectura de referencia: framework, AI gateway y runtime gestionado',
  description:
    'Una arquitectura empresarial de extremo a extremo, implementada como ejemplo con Google ADK, LiteLLM Proxy como AI gateway, Claude en Bedrock y AgentCore: herramientas MCP gobernadas, RAG, memoria, guardrails, observabilidad y CI/CD con gate de evaluaciones. Cada pieza tiene equivalentes en otras nubes.',
  section: 'arquitecturas',
  order: 1,
  readingMinutes: 22,
  level: 'avanzado',
  tags: ['Google ADK', 'LiteLLM', 'Bedrock', 'AgentCore', 'AI gateway', 'MCP'],
  references: [
    { title: 'Modelos vía LiteLLM en ADK', url: 'https://adk.dev/agents/models/litellm/', org: 'Google ADK Docs' },
    { title: 'Sample oficial: Google ADK en AgentCore Runtime', url: 'https://github.com/awslabs/agentcore-samples/tree/main/03-integrations/agentic-frameworks/adk', org: 'GitHub' },
    { title: 'Get started with the AgentCore CLI', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html', org: 'AWS Docs', date: '2026-10' },
    { title: 'AgentCore Runtime service contract', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-service-contract.html', org: 'AWS Docs' },
    { title: 'Guidance for Multi-Provider Generative AI Gateway on AWS', url: 'https://aws.amazon.com/solutions/guidance/multi-provider-generative-ai-gateway-on-aws/', org: 'AWS' },
    { title: 'LiteLLM: Bedrock provider', url: 'https://docs.litellm.ai/docs/providers/bedrock', org: 'LiteLLM Docs' },
    { title: 'LiteLLM: virtual keys y presupuestos', url: 'https://docs.litellm.ai/docs/proxy/virtual_keys', org: 'LiteLLM Docs' },
    { title: 'LiteLLM: fallbacks, retries y cooldowns', url: 'https://docs.litellm.ai/docs/proxy/reliability', org: 'LiteLLM Docs' },
    { title: 'LiteLLM: Bedrock Guardrails en el proxy', url: 'https://docs.litellm.ai/docs/proxy/guardrails/bedrock', org: 'LiteLLM Docs' },
    { title: 'Global cross-Region inference (IAM y SCP)', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/global-cross-region-inference.html', org: 'AWS Docs' },
    { title: 'Prompt caching en Bedrock', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html', org: 'AWS Docs' },
    { title: 'AgentCore Gateway', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html', org: 'AWS Docs' },
    { title: 'Policy in AgentCore (Cedar)', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy.html', org: 'AWS Docs', date: '2026-03-03' },
    { title: 'AgentCore Memory con el AgentCore SDK', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-sdk-memory.html', org: 'AWS Docs' },
    { title: 'AgentCore Evaluations: frameworks soportados (Google ADK)', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/supported-frameworks.html', org: 'AWS Docs' },
  ],
}
