import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ────────────────────────────────────────────────────────────────────────────
 * Código reutilizado literalmente de src/content/google-adk.mdx
 * ──────────────────────────────────────────────────────────────────────────── */

const AGENT = `from google.adk.agents import Agent          # alias de LlmAgent
from google.adk.tools import ToolContext

def get_order_status(order_id: str) -> dict:
    """Consulta el estado logístico de un pedido en el ERP.

    Args:
        order_id: Identificador del pedido, por ejemplo "4512".
    """
    # En producción: llamada al ERP o a un servidor MCP interno
    return {"order_id": order_id, "status": "retrasado", "carrier": "Chilexpress", "eta": "2026-11-04"}

def save_preferred_channel(channel: str, tool_context: ToolContext) -> dict:
    """Guarda el canal de contacto preferido del cliente (email, whatsapp o teléfono)."""
    tool_context.state["user:preferred_channel"] = channel   # prefijo user: = persiste entre sesiones del usuario
    return {"saved": True}

root_agent = Agent(
    name="soporte_pedidos",
    model="gemini-flash-latest",
    description="Resuelve dudas sobre pedidos y entregas.",
    instruction=(
        "Eres el agente de soporte de una tienda online. Usa las herramientas; no inventes datos. "
        "Canal preferido del cliente: {user:preferred_channel?}"   # plantilla leída desde state
    ),
    tools=[get_order_status, save_preferred_channel],  # se envuelven como FunctionTool
)`

const RUN_LOCAL = `import asyncio
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from soporte.agent import root_agent

async def main():
    session_service = InMemorySessionService()          # en producción: DatabaseSessionService o Agent Platform Sessions
    runner = Runner(agent=root_agent, app_name="soporte", session_service=session_service)
    session = await session_service.create_session(app_name="soporte", user_id="cliente-881")

    msg = types.Content(role="user", parts=[types.Part(text="¿Dónde está mi pedido 4512?")])
    async for event in runner.run_async(user_id="cliente-881", session_id=session.id, new_message=msg):
        if event.is_final_response():                   # ignora eventos intermedios (tool calls, parciales)
            print(event.content.parts[0].text)

asyncio.run(main())`

const MCP_TOOLS = `import os
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

crm_tools = McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url="https://mcp-gateway.interno/crm/mcp",      # p. ej. AgentCore Gateway o un gateway MCP propio
        headers={"Authorization": f"Bearer {os.getenv('MCP_AUTH_TOKEN')}"},
        timeout=5,
        sse_read_timeout=300,
    ),
    tool_filter=["get_customer", "list_open_tickets"],  # solo lectura: nada de delete_customer
)

root_agent = LlmAgent(name="soporte_crm", model="gemini-flash-latest",
                      instruction="Consulta el CRM antes de responder.", tools=[crm_tools])`

const POLICIES = `from typing import Any, Optional
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmRequest, LlmResponse
from google.adk.tools import BaseTool, ToolContext
from google.genai import types

MAX_REFUND_USD = 500

def enforce_refund_limit(tool: BaseTool, args: dict[str, Any], tool_context: ToolContext) -> Optional[dict]:
    """before_tool_callback: bloquea reembolsos sobre el umbral sin aprobación."""
    if tool.name == "refund_order" and args.get("amount_usd", 0) > MAX_REFUND_USD:
        tool_context.state["temp:needs_approval"] = True
        return {"error": f"Reembolsos sobre {MAX_REFUND_USD} USD requieren aprobación de un supervisor."}
    return None  # None = ejecutar la herramienta normalmente

def block_card_numbers(callback_context: CallbackContext, llm_request: LlmRequest) -> Optional[LlmResponse]:
    """before_model_callback: no enviar números de tarjeta al modelo."""
    last = llm_request.contents[-1].parts[0].text or ""
    if any(len(tok) >= 15 and tok.isdigit() for tok in last.split()):
        return LlmResponse(content=types.Content(role="model",
            parts=[types.Part(text="Por seguridad, no compartas números de tarjeta por este canal.")]))
    return None

# root_agent = Agent(..., before_tool_callback=enforce_refund_limit, before_model_callback=block_card_numbers)`

/** Fragmento ilustrativo: los cuatro callbacks que el artículo no muestra en código, con las firmas documentadas. */
const CALLBACKS_EXTRA = `from typing import Any, Optional
from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext
from google.adk.models import LlmResponse
from google.adk.tools import BaseTool, ToolContext
from google.genai import types
from soporte.policies import enforce_refund_limit, block_card_numbers

def store_hours_gate(callback_context: CallbackContext) -> Optional[types.Content]:
    """before_agent_callback: fuera de horario no se gastan tokens."""
    if callback_context.state.get("app:tienda_cerrada"):
        return types.Content(role="model", parts=[types.Part(text="Atendemos de 9 a 21 h. Te respondemos mañana.")])
    return None

def strip_internal_notes(callback_context: CallbackContext, llm_response: LlmResponse) -> Optional[LlmResponse]:
    """after_model_callback: quita notas internas antes de que el agente siga."""
    parts = llm_response.content.parts if llm_response.content else []
    text = (parts[0].text or "") if parts else ""
    if "[INTERNO]" in text:
        clean = text.split("[INTERNO]")[0].strip()
        return LlmResponse(content=types.Content(role="model", parts=[types.Part(text=clean)]))
    return None

def audit_refund(tool: BaseTool, args: dict[str, Any], tool_context: ToolContext, tool_response: dict) -> Optional[dict]:
    """after_tool_callback: audita y recorta el resultado antes de que vuelva al modelo."""
    if tool.name == "refund_order":
        audit_log.info("refund", order=args.get("order_id"), amount=args.get("amount_usd"))
        return {k: tool_response[k] for k in ("refund_id", "status") if k in tool_response}
    return None

def track_resolution(callback_context: CallbackContext) -> Optional[types.Content]:
    """after_agent_callback: métricas de negocio. Devolver None no agrega eventos."""
    metrics.increment("soporte.invocaciones",
                      tags={"needs_approval": bool(callback_context.state.get("temp:needs_approval"))})
    return None

root_agent = Agent(
    name="soporte_pedidos", model="gemini-flash-latest",
    instruction="Eres el agente de soporte de una tienda online.",
    tools=[get_order_status, refund_order],
    before_agent_callback=store_hours_gate,
    before_model_callback=block_card_numbers,
    after_model_callback=strip_internal_notes,
    before_tool_callback=enforce_refund_limit,
    after_tool_callback=audit_refund,
    after_agent_callback=track_resolution,
)`

