import type { IsoSpec } from '../components/iso/types'

/** JSON válido y compacto: objetos o arreglos cortos van en una línea, para que el payload quepa en ~50 líneas. */
const jsonc = (v: unknown, width = 78): string => {
  const one = (x: unknown) => JSON.stringify(x, null, 1).replace(/\n\s*/g, ' ')
  const go = (x: unknown, ind: string, used: number): string => {
    const flat = one(x)
    if (x === null || typeof x !== 'object' || used + flat.length <= width) return flat
    if (Array.isArray(x) && x.length === 1 && x[0] && typeof x[0] === 'object') return `[${go(x[0], ind, used + 1)}]`
    const next = ind + '  '
    const items = Array.isArray(x)
      ? x.map((e) => next + go(e, next, next.length))
      : Object.entries(x as Record<string, unknown>).map(([k, e]) => {
          const p = next + JSON.stringify(k) + ': '
          return p + go(e, next, p.length)
        })
    return Array.isArray(x) ? `[\n${items.join(',\n')}\n${ind}]` : `{\n${items.join(',\n')}\n${ind}}`
  }
  return go(v, '', 0)
}

/**
 * Un agente ADK que toca todas las capas del mapa. Combina piezas que aparecen en
 * Arquitectura de referencia (LiteLlm vía proxy, McpToolset, callbacks) y en A2A (RemoteA2aAgent).
 */
const AGENT = `import os
from google.adk.agents import LlmAgent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent, AGENT_CARD_WELL_KNOWN_PATH
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools import load_memory
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from guardrails import guardrail_entrada       # usa bedrock.apply_guardrail

modelo = LiteLlm(                                      # AI gateway → Bedrock
    model="litellm_proxy/claude-sonnet",               # alias del gateway
    api_base=os.environ["AI_GATEWAY_URL"],
    api_key=os.environ["AI_GATEWAY_KEY"],              # clave virtual del equipo
)
herramientas = McpToolset(                             # tool gateway (MCP)
    connection_params=StreamableHTTPConnectionParams(
        url=os.environ["TOOL_GATEWAY_URL"],
        headers={"Authorization": f"Bearer {os.environ['GATEWAY_TOKEN']}"},
    ),
    tool_filter=["Pedidos___get_order_status", "Politicas___buscar"],
)
finanzas = RemoteA2aAgent(                             # agente de otro equipo, vía A2A
    name="finanzas_comerciales",
    description="Aprueba descuentos y notas de crédito según la política comercial.",
    agent_card=f"https://finanzas.interno{AGENT_CARD_WELL_KNOWN_PATH}",
)
root_agent = LlmAgent(
    name="soporte_postventa",
    model=modelo,
    instruction="Resuelves reclamos de pedidos. Usa las herramientas y cita la política. "
                "Para cualquier descuento, delega en finanzas_comerciales.",
    tools=[herramientas, load_memory],                 # MCP + memoria de largo plazo
    sub_agents=[finanzas],
    before_model_callback=guardrail_entrada,           # guardrail de entrada
)
# El Runner (session_service + memory_service) ejecuta el loop en el runtime;
# los spans OpenTelemetry salen por OTLP hacia el Collector.`

const PREGUNTA = '¿Por qué se retrasó el pedido 4512 y qué podemos ofrecerle al cliente?'

