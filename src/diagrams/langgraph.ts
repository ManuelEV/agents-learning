import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ────────────────────────────────────────────────────────────────────────────
 * Código reutilizado literalmente de src/content/langgraph.mdx
 * ──────────────────────────────────────────────────────────────────────────── */

const STATE = `from typing import Annotated, TypedDict
import operator
from langgraph.graph import MessagesState

class SupportState(MessagesState):                    # hereda messages + reducer add_messages
    intent: str                                       # reemplazo simple
    order_id: str | None
    audit_log: Annotated[list[str], operator.add]     # reducer: concatena listas de cada nodo`

const GRAPH = `from typing import Literal
from langchain_aws import ChatBedrockConverse
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt, Command
from state import SupportState

llm = ChatBedrockConverse(model_id="global.anthropic.claude-sonnet-5-5", region_name="us-east-1")

def clasificar(state: SupportState) -> dict:
    """Nodo LLM: clasifica la intención del último mensaje."""
    out = llm.invoke([("system", "Responde solo REEMBOLSO o FAQ."), *state["messages"]])
    return {"intent": out.content.strip().upper(), "audit_log": [f"intent={out.content}"]}

def route_intent(state: SupportState) -> Literal["preparar_reembolso", "responder_faq"]:
    """Arista condicional: la decisión es código, no el LLM."""
    return "preparar_reembolso" if state["intent"] == "REEMBOLSO" else "responder_faq"

def preparar_reembolso(state: SupportState) -> dict:
    return {"audit_log": ["reembolso preparado: 89.990 CLP"]}

def aprobacion(state: SupportState) -> dict:
    ok = interrupt({"accion": "reembolso", "monto": 89990})   # pausa y persiste el estado
    return {"audit_log": [f"aprobado={ok}"]}                   # al reanudar, ok = valor de Command(resume)

def responder_faq(state: SupportState) -> dict:
    return {"messages": [llm.invoke(state["messages"])]}

builder = StateGraph(SupportState)
for name, fn in [("clasificar", clasificar), ("preparar_reembolso", preparar_reembolso),
                 ("aprobacion", aprobacion), ("responder_faq", responder_faq)]:
    builder.add_node(name, fn)
builder.add_edge(START, "clasificar")
builder.add_conditional_edges("clasificar", route_intent)
builder.add_edge("preparar_reembolso", "aprobacion")
builder.add_edge("aprobacion", END)
builder.add_edge("responder_faq", END)
graph = builder.compile(checkpointer=InMemorySaver())        # en producción: Postgres/Redis`

const RUN = `config = {"configurable": {"thread_id": "ticket-4512"}}       # identifica la conversación
result = graph.invoke({"messages": [("user", "Quiero el reembolso del pedido 4512")]}, config)
print(result["__interrupt__"])                                  # payload para el supervisor

# ... minutos o días después, desde otro proceso, con el mismo thread_id:
final = graph.invoke(Command(resume=True), config)
print(final["audit_log"])`

const SUPERVISOR = `from langchain.agents import create_agent
from langchain.tools import tool
from langchain_aws import ChatBedrockConverse

model = ChatBedrockConverse(model_id="global.anthropic.claude-sonnet-5-5", region_name="us-east-1")

disputes_agent = create_agent(model=model, tools=[], system_prompt="Abres disputas de cargos y entregas el folio.")
cards_agent = create_agent(model=model, tools=[], system_prompt="Gestionas bloqueo y reposición de tarjetas.")

@tool
def disputas(solicitud: str) -> str:
    """Abre una disputa por un cargo no reconocido. Incluye fecha, monto y comercio."""
    r = disputes_agent.invoke({"messages": [("user", solicitud)]})
    return r["messages"][-1].content

@tool
def tarjetas(solicitud: str) -> str:
    """Bloquea o repone tarjetas. Requiere los últimos 4 dígitos."""
    r = cards_agent.invoke({"messages": [("user", solicitud)]})
    return r["messages"][-1].content

supervisor = create_agent(
    model=model,
    tools=[disputas, tarjetas],
    system_prompt="Eres el asistente del banco. Delega a los especialistas y responde con un resumen claro.",
)`