const MULTI = `from google.adk.agents import Agent
from google.adk.tools.agent_tool import AgentTool

billing = Agent(name="facturacion", model="gemini-flash-latest",
    description="Cobros duplicados, boletas, notas de crédito.",   # el coordinador decide con esto
    instruction="Resuelves problemas de facturación. Pide el número de boleta.")

policy_search = Agent(name="buscador_politicas", model="gemini-flash-latest",
    description="Busca en las políticas comerciales vigentes.",
    instruction="Responde solo con lo que diga la política, citando la sección.")

root_agent = Agent(
    name="coordinador", model="gemini-flash-latest",
    instruction="Atiende al cliente. Deriva facturación al especialista; consulta políticas cuando dudes.",
    sub_agents=[billing],                       # transferencia: facturacion toma el control
    tools=[AgentTool(agent=policy_search)],     # herramienta: el coordinador conserva el control
)`

/** Fragmento ilustrativo: agente remoto A2A y workflow agents 1.x que comparten datos vía state. */
const COMPOSICION = `from google.adk.agents import Agent, SequentialAgent, ParallelAgent, LoopAgent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent
from google.adk.tools import exit_loop

# Agente de Finanzas de otro equipo, consumido por A2A (experimental en Python)
finanzas = RemoteA2aAgent(
    name="finanzas",
    description="Aprueba reversos de cargos duplicados.",
    agent_card="https://finanzas.interno/.well-known/agent-card.json",
)
# billing = Agent(name="facturacion", ..., sub_agents=[finanzas])

stock = Agent(name="stock", model="gemini-flash-latest", tools=[check_stock],
    instruction="Verifica si el SKU devuelto se puede reingresar.", output_key="stock_ok")
fraude = Agent(name="fraude", model="gemini-flash-latest", tools=[fraud_score],
    instruction="Evalúa el riesgo de fraude de la devolución.", output_key="fraude_score")
validaciones = ParallelAgent(name="validaciones", sub_agents=[stock, fraude])

redactor = Agent(name="redactor", model="gemini-flash-latest", output_key="borrador",
    instruction="Redacta la respuesta. Stock: {stock_ok}. Fraude: {fraude_score}. Revisión previa: {revision?}")
revisor = Agent(name="revisor", model="gemini-flash-latest", output_key="revision", tools=[exit_loop],
    instruction="Revisa {borrador}. Si cumple la política, llama exit_loop; si no, di qué corregir.")
redactar_y_revisar = LoopAgent(name="redactar_y_revisar", sub_agents=[redactor, revisor], max_iterations=3)

devoluciones = SequentialAgent(
    name="devoluciones",
    description="Procesa devoluciones con reglas fijas.",
    sub_agents=[validaciones, redactar_y_revisar],   # orden fijo: lo decide el código
)
# root_agent = Agent(name="coordinador", ..., sub_agents=[billing, devoluciones])`

const WORKFLOW2 = `from google.adk import Workflow, Event
from google.adk.agents import Agent

classifier = Agent(name="clasificador", model="gemini-flash-latest",
    instruction="Clasifica la solicitud como DEVOLUCION o RECLAMO. Responde solo la etiqueta.")
returns_agent = Agent(name="devoluciones", model="gemini-flash-latest",
    instruction="Genera la etiqueta de devolución y explica los pasos al cliente.")

def router(node_input: str):
    """Nodo determinista: enruta según la etiqueta del clasificador."""
    return Event(route="DEVOLUCION" if "DEVOLUCION" in node_input.upper() else "RECLAMO")

def open_ticket(node_input: str):
    """Los reclamos no los resuelve el LLM: se abre un ticket en el CRM."""
    return Event(output="Reclamo registrado. Un ejecutivo te contactará en 24 h.")

root_agent = Workflow(
    name="postventa",
    edges=[
        ("START", classifier, router),                                   # secuencia
        (router, {"DEVOLUCION": returns_agent, "RECLAMO": open_ticket}), # rutas
    ],
)`

/* ────────────────────────────────────────────────────────────────────────────
 * Datos del recorrido del runtime (pedido 4512)
 * ──────────────────────────────────────────────────────────────────────────── */

const INV = 'e-7f3a91c2'
const USER_TEXT = '¿Dónde está mi pedido 4512? Avísame por WhatsApp.'

