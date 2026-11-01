import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'aws-bedrock-agentcore',
  title: 'AWS: Amazon Bedrock y AgentCore',
  description: 'Bedrock como capa de modelos (Converse, perfiles de inferencia, prompt caching, Guardrails, Knowledge Bases) y AgentCore como plataforma para operar agentes: Runtime, Gateway, Memory, Identity, Policy y más.',
  section: 'plataformas',
  order: 1,
  readingMinutes: 18,
  level: 'intermedio',
  tags: ['Amazon Bedrock', 'AgentCore', 'perfiles de inferencia', 'Guardrails', 'IAM'],
  references: [
    { title: 'What is Amazon Bedrock AgentCore?', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html', org: 'AWS Docs' },
    { title: 'Release notes for Amazon Bedrock AgentCore', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html', org: 'AWS Docs', date: '2026-10' },
    { title: 'Get started with Amazon Bedrock AgentCore (CLI)', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html', org: 'AWS Docs' },
    { title: 'Understand the AgentCore Runtime service contract', url: 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-service-contract.html', org: 'AWS Docs' },
    { title: 'Inference endpoints supported by Amazon Bedrock (bedrock-runtime y bedrock-mantle)', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints.html', org: 'AWS Docs' },
    { title: 'Carry out a conversation with the Converse API', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html', org: 'AWS Docs' },
    { title: 'Prompt caching for faster model inference', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html', org: 'AWS Docs' },
    { title: 'Global cross-Region inference', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/global-cross-region-inference.html', org: 'AWS Docs' },
    { title: 'Prerequisites for inference profiles (políticas IAM)', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-prereq.html', org: 'AWS Docs' },
    { title: 'Amazon Bedrock Guardrails', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html', org: 'AWS Docs' },
    { title: 'Set up a vector store for a knowledge base', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html', org: 'AWS Docs' },
    { title: 'Amazon S3 Vectors is now generally available', url: 'https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-vectors-generally-available/', org: 'AWS', date: '2025-12-02' },
    { title: 'Agents for Amazon Bedrock (Classic)', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html', org: 'AWS Docs' },
    { title: 'Sample: Google ADK en AgentCore Runtime', url: 'https://github.com/awslabs/agentcore-samples/tree/main/03-integrations/agentic-frameworks/adk', org: 'GitHub' },
  ],
}