/** Fragmento ilustrativo: el mismo supervisor con un tercer especialista, aprobación humana y store. */
const SUPERVISOR_PROD = `from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain.tools import tool
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.store.memory import InMemoryStore
from supervisor import model, disputas, tarjetas

store = InMemoryStore()                     # en producción: un store persistente (p. ej. Postgres)
store.put(("clientes", "cliente-881"), "perfil", {"segmento": "premium", "canal": "whatsapp"})

productos_agent = create_agent(model=model, tools=[buscar_tarifario],
    system_prompt="Respondes sobre productos y comisiones citando el tarifario vigente.")

@tool
def productos(pregunta: str) -> str:
    """Condiciones de productos: comisiones, reposición de tarjetas, seguros. Solo lectura."""
    r = productos_agent.invoke({"messages": [("user", pregunta)]})
    return r["messages"][-1].content

supervisor = create_agent(
    model=model,
    tools=[disputas, tarjetas, productos],
    system_prompt="Eres el asistente del banco. Delega a los especialistas y responde con un resumen claro.",
    middleware=[HumanInTheLoopMiddleware(interrupt_on={"tarjetas": True})],  # confirmar antes de bloquear
    checkpointer=InMemorySaver(),           # HITL necesita checkpointer: estado por thread
    store=store,                            # memoria entre threads (perfil del cliente)
)

config = {"configurable": {"thread_id": "chat-881-20261106"}}
supervisor.invoke({"messages": [("user", "No reconozco un cargo de ayer y quiero bloquear la tarjeta")]}, config)`

/* ────────────────────────────────────────────────────────────────────────────
 * Datos (ticket-4512)
 * ──────────────────────────────────────────────────────────────────────────── */

const HUMAN = { type: 'human', content: 'Quiero el reembolso del pedido 4512', id: 'msg-01' }
const CFG = (checkpoint_id: string) => ({ configurable: { thread_id: 'ticket-4512', checkpoint_ns: '', checkpoint_id } })

