import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ────────────────────────────────────────────────────────────────────────────
 * Código reutilizado literalmente de src/content/orquestacion-avanzada.mdx
 * ──────────────────────────────────────────────────────────────────────────── */

const APROBACION_LG = `from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver   # en producción: PostgresSaver
from langgraph.types import interrupt, Command

class Caso(TypedDict):
    cliente: str
    monto_nc: float
    decision: dict

def aprobar(state: Caso):
    if state["monto_nc"] <= 1000:                       # bajo el umbral: sin pausa
        return {"decision": {"aprobado": True, "monto": state["monto_nc"]}}
    # Pausa: persiste el estado y devuelve este payload a quien invocó el grafo
    decision = interrupt({"pregunta": "¿Apruebas la nota de crédito?",
                          "cliente": state["cliente"], "monto": state["monto_nc"]})
    return {"decision": decision}

def ejecutar(state: Caso):
    if state["decision"]["aprobado"]:
        erp.emitir_nc(state["cliente"], state["decision"]["monto"],
                      idempotency_key=f"nc-{state['cliente']}-88123")
    return {}

builder = StateGraph(Caso)
builder.add_node("aprobar", aprobar)
builder.add_node("ejecutar", ejecutar)
builder.add_edge(START, "aprobar")
builder.add_edge("aprobar", "ejecutar")
builder.add_edge("ejecutar", END)
graph = builder.compile(checkpointer=InMemorySaver())

config = {"configurable": {"thread_id": "disputa-88123"}}
graph.invoke({"cliente": "Andina SpA", "monto_nc": 1450.0}, config)   # se pausa
# ...horas después, desde la UI de aprobaciones (otro proceso, mismo thread_id):
graph.invoke(Command(resume={"aprobado": True, "monto": 1200.0}), config)`

/** Fragmento ilustrativo: supervisor con especialistas de contexto aislado (agents-as-tools de Strands). */
const SUPERVISOR = `from strands import Agent, tool

HAIKU = "global.anthropic.claude-haiku-5-5"

def especialista(prompt: str, tools: list) -> Agent:
    """Cada especialista nace con su propia ventana y herramientas mínimas."""
    return Agent(model=HAIKU, system_prompt=prompt, tools=tools, callback_handler=None)

@tool
def investigador_erp(brief: str) -> str:
    """Consulta facturas, guías de despacho y pagos (solo lectura). Devuelve un resumen con IDs."""
    return str(especialista("Investigas en el ERP. Máximo 10 líneas, cita IDs de documentos.",
                            [ver_factura, ver_guias, ver_pagos])(brief))

@tool
def analista_contrato(brief: str) -> str:
    """Busca en el contrato marco las condiciones de flete y penalidades. Devuelve citas."""
    return str(especialista("Respondes solo con cláusulas citadas textualmente.", [buscar_contrato])(brief))

@tool
def redactor(brief: str) -> str:
    """Redacta la resolución propuesta (JSON con monto_nc) y el correo al cliente. No ejecuta nada."""
    return str(especialista("Redactas propuestas de nota de crédito y correos formales.", [])(brief))

supervisor = Agent(
    model="global.anthropic.claude-sonnet-5-5",
    tools=[investigador_erp, analista_contrato, redactor],   # ninguna herramienta escribe en el ERP
    system_prompt=(
        "Resuelves disputas de cobro de clientes empresa. Delega con un brief que incluya "
        "objetivo, formato de salida, fuentes y límites. Nunca ejecutes acciones: propón."
    ),
)
propuesta = supervisor("Andina SpA disputa la factura 88123 por cobro duplicado de fletes")
# La propuesta entra al grafo de aprobación (aprobacion_langgraph.py):
# graph.invoke({"cliente": "Andina SpA", "monto_nc": 1450.0}, config)`

const SWARM_RECLAMOS = `from strands import Agent
from strands.multiagent import Swarm

MODEL = "global.anthropic.claude-sonnet-5-5"
triage = Agent(name="triage", model=MODEL,
    system_prompt="Entiende el reclamo y transfiere al especialista. No resuelvas tú.")
logistica = Agent(name="logistica", model=MODEL, tools=[ver_despacho],
    system_prompt="Verificas despachos y faltantes. Transfiere a facturación si hay cobros.")
facturacion = Agent(name="facturacion", model=MODEL, tools=[ver_cobros],
    system_prompt="Detectas cobros incorrectos. Transfiere a reembolsos para devolver.")
reembolsos = Agent(name="reembolsos", model=MODEL, tools=[emitir_reembolso],
    system_prompt="Emites reembolsos dentro de la política y respondes al cliente.")

swarm = Swarm(
    [triage, logistica, facturacion, reembolsos],
    entry_point=triage,
    max_handoffs=8,                         # por defecto 20: ajústalo a tu caso
    max_iterations=12,
    execution_timeout=300.0,                # 5 min para todo el swarm
    node_timeout=90.0,                      # por agente
    repetitive_handoff_detection_window=6,  # detección de ping-pong (desactivada por defecto)
    repetitive_handoff_min_unique_agents=3,
)

result = swarm("Pedido 4512 llegó incompleto y me cobraron el envío dos veces")
print(result.status)                                     # COMPLETED, FAILED…
print(" → ".join(n.node_id for n in result.node_history))
print(result.accumulated_usage)                          # tokens: vigila el costo`

