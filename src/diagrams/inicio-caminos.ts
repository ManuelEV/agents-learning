import type { ApiMessage, IsoSpec } from '../components/iso/types'

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

/* ───────────────────────── Cinco niveles de abstracción ───────────────────────── */

/** Bloque `converse_loop.py` de "¿Qué es un agente?" (nivel 1: API directa). */
const CONVERSE = `import boto3

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
tool_config = {"tools": [{"toolSpec": {
    "name": "get_order_status",
    "description": "Devuelve el estado logístico de un pedido.",
    "inputSchema": {"json": {"type": "object",
        "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]}},
}}]}

messages = [{"role": "user", "content": [{"text": "¿Estado del pedido 4512?"}]}]
resp = bedrock.converse(modelId="global.anthropic.claude-sonnet-5-5",
                        messages=messages, toolConfig=tool_config)
# Si resp["stopReason"] == "tool_use": ejecutar la herramienta, agregar un
# bloque {"toolResult": ...} a messages y volver a llamar a converse().`

/** Bloque `strands_agent.py` de "¿Qué es un agente?" (nivel 2: framework). */
const STRANDS = `from strands import Agent, tool

@tool
def get_order_status(order_id: str) -> dict:
    """Devuelve el estado logístico de un pedido."""
    return {"order_id": order_id, "status": "retrasado", "eta": "2026-11-04"}

agent = Agent(
    model="global.anthropic.claude-sonnet-5-5",   # perfil de inferencia de Bedrock
    system_prompt="Ayudas a resolver dudas sobre pedidos. No inventes datos.",
    tools=[get_order_status],
)
agent("¿En qué estado está el pedido 4512?")`

/** Bloque `app/agent/main.py` (Strands) de "AWS Bedrock y AgentCore" (nivel 4: plataforma). */
const AGENTCORE = `from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent, tool

@tool
def consultar_pedido(order_id: str) -> dict:
    """Devuelve estado y fecha estimada de un pedido."""
    return {"order_id": order_id, "estado": "en ruta", "eta": "2026-11-04"}

agent = Agent(
    model="global.anthropic.claude-sonnet-5-5",
    system_prompt="Atiendes consultas de pedidos. No inventes datos.",
    tools=[consultar_pedido],
)
app = BedrockAgentCoreApp()

@app.entrypoint
def invoke(payload):
    return {"result": str(agent(payload.get("prompt")))}

if __name__ == "__main__":
    app.run()`

const REVISOR = `# revisor.py · Claude Agent SDK (de "Otros frameworks")
async for message in query(
    prompt="Revisa el módulo de pagos en busca de problemas de seguridad",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Grep", "Glob", "Agent"],   # sin Bash ni Edit: solo lectura
        agents={"security-reviewer": AgentDefinition(
            description="Experto en revisión de seguridad (OWASP).",
            prompt="Eres un revisor de seguridad. Reporta hallazgos con archivo y línea.",
            tools=["Read", "Grep", "Glob"], model="sonnet")},
    ),
):
    if hasattr(message, "result"):
        print(message.result)
# No escribiste el loop, ni las herramientas de archivos, ni la compactación:
# configuras herramientas permitidas, subagentes y permisos.`

const STRANDS_HIST: ApiMessage[] = [
  { role: 'user', content: '¿En qué estado está el pedido 4512?' },
  { role: 'assistant', note: 'Strands llama a Bedrock', content: [{ type: 'tool_use', id: 'tooluse_01', name: 'get_order_status', input: { order_id: '4512' } }] },
  { role: 'user', note: 'Strands ejecuta la tool', content: [{ type: 'tool_result', tool_use_id: 'tooluse_01', content: { order_id: '4512', status: 'retrasado', eta: '2026-11-04' } }] },
  { role: 'assistant', note: 'end_turn', content: [{ type: 'text', text: 'El pedido 4512 está retrasado; la nueva fecha estimada es el 4 de noviembre.' }] },
]

