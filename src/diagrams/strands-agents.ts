import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ────────────────────────────────────────────────────────────────────────────
 * Código reutilizado literalmente de src/content/strands-agents.mdx
 * ──────────────────────────────────────────────────────────────────────────── */

const ORQUESTADOR = `from strands import Agent, tool
from strands_tools import http_request

@tool
def research_assistant(query: str) -> str:
    """Investiga preguntas factuales en fuentes web y devuelve un resumen con enlaces."""
    research_agent = Agent(
        model="global.anthropic.claude-haiku-5-5",   # especialista barato
        system_prompt="Eres un investigador. Cita siempre tus fuentes.",
        tools=[http_request],
        callback_handler=None,                         # sin imprimir el streaming interno
    )
    return str(research_agent(query))

@tool
def report_writer(findings: str) -> str:
    """Convierte hallazgos en un resumen ejecutivo de máximo 200 palabras."""
    return str(Agent(system_prompt="Redactas para gerencia, en español neutro.", callback_handler=None)(findings))

orchestrator = Agent(
    model="global.anthropic.claude-sonnet-5-5",
    system_prompt="Deriva cada parte de la tarea al especialista adecuado y compón la respuesta final.",
    tools=[research_assistant, report_writer],
)
orchestrator("¿Qué factores externos explican la caída de ventas de electrónica en Chile en septiembre?")`

/** Fragmento ilustrativo: un tercer especialista con acceso de solo lectura al DWH vía MCP. */
const SALES_ANALYST = `from strands import Agent, tool
from strands.tools.mcp import MCPClient
from mcp.client.streamable_http import streamablehttp_client

# Servidor MCP de solo lectura sobre el data warehouse (Redshift)
dwh = MCPClient(lambda: streamablehttp_client("https://mcp-gateway.interno/dwh/mcp"))

@tool
def sales_analyst(query: str) -> str:
    """Analiza ventas internas (data warehouse, solo lectura) y devuelve hallazgos con cifras.

    Args:
        query: Pregunta de negocio, p. ej. "electrónica septiembre vs agosto por tienda".
    """
    analyst = Agent(
        model="global.anthropic.claude-haiku-5-5",
        system_prompt="Eres analista de BI retail. Consulta el DWH y resume en 5 viñetas con cifras. Sin filas crudas.",
        tools=[dwh],                 # el MCPClient va directo en tools
        callback_handler=None,
    )
    return str(analyst(query))       # el orquestador recibe texto, no filas

# orchestrator = Agent(..., tools=[sales_analyst, research_assistant, report_writer])`

const SWARM = `from strands import Agent
from strands.multiagent import Swarm

triage = Agent(name="triage", system_prompt="Clasificas incidentes y los entregas al especialista correcto.")
logs = Agent(name="logs", system_prompt="Analizas logs y métricas para encontrar la causa raíz.")
deploy = Agent(name="deploy", system_prompt="Revisas despliegues recientes y propones rollback si aplica.")
comms = Agent(name="comms", system_prompt="Redactas la actualización para la status page.")

swarm = Swarm(
    [triage, logs, deploy, comms],
    entry_point=triage,
    max_handoffs=20,
    max_iterations=20,
    execution_timeout=900.0,                 # 15 minutos en total
    node_timeout=300.0,                      # 5 minutos por agente
    repetitive_handoff_detection_window=8,   # corta el ping-pong entre agentes
    repetitive_handoff_min_unique_agents=3,
)
result = swarm("El checkout devuelve 502 desde el despliegue de las 10:00")
print(result.status, [n.node_id for n in result.node_history])`

const MAIN = `from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent
from soporte_agent import get_order_status

app = BedrockAgentCoreApp()
agent = Agent(
    model="global.anthropic.claude-sonnet-5-5",
    system_prompt="Eres el agente de soporte de una tienda online.",
    tools=[get_order_status],
)

@app.entrypoint
def invoke(payload):
    """Contrato de AgentCore: HTTP 8080, POST /invocations con un JSON arbitrario."""
    result = agent(payload.get("prompt", ""))
    return {"result": str(result)}

if __name__ == "__main__":
    app.run()   # local: mismo contrato que en la nube`