export const langgraphGrafo: IsoSpec = {
  id: 'langgraph-grafo',
  title: 'StateGraph con routing, checkpoints e interrupt',
  summary:
    'Un **StateGraph** de soporte: un nodo clasifica, una **arista condicional** enruta a reembolso o FAQ, y el reembolso pasa por un **interrupt** que espera aprobación humana. El **checkpointer** guarda el estado tras cada paso (por `thread_id`), lo que permite pausar días y reanudar con `Command(resume=...)`. En **Datos** ves el estado del grafo y sus checkpoints (forma simplificada de `StateSnapshot`) y en **Código**, `support_graph.py`, `run.py` y `state.py` del artículo.',
  height: 490,
  zones: [{ id: 'g', label: 'StateGraph compilado', from: [-1.4, -4.9], to: [14.2, 1.6], tone: 'agent' }],
  nodes: [
    { id: 'client', label: 'App / supervisor', sub: 'invoke · Command(resume)', at: [0, -3.3], shape: 'person', tone: 'user', icon: 'user', info: 'La aplicación invoca el grafo con `config={"configurable": {"thread_id": ...}}`. Cuando el grafo se pausa, un supervisor revisa y reanuda con `Command(resume=True)`.' },
    { id: 'start', label: 'START', at: [0, 0], shape: 'box', tone: 'neutral', icon: 'flag', info: 'Nodo virtual de entrada. `builder.add_edge(START, "clasificar")` define por dónde empieza la ejecución.' },
    { id: 'classify', label: 'clasificar', sub: 'nodo LLM', at: [3.2, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Un nodo es una función que recibe el estado y devuelve una **actualización parcial** (`{"intent": ..., "audit_log": [...]}`). Los reducers deciden cómo se combina con el estado actual.' },
    { id: 'router', label: 'route_intent', sub: 'arista condicional', at: [6.4, 0], shape: 'diamond', tone: 'guard', icon: 'split', info: '`add_conditional_edges("clasificar", route_intent)`: una función de Python que lee el estado y devuelve el nombre del siguiente nodo. Routing determinista en código.' },
    { id: 'refund', label: 'preparar_reembolso', sub: '89.990 CLP', at: [9.6, -3.3], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Calcula el monto y arma la acción, pero no la ejecuta: una acción irreversible pasa antes por aprobación.' },
    { id: 'approval', label: 'aprobacion', sub: 'interrupt()', at: [12.8, -3.3], shape: 'box', tone: 'guard', icon: 'hand', info: '`interrupt({...})` pausa el grafo, guarda el checkpoint y devuelve el payload al cliente. Al reanudar, `interrupt()` retorna el valor de `Command(resume=...)`. El nodo se **re-ejecuta desde el inicio** al reanudar.' },
    { id: 'faq', label: 'responder_faq', sub: 'LLM', at: [9.6, 3.3], shape: 'box', tone: 'data', icon: 'book', info: 'Rama de consultas informativas: el LLM responde y su mensaje se agrega a `messages`. Sin acciones de escritura.' },
    { id: 'end', label: 'END', at: [12.8, 0], shape: 'box', tone: 'neutral', icon: 'check', info: 'Nodo virtual de salida. El estado final queda guardado en el último checkpoint del thread.' },
    { id: 'ckpt', label: 'Checkpointer', sub: 'InMemorySaver · Postgres', at: [3.2, 3.3], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Guarda un snapshot del estado al final de cada *super-step*. Habilita memoria de conversación, HITL, *time travel* y tolerancia a fallos. `InMemorySaver` para desarrollo, Postgres/Redis en producción.' },
  ],
  edges: [
    { from: 'start', to: 'classify' },
    { from: 'classify', to: 'router' },
    { from: 'router', to: 'refund', label: 'reembolso' },
    { from: 'router', to: 'faq', label: 'faq' },
    { from: 'refund', to: 'approval' },
    { from: 'approval', to: 'end', route: 'z' },
    { from: 'faq', to: 'end' },
    { from: 'classify', to: 'ckpt', dashed: true, route: 'z' },
  ],
  code: {
    graph: { title: 'support_graph.py', lang: 'python', source: GRAPH },
    run: { title: 'run.py', lang: 'python', source: RUN },
    state: { title: 'state.py', lang: 'python', source: STATE },
  },
  steps: [
    {
      title: '1 · Invocación con thread_id',
      body: 'La app llama `graph.invoke(input, config)` con `thread_id="ticket-4512"`. Ese ID agrupa **todos** los checkpoints de la conversación: sin él no hay memoria ni reanudación, y compartido entre usuarios mezclaría conversaciones.',
      flows: ['client>start', 'start>classify'],
      data: {
        title: 'graph.invoke(input, config)',
        lang: 'json',
        content: json({ input: { messages: [['user', 'Quiero el reembolso del pedido 4512']] }, config: { configurable: { thread_id: 'ticket-4512' } } }),
        hl: ['"thread_id": "ticket-4512"'],
      },
      code: { file: 'run', hl: ['config = {"configurable": {"thread_id": "ticket-4512"}}', 'result = graph.invoke('] },
    },
    {
      title: '2 · El nodo devuelve una actualización',
      body: '`clasificar` llama al LLM y devuelve **solo** las claves que cambia: `intent` y `audit_log`. No toca `messages` ni devuelve el estado completo.',
      flows: ['classify>ckpt'],
      focus: ['classify'],
      data: {
        title: 'actualización devuelta por clasificar',
        lang: 'json',
        content: json({ intent: 'REEMBOLSO', audit_log: ['intent=REEMBOLSO'] }),
        hl: ['"intent"', '"audit_log"'],
      },
      code: { file: 'graph', hl: ['def clasificar(state: SupportState)', 'out = llm.invoke([("system", "Responde solo REEMBOLSO o FAQ.")', 'return {"intent": out.content.strip().upper()'] },
    },
    {
      title: '3 · Reducers y checkpoint',
      body: 'Los **reducers** combinan la actualización con el estado: `intent` se reemplaza, `audit_log` se concatena (`operator.add`) y `messages` usa `add_messages`. Al terminar el *super-step*, el checkpointer guarda un snapshot con el estado y `next`: el nodo que toca después.',
      flows: ['classify>ckpt'],
      data: {
        title: 'graph.get_state(config) tras clasificar (forma simplificada)',
        lang: 'json',
        content: json({
          values: { messages: [HUMAN], intent: 'REEMBOLSO', audit_log: ['intent=REEMBOLSO'] },
          next: ['preparar_reembolso'],
          config: CFG('1f0b2c4e-01'),
          metadata: { source: 'loop', step: 1 },
        }),
        hl: ['"values"', '"next"', '"checkpoint_id"'],
      },
      code: { file: 'state', hl: ['class SupportState(MessagesState)', 'intent: str', 'audit_log: Annotated[list[str], operator.add]'] },
    },
    {
      title: '4 · Arista condicional',
      body: '`route_intent(state)` lee `state["intent"]` y devuelve `"preparar_reembolso"`. La decisión es **código, no el LLM**: predecible y testeable con un unit test. Con `stream_mode="updates"` verías cada nodo y lo que escribió.',
      flows: ['classify>router', 'router>refund'],
      data: {
        title: 'graph.stream(..., stream_mode="updates")',
        lang: 'json',
        content: json([{ clasificar: { intent: 'REEMBOLSO', audit_log: ['intent=REEMBOLSO'] } }, { preparar_reembolso: { audit_log: ['reembolso preparado: 89.990 CLP'] } }]),
        hl: ['"preparar_reembolso"'],
      },
      code: { file: 'graph', hl: ['def route_intent', 'return "preparar_reembolso" if state["intent"] == "REEMBOLSO"', 'builder.add_conditional_edges("clasificar", route_intent)', 'def preparar_reembolso'] },
    },
    {
      title: '5 · Interrupt: pausa durable',
      body: '`aprobacion` llama `interrupt({...})`. El grafo se detiene, persiste el estado con `next: ["aprobacion"]` y `invoke` **retorna** con el payload en `__interrupt__`. No queda ningún proceso esperando: puede pasar un minuto o tres días.',
      flows: ['refund>approval', 'approval>ckpt', 'approval>client'],
      data: {
        title: 'resultado de invoke (forma simplificada)',
        lang: 'json',
        content: json({
          messages: [HUMAN],
          intent: 'REEMBOLSO',
          audit_log: ['intent=REEMBOLSO', 'reembolso preparado: 89.990 CLP'],
          __interrupt__: [{ value: { accion: 'reembolso', monto: 89990 }, id: 'b7e1c3…' }],
        }),
        hl: ['"__interrupt__"', '"monto": 89990'],
      },
      code: { file: 'graph', hl: ['def aprobacion', 'ok = interrupt({"accion": "reembolso", "monto": 89990})', 'builder.add_edge("preparar_reembolso", "aprobacion")'] },
    },
    {
      title: '6 · Reanudar con Command',
      body: 'El supervisor aprueba: la app llama `graph.invoke(Command(resume=True), config)` con el **mismo** `thread_id`, quizás desde otro proceso. El checkpointer restaura el estado y `aprobacion` se **re-ejecuta desde el principio**; esta vez `interrupt()` devuelve `True`. Por eso los efectos laterales van después del interrupt.',
      flows: ['client>approval', 'ckpt>approval'],
      data: {
        title: 'graph.get_state(config) antes de reanudar (forma simplificada)',
        lang: 'json',
        content: json({
          values: { intent: 'REEMBOLSO', audit_log: ['intent=REEMBOLSO', 'reembolso preparado: 89.990 CLP'] },
          next: ['aprobacion'],
          tasks: [{ name: 'aprobacion', interrupts: [{ value: { accion: 'reembolso', monto: 89990 } }] }],
          config: CFG('1f0b2c4e-03'),
        }),
        hl: ['"next": [', '"interrupts"'],
      },
      code: { file: 'run', hl: ['final = graph.invoke(Command(resume=True), config)'] },
    },
    {
      title: '7 · Fin o rama alternativa',
      body: 'El nodo devuelve `aprobado=True`, el reducer lo agrega al `audit_log` y el grafo llega a `END` (`next` vacío). Si la intención hubiera sido informativa, la arista condicional habría ido a `responder_faq`, sin aprobación.',
      flows: ['approval>end', 'router>faq', 'faq>end'],
      data: {
        title: 'final["audit_log"]',
        lang: 'json',
        content: json(['intent=REEMBOLSO', 'reembolso preparado: 89.990 CLP', 'aprobado=True']),
        hl: ['aprobado=True'],
      },
      code: { file: 'graph', hl: ['return {"audit_log": [f"aprobado={ok}"]}', 'builder.add_edge("aprobacion", END)', 'builder.add_edge("responder_faq", END)', 'graph = builder.compile(checkpointer=InMemorySaver())'] },
    },
  ],
}

export const langgraphSupervisor: IsoSpec = {
  id: 'langgraph-supervisor',
  title: 'Patrón supervisor con especialistas',
  summary:
    'En el patrón **supervisor**, un agente central decide a qué especialista delegar. Con LangChain 1.x cada especialista es un agente de `create_agent` (un grafo compilado de LangGraph) envuelto como **herramienta** del supervisor, que conserva el control. El **checkpointer** guarda el estado por thread (y habilita la aprobación humana) y el **store** guarda memoria de largo plazo entre threads. En **Datos**, los mensajes de LangChain (`tool_calls`, `ToolMessage`) y la pausa de aprobación; en **Código**, `supervisor.py` del artículo y una versión ilustrativa con HITL y store.',
  height: 480,
  nodes: [
    { id: 'user', label: 'Cliente banca', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Escribe al asistente del banco: *"No reconozco un cargo de ayer y quiero bloquear la tarjeta"*.' },
    { id: 'sup', label: 'Supervisor', sub: 'create_agent + tools', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'router', info: 'Agente cuyas herramientas son los especialistas. Decide el orden, consolida resultados y responde. Con LangChain 1.x se construye con `create_agent`.' },
    { id: 'cards', label: 'Tarjetas', sub: 'agente como tool', at: [6.8, -3.4], shape: 'tall', tone: 'agent', icon: 'card', scale: 0.85, info: 'Agente `cards_agent` envuelto en la herramienta `tarjetas`. Bloquear es irreversible: el `HumanInTheLoopMiddleware` del supervisor pausa **antes** de llamarla.' },
    { id: 'disputes', label: 'Disputas', sub: 'agente como tool', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'scroll', scale: 0.85, info: 'Agente `disputes_agent` envuelto en la herramienta `disputas`: abre la disputa de un cargo y devuelve el folio. Corre con su propio contexto.' },
    { id: 'faq', label: 'Productos', sub: 'agente de consulta', at: [6.8, 3.4], shape: 'tall', tone: 'agent', icon: 'book', scale: 0.85, info: 'Especialista ilustrativo que responde sobre productos y comisiones desde el tarifario. Solo lectura.' },
    { id: 'core', label: 'Core bancario', sub: 'API vía MCP', at: [10.2, -1.7], shape: 'box', tone: 'tool', icon: 'server', info: 'Sistemas transaccionales expuestos como herramientas de los especialistas. Las de escritura requieren aprobación (middleware HITL o `interrupt`).' },
    { id: 'store', label: 'Store', sub: 'memoria largo plazo', at: [3.4, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'El *store* de LangGraph guarda memoria entre threads (preferencias, hechos del cliente) por namespace, a diferencia del checkpointer, que es por thread.' },
  ],
  edges: [
    { from: 'user', to: 'sup' },
    { from: 'sup', to: 'cards', route: 'z' },
    { from: 'sup', to: 'disputes' },
    { from: 'sup', to: 'faq', route: 'z' },
    { from: 'cards', to: 'core' },
    { from: 'disputes', to: 'core' },
    { from: 'store', to: 'sup', dashed: true, route: 'z' },
  ],
  code: {
    sup: { title: 'supervisor.py', lang: 'python', source: SUPERVISOR },
    prod: { title: 'supervisor_hitl.py (ilustrativo)', lang: 'python', source: SUPERVISOR_PROD },
  },
  steps: [
    {
      title: '1 · Petición compuesta y memoria',
      body: 'El cliente pide dos cosas a la vez. El thread `chat-881-20261106` guarda esta conversación; el **store** guarda lo que sobrevive entre conversaciones, por namespace: aquí, que es cliente premium y prefiere WhatsApp (lo lee una herramienta o un middleware y lo suma al contexto).',
      flows: ['user>sup', 'store>sup'],
      data: {
        title: 'item del store (namespace, key, value)',
        lang: 'json',
        content: json({ namespace: ['clientes', 'cliente-881'], key: 'perfil', value: { segmento: 'premium', canal: 'whatsapp' } }),
        hl: ['"namespace"', '"value"'],
      },
      code: { file: 'prod', hl: ['store = InMemoryStore()', 'store.put(("clientes", "cliente-881")', 'store=store,'] },
    },
    {
      title: '2 · Delegar el bloqueo (con pausa)',
      body: 'El modelo del supervisor pide la herramienta `tarjetas`. Como el middleware tiene `interrupt_on={"tarjetas": True}`, el agente **se pausa antes de ejecutarla** y el checkpoint guarda el estado. El cliente confirma y la app reanuda con `Command(resume=...)`; recién entonces corre el especialista y bloquea en el core.',
      flows: ['sup>cards', 'cards>core'],
      data: {
        title: 'payload del interrupt y reanudación (forma simplificada)',
        lang: 'json',
        content: json({
          __interrupt__: [
            {
              value: {
                action_requests: [{ name: 'tarjetas', args: { solicitud: 'Bloquear tarjeta terminada en 4417 por cargo no reconocido' } }],
                review_configs: [{ action_name: 'tarjetas', allowed_decisions: ['approve', 'edit', 'reject'] }],
              },
            },
          ],
          resume: { decisions: [{ type: 'approve' }] },
        }),
        hl: ['"action_requests"', '"allowed_decisions"', '"resume"'],
      },
      code: { file: 'prod', hl: ['HumanInTheLoopMiddleware(interrupt_on={"tarjetas": True})', 'checkpointer=InMemorySaver(),'] },
    },
    {
      title: '3 · Delegar la disputa',
      body: 'Luego delega en `disputas`. La herramienta invoca a `disputes_agent` con su propio historial y devuelve **solo** el último mensaje: el supervisor recibe el folio, no la conversación interna del especialista.',
      flows: ['sup>disputes', 'disputes>core', 'disputes>sup'],
      data: {
        title: 'messages del supervisor (nuevos, formato LangChain)',
        lang: 'json',
        content: json([
          { type: 'ai', content: '', tool_calls: [{ name: 'disputas', args: { solicitud: 'Cargo no reconocido 2026-11-05, 189.990 CLP, comercio Electro Sur SpA, tarjeta 4417' }, id: 'call_02', type: 'tool_call' }] },
          { type: 'tool', name: 'disputas', tool_call_id: 'call_02', content: 'Disputa abierta. Folio DSP-77812. Abono provisorio en 5 días hábiles.' },
        ]),
        hl: ['"tool_calls"', '"tool_call_id"', 'DSP-77812'],
      },
      code: { file: 'sup', hl: ['def disputas(solicitud: str)', 'r = disputes_agent.invoke(', 'return r["messages"][-1].content'] },
    },
    {
      title: '4 · Consulta informativa',
      body: 'El cliente pregunta si le cobrarán la reposición. El supervisor consulta al especialista de **Productos**, de solo lectura, que responde citando el tarifario.',
      flows: ['sup>faq', 'faq>sup'],
      data: {
        title: 'messages del supervisor (nuevos)',
        lang: 'json',
        content: json([
          { type: 'human', content: '¿Me van a cobrar la tarjeta nueva?' },
          { type: 'ai', content: '', tool_calls: [{ name: 'productos', args: { pregunta: 'Costo de reposición de tarjeta por bloqueo, segmento premium' }, id: 'call_03', type: 'tool_call' }] },
          { type: 'tool', name: 'productos', tool_call_id: 'call_03', content: 'Tarifario 2026, punto 3.1: reposición sin costo para segmento premium.' },
        ]),
        hl: ['"name": "productos"'],
      },
      code: { file: 'prod', hl: ['def productos(pregunta: str)', 'tools=[disputas, tarjetas, productos]'] },
    },
    {
      title: '5 · Respuesta consolidada',
      body: 'El supervisor responde con el folio, el estado del bloqueo y la condición de reposición. Todo quedó en los checkpoints del mismo thread: si el cliente vuelve mañana con ese `thread_id`, la conversación continúa donde quedó.',
      flows: ['sup>user'],
      data: {
        title: 'último mensaje del supervisor',
        lang: 'json',
        content: json({ type: 'ai', content: 'Listo: bloqueé tu tarjeta terminada en 4417 y abrí la disputa DSP-77812 por 189.990 CLP. La reposición no tiene costo para ti; te avisaremos por WhatsApp cuando se despache.' }),
        hl: ['DSP-77812'],
      },
      code: { file: 'sup', hl: ['supervisor = create_agent(', 'tools=[disputas, tarjetas]'] },
    },
  ],
}