export const caminos: IsoSpec = {
  id: 'panorama-caminos',
  title: 'Cinco niveles de abstracción para construir un agente',
  summary:
    'Cuanto más subes en la escalera, **menos código** escribes y **más rápido** llegas a producción, a cambio de **menos control** y más dependencia del proveedor. El mismo caso (consultar el pedido 4512) se ve muy distinto en cada nivel: compara en la pestaña Código cuánto escribes tú y en Datos qué te devuelve cada capa. No es una elección única: muchas empresas combinan niveles (p. ej. un framework OSS desplegado en una plataforma gestionada).',
  height: 480,
  nodes: [
    { id: 'api', label: 'API del modelo', sub: 'Converse · Messages', at: [0, 0], shape: 'box', tone: 'model', icon: 'code', info: 'Llamadas directas al modelo con tool calling. Control total; todo lo demás lo construyes tú (loop, memoria, reintentos, trazas). Ideal para aprender y para casos muy acotados.' },
    { id: 'fw', label: 'Framework OSS', sub: 'ADK · Strands · LangGraph', at: [3, -3], elevation: 0.6, shape: 'tall', tone: 'agent', icon: 'boxes', info: 'Bibliotecas que implementan el loop, multiagente, sesiones, callbacks y conectores (MCP, A2A). Portables entre nubes. El punto de equilibrio más común en empresas.' },
    { id: 'harness', label: 'Harness listo', sub: 'Claude Agent SDK', at: [6, -6], elevation: 1.2, shape: 'tall', tone: 'agent', icon: 'terminal', info: 'Agentes de propósito general ya afinados (gestión de contexto, compactación, herramientas de archivos/terminal, subagentes). Configuras herramientas y permisos en lugar de escribir el loop.' },
    { id: 'platform', label: 'Plataforma gestionada', sub: 'AgentCore · Foundry', at: [9, -9], elevation: 1.8, shape: 'cloud', tone: 'infra', icon: 'cloud', info: 'Runtime, memoria, identidad, gateway de herramientas, evaluación y observabilidad como servicio (Bedrock AgentCore, Gemini Enterprise Agent Platform, Microsoft Foundry). Suelen aceptar cualquier framework.' },
    { id: 'saas', label: 'Agentes SaaS', sub: 'Gemini Ent. · Copilot', at: [12, -12], elevation: 2.4, shape: 'person', tone: 'user', icon: 'users', info: 'Productos para usuarios finales donde se configuran agentes con conectores y prompts. Máxima velocidad, mínimo control; útiles para productividad interna, no para lógica de negocio crítica.' },
  ],
  edges: [
    { from: 'api', to: 'fw', route: 'arc' },
    { from: 'fw', to: 'harness', route: 'arc' },
    { from: 'harness', to: 'platform', route: 'arc' },
    { from: 'platform', to: 'saas', route: 'arc' },
  ],
  code: {
    api: { title: 'converse_loop.py', lang: 'python', source: CONVERSE },
    fw: { title: 'strands_agent.py', lang: 'python', source: STRANDS },
    rt: { title: 'app/agent/main.py', lang: 'python', source: AGENTCORE },
  },
  steps: [
    {
      title: 'Nivel 1 · API directa',
      body: 'Llamas a Bedrock **Converse** con `toolConfig`. La API solo te devuelve una *solicitud* de herramienta (`stopReason: "tool_use"`): ejecutarla, agregar el `toolResult` y volver a llamar es trabajo tuyo, igual que la memoria, los reintentos, las trazas y la seguridad.',
      focus: ['api'],
      data: {
        title: 'respuesta de bedrock.converse()',
        lang: 'json',
        content: jsonc({
          output: { message: { role: 'assistant', content: [{ toolUse: { toolUseId: 'tooluse_01', name: 'get_order_status', input: { order_id: '4512' } } }] } },
          stopReason: 'tool_use',
          usage: { inputTokens: 412, outputTokens: 58, totalTokens: 470 },
        }),
        hl: ['"toolUse"', '"stopReason"'],
      },
      code: { file: 'api', hl: ['tool_config = {"tools"', 'resp = bedrock.converse(', '# Si resp["stopReason"] == "tool_use"'] },
    },
    {
      title: 'Nivel 2 · Framework open source',
      body: 'Con Strands, una función con `@tool` **es** la herramienta (el esquema sale de la firma y el docstring) y `agent(...)` ejecuta el loop completo: las 2 llamadas al modelo y la ejecución de la tool. Sigue siendo código tuyo, versionado y testeable, desplegable donde quieras.',
      flows: ['api>fw'],
      data: { title: 'historial que Strands gestiona por ti (bloques equivalentes a toolUse/toolResult)', messages: STRANDS_HIST, newFrom: 1 },
      code: { file: 'fw', hl: ['@tool', 'def get_order_status', 'agent = Agent(', 'agent("¿En qué estado'] },
    },
    {
      title: 'Nivel 3 · Harness de propósito general',
      body: 'En vez de escribir el loop, configuras un agente ya afinado: el **Claude Agent SDK** (el motor de Claude Code), **Strands Harness** o **AgentCore Harness**. Traen herramientas de archivos y terminal, compactación y subagentes. Muy productivo para agentes que operan sobre archivos, código o terminal.',
      flows: ['fw>harness'],
      data: { title: 'revisor.py (extracto de "Otros frameworks")', lang: 'python', content: REVISOR, hl: ['allowed_tools=', 'agents={"security-reviewer"'] },
    },
    {
      title: 'Nivel 4 · Plataforma gestionada',
      body: '**Bedrock AgentCore**, **Gemini Enterprise Agent Platform** o **Microsoft Foundry** resuelven la operación: aislamiento por sesión, identidad, memoria, gateway de herramientas, políticas y evaluación. Normalmente ejecutan **tu framework del nivel 2**: aquí, el mismo agente Strands envuelto con `BedrockAgentCoreApp`.',
      flows: ['harness>platform'],
      data: {
        title: 'terminal · AgentCore CLI (oct. 2026)',
        lang: 'bash',
        content: `npm install -g @aws/agentcore
agentcore create --name SoporteRetail --template agent-python-strands
agentcore dev --mode browser      # Runtime local con hot reload
agentcore deploy                  # CDK: Runtime + endpoints + CloudWatch
agentcore invoke --runtime agent --payload '{"prompt":"¿Dónde está mi pedido 4512?"}'`,
        hl: ['agentcore deploy', 'agentcore invoke'],
      },
      code: { file: 'rt', hl: ['BedrockAgentCoreApp', '@app.entrypoint', 'def invoke(payload)'] },
    },
    {
      title: 'Nivel 5 · Agentes SaaS',
      body: 'Productos como **Gemini Enterprise** o Microsoft Copilot permiten que equipos de negocio armen agentes con conectores y un prompt, sin código. Rápido, pero con poco control sobre el razonamiento, la evaluación y la integración.',
      flows: ['platform>saas'],
      data: {
        title: 'lo que se configura en un agente SaaS (ilustrativo)',
        lang: 'yaml',
        content: `# Se configura en una consola web, no se programa
nombre: Asistente de ventas
instrucciones: >
  Responde preguntas sobre el catálogo y el estado de pedidos.
  Si no sabes, deriva al equipo de postventa.
conectores: [drive_corporativo, crm, correo]
publicado_en: [chat corporativo]
# Sin control del loop, de los evals ni del despliegue`,
        hl: ['instrucciones:', 'conectores:'],
      },
    },
    {
      title: 'La combinación típica en empresa',
      body: 'Framework OSS (nivel 2) **desplegado** en una plataforma gestionada (nivel 4), con modelos detrás de un **AI gateway** y herramientas expuestas por **MCP**. El código del agente sigue siendo tuyo y portable; la operación la pone el proveedor. Es el patrón de la arquitectura de referencia de esta guía.',
      focus: ['fw', 'platform'],
      data: {
        title: 'stack resultante (ilustrativo)',
        lang: 'yaml',
        content: `agente:        Strands Agents (código propio, en git)       # nivel 2
runtime:       AgentCore Runtime (microVM por sesión)       # nivel 4
modelos:       AI gateway → bedrock/global.anthropic.claude-sonnet-5-5
herramientas:  servidores MCP detrás de AgentCore Gateway
memoria:       AgentCore Memory
trazas:        OpenTelemetry → CloudWatch / Langfuse
evals:         suite de regresión en CI + evals online`,
        hl: ['agente:', 'runtime:'],
      },
      code: { file: 'rt', hl: ['agent = Agent(', 'app = BedrockAgentCoreApp()'] },
    },
  ],
}

