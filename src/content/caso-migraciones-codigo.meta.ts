import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'caso-migraciones-codigo',
  title: 'Caso real: agentes para migraciones de código a gran escala',
  description:
    'Cómo Airbnb, Google, Amazon, Spotify y Nubank usan LLMs y agentes para migrar miles de archivos y repos: pipelines por unidad, verificación con compiladores y tests, reintentos, revisión humana, cifras con fuente y fecha, límites y qué puedes replicar con ADK, un AI gateway y Bedrock.',
  section: 'casos',
  order: 3,
  readingMinutes: 22,
  level: 'avanzado',
  tags: ['migraciones', 'agentes de código', 'modernización', 'verificación', 'casos reales', 'AWS Transform'],
  references: [
    { title: 'Accelerating Large-Scale Test Migration with LLMs', url: 'https://airbnb.tech/?p=366', org: 'Airbnb Engineering', date: '2025-03' },
    { title: 'Airbnb Uses LLMs to Migrate Thousands of Test Files (cobertura)', url: 'https://www.infoq.com/news/2025/03/airbnb-llm-test-migration/', org: 'InfoQ', date: '2025-03' },
    { title: 'Accelerating code migrations with AI', url: 'https://research.google/blog/accelerating-code-migrations-with-ai/', org: 'Google Research', date: '2024-07-18' },
    { title: 'How is Google using AI for internal code migrations? (arXiv:2501.06972)', url: 'https://arxiv.org/abs/2501.06972', org: 'Google Research', date: '2025-01-12' },
    { title: 'Migrating Code At Scale With LLMs At Google (arXiv:2504.09691)', url: 'https://arxiv.org/abs/2504.09691', org: 'Google Research', date: '2025-04-13' },
    { title: 'Andy Jassy: upgrades de Java con Amazon Q (post en LinkedIn)', url: 'https://www.linkedin.com/posts/andy-jassy-8b1615_one-of-the-most-tedious-but-critical-tasks-activity-7232374162185461760-AdSz/', org: 'Amazon', date: '2024-08-22' },
    { title: 'Amazon Q Developer just reached a $260 million dollar milestone', url: 'https://aws.amazon.com/blogs/devops/amazon-q-developer-just-reached-a-260-million-dollar-milestone/', org: 'AWS', date: '2024-08-01' },
    { title: 'How Amazon Q Developer transforms code for Java language upgrades', url: 'https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/how-CT-works.html', org: 'AWS Docs' },
    { title: 'Amazon Q Developer end-of-support announcement', url: 'https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/', org: 'AWS', date: '2026-04-30' },
    { title: 'AWS Transform custom (guía de usuario)', url: 'https://docs.aws.amazon.com/transform/latest/userguide/custom.html', org: 'AWS Docs' },
    { title: 'AWS launches AWS Transform custom', url: 'https://aws.amazon.com/about-aws/whats-new/2025/12/transform-custom-organization-wide-modernization', org: 'AWS', date: '2025-12-01' },
    { title: 'AWS Transform custom: the learn-scale-improve flywheel', url: 'https://aws.amazon.com/blogs/devops/aws-transform-custom-enterprise-code-modernization-with-the-learn-scale-improve-flywheel/', org: 'AWS', date: '2026-04-26' },
    { title: "1,500+ PRs Later: Spotify's Journey with Our Background Coding Agent (Honk, Part 1)", url: 'https://engineering.atspotify.com/2025/11/spotifys-background-coding-agent-part-1', org: 'Spotify Engineering', date: '2025-11-06' },
    { title: 'Background Coding Agents: Context Engineering (Honk, Part 2)', url: 'https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2', org: 'Spotify Engineering', date: '2025-11-24' },
    { title: 'Background Coding Agents: Predictable Results Through Strong Feedback Loops (Honk, Part 3)', url: 'https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3', org: 'Spotify Engineering', date: '2025-12-09' },
    { title: 'Background Coding Agents: Dataset Migrations (Honk, Part 4)', url: 'https://engineering.atspotify.com/2026/4/background-coding-agents-dataset-migrations-honk-part-4', org: 'Spotify Engineering', date: '2026-04-22' },
    { title: 'How Nubank refactors millions of lines of code with Devin (caso del proveedor)', url: 'https://devin.ai/customers/nubank', org: 'Cognition' },
    { title: 'Automated Unit Test Improvement using LLMs at Meta (arXiv:2402.09171)', url: 'https://arxiv.org/abs/2402.09171', org: 'Meta', date: '2024-02-14' },
  ],
}