export const ecosistema: IsoSpec = {
  id: 'ecosistema',
  title: 'Mapa del ecosistema de un agente empresarial',
  summary:
    'Las piezas que aparecen en casi cualquier agente corporativo serio: un **framework** que orquesta el loop, un **AI gateway** hacia los modelos, herramientas expuestas por **MCP**, conocimiento vía **RAG**, **memoria**, otros agentes por **A2A** y una capa transversal de **guardrails** y **observabilidad**. Recorre los pasos con una consulta real (el pedido 4512 retrasado): en cada uno verás el mensaje que cruza esa frontera y la línea de `soporte_agent.py` que conecta la pieza.',
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
  code: { agent: { title: 'soporte_agent.py (ilustrativo)', lang: 'python', source: AGENT } },
  steps: [
    {
      title: '1 · Llega una petición',
      body: 'Un usuario pregunta en Teams por el pedido 4512. Antes de gastar una llamada al modelo, el texto pasa por los **guardrails** de entrada (prompt injection, PII, temas prohibidos). `ApplyGuardrail` evalúa texto sin invocar ningún modelo; `action: "NONE"` significa que no intervino.',
      flows: ['user>guard', 'guard>agent'],
      data: {
        title: 'bedrock.apply_guardrail · petición y respuesta (forma simplificada)',
        lang: 'json',
        content: jsonc({
          request: { guardrailIdentifier: 'gr-retail-atencion', guardrailVersion: '3', source: 'INPUT', content: [{ text: { text: PREGUNTA } }] },
          response: { action: 'NONE', outputs: [] },
        }),
        hl: ['"source"', '"action"'],
      },
      code: { hl: ['from guardrails import guardrail_entrada', 'before_model_callback=guardrail_entrada'] },
    },
    {
      title: '2 · El agente recupera contexto',
      body: 'El runtime carga la **sesión** (turnos previos de esta conversación) y el agente puede consultar la memoria de largo plazo con `load_memory`: hechos útiles sobre el usuario, no la conversación completa.',
      flows: ['memory>agent'],
      data: {
        title: 'recuerdos recuperados para este usuario (ilustrativo)',
        lang: 'json',
        content: jsonc({
          user_id: 'ops-117',
          memories: [
            { fact: 'Atiende la cuenta del cliente C-889 (cliente frecuente).' },
            { fact: 'C-889 ya tuvo un retraso en septiembre; se le dio envío gratis.' },
            { fact: 'Prefiere respuestas con número de ticket y fecha comprometida.' },
          ],
        }),
        hl: ['"memories"'],
      },
      code: { hl: ['tools=[herramientas, load_memory]'] },
    },
    {
      title: '3 · Razonamiento en el modelo',
      body: 'El agente envía contexto + definiciones de herramientas **al AI gateway**, no a Bedrock: usa un alias (`claude-sonnet`) y una clave virtual. El gateway aplica presupuesto y rate limit, y traduce el alias a `bedrock/global.anthropic.claude-sonnet-5-5` con fallback de región.',
      flows: ['agent>aigw', 'aigw>model'],
      data: {
        title: 'POST /v1/chat/completions al gateway (API compatible con OpenAI)',
        lang: 'http',
        content: `POST /v1/chat/completions HTTP/1.1
Host: ai-gateway.interno
Authorization: Bearer sk-soporte-…
Content-Type: application/json

${jsonc({
  model: 'claude-sonnet',
  messages: [
    { role: 'system', content: 'Resuelves reclamos de pedidos. Usa las herramientas y cita la política.' },
    { role: 'user', content: PREGUNTA },
  ],
  tools: [
    { type: 'function', function: { name: 'Pedidos___get_order_status', parameters: { type: 'object', properties: { order_id: { type: 'string' } } } } },
    { type: 'function', function: { name: 'Politicas___buscar', parameters: { type: 'object', properties: { consulta: { type: 'string' } } } } },
  ],
})}`,
        hl: ['Authorization: Bearer', '"model": "claude-sonnet"', '"tools"'],
      },
      code: { hl: ['modelo = LiteLlm(', 'model="litellm_proxy/claude-sonnet"', 'api_key=os.environ["AI_GATEWAY_KEY"]'] },
    },
    {
      title: '4 · Llamada a herramientas vía MCP',
      body: 'El modelo pide `get_order_status`. El cliente MCP del agente hace un `tools/call` al tool gateway, que valida el token OAuth y la política, y llega al ERP. Los headers `Mcp-Method` y `Mcp-Name` permiten enrutar y auditar sin leer el cuerpo.',
      flows: ['agent>mcpgw', 'mcpgw>tools'],
      data: {
        title: 'POST /mcp al tool gateway (MCP 2026-07-28)',
        lang: 'http',
        content: `POST /mcp HTTP/1.1
Host: tools.interno
Authorization: Bearer eyJhbGciOi…
Mcp-Method: tools/call
Mcp-Name: Pedidos___get_order_status
Content-Type: application/json

${jsonc({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'Pedidos___get_order_status', arguments: { order_id: '4512' } } })}`,
        hl: ['Mcp-Method', 'Mcp-Name', '"tools/call"'],
      },
      code: { hl: ['herramientas = McpToolset(', 'url=os.environ["TOOL_GATEWAY_URL"]', 'tool_filter='] },
    },
    {
      title: '5 · Consulta de conocimiento (RAG)',
      body: 'Para saber qué compensaciones están permitidas, el agente busca en la **base de conocimiento** de políticas comerciales (búsqueda híbrida + reranking), expuesta como otra herramienta MCP. Devuelve fragmentos **con su fuente** para poder citarlos.',
      flows: ['agent>mcpgw', 'mcpgw>kb'],
      data: {
        title: 'resultado de tools/call · Politicas___buscar (ilustrativo)',
        lang: 'json',
        content: jsonc({
          jsonrpc: '2.0',
          id: 13,
          result: {
            structuredContent: {
              fragmentos: [
                { texto: 'Retrasos sobre 3 días hábiles: envío gratis en la próxima compra o descuento de hasta 10 %.', fuente: 'politica-compensaciones.pdf §2.1', score: 0.91 },
                { texto: 'Descuentos compensatorios requieren aprobación de Finanzas Comerciales.', fuente: 'politica-compensaciones.pdf §2.4', score: 0.84 },
              ],
            },
            isError: false,
          },
        }),
        hl: ['"fuente"'],
      },
      code: { hl: ['"Politicas___buscar"', 'cita la política'] },
    },
    {
      title: '6 · Delegación a otro agente (A2A)',
      body: 'La aprobación del descuento la gestiona el agente de **Finanzas** de otro equipo. El agente lo encontró por su Agent Card y le envía un mensaje A2A; Finanzas responde con una **Task** en `TASK_STATE_COMPLETED` y un artefacto con la decisión (`approved: true`).',
      flows: ['agent>peer', 'peer>agent'],
      data: {
        title: 'SendMessage (A2A v1, JSON-RPC · forma simplificada)',
        lang: 'json',
        content: jsonc({
          jsonrpc: '2.0',
          id: 'req-41',
          method: 'SendMessage',
          params: {
            message: {
              messageId: 'msg-7f3a',
              role: 'ROLE_USER',
              parts: [{ data: { order_id: '4512', customer_id: 'C-889', percent: 10, motivo: 'retraso de 4 días' }, mediaType: 'application/json' }],
            },
          },
        }),
        hl: ['"method": "SendMessage"', '"ROLE_USER"', '"percent"'],
      },
      code: { hl: ['finanzas = RemoteA2aAgent(', 'agent_card=f"https://finanzas.interno', 'sub_agents=[finanzas]'] },
    },
    {
      title: '7 · Respuesta y trazabilidad',
      body: 'El agente redacta la respuesta, pasa por los guardrails de salida y responde. Cada paso quedó en una **traza** OpenTelemetry: un span raíz `invoke_agent` con hijos por cada llamada al modelo y a herramientas, con tokens y latencia, que alimenta dashboards y evaluaciones.',
      flows: ['agent>guard', 'guard>user', 'agent>obs'],
      data: {
        title: 'traza del turno (spans gen_ai.*, forma simplificada)',
        lang: 'json',
        content: jsonc({
          name: 'invoke_agent soporte_postventa',
          attributes: { 'gen_ai.operation.name': 'invoke_agent', 'gen_ai.agent.name': 'soporte_postventa', 'gen_ai.conversation.id': 'teams-8c21' },
          children: [
            { name: 'chat claude-sonnet', 'gen_ai.usage.input_tokens': 2140, 'gen_ai.usage.output_tokens': 88 },
            { name: 'execute_tool Pedidos___get_order_status', duration_ms: 182 },
            { name: 'execute_tool Politicas___buscar', duration_ms: 431 },
            { name: 'invoke_agent finanzas_comerciales', duration_ms: 2950 },
            { name: 'chat claude-sonnet', 'gen_ai.usage.input_tokens': 3315, 'gen_ai.usage.output_tokens': 164 },
          ],
        }),
        hl: ['"gen_ai.operation.name"', '"children"'],
      },
      code: { hl: ['# los spans OpenTelemetry salen por OTLP'] },
    },
  ],
}
