import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)
const line = (v: unknown) => JSON.stringify(v)

/* -------------------------------------------------------------------------- */
/* Ciclo de vida de una tarea                                                  */
/* -------------------------------------------------------------------------- */

/** Mismo código que el bloque `soporte/agent.py` del artículo (agente cliente). */
const SOPORTE_PY = `from google.adk.agents import Agent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent, AGENT_CARD_WELL_KNOWN_PATH
from google.adk.models.lite_llm import LiteLlm

finanzas = RemoteA2aAgent(
    name="finanzas_comerciales",
    description="Aprueba descuentos y notas de crédito según la política comercial.",
    agent_card=f"https://finanzas.interno{AGENT_CARD_WELL_KNOWN_PATH}",
)

root_agent = Agent(
    name="soporte_postventa",
    model=LiteLlm(model="litellm_proxy/claude-sonnet"),
    instruction="Resuelves reclamos. Para cualquier descuento, delega en finanzas_comerciales.",
    sub_agents=[finanzas],   # el remoto se usa como un sub-agente más
)`

/** Mismo código que el bloque `finanzas/agent.py` del artículo (agente remoto). */
const FINANZAS_PY = `# pip install google-adk a2a-sdk "litellm>=1.84"
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.a2a.utils.agent_to_a2a import to_a2a

def evaluate_discount(order_id: str, percent: float) -> dict:
    """Evalúa un descuento compensatorio contra la política comercial.

    Args:
        order_id: Pedido afectado.
        percent: Porcentaje de descuento solicitado.
    """
    needs_human = percent > 10
    return {"order_id": order_id, "approved": not needs_human, "needs_human": needs_human}

root_agent = Agent(
    name="finanzas_comerciales",
    model=LiteLlm(model="litellm_proxy/claude-sonnet"),
    instruction="Evalúas descuentos. Sobre 10 % pides aprobación humana antes de confirmar.",
    tools=[evaluate_discount],
)

# Genera la app A2A. to_a2a no abre el puerto: debe coincidir con el de uvicorn,
# porque es la URL que se anuncia en la Agent Card.
a2a_app = to_a2a(root_agent, port=8001, agent_card="finanzas/agent-card.json")
# uvicorn finanzas.agent:a2a_app --host 0.0.0.0 --port 8001`

const TASK = 'tsk-5c1e9a'
const CTX = 'ctx-c889-4512'