/** Fragmentos ilustrativos de ejecución durable con Temporal (SDK de Python). */
const WORKFLOW = `from datetime import timedelta
from temporalio import activity, workflow
from temporalio.common import RetryPolicy

@activity.defn
async def clasificar_reclamo(reclamo: dict) -> dict:
    """Llamada al LLM (no determinista): su resultado queda en el historial."""
    return await llm.clasificar(reclamo["descripcion"])

@activity.defn
async def consultar_garantia(serie: str) -> dict:
    return await garantias_api.get(serie)                     # API externa

@activity.defn
async def redactar_diagnostico(datos: dict) -> str:
    partes = []
    async for chunk in llm.stream(f"Diagnóstico para el técnico: {datos}"):
        partes.append(chunk)
        activity.heartbeat()                                  # si el worker muere, el motor lo nota
    return "".join(partes)

@activity.defn
async def emitir_reemplazo(reclamo_id: str, serie: str) -> str:
    return await garantias_api.reemplazo(serie, idempotency_key=f"reemplazo-{reclamo_id}")

OPTS = dict(start_to_close_timeout=timedelta(minutes=5), heartbeat_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(maximum_attempts=5))

@workflow.defn
class ReclamoGarantia:
    def __init__(self) -> None:
        self.aprobado: bool | None = None
        self.diagnostico = ""

    @workflow.signal
    def aprobacion(self, aprobado: bool) -> None:             # llega horas o días después
        self.aprobado = aprobado

    @workflow.run
    async def run(self, reclamo: dict) -> str:                # determinista: sin LLM ni I/O directo
        clasif = await workflow.execute_activity(clasificar_reclamo, reclamo, **OPTS)
        garantia = await workflow.execute_activity(consultar_garantia, reclamo["serie"], **OPTS)
        self.diagnostico = await workflow.execute_activity(redactar_diagnostico, {**clasif, **garantia}, **OPTS)
        await workflow.wait_condition(lambda: self.aprobado is not None)   # espera sin cómputo
        if not self.aprobado:
            return "rechazado por el técnico"
        return await workflow.execute_activity(emitir_reemplazo, args=[reclamo["id"], reclamo["serie"]], **OPTS)`

const DISPARO = `from temporalio.client import Client
from temporalio.worker import Worker
from garantia_workflow import (ReclamoGarantia, clasificar_reclamo, consultar_garantia,
                               redactar_diagnostico, emitir_reemplazo)

async def worker():                                   # corre en cada réplica: Worker A, Worker B…
    client = await Client.connect("temporal.interno:7233")
    await Worker(client, task_queue="garantias", workflows=[ReclamoGarantia],
                 activities=[clasificar_reclamo, consultar_garantia,
                             redactar_diagnostico, emitir_reemplazo]).run()

async def on_evento_reclamo(evento: dict):            # consumidor de EventBridge / SQS
    client = await Client.connect("temporal.interno:7233")
    await client.start_workflow(ReclamoGarantia.run, evento["detail"],
                                id=f"reclamo-{evento['detail']['id']}",   # ID de negocio: sin duplicados
                                task_queue="garantias")

async def on_aprobacion_tecnico(reclamo_id: str, aprobado: bool):   # UI del técnico, días después
    client = await Client.connect("temporal.interno:7233")
    handle = client.get_workflow_handle(f"reclamo-{reclamo_id}")
    await handle.signal(ReclamoGarantia.aprobacion, aprobado)`

/* ────────────────────────────────────────────────────────────────────────────
 * Supervisor: disputa de Andina SpA (factura 88123)
 * ──────────────────────────────────────────────────────────────────────────── */