const TELEMETRIA = `import os
from strands import Agent
from strands.telemetry import StrandsTelemetry

os.environ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://localhost:4318"   # collector OTLP (Langfuse, Jaeger…)
telemetry = StrandsTelemetry()
telemetry.setup_otlp_exporter()      # envía spans al collector
# telemetry.setup_console_exporter() # útil en desarrollo

agent = Agent(
    model="global.anthropic.claude-sonnet-5-5",
    trace_attributes={"session.id": "sess-4512", "user.id": "cliente-881", "app": "soporte"},
)`

/* ────────────────────────────────────────────────────────────────────────────
 * Datos: agent.messages en formato Bedrock Converse (toolUse / toolResult)
 * ──────────────────────────────────────────────────────────────────────────── */

const Q = '¿Qué factores externos explican la caída de ventas de electrónica en Chile en septiembre?'
const MSG_USER = { role: 'user', content: [{ text: Q }] }
const MSG_CALL_SALES = {
  role: 'assistant',
  content: [
    { text: 'Primero cuantifico la caída con los datos internos.' },
    { toolUse: { toolUseId: 'tooluse_01', name: 'sales_analyst', input: { query: 'Electrónica septiembre vs agosto 2026, por tienda y categoría' } } },
  ],
}
const MSG_RES_SALES = {
  role: 'user',
  content: [
    {
      toolResult: {
        toolUseId: 'tooluse_01',
        status: 'success',
        content: [{ text: '• Electrónica −18 % vs agosto. • 70 % de la caída en notebooks y TV. • Providencia −31 %, peor tienda. • Ticket promedio estable: cae el tráfico, no el gasto.' }],
      },
    },
  ],
}
const MSG_CALL_RES = {
  role: 'assistant',
  content: [{ toolUse: { toolUseId: 'tooluse_02', name: 'research_assistant', input: { query: 'Factores externos sept 2026 Chile: consumo, tipo de cambio, eventos que afecten retail de electrónica' } } }],
}
const MSG_RES_RES = {
  role: 'user',
  content: [
    {
      toolResult: {
        toolUseId: 'tooluse_02',
        status: 'success',
        content: [{ text: 'Fiestas Patrias desplazaron gasto a alimentos y viajes; alza del dólar encareció importados; obras viales cerca de la tienda Providencia (fuentes: 3 enlaces).' }],
      },
    },
  ],
}