const CARD = {
  name: 'Agente de Finanzas Comerciales',
  description: 'Evalúa y aprueba descuentos y notas de crédito según la política comercial vigente.',
  version: '2.3.0',
  provider: { organization: 'Retail Andino S.A. - Finanzas', url: 'https://finanzas.interno' },
  supportedInterfaces: [{ url: 'https://finanzas.interno/a2a/jsonrpc', protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
  capabilities: { streaming: true, pushNotifications: true, extendedAgentCard: true },
  securitySchemes: { corp_oidc: { openIdConnectSecurityScheme: { openIdConnectUrl: 'https://login.retailandino.com/.well-known/openid-configuration' } } },
  securityRequirements: [{ schemes: { corp_oidc: { list: ['openid', 'finanzas.descuentos'] } } }],
  skills: [
    {
      id: 'approve_discount',
      name: 'Aprobar descuento',
      description: 'Evalúa un descuento compensatorio para un pedido; sobre 10 % requiere aprobación humana.',
      examples: ['Aprueba un 12 % de descuento al cliente C-889 por el retraso del pedido 4512'],
    },
  ],
  signatures: [{ protected: 'eyJhbGciOiJFUzI1NiIs...', signature: 'MEUCIQ...' }],
}

export const a2aTareas: IsoSpec = {
  id: 'a2a-tareas',
  title: 'Descubrimiento y ciclo de vida de una tarea A2A',
  summary:
    'Un agente cliente descubre a un agente remoto por su **Agent Card**, se autentica según lo que la card declara y le envía un **mensaje**. El remoto crea una **tarea** que pasa por estados (`SUBMITTED` → `WORKING` → `INPUT_REQUIRED` → `COMPLETED`) y entrega el resultado como **artefactos**. Ninguno ve el código, las herramientas ni la memoria del otro. Cada fila es un mensaje real (binding JSON-RPC de A2A v1.0); el código es `soporte/agent.py` y `finanzas/agent.py` del artículo.',
  height: 500,
  layout: 'sequence',
  lanes: ['user', 'client', 'hook', 'idp', 'card', 'remote', 'store', 'human'],
  nodes: [
    { id: 'user', label: 'Ejecutivo comercial', at: [-3.4, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pide: "Ofrécele al cliente C-889 un descuento del 15 % por el retraso del pedido 4512".' },
    { id: 'client', label: 'Agente cliente', sub: 'soporte · ADK', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'El agente de soporte. No sabe aprobar descuentos: delega en el agente de Finanzas, que es de otro equipo y está escrito en otro framework. En ADK, el remoto es un `RemoteA2aAgent` usado como sub-agente.' },
    { id: 'hook', label: 'Webhook', sub: 'push notifications', at: [3.6, 3.4], shape: 'box', tone: 'infra', icon: 'mail', info: 'Endpoint HTTPS del lado del cliente. Para tareas que duran horas, el remoto notifica aquí los cambios de estado en vez de mantener un stream abierto.' },
    { id: 'idp', label: 'IdP corporativo', sub: 'OAuth 2.0 / OIDC', at: [0, -3.6], shape: 'hex', tone: 'guard', icon: 'key', info: 'Emite el token que exige el `securitySchemes` de la Agent Card. A2A reutiliza esquemas estándar (OAuth2, OIDC, API key, mTLS); v1.0 eliminó los flujos implicit y password.' },
    { id: 'card', label: 'Agent Card', sub: 'firmada (JWS)', at: [3.6, -3.6], shape: 'doc', tone: 'protocol', icon: 'card', info: 'JSON en `/.well-known/agent-card.json`: nombre, skills, capacidades (streaming, push), interfaces soportadas y seguridad. En v1.0 puede ir **firmada** (JWS + JSON canonicalizado RFC 8785).' },
    { id: 'remote', label: 'Agente remoto', sub: 'Finanzas · ADK to_a2a', at: [7.2, 0], shape: 'tall', tone: 'agent', icon: 'network', info: 'Expone la skill `approve_discount`. Internamente usa su herramienta `evaluate_discount` y sus reglas; hacia afuera solo habla A2A.' },
    { id: 'store', label: 'Task store', sub: 'estado y artefactos', at: [7.2, -3.6], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Persiste cada tarea con su estado, historial de mensajes y artefactos. Permite `GetTask`, `ListTasks` y reconectarse con `SubscribeToTask`.' },
    { id: 'human', label: 'Jefe de Finanzas', sub: 'aprueba > 10 %', at: [10.6, -1.8], shape: 'person', tone: 'user', icon: 'hand', info: 'Política interna del agente remoto: descuentos sobre 10 % requieren aprobación humana. El cliente no necesita saber cómo se resuelve.' },
  ],
  edges: [
    { from: 'user', to: 'client' },
    { from: 'client', to: 'idp' },
    { from: 'client', to: 'card', route: 'z' },
    { from: 'client', to: 'remote', label: 'SendMessage' },
    { from: 'remote', to: 'store' },
    { from: 'remote', to: 'human', route: 'z' },
    { from: 'remote', to: 'hook', route: 'z', dashed: true },
  ],
  code: {
    client: { title: 'soporte/agent.py', lang: 'python', source: SOPORTE_PY },
    remote: { title: 'finanzas/agent.py', lang: 'python', source: FINANZAS_PY },
  },
  steps: [
    {
      title: '1 · Descubrir',
      body: 'El agente cliente descarga `https://finanzas.interno/.well-known/agent-card.json` (o la obtiene de un registry). Verifica la **firma** y lee la skill `approve_discount` (su `description` y `examples` son lo que su LLM usa para decidir delegar), la interfaz JSON-RPC y el esquema de seguridad.',
      flows: ['user>client: descuento 15 % · pedido 4512', 'client>card: GET agent-card.json', 'card>client'],
      data: { title: 'GET /.well-known/agent-card.json (resumida)', lang: 'json', content: json(CARD), hl: ['"supportedInterfaces"', '"capabilities"', '"securityRequirements"', '"id": "approve_discount"', '"signatures"'] },
      code: { file: 'client', hl: ['finanzas = RemoteA2aAgent(', 'agent_card=f"https://finanzas.interno{AGENT_CARD_WELL_KNOWN_PATH}"'] },
    },
    {
      title: '2 · Autenticarse',
      body: 'La card exige OIDC con el scope `finanzas.descuentos`. El agente cliente obtiene un token del IdP corporativo con su propia identidad de servicio. La identidad viaja en la capa HTTP (`Authorization`), no dentro del mensaje A2A.',
      flows: ['client>idp: client_credentials', 'idp>client: access_token'],
      data: {
        title: 'token del agente cliente',
        lang: 'http',
        content: [
          'POST /oauth2/token HTTP/1.1',
          'Host: login.retailandino.com',
          'Content-Type: application/x-www-form-urlencoded',
          'Authorization: Basic c29wb3J0ZS1hZ2VudDo…',
          '',
          'grant_type=client_credentials&scope=openid%20finanzas.descuentos',
          '',
          'HTTP/1.1 200 OK',
          'Content-Type: application/json',
          '',
          json({ access_token: 'eyJhbGciOiJSUzI1NiIs…', token_type: 'Bearer', expires_in: 900, scope: 'openid finanzas.descuentos' }),
        ].join('\n'),
        hl: ['grant_type=client_credentials', '"scope"'],
      },
    },
    {
      title: '3 · Enviar mensaje',
      body: 'El LLM del agente de soporte decide delegar. El cliente envía `SendStreamingMessage` con un mensaje `ROLE_USER` compuesto de **Parts**: un `text` con la intención y un `data` con los campos exactos. El remoto decidirá cómo resolverlo.',
      flows: ['client>remote: SendStreamingMessage'],
      data: {
        title: 'POST /a2a/jsonrpc · cliente → Finanzas',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 'req-1',
          method: 'SendStreamingMessage',
          params: {
            message: {
              messageId: 'msg-sop-0001',
              role: 'ROLE_USER',
              parts: [
                { text: 'Solicito un descuento compensatorio del 15 % para el cliente C-889 por el retraso del pedido 4512.' },
                { data: { order_id: '4512', customer: 'C-889', percent: 15, reason: 'retraso_entrega' }, mediaType: 'application/json' },
              ],
            },
            configuration: { acceptedOutputModes: ['application/json'] },
          },
        }),
        hl: ['"method"', '"ROLE_USER"', '"text"', '"data"'],
      },
      code: { file: 'client', hl: ['instruction="Resuelves reclamos. Para cualquier descuento', 'sub_agents=[finanzas]'] },
    },
    {
      title: '4 · SUBMITTED → WORKING',
      body: 'El remoto crea la tarea con `id` y `contextId`, la persiste y responde con un **stream SSE**: primero la tarea en `SUBMITTED`, luego un `statusUpdate` a `WORKING`. Del lado de Finanzas, todo esto lo genera `to_a2a()` a partir del agente ADK.',
      flows: ['remote>store: crea tarea', 'remote>client: SSE · SUBMITTED, WORKING'],
      data: {
        title: 'respuesta SSE (text/event-stream)',
        lang: 'text',
        content: [
          'HTTP/1.1 200 OK',
          'Content-Type: text/event-stream',
          '',
          `data: ${line({ jsonrpc: '2.0', id: 'req-1', result: { task: { id: TASK, contextId: CTX, status: { state: 'TASK_STATE_SUBMITTED' } } } })}`,
          '',
          `data: ${line({ jsonrpc: '2.0', id: 'req-1', result: { statusUpdate: { taskId: TASK, contextId: CTX, status: { state: 'TASK_STATE_WORKING' } } } })}`,
        ].join('\n'),
        hl: ['TASK_STATE_SUBMITTED', 'TASK_STATE_WORKING'],
      },
      code: { file: 'remote', hl: ['a2a_app = to_a2a(root_agent', 'root_agent = Agent('] },
    },
    {
      title: '5 · INPUT_REQUIRED',
      body: 'El 15 % supera el umbral: la herramienta devuelve `needs_human`. Finanzas consulta a su jefe por su canal interno y, como le falta un dato, pausa la tarea en `TASK_STATE_INPUT_REQUIRED` con un mensaje que pide el monto total del pedido. La tarea no terminó: está **interrumpida**.',
      flows: ['remote>human: aprobación interna', 'remote>client: INPUT_REQUIRED'],
      data: {
        title: 'evento SSE · statusUpdate',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 'req-1',
          result: {
            statusUpdate: {
              taskId: TASK,
              contextId: CTX,
              status: {
                state: 'TASK_STATE_INPUT_REQUIRED',
                message: {
                  messageId: 'msg-fin-0003',
                  role: 'ROLE_AGENT',
                  parts: [{ text: '¿Cuál es el monto total del pedido 4512? Lo necesito para calcular el tope del descuento.' }],
                },
              },
            },
          },
        }),
        hl: ['TASK_STATE_INPUT_REQUIRED', '"ROLE_AGENT"'],
      },
      code: { file: 'remote', hl: ['needs_human = percent > 10', 'Sobre 10 % pides aprobación humana'] },
    },
    {
      title: '6 · Continuar la misma tarea',
      body: 'El cliente obtiene el monto con sus propias herramientas y responde con un mensaje que lleva el **mismo** `taskId` y `contextId`: así Finanzas continúa la tarea pausada en vez de crear otra. Mientras, el jefe aprueba un 12 % en lugar del 15 %.',
      flows: ['client>remote: SendStreamingMessage (taskId)', 'human>remote: aprueba 12 %'],
      data: {
        title: 'POST /a2a/jsonrpc · continúa la tarea',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 'req-2',
          method: 'SendStreamingMessage',
          params: {
            message: {
              messageId: 'msg-sop-0002',
              taskId: TASK,
              contextId: CTX,
              role: 'ROLE_USER',
              parts: [{ text: 'El total del pedido 4512 es US$1.240.' }, { data: { order_total: 1240, currency: 'USD' } }],
            },
          },
        }),
        hl: ['"taskId"', '"contextId"', '"order_total"'],
      },
    },
    {
      title: '7 · COMPLETED + artefacto',
      body: 'La tarea termina en `COMPLETED` con un **artefacto** JSON validable (no prosa): descuento aprobado de 12 %, monto, código de autorización y vigencia. El cliente debería validarlo con un esquema antes de usarlo: viene de un sistema que no controla.',
      flows: ['remote>store: guarda artefacto', 'remote>client: artifactUpdate + COMPLETED', 'client>user: descuento 12 % aprobado'],
      data: {
        title: 'eventos SSE finales',
        lang: 'text',
        content: [
          `data: ${line({ jsonrpc: '2.0', id: 'req-2', result: { artifactUpdate: { taskId: TASK, contextId: CTX, artifact: { artifactId: 'art-01', name: 'aprobacion-descuento', parts: [{ data: { order_id: '4512', approved_percent: 12, amount: 148.8, auth_code: 'DSC-20931', valid_until: '2026-11-30' } }] } } } })}`,
          '',
          `data: ${line({ jsonrpc: '2.0', id: 'req-2', result: { statusUpdate: { taskId: TASK, contextId: CTX, status: { state: 'TASK_STATE_COMPLETED' } } } })}`,
        ].join('\n'),
        hl: ['"artifactUpdate"', 'TASK_STATE_COMPLETED'],
      },
      code: { file: 'remote', hl: ['def evaluate_discount', 'return {"order_id": order_id, "approved"'] },
    },
    {
      title: '8 · Tareas largas: push',
      body: 'Si la aprobación tardara horas, el cliente incluye una configuración de push con la URL de su **webhook** y un token, y cierra la conexión. El remoto notifica cada cambio de estado con un `POST`; el cliente valida el token antes de confiar en la notificación.',
      flows: ['client>remote: SendMessage + push config', 'remote>hook: POST cambio de estado'],
      data: {
        title: 'notificación push recibida por el webhook (forma simplificada)',
        lang: 'http',
        content: [
          'POST /a2a/webhook HTTP/1.1',
          'Host: soporte.interno',
          'X-A2A-Notification-Token: 7f3e…c21',
          'Content-Type: application/json',
          '',
          json({ statusUpdate: { taskId: TASK, contextId: CTX, status: { state: 'TASK_STATE_COMPLETED', timestamp: '2026-11-06T19:42:10Z' } } }),
        ].join('\n'),
        hl: ['X-A2A-Notification-Token', 'TASK_STATE_COMPLETED'],
      },
    },
  ],
}