/* ─────────────────────── Proyecto integrador de la ruta ─────────────────────── */

const CLASIFICADOR = `import boto3
from typing import Literal
from pydantic import BaseModel, ValidationError

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

class Clasificacion(BaseModel):
    categoria: Literal["logistica", "stock", "pagos", "otro"]
    urgencia: Literal["baja", "media", "alta"]
    resumen: str

TOOL = {"toolSpec": {"name": "clasificar", "description": "Clasifica un ticket de operaciones.",
        "inputSchema": {"json": Clasificacion.model_json_schema()}}}

def clasificar(ticket: str) -> Clasificacion:
    resp = bedrock.converse(
        modelId="global.anthropic.claude-haiku-5-5",          # modelo pequeño: barato
        messages=[{"role": "user", "content": [{"text": ticket}]}],
        toolConfig={"tools": [TOOL], "toolChoice": {"tool": {"name": "clasificar"}}},
        inferenceConfig={"temperature": 0},
    )
    bloque = next(b for b in resp["output"]["message"]["content"] if "toolUse" in b)
    try:
        return Clasificacion.model_validate(bloque["toolUse"]["input"])   # JSON validado
    except ValidationError:
        return Clasificacion(categoria="otro", urgencia="media", resumen=ticket[:120])`

/** Bloque `loop_minimo.py` de "¿Qué es un agente?" (nivel 1). */
const LOOP = `def run_agent(goal: str, tools: dict, max_turns: int = 10) -> str:
    messages = [{"role": "user", "content": goal}]
    for _ in range(max_turns):                       # límite duro de turnos
        response = llm.call(system=INSTRUCTIONS, messages=messages,
                            tools=[t.schema for t in tools.values()])
        messages.append(response.as_message())
        if not response.tool_calls:                  # el modelo terminó
            return response.text
        for call in response.tool_calls:             # el modelo pidió herramientas
            tool = tools[call.name]
            args = tool.validate(call.arguments)     # nunca confíes ciegamente
            result = tool.run(**args)
            messages.append(tool_result(call.id, result))
    raise TurnLimitExceeded("El agente no terminó en el límite de turnos")`

