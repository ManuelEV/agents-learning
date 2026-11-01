import type { IsoSpec } from '../components/iso/types'

export const otrosFrameworksMapa: IsoSpec = {
  id: 'otros-frameworks-mapa',
  title: 'Mapa del ecosistema por capas',
  summary:
    'Los frameworks no compiten todos en la misma capa. Arriba están los **SDKs de agente y harnesses** (el loop listo para usar), en el medio los **frameworks de orquestación** con workflows y estado, y abajo las **plataformas y runtimes** donde el agente se ejecuta. Muchos sistemas combinan una pieza de cada capa.',
  height: 500,
  zones: [
    { id: 'z1', label: 'SDKs de agente / harness', from: [-1.6, -5.0], to: [11.8, -1.8], tone: 'agent' },
    { id: 'z2', label: 'Orquestación y workflows', from: [-1.6, -1.6], to: [11.8, 1.6], tone: 'protocol' },
    { id: 'z3', label: 'Plataformas y runtimes', from: [-1.6, 1.8], to: [11.8, 5.0], tone: 'infra' },
  ],
  nodes: [
    { id: 'claude', label: 'Claude Agent SDK', sub: 'harness de Claude Code', at: [0, -3.4], shape: 'tall', tone: 'agent', icon: 'terminal', scale: 0.85, info: 'El harness de Claude Code como librería: tools integradas (Read, Edit, Bash…), permisos, hooks, subagentes, MCP y Skills. Funciona con la API de Anthropic, Bedrock, Google Cloud y Foundry.' },
    { id: 'openai', label: 'OpenAI Agents SDK', sub: 'handoffs · guardrails', at: [3.4, -3.4], shape: 'tall', tone: 'agent', icon: 'bot', scale: 0.85, info: 'Primitivas mínimas: Agent, Runner, handoffs, guardrails, sessions y tracing por defecto. Python y JS, pre-1.0 (0.24).' },
    { id: 'crew', label: 'CrewAI', sub: 'crews · flows', at: [6.8, -3.4], shape: 'tall', tone: 'agent', icon: 'users', scale: 0.85, info: 'Agentes con rol/objetivo/backstory que trabajan en Crews (secuencial o jerárquico) y Flows orientados a eventos.' },
    { id: 'vercel', label: 'Vercel AI SDK', sub: 'ToolLoopAgent', at: [10.2, -3.4], shape: 'tall', tone: 'agent', icon: 'zap', scale: 0.85, info: 'SDK TypeScript (v7) para apps con IA: `ToolLoopAgent` con `stopWhen` y `prepareStep`, streaming a la UI, `HarnessAgent`.' },
    { id: 'msaf', label: 'MS Agent Framework', sub: '.NET · Python', at: [0, 0], shape: 'box', tone: 'protocol', icon: 'workflow', info: 'Sucesor de Semantic Kernel y AutoGen. 1.0 GA en abril de 2026. Workflows en grafo con checkpointing y HITL, orquestaciones handoff, group chat y Magentic.' },
    { id: 'llama', label: 'LlamaIndex', sub: 'AgentWorkflow', at: [3.4, 0], shape: 'box', tone: 'protocol', icon: 'book', info: 'Fuerte en datos y RAG. Agentes (`FunctionAgent`, `ReActAgent`) construidos sobre Workflows orientados a eventos.' },
    { id: 'pyd', label: 'Pydantic AI v2', sub: 'tipado · durable', at: [6.8, 0], shape: 'box', tone: 'protocol', icon: 'check', info: 'Outputs tipados, inyección de dependencias con `RunContext`, Pydantic Graph y ejecución durable con Temporal, DBOS, Prefect o Restate. v2 GA en junio de 2026.' },
    { id: 'mastra', label: 'Mastra', sub: 'TypeScript', at: [10.2, 0], shape: 'box', tone: 'protocol', icon: 'code', info: 'Framework TS con agentes, workflows, memoria, RAG, evals y OTel integrados. Pensado para equipos full-stack JavaScript.' },
    { id: 'cf', label: 'Cloudflare Agents', sub: 'Durable Objects', at: [0, 3.4], shape: 'cloud', tone: 'infra', icon: 'globe', info: 'SDK donde cada agente es un Durable Object: estado persistente, WebSockets, scheduler y cliente MCP en el edge. SDK y plataforma a la vez.' },
    { id: 'agentcore', label: 'AgentCore Runtime', sub: 'AWS', at: [4.4, 3.4], shape: 'cloud', tone: 'infra', icon: 'server', info: 'Runtime agnóstico de framework: ejecuta agentes Strands, ADK, LangGraph, CrewAI, OpenAI Agents SDK, etc., con aislamiento por sesión.' },
    { id: 'foundry', label: 'Foundry hosted', sub: 'Microsoft · Google', at: [8.8, 3.4], shape: 'cloud', tone: 'infra', icon: 'cloud', info: 'Microsoft Foundry hosted agents (Agent Framework, LangGraph, Claude Agent SDK…) y su equivalente en Google, Agent Runtime: el código del framework corre en un runtime gestionado.' },
  ],
  edges: [
    { from: 'openai', to: 'agentcore', dashed: true, route: 'z' },
    { from: 'msaf', to: 'foundry', dashed: true, route: 'arc' },
    { from: 'claude', to: 'cf', dashed: true, route: 'z' },
  ],
  steps: [
    { title: 'Capa 1 · SDKs de agente y harnesses', body: 'Te dan el **loop agéntico** listo: modelo, herramientas, handoffs o subagentes, guardrails y tracing. Mínimo código; el modelo dirige.', focus: ['claude', 'openai', 'crew', 'vercel'] },
    { title: 'Capa 2 · Orquestación y workflows', body: 'Agregan **workflows** explícitos, estado tipado, durabilidad o integración profunda con datos. Aquí también viven LangGraph, los grafos de ADK 2.0 y los de Strands.', focus: ['msaf', 'llama', 'pyd', 'mastra'] },
    { title: 'Capa 3 · Plataformas y runtimes', body: 'Donde se **ejecuta** el agente: aislamiento, escalado, identidad, memoria gestionada. La mayoría son agnósticos de framework.', focus: ['cf', 'agentcore', 'foundry'] },
    { title: 'Las capas se combinan', body: 'Un agente del OpenAI Agents SDK puede correr en AgentCore; Microsoft Agent Framework en Foundry hosted agents; Claude Agent SDK en un contenedor o sandbox. Elegir framework **no** obliga a elegir plataforma.', flows: ['openai>agentcore', 'msaf>foundry', 'claude>cf'] },
    { title: 'La tendencia 2026: harnesses', body: 'Strands Harness, el Harness Agent de Microsoft, Pydantic AI v2 Harness y `HarnessAgent` de Vercel convergen: agentes preconfigurados con compactación de contexto y planificación, que luego personalizas.', focus: ['claude', 'vercel', 'pyd', 'msaf'] },
  ],
}

