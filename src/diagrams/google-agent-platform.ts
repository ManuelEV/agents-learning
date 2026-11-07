import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ------------------------------------------------------------------ */
/* Código reutilizado literalmente de google-agent-platform.mdx        */
/* ------------------------------------------------------------------ */

/** Bloque `operaciones_agent/agent.py` del artículo. */
const AGENT_PY = `from google.adk.agents import Agent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

inventario = McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url="https://mcp-inventario-xxxx.a.run.app/mcp",   # servidor MCP en Cloud Run
    ),
    tool_filter=["get_stock", "create_replenishment_order"],  # mínimo privilegio también en el cliente
)

root_agent = Agent(
    name="operaciones",
    model="gemini-flash-latest",
    instruction=(
        "Ayudas al equipo de operaciones con inventario y reposición. "
        "Antes de crear una orden de reposición, confirma bodega, SKU y cantidad con el usuario."
    ),
    tools=[inventario],
)`

/** Bloque `deploy-agent-runtime.sh` del artículo. */
const DEPLOY = `# Despliegue gestionado: sesiones, memoria y trazas integradas
adk deploy agent_engine \\
  --project=$PROJECT_ID \\
  --region=us-central1 \\
  --display_name="Agente de Operaciones" \\
  operaciones_agent`

/** Servidor MCP de inventario (no está en la página). */
const MCP_SERVER = `from mcp.server import MCPServer          # SDK oficial de Python v2
import erp                                   # cliente interno del ERP

mcp = MCPServer("inventario")

@mcp.tool()
def get_stock(sku: str, bodega: str) -> dict:
    """Stock disponible de un SKU en una bodega. Solo lectura."""
    return erp.stock(sku=sku, bodega=bodega)

@mcp.tool()
def create_replenishment_order(sku: str, bodega: str, cantidad: int) -> dict:
    """Crea una orden de reposición. Escritura: confirmar con el usuario antes."""
    return erp.crear_orden(sku=sku, bodega=bodega, cantidad=cantidad)

@mcp.tool()
def delete_sku(sku: str) -> dict:
    """Da de baja un SKU del catálogo. Solo para el equipo de catálogo."""
    return erp.baja_sku(sku)

if __name__ == "__main__":
    mcp.run(transport="streamable-http")     # Cloud Run, detrás de Agent Gateway`

const PREGUNTA = '¿Cuánto stock queda del SKU 4410 en la bodega de Santiago? Si está bajo, abre una reposición.'

/* ------------------------------------------------------------------ */
/* 1. Arquitectura de referencia                                       */
/* ------------------------------------------------------------------ */