/** Bloque `config.yaml` de "AI gateways" (nivel 4). */
const GATEWAY = `model_list:
  - model_name: claude-sonnet                  # alias que ven los agentes
    litellm_params:
      model: bedrock/global.anthropic.claude-sonnet-5-5   # perfil de inferencia global
      aws_region_name: us-east-1               # credenciales: rol IAM de la tarea ECS
  - model_name: claude-sonnet-eu
    litellm_params:
      model: bedrock/eu.anthropic.claude-sonnet-5-5
      aws_region_name: eu-west-1
      aws_role_name: arn:aws:iam::222233334444:role/litellm-bedrock   # otra cuenta, otra cuota
      aws_session_name: litellm-gw
  - model_name: claude-haiku
    litellm_params:
      model: bedrock/global.anthropic.claude-haiku-5-5

litellm_settings:
  num_retries: 2                               # reintentos sobre el mismo alias

router_settings:
  fallbacks: [{"claude-sonnet": ["claude-sonnet-eu", "claude-haiku"]}]
  allowed_fails: 3                             # tras 3 fallos, el despliegue entra en cooldown
  cooldown_time: 30                            # segundos fuera de rotación

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY    # solo para administrar, nunca para agentes
  database_url: os.environ/DATABASE_URL        # Postgres: claves, equipos y gasto

mcp_servers:                                   # el mismo proxy como gateway MCP
  tickets:
    url: "https://mcp-tickets.interno/mcp"
    transport: "http"
    description: "Sistema de tickets de postventa"
    auth_type: "api_key"
    auth_value: os.environ/TICKETS_MCP_KEY`