export const otrosFrameworksHandoffs: IsoSpec = {
  id: 'otros-frameworks-handoffs',
  title: 'Handoffs y guardrails (OpenAI Agents SDK)',
  summary:
    'El patrón **handoff** del OpenAI Agents SDK: un agente de triage transfiere la conversación al especialista adecuado. Los **guardrails** de entrada corren en paralelo y pueden cortar la ejecución (*tripwire*), las **sessions** guardan el historial y el **tracing** registra cada paso. El mismo patrón aparece en Microsoft Agent Framework (orquestación handoff) y en ADK (`sub_agents`).',
  height: 470,
  nodes: [
    { id: 'user', label: 'Cliente', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Escribe: *"Me cobraron la suscripción después de cancelarla, quiero mi dinero de vuelta"*.' },
    { id: 'guard', label: 'Input guardrail', sub: '@input_guardrail', at: [3.2, -3.3], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Corre en paralelo con el primer agente. Si detecta algo prohibido (p. ej. intento de jailbreak o tema fuera de alcance) activa un *tripwire* que lanza una excepción y detiene la ejecución.' },
    { id: 'triage', label: 'Triage agent', sub: 'handoffs=[...]', at: [3.2, 0], shape: 'tall', tone: 'agent', icon: 'router', info: 'Agente con `handoffs=[billing_agent, refund_agent]`. Para el modelo, cada handoff es una herramienta `transfer_to_<agente>`.' },
    { id: 'billing', label: 'Billing agent', at: [6.6, -1.7], shape: 'tall', tone: 'agent', icon: 'card', scale: 0.85, info: 'Especialista en facturación: explica cobros, emite comprobantes.' },
    { id: 'refund', label: 'Refund agent', sub: 'tools: refunds API', at: [6.6, 1.7], shape: 'tall', tone: 'agent', icon: 'wrench', scale: 0.85, info: 'Especialista en reembolsos. Tras el handoff, recibe el historial y conversa directamente con el cliente.' },
    { id: 'session', label: 'Session', sub: 'SQLite · Redis', at: [0, 3.3], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Las sessions (`SQLiteSession`, Redis, SQLAlchemy, cifradas…) guardan el historial entre ejecuciones de `Runner.run` sin manejarlo a mano.' },
    { id: 'trace', label: 'Tracing', sub: 'por defecto', at: [10, 0], shape: 'box', tone: 'infra', icon: 'chart', info: 'Cada ejecución genera una traza con spans de agentes, llamadas al modelo, herramientas, handoffs y guardrails. Se puede exportar a otros backends.' },
  ],
  edges: [
    { from: 'user', to: 'triage' },
    { from: 'triage', to: 'guard', route: 'z', dashed: true },
    { from: 'triage', to: 'billing', label: 'handoff' },
    { from: 'triage', to: 'refund', label: 'handoff' },
    { from: 'session', to: 'triage', route: 'x' },
    { from: 'refund', to: 'trace', dashed: true },
  ],
  steps: [
    { title: '1 · Entrada y sesión', body: '`Runner.run(triage_agent, mensaje, session=session)`: el Runner carga el historial de la sesión y arranca el agente de triage.', flows: ['user>triage', 'session>triage'] },
    { title: '2 · Guardrail en paralelo', body: 'El guardrail de entrada evalúa el mensaje mientras el triage razona. Si el tripwire se activa, la ejecución se corta antes de gastar más.', flows: ['triage>guard'] },
    { title: '3 · Handoff', body: 'El modelo de triage llama `transfer_to_refund_agent`. El control pasa al especialista con el historial completo.', flows: ['triage>refund'] },
    { title: '4 · El especialista resuelve', body: 'El agente de reembolsos usa su herramienta y responde al cliente. `result.final_output` contiene la respuesta y `last_agent` indica quién terminó.', flows: ['refund>user'] },
    { title: '5 · Trazabilidad', body: 'Toda la ejecución (guardrail, handoff, tools) queda en una traza. El mismo patrón, con otros nombres, existe en Agent Framework, ADK y Strands Swarm.', flows: ['refund>trace'], focus: ['trace', 'billing'] },
  ],
}