export const strandsAgentsAsTools: IsoSpec = {
  id: 'strands-agents-as-tools',
  title: 'Agents as Tools: orquestador y especialistas',
  summary:
    'En el patrón **Agents as Tools** cada especialista es un agente Strands envuelto en una función `@tool`. El orquestador lo ve como cualquier otra herramienta: el modelo decide a cuál llamar, con qué consulta y cuándo terminar, y **conserva el control** para componer la respuesta final. En **Datos** ves `orchestrator.messages` en formato Bedrock Converse (`toolUse`/`toolResult`): cada especialista aporta un solo resultado de texto, nunca su conversación interna. En **Código**, `orquestador.py` del artículo y un tercer especialista ilustrativo.',
  height: 480,
  nodes: [
    { id: 'user', label: 'Analista comercial', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pregunta: *"¿Qué factores externos explican la caída de ventas de electrónica en Chile en septiembre?"* y quiere un resumen para gerencia.' },
    { id: 'orch', label: 'Orquestador', sub: 'Agent(tools=[...])', at: [3.2, 0], shape: 'tall', tone: 'agent', icon: 'router', info: 'Un `Agent` cuyo `system_prompt` describe cómo derivar. Sus herramientas son funciones `@tool` que internamente crean y llaman a otros agentes.' },
    { id: 'model', label: 'Claude en Bedrock', sub: 'global.…sonnet-5-5', at: [3.2, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'El proveedor por defecto de Strands es Amazon Bedrock. Cada agente puede usar un modelo distinto: el orquestador Sonnet, los especialistas Haiku, más barato.' },
    { id: 'research', label: 'Investigador', sub: '@tool research_assistant', at: [6.8, -3.4], shape: 'tall', tone: 'agent', icon: 'search', scale: 0.85, info: 'Agente especialista con la herramienta comunitaria `http_request` (de `strands_tools`). Devuelve un resumen con enlaces.' },
    { id: 'data', label: 'Analista de datos', sub: '@tool sales_analyst', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'chart', scale: 0.85, info: 'Especialista ilustrativo con acceso de solo lectura al data warehouse vía `MCPClient`. Consulta y resume: el orquestador recibe 5 viñetas, no filas.' },
    { id: 'writer', label: 'Redactor', sub: '@tool report_writer', at: [6.8, 3.4], shape: 'tall', tone: 'agent', icon: 'file', scale: 0.85, info: 'Especialista sin herramientas externas: transforma hallazgos en un resumen ejecutivo de máximo 200 palabras.' },
    { id: 'web', label: 'Fuentes web', sub: 'http_request', at: [10.2, -3.4], shape: 'cloud', tone: 'neutral', icon: 'globe', info: 'Noticias y datos públicos que el investigador consulta con `http_request`. Solo el investigador tiene esta herramienta.' },
    { id: 'dwh', label: 'Data warehouse', sub: 'Redshift vía MCP', at: [10.2, 0], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Datos de ventas. El especialista accede con credenciales de solo lectura a través de un servidor MCP: el orquestador nunca toca la base directamente.' },
  ],
  edges: [
    { from: 'user', to: 'orch' },
    { from: 'orch', to: 'model', route: 'z' },
    { from: 'orch', to: 'research', route: 'z' },
    { from: 'orch', to: 'data' },
    { from: 'orch', to: 'writer', route: 'z' },
    { from: 'research', to: 'web' },
    { from: 'data', to: 'dwh' },
  ],
  code: {
    orq: { title: 'orquestador.py', lang: 'python', source: ORQUESTADOR },
    analyst: { title: 'sales_analyst.py (ilustrativo)', lang: 'python', source: SALES_ANALYST },
  },
  steps: [
    {
      title: '1 · Objetivo',
      body: 'Llamar al agente (`orchestrator("…")`) arranca el loop completo. El historial empieza con un único mensaje `user`; Strands lo guarda en `orchestrator.messages` (el agente es *stateful*).',
      flows: ['user>orch'],
      data: { title: 'orchestrator.messages', lang: 'json', content: json([MSG_USER]), hl: ['"role": "user"'] },
      code: { file: 'orq', hl: ['orchestrator = Agent(', 'system_prompt="Deriva cada parte', 'orchestrator("¿Qué factores'] },
    },
    {
      title: '2 · El modelo ve a los especialistas como tools',
      body: '`@tool` convierte firma y docstring en una `toolSpec`. Para el modelo, `research_assistant` es solo una herramienta con un parámetro `query`: **la descripción es el criterio de enrutamiento**. Con eso decide empezar por los datos internos.',
      flows: ['orch>model', 'model>orch'],
      data: {
        title: 'toolConfig enviado a Bedrock Converse (2 de 3 tools)',
        lang: 'json',
        content: json({
          tools: [
            { toolSpec: { name: 'sales_analyst', description: 'Analiza ventas internas (data warehouse, solo lectura) y devuelve hallazgos con cifras.', inputSchema: { json: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } } },
            { toolSpec: { name: 'research_assistant', description: 'Investiga preguntas factuales en fuentes web y devuelve un resumen con enlaces.', inputSchema: { json: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } } },
          ],
        }),
        hl: ['"toolSpec"', '"description"'],
      },
      code: { file: 'orq', hl: ['@tool', 'def research_assistant(query: str) -> str:', '"""Investiga preguntas factuales', 'tools=[research_assistant, report_writer]'] },
    },
    {
      title: '3 · Especialista de datos',
      body: 'El modelo emite un `toolUse` a `sales_analyst`. Strands ejecuta la función, que crea **otro** `Agent` con su propio contexto y el `MCPClient` del warehouse. Ese agente puede hacer diez consultas SQL; al orquestador solo vuelve un `toolResult` con 5 viñetas.',
      flows: ['orch>data', 'data>dwh', 'dwh>data', 'data>orch'],
      data: { title: 'orchestrator.messages', lang: 'json', content: json([MSG_USER, MSG_CALL_SALES, MSG_RES_SALES]), hl: ['"toolUse"', '"toolResult"', '"name": "sales_analyst"'] },
      code: { file: 'analyst', hl: ['dwh = MCPClient(', 'def sales_analyst', 'analyst = Agent(', 'tools=[dwh]', 'return str(analyst(query))'] },
    },
    {
      title: '4 · Contexto externo',
      body: 'Con la caída cuantificada, el modelo pide al investigador los factores externos. `research_agent` usa Haiku y `http_request`; `callback_handler=None` evita que su streaming interno se mezcle con el del orquestador.',
      flows: ['orch>research', 'research>web', 'web>research', 'research>orch'],
      data: { title: 'orchestrator.messages (nuevos)', lang: 'json', content: json([MSG_CALL_RES, MSG_RES_RES]), hl: ['"name": "research_assistant"', '"toolResult"'] },
      code: { file: 'orq', hl: ['research_agent = Agent(', 'model="global.anthropic.claude-haiku-5-5"', 'tools=[http_request]', 'callback_handler=None,', 'return str(research_agent(query))'] },
    },
    {
      title: '5 · Redacción',
      body: 'El orquestador pasa al redactor **solo los hallazgos** (no las conversaciones de los especialistas). Cada especialista tuvo un contexto limpio y acotado, y se puede evaluar por separado.',
      flows: ['orch>writer', 'writer>orch'],
      data: {
        title: 'orchestrator.messages (nuevos)',
        lang: 'json',
        content: json([
          { role: 'assistant', content: [{ toolUse: { toolUseId: 'tooluse_03', name: 'report_writer', input: { findings: 'Electrónica −18 % (Providencia −31 %), cae el tráfico. Causas: Fiestas Patrias, alza del dólar, obras viales en Providencia.' } } }] },
          { role: 'user', content: [{ toolResult: { toolUseId: 'tooluse_03', status: 'success', content: [{ text: 'Resumen ejecutivo (172 palabras): En septiembre, las ventas de electrónica cayeron 18 %…' }] } }] },
        ]),
        hl: ['"findings"', '"toolResult"'],
      },
      code: { file: 'orq', hl: ['def report_writer(findings: str)', 'return str(Agent(system_prompt="Redactas para gerencia'] },
    },
    {
      title: '6 · Respuesta y costo',
      body: 'El modelo responde sin pedir más tools (`stop_reason: "end_turn"`) y la llamada devuelve un `AgentResult`. Ojo: sus métricas cuentan **solo** los tokens del orquestador; cada especialista consumió los suyos en su propio `Agent`. Mayor costo total que un agente único, a cambio de contextos pequeños.',
      flows: ['orch>user'],
      data: {
        title: 'AgentResult (forma simplificada)',
        lang: 'json',
        content: json({
          stop_reason: 'end_turn',
          message: { role: 'assistant', content: [{ text: 'La caída de 18 % se explica por tres factores externos… (resumen para gerencia adjunto)' }] },
          metrics: { cycle_count: 4, accumulated_usage: { inputTokens: 9120, outputTokens: 1310, totalTokens: 10430 } },
        }),
        hl: ['"stop_reason": "end_turn"', '"accumulated_usage"'],
      },
      code: { file: 'orq', hl: ['orchestrator("¿Qué factores'] },
    },
  ],
}

const TASK = 'El checkout devuelve 502 desde el despliegue de las 10:00'

export const strandsSwarm: IsoSpec = {
  id: 'strands-swarm',
  title: 'Swarm: handoffs entre agentes',
  summary:
    'En un **Swarm** no hay jefe: los agentes se pasan la tarea entre sí con la herramienta `handoff_to_agent`, que Strands inyecta automáticamente en cada uno. Cada agente recibe la tarea original, la lista de quién ya intervino y el **conocimiento compartido** que dejaron los anteriores. El diagrama de secuencia muestra los handoffs en orden; en **Datos**, los `toolUse` de handoff y el `SwarmResult`; en **Código**, `swarm_incidentes.py` del artículo.',
  height: 470,
  layout: 'sequence',
  lanes: ['user', 'triage', 'logs', 'deploy', 'comms', 'shared'],
  zones: [{ id: 'swarm', label: 'Swarm (max_handoffs=20)', from: [1.8, -4.8], to: [11.6, 4.9], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Equipo de TI', at: [-1.4, 0], shape: 'person', tone: 'user', icon: 'users', info: 'Reporta: *"El checkout devuelve 502 desde el despliegue de las 10:00"*.' },
    { id: 'triage', label: 'Triage', sub: 'entry_point', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'filter', info: 'Primer agente del swarm (`entry_point=triage`). Clasifica el incidente y decide a quién entregarlo.' },
    { id: 'logs', label: 'Analista de logs', sub: 'logs y métricas', at: [6.8, -3.2], shape: 'tall', tone: 'agent', icon: 'search', info: 'Especialista en logs y métricas (en producción, con herramientas de lectura, p. ej. un servidor MCP de CloudWatch). Identifica el patrón de error y la hora de inicio.' },
    { id: 'deploy', label: 'Ingeniero deploy', sub: 'despliegues', at: [10.2, 0], shape: 'tall', tone: 'agent', icon: 'code', info: 'Revisa el despliegue reciente y propone rollback. La ejecución del rollback debería requerir aprobación humana.' },
    { id: 'comms', label: 'Comunicaciones', sub: 'status page', at: [6.8, 3.2], shape: 'tall', tone: 'agent', icon: 'message', info: 'Redacta la actualización para la status page con el diagnóstico consolidado. Como no hace handoff, el swarm considera la tarea terminada.' },
    { id: 'shared', label: 'Contexto compartido', sub: 'historial + knowledge', at: [3.4, 3.6], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Lo arma el Swarm: la tarea original, la lista de agentes que ya intervinieron y el `context` que cada uno dejó al hacer handoff.' },
  ],
  edges: [
    { from: 'user', to: 'triage' },
    { from: 'triage', to: 'logs', label: 'handoff', route: 'z' },
    { from: 'logs', to: 'deploy', label: 'handoff' },
    { from: 'deploy', to: 'comms', label: 'handoff', route: 'z' },
    { from: 'shared', to: 'triage', dashed: true, route: 'z' },
  ],
  code: { swarm: { title: 'swarm_incidentes.py', lang: 'python', source: SWARM } },
  steps: [
    {
      title: '1 · Entrada al swarm',
      body: 'El incidente entra por el `entry_point`. No hay orquestador central: Triage solo decide **el siguiente** experto. Strands le agregó la herramienta `handoff_to_agent` sin que la declares.',
      flows: [`user>triage: swarm("502 en checkout…")`],
      data: { title: 'tarea original', lang: 'text', content: TASK },
      code: { hl: ['triage = Agent(name="triage"', 'swarm = Swarm(', 'entry_point=triage,', 'result = swarm('] },
    },
    {
      title: '2 · Primer handoff',
      body: 'Triage llama `handoff_to_agent` con el agente destino, un mensaje y un `context` estructurado. El control pasa **por completo** al analista de logs; Triage no vuelve a intervenir salvo que alguien le devuelva el caso.',
      flows: ['triage>logs: handoff_to_agent', 'triage>shared: context'],
      data: {
        title: 'toolUse de Triage',
        lang: 'json',
        content: json({
          toolUse: {
            toolUseId: 'tooluse_h1',
            name: 'handoff_to_agent',
            input: { agent_name: 'logs', message: 'Incidente P1: 502 en checkout desde 10:00. Busca la causa raíz.', context: { servicio: 'checkout', inicio: '10:00', severidad: 'P1' } },
          },
        }),
        hl: ['"handoff_to_agent"', '"agent_name": "logs"', '"context"'],
      },
      code: { hl: ['logs = Agent(name="logs"'] },
    },
    {
      title: '3 · Lo que recibe cada agente',
      body: 'El Swarm arma la entrada del analista: mensaje del handoff, tarea original, agentes previos, conocimiento compartido y los otros agentes disponibles. Por eso no se pierde información entre saltos.',
      flows: ['shared>logs: entrada del nodo'],
      data: {
        title: 'entrada del nodo logs (forma simplificada)',
        lang: 'text',
        content: [
          'Handoff Message: Incidente P1: 502 en checkout desde 10:00. Busca la causa raíz.',
          '',
          `User Request: ${TASK}`,
          '',
          'Previous agents who worked on this: triage',
          '',
          'Shared knowledge from previous agents:',
          '• triage: {"servicio": "checkout", "inicio": "10:00", "severidad": "P1"}',
          '',
          'Other agents available for collaboration: triage, deploy, comms',
        ].join('\n'),
        hl: ['Previous agents', 'Shared knowledge'],
      },
    },
    {
      title: '4 · Diagnóstico y handoff',
      body: 'El analista encuentra timeouts contra el servicio de pagos que empiezan con el deploy de las 10:00 y entrega al ingeniero de despliegue, dejando la evidencia en `context`.',
      flows: ['logs>shared: context', 'logs>deploy: handoff_to_agent'],
      data: {
        title: 'toolUse del analista de logs',
        lang: 'json',
        content: json({
          toolUse: {
            toolUseId: 'tooluse_h2',
            name: 'handoff_to_agent',
            input: { agent_name: 'deploy', message: 'Timeouts checkout→payments desde 10:02, 38 % de requests. Coincide con el deploy v2.41.', context: { causa_probable: 'timeout a payments', version: 'v2.41', error_rate: 0.38 } },
          },
        }),
        hl: ['"agent_name": "deploy"', '"causa_probable"'],
      },
      code: { hl: ['deploy = Agent(name="deploy"'] },
    },
    {
      title: '5 · Propuesta de acción',
      body: 'El ingeniero ve en el diff que el timeout hacia pagos bajó de 5 s a 500 ms y propone rollback a v2.40 (ejecutarlo debería pasar por aprobación humana). Entrega a Comunicaciones para informar.',
      flows: ['deploy>comms: handoff_to_agent'],
      data: {
        title: 'toolUse del ingeniero',
        lang: 'json',
        content: json({
          toolUse: {
            toolUseId: 'tooluse_h3',
            name: 'handoff_to_agent',
            input: { agent_name: 'comms', message: 'Causa: PAYMENTS_TIMEOUT 5s→500ms en v2.41. Propuesta: rollback a v2.40, pendiente de aprobación.', context: { accion_propuesta: 'rollback v2.40', requiere_aprobacion: true } },
          },
        }),
        hl: ['"agent_name": "comms"', '"requiere_aprobacion": true'],
      },
      code: { hl: ['comms = Agent(name="comms"'] },
    },
    {
      title: '6 · Resultado del swarm',
      body: 'Comunicaciones redacta el aviso y **no** hace handoff: el swarm termina. El `SwarmResult` expone `status`, `node_history` (el recorrido completo) y el uso de tokens acumulado de todos los agentes.',
      flows: ['comms>user: SwarmResult'],
      data: {
        title: 'SwarmResult (forma simplificada)',
        lang: 'json',
        content: json({
          status: 'COMPLETED',
          node_history: ['triage', 'logs', 'deploy', 'comms'],
          execution_count: 4,
          accumulated_usage: { inputTokens: 14210, outputTokens: 1880, totalTokens: 16090 },
          results: { comms: { result: 'Status page: Estamos revirtiendo un cambio que provoca errores en el pago. Próxima actualización 11:15.' } },
        }),
        hl: ['"status": "COMPLETED"', '"node_history"'],
      },
      code: { hl: ['print(result.status, [n.node_id for n in result.node_history])'] },
    },
    {
      title: '7 · Límites de seguridad',
      body: 'Sin jefe, nadie garantiza que el swarm termine. `max_handoffs`, `max_iterations`, `execution_timeout`, `node_timeout` y la detección de handoffs repetitivos (una ventana de 8 handoffs con menos de 3 agentes distintos) cortan el ping-pong: el swarm se detiene y lo informa en `status`, en vez de girar toda la noche.',
      focus: ['triage', 'logs', 'deploy', 'comms'],
      data: {
        title: 'límites configurados',
        lang: 'json',
        content: json({ max_handoffs: 20, max_iterations: 20, execution_timeout: 900.0, node_timeout: 300.0, repetitive_handoff_detection_window: 8, repetitive_handoff_min_unique_agents: 3 }),
        hl: ['"repetitive_handoff_detection_window"'],
      },
      code: { hl: ['max_handoffs=20', 'max_iterations=20', 'execution_timeout=900.0', 'node_timeout=300.0', 'repetitive_handoff_detection_window=8', 'repetitive_handoff_min_unique_agents=3'] },
    },
  ],
}

export const strandsAgentcore: IsoSpec = {
  id: 'strands-agentcore',
  title: 'Strands en AgentCore Runtime',
  summary:
    'El camino más directo a producción para Strands en AWS: envuelves el agente con `BedrockAgentCoreApp`, lo despliegas con la CLI `agentcore` y obtienes un runtime serverless con aislamiento por sesión, más Memory, Gateway, Identity y observabilidad OTel. En **Datos** ves lo que viaja en cada etapa (la política IAM, la invocación HTTP, la petición a Bedrock, un span OTel) y en **Código**, `main.py` y `telemetria.py` del artículo.',
  height: 480,
  zones: [{ id: 'aws', label: 'Cuenta AWS', from: [4.8, -5.0], to: [11.8, 4.9], tone: 'infra' }],
  nodes: [
    { id: 'dev', label: 'Desarrollador', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Escribe el agente y lo prueba localmente con `agentcore dev`.' },
    { id: 'cli', label: 'agentcore CLI', sub: 'create · dev · deploy', at: [3.0, 0], shape: 'box', tone: 'infra', icon: 'terminal', info: 'CLI v1.0 (`@aws/agentcore`, octubre de 2026): `agentcore create` genera el proyecto, `dev` lo corre local, `deploy` lo publica e `invoke` lo prueba. No la mezcles con el *starter toolkit* anterior (`configure`/`launch`).' },
    { id: 'app', label: 'App cliente', sub: 'InvokeAgentRuntime', at: [3.0, -3.4], shape: 'box', tone: 'user', icon: 'globe', info: 'Tu frontend o backend invoca el agente desplegado por su ARN, con un ID de sesión por conversación (encabezado `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id`).' },
    { id: 'runtime', label: 'Agente Strands', sub: 'AgentCore Runtime', at: [6.6, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Tu código con `BedrockAgentCoreApp` + `@app.entrypoint`, servido en HTTP 8080 `/invocations` (y `/ping`). Cada sesión corre aislada en una microVM.' },
    { id: 'model', label: 'Bedrock', sub: 'Claude · perfil global', at: [6.6, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Modelo por defecto de Strands. El rol de ejecución del runtime necesita permisos sobre el perfil de inferencia y los modelos destino.' },
    { id: 'gateway', label: 'AgentCore Gateway', sub: 'tools MCP', at: [10, -3.4], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Convierte APIs, Lambdas y servidores MCP en herramientas MCP con autenticación unificada y políticas por llamada. Strands lo consume con `MCPClient`.' },
    { id: 'memory', label: 'AgentCore Memory', sub: 'corto y largo plazo', at: [10, 0], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Memoria gestionada: eventos de la sesión y extracción de hechos/preferencias de largo plazo, compartible entre agentes. Strands la usa a través de su integración de session manager.' },
    { id: 'obs', label: 'Observabilidad', sub: 'OTel → CloudWatch', at: [6.6, 3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'Strands emite spans OpenTelemetry (ciclo del agente, llamadas al modelo, herramientas). En AgentCore se ven en CloudWatch; fuera, en Langfuse o cualquier backend OTLP.' },
  ],
  edges: [
    { from: 'dev', to: 'cli' },
    { from: 'cli', to: 'runtime', label: 'deploy' },
    { from: 'app', to: 'runtime', route: 'x' },
    { from: 'runtime', to: 'model', route: 'z' },
    { from: 'runtime', to: 'gateway', route: 'z' },
    { from: 'runtime', to: 'memory' },
    { from: 'runtime', to: 'obs', dashed: true, route: 'z' },
  ],
  code: {
    main: { title: 'main.py', lang: 'python', source: MAIN },
    tel: { title: 'telemetria.py', lang: 'python', source: TELEMETRIA },
  },
  steps: [
    {
      title: '1 · Desarrollo local',
      body: 'El agente se escribe como siempre (`Agent`, `@tool`) y se envuelve con `BedrockAgentCoreApp`. `agentcore dev` lo sirve localmente con **el mismo contrato** que en la nube: `POST /invocations` en el puerto 8080 con un JSON arbitrario.',
      flows: ['dev>cli'],
      data: {
        title: 'prueba local del contrato',
        lang: 'bash',
        content: [
          'agentcore create        # genera proyecto, dependencias y configuración',
          'agentcore dev           # sirve el agente en localhost:8080',
          '',
          'curl -X POST http://localhost:8080/invocations \\',
          '  -H "Content-Type: application/json" \\',
          `  -d '{"prompt": "¿Por qué no ha llegado mi pedido 4512?"}'`,
        ].join('\n'),
        hl: ['/invocations'],
      },
      code: { file: 'main', hl: ['app = BedrockAgentCoreApp()', '@app.entrypoint', 'app.run()'] },
    },
    {
      title: '2 · Despliegue',
      body: '`agentcore deploy` empaqueta (CodeZip o contenedor), crea el runtime y su **rol de ejecución**. No gestionas servidores ni escalado, pero sí los permisos: el rol necesita invocar el perfil de inferencia **y** los modelos destino en las regiones a las que enruta.',
      flows: ['cli>runtime'],
      data: {
        title: 'política del rol de ejecución (extracto)',
        lang: 'json',
        content: json({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
              Resource: ['arn:aws:bedrock:*:123456789012:inference-profile/global.anthropic.claude-sonnet-5-5', 'arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-5-5'],
            },
          ],
        }),
        hl: ['"bedrock:InvokeModel"', 'inference-profile', 'foundation-model'],
      },
      code: { file: 'main', hl: ['model="global.anthropic.claude-sonnet-5-5"'] },
    },
    {
      title: '3 · Invocación',
      body: 'La app cliente invoca el runtime por su ARN con un ID de sesión. AgentCore enruta cada sesión a su propia microVM aislada y entrega el cuerpo a tu función `invoke(payload)`.',
      flows: ['app>runtime'],
      data: {
        title: 'InvokeAgentRuntime (forma simplificada)',
        lang: 'http',
        content: [
          'POST /runtimes/arn%3Aaws%3Abedrock-agentcore%3A…%3Aruntime%2Fsoporte-XyZ/invocations HTTP/1.1',
          'Host: bedrock-agentcore.us-east-1.amazonaws.com',
          'Authorization: Bearer eyJraWQiOi…',
          'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: cliente-881-4512-0b6f2c9e-7d1a-4c3e',
          'Content-Type: application/json',
          '',
          '{"prompt": "¿Por qué no ha llegado mi pedido 4512?"}',
        ].join('\n'),
        hl: ['Runtime-Session-Id', '"prompt"'],
      },
      code: { file: 'main', hl: ['def invoke(payload):', 'payload.get("prompt", "")'] },
    },
    {
      title: '4 · Modelo y herramientas',
      body: 'El loop de Strands llama a Claude en Bedrock (Converse) con las herramientas declaradas; el modelo pide `get_order_status` y Strands la ejecuta. Herramientas corporativas adicionales llegarían por AgentCore Gateway como MCP, con autenticación y políticas por llamada.',
      flows: ['runtime>model', 'model>runtime', 'runtime>gateway', 'gateway>runtime'],
      data: {
        title: 'Bedrock Converse · petición (extracto)',
        lang: 'json',
        content: json({
          modelId: 'global.anthropic.claude-sonnet-5-5',
          system: [{ text: 'Eres el agente de soporte de una tienda online.' }],
          messages: [{ role: 'user', content: [{ text: '¿Por qué no ha llegado mi pedido 4512?' }] }],
          toolConfig: { tools: [{ toolSpec: { name: 'get_order_status', description: 'Consulta el estado logístico de un pedido en el ERP.', inputSchema: { json: { type: 'object', properties: { order_id: { type: 'string' } }, required: ['order_id'] } } } }] },
        }),
        hl: ['"modelId"', '"toolSpec"'],
      },
      code: { file: 'main', hl: ['agent = Agent(', 'tools=[get_order_status]', 'result = agent(payload.get("prompt", ""))'] },
    },
    {
      title: '5 · Memoria',
      body: 'El agente de `main.py` guarda el historial en `agent.messages`, pero **dentro de la microVM de esa sesión**. Para que una sesión nueva recuerde lo relevante (canal preferido, pedidos anteriores), conecta AgentCore Memory a través de un session manager de Strands en vez de depender del proceso.',
      flows: ['runtime>memory', 'memory>runtime'],
      code: { file: 'main', hl: ['agent = Agent('] },
    },
    {
      title: '6 · Respuesta',
      body: 'Lo que devuelve `invoke` es el cuerpo de la respuesta HTTP: tu contrato, no uno impuesto. `str(result)` convierte el `AgentResult` en el texto final.',
      flows: ['runtime>app'],
      data: {
        title: 'respuesta de /invocations',
        lang: 'json',
        content: json({ result: 'Tu pedido 4512 viene retrasado: la nueva fecha estimada de entrega es el 4 de noviembre.' }),
        hl: ['"result"'],
      },
      code: { file: 'main', hl: ['return {"result": str(result)}'] },
    },
    {
      title: '7 · Trazas',
      body: 'Strands emite un span por invocación, por ciclo del loop, por llamada al modelo y por herramienta, con atributos `gen_ai.*`. Los `trace_attributes` viajan en cada span y permiten filtrar por sesión, cliente o app en CloudWatch o Langfuse.',
      flows: ['runtime>obs'],
      data: {
        title: 'span OTel de la llamada al modelo (forma simplificada)',
        lang: 'json',
        content: json({
          name: 'chat',
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.request.model': 'global.anthropic.claude-sonnet-5-5',
            'gen_ai.usage.input_tokens': 812,
            'gen_ai.usage.output_tokens': 64,
            'session.id': 'sess-4512',
            'user.id': 'cliente-881',
            app: 'soporte',
          },
        }),
        hl: ['"gen_ai.usage.input_tokens"', '"session.id"'],
      },
      code: { file: 'tel', hl: ['telemetry = StrandsTelemetry()', 'telemetry.setup_otlp_exporter()', 'trace_attributes='] },
    },
  ],
}