const OPS_Q = '¿Cuándo llega el pedido 4512 y cuánto se le devuelve al cliente si devuelve una de las 2 chaquetas de $34.990?'
const OPS_HIST: ApiMessage[] = [
  { role: 'user', content: OPS_Q },
  {
    role: 'assistant',
    note: 'turno 1',
    content: [
      { type: 'tool_use', id: 'toolu_01', name: 'estado_pedido', input: { order_id: '4512' } },
      { type: 'tool_use', id: 'toolu_02', name: 'calculadora', input: { expresion: '34990 * 1' } },
    ],
  },
  {
    role: 'user',
    note: 'resultados',
    content: [
      { type: 'tool_result', tool_use_id: 'toolu_01', content: { estado: 'en ruta', eta: '2026-11-07' } },
      { type: 'tool_result', tool_use_id: 'toolu_02', content: { resultado: 34990 } },
    ],
  },
  { role: 'assistant', note: 'turno 2 · fin', content: [{ type: 'text', text: 'Llega el 7 de noviembre. Si devuelve una chaqueta se le reembolsan $34.990.' }] },
]

export const rutaProyecto: IsoSpec = {
  id: 'ruta-proyecto-integrador',
  title: 'El proyecto integrador crece nivel a nivel',
  summary:
    'Cada nivel de la ruta agrega una pieza al mismo sistema: un **asistente de operaciones** para una empresa de retail. Recorre los pasos para ver qué construyes en cada nivel, qué dato nuevo aparece (JSON validado, `tool_use`, citas, estado de sesión, tokens OAuth, reportes de evals, mensajes A2A) y el código que lo produce.',
  height: 500,
  zones: [{ id: 'prod', label: 'Producción (nivel 5)', from: [1.6, -5.2], to: [11.6, 5.0], tone: 'infra' }],
  nodes: [
    { id: 'user', label: 'Operaciones', sub: 'usuarios internos', at: [-1.6, 0], shape: 'person', tone: 'user', icon: 'users', info: 'Usuarios internos que preguntan por pedidos, stock e incidentes.' },
    { id: 'llm', label: 'LLM + salida JSON', sub: 'Nivel 0', at: [3.2, -3.5], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Nivel 0: llamadas al modelo con salida estructurada validada (clasificación de tickets).' },
    { id: 'agent', label: 'Agente con tools', sub: 'Nivel 1 → 3', at: [3.2, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Nivel 1: loop con 3 herramientas. Nivel 3: reescrito en ADK con workflows, sesiones y callbacks.' },
    { id: 'kb', label: 'RAG de políticas', sub: 'Nivel 2', at: [3.2, 3.5], shape: 'stack', tone: 'data', icon: 'book', info: 'Nivel 2: base de conocimiento con búsqueda híbrida, reranking y citas, evaluada con RAGAS.' },
    { id: 'gw', label: 'AI Gateway', sub: 'Nivel 4', at: [6.7, -3.5], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Nivel 4: LiteLLM Proxy con claves virtuales, presupuesto y fallback de región hacia Bedrock.' },
    { id: 'mcp', label: 'Servidor MCP', sub: 'Nivel 4', at: [6.7, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Nivel 4: el sistema de pedidos expuesto como servidor MCP con OAuth y scopes.' },
    { id: 'evals', label: 'Evals + trazas', sub: 'Nivel 5', at: [6.7, 3.5], shape: 'box', tone: 'infra', icon: 'chart', info: 'Nivel 5: suite de evals en CI, trazas OTel, guardrails y aprobación humana en acciones irreversibles.' },
    { id: 'peer', label: 'Especialista', sub: 'Nivel 6 · A2A', at: [10.2, 0], shape: 'tall', tone: 'agent', icon: 'network', scale: 0.9, info: 'Nivel 6: un agente de remediación (en Strands) al que el orquestador delega vía A2A, con identidad y permisos propios.' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'agent', to: 'llm', route: 'z' },
    { from: 'agent', to: 'kb', route: 'z' },
    { from: 'agent', to: 'mcp' },
    { from: 'llm', to: 'gw', dashed: true },
    { from: 'agent', to: 'evals', dashed: true },
    { from: 'agent', to: 'peer', label: 'A2A', route: 'arc' },
  ],
  code: {
    clasif: { title: 'clasificador.py (ilustrativo)', lang: 'python', source: CLASIFICADOR },
    loop: { title: 'loop_minimo.py', lang: 'python', source: LOOP },
    gw: { title: 'config.yaml', lang: 'yaml', source: GATEWAY },
  },
  steps: [
    {
      title: 'Nivel 0 · El modelo como función',
      body: 'Empiezas con llamadas al modelo que devuelven **JSON validado**: clasificar tickets por categoría y urgencia. Forzar una herramienta (`toolChoice`) con el esquema de Pydantic y validar la salida garantiza que el parser nunca se rompe. Aprendes tokens, costos y salida estructurada.',
      focus: ['llm'],
      data: {
        title: 'respuesta de bedrock.converse() con toolChoice forzado',
        lang: 'json',
        content: jsonc({
          output: {
            message: {
              role: 'assistant',
              content: [{ toolUse: { toolUseId: 'tooluse_9a', name: 'clasificar', input: { categoria: 'logistica', urgencia: 'alta', resumen: 'Pedido 4512 con 4 días de retraso; cliente pide compensación.' } } }],
            },
          },
          stopReason: 'tool_use',
          usage: { inputTokens: 236, outputTokens: 41, totalTokens: 277 },
        }),
        hl: ['"categoria"', '"usage"'],
      },
      code: { file: 'clasif', hl: ['class Clasificacion', '"toolChoice"', 'Clasificacion.model_validate'] },
    },
    {
      title: 'Nivel 1 · Primer agente',
      body: 'Construyes el **loop** a mano con 3 herramientas (catálogo, estado de pedido, calculadora) y un límite de turnos. Aquí el modelo pidió dos herramientas en el mismo turno; el harness valida argumentos, las ejecuta y devuelve ambos resultados.',
      flows: ['user>agent', 'agent>llm'],
      data: { title: 'messages del agente de operaciones', messages: OPS_HIST, newFrom: 1, hl: [1, 2] },
      code: { file: 'loop', hl: ['for _ in range(max_turns)', 'tool.validate(call.arguments)', 'raise TurnLimitExceeded'] },
    },
    {
      title: 'Nivel 2 · Conocimiento con RAG',
      body: 'Agregas una **base de conocimiento** de políticas con búsqueda híbrida (BM25 + vectores) y reranking. Cada fragmento llega con su fuente para que la respuesta la cite, y mides por separado **recall@k** (¿recuperó el fragmento correcto?) y **faithfulness** (¿la respuesta se apoya en él?).',
      flows: ['agent>kb', 'kb>agent'],
      data: {
        title: 'resultado de buscar_politicas (ilustrativo)',
        lang: 'json',
        content: jsonc({
          consulta: 'compensación por retraso de despacho',
          resultados: [
            { texto: 'Retrasos sobre 3 días hábiles: envío gratis en la próxima compra.', fuente: 'Política de postventa v7 · §4.2', score_rerank: 0.93 },
            { texto: 'Las devoluciones se reembolsan al medio de pago original en 5 días hábiles.', fuente: 'Política de devoluciones v3 · §2.1', score_rerank: 0.71 },
          ],
        }),
        hl: ['"fuente"'],
      },
    },
    {
      title: 'Nivel 3 · Framework y workflows',
      body: 'Migras a **ADK**: workflows para los procesos repetibles, sesiones con estado y callbacks para logging y guardrails. El estado de sesión usa prefijos con alcance distinto: sin prefijo (esta sesión), `user:` (todas las sesiones del usuario), `app:` (toda la app) y `temp:` (solo esta invocación).',
      focus: ['agent'],
      data: {
        title: 'session.state de ADK (ilustrativo)',
        lang: 'json',
        content: jsonc({
          pedido_en_curso: '4512',
          ultima_categoria: 'logistica',
          'user:tienda_asignada': 'Providencia',
          'app:politica_vigente': 'postventa-v7',
          'temp:intentos_tool': 1,
        }),
        hl: ['"user:tienda_asignada"', '"temp:intentos_tool"'],
      },
    },
    {
      title: 'Nivel 4 · Protocolos y gateway',
      body: 'El sistema de pedidos pasa a ser un **servidor MCP** con OAuth (el token tiene como audiencia ese servidor y scopes mínimos), y todas las llamadas al modelo pasan por un **AI gateway** con alias, claves virtuales, presupuesto por equipo y fallback de región.',
      flows: ['agent>mcp', 'llm>gw'],
      data: {
        title: 'POST /mcp · tools/call con token OAuth',
        lang: 'http',
        content: `POST /mcp HTTP/1.1
Host: mcp-pedidos.interno
Authorization: Bearer eyJhbGciOi…   (aud=https://mcp-pedidos.interno, scope=pedidos.read)
Mcp-Method: tools/call
Mcp-Name: estado_pedido
Content-Type: application/json

${jsonc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'estado_pedido', arguments: { order_id: '4512' } } })}`,
        hl: ['Authorization: Bearer', 'Mcp-Method'],
      },
      code: { file: 'gw', hl: ['model_name: claude-sonnet ', 'fallbacks:', 'mcp_servers:'] },
    },
    {
      title: 'Nivel 5 · Producción',
      body: 'Despliegas en un runtime gestionado con **evals en CI**, trazas, guardrails y aprobación humana para acciones irreversibles. El reporte compara contra la versión en producción y mira **pass^k**, no solo un intento: un agente puede saber resolver una tarea y aun así fallarla a veces.',
      flows: ['agent>evals'],
      data: {
        title: 'reporte de evals en CI (ilustrativo)',
        lang: 'json',
        content: jsonc({
          suite: 'regresion-operaciones',
          tareas: 30,
          trials_por_tarea: 3,
          'pass@1': 0.94,
          'pass^3': 0.87,
          regresiones_vs_prod: ['stock-012'],
          costo_medio_usd: 0.031,
          latencia_p95_s: 7.4,
          decision: 'bloquear despliegue',
        }),
        hl: ['"pass^3"', '"regresiones_vs_prod"', '"decision"'],
      },
    },
    {
      title: 'Nivel 6 · Multiagente',
      body: 'Cuando el dominio crece, el agente pasa a **orquestador** y delega remediaciones a un especialista vía **A2A**: le envía un mensaje con el incidente y recibe una Task con su estado y un artefacto. Cada agente tiene identidad y permisos propios.',
      flows: ['agent>peer', 'peer>agent'],
      data: {
        title: 'SendMessage al agente de remediación (A2A v1 · forma simplificada)',
        lang: 'json',
        content: jsonc({
          jsonrpc: '2.0',
          id: 'req-77',
          method: 'SendMessage',
          params: {
            message: {
              messageId: 'msg-c41e',
              role: 'ROLE_USER',
              parts: [{ data: { incidente: 'INC-2291', sintoma: 'stock de tienda 12 sin sincronizar desde 09:40', accion_permitida: 'reintentar_job' }, mediaType: 'application/json' }],
            },
          },
        }),
        hl: ['"method": "SendMessage"', '"accion_permitida"'],
      },
    },
  ],
}
