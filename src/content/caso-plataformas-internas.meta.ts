import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'caso-plataformas-internas',
  title: 'Caso real: plataformas internas de agentes (Uber, Block, Cloudflare, Deutsche Telekom, LinkedIn)',
  description:
    'Cómo cinco empresas grandes habilitan a cientos de equipos para construir y operar agentes: gateway de modelos, registro y gateway MCP, identidad, observabilidad, evaluación, gobierno y adopción. Con cifras fechadas, límites y un blueprint destilado de los casos.',
  section: 'casos',
  order: 7,
  readingMinutes: 24,
  level: 'avanzado',
  tags: ['Plataforma interna', 'MCP gateway', 'AI gateway', 'Gobierno', 'Uber', 'Block', 'Cloudflare', 'Deutsche Telekom', 'LinkedIn'],
  references: [
    { title: "Navigating the LLM Landscape: Uber's Innovation with GenAI Gateway", url: 'https://www.uber.com/blog/genai-gateway/', org: 'Uber Engineering', date: '2024-07-11' },
    { title: "Designing MCP Gateway: Uber's MCP Management Platform", url: 'https://www.uber.com/blog/designing-mcp-gateway/', org: 'Uber Engineering', date: '2026-10-01' },
    { title: 'How Uber uses AI for development: inside look', url: 'https://newsletter.pragmaticengineer.com/p/how-uber-uses-ai-for-development', org: 'The Pragmatic Engineer', date: '2026-03-10' },
    { title: 'MCP in the Enterprise: Real World Adoption at Block', url: 'https://goose-docs.ai/blog/2025/04/21/mcp-in-enterprise', org: 'goose (Block)', date: '2025-04-21' },
    { title: "Block's Playbook for Designing MCP Servers", url: 'https://engineering.block.xyz/blog/blocks-playbook-for-designing-mcp-servers', org: 'Block Engineering', date: '2025-06-16' },
    { title: 'Block scaled MCP to 12,000 employees across 15 job functions (charla de Angie Jones)', url: 'https://allthingsopen.org/articles/block-scaled-mcp-12000-employees-15-job-functions', org: 'All Things Open', date: '2025-12-02' },
    { title: 'Linux Foundation anuncia la Agentic AI Foundation (MCP, goose, AGENTS.md)', url: 'https://aaif.io/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation-aaif-anchored-by-new-project-contributions-including-model-context-protocol-mcp-goose-and-agents-md/', org: 'Linux Foundation', date: '2025-12-09' },
    { title: 'Block CFO: AI leaps in 18 months led to decision to slash nearly half its workforce', url: 'https://fortune.com/2026/03/06/exclusive-block-cfo-ai-leaps-18-months-led-decision-slash-nearly-half-its-workforce', org: 'Fortune', date: '2026-03-06' },
    { title: 'The AI engineering stack we built internally, on the platform we ship', url: 'https://blog.cloudflare.com/internal-ai-engineering-stack/', org: 'Cloudflare', date: '2026-04-20' },
    { title: 'Scaling MCP adoption: reference architecture for enterprise deployments of MCP', url: 'https://blog.cloudflare.com/enterprise-mcp', org: 'Cloudflare', date: '2026-04-14' },
    { title: 'Eclipse LMOS: launching AI agents across Europe (Deutsche Telekom)', url: 'https://www.infoq.com/articles/eclipse-lmos-ai-agents', org: 'InfoQ', date: '2025-02-17' },
    { title: 'LMOS Control Plane (Operator, CRDs Agent/Channel/ChannelRouting)', url: 'https://eclipse.dev/lmos/docs/lmos_platform/lmos_control_plane/', org: 'Eclipse LMOS Docs' },
    { title: 'How Deutsche Telekom Built a Multi-Agent Enterprise Platform Leveraging Qdrant', url: 'https://qdrant.tech/blog/case-study-deutsche-telekom/', org: 'Qdrant', date: '2025-03-07' },
    { title: 'Eclipse Foundation launches ADL, an open language for defining agent behavior', url: 'https://sdtimes.com/?p=58274', org: 'SD Times', date: '2025-10-28' },
    { title: 'The LinkedIn Generative AI Application Tech Stack: Extending to Build AI agents', url: 'https://news.linkedin.com/2025/linkedin-s-ai-stack--expanding-to-build-tomorrow-s-agents', org: 'LinkedIn Engineering', date: '2025-09-10' },
    { title: 'Platform engineering for AI: scaling multi-agentic systems with MCP (resumen de podcast InfoQ)', url: 'https://www.zenml.io/llmops-database/platform-engineering-for-ai-scaling-multi-agentic-systems-with-mcp', org: 'ZenML', date: '2026' },
  ],
}