/* -------------------------------------------------------------------------- */
/* Capas: AG-UI, A2A, MCP                                                      */
/* -------------------------------------------------------------------------- */

const ORQUESTADOR = `import os
from google.adk.agents import Agent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent, AGENT_CARD_WELL_KNOWN_PATH
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

def mcp(url: str, tools: list[str]) -> McpToolset:          # MCP: herramientas y datos
    return McpToolset(
        connection_params=StreamableHTTPConnectionParams(
            url=url, headers={"Authorization": f"Bearer {os.environ['MCP_TOKEN']}"}),
        tool_filter=tools)

crm = mcp("https://mcp-crm.interno/mcp", ["get_customer", "list_orders"])
kb = mcp("https://mcp-kb.interno/mcp", ["search_policies"])

finanzas = RemoteA2aAgent(                                   # A2A: agente de otro equipo
    name="finanzas_comerciales",
    description="Aprueba descuentos y notas de crédito según la política comercial.",
    agent_card=f"https://finanzas.interno{AGENT_CARD_WELL_KNOWN_PATH}")
logistica = RemoteA2aAgent(                                  # A2A: agente de un partner
    name="logistica_rutasur",
    description="Reprograma entregas del transportista RutaSur.",
    agent_card=f"https://agentes.rutasur.cl{AGENT_CARD_WELL_KNOWN_PATH}")

root_agent = Agent(
    name="orquestador_postventa",
    model=LiteLlm(model="litellm_proxy/claude-sonnet"),
    instruction=("Resuelves reclamos de postventa. Datos del cliente y políticas: usa tus "
                 "herramientas. Descuentos: delega en finanzas_comerciales. "
                 "Cambios de despacho: delega en logistica_rutasur."),
    tools=[crm, kb],                       # MCP
    sub_agents=[finanzas, logistica],      # A2A
)
# AG-UI: un adaptador del framework (p. ej. el de CopilotKit) publica root_agent
# como stream de eventos para el frontend. El agente no cambia.`