export const googleAdkRuntime: IsoSpec = {
  id: 'google-adk-runtime',
  title: 'El runtime de ADK por dentro',
  summary:
    'En ADK el **Runner** orquesta cada invocación: carga la sesión, ejecuta el agente y, por cada **Event** que el agente emite (texto, `function_call`, `function_response`, cambio de estado), hace *commit* en los servicios. El agente se pausa en cada `yield` y solo continúa cuando el Runner procesó el evento. Recorre los pasos con el pedido 4512: en **Datos** ves los eventos y la sesión tal como los guarda ADK (forma simplificada) y en **Código**, las líneas de `soporte/agent.py`, `run_local.py` y `soporte/mcp_tools.py` del artículo.',
  height: 500,
  zones: [{ id: 'svc', label: 'Servicios del Runner', from: [1.8, 2.0], to: [11.4, 4.7], tone: 'memory' }],
  nodes: [
    { id: 'user', label: 'Usuario / API', sub: 'adk web · api_server', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'La petición llega desde la Dev UI (`adk web`), la CLI (`adk run`), el servidor REST (`adk api_server`) o tu propia app que llama a `runner.run_async(...)`.' },
    { id: 'runner', label: 'Runner', sub: 'orquesta la invocación', at: [3.2, 0], shape: 'tall', tone: 'infra', icon: 'repeat', info: 'Recibe el mensaje, lo agrega al historial de la sesión, arranca el agente raíz y procesa cada `Event` que este emite: persiste `state_delta` y `artifact_delta` con `append_event` y reenvía el evento a quien itera `run_async`.' },
    { id: 'session', label: 'SessionService', sub: 'eventos + state', at: [3.2, 3.3], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Guarda la conversación como una lista de eventos y un diccionario `state`. Implementaciones: `InMemorySessionService` (dev), `DatabaseSessionService` (SQL) y el servicio gestionado de Agent Platform Sessions.' },
    { id: 'agent', label: 'LlmAgent', sub: 'soporte_pedidos', at: [6.6, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Arma el `LlmRequest` (instrucción con variables de `state`, historial, declaraciones de herramientas), llama al modelo y ejecuta las herramientas pedidas. Emite un `Event` por cada paso relevante y se pausa hasta que el Runner lo procesa.' },
    { id: 'model', label: 'Modelo', sub: 'Gemini · LiteLlm→Bedrock', at: [6.6, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Gemini se usa con un string (`gemini-flash-latest`); otros proveedores, como Claude en Bedrock, a través del conector `LiteLlm` o de un proxy LiteLLM.' },
    { id: 'memory', label: 'MemoryService', sub: 'largo plazo', at: [6.6, 3.3], shape: 'stack', tone: 'memory', icon: 'search', info: 'Memoria buscable entre sesiones (p. ej. Memory Bank de Agent Platform). Las sesiones terminadas se pueden ingestar y el agente las consulta con herramientas como `load_memory`.' },
    { id: 'tool', label: 'FunctionTools', sub: 'get_order_status · save_…', at: [10, 0], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Funciones Python con type hints y docstring. `save_preferred_channel` declara `tool_context: ToolContext`: ADK lo inyecta (no aparece en el esquema que ve el modelo) y la función escribe en `tool_context.state`.' },
    { id: 'mcp', label: 'McpToolset', sub: 'CRM vía MCP', at: [10, -3.4], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Expone las herramientas de un servidor MCP (stdio o Streamable HTTP) como herramientas ADK, con `tool_filter` para limitar cuáles ve el modelo: aquí solo `get_customer` y `list_open_tickets`.' },
    { id: 'artifacts', label: 'ArtifactService', sub: 'archivos versionados', at: [10, 3.3], shape: 'doc', tone: 'data', icon: 'file', info: 'Almacena blobs con nombre y versión (PDFs, imágenes, CSV) asociados a la sesión o al usuario. Si una herramienta guarda un artefacto, el cambio viaja como `artifact_delta` en el evento. En GCP suele respaldarse en Cloud Storage.' },
  ],
  edges: [
    { from: 'user', to: 'runner' },
    { from: 'runner', to: 'session', route: 'z' },
    { from: 'runner', to: 'agent', label: 'InvocationContext' },
    { from: 'agent', to: 'model', label: 'LlmRequest' },
    { from: 'agent', to: 'tool' },
    { from: 'agent', to: 'mcp', route: 'z' },
    { from: 'session', to: 'memory', dashed: true },
    { from: 'tool', to: 'artifacts', route: 'z', dashed: true },
  ],
  code: {
    run: { title: 'run_local.py', lang: 'python', source: RUN_LOCAL },
    agent: { title: 'soporte/agent.py', lang: 'python', source: AGENT },
    mcp: { title: 'soporte/mcp_tools.py', lang: 'python', source: MCP_TOOLS },
  },
  steps: [
    {
      title: '1 · Llega el mensaje',
      body: 'Tu app llama `runner.run_async(user_id, session_id, new_message)` con un `types.Content`. En este recorrido el cliente agrega su canal preferido: *"¿Dónde está mi pedido 4512? Avísame por WhatsApp."* (en `run_local.py` el texto es más corto; el mecanismo es el mismo).',
      flows: ['user>runner'],
      data: {
        title: 'new_message · types.Content',
        lang: 'json',
        content: json({ role: 'user', parts: [{ text: USER_TEXT }] }),
        hl: ['"role"', '"text"'],
      },
      code: { file: 'run', hl: ['msg = types.Content', 'runner.run_async(user_id="cliente-881"'] },
    },
    {
      title: '2 · Cargar la sesión y arrancar',
      body: 'El Runner obtiene la sesión del `SessionService` (eventos + `state`), agrega el mensaje del usuario como primer evento y crea un `InvocationContext` con un `invocation_id` nuevo. Todos los eventos de este turno compartirán ese ID. Antes del agente corre `before_agent_callback`, si existe.',
      flows: ['session>runner', 'runner>session', 'runner>agent'],
      data: {
        title: 'Session (forma simplificada)',
        lang: 'json',
        content: json({
          id: 's-31c0',
          app_name: 'soporte',
          user_id: 'cliente-881',
          state: {},
          events: [{ id: 'evt-01', invocation_id: INV, author: 'user', content: { role: 'user', parts: [{ text: USER_TEXT }] } }],
        }),
        hl: ['"state"', '"author": "user"', '"invocation_id"'],
      },
      code: { file: 'run', hl: ['session_service = InMemorySessionService()', 'runner = Runner(', 'create_session('] },
    },
    {
      title: '3 · Armar el LlmRequest',
      body: 'El agente compone la petición: la `instruction` con las variables de `state` ya interpoladas (`{user:preferred_channel?}` queda vacío porque aún no existe), el historial y las **declaraciones de funciones** generadas desde la firma y el docstring. Fíjate: `tool_context` **no** aparece en el esquema. `before_model_callback` podría inspeccionarlo o bloquearlo aquí.',
      flows: ['agent>model'],
      data: {
        title: 'LlmRequest (forma simplificada)',
        lang: 'json',
        content: json({
          model: 'gemini-flash-latest',
          config: {
            system_instruction: 'Eres el agente de soporte de una tienda online. Usa las herramientas; no inventes datos. Canal preferido del cliente: ',
            tools: [
              {
                function_declarations: [
                  { name: 'get_order_status', description: 'Consulta el estado logístico de un pedido en el ERP.', parameters: { type: 'OBJECT', properties: { order_id: { type: 'STRING' } }, required: ['order_id'] } },
                  { name: 'save_preferred_channel', description: 'Guarda el canal de contacto preferido del cliente (email, whatsapp o teléfono).', parameters: { type: 'OBJECT', properties: { channel: { type: 'STRING' } }, required: ['channel'] } },
                ],
              },
            ],
          },
          contents: [{ role: 'user', parts: [{ text: USER_TEXT }] }],
        }),
        hl: ['"system_instruction"', '"function_declarations"', '"channel"'],
      },
      code: { file: 'agent', hl: ['def get_order_status', 'def save_preferred_channel', 'instruction=(', '{user:preferred_channel?}', 'tools=[get_order_status'] },
    },
    {
      title: '4 · El modelo pide dos herramientas',
      body: 'El modelo responde con **dos** `function_call` en paralelo: consultar el pedido y guardar el canal. El agente emite (`yield`) ese evento con `author: "soporte_pedidos"` y **se pausa** hasta que el Runner lo procese y lo reenvíe a tu bucle `async for`.',
      flows: ['model>agent', 'agent>runner'],
      data: {
        title: 'Event · function_call (forma simplificada)',
        lang: 'json',
        content: json({
          id: 'evt-02',
          invocation_id: INV,
          author: 'soporte_pedidos',
          content: {
            role: 'model',
            parts: [
              { function_call: { id: 'adk-fc-1', name: 'get_order_status', args: { order_id: '4512' } } },
              { function_call: { id: 'adk-fc-2', name: 'save_preferred_channel', args: { channel: 'whatsapp' } } },
            ],
          },
          actions: { state_delta: {}, artifact_delta: {} },
        }),
        hl: ['"function_call"', '"author"'],
      },
      code: { file: 'run', hl: ['async for event in runner.run_async'] },
    },
    {
      title: '5 · Ejecutar las FunctionTools',
      body: 'El agente ejecuta ambas funciones (con `before/after_tool_callback` si existen). `save_preferred_channel` escribe en `tool_context.state`: ese cambio **no** se aplica directo a la sesión, sino que viaja como `state_delta` dentro del evento `function_response`.',
      flows: ['agent>tool', 'tool>agent'],
      data: {
        title: 'Event · function_response con state_delta',
        lang: 'json',
        content: json({
          id: 'evt-03',
          invocation_id: INV,
          author: 'soporte_pedidos',
          content: {
            role: 'user',
            parts: [
              { function_response: { id: 'adk-fc-1', name: 'get_order_status', response: { order_id: '4512', status: 'retrasado', carrier: 'Chilexpress', eta: '2026-11-04' } } },
              { function_response: { id: 'adk-fc-2', name: 'save_preferred_channel', response: { saved: true } } },
            ],
          },
          actions: { state_delta: { 'user:preferred_channel': 'whatsapp' }, artifact_delta: {} },
        }),
        hl: ['"function_response"', '"state_delta"', '"user:preferred_channel": "whatsapp"'],
      },
      code: { file: 'agent', hl: ['return {"order_id": order_id', 'tool_context.state["user:preferred_channel"] = channel', 'return {"saved": True}'] },
    },
    {
      title: '6 · Herramientas remotas por MCP',
      body: 'En la segunda vuelta el modelo revisa si ya hay un ticket abierto con `list_open_tickets`, que viene del `McpToolset`. Para el modelo es indistinguible de una función local; por debajo, el toolset envía un `tools/call` al servidor MCP. `tool_filter` garantiza que solo vea las dos herramientas de lectura.',
      flows: ['agent>model', 'model>agent', 'agent>mcp', 'mcp>agent'],
      data: {
        title: 'Events · llamada y respuesta MCP (forma simplificada)',
        lang: 'json',
        content: json([
          { id: 'evt-04', author: 'soporte_pedidos', content: { role: 'model', parts: [{ function_call: { id: 'adk-fc-3', name: 'list_open_tickets', args: { customer_id: 'cliente-881' } } }] } },
          { id: 'evt-05', author: 'soporte_pedidos', content: { role: 'user', parts: [{ function_response: { id: 'adk-fc-3', name: 'list_open_tickets', response: { tickets: [] } } }] } },
        ]),
        hl: ['"list_open_tickets"', '"tickets"'],
      },
      code: { file: 'mcp', hl: ['crm_tools = McpToolset(', 'StreamableHTTPConnectionParams(', 'tool_filter=["get_customer", "list_open_tickets"]'] },
    },
    {
      title: '7 · Yield y commit',
      body: 'Cada `Event` vuelve al Runner, que llama `session_service.append_event(...)`: ahí se **persisten** el evento y su `state_delta` (y `artifact_delta`, si una herramienta guardó un archivo). Solo entonces el agente continúa. Si la invocación fallara antes de este commit, el cambio de `state` se perdería; por eso no conviene leer `state` a mitad de una herramienta.',
      flows: ['agent>runner', 'runner>session'],
      data: {
        title: 'Session tras el commit (forma simplificada)',
        lang: 'json',
        content: json({
          id: 's-31c0',
          state: { 'user:preferred_channel': 'whatsapp' },
          events: ['evt-01 user', 'evt-02 function_call ×2', 'evt-03 function_response (state_delta)', 'evt-04 function_call', 'evt-05 function_response'],
        }),
        hl: ['"user:preferred_channel": "whatsapp"', 'state_delta'],
      },
      code: { file: 'run', hl: ['async for event in runner.run_async'] },
    },
    {
      title: '8 · Respuesta final y memoria',
      body: 'El modelo responde solo con texto: ese evento cumple `event.is_final_response()` y tu código lo imprime. Como la clave usa el prefijo `user:`, la próxima sesión de `cliente-881` ya tendrá el canal y la instrucción dirá *"Canal preferido del cliente: whatsapp"*. Opcionalmente, la sesión se ingesta al `MemoryService`.',
      flows: ['agent>runner', 'runner>user', 'session>memory'],
      data: {
        title: 'Event final · is_final_response() == True',
        lang: 'json',
        content: json({
          id: 'evt-06',
          invocation_id: INV,
          author: 'soporte_pedidos',
          content: { role: 'model', parts: [{ text: 'Tu pedido 4512 viene retrasado: Chilexpress estima entregarlo el 4 de noviembre. Te avisaremos por WhatsApp si cambia la fecha.' }] },
          actions: { state_delta: {}, artifact_delta: {} },
        }),
        hl: ['"text"'],
      },
      code: { file: 'run', hl: ['if event.is_final_response()', 'print(event.content.parts[0].text)'] },
    },
  ],
}

export const googleAdkMultiagente: IsoSpec = {
  id: 'google-adk-multiagente',
  title: 'Composición multiagente en ADK',
  summary:
    'ADK ofrece tres formas de componer agentes: **sub_agents** (el coordinador transfiere el control), **AgentTool** (el coordinador llama a otro agente como herramienta y conserva el control) y **workflows deterministas** (`SequentialAgent`, `ParallelAgent`, `LoopAgent` o, desde 2.0, el grafo `Workflow`). Un agente remoto se integra por A2A con `RemoteA2aAgent`. Recorre el caso de un cliente con un doble cobro y una devolución: en **Datos** ves los eventos que delatan cada mecanismo (`function_call` a `buscador_politicas`, `transfer_to_agent`, `output_key` en `state`) y en **Código**, `soporte/multi.py` y `devoluciones/agent.py` del artículo, más un fragmento ilustrativo.',
  height: 500,
  zones: [{ id: 'wf', label: 'Workflow determinista', from: [5.0, 2.0], to: [15.0, 4.9], tone: 'infra' }],
  nodes: [
    { id: 'user', label: 'Cliente retail', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Escribe al canal de soporte: *"Me cobraron dos veces el pedido 4512 y además quiero devolver una zapatilla"*.' },
    { id: 'coord', label: 'Coordinador', sub: 'LlmAgent + sub_agents', at: [3.2, 0], shape: 'tall', tone: 'agent', icon: 'router', info: 'Agente raíz con `sub_agents=[...]` y `tools=[AgentTool(...)]`. El modelo decide si responde, si llama una herramienta o si **transfiere** la conversación a un especialista (`transfer_to_agent`), guiándose por la `description` de cada uno.' },
    { id: 'billing', label: 'Facturación', sub: 'sub_agent (transfer)', at: [6.6, -3.4], shape: 'tall', tone: 'agent', icon: 'card', scale: 0.85, info: 'Especialista `facturacion` que **toma el control** de la conversación tras la transferencia: responde directamente al usuario hasta resolver o devolver el control.' },
    { id: 'finance', label: 'Agente Finanzas', sub: 'RemoteA2aAgent', at: [10, -3.4], shape: 'tall', tone: 'protocol', icon: 'network', scale: 0.85, info: 'Agente de otro equipo expuesto por A2A. En ADK se consume con `RemoteA2aAgent(agent_card=...)` y se usa como un sub-agente más. Integración marcada como experimental en Python.' },
    { id: 'policy', label: 'Buscador políticas', sub: 'AgentTool', at: [6.6, 0], shape: 'box', tone: 'tool', icon: 'book', info: 'El agente `buscador_politicas` envuelto con `AgentTool(agent=...)`. El coordinador lo llama como una función, recibe el resultado y **sigue a cargo** de la respuesta. Con `skip_summarization=True` devuelve el resultado sin resumirlo.' },
    { id: 'pipe', label: 'Devoluciones', sub: 'SequentialAgent', at: [6.6, 3.4], shape: 'box', tone: 'infra', icon: 'workflow', info: 'Pipeline de pasos fijos: primero las validaciones en paralelo, luego el loop de redacción. Cada sub-agente escribe su resultado en `state` con `output_key` y el siguiente lo lee con `{variable}` en su instrucción.' },
    { id: 'par', label: 'Validaciones', sub: 'ParallelAgent', at: [10, 3.4], shape: 'box', tone: 'infra', icon: 'split', info: 'Ejecuta en paralelo la verificación de stock y el score de fraude. Cada rama escribe en una clave distinta de `state` (`stock_ok`, `fraude_score`) para no pisarse.' },
    { id: 'loop', label: 'Redactar y revisar', sub: 'LoopAgent', at: [13.4, 3.4], shape: 'box', tone: 'infra', icon: 'repeat', info: 'Loop *evaluator-optimizer*: un agente redacta y otro revisa, hasta que el revisor llama `exit_loop` o se llega a `max_iterations`. En ADK 2.0 (Python/Go) este patrón se expresa mejor como grafo `Workflow`.' },
  ],
  edges: [
    { from: 'user', to: 'coord' },
    { from: 'coord', to: 'billing', label: 'transfer', route: 'z' },
    { from: 'billing', to: 'finance', label: 'A2A' },
    { from: 'coord', to: 'policy', label: 'tool call' },
    { from: 'coord', to: 'pipe', route: 'z' },
    { from: 'pipe', to: 'par' },
    { from: 'par', to: 'loop' },
  ],
  code: {
    multi: { title: 'soporte/multi.py', lang: 'python', source: MULTI },
    comp: { title: 'soporte/composicion.py (ilustrativo)', lang: 'python', source: COMPOSICION },
    wf2: { title: 'devoluciones/agent.py', lang: 'python', source: WORKFLOW2 },
  },
  steps: [
    {
      title: '1 · El coordinador recibe',
      body: 'El cliente mezcla dos temas. El coordinador (un `LlmAgent`) ve en su contexto la herramienta `buscador_politicas` y, gracias a `sub_agents`, la posibilidad de transferir a `facturacion`. Decide en qué orden atender.',
      flows: ['user>coord'],
      data: {
        title: 'Event del usuario',
        lang: 'json',
        content: json({ author: 'user', content: { role: 'user', parts: [{ text: 'Me cobraron dos veces el pedido 4512 y además quiero devolver una zapatilla. ¿Tengo plazo?' }] } }),
        hl: ['"text"'],
      },
      code: { file: 'multi', hl: ['root_agent = Agent(', 'instruction="Atiende al cliente'] },
    },
    {
      title: '2 · AgentTool: consultar sin ceder control',
      body: 'Para el plazo de devolución, el modelo llama a `buscador_politicas` **como una función** (un parámetro `request`). El sub-agente corre con su propio contexto, su respuesta vuelve como `function_response` y el coordinador **sigue a cargo** de la conversación.',
      flows: ['coord>policy', 'policy>coord'],
      data: {
        title: 'Events · AgentTool (forma simplificada)',
        lang: 'json',
        content: json([
          { author: 'coordinador', content: { parts: [{ function_call: { name: 'buscador_politicas', args: { request: 'Plazo de devolución de calzado' } } }] } },
          { author: 'coordinador', content: { parts: [{ function_response: { name: 'buscador_politicas', response: { result: 'Sección 4.2: 30 días desde la entrega, producto sin uso y con caja.' } } }] } },
        ]),
        hl: ['"function_call"', '"function_response"'],
      },
      code: { file: 'multi', hl: ['policy_search = Agent(', 'tools=[AgentTool(agent=policy_search)]'] },
    },
    {
      title: '3 · Transferencia a un sub-agente',
      body: 'Para el doble cobro, el modelo llama a `transfer_to_agent` con `agent_name: "facturacion"`. El evento lleva `actions.transfer_to_agent` y desde aquí **Facturación** conversa directamente con el cliente: el siguiente turno lo atiende ella, no el coordinador.',
      flows: ['coord>billing'],
      data: {
        title: 'Event · transferencia (forma simplificada)',
        lang: 'json',
        content: json({
          author: 'coordinador',
          content: { parts: [{ function_call: { name: 'transfer_to_agent', args: { agent_name: 'facturacion' } } }] },
          actions: { transfer_to_agent: 'facturacion' },
        }),
        hl: ['"transfer_to_agent"', '"agent_name": "facturacion"'],
      },
      code: { file: 'multi', hl: ['billing = Agent(', 'description="Cobros duplicados', 'sub_agents=[billing]'] },
    },
    {
      title: '4 · Delegación remota por A2A',
      body: 'Facturación confirma el cargo duplicado, pero el reverso lo aprueba el **agente de Finanzas** de otro equipo. `RemoteA2aAgent` lee su Agent Card y le envía un `SendMessage` (A2A v1.0) sin compartir código ni memoria; la respuesta vuelve como una tarea terminada.',
      flows: ['billing>finance', 'finance>billing'],
      data: {
        title: 'A2A SendMessage · JSON-RPC (forma simplificada)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 1,
          method: 'SendMessage',
          params: {
            message: {
              role: 'ROLE_USER',
              messageId: 'msg-4512-rev',
              parts: [{ text: 'Reverso de cargo duplicado: pedido 4512, boleta 99817, 2 cargos de 54.990 CLP el 2026-11-02.' }],
            },
          },
        }),
        hl: ['"method": "SendMessage"', '"ROLE_USER"'],
      },
      code: { file: 'comp', hl: ['finanzas = RemoteA2aAgent(', 'agent_card="https://finanzas.interno'] },
    },
    {
      title: '5 · Workflow determinista',
      body: 'La devolución sigue reglas fijas, así que el coordinador transfiere a `devoluciones`, un `SequentialAgent`: aquí **no decide el LLM** el orden de los pasos, lo fija `sub_agents=[validaciones, redactar_y_revisar]`.',
      flows: ['coord>pipe'],
      data: {
        title: 'Event · transferencia al workflow',
        lang: 'json',
        content: json({
          author: 'coordinador',
          content: { parts: [{ function_call: { name: 'transfer_to_agent', args: { agent_name: 'devoluciones' } } }] },
          actions: { transfer_to_agent: 'devoluciones' },
        }),
        hl: ['"devoluciones"'],
      },
      code: { file: 'comp', hl: ['devoluciones = SequentialAgent(', 'sub_agents=[validaciones, redactar_y_revisar]'] },
    },
    {
      title: '6 · Paralelo y loop vía state',
      body: 'Stock y fraude corren en paralelo y cada uno guarda su salida con `output_key`. El redactor las lee con `{stock_ok}` y `{fraude_score}` en su instrucción; el revisor aprueba y llama `exit_loop` en la primera vuelta. Todo viaja como `state_delta` en los eventos.',
      flows: ['pipe>par', 'par>loop'],
      data: {
        title: 'state tras el workflow (forma simplificada)',
        lang: 'json',
        content: json({
          stock_ok: 'Sí: SKU ZAP-881-42 reingresable en bodega Quilicura.',
          fraude_score: 'Bajo (0,08): primera devolución del cliente.',
          borrador: 'Tu devolución de la zapatilla está aprobada. Te enviamos la etiqueta por correo; tienes hasta el 2 de diciembre.',
          revision: 'Cumple la política 4.2. exit_loop.',
        }),
        hl: ['"stock_ok"', '"fraude_score"', '"borrador"'],
      },
      code: { file: 'comp', hl: ['output_key="stock_ok"', 'output_key="fraude_score"', 'ParallelAgent(', '{stock_ok}', 'LoopAgent(', 'max_iterations=3'] },
    },
    {
      title: '7 · El mismo flujo en ADK 2.0',
      body: 'En Python y Go, los workflow agents quedan *superseded* por el grafo `Workflow`: nodos agente y funciones, y **el valor de retorno de un nodo es la entrada del siguiente**, sin pasar por `state`. El nodo `router` es código: devuelve `Event(route=...)` y la arista elige la rama.',
      focus: ['pipe', 'par', 'loop'],
      data: {
        title: 'recorrido del grafo postventa (forma simplificada)',
        lang: 'json',
        content: json([
          { node: 'clasificador', output: 'DEVOLUCION' },
          { node: 'router', route: 'DEVOLUCION' },
          { node: 'devoluciones', output: 'Te enviamos la etiqueta de devolución. Pasos: 1) imprime la etiqueta…' },
        ]),
        hl: ['"route": "DEVOLUCION"'],
      },
      code: { file: 'wf2', hl: ['def router(node_input: str)', 'return Event(route=', '("START", classifier, router)', '(router, {"DEVOLUCION": returns_agent'] },
    },
  ],
}

export const googleAdkCallbacks: IsoSpec = {
  id: 'google-adk-callbacks',
  title: 'Pipeline de callbacks',
  summary:
    'Los **callbacks** son funciones que ADK ejecuta antes y después del agente, del modelo y de cada herramienta. Si un `before_*` devuelve un objeto, **salta** ese paso y usa el objeto; si devuelve `None`, el flujo sigue. Los `after_*` pueden reemplazar el resultado. Recorre un reembolso de 900 USD del pedido 4512 que choca con la política de 500 USD: en **Código** alternas entre `soporte/policies.py` del artículo y un fragmento ilustrativo con los otros cuatro callbacks.',
  height: 470,
  nodes: [
    { id: 'ba', label: 'before_agent', sub: 'gate de entrada', at: [0, 0], shape: 'diamond', tone: 'guard', icon: 'filter', info: 'Corre antes de la lógica del agente. Devolver un `types.Content` omite la ejecución del agente (p. ej. fuera de horario o usuario sin permiso).' },
    { id: 'agent', label: 'LlmAgent', sub: 'soporte_pedidos', at: [3.2, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Los callbacks se registran como parámetros del agente: `before_model_callback=...`, `before_tool_callback=...`, etc.' },
    { id: 'aa', label: 'after_agent', sub: 'post-proceso', at: [0, 3.3], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Corre al final. En Python, devolver contenido **agrega** un evento adicional (no reemplaza la salida), así que úsalo con cuidado.' },
    { id: 'bm', label: 'before_model', sub: 'LlmRequest', at: [6.4, -3.3], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Recibe `callback_context` y `llm_request`. Ideal para filtrar PII, inyectar contexto o servir desde caché devolviendo un `LlmResponse` sin llamar al modelo.' },
    { id: 'model', label: 'Modelo', at: [9.6, -3.3], shape: 'sphere', tone: 'model', icon: 'brain', info: 'La llamada real al LLM (Gemini o Claude vía LiteLlm). Solo ocurre si `before_model` devolvió `None`.' },
    { id: 'am', label: 'after_model', sub: 'LlmResponse', at: [12.8, -3.3], shape: 'diamond', tone: 'guard', icon: 'eye', info: 'Puede inspeccionar o reescribir la respuesta del modelo: enmascarar datos, registrar tokens, normalizar formato.' },
    { id: 'bt', label: 'before_tool', sub: 'tool + args', at: [6.4, 3.3], shape: 'diamond', tone: 'guard', icon: 'lock', info: 'Recibe la herramienta, los argumentos y el `ToolContext`. Devolver un `dict` **bloquea** la ejecución y usa ese dict como resultado: perfecto para políticas (montos máximos, allowlists).' },
    { id: 'tool', label: 'Herramienta', sub: 'refund_order', at: [9.6, 3.3], shape: 'box', tone: 'tool', icon: 'wrench', info: 'La herramienta real (función, MCP, AgentTool). Solo corre si `before_tool` devolvió `None`.' },
    { id: 'at', label: 'after_tool', sub: 'resultado', at: [12.8, 3.3], shape: 'diamond', tone: 'guard', icon: 'scroll', info: 'Recibe además `tool_response`. Puede transformar el resultado antes de que vuelva al modelo: recortar payloads grandes, redactar campos sensibles, auditar.' },
  ],
  edges: [
    { from: 'ba', to: 'agent' },
    { from: 'agent', to: 'bm', route: 'z' },
    { from: 'bm', to: 'model' },
    { from: 'model', to: 'am' },
    { from: 'agent', to: 'bt', route: 'z' },
    { from: 'bt', to: 'tool' },
    { from: 'tool', to: 'at' },
    { from: 'agent', to: 'aa', route: 'z' },
  ],
  code: {
    policies: { title: 'soporte/policies.py', lang: 'python', source: POLICIES },
    extra: { title: 'soporte/callbacks.py (ilustrativo)', lang: 'python', source: CALLBACKS_EXTRA },
  },
  steps: [
    {
      title: '1 · Gate del agente',
      body: '`before_agent_callback` decide si el agente corre. Lee `callback_context.state`: si `app:tienda_cerrada` fuera verdadero, devolvería un `Content` fijo y no se gastaría ni un token. Hoy la tienda está abierta, así que devuelve `None`.',
      flows: ['ba>agent'],
      data: {
        title: 'callback_context.state',
        lang: 'json',
        content: json({ 'app:tienda_cerrada': false, 'user:preferred_channel': 'whatsapp' }),
        hl: ['"app:tienda_cerrada": false'],
      },
      code: { file: 'extra', hl: ['def store_hours_gate', 'callback_context.state.get("app:tienda_cerrada")', 'before_agent_callback=store_hours_gate'] },
    },
    {
      title: '2 · Antes del modelo',
      body: '`block_card_numbers` revisa el último contenido del `LlmRequest`. No hay ningún token de 15 o más dígitos, así que devuelve `None` y se llama al modelo. Si el cliente hubiera pegado su tarjeta, el callback respondería él mismo con un `LlmResponse` y el modelo nunca vería el número.',
      flows: ['agent>bm', 'bm>model'],
      data: {
        title: 'llm_request.contents[-1] (forma simplificada)',
        lang: 'json',
        content: json({ role: 'user', parts: [{ text: 'La zapatilla del pedido 4512 llegó rota. Quiero el reembolso completo: 900 USD.' }] }),
        hl: ['"text"'],
      },
      code: { file: 'policies', hl: ['def block_card_numbers', 'llm_request.contents[-1].parts[0].text', 'len(tok) >= 15', 'return None'] },
    },
    {
      title: '3 · Después del modelo',
      body: 'El modelo pide `refund_order`. `after_model_callback` inspecciona el `LlmResponse`: no trae notas `[INTERNO]`, así que devuelve `None` y el agente procesa la respuesta tal cual.',
      flows: ['model>am'],
      data: {
        title: 'LlmResponse.content (forma simplificada)',
        lang: 'json',
        content: json({ role: 'model', parts: [{ function_call: { name: 'refund_order', args: { order_id: '4512', amount_usd: 900 } } }] }),
        hl: ['"refund_order"', '"amount_usd": 900'],
      },
      code: { file: 'extra', hl: ['def strip_internal_notes', 'if "[INTERNO]" in text', 'after_model_callback=strip_internal_notes'] },
    },
    {
      title: '4 · Política sobre herramientas',
      body: '`enforce_refund_limit` aplica la regla de negocio **en código**: 900 > 500, así que marca `temp:needs_approval` y devuelve un `dict`. La herramienta **no se ejecuta**: ese dict es lo que el modelo recibe como resultado, y con él le explica al cliente que hace falta un supervisor.',
      flows: ['agent>bt'],
      focus: ['bt'],
      data: {
        title: 'function_response que ve el modelo',
        lang: 'json',
        content: json({ function_response: { name: 'refund_order', response: { error: 'Reembolsos sobre 500 USD requieren aprobación de un supervisor.' } } }),
        hl: ['"error"'],
      },
      code: { file: 'policies', hl: ['MAX_REFUND_USD = 500', 'def enforce_refund_limit', 'args.get("amount_usd", 0) > MAX_REFUND_USD', 'tool_context.state["temp:needs_approval"] = True', 'return {"error"'] },
    },
    {
      title: '5 · Ejecución y post-proceso',
      body: 'Con un monto permitido (p. ej. 120 USD del pedido 4513), `before_tool` devuelve `None`, la herramienta corre y `audit_refund` registra la operación y **recorta** la respuesta del ERP a `refund_id` y `status` antes de que vuelva al modelo.',
      flows: ['bt>tool', 'tool>at'],
      data: {
        title: 'tool_response → lo que devuelve after_tool',
        lang: 'json',
        content: json({
          tool_response: { refund_id: 'RF-20931', status: 'emitido', order_id: '4513', amount_usd: 120, card_last4: '4417', erp_trace: 'sap-tx-99172-…' },
          devuelto_al_modelo: { refund_id: 'RF-20931', status: 'emitido' },
        }),
        hl: ['"devuelto_al_modelo"', '"card_last4"'],
      },
      code: { file: 'extra', hl: ['def audit_refund', 'audit_log.info("refund"', 'return {k: tool_response[k]', 'after_tool_callback=audit_refund'] },
    },
    {
      title: '6 · Cierre',
      body: '`after_agent_callback` corre al final de la invocación: buen lugar para métricas de negocio, como cuántos casos necesitaron aprobación. Devuelve `None`; recuerda que en Python devolver contenido aquí **agrega** un evento extra.',
      flows: ['agent>aa'],
      data: {
        title: 'métrica emitida (ilustrativo)',
        lang: 'json',
        content: json({ metric: 'soporte.invocaciones', value: 1, tags: { needs_approval: true } }),
        hl: ['"needs_approval": true'],
      },
      code: { file: 'extra', hl: ['def track_resolution', 'metrics.increment(', 'after_agent_callback=track_resolution'] },
    },
  ],
}