export const gcpArquitecturaAdk: IsoSpec = {
  id: 'gcp-arquitectura-adk',
  title: 'Arquitectura de referencia: agente ADK en Agent Platform',
  summary:
    'Un agente **ADK** desplegado en **Agent Runtime**, con **Sessions** y **Memory Bank** gestionados, modelos de **Model Garden** (Gemini o Claude), herramientas detrás de **Agent Gateway** y conocimiento en **Agent Search / RAG Engine**. Los empleados lo usan desde **Gemini Enterprise**. El código es el `agent.py` y el comando de despliegue del artículo; en **Datos** verás la llamada al runtime, la `functionCall` de Gemini, el JSON-RPC MCP y el span de la traza.',
  height: 500,
  zones: [{ id: 'platform', label: 'Gemini Enterprise Agent Platform', from: [4.8, -4.9], to: [11.2, 4.9], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Empleado', sub: 'web, Workspace, Teams', at: [-1.4, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Un analista de operaciones pregunta por el estado del inventario y pide abrir una orden de reposición.' },
    { id: 'ge', label: 'Gemini Enterprise', sub: 'ex Agentspace', at: [2.2, 0], shape: 'box', tone: 'user', icon: 'sparkles', info: 'Producto para empleados (chat, búsqueda y agentes). Los agentes ADK publicados en Agent Runtime pueden registrarse para aparecer aquí, con el SSO corporativo.' },
    { id: 'obs', label: 'Observabilidad', sub: 'Cloud Trace · evals', at: [2.2, 3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'Trazas por defecto para agentes ADK (GA jun 2026), logging de prompts/respuestas y evaluación online del pilar *Optimize*.' },
    { id: 'runtime', label: 'Agent Runtime', sub: 'ADK · ex Agent Engine', at: [6.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Runtime gestionado con autoescalado, *cold starts* rápidos y agentes de larga duración. Integración completa con ADK; también LangChain, LangGraph, AG2, LlamaIndex, CrewAI o cualquier contenedor. El recurso de API sigue llamándose `ReasoningEngine`.' },
    { id: 'model', label: 'Model Garden', sub: 'Gemini · Claude', at: [6.4, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Gemini de forma nativa y modelos de terceros como **Claude** (Sonnet 5.5, Opus 5.5, Haiku 5.5) como servicio gestionado, facturados en tu proyecto GCP.' },
    { id: 'sessions', label: 'Sessions', sub: 'estado de la sesión', at: [6.4, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Agent Platform Sessions guarda eventos y estado de cada conversación (`VertexAiSessionService` en ADK). Endpoints multirregionales y globales GA desde jun 2026.' },
    { id: 'memory', label: 'Memory Bank', sub: 'largo plazo', at: [9.6, 3.4], shape: 'cylinder', tone: 'memory', icon: 'brain', info: 'Memoria persistente entre sesiones: extrae y consolida hechos del usuario ("gestiona la bodega de Santiago"). Perfiles de memoria GA jul 2026.' },
    { id: 'gw', label: 'Agent Gateway', sub: 'egress gobernado', at: [9.6, 0], shape: 'hex', tone: 'gateway', icon: 'shield', info: 'Punto central de aplicación de políticas para las llamadas del agente a herramientas, MCP y otros agentes. GA el 18-06-2026, con Model Armor GA el 24-06-2026.' },
    { id: 'mcp', label: 'MCP de inventario', sub: 'Cloud Run', at: [13, -1.7], shape: 'box', tone: 'tool', icon: 'server', info: 'Servidor MCP propio en Cloud Run que envuelve el ERP: `get_stock`, `create_replenishment_order`.' },
    { id: 'search', label: 'Agent Search', sub: 'o RAG Engine', at: [13, 1.7], shape: 'stack', tone: 'data', icon: 'search', info: 'Búsqueda empresarial gestionada (ex Vertex AI Search) o RAG Engine con el vector store que elijas, para manuales y procedimientos.' },
  ],
  edges: [
    { from: 'user', to: 'ge' },
    { from: 'ge', to: 'runtime' },
    { from: 'runtime', to: 'model' },
    { from: 'runtime', to: 'sessions' },
    { from: 'runtime', to: 'memory', route: 'z' },
    { from: 'runtime', to: 'gw' },
    { from: 'gw', to: 'mcp', route: 'z' },
    { from: 'gw', to: 'search', route: 'z' },
    { from: 'runtime', to: 'obs', route: 'z', dashed: true },
  ],
  code: {
    agent: { title: 'operaciones_agent/agent.py', lang: 'python', source: AGENT_PY },
    deploy: { title: 'deploy-agent-runtime.sh', lang: 'bash', source: DEPLOY },
  },
  steps: [
    {
      title: '1 · Entrada por Gemini Enterprise',
      body: 'El empleado abre el agente "Operaciones" en Gemini Enterprise; la identidad corporativa viaja con la petición. Por debajo (o desde una app propia) es una llamada al recurso `ReasoningEngine` que creó `adk deploy agent_engine`, con `user_id`, `session_id` y el mensaje.',
      flows: ['user>ge', 'ge>runtime: streamQuery'],
      data: {
        title: 'llamada a Agent Runtime desde una app (forma simplificada)',
        lang: 'http',
        content: `POST /v1/projects/acme-ops/locations/us-central1/reasoningEngines/8812345:streamQuery?alt=sse HTTP/1.1
Host: us-central1-aiplatform.googleapis.com
Authorization: Bearer ya29.…
Content-Type: application/json

${json({ class_method: 'async_stream_query', input: { user_id: 'analista-ops-17', session_id: '5730192846', message: PREGUNTA } })}`,
        hl: ['reasoningEngines/8812345:streamQuery', '"user_id"', '"session_id"'],
      },
      code: { file: 'deploy', hl: ['adk deploy agent_engine', '--region=us-central1', '--display_name="Agente de Operaciones"'] },
    },
    {
      title: '2 · Sesión y memoria',
      body: 'ADK carga la sesión desde **Sessions** (eventos y estado) y recupera recuerdos relevantes de **Memory Bank**: la bodega asignada y el umbral habitual de reposición. Con el despliegue gestionado no configuras nada de esto en el código.',
      flows: ['sessions>runtime', 'memory>runtime'],
      data: {
        title: 'sesión + recuerdos recuperados (forma simplificada)',
        lang: 'json',
        content: json({
          session: { id: '5730192846', userId: 'analista-ops-17', events: 6, state: { bodega_actual: 'BOD-SCL' } },
          memories: [{ fact: 'Gestiona la bodega de Santiago (BOD-SCL).' }, { fact: 'Repone cuando el stock baja del 20 % del máximo.' }],
        }),
        hl: ['"state"', '"fact"'],
      },
      code: { file: 'deploy', hl: ['Despliegue gestionado: sesiones, memoria y trazas integradas'] },
    },
    {
      title: '3 · Razonamiento',
      body: 'El agente llama al modelo de **Model Garden** (aquí `gemini-flash-latest`; podría ser Claude) con la instrucción, los recuerdos y las definiciones de las tools MCP. El modelo responde con una `functionCall`: pide `get_stock`.',
      flows: ['runtime>model: generateContent', 'model>runtime: functionCall'],
      data: {
        title: 'respuesta de Gemini con functionCall',
        lang: 'json',
        content: json({
          candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'get_stock', args: { sku: '4410', bodega: 'BOD-SCL' } } }] }, finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 1184, candidatesTokenCount: 21 },
        }),
        hl: ['"functionCall"', '"name": "get_stock"'],
      },
      code: { file: 'agent', hl: ['root_agent = Agent(', 'model="gemini-flash-latest"', 'tools=[inventario]'] },
    },
    {
      title: '4 · Herramientas vía Agent Gateway',
      body: 'ADK traduce la `functionCall` a un `tools/call` MCP. Toda llamada saliente pasa por **Agent Gateway** (egress), que valida que el servidor esté en **Agent Registry** y que la identidad del agente pueda usar esa tool. Luego llega al MCP de inventario en Cloud Run.',
      flows: ['runtime>gw: tools/call', 'gw>mcp', 'mcp>gw: result'],
      data: {
        title: 'JSON-RPC MCP (sale por el gateway)',
        lang: 'json',
        content: json({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_stock', arguments: { sku: '4410', bodega: 'BOD-SCL' } } }),
        hl: ['"method": "tools/call"', '"name": "get_stock"'],
      },
      code: { file: 'agent', hl: ['inventario = McpToolset(', 'url="https://mcp-inventario-xxxx.a.run.app/mcp"', 'tool_filter=["get_stock", "create_replenishment_order"]'] },
    },
    {
      title: '5 · Conocimiento',
      body: 'El stock está bajo el umbral. Para el procedimiento de reposición urgente, el agente consulta **Agent Search** sobre los manuales de operaciones, también a través del gateway. Vuelven fragmentos con su documento de origen.',
      flows: ['runtime>gw: search', 'gw>search', 'search>gw'],
      data: {
        title: 'resultados de búsqueda (forma simplificada)',
        lang: 'json',
        content: json({
          results: [
            { document: { title: 'PRO-OPS-12 Reposición urgente', uri: 'gs://manuales-ops/PRO-OPS-12.pdf' }, snippet: 'Bajo el 20 % del máximo: orden urgente con entrega en 48 h; sobre 500 unidades requiere visto bueno del jefe de bodega.' },
          ],
        }),
        hl: ['"title"', '"snippet"'],
      },
    },
    {
      title: '6 · Respuesta y trazas',
      body: 'Como dice la instrucción, antes de crear la orden el agente **confirma** bodega, SKU y cantidad. Responde en Gemini Enterprise, Memory Bank consolida lo nuevo y cada paso queda en Cloud Trace para evaluación online.',
      flows: ['runtime>ge', 'ge>user', 'runtime>memory', 'runtime>obs: spans'],
      data: {
        title: 'span raíz del turno (forma simplificada)',
        lang: 'json',
        content: json({
          name: 'invoke_agent operaciones',
          attributes: {
            'gen_ai.operation.name': 'invoke_agent',
            'gen_ai.agent.name': 'operaciones',
            'gen_ai.provider.name': 'gcp.vertex_ai',
            'gen_ai.request.model': 'gemini-flash-latest',
            'gen_ai.conversation.id': '5730192846',
          },
          children: ['chat gemini-flash-latest', 'execute_tool get_stock', 'chat gemini-flash-latest'],
          respuesta: 'Quedan 38 unidades del SKU 4410 en BOD-SCL (bajo el 20 %). ¿Confirmas una orden urgente de 200 unidades para BOD-SCL?',
        }),
        hl: ['"gen_ai.agent.name"', '"respuesta"'],
      },
      code: { file: 'agent', hl: ['name="operaciones"', 'Antes de crear una orden de reposición, confirma bodega, SKU y cantidad'] },
    },
  ],
}

/* ------------------------------------------------------------------ */
/* 2. Agent Gateway ingress / egress                                   */
/* ------------------------------------------------------------------ */

export const gcpAgentGateway: IsoSpec = {
  id: 'gcp-agent-gateway',
  title: 'Gobernanza con Agent Gateway (ingress y egress)',
  summary:
    '**Agent Gateway** es la puerta de entrada y salida del tráfico agéntico. En modo **ingress** controla qué clientes (Gemini CLI, Claude Code, Cursor) llegan a tus agentes; en modo **egress** decide a qué herramientas, MCP y agentes puede llamar cada agente según su **Agent Identity**, el **Agent Registry**, IAM y **Model Armor**. El código es el agente del artículo y un servidor MCP ilustrativo con una tool peligrosa (`delete_sku`); los datos de las decisiones del gateway son **ilustrativos** (sus formatos internos no son públicos), salvo el JSON-RPC MCP.',
  height: 480,
  nodes: [
    { id: 'client', label: 'Cliente', sub: 'Gemini CLI · Claude Code', at: [-0.6, 0], shape: 'person', tone: 'user', icon: 'terminal', info: 'Clientes de desarrollo o apps que consumen agentes y herramientas alojados en Google Cloud.' },
    { id: 'ingress', label: 'Ingress', sub: 'Agent Gateway', at: [2.7, 0], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Modo *Client-to-Agent*. Controla qué clientes llegan al agente; admite políticas de *Semantic Governance* (restricciones en lenguaje natural), que no se combinan con Model Armor en el mismo gateway. Agent Runtime soporta ingress y egress; Gemini Enterprise solo egress.' },
    { id: 'agent', label: 'Agente ADK', sub: 'Agent Runtime', at: [6.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'El agente se ejecuta con su propia **Agent Identity**, gestionada por la plataforma, en lugar de una cuenta de servicio compartida.' },
    { id: 'identity', label: 'Agent Identity', sub: 'SPIFFE ID', at: [6.4, 3.4], shape: 'box', tone: 'guard', icon: 'key', info: 'Identidad única y gestionada por agente, basada en SPIFFE, con certificado X.509 gestionado y tokens ligados al certificado: sin claves de larga duración. La API `agentidentity.googleapis.com` estaba en preview a jun 2026.' },
    { id: 'armor', label: 'Model Armor', sub: 'inyección · fuga de datos', at: [6.4, -3.4], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Inspecciona el tráfico para detectar *prompt injection*, fuga de datos sensibles y contenido dañino. Integrado con Agent Gateway en GA desde el 24-06-2026.' },
    { id: 'egress', label: 'Egress', sub: 'Agent Gateway', at: [9.6, 0], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Modo *Agent-to-Anywhere*: todo lo que el agente llama sale por aquí. Para tráfico MCP, el gateway puede leer la petición y aplicar políticas por herramienta concreta.' },
    { id: 'registry', label: 'Agent Registry', sub: 'destinos permitidos', at: [9.6, -3.4], shape: 'stack', tone: 'data', icon: 'list', info: 'Catálogo central de agentes, herramientas y servidores MCP (GA 18-06-2026, con soporte A2A v1.0). Sus entradas definen los destinos de salida permitidos.' },
    { id: 'iam', label: 'IAM + IAP', sub: 'política por tool', at: [9.6, 3.4], shape: 'diamond', tone: 'guard', icon: 'lock', info: 'Políticas IAM que restringen a un agente (por su SPIFFE ID) a herramientas o métodos concretos. IAP está activo por defecto en egress y puede correr en modo *dry-run* solo auditoría.' },
    { id: 'mcp', label: 'Servidor MCP', sub: 'Cloud Run / SaaS', at: [13, -1.7], shape: 'box', tone: 'tool', icon: 'plug', info: 'Herramientas permitidas: p. ej. `get_stock` sí, `delete_sku` no para este agente.' },
    { id: 'peer', label: 'Agente remoto', sub: 'A2A v1.0', at: [13, 1.7], shape: 'tall', tone: 'agent', icon: 'network', scale: 0.85, info: 'Otro agente (de otro equipo o proveedor) registrado en Agent Registry y alcanzado por A2A.' },
  ],
  edges: [
    { from: 'client', to: 'ingress' },
    { from: 'ingress', to: 'agent' },
    { from: 'agent', to: 'identity', dashed: true },
    { from: 'agent', to: 'egress' },
    { from: 'egress', to: 'armor', route: 'z' },
    { from: 'egress', to: 'registry' },
    { from: 'egress', to: 'iam' },
    { from: 'egress', to: 'mcp', route: 'z' },
    { from: 'egress', to: 'peer', route: 'z' },
  ],
  code: {
    agent: { title: 'operaciones_agent/agent.py', lang: 'python', source: AGENT_PY },
    server: { title: 'mcp_inventario/server.py (ilustrativo)', lang: 'python', source: MCP_SERVER },
  },
  steps: [
    {
      title: '1 · Ingress',
      body: 'Un desarrollador usa Gemini CLI para hablar con el agente. El gateway en modo **client-to-agent** decide si ese cliente puede llegar y aplica *Semantic Governance* si está configurada: una restricción en lenguaje natural sobre qué se le puede pedir al agente.',
      flows: ['client>ingress', 'ingress>agent'],
      data: {
        title: 'decisión de ingress (ilustrativo)',
        lang: 'json',
        content: json({
          cliente: 'gemini-cli',
          usuario: 'dev.ops@acme.com',
          destino: 'reasoningEngines/8812345 (operaciones)',
          semantic_governance: 'Solo consultas de inventario y reposición; nada sobre precios ni proveedores.',
          decision: 'ALLOW',
        }),
        hl: ['"semantic_governance"', '"decision": "ALLOW"'],
      },
    },
    {
      title: '2 · El agente actúa con su identidad',
      body: 'El agente no usa una cuenta de servicio compartida: tiene su propia **Agent Identity** (SPIFFE), con certificado gestionado y sin claves de larga duración. Es lo que verán las políticas y la auditoría.',
      flows: ['agent>identity: certificado X.509'],
      focus: ['agent', 'identity'],
      data: {
        title: 'identidad del agente (ilustrativo)',
        lang: 'json',
        content: json({
          spiffe_id: 'spiffe://<trust-domain>/…/reasoningEngines/8812345',
          credencial: 'certificado X.509 gestionado, rotación automática',
          tokens: 'ligados al certificado',
          claves_de_larga_duracion: false,
          cuenta_de_servicio_compartida: false,
        }),
        hl: ['"spiffe_id"', '"claves_de_larga_duracion": false'],
      },
    },
    {
      title: '3 · Egress: ¿destino registrado?',
      body: 'El agente quiere llamar al servidor MCP de inventario. El gateway en modo **agent-to-anywhere** comprueba que el destino exista y esté aprobado en **Agent Registry**; lo no registrado no sale, aunque la URL esté escrita en el código.',
      flows: ['agent>egress', 'egress>registry: ¿registrado?'],
      data: {
        title: 'entrada del registro (ilustrativo)',
        lang: 'json',
        content: json({
          nombre: 'mcp-inventario',
          tipo: 'MCP',
          url: 'https://mcp-inventario-xxxx.a.run.app/mcp',
          dueño: 'equipo-operaciones',
          estado: 'APROBADO',
          tools: ['get_stock', 'create_replenishment_order', 'delete_sku'],
        }),
        hl: ['"url"', '"estado": "APROBADO"'],
      },
      code: { file: 'agent', hl: ['url="https://mcp-inventario-xxxx.a.run.app/mcp"'] },
    },
    {
      title: '4 · Autorización por herramienta',
      body: 'Para MCP, el gateway lee el nombre de la tool (con la spec `2026-07-28` también viaja en el header `Mcp-Name`, sin parsear el body). IAM decide con el SPIFFE ID del agente: `get_stock` sí, `delete_sku` **no**. El `tool_filter` del cliente ya la ocultaba, pero eso es higiene; la garantía está en el gateway. IAP puede ir primero en *dry-run* para auditar.',
      flows: ['egress>iam: delete_sku?', 'iam>egress: DENY'],
      focus: ['egress', 'iam'],
      data: {
        title: 'tools/call que el gateway rechaza',
        lang: 'http',
        content: `POST /mcp HTTP/1.1
Host: mcp-inventario-xxxx.a.run.app
Mcp-Method: tools/call
Mcp-Name: delete_sku
Content-Type: application/json

${json({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'delete_sku', arguments: { sku: '4410' } } })}`,
        hl: ['Mcp-Name: delete_sku', '"name": "delete_sku"'],
      },
      code: { file: 'server', hl: ['def delete_sku(sku: str)', 'Solo para el equipo de catálogo.'] },
    },
    {
      title: '5 · Model Armor',
      body: '**Model Armor** inspecciona la petición y la respuesta: bloquea fugas de datos sensibles o instrucciones inyectadas en resultados de herramientas (p. ej. un campo "observaciones" del ERP con texto de un atacante).',
      flows: ['egress>armor', 'armor>egress'],
      data: {
        title: 'resultado de Model Armor (forma simplificada)',
        lang: 'json',
        content: json({
          sanitizationResult: {
            filterMatchState: 'MATCH_FOUND',
            filterResults: { pi_and_jailbreak: { piAndJailbreakFilterResult: { matchState: 'MATCH_FOUND', confidenceLevel: 'HIGH' } } },
          },
        }),
        hl: ['"filterMatchState": "MATCH_FOUND"', 'pi_and_jailbreak'],
      },
    },
    {
      title: '6 · Destinos permitidos',
      body: 'Solo entonces el tráfico llega al servidor MCP (o al agente remoto vía A2A). La respuesta vuelve por el mismo camino. Todo queda trazado (Cloud Trace para el gateway está en preview desde sep 2026).',
      flows: ['egress>mcp: get_stock', 'mcp>egress', 'egress>peer: A2A'],
      data: {
        title: 'resultado de get_stock (JSON-RPC)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 3,
          result: {
            content: [{ type: 'text', text: '{"sku":"4410","bodega":"BOD-SCL","disponible":38,"maximo":240}' }],
            structuredContent: { sku: '4410', bodega: 'BOD-SCL', disponible: 38, maximo: 240 },
            isError: false,
          },
        }),
        hl: ['"structuredContent"'],
      },
      code: { file: 'server', hl: ['def get_stock(sku: str, bodega: str)', 'return erp.stock('] },
    },
  ],
}