export const a2aCapas: IsoSpec = {
  id: 'a2a-capas',
  title: 'Tres protocolos, tres capas: AG-UI, A2A y MCP',
  summary:
    'Los protocolos de agentes no compiten: cubren **interfaces distintas**. **AG-UI** conecta el agente con la interfaz de usuario, **A2A** conecta agentes entre sí (cajas negras) y **MCP** conecta un agente con sus herramientas y datos. Seguimos un reclamo por el retraso del pedido 4512: en Datos ves el mensaje de cada protocolo y en Código cómo el orquestador declara herramientas MCP y sub-agentes A2A.',
  height: 480,
  zones: [
    { id: 'agui', label: 'AG-UI', from: [-1.4, -1.4], to: [4.6, 1.4], tone: 'user' },
    { id: 'mcp', label: 'MCP', from: [5.2, -5.2], to: [11.4, -2.0], tone: 'protocol' },
    { id: 'a2a', label: 'A2A', from: [8.4, -1.4], to: [11.4, 4.8], tone: 'agent' },
  ],
  nodes: [
    { id: 'user', label: 'Usuario', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Ejecutiva de postventa atendiendo al cliente C-889. Usa una app web que muestra el razonamiento, las llamadas a herramientas y pide aprobaciones en tiempo real.' },
    { id: 'ui', label: 'Frontend', sub: 'React · CopilotKit', at: [3.2, 0], shape: 'box', tone: 'user', icon: 'eye', info: '**AG-UI** define un stream de eventos agente → UI (texto incremental, llamadas a tools, cambios de estado) y acciones UI → agente.' },
    { id: 'orch', label: 'Agente orquestador', sub: 'Google ADK', at: [6.6, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Entiende el objetivo, usa sus herramientas por MCP y delega subtareas a otros agentes por A2A.' },
    { id: 'crm', label: 'Servidor MCP CRM', sub: 'tools + resources', at: [6.6, -3.6], shape: 'box', tone: 'protocol', icon: 'plug', info: 'Herramientas deterministas: `get_customer`, `list_orders`. El agente controla cuándo llamarlas y ve sus esquemas.' },
    { id: 'kb', label: 'Servidor MCP KB', sub: 'búsqueda de políticas', at: [9.9, -3.6], shape: 'stack', tone: 'protocol', icon: 'book', info: 'La búsqueda RAG expuesta como tool MCP (por ejemplo, el endpoint MCP de una instancia de AI Search).' },
    { id: 'fin', label: 'Agente Finanzas', sub: 'otro equipo', at: [9.9, 0], shape: 'tall', tone: 'agent', icon: 'network', info: 'Agente autónomo con su propio modelo, tools y memoria. Se le delega una **tarea**; el orquestador no ve cómo la resuelve.' },
    { id: 'log', label: 'Agente Logística', sub: 'proveedor externo', at: [9.9, 3.4], shape: 'tall', tone: 'agent', icon: 'globe', info: 'Agente del transportista RutaSur publicado con su Agent Card. A2A permite colaborar entre organizaciones sin compartir código.' },
  ],
  edges: [
    { from: 'user', to: 'ui' },
    { from: 'ui', to: 'orch', label: 'eventos' },
    { from: 'orch', to: 'crm' },
    { from: 'orch', to: 'kb', route: 'z' },
    { from: 'orch', to: 'fin', label: 'tarea' },
    { from: 'orch', to: 'log', route: 'x' },
  ],
  code: { orch: { title: 'orquestador.py (ilustrativo)', lang: 'python', source: ORQUESTADOR } },
  steps: [
    {
      title: 'AG-UI: agente ↔ interfaz',
      body: 'La ejecutiva escribe en la app web. AG-UI transmite al frontend, como **eventos**, el inicio de la ejecución, cada llamada a herramienta y el texto token a token; la UI puede mostrar progreso y botones de aprobación sin conocer el framework del agente.',
      flows: ['user>ui', 'ui>orch', 'orch>ui'],
      data: {
        title: 'stream de eventos AG-UI (forma simplificada)',
        lang: 'text',
        content: [
          `data: ${line({ type: 'RUN_STARTED', threadId: 'th-c889', runId: 'run-01' })}`,
          `data: ${line({ type: 'TOOL_CALL_START', toolCallId: 'tc-1', toolCallName: 'get_customer' })}`,
          `data: ${line({ type: 'TOOL_CALL_END', toolCallId: 'tc-1' })}`,
          `data: ${line({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm-7', delta: 'El pedido 4512 llegó con 6 días de retraso. ' })}`,
          `data: ${line({ type: 'TEXT_MESSAGE_CONTENT', messageId: 'm-7', delta: 'Pido a Finanzas un descuento compensatorio…' })}`,
          `data: ${line({ type: 'RUN_FINISHED', threadId: 'th-c889', runId: 'run-01' })}`,
        ].join('\n'),
        hl: ['TOOL_CALL_START', 'TEXT_MESSAGE_CONTENT'],
      },
      code: { hl: ['# AG-UI: un adaptador del framework'] },
    },
    {
      title: 'MCP: agente ↔ herramientas',
      body: 'El orquestador consulta el CRM y la base de políticas mediante **MCP**: llamadas a funciones con esquema, resultado inmediato y control total del agente sobre qué y cuándo.',
      flows: ['orch>crm', 'crm>orch', 'orch>kb', 'kb>orch'],
      data: {
        title: 'tools/call al servidor MCP del CRM',
        lang: 'http',
        content: [
          'POST /mcp HTTP/1.1',
          'Host: mcp-crm.interno',
          'Authorization: Bearer eyJhbGciOi…',
          'Mcp-Method: tools/call',
          'Mcp-Name: get_customer',
          '',
          json({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'get_customer', arguments: { customer_id: 'C-889' } } }),
        ].join('\n'),
        hl: ['Mcp-Method: tools/call', '"get_customer"'],
      },
      code: { hl: ['def mcp(url: str', 'crm = mcp(', 'kb = mcp(', 'tools=[crm, kb]'] },
    },
    {
      title: 'A2A: agente ↔ agente (interno)',
      body: 'La aprobación del descuento se delega como **tarea A2A** al agente de Finanzas: tiene su propia lógica, puede pedir más datos (`INPUT_REQUIRED`) y tardar. El orquestador recibe una tarea con estado, no un valor de retorno.',
      flows: ['orch>fin', 'fin>orch'],
      data: {
        title: 'SendMessage → respuesta con una Task',
        lang: 'json',
        content: json({
          request: { jsonrpc: '2.0', id: 'req-1', method: 'SendMessage', params: { message: { messageId: 'msg-01', role: 'ROLE_USER', parts: [{ data: { order_id: '4512', customer: 'C-889', percent: 15 } }] } } },
          response: { jsonrpc: '2.0', id: 'req-1', result: { task: { id: 'tsk-5c1e9a', contextId: 'ctx-c889-4512', status: { state: 'TASK_STATE_WORKING' } } } },
        }),
        hl: ['"SendMessage"', '"task"', 'TASK_STATE_WORKING'],
      },
      code: { hl: ['finanzas = RemoteA2aAgent(', 'agent_card=f"https://finanzas.interno'] },
    },
    {
      title: 'A2A entre organizaciones',
      body: 'La reprogramación del despacho se pide al agente del transportista, descubierto por su Agent Card pública. Mismo protocolo, otra empresa: autenticación según su card y ningún acceso a su código ni a sus datos internos.',
      flows: ['orch>log', 'log>orch'],
      data: {
        title: 'GET https://agentes.rutasur.cl/.well-known/agent-card.json (extracto)',
        lang: 'json',
        content: json({
          name: 'RutaSur · Agente de entregas',
          provider: { organization: 'RutaSur Logística SpA', url: 'https://rutasur.cl' },
          supportedInterfaces: [{ url: 'https://agentes.rutasur.cl/a2a/jsonrpc', protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
          capabilities: { streaming: true, pushNotifications: true },
          skills: [{ id: 'reprogramar_entrega', name: 'Reprogramar entrega', description: 'Cambia la ventana de entrega de un envío activo.' }],
        }),
        hl: ['"provider"', '"reprogramar_entrega"'],
      },
      code: { hl: ['logistica = RemoteA2aAgent(', 'agentes.rutasur.cl'] },
    },
    {
      title: 'Regla para elegir',
      body: '¿El otro lado es una función con entrada/salida predecible? **MCP**. ¿Es un agente autónomo con estado y criterio propio? **A2A**. ¿Es una persona frente a una UI? **AG-UI**. En el código se nota: MCP va en `tools`, A2A en `sub_agents`.',
      focus: ['crm', 'fin', 'ui'],
      data: {
        title: 'qué protocolo usa cada interacción del caso',
        lang: 'yaml',
        content: [
          'get_customer:          { protocolo: MCP,   motivo: "función determinista con esquema" }',
          'search_policies:       { protocolo: MCP,   motivo: "búsqueda con entrada y salida predecibles" }',
          'approve_discount:      { protocolo: A2A,   motivo: "agente con criterio propio; puede pedir datos o tardar" }',
          'reprogramar_entrega:   { protocolo: A2A,   motivo: "agente de otra organización, caja negra" }',
          'progreso_y_aprobacion: { protocolo: AG-UI, motivo: "una persona frente a la app" }',
        ].join('\n'),
        hl: ['protocolo: MCP', 'protocolo: A2A', 'protocolo: AG-UI'],
      },
      code: { hl: ['tools=[crm, kb]', 'sub_agents=[finanzas, logistica]'] },
    },
  ],
}
