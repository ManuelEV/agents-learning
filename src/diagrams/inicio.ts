import type { IsoSpec } from '../components/iso/types'

export const ecosistema: IsoSpec = {
  id: 'ecosistema',
  title: 'Mapa del ecosistema de un agente empresarial',
  summary:
    'Las piezas que aparecen en casi cualquier agente corporativo serio: un **framework** que orquesta el loop, un **AI gateway** hacia los modelos, herramientas expuestas por **MCP**, conocimiento vía **RAG**, **memoria**, otros agentes por **A2A** y una capa transversal de **guardrails** y **observabilidad**. Recorre los pasos para ver cómo fluye una petición.',
  height: 500,
  zones: [{ id: 'runtime', label: 'Runtime gestionado', from: [4.8, -1.6], to: [8.0, 4.9], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Usuario / canal', sub: 'Web, Slack, Teams, API', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Punto de entrada: una app web, un bot en Slack/Teams, un evento de negocio o una llamada API. El agente rara vez es "un chat": suele estar embebido en un proceso.' },
    { id: 'guard', label: 'Guardrails', sub: 'entrada / salida', at: [3.1, 0], shape: 'box', tone: 'guard', icon: 'shield', info: 'Filtros de contenido, detección de prompt injection, PII y políticas. Ej.: Bedrock Guardrails (`ApplyGuardrail`), Model Armor en Google Cloud.' },
    { id: 'agent', label: 'Agente', sub: 'ADK · Strands · LangGraph', at: [6.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'El framework implementa el **loop agéntico**: arma el contexto, llama al modelo, ejecuta herramientas y decide cuándo terminar. Corre en un runtime gestionado (AgentCore Runtime, Agent Runtime, Foundry) o en tu propio contenedor.' },
    { id: 'memory', label: 'Memoria / sesiones', sub: 'corto y largo plazo', at: [6.4, 3.3], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Historial de la sesión (corto plazo) y hechos/preferencias persistentes (largo plazo). Ej.: AgentCore Memory, Agent Platform Memory Bank, checkpointers de LangGraph.' },
    { id: 'aigw', label: 'AI Gateway', sub: 'LiteLLM · Cloudflare', at: [6.4, -3.5], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Punto único hacia los proveedores de modelos: claves virtuales, presupuestos, rate limits, fallbacks entre regiones/modelos, caché y logs de costo.' },
    { id: 'model', label: 'Modelos (LLM)', sub: 'Bedrock · Gemini · Foundry', at: [6.4, -6.9], shape: 'sphere', tone: 'model', icon: 'brain', info: 'El "cerebro": razona y decide qué herramienta llamar. En AWS, Claude vía Bedrock con perfiles de inferencia (`global.` / `us.` / `eu.`).' },
    { id: 'mcpgw', label: 'Tool gateway', sub: 'MCP · AgentCore Gateway', at: [9.7, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Expone APIs internas como herramientas MCP con autenticación unificada (OAuth), políticas por llamada y auditoría.' },
    { id: 'tools', label: 'Sistemas internos', sub: 'APIs, ERP, CRM, tickets', at: [13, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'Donde el agente actúa: consultar pedidos, crear tickets, ejecutar consultas. Las acciones irreversibles deberían pedir aprobación humana.' },
    { id: 'kb', label: 'Conocimiento (RAG)', sub: 'Knowledge Base · vector DB', at: [9.7, 3.3], shape: 'stack', tone: 'data', icon: 'book', info: 'Documentos corporativos indexados (pgvector, OpenSearch, S3 Vectors…). El agente los consulta como una herramienta más ("agentic RAG").' },
    { id: 'peer', label: 'Otro agente', sub: 'vía A2A', at: [3.1, -3.5], shape: 'tall', tone: 'agent', icon: 'network', scale: 0.85, info: 'Agentes de otros equipos o proveedores, descubiertos por su Agent Card y llamados con el protocolo A2A, sin compartir código ni memoria.' },
    { id: 'obs', label: 'Observabilidad y evals', sub: 'OTel · Langfuse', at: [3.1, 3.3], shape: 'box', tone: 'infra', icon: 'chart', info: 'Trazas de cada paso (OpenTelemetry GenAI), métricas de costo/latencia y evaluaciones online/offline que detectan regresiones.' },
  ],
  edges: [
    { from: 'user', to: 'guard' },
    { from: 'guard', to: 'agent' },
    { from: 'agent', to: 'aigw' },
    { from: 'aigw', to: 'model' },
    { from: 'agent', to: 'mcpgw' },
    { from: 'mcpgw', to: 'tools' },
    { from: 'agent', to: 'memory' },
    { from: 'mcpgw', to: 'kb', route: 'x' },
    { from: 'agent', to: 'peer', label: 'A2A', route: 'arc' },
    { from: 'agent', to: 'obs', dashed: true, route: 'z' },
  ],
  steps: [
    { title: 'Llega una petición', body: 'Un usuario pregunta en Teams: "¿Por qué se retrasó el pedido 4512 y qué podemos ofrecerle al cliente?". La petición pasa primero por los **guardrails** de entrada (prompt injection, PII, temas prohibidos).', flows: ['user>guard', 'guard>agent'] },
    { title: 'El agente recupera contexto', body: 'El framework carga la **sesión** y la memoria de largo plazo del usuario (preferencias, conversaciones previas) y arma el contexto inicial.', flows: ['memory>agent'] },
    { title: 'Razonamiento en el modelo', body: 'El agente envía contexto + definiciones de herramientas al modelo **a través del AI gateway**, que aplica la clave virtual del equipo, el presupuesto y el fallback de región.', flows: ['agent>aigw', 'aigw>model'] },
    { title: 'Llamada a herramientas vía MCP', body: 'El modelo decide llamar `get_order_status`. El agente invoca la herramienta por **MCP** a través del tool gateway, que valida el token OAuth y la política, y llega al ERP.', flows: ['agent>mcpgw', 'mcpgw>tools'] },
    { title: 'Consulta de conocimiento (RAG)', body: 'Para saber qué compensaciones están permitidas, busca en la **base de conocimiento** de políticas comerciales (búsqueda híbrida + reranking) y obtiene fragmentos con citas.', flows: ['agent>mcpgw', 'mcpgw>kb'] },
    { title: 'Delegación a otro agente (A2A)', body: 'La aprobación de un descuento la gestiona el agente de **Finanzas** de otro equipo. Se delega por **A2A**: se envía una tarea y se recibe un artefacto con la decisión.', flows: ['agent>peer', 'peer>agent'] },
    { title: 'Respuesta y trazabilidad', body: 'El agente redacta la respuesta, pasa por los guardrails de salida y responde. Cada paso quedó **trazado** (tokens, latencia, herramientas) y alimenta las evaluaciones.', flows: ['agent>guard', 'guard>user', 'agent>obs'] },
  ],
}
