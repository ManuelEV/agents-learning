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

/* ══════════════════════ Ensamblaje de la ventana de contexto ══════════════════════ */

/** Bloque `converse_cache.py` del artículo. */
const CONVERSE_CACHE = `import boto3

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
CACHE_1H = {"cachePoint": {"type": "default", "ttl": "1h"}}

tools = sorted(TOOL_SPECS, key=lambda t: t["toolSpec"]["name"])   # orden determinista
resp = bedrock.converse(
    modelId="global.anthropic.claude-sonnet-5-5",
    toolConfig={"tools": tools + [CACHE_1H]},                       # checkpoint 1: tools
    system=[{"text": SYSTEM_PROMPT}, CACHE_1H],                     # checkpoint 2: system
    messages=historial + [{"role": "user", "content": [{"text": pregunta}]}],
)
uso = resp["usage"]
print(uso.get("cacheReadInputTokens"), uso.get("cacheWriteInputTokens"), uso["inputTokens"])`

/** Bloque `system_prompt_soporte.md` del artículo. */
const SYSTEM_MD = `## Rol
Eres el agente de postventa de una cadena de retail. Resuelves cambios,
devoluciones y seguimiento de pedidos.

## Cómo trabajar
- Consulta siempre el estado real del pedido antes de prometer nada.
- Las políticas vigentes están en la base de conocimiento: búscalas, no las recuerdes.
- Si el cliente pide algo fuera de política, explica la alternativa más cercana.

## Acciones con impacto
Cambios de dirección y notas de crédito requieren confirmación explícita del
cliente en el mismo turno. Montos sobre USD 200 se derivan a un ejecutivo.

## Formato
Respuestas de máximo 4 frases. Cita el número de pedido y la fecha prometida.`

/** Bloque `tools_pedidos.py` del artículo. */
const TOOLS_PEDIDOS = `from typing import Literal
from strands import tool

@tool
def pedidos_buscar(cliente_email: str, estado: str = "todos",
                   response_format: Literal["concise", "detailed"] = "concise",
                   limite: int = 5) -> dict:
    """Busca pedidos de un cliente, del más reciente al más antiguo.

    Args:
        cliente_email: Email del cliente, p. ej. "ana@correo.cl".
        estado: "en_preparacion", "despachado", "entregado" o "todos".
        response_format: "concise" devuelve número, estado y fecha prometida;
            "detailed" agrega líneas de producto y eventos de despacho.
        limite: Máximo de pedidos a devolver (1-20).
    """
    pedidos = erp.buscar_pedidos(cliente_email, estado)[: min(limite, 20)]
    if not pedidos:   # error accionable, no un traceback
        return {"resultado": [], "sugerencia": "Verifica el email o usa estado='todos'."}
    campos = ("numero", "estado", "fecha_prometida")
    if response_format == "concise":
        pedidos = [{k: p[k] for k in campos} for p in pedidos]
    return {"resultado": pedidos, "hay_mas": len(pedidos) == limite}`

const CACHE_1H = { cachePoint: { type: 'default', ttl: '1h' } }
const PREGUNTA = '¿Puedo cambiar la talla del pedido 4512 que ya salió a despacho?'

const HIST_COMPACTO: ApiMessage[] = [
  {
    role: 'user',
    note: 'resumen (compactación)',
    content: '[Resumen de turnos anteriores] Cliente ana@correo.cl preguntó por la entrega del pedido 4512 (chaqueta talla M). Se le informó: despachado el 05-11, entrega prometida 07-11. Sin acciones pendientes.',
  },
  { role: 'assistant', content: [{ type: 'tool_use', id: 'tooluse_07', name: 'pedidos_buscar', input: { cliente_email: 'ana@correo.cl', estado: 'todos' } }] },
  { role: 'user', note: 'resultado antiguo limpiado', content: [{ type: 'tool_result', tool_use_id: 'tooluse_07', content: '[contenido eliminado: ya se usó]' }] },
  { role: 'assistant', content: [{ type: 'text', text: 'Tu pedido 4512 salió a despacho el 5 de noviembre y llega el 7.' }] },
]

