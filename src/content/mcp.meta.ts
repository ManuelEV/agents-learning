import type { PostMeta } from '../lib/content'

export const meta: PostMeta = {
  slug: 'mcp',
  title: 'Model Context Protocol (MCP)',
  description: 'Arquitectura host/cliente/servidor, transportes, primitivas, la spec stateless 2026-07-28 (qué cambió), autorización OAuth 2.1, seguridad y cómo consumir MCP desde ADK y Strands.',
  section: 'conectar',
  order: 2,
  readingMinutes: 17,
  level: 'intermedio',
  tags: ['MCP', 'herramientas', 'OAuth 2.1', 'Streamable HTTP', 'seguridad'],
  references: [
    { title: 'Especificación MCP 2026-07-28', url: 'https://modelcontextprotocol.io/specification/2026-07-28', org: 'MCP', date: '2026-07-28' },
    { title: 'Key Changes (changelog 2025-11-25 → 2026-07-28)', url: 'https://modelcontextprotocol.io/specification/2026-07-28/changelog', org: 'MCP', date: '2026-07-28' },
    { title: 'Transports: Streamable HTTP', url: 'https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http', org: 'MCP', date: '2026-07-28' },
    { title: 'Authorization', url: 'https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization', org: 'MCP', date: '2026-07-28' },
    { title: 'Security Best Practices', url: 'https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices', org: 'MCP', date: '2026-07-28' },
    { title: 'RFC 9728: OAuth 2.0 Protected Resource Metadata', url: 'https://datatracker.ietf.org/doc/html/rfc9728', org: 'IETF', date: '2025-04' },
    { title: 'MCP Registry (preview)', url: 'https://modelcontextprotocol.io/registry/about', org: 'MCP' },
    { title: 'MCP Apps: overview', url: 'https://modelcontextprotocol.io/extensions/apps/overview', org: 'MCP' },
    { title: 'MCP Python SDK (v2)', url: 'https://github.com/modelcontextprotocol/python-sdk', org: 'GitHub' },
    { title: 'MCP tools en ADK (McpToolset)', url: 'https://adk.dev/tools-custom/mcp-tools/', org: 'Google ADK Docs' },
    { title: 'MCP tools en Strands Agents', url: 'https://strandsagents.com/latest/documentation/docs/user-guide/concepts/tools/mcp-tools/', org: 'Strands Docs' },
    { title: 'MCP Security Notification: Tool Poisoning Attacks', url: 'https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks', org: 'Invariant Labs', date: '2025-04' },
    { title: 'Linux Foundation anuncia la Agentic AI Foundation', url: 'https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation', org: 'Linux Foundation', date: '2025-12-09' },
  ],
}