export const orquestacionSupervisor: IsoSpec = {
  id: 'orquestacion-supervisor',
  title: 'Supervisor con especialistas y aprobación humana',
  summary:
    'Un **supervisor** descompone el caso y delega en especialistas con contexto aislado. Antes de cualquier acción de escritura, una **política de riesgo** determinista decide si hace falta **aprobación humana**; el estado queda en un checkpoint para poder esperar horas sin perder nada. Ejemplo: Andina SpA disputa la factura 88123. En **Código**, un supervisor ilustrativo (agents-as-tools de Strands) y `aprobacion_langgraph.py` del artículo; en **Datos**, los briefs y resúmenes que viajan, el `interrupt` y la escritura idempotente.',
  height: 500,
  nodes: [
    { id: 'user', label: 'Ejecutivo de cuenta', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Abre el caso: "El cliente Andina SpA disputa la factura 88123 por cobro duplicado de fletes".' },
    { id: 'sup', label: 'Supervisor', sub: 'planifica y sintetiza', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'workflow', info: 'Decide qué especialistas invocar, con qué brief y en qué orden. Recibe resúmenes, no transcripciones completas. Suele usar el modelo más capaz (aquí Sonnet; los especialistas, Haiku).' },
    { id: 's1', label: 'Investigador ERP', sub: 'solo lectura', at: [3.4, -3.4], shape: 'box', tone: 'tool', icon: 'search', info: 'Consulta facturas, guías de despacho y pagos. Herramientas de lectura únicamente: su contexto se llena de datos que el supervisor nunca verá completos.' },
    { id: 's2', label: 'Analista de contrato', sub: 'RAG sobre contratos', at: [6.8, -3.4], shape: 'box', tone: 'data', icon: 'book', info: 'Busca en el contrato marco las condiciones de flete y penalidades aplicables. Devuelve citas.' },
    { id: 's3', label: 'Redactor', sub: 'propuesta y correo', at: [10.2, -3.4], shape: 'box', tone: 'model', icon: 'mail', info: 'Redacta la resolución propuesta (nota de crédito) y el correo al cliente, sin ejecutar nada.' },
    { id: 'gate', label: 'Política de riesgo', sub: 'monto · tipo de acción', at: [6.8, 0], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Regla determinista en código: notas de crédito sobre USD 1.000, o cualquier acción irreversible, requieren aprobación. El LLM no puede saltarse este nodo.' },
    { id: 'human', label: 'Aprobador', sub: 'finanzas', at: [6.8, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'Recibe la propuesta con evidencia y decide: aprobar, editar o rechazar. Puede tardar minutos o días.' },
    { id: 'erp', label: 'ERP (escritura)', sub: 'nota de crédito', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'La acción real, con idempotency key para que un reintento no emita dos notas de crédito.' },
    { id: 'ckpt', label: 'Checkpoint', sub: 'thread disputa-88123', at: [10.2, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Estado persistido tras cada paso. Permite pausar mientras el humano decide y reanudar exactamente en el mismo punto, incluso en otro proceso.' },
  ],
  edges: [
    { from: 'user', to: 'sup' },
    { from: 'sup', to: 's1', route: 'z' },
    { from: 'sup', to: 's2', route: 'x' },
    { from: 'sup', to: 's3', route: 'x' },
    { from: 'sup', to: 'gate' },
    { from: 'gate', to: 'human', label: 'interrupt', route: 'z' },
    { from: 'gate', to: 'erp', label: 'aprobado' },
    { from: 'gate', to: 'ckpt', route: 'arc', dashed: true },
  ],
  code: {
    sup: { title: 'supervisor_disputas.py (ilustrativo)', lang: 'python', source: SUPERVISOR },
    hitl: { title: 'aprobacion_langgraph.py', lang: 'python', source: APROBACION_LG },
  },
  steps: [
    {
      title: '1 · Caso abierto',
      body: 'El ejecutivo plantea el caso. El supervisor no tiene herramientas de escritura: solo puede **delegar** en tres especialistas y proponer. Su prompt le exige briefs completos.',
      flows: ['user>sup'],
      data: {
        title: 'supervisor.messages',
        lang: 'json',
        content: json([{ role: 'user', content: [{ text: 'Andina SpA disputa la factura 88123 por cobro duplicado de fletes' }] }]),
        hl: ['88123'],
      },
      code: { file: 'sup', hl: ['supervisor = Agent(', 'tools=[investigador_erp, analista_contrato, redactor]', 'Nunca ejecutes acciones: propón.'] },
    },
    {
      title: '2 · Especialistas con contexto aislado',
      body: 'Cada delegación lleva un **brief** con objetivo, formato, fuentes y límites. El investigador puede revisar 40 documentos, pero al supervisor solo vuelve un resumen con IDs; lo mismo el analista de contrato, con citas.',
      flows: ['sup>s1', 's1>sup', 'sup>s2', 's2>sup'],
      data: {
        title: 'brief enviado y resúmenes recibidos',
        lang: 'json',
        content: json([
          { toolUse: { name: 'investigador_erp', input: { brief: 'Objetivo: verificar si la factura 88123 cobra dos veces el mismo flete. Formato: máx. 10 líneas con IDs. Fuentes: factura, guías, pagos. Límite: solo lectura.' } } },
          { toolResult: { content: [{ text: 'Factura 88123 cobra dos veces el flete de USD 1.450 de la guía GD-5512. El 12-10 hubo un re-despacho (GD-5519) pedido por el cliente, no facturado aparte.' }] } },
          { toolResult: { content: [{ text: 'Contrato marco, cl. 7.2: el re-despacho a pedido del cliente tiene un cargo fijo de USD 250.' }] } },
        ]),
        hl: ['"brief"', 'GD-5519', 'cl. 7.2'],
      },
      code: { file: 'sup', hl: ['def especialista(', 'def investigador_erp(brief: str)', 'def analista_contrato(brief: str)'] },
    },
    {
      title: '3 · Propuesta',
      body: 'El redactor arma la propuesta como JSON. Nótese que propone acreditar el flete duplicado completo (USD 1.450) y olvida el cargo de re-despacho de la cláusula 7.2: justo el tipo de error que una revisión humana debe poder corregir. **Nada se ha ejecutado** todavía.',
      flows: ['sup>s3', 's3>sup'],
      data: {
        title: 'propuesta del redactor',
        lang: 'json',
        content: json({ cliente: 'Andina SpA', factura: 88123, monto_nc: 1450.0, motivo: 'Cobro duplicado de flete', evidencia: ['GD-5512', 'GD-5519', 'Contrato marco cl. 7.2'], correo: 'Estimados, hemos revisado la factura 88123…' }),
        hl: ['"monto_nc": 1450'],
      },
      code: { file: 'sup', hl: ['def redactor(brief: str)', 'propuesta = supervisor('] },
    },
    {
      title: '4 · Política de riesgo',
      body: 'La propuesta entra al grafo de aprobación. `aprobar` es código: como 1.450 supera el umbral de 1.000, llama `interrupt(...)`; el grafo guarda el checkpoint del thread `disputa-88123` y devuelve el payload a la UI de aprobaciones.',
      flows: ['sup>gate', 'gate>ckpt'],
      data: {
        title: 'resultado de graph.invoke: __interrupt__ (forma simplificada)',
        lang: 'json',
        content: json({ __interrupt__: [{ value: { pregunta: '¿Apruebas la nota de crédito?', cliente: 'Andina SpA', monto: 1450.0 } }] }),
        hl: ['"__interrupt__"', '"monto": 1450'],
      },
      code: { file: 'hitl', hl: ['if state["monto_nc"] <= 1000', 'decision = interrupt(', 'graph.invoke({"cliente": "Andina SpA", "monto_nc": 1450.0}, config)'] },
    },
    {
      title: '5 · Humano en el loop',
      body: 'Horas después, el aprobador revisa la evidencia y **edita** el monto: descuenta el cargo fijo de re-despacho de USD 250 (cl. 7.2) y acredita USD 1.200. La UI reanuda con `Command(resume=...)` y el mismo `thread_id`; `aprobar` se re-ejecuta y esta vez `interrupt()` devuelve la decisión.',
      flows: ['gate>human', 'human>gate', 'ckpt>gate'],
      data: {
        title: 'Command(resume=...) desde la UI de aprobaciones',
        lang: 'json',
        content: json({ config: { configurable: { thread_id: 'disputa-88123' } }, resume: { aprobado: true, monto: 1200.0 } }),
        hl: ['"resume"', '"monto": 1200'],
      },
      code: { file: 'hitl', hl: ['config = {"configurable": {"thread_id": "disputa-88123"}}', 'graph.invoke(Command(resume={"aprobado": True, "monto": 1200.0}), config)'] },
    },
    {
      title: '6 · Ejecución idempotente',
      body: 'Solo ahora se escribe en el ERP, con una **clave de idempotencia** derivada del caso: si el nodo se reintenta tras una caída, el ERP reconoce la clave y no emite una segunda nota de crédito. El supervisor confirma al ejecutivo.',
      flows: ['gate>erp', 'sup>user'],
      data: {
        title: 'llamada al ERP (ilustrativo)',
        lang: 'http',
        content: ['POST /api/notas-credito HTTP/1.1', 'Host: erp.interno', 'Idempotency-Key: nc-Andina SpA-88123', 'Content-Type: application/json', '', json({ cliente: 'Andina SpA', factura: 88123, monto_usd: 1200.0 })].join('\n'),
        hl: ['Idempotency-Key'],
      },
      code: { file: 'hitl', hl: ['def ejecutar(state: Caso)', 'erp.emitir_nc(', 'idempotency_key=f"nc-'] },
    },
  ],
}

/* ────────────────────────────────────────────────────────────────────────────
 * Swarm: reclamo del pedido 4512
 * ──────────────────────────────────────────────────────────────────────────── */

const RECLAMO = 'Pedido 4512 llegó incompleto y me cobraron el envío dos veces'

export const orquestacionSwarm: IsoSpec = {
  id: 'orquestacion-swarm',
  title: 'Swarm: handoffs entre pares',
  summary:
    'En un **swarm** no hay jefe: cada agente puede **transferir** el control a otro con la herramienta `handoff_to_agent`, compartiendo el contexto de la tarea. Es flexible, pero necesita **límites** de handoffs y detección de ping-pong. El diagrama de secuencia muestra el recorrido del reclamo del pedido 4512; en **Datos**, los handoffs y el `SwarmResult`, y en **Código**, `swarm_reclamos.py` del artículo.',
  height: 470,
  layout: 'sequence',
  lanes: ['user', 'triage', 'logis', 'billing', 'refund', 'ctx', 'limits'],
  nodes: [
    { id: 'user', label: 'Cliente', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: '"Pedido 4512 llegó incompleto y me cobraron el envío dos veces."' },
    { id: 'triage', label: 'Triage', sub: 'entry point', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'router', info: 'Punto de entrada del swarm. Entiende el caso y transfiere; su prompt le prohíbe resolver.' },
    { id: 'logis', label: 'Logística', sub: 'ver_despacho', at: [6.8, -3.4], shape: 'tall', tone: 'agent', icon: 'boxes', scale: 0.9, info: 'Verifica el despacho y confirma el faltante. Luego transfiere a facturación con un mensaje de contexto.' },
    { id: 'billing', label: 'Facturación', sub: 'ver_cobros', at: [6.8, 3.4], shape: 'tall', tone: 'agent', icon: 'card', scale: 0.9, info: 'Detecta el cobro duplicado de envío y transfiere a reembolsos.' },
    { id: 'refund', label: 'Reembolsos', sub: 'emitir_reembolso', at: [10.2, 0], shape: 'tall', tone: 'agent', icon: 'repeat', scale: 0.9, info: 'Emite el reembolso dentro de la política y redacta la respuesta final al cliente. Como no transfiere, el swarm termina.' },
    { id: 'ctx', label: 'Contexto compartido', sub: 'historial de handoffs', at: [3.4, 3.4], shape: 'doc', tone: 'memory', icon: 'layers', info: 'Todos los agentes ven la tarea original, la lista de agentes que ya participaron y el `context` que dejaron en cada handoff.' },
    { id: 'limits', label: 'Límites', sub: 'max_handoffs · timeout', at: [10.2, -3.4], shape: 'hex', tone: 'guard', icon: 'gauge', info: 'Máximo de handoffs e iteraciones, timeout total y por nodo, y detección de handoffs repetitivos entre los mismos agentes.' },
  ],
  edges: [
    { from: 'user', to: 'triage' },
    { from: 'triage', to: 'logis', label: 'handoff', route: 'z' },
    { from: 'logis', to: 'billing', label: 'handoff', route: 'arc' },
    { from: 'billing', to: 'refund', label: 'handoff', route: 'x' },
    { from: 'ctx', to: 'triage', route: 'z', dashed: true },
    { from: 'limits', to: 'refund', route: 'z', dashed: true },
  ],
  code: { swarm: { title: 'swarm_reclamos.py', lang: 'python', source: SWARM_RECLAMOS } },
  steps: [
    {
      title: '1 · Entrada',
      body: 'El caso entra por el agente de triage, definido como `entry_point`. Strands le inyecta `handoff_to_agent`; su prompt le dice que no resuelva él.',
      flows: ['user>triage: swarm(reclamo)'],
      data: { title: 'tarea original', lang: 'text', content: RECLAMO },
      code: { hl: ['triage = Agent(name="triage"', 'entry_point=triage,', 'result = swarm('] },
    },
    {
      title: '2 · Primer handoff',
      body: 'Triage transfiere a logística con un mensaje que resume lo entendido y un `context` estructurado. El control pasa **por completo**.',
      flows: ['triage>logis: handoff_to_agent', 'triage>ctx: context'],
      data: {
        title: 'toolUse de triage',
        lang: 'json',
        content: json({ toolUse: { name: 'handoff_to_agent', input: { agent_name: 'logistica', message: 'Dos problemas: faltante en pedido 4512 y posible cobro doble de envío. Empieza por el faltante.', context: { pedido: '4512', temas: ['faltante', 'cobro_envio'] } } } }),
        hl: ['"agent_name": "logistica"', '"context"'],
      },
      code: { hl: ['logistica = Agent(name="logistica"', 'tools=[ver_despacho]'] },
    },
    {
      title: '3 · Handoffs encadenados',
      body: 'Logística confirma con `ver_despacho` que faltó 1 de 3 ítems y transfiere a facturación, que con `ver_cobros` detecta el envío cobrado dos veces y transfiere a reembolsos.',
      flows: ['logis>ctx: context', 'logis>billing: handoff_to_agent', 'billing>refund: handoff_to_agent'],
      data: {
        title: 'handoffs de logística y facturación',
        lang: 'json',
        content: json([
          { agent: 'logistica', toolUse: { name: 'handoff_to_agent', input: { agent_name: 'facturacion', message: 'Faltante confirmado: audífonos SKU AU-220 (19.990 CLP) no despachados.', context: { faltante: { sku: 'AU-220', monto: 19990 } } } } },
          { agent: 'facturacion', toolUse: { name: 'handoff_to_agent', input: { agent_name: 'reembolsos', message: 'Envío cobrado 2 veces (3.990 CLP). Devolver envío duplicado + ítem faltante.', context: { cobro_duplicado: 3990 } } } },
        ]),
        hl: ['"agent_name": "facturacion"', '"agent_name": "reembolsos"'],
      },
      code: { hl: ['facturacion = Agent(name="facturacion"', 'Transfiere a reembolsos para devolver.'] },
    },
    {
      title: '4 · Contexto compartido',
      body: 'Reembolsos no habló con nadie, pero recibe la tarea original, quién participó antes y lo que cada uno dejó. Sin esto, cada handoff perdería información y el último agente tendría que volver a preguntar.',
      flows: ['ctx>refund: entrada del nodo'],
      data: {
        title: 'entrada del nodo reembolsos (forma simplificada)',
        lang: 'text',
        content: [
          'Handoff Message: Envío cobrado 2 veces (3.990 CLP). Devolver envío duplicado + ítem faltante.',
          '',
          `User Request: ${RECLAMO}`,
          '',
          'Previous agents who worked on this: triage → logistica → facturacion',
          '',
          'Shared knowledge from previous agents:',
          '• triage: {"pedido": "4512", "temas": ["faltante", "cobro_envio"]}',
          '• logistica: {"faltante": {"sku": "AU-220", "monto": 19990}}',
          '• facturacion: {"cobro_duplicado": 3990}',
        ].join('\n'),
        hl: ['Previous agents', 'Shared knowledge'],
      },
    },
    {
      title: '5 · Límites',
      body: 'El swarm se corta si supera 8 handoffs o 12 iteraciones, 5 minutos en total, 90 s en un nodo, o si en los últimos 6 handoffs participan menos de 3 agentes distintos (ping-pong). Sin límites, un swarm puede girar indefinidamente.',
      focus: ['limits', 'refund'],
      data: {
        title: 'límites de este swarm',
        lang: 'json',
        content: json({ max_handoffs: 8, max_iterations: 12, execution_timeout: 300.0, node_timeout: 90.0, repetitive_handoff_detection_window: 6, repetitive_handoff_min_unique_agents: 3 }),
        hl: ['"max_handoffs": 8', '"repetitive_handoff_detection_window": 6'],
      },
      code: { hl: ['max_handoffs=8', 'max_iterations=12', 'execution_timeout=300.0', 'node_timeout=90.0', 'repetitive_handoff_detection_window=6', 'repetitive_handoff_min_unique_agents=3'] },
    },
    {
      title: '6 · Respuesta',
      body: 'Reembolsos emite la devolución y responde sin transferir: el swarm termina. El resultado muestra el recorrido completo y los tokens de **todos** los agentes, la cifra a vigilar.',
      flows: ['refund>user: respuesta final'],
      data: {
        title: 'SwarmResult (forma simplificada)',
        lang: 'json',
        content: json({
          status: 'COMPLETED',
          node_history: ['triage', 'logistica', 'facturacion', 'reembolsos'],
          accumulated_usage: { inputTokens: 11840, outputTokens: 1460, totalTokens: 13300 },
          results: { reembolsos: { result: 'Te devolvimos 23.980 CLP: 19.990 por los audífonos faltantes y 3.990 por el envío cobrado dos veces.' } },
        }),
        hl: ['"status": "COMPLETED"', '"node_history"', '"accumulated_usage"'],
      },
      code: { hl: ['print(result.status)', 'print(" → ".join(n.node_id for n in result.node_history))', 'print(result.accumulated_usage)'] },
    },
  ],
}

/* ────────────────────────────────────────────────────────────────────────────
 * Ejecución durable: reclamo de garantía R-7781
 * ──────────────────────────────────────────────────────────────────────────── */

export const orquestacionDurable: IsoSpec = {
  id: 'orquestacion-durable',
  title: 'Ejecución durable: checkpoint y reanudación tras una caída',
  summary:
    'En ejecución durable, el **motor** registra cada paso completado en un **historial**. Si el worker cae, otro retoma la ejecución: los pasos ya hechos (llamadas LLM, APIs) **no se repiten**; sus resultados se leen del historial. Así un agente puede esperar días una aprobación sin mantener un proceso vivo. El ejemplo usa Temporal con código ilustrativo; en **Datos** ves el historial de eventos (forma simplificada) y en **Código**, el workflow y quién lo dispara y le envía la señal.',
  height: 490,
  nodes: [
    { id: 'event', label: 'Evento de negocio', sub: 'EventBridge · SQS', at: [0, 0], shape: 'cloud', tone: 'infra', icon: 'zap', info: 'Un evento dispara el flujo: "reclamo de garantía R-7781 recibido". El agente no espera a que un humano abra un chat.' },
    { id: 'engine', label: 'Motor durable', sub: 'Temporal · Step Functions', at: [3.4, 0], shape: 'hex', tone: 'infra', icon: 'workflow', info: 'Orquesta el workflow: agenda pasos, aplica reintentos y timeouts, y persiste cada resultado. Ej.: Temporal (con la integración GA del OpenAI Agents SDK), AWS Step Functions, o checkpointers de LangGraph.' },
    { id: 'history', label: 'Historial de eventos', sub: 'resultados por paso', at: [3.4, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Registro append-only de cada paso completado y su resultado. Es lo que permite *replay*: reconstruir el estado sin volver a ejecutar efectos.' },
    { id: 'wa', label: 'Worker A', sub: 'cae a mitad de camino', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'bot', scale: 0.9, info: 'Ejecuta el código del workflow y sus activities. En el paso 3 el contenedor se reinicia por un despliegue. Sin durabilidad, se perdería todo el progreso.' },
    { id: 'wb', label: 'Worker B', sub: 'retoma la ejecución', at: [6.8, 3.4], shape: 'tall', tone: 'agent', icon: 'repeat', scale: 0.9, info: 'Otro worker de la misma task queue toma la tarea, reproduce el historial y continúa desde el último paso confirmado.' },
    { id: 'llm', label: 'Llamada LLM', sub: 'activity', at: [10.2, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Cada llamada al modelo es una *activity*: no determinista, con reintentos. Su resultado se guarda; en un replay no se vuelve a pagar.' },
    { id: 'api', label: 'API de garantías', sub: 'activity', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'Llamadas a sistemas externos, también como activities con reintentos e idempotencia.' },
    { id: 'human', label: 'Técnico', sub: 'señal de aprobación', at: [10.2, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'La aprobación llega como una **señal** (o un task token en Step Functions) horas o días después. Mientras tanto ningún proceso consume cómputo esperando.' },
  ],
  edges: [
    { from: 'event', to: 'engine' },
    { from: 'engine', to: 'history', route: 'z' },
    { from: 'engine', to: 'wa' },
    { from: 'engine', to: 'wb', route: 'z' },
    { from: 'wa', to: 'llm', route: 'x' },
    { from: 'wa', to: 'api' },
    { from: 'wb', to: 'human' },
    { from: 'human', to: 'engine', label: 'señal', route: 'arc', dashed: true },
  ],
  code: {
    wf: { title: 'garantia_workflow.py (ilustrativo)', lang: 'python', source: WORKFLOW },
    run: { title: 'disparo_y_senal.py (ilustrativo)', lang: 'python', source: DISPARO },
  },
  steps: [
    {
      title: '1 · Disparo por evento',
      body: 'El consumidor del evento inicia el workflow con un **ID de negocio** (`reclamo-R-7781`). Como SQS entrega "al menos una vez", un segundo intento con el mismo ID no crea una ejecución duplicada mientras la primera siga abierta.',
      flows: ['event>engine'],
      data: {
        title: 'evento recibido → start_workflow',
        lang: 'json',
        content: json({
          evento: { source: 'retail.postventa', 'detail-type': 'ReclamoGarantiaRecibido', detail: { id: 'R-7781', serie: 'NB-55-0192', descripcion: 'La pantalla del notebook parpadea y se apaga.' } },
          start_workflow: { workflow: 'ReclamoGarantia', id: 'reclamo-R-7781', task_queue: 'garantias' },
        }),
        hl: ['"id": "reclamo-R-7781"'],
      },
      code: { file: 'run', hl: ['async def on_evento_reclamo', 'client.start_workflow(ReclamoGarantia.run', 'id=f"reclamo-'] },
    },
    {
      title: '2 · Pasos como activities',
      body: 'El worker A ejecuta el workflow: clasificar el reclamo (LLM) y consultar la garantía (API) son *activities*. El código del workflow es determinista; cada resultado queda escrito en el historial.',
      flows: ['engine>wa', 'wa>llm', 'wa>api', 'engine>history'],
      data: {
        title: 'historial de eventos (forma simplificada)',
        lang: 'json',
        content: json([
          { eventId: 1, eventType: 'WorkflowExecutionStarted', input: { id: 'R-7781', serie: 'NB-55-0192' } },
          { eventId: 5, eventType: 'ActivityTaskScheduled', activityType: 'clasificar_reclamo' },
          { eventId: 7, eventType: 'ActivityTaskCompleted', result: { categoria: 'pantalla', cubierto: true } },
          { eventId: 11, eventType: 'ActivityTaskScheduled', activityType: 'consultar_garantia' },
          { eventId: 13, eventType: 'ActivityTaskCompleted', result: { vigente: true, vence: '2027-03-14' } },
        ]),
        hl: ['"ActivityTaskCompleted"', '"result"'],
      },
      code: { file: 'wf', hl: ['@activity.defn', 'async def clasificar_reclamo', 'execute_activity(clasificar_reclamo', 'execute_activity(consultar_garantia'] },
    },
    {
      title: '3 · Caída',
      body: 'Durante el tercer paso (redactar el diagnóstico con el LLM), un despliegue reinicia el contenedor del worker A. La activity deja de enviar `heartbeat` y, pasados 30 s, el motor la da por perdida y la vuelve a agendar según la `RetryPolicy`.',
      focus: ['wa'],
      data: {
        title: 'actividad pendiente (forma simplificada)',
        lang: 'json',
        content: json({
          pendingActivities: [{ activityType: 'redactar_diagnostico', attempt: 2, lastFailure: { message: 'activity Heartbeat timeout' }, lastWorkerIdentity: 'worker-a@pod-7f9c' }],
        }),
        hl: ['"attempt": 2', 'Heartbeat timeout'],
      },
      code: { file: 'wf', hl: ['activity.heartbeat()', 'heartbeat_timeout=timedelta(seconds=30)', 'retry_policy=RetryPolicy(maximum_attempts=5)'] },
    },
    {
      title: '4 · Replay y reanudación',
      body: 'El worker B toma la ejecución y **reproduce** el código del workflow desde el inicio: cada `execute_activity` ya completada devuelve su resultado del historial al instante. La clasificación y la consulta **no se repiten** (ni se vuelven a pagar); solo se reintenta la activity interrumpida.',
      flows: ['engine>wb', 'history>engine'],
      data: {
        title: 'qué hace el replay en el worker B',
        lang: 'text',
        content: [
          'execute_activity(clasificar_reclamo)    → evento 7: resultado leído del historial (no llama al LLM)',
          'execute_activity(consultar_garantia)    → evento 13: resultado leído del historial (no llama a la API)',
          'execute_activity(redactar_diagnostico)  → sin resultado: intento 2, se ejecuta en el worker B',
        ].join('\n'),
        hl: ['leído del historial', 'intento 2'],
      },
      code: { file: 'wf', hl: ['async def run(self, reclamo: dict)', 'self.diagnostico = await workflow.execute_activity(redactar_diagnostico'] },
    },
    {
      title: '5 · Espera larga',
      body: '`wait_condition` deja el workflow esperando la señal del técnico. No hay eventos nuevos ni activities pendientes: la ejecución puede quedar así días, sin un proceso dedicado consumiendo cómputo, y el historial garantiza que nada se pierde.',
      flows: ['wb>human'],
      data: {
        title: 'estado de la ejecución (forma simplificada)',
        lang: 'json',
        content: json({ workflowId: 'reclamo-R-7781', status: 'RUNNING', pendingActivities: [], esperando: 'señal "aprobacion"', diagnostico: 'Falla del flex de pantalla; reemplazo cubierto por garantía.' }),
        hl: ['"status": "RUNNING"', '"pendingActivities": []'],
      },
      code: { file: 'wf', hl: ['await workflow.wait_condition(lambda: self.aprobado is not None)'] },
    },
    {
      title: '6 · Señal y fin',
      body: 'Dos días después, la UI del técnico envía la señal `aprobacion`. El motor la anota en el historial, reanuda el workflow, ejecuta `emitir_reemplazo` con **clave de idempotencia** y cierra la ejecución con toda la traza.',
      flows: ['human>engine'],
      data: {
        title: 'historial (eventos finales, forma simplificada)',
        lang: 'json',
        content: json([
          { eventId: 24, eventType: 'WorkflowExecutionSignaled', signalName: 'aprobacion', input: [true] },
          { eventId: 30, eventType: 'ActivityTaskCompleted', activityType: 'emitir_reemplazo', result: 'RMP-3391' },
          { eventId: 34, eventType: 'WorkflowExecutionCompleted', result: 'RMP-3391' },
        ]),
        hl: ['"WorkflowExecutionSignaled"', '"WorkflowExecutionCompleted"'],
      },
      code: { file: 'run', hl: ['async def on_aprobacion_tecnico', 'client.get_workflow_handle(', 'handle.signal(ReclamoGarantia.aprobacion, aprobado)'] },
    },
  ],
}