export const contextoEnsamblaje: IsoSpec = {
  id: 'contexto-ensamblaje',
  title: 'Cómo se arma la ventana de contexto en cada turno',
  summary:
    'En cada llamada al modelo, el harness **compone** la ventana de contexto a partir de varias fuentes. Lo estable va primero (y se cachea con `cachePoint`); lo variable, al final. Lo que no cabe se recupera *just-in-time* o se compacta. Ejemplo: el agente de postventa de un retailer ante "¿Puedo cambiar la talla del pedido 4512?". En cada paso verás qué bloque entra en la petición de la Converse API y de qué archivo sale.',
  height: 500,
  nodes: [
    { id: 'sys', label: 'System prompt', sub: 'altitud correcta', at: [0, -3.4], shape: 'doc', tone: 'memory', icon: 'scroll', info: 'Instrucciones con secciones claras (rol, cómo trabajar, acciones con impacto, formato). Ni reglas frágiles tipo `if/else` ni vaguedades. Es estable entre turnos: candidato ideal a caché.' },
    { id: 'tools', label: 'Definiciones de tools', sub: 'pocas y distintas', at: [3.3, -3.4], shape: 'doc', tone: 'tool', icon: 'wrench', info: 'Nombre, descripción y JSON Schema de cada herramienta. Ocupan tokens en **cada** llamada: pocas, sin solaparse y en orden determinista para no romper la caché.' },
    { id: 'skills', label: 'Skills', sub: 'solo name + description', at: [6.6, -3.4], shape: 'doc', tone: 'protocol', icon: 'book', info: 'Con *progressive disclosure* solo se cargan los metadatos de cada Agent Skill; el `SKILL.md` completo entra cuando el modelo decide activarla.' },
    { id: 'user', label: 'Mensaje del usuario', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: '"¿Puedo cambiar la talla del pedido 4512 que ya salió a despacho?"' },
    { id: 'mem', label: 'Memoria largo plazo', sub: 'hechos del usuario', at: [0, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Preferencias y hechos extraídos de sesiones anteriores ("cliente frecuente, prefiere retiro en tienda"). Se recupera por búsqueda, no se vuelca entera.' },
    { id: 'hist', label: 'Historial', sub: 'compactado', at: [3.3, 3.4], shape: 'doc', tone: 'memory', icon: 'layers', info: 'Turnos recientes completos y un resumen de los antiguos. Los resultados de herramientas viejos se pueden **limpiar**: ya cumplieron su función.' },
    { id: 'rag', label: 'Recuperación JIT', sub: 'tools de búsqueda', at: [6.6, 3.4], shape: 'stack', tone: 'data', icon: 'search', info: 'El agente guarda referencias (IDs, emails, rutas) y carga el contenido solo cuando lo necesita, con una herramienta de búsqueda o lectura.' },
    { id: 'window', label: 'Ventana de contexto', sub: 'presupuesto finito', at: [6.6, 0], shape: 'doc', tone: 'agent', icon: 'layers', scale: 1.2, info: 'El resultado del ensamblaje. Objetivo: el **conjunto mínimo de tokens de alta señal** que maximiza la probabilidad del resultado deseado.' },
    { id: 'llm', label: 'LLM', sub: 'Claude en Bedrock', at: [10, 0], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Cada token compite por la atención del modelo. Más contexto no es mejor contexto: con ventanas muy llenas aparece el *context rot*.' },
    { id: 'cache', label: 'Prompt cache', sub: 'cachePoint · TTL 1 h', at: [9.8, -4.0], shape: 'hex', tone: 'gateway', icon: 'zap', info: 'El prefijo estable (tools → system) se cachea con un `cachePoint` de la Converse API. Las lecturas de caché se facturan a tarifa reducida, bajan la latencia y no descuentan del rate limit.' },
  ],
  edges: [
    { from: 'sys', to: 'window', route: 'x' },
    { from: 'tools', to: 'window', route: 'x' },
    { from: 'skills', to: 'window', route: 'z' },
    { from: 'user', to: 'window' },
    { from: 'mem', to: 'window', route: 'x' },
    { from: 'hist', to: 'window', route: 'x' },
    { from: 'rag', to: 'window', route: 'z' },
    { from: 'window', to: 'llm' },
    { from: 'cache', to: 'llm', route: 'z', dashed: true },
  ],
  code: {
    converse: { title: 'converse_cache.py', lang: 'python', source: CONVERSE_CACHE },
    prompt: { title: 'system_prompt_soporte.md', lang: 'text', source: SYSTEM_MD },
    tools: { title: 'tools_pedidos.py', lang: 'python', source: TOOLS_PEDIDOS },
  },
  steps: [
    {
      title: '1 · Prefijo estable: herramientas',
      body: 'Primero van las definiciones de herramientas, **ordenadas por nombre**, y un `cachePoint` (checkpoint 1). Los checkpoints se procesan en orden `tools` → `system` → `messages` y son encadenados: cambiar una tool invalida la caché de todo lo que viene después.',
      flows: ['tools>window'],
      data: {
        title: 'toolConfig de la petición (forma simplificada)',
        lang: 'json',
        content: jsonc({
          toolConfig: {
            tools: [
              { toolSpec: { name: 'politicas_buscar', description: 'Busca en las políticas vigentes de cambios y devoluciones.', inputSchema: { json: { type: 'object', properties: { consulta: { type: 'string' } }, required: ['consulta'] } } } },
              { toolSpec: { name: 'pedidos_buscar', description: 'Busca pedidos de un cliente, del más reciente al más antiguo.', inputSchema: { json: { type: 'object', properties: { cliente_email: { type: 'string' }, estado: { type: 'string' }, response_format: { enum: ['concise', 'detailed'] } }, required: ['cliente_email'] } } } },
              CACHE_1H,
            ],
          },
        }),
        hl: ['"toolSpec"', '"cachePoint"'],
      },
      code: { file: 'converse', hl: ['tools = sorted(TOOL_SPECS', 'toolConfig={"tools": tools + [CACHE_1H]}'] },
    },
    {
      title: '2 · Prefijo estable: system prompt',
      body: 'Luego el system prompt, con secciones explícitas, y el checkpoint 2. Es "mínimo" en el sentido de sin relleno: heurísticas claras ("busca las políticas, no las recuerdes") en vez de reglas `if/else` frágiles. Los Claude 5.5 en Bedrock admiten hasta 4 checkpoints de al menos 512 tokens.',
      flows: ['sys>window'],
      data: {
        title: 'system de la petición',
        lang: 'json',
        content: jsonc({ system: [{ text: '## Rol\nEres el agente de postventa de una cadena de retail. …\n## Formato\nRespuestas de máximo 4 frases. …' }, CACHE_1H] }),
        hl: ['"system"', '"cachePoint"'],
      },
      code: { file: 'prompt', hl: ['## Rol', '## Cómo trabajar', 'búscalas, no las recuerdes', '## Acciones con impacto'] },
    },
    {
      title: '3 · Skills con divulgación progresiva',
      body: 'De cada Agent Skill solo entra el `name` y la `description` del frontmatter de su `SKILL.md`. Decenas de skills cuestan pocos tokens; el contenido completo se carga solo si el modelo decide activar una.',
      flows: ['skills>window'],
      data: {
        title: 'lo único que entra de cada skill (frontmatter, ilustrativo)',
        lang: 'yaml',
        content: `- name: cambios-de-talla
  description: Procedimiento para cambiar la talla de un pedido despachado o entregado, con plazos y costos de envío.
- name: notas-de-credito
  description: Cuándo y cómo emitir una nota de crédito; límites por monto.
- name: retiro-en-tienda
  description: Coordinar retiro o cambio en una tienda física.
# El cuerpo de cada SKILL.md (y sus scripts/) se carga solo al activarla`,
        hl: ['name: cambios-de-talla'],
      },
    },
    {
      title: '4 · Memoria relevante',
      body: 'Se buscan en la memoria de largo plazo los hechos relevantes **para este usuario y esta consulta**, no todos los recuerdos. Dos o tres líneas bastan para personalizar la respuesta.',
      flows: ['mem>window'],
      data: {
        title: 'recuerdos recuperados (ilustrativo)',
        lang: 'json',
        content: jsonc({
          namespace: 'clientes/ana@correo.cl',
          consulta: 'cambio de talla pedido despachado',
          recuerdos: [
            { hecho: 'Cliente frecuente; prefiere retiro en tienda Providencia.', relevancia: 0.82 },
            { hecho: 'En octubre cambió una talla sin problemas (pedido 4377).', relevancia: 0.74 },
          ],
        }),
        hl: ['"namespace"', '"recuerdos"'],
      },
    },
    {
      title: '5 · Historial compactado',
      body: 'Entran un **resumen** de los turnos antiguos y los recientes completos. El resultado de la búsqueda de pedidos anterior ya se usó, así que se **limpió**: es la forma más segura y liviana de compactar.',
      flows: ['hist>window'],
      data: { title: 'historial que entra en messages', messages: HIST_COMPACTO, hl: [0, 2] },
    },
    {
      title: '6 · Mensaje actual',
      body: 'El mensaje del usuario va al final: es la parte más variable y la que más atención necesita. Todo lo anterior a los checkpoints se reutiliza de la caché.',
      flows: ['user>window'],
      data: { title: 'messages enviados', messages: [...HIST_COMPACTO, { role: 'user', content: PREGUNTA }], newFrom: 4 },
      code: { file: 'converse', hl: ['messages=historial + [{"role": "user"'] },
    },
    {
      title: '7 · Llamada al modelo',
      body: 'La ventana se envía al LLM. El prefijo (tools + system) se **lee de la caché**; solo se procesa completo lo nuevo. En la respuesta, `inputTokens` excluye lo cacheado: total de entrada = `inputTokens + cacheReadInputTokens + cacheWriteInputTokens`.',
      flows: ['window>llm', 'cache>llm'],
      data: {
        title: 'usage de la respuesta (ilustrativo)',
        lang: 'json',
        content: jsonc({
          stopReason: 'tool_use',
          usage: { inputTokens: 1688, cacheReadInputTokens: 2104, cacheWriteInputTokens: 0, outputTokens: 120, totalTokens: 3912 },
        }),
        hl: ['"cacheReadInputTokens"', '"inputTokens"'],
      },
      code: { file: 'converse', hl: ['CACHE_1H = {"cachePoint"', 'uso = resp["usage"]', 'print(uso.get("cacheReadInputTokens")'] },
    },
    {
      title: '8 · Recuperación just-in-time',
      body: 'El modelo decide que necesita la política de cambios y el estado actual del pedido, y llama a las herramientas. `pedidos_buscar` responde en formato **concise** (número, estado, fecha): pocos tokens de alta señal que entran en el siguiente turno **solo porque hicieron falta**.',
      flows: ['llm>window', 'rag>window'],
      data: {
        title: 'tool_use y tool_result del turno',
        messages: [
          {
            role: 'assistant',
            content: [
              { type: 'tool_use', id: 'tooluse_11', name: 'politicas_buscar', input: { consulta: 'cambio de talla pedido despachado' } },
              { type: 'tool_use', id: 'tooluse_12', name: 'pedidos_buscar', input: { cliente_email: 'ana@correo.cl', estado: 'despachado', response_format: 'concise' } },
            ],
          },
          {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'tooluse_11', content: 'Política de cambios v7 §3: pedidos despachados se cambian al recibirlos, en tienda o por retiro, hasta 30 días.' },
              { type: 'tool_result', tool_use_id: 'tooluse_12', content: { resultado: [{ numero: '4512', estado: 'despachado', fecha_prometida: '2026-11-07' }], hay_mas: false } },
            ],
          },
        ],
        newFrom: 0,
      },
      code: { file: 'tools', hl: ['response_format: Literal["concise", "detailed"]', 'if response_format == "concise"', 'return {"resultado": pedidos'] },
    },
  ],
}

/* ═══════════════════════ Memoria de corto y largo plazo ═══════════════════════ */

/** Bloque `agente_con_memoria.py` del artículo (ADK + Memory Bank). */
const ADK_MEMORIA = `from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import DatabaseSessionService
from google.adk.memory import VertexAiMemoryBankService
from google.adk.tools import load_memory

async def guardar_en_memoria(callback_context):
    # Envía la sesión al Memory Bank, que extrae y consolida recuerdos
    await callback_context.add_session_to_memory()

agent = Agent(
    name="postventa", model="gemini-flash-latest",
    instruction="Si el historial del cliente puede ayudar, usa load_memory.",
    tools=[load_memory],                 # el agente decide cuándo recordar
    after_agent_callback=guardar_en_memoria,
)

runner = Runner(
    agent=agent, app_name="postventa",
    session_service=DatabaseSessionService(db_url="postgresql://..."),   # corto plazo
    memory_service=VertexAiMemoryBankService(                           # largo plazo
        project="mi-proyecto", location="us-central1", agent_engine_id="123"),
)`

/** Bloque `grafo_con_memoria.py` del artículo (LangGraph). */
const LG_MEMORIA = `from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.store.memory import InMemoryStore

DB_URI = "postgresql://..."
with PostgresSaver.from_conn_string(DB_URI) as checkpointer:
    checkpointer.setup()                 # crea las tablas la primera vez
    store = InMemoryStore()              # en producción, un store persistente
    graph = builder.compile(checkpointer=checkpointer, store=store)

    # Corto plazo: cada conversación es un thread con su propio historial
    config = {"configurable": {"thread_id": "cliente-881-conv-17"}}
    graph.invoke({"messages": [("user", "¿Y mañana llega?")]}, config)`

export const contextoMemoria: IsoSpec = {
  id: 'contexto-memoria',
  title: 'Memoria de corto y largo plazo',
  summary:
    'La **memoria de corto plazo** guarda los eventos y el estado de la sesión actual. Un proceso de **extracción** (normalmente asíncrono) convierte esas conversaciones en **recuerdos de largo plazo** (hechos, preferencias, resúmenes) que se recuperan por búsqueda en sesiones futuras, siempre acotados al usuario. El recorrido sigue al cliente `cliente-881` en ADK con Memory Bank, y muestra el equivalente en LangGraph.',
  height: 470,
  nodes: [
    { id: 'user', label: 'Cliente', sub: 'cliente-881', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'El mismo cliente vuelve días después por otro canal. Espera que el agente recuerde lo importante, no toda la conversación.' },
    { id: 'agent', label: 'Agente', sub: 'ADK · Strands · LangGraph', at: [3.3, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Lee y escribe estado durante la sesión, y consulta la memoria de largo plazo cuando la necesita (como herramienta `load_memory` o precargada con `PreloadMemoryTool`).' },
    { id: 'model', label: 'LLM', at: [3.3, 3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Solo ve lo que el agente pone en el contexto: el modelo en sí no recuerda nada entre llamadas.' },
    { id: 'session', label: 'Sesión', sub: 'eventos + estado', at: [3.3, -3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Corto plazo: historial de eventos y estado clave-valor de la conversación actual. Ej.: ADK `SessionService`, AgentCore Memory (eventos), checkpointer de LangGraph por `thread_id`.' },
    { id: 'extract', label: 'Extracción', sub: 'asíncrona · LLM', at: [6.8, -3.4], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Un pipeline (gestionado o propio) lee la conversación y extrae hechos, preferencias y resúmenes; además **consolida**: actualiza o descarta recuerdos contradictorios.' },
    { id: 'ltm', label: 'Memoria largo plazo', sub: 'Memory Bank · AgentCore', at: [10.2, -3.4], shape: 'stack', tone: 'memory', icon: 'layers', info: 'Registros con búsqueda semántica, organizados por namespace (usuario, agente, tema). Ej.: Agent Platform Memory Bank, estrategias de AgentCore Memory, stores de LangGraph.' },
    { id: 'scope', label: 'Filtro por usuario', sub: 'namespace · políticas', at: [6.8, 0], shape: 'hex', tone: 'guard', icon: 'lock', info: 'La recuperación siempre se acota al usuario/tenant. Un recuerdo filtrado a otro cliente es un incidente de privacidad; la memoria también puede ser envenenada (OWASP ASI06).' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'agent', to: 'model' },
    { from: 'agent', to: 'session', label: 'escribe' },
    { from: 'session', to: 'extract' },
    { from: 'extract', to: 'ltm' },
    { from: 'ltm', to: 'scope', route: 'z' },
    { from: 'scope', to: 'agent', label: 'búsqueda' },
  ],
  code: {
    adk: { title: 'agente_con_memoria.py', lang: 'python', source: ADK_MEMORIA },
    lg: { title: 'grafo_con_memoria.py', lang: 'python', source: LG_MEMORIA },
  },
  steps: [
    {
      title: '1 · Conversación',
      body: 'El cliente conversa con el agente. Cada turno se guarda como **evento** en la sesión (Postgres vía `DatabaseSessionService`), junto con el estado: el pedido en curso, y con prefijo `user:` lo que vale para todas sus sesiones.',
      flows: ['user>agent', 'agent>session'],
      data: {
        title: 'sesión de ADK (forma simplificada)',
        lang: 'json',
        content: jsonc({
          id: 'ses-17',
          app_name: 'postventa',
          user_id: 'cliente-881',
          state: { pedido_en_curso: '4512', 'user:canal_preferido': 'whatsapp' },
          events: [
            { author: 'user', text: 'Me llegó la chaqueta del pedido 4512 pero en talla M, pedí L.' },
            { author: 'postventa', text: 'Puedes cambiarla en tienda o con retiro a domicilio. ¿Qué prefieres?' },
            { author: 'user', text: 'En tienda, siempre retiro en Providencia.' },
          ],
        }),
        hl: ['"state"', '"events"'],
      },
      code: { file: 'adk', hl: ['session_service=DatabaseSessionService', '# corto plazo'] },
    },
    {
      title: '2 · El modelo no recuerda',
      body: 'El LLM es *stateless*: en cada llamada solo sabe lo que el agente puso en su contexto (instrucción + eventos de **esta** sesión). Lo que se habló hace un mes no existe para el modelo a menos que el harness lo traiga.',
      flows: ['agent>model', 'model>agent'],
      data: {
        title: 'lo único que ve el modelo en esta llamada',
        messages: [
          { role: 'system', content: 'Si el historial del cliente puede ayudar, usa load_memory.' },
          { role: 'user', content: 'Me llegó la chaqueta del pedido 4512 pero en talla M, pedí L.' },
          { role: 'assistant', content: 'Puedes cambiarla en tienda o con retiro a domicilio. ¿Qué prefieres?' },
          { role: 'user', content: 'En tienda, siempre retiro en Providencia.' },
        ],
      },
      code: { file: 'adk', hl: ['instruction="Si el historial del cliente puede ayudar, usa load_memory."'] },
    },
    {
      title: '3 · Extracción asíncrona',
      body: 'Al terminar el turno, `after_agent_callback` envía la sesión al **Memory Bank**, que extrae lo que vale la pena recordar y lo **consolida** con lo que ya sabía (actualiza o descarta lo contradictorio). Ocurre fuera del camino crítico de la respuesta.',
      flows: ['session>extract', 'extract>ltm'],
      data: {
        title: 'recuerdos extraídos y consolidados (ilustrativo)',
        lang: 'json',
        content: jsonc({
          scope: { app_name: 'postventa', user_id: 'cliente-881' },
          memorias: [
            { hecho: 'Prefiere retiro y cambios en tienda Providencia.', accion: 'actualizada' },
            { hecho: 'Usa talla L en chaquetas; el pedido 4512 llegó en M (nov. 2026).', accion: 'creada' },
            { hecho: 'Prefiere despacho a domicilio.', accion: 'descartada (contradice la anterior)' },
          ],
        }),
        hl: ['"scope"', '"accion"'],
      },
      code: { file: 'adk', hl: ['async def guardar_en_memoria', 'add_session_to_memory()', 'after_agent_callback=guardar_en_memoria', 'memory_service=VertexAiMemoryBankService('] },
    },
    {
      title: '4 · Recuperación acotada',
      body: 'Días después, en otra sesión, el agente decide usar `load_memory`. La búsqueda se hace **solo dentro del namespace del cliente** (`app_name` + `user_id`) y devuelve unos pocos recuerdos relevantes, que entran al contexto como resultado de herramienta.',
      flows: ['ltm>scope', 'scope>agent'],
      data: {
        title: 'tool_use y resultado de load_memory (forma simplificada)',
        messages: [
          { role: 'user', note: 'sesión ses-23', content: 'Quiero comprar otra chaqueta igual, ¿me la reservan?' },
          { role: 'assistant', content: [{ type: 'tool_use', id: 'call_m1', name: 'load_memory', input: { query: 'talla y tienda preferida del cliente' } }] },
          { role: 'tool', content: [{ type: 'tool_result', tool_use_id: 'call_m1', content: { memories: ['Usa talla L en chaquetas.', 'Prefiere retiro y cambios en tienda Providencia.'] } }] },
        ],
        newFrom: 1,
      },
      code: { file: 'adk', hl: ['tools=[load_memory]'] },
    },
    {
      title: '5 · Lo mismo en LangGraph',
      body: 'En LangGraph, el **checkpointer** guarda el corto plazo por `thread_id` (una conversación) y el **store** guarda recuerdos compartidos entre threads, organizados por namespace. Mismo modelo mental, otras primitivas.',
      focus: ['session', 'ltm'],
      data: {
        title: 'corto vs. largo plazo en LangGraph (ilustrativo)',
        lang: 'json',
        content: jsonc({
          checkpointer: { thread_id: 'cliente-881-conv-17', mensajes: 6, ultimo: '¿Y mañana llega?' },
          store: { namespace: ['memorias', 'cliente-881'], key: 'preferencias', value: { talla_chaqueta: 'L', tienda: 'Providencia' } },
        }),
        hl: ['"thread_id"', '"namespace"'],
      },
      code: { file: 'lg', hl: ['PostgresSaver.from_conn_string', 'store = InMemoryStore()', 'compile(checkpointer=checkpointer, store=store)', '"thread_id": "cliente-881-conv-17"'] },
    },
    {
      title: '6 · Higiene',
      body: 'Define retención, borrado a pedido del usuario y validación de lo que se escribe: la memoria es contexto persistente que se reinyecta y, por lo tanto, una **superficie de ataque** (*memory poisoning*, ASI06).',
      focus: ['scope', 'ltm'],
      data: {
        title: 'política de memoria (ilustrativa)',
        lang: 'yaml',
        content: `memoria_largo_plazo:
  namespace: "{app_name}/{user_id}"      # nunca buscar fuera del namespace
  retencion_dias: 365
  borrado_a_pedido: true                 # derecho de supresión del cliente
  escritura:
    solo_hechos_del_cliente: true        # no instrucciones ("ignora tus reglas…")
    bloquear_pii_sensible: [tarjeta, rut_completo]
  auditoria: registrar quién leyó/escribió cada recuerdo`,
        hl: ['namespace:', 'solo_hechos_del_cliente'],
      },
    },
  ],
}
