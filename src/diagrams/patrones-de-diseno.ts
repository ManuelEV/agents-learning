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

/* ════════════════════════════ 1 · Prompt chaining ════════════════════════════ */

/** Bloque `factura_workflow.py` del artículo (ADK 2.x). */
const FACTURA_WF = `import json
from google.adk import Agent, Event, Workflow

MODEL = "gemini-flash-latest"

extractor = Agent(name="extractor", model=MODEL,
    instruction="Extrae proveedor, monto, moneda y vencimiento. Responde solo JSON.")
redactor = Agent(name="redactor", model=MODEL,
    instruction="Propón la imputación contable de la factura validada.")

def gate(node_input: str):
    """Gate programático: valida en código antes de gastar otra llamada."""
    try:
        f = json.loads(node_input)
        ok = f["monto"] > 0 and f["moneda"] in ("CLP", "USD", "EUR")
    except (ValueError, KeyError, TypeError):
        ok = False
    return Event(route=["ok" if ok else "revisar"])

def a_revision(node_input: str) -> str:
    return "Factura enviada a la cola de revisión humana"

root_agent = Workflow(
    name="procesar_factura",
    edges=[
        ("START", extractor, gate),                            # secuencia
        (gate, {"ok": redactor, "revisar": a_revision}),       # gate → ruta
    ],
)`

/** Bloque `factura_graph.py` del artículo (Strands). */
const FACTURA_GRAPH = `from strands import Agent
from strands.multiagent import GraphBuilder

MODEL = "global.anthropic.claude-sonnet-5-5"
extractor = Agent(name="extractor", model=MODEL,
    system_prompt="Extrae proveedor, monto, moneda y vencimiento. Responde solo JSON.")
redactor = Agent(name="redactor", model=MODEL,
    system_prompt="Propón la imputación contable de la factura validada.")

def factura_valida(state) -> bool:
    """Gate: la arista solo se recorre si el paso anterior produjo un monto."""
    nodo = state.results.get("extraer")
    return bool(nodo) and '"monto"' in str(nodo.result)

builder = GraphBuilder()
builder.add_node(extractor, "extraer")
builder.add_node(redactor, "redactar")
builder.add_edge("extraer", "redactar", condition=factura_valida)
builder.set_entry_point("extraer")
graph = builder.build()
result = graph("Factura adjunta: ...")`

const FACTURA_TXT = `FACTURA ELECTRÓNICA N° 18342
Distribuidora Sur SpA · RUT 76.123.456-7
Emisión: 03-11-2026 · Vencimiento: 03-12-2026
Cliente: Retail Andino S.A.
Detalle: 250 u. polerón algodón talla M × $5.000
Neto: $1.250.000   IVA 19 %: $237.500   TOTAL: $1.487.500`

export const patronesChaining: IsoSpec = {
  id: 'patrones-chaining',
  title: 'Prompt chaining con gate',
  summary:
    'La tarea se descompone en **pasos LLM fijos**: cada llamada procesa la salida de la anterior. Entre pasos, un **gate programático** verifica que todo va bien antes de seguir. Ejemplo: procesar facturas de proveedores con el `Workflow` de ADK 2.x (`factura_workflow.py`); el último paso muestra lo mismo en un `Graph` de Strands.',
  height: 440,
  nodes: [
    { id: 'in', label: 'Factura PDF', sub: 'correo de proveedor', at: [0, 0], shape: 'doc', tone: 'user', icon: 'file', info: 'Entrada del flujo: una factura que llega por correo o a un bucket. El formato varía según el proveedor.' },
    { id: 'extract', label: 'Extraer campos', sub: 'LLM · extractor', at: [3.2, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Llamada LLM acotada: devuelve JSON con proveedor, monto, moneda y vencimiento. Un modelo pequeño suele bastar.' },
    { id: 'gate', label: 'Gate', sub: 'código · Event(route)', at: [6.4, 0], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Validación en **código**, no con un LLM: que el JSON parsee, monto positivo, moneda permitida. En producción también: proveedor existente en el maestro, monto coherente con la orden de compra.' },
    { id: 'draft', label: 'Redactar asiento', sub: 'LLM · redactor', at: [9.6, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Segundo paso LLM con entrada ya validada: propone la imputación contable y un resumen para el aprobador.' },
    { id: 'out', label: 'ERP', sub: 'borrador de asiento', at: [12.8, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'El resultado se registra como **borrador**, no como asiento definitivo. Un humano o una regla posterior lo confirma.' },
    { id: 'fail', label: 'Cola de revisión', sub: 'a_revision · humano', at: [6.4, 3.3], shape: 'person', tone: 'user', icon: 'hand', info: 'Cuando el gate falla, el caso va a una persona con el motivo exacto del rechazo. Mejor que reintentar a ciegas.' },
  ],
  edges: [
    { from: 'in', to: 'extract' },
    { from: 'extract', to: 'gate' },
    { from: 'gate', to: 'draft', label: 'ok' },
    { from: 'draft', to: 'out' },
    { from: 'gate', to: 'fail', label: 'revisar', dashed: true },
  ],
  code: {
    wf: { title: 'factura_workflow.py', lang: 'python', source: FACTURA_WF },
    graph: { title: 'factura_graph.py', lang: 'python', source: FACTURA_GRAPH },
  },
  steps: [
    {
      title: '1 · Entrada',
      body: 'Llega una factura (ya convertida a texto). El flujo es siempre el mismo: la ruta la definen las aristas del `Workflow`, no el modelo.',
      flows: ['in>extract'],
      data: { title: 'entrada: texto de la factura', lang: 'text', content: FACTURA_TXT, hl: ['TOTAL'] },
      code: { file: 'wf', hl: ['root_agent = Workflow(', '("START", extractor, gate)'] },
    },
    {
      title: '2 · Paso LLM acotado',
      body: 'El primer paso hace **una sola cosa**: extraer cuatro campos a JSON. Al acotar la tarea, cada llamada es más fácil y más precisa, y su salida es verificable con código.',
      focus: ['extract'],
      data: {
        title: 'salida del extractor (texto JSON)',
        lang: 'json',
        content: jsonc({ proveedor: 'Distribuidora Sur SpA', monto: 1487500, moneda: 'CLP', vencimiento: '2026-12-03' }),
        hl: ['"monto"', '"moneda"'],
      },
      code: { file: 'wf', hl: ['extractor = Agent(', 'instruction="Extrae proveedor'] },
    },
    {
      title: '3 · Gate programático',
      body: 'Antes de gastar otra llamada, el nodo función `gate` recibe el texto del extractor, lo parsea y aplica reglas. Devuelve `Event(route=["ok"])` o `["revisar"]`: es el punto que convierte un chaining en algo confiable.',
      flows: ['extract>gate'],
      data: {
        title: 'evaluación del gate (ilustrativo)',
        lang: 'json',
        content: jsonc({ json_valido: true, 'monto > 0': true, 'moneda permitida': true, Event: { route: ['ok'] } }),
        hl: ['"route"'],
      },
      code: { file: 'wf', hl: ['def gate(node_input: str)', 'json.loads(node_input)', 'ok = f["monto"] > 0', 'return Event(route='] },
    },
    {
      title: '4 · Camino feliz',
      body: 'Con la ruta `ok`, el redactor recibe la factura **ya validada** y propone el asiento. Se registra como borrador en el ERP: un humano o una regla posterior lo confirma.',
      flows: ['gate>draft', 'draft>out'],
      data: {
        title: 'propuesta del redactor (borrador)',
        lang: 'json',
        content: jsonc({
          estado: 'borrador',
          glosa: 'Factura 18342 · Distribuidora Sur SpA · vence 03-12-2026',
          lineas: [
            { cuenta: 'Mercaderías', debe: 1250000 },
            { cuenta: 'IVA crédito fiscal', debe: 237500 },
            { cuenta: 'Proveedores · Distribuidora Sur SpA', haber: 1487500 },
          ],
        }),
        hl: ['"estado"', '"lineas"'],
      },
      code: { file: 'wf', hl: ['redactor = Agent(', '(gate, {"ok": redactor'] },
    },
    {
      title: '5 · Camino de excepción',
      body: 'Otra factura viene en **UF**, una moneda que la regla no admite. El gate devuelve `revisar` y el caso sale del flujo hacia una persona, sin gastar la segunda llamada. Latencia total = suma de pasos: cambias velocidad por precisión.',
      flows: ['gate>fail'],
      data: {
        title: 'otra factura: salida del extractor → ruta del gate',
        lang: 'json',
        content: jsonc({
          extractor: { proveedor: 'Servicios Norte Ltda.', monto: 42.5, moneda: 'UF', vencimiento: '2026-11-30' },
          gate: { 'moneda permitida': false, Event: { route: ['revisar'] } },
          resultado: 'Factura enviada a la cola de revisión humana',
        }),
        hl: ['"moneda": "UF"', '"revisar"'],
      },
      code: { file: 'wf', hl: ['except (ValueError, KeyError, TypeError)', 'def a_revision', '"revisar": a_revision'] },
    },
    {
      title: '6 · El mismo patrón en Strands',
      body: 'En un `Graph` de Strands el gate es la **condición de una arista**: `redactar` solo se ejecuta si `factura_valida(state)` devuelve `True`. Cambia la primitiva, no el patrón: pasos fijos más una verificación en código entre ellos.',
      focus: ['gate'],
      code: { file: 'graph', hl: ['def factura_valida(state)', 'builder.add_edge("extraer", "redactar", condition=factura_valida)'] },
    },
  ],
}

/* ═══════════════════════════════ 2 · Routing ═══════════════════════════════ */

const ROUTER = `import boto3

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
HAIKU = "global.anthropic.claude-haiku-5-5"     # barato y rápido
SONNET = "global.anthropic.claude-sonnet-5-5"   # para lo difícil

CLASIFICAR = {"toolSpec": {
    "name": "clasificar",
    "description": "Clasifica un ticket de soporte en una categoría.",
    "inputSchema": {"json": {"type": "object", "properties": {
        "categoria": {"type": "string", "enum": ["faq", "tecnico", "reembolso", "otro"]},
        "confianza": {"type": "number"}},
        "required": ["categoria", "confianza"]}}}}

def clasificar(ticket: str) -> dict:
    resp = bedrock.converse(
        modelId=HAIKU,                                       # el router también es barato
        messages=[{"role": "user", "content": [{"text": ticket}]}],
        toolConfig={"tools": [CLASIFICAR],
                    "toolChoice": {"tool": {"name": "clasificar"}}},   # salida estructurada
    )
    bloque = next(b for b in resp["output"]["message"]["content"] if "toolUse" in b)
    return bloque["toolUse"]["input"]

def atender(ticket: str) -> str:
    c = clasificar(ticket)
    if c["confianza"] < 0.7:
        c["categoria"] = "otro"                              # ante la duda, salida segura
    match c["categoria"]:
        case "faq":       return responder_faq(ticket, model=HAIKU)
        case "tecnico":   return agente_tecnico(ticket, model=SONNET)
        case "reembolso": return flujo_reembolso(ticket)     # workflow con aprobación
        case _:           return derivar_a_humano(ticket)`

export const patronesRouting: IsoSpec = {
  id: 'patrones-routing',
  title: 'Routing: clasificar y derivar',
  summary:
    'Un **router** clasifica la entrada y la envía a un manejador especializado: cada uno con su prompt, sus herramientas y, a menudo, **su propio modelo** (barato para lo simple, potente para lo difícil). El router es una llamada corta con salida estructurada; la derivación es un `match` en código.',
  height: 450,
  nodes: [
    { id: 'in', label: 'Ticket de soporte', sub: 'web · correo · chat', at: [0, 0], shape: 'doc', tone: 'user', icon: 'message', info: 'Entrada heterogénea: dudas frecuentes, problemas técnicos, solicitudes de reembolso.' },
    { id: 'router', label: 'Router', sub: 'clasificador LLM', at: [3.4, 0], shape: 'diamond', tone: 'gateway', icon: 'router', info: 'Un LLM pequeño (o un clasificador tradicional) devuelve una categoría con salida estructurada. Debe incluir una clase "otro" con salida segura y medirse con un set etiquetado.' },
    { id: 'faq', label: 'Preguntas simples', sub: 'modelo pequeño', at: [7, -3.4], shape: 'box', tone: 'model', icon: 'zap', info: 'Respuestas frecuentes con un modelo rápido y barato (p. ej. un Haiku). Aquí está la mayor parte del volumen.' },
    { id: 'tech', label: 'Soporte técnico', sub: 'modelo grande + tools', at: [7, 0], shape: 'tall', tone: 'agent', icon: 'wrench', info: 'Casos complejos: un agente con herramientas de diagnóstico y un modelo más capaz. Solo recibe lo que lo necesita.' },
    { id: 'refund', label: 'Reembolsos', sub: 'flujo con aprobación', at: [7, 3.4], shape: 'box', tone: 'guard', icon: 'card', info: 'Un workflow determinista con límites de monto y aprobación humana. No todo destino tiene que ser un LLM.' },
    { id: 'human', label: 'Ejecutivo', sub: '"otro" o baja confianza', at: [3.4, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'Salida segura: lo que no encaja en ninguna categoría, o lo que el router clasifica con poca confianza, va a una persona.' },
  ],
  edges: [
    { from: 'in', to: 'router' },
    { from: 'router', to: 'faq', route: 'z' },
    { from: 'router', to: 'tech' },
    { from: 'router', to: 'refund', route: 'z' },
    { from: 'router', to: 'human', dashed: true },
  ],
  code: { router: { title: 'router.py (ilustrativo)', lang: 'python', source: ROUTER } },
  steps: [
    {
      title: '1 · Clasificar',
      body: 'El router lee el ticket con un modelo pequeño y **fuerza** la herramienta `clasificar` (`toolChoice`): la respuesta siempre llega como JSON con una categoría del `enum` y una confianza. Es una llamada corta y barata.',
      flows: ['in>router'],
      data: {
        title: 'bedrock.converse(...) del router (forma simplificada)',
        lang: 'json',
        content: jsonc({
          modelId: 'global.anthropic.claude-haiku-5-5',
          messages: [{ role: 'user', content: [{ text: 'Me cobraron dos veces el pedido 4512, quiero que me devuelvan uno.' }] }],
          toolConfig: {
            tools: [{ toolSpec: { name: 'clasificar', inputSchema: { json: { properties: { categoria: { enum: ['faq', 'tecnico', 'reembolso', 'otro'] }, confianza: { type: 'number' } } } } } }],
            toolChoice: { tool: { name: 'clasificar' } },
          },
        }),
        hl: ['"toolChoice"', '"enum"'],
      },
      code: { hl: ['def clasificar(ticket: str)', 'modelId=HAIKU', '"toolChoice"', 'return bloque["toolUse"]["input"]'] },
    },
    {
      title: '2 · Lo simple, barato',
      body: 'Las preguntas frecuentes van a un modelo pequeño: baja latencia y costo por ticket mínimo. Optimizar este prompt no afecta a las otras categorías.',
      flows: ['router>faq'],
      data: {
        title: 'clasificaciones del router para 4 tickets (ilustrativo)',
        lang: 'json',
        content: jsonc([
          { ticket: '¿Cuál es el plazo para devolver una compra online?', categoria: 'faq', confianza: 0.97 },
          { ticket: 'La app me da error 500 al pagar con tarjeta', categoria: 'tecnico', confianza: 0.92 },
          { ticket: 'Me cobraron dos veces el pedido 4512', categoria: 'reembolso', confianza: 0.95 },
          { ticket: 'Quiero hablar con alguien sobre mi experiencia', categoria: 'otro', confianza: 0.55 },
        ]),
        hl: ['"faq"'],
      },
      code: { hl: ['match c["categoria"]', 'case "faq"'] },
    },
    {
      title: '3 · Lo difícil, potente',
      body: 'Los problemas técnicos van a un agente con herramientas de diagnóstico y un modelo grande. Cada manejador tiene un prompt optimizado para su caso, y el modelo caro solo se paga cuando hace falta.',
      flows: ['router>tech'],
      code: { hl: ['SONNET = ', 'case "tecnico"'] },
    },
    {
      title: '4 · Lo riesgoso, controlado',
      body: 'Los reembolsos van a un **workflow determinista** con reglas de monto y aprobación humana, no a un LLM libre. El routing también sirve para **separar niveles de riesgo**.',
      flows: ['router>refund'],
      data: {
        title: 'entrada del flujo de reembolso (ilustrativo)',
        lang: 'json',
        content: jsonc({ order_id: '4512', motivo: 'cobro duplicado', monto_clp: 69980, requiere_aprobacion: true, regla: 'montos > $50.000 los aprueba un supervisor' }),
        hl: ['"requiere_aprobacion"'],
      },
      code: { hl: ['case "reembolso"'] },
    },
    {
      title: '5 · La salida segura',
      body: 'El router es un **punto único de falla**. Si la categoría es `otro` o la confianza es baja, el ticket va a una persona en vez de arriesgar una respuesta equivocada. Mide la precisión del router con un set etiquetado.',
      flows: ['router>human'],
      code: { hl: ['if c["confianza"] < 0.7', 'case _:'] },
    },
  ],
}

/* ════════════════════════════ 3 · Paralelización ════════════════════════════ */

/** Bloque `revision_contrato.py` del artículo (ADK ParallelAgent). */
const CONTRATO = `from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent

MODEL = "gemini-flash-latest"
pagos = LlmAgent(name="pagos", model=MODEL, output_key="r_pagos",
    instruction="Revisa solo cláusulas de pago, multas y reajustes.")
resp = LlmAgent(name="responsabilidad", model=MODEL, output_key="r_resp",
    instruction="Revisa solo limitación de responsabilidad e indemnizaciones.")
datos = LlmAgent(name="datos", model=MODEL, output_key="r_datos",
    instruction="Revisa solo tratamiento de datos personales.")

revision = ParallelAgent(name="revision_paralela", sub_agents=[pagos, resp, datos])
informe = LlmAgent(name="informe", model=MODEL,
    instruction="Consolida y prioriza riesgos:\\n{r_pagos}\\n{r_resp}\\n{r_datos}")

root_agent = SequentialAgent(name="revision_contrato", sub_agents=[revision, informe])`

const VOTING = `import asyncio
import json

# Misma pregunta, tres enfoques distintos: se marca riesgo solo con mayoría
PROMPTS = [
    "Eres abogado del comprador. ¿Hay alguna cláusula abusiva para nosotros?",
    "¿Alguna cláusula traslada riesgos desproporcionados al comprador?",
    "Compara el contrato con nuestro estándar de contratos de suministro.",
]
FORMATO = 'Responde SOLO JSON: {"abusiva": true|false, "clausula": "...", "razon": "..."}'

async def un_voto(prompt: str, contrato: str) -> dict:
    texto = await llm_async(system=prompt + " " + FORMATO, user=contrato)
    return json.loads(texto)

async def votar(contrato: str, umbral: int = 2) -> dict:
    votos = await asyncio.gather(*(un_voto(p, contrato) for p in PROMPTS))   # en paralelo
    positivos = [v for v in votos if v["abusiva"]]
    return {"riesgo": len(positivos) >= umbral, "votos": len(positivos), "detalle": votos}`

const CONTRATO_TXT = `CONTRATO DE SERVICIOS LOGÍSTICOS · TransAndes Ltda. (40 págs.)
§5.2  Las facturas se pagan a 30 días; mora de 1,5 % mensual.
§7.1  La responsabilidad del proveedor se limita a 1 mes de servicio.
§9.4  El proveedor podrá subcontratar el tratamiento de datos de
      clientes sin aviso previo.
§12   Reajuste anual por IPC + 2 %.`

export const patronesParalelizacion: IsoSpec = {
  id: 'patrones-paralelizacion',
  title: 'Paralelización: sectioning y voting',
  summary:
    'Varias llamadas LLM corren **a la vez** y un agregador combina los resultados. En *sectioning* cada rama hace una parte distinta (aquí, con `ParallelAgent` de ADK); en *voting* todas hacen la misma tarea y se vota (`voting.py`). En ambos casos las ramas las define el código.',
  height: 450,
  nodes: [
    { id: 'in', label: 'Contrato', sub: 'proveedor nuevo', at: [0, 0], shape: 'doc', tone: 'user', icon: 'scroll', info: 'Un contrato de 40 páginas que legal debe revisar antes de firmar.' },
    { id: 'split', label: 'Dividir', sub: 'ParallelAgent · código', at: [3.2, 0], shape: 'box', tone: 'infra', icon: 'split', info: 'Código determinista que reparte el trabajo: por aspecto del contrato (sectioning) o replicando la misma tarea (voting). Ningún LLM decide cómo partir.' },
    { id: 'w1', label: 'Pagos y multas', sub: 'LLM · r_pagos', at: [6.6, -3.3], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Rama especializada en cláusulas económicas. Cada rama tiene un prompt enfocado: el modelo atiende a una sola cosa. Guarda su salida en `state["r_pagos"]`.' },
    { id: 'w2', label: 'Responsabilidad', sub: 'LLM · r_resp', at: [6.6, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Rama de limitación de responsabilidad e indemnizaciones.' },
    { id: 'w3', label: 'Datos personales', sub: 'LLM · r_datos', at: [6.6, 3.3], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Rama de privacidad y tratamiento de datos. También podría ser un guardrail que corre en paralelo a la respuesta principal.' },
    { id: 'agg', label: 'Agregador', sub: 'informe · código o LLM', at: [10, 0], shape: 'box', tone: 'agent', icon: 'merge', info: 'Combina resultados: concatenar y priorizar hallazgos (sectioning) o aplicar un umbral de votos (voting).' },
  ],
  edges: [
    { from: 'in', to: 'split' },
    { from: 'split', to: 'w1', route: 'z' },
    { from: 'split', to: 'w2' },
    { from: 'split', to: 'w3', route: 'z' },
    { from: 'w1', to: 'agg' },
    { from: 'w2', to: 'agg' },
    { from: 'w3', to: 'agg' },
  ],
  code: {
    adk: { title: 'revision_contrato.py', lang: 'python', source: CONTRATO },
    vote: { title: 'voting.py (ilustrativo)', lang: 'python', source: VOTING },
  },
  steps: [
    {
      title: '1 · Repartir',
      body: 'El código divide la tarea. No hay un LLM decidiendo cómo partir: las tres ramas están **predefinidas** como `sub_agents` del `ParallelAgent`.',
      flows: ['in>split'],
      data: { title: 'entrada: extracto del contrato', lang: 'text', content: CONTRATO_TXT, hl: ['§7.1', '§9.4'] },
      code: { file: 'adk', hl: ['revision = ParallelAgent(', 'sub_agents=[pagos, resp, datos]'] },
    },
    {
      title: '2 · Sectioning',
      body: 'Cada rama revisa un aspecto distinto **al mismo tiempo** y escribe su resultado en el estado de la sesión con `output_key`. La latencia total ≈ la rama más lenta, no la suma.',
      flows: ['split>w1', 'split>w2', 'split>w3'],
      data: {
        title: 'session.state tras el ParallelAgent (ilustrativo)',
        lang: 'json',
        content: jsonc({
          r_pagos: 'Mora de 1,5 % mensual (§5.2) y reajuste IPC + 2 % (§12): sobre nuestro estándar.',
          r_resp: 'Tope de responsabilidad de 1 mes de servicio (§7.1): muy bajo para operación crítica.',
          r_datos: 'Subcontratación de datos sin aviso (§9.4): incompatible con nuestra política de privacidad.',
        }),
        hl: ['"r_pagos"', '"r_resp"', '"r_datos"'],
      },
      code: { file: 'adk', hl: ['output_key="r_pagos"', 'output_key="r_resp"', 'output_key="r_datos"'] },
    },
    {
      title: '3 · Voting (variante)',
      body: 'Alternativa: las tres ramas reciben **la misma** pregunta ("¿hay una cláusula abusiva?") con enfoques distintos, corren en paralelo con `asyncio.gather` y se exige mayoría (2 de 3) para marcar el riesgo. Ganas confianza, no velocidad.',
      focus: ['w1', 'w2', 'w3'],
      data: {
        title: 'resultado de votar() (ilustrativo)',
        lang: 'json',
        content: jsonc({
          riesgo: true,
          votos: 2,
          detalle: [
            { abusiva: true, clausula: '§7.1', razon: 'Tope de 1 mes no cubre daños de un quiebre de stock.' },
            { abusiva: true, clausula: '§9.4', razon: 'Traslada riesgo regulatorio al comprador.' },
            { abusiva: false, clausula: '', razon: 'Condiciones dentro de rangos de mercado.' },
          ],
        }),
        hl: ['"riesgo"', '"votos"'],
      },
      code: { file: 'vote', hl: ['asyncio.gather', 'umbral: int = 2', '"riesgo": len(positivos) >= umbral'] },
    },
    {
      title: '4 · Agregar',
      body: 'El agente `informe` lee las tres salidas desde el estado (`{r_pagos}`, `{r_resp}`, `{r_datos}`) y consolida un informe priorizado. El costo en tokens es la suma de las ramas: pagas más para ganar velocidad o confianza.',
      flows: ['w1>agg', 'w2>agg', 'w3>agg'],
      data: {
        title: 'informe consolidado (ilustrativo)',
        lang: 'text',
        content: `Riesgos priorizados · TransAndes Ltda.
1. ALTO  §9.4 Subcontratación de datos sin aviso → exigir aviso y aprobación.
2. ALTO  §7.1 Tope de responsabilidad de 1 mes → negociar 12 meses.
3. MEDIO §5.2 / §12 Mora y reajuste sobre estándar → contrapropuesta.
Recomendación: no firmar sin modificar §7.1 y §9.4.`,
        hl: ['ALTO'],
      },
      code: { file: 'adk', hl: ['informe = LlmAgent(', 'Consolida y prioriza riesgos', 'SequentialAgent(name="revision_contrato"'] },
    },
  ],
}

/* ═══════════════════════════ 4 · Orquestador-workers ═══════════════════════════ */

/** Bloque `orquestador_strands.py` del artículo. */
const ORQ_STRANDS = `from strands import Agent, tool

@tool
def analista_ventas(pregunta: str) -> str:
    """Consulta ventas y márgenes por categoría en el data warehouse."""
    worker = Agent(system_prompt="Eres analista de ventas. Responde con cifras.",
                   tools=[consultar_dwh], callback_handler=None)  # contexto limpio
    return str(worker(pregunta))

@tool
def analista_compras(pregunta: str) -> str:
    """Analiza costos de compra por proveedor."""
    worker = Agent(system_prompt="Eres analista de compras.",
                   tools=[costos_proveedor], callback_handler=None)
    return str(worker(pregunta))

orquestador = Agent(model="global.anthropic.claude-sonnet-5-5",
    system_prompt="Descompón la pregunta, delega en los analistas y sintetiza.",
    tools=[analista_ventas, analista_compras])
orquestador("¿Por qué cayó el margen de electro en Q3?")`

/** Bloque `analisis_margen.py` del artículo (ADK AgentTool). */
const ORQ_ADK = `from google.adk.agents import LlmAgent
from google.adk.tools.agent_tool import AgentTool

ventas = LlmAgent(name="analista_ventas", model="gemini-flash-latest",
    description="Consulta ventas y márgenes por categoría en el DWH.",
    instruction="Responde con cifras y la consulta usada.", tools=[consultar_dwh])
compras = LlmAgent(name="analista_compras", model="gemini-flash-latest",
    description="Analiza costos de compra por proveedor.",
    instruction="Resume variaciones de costo relevantes.", tools=[costos_proveedor])

# El orquestador decide a qué worker llamar (y cuántas veces) en cada pregunta
root_agent = LlmAgent(name="orquestador", model="gemini-pro-latest",
    instruction="Descompón la pregunta, delega en los analistas y sintetiza con evidencia.",
    tools=[AgentTool(agent=ventas), AgentTool(agent=compras)])`

const ORQ_Q = '¿Por qué cayó el margen de electro en Q3?'
const ORQ_PLAN: ApiMessage = {
  role: 'assistant',
  note: 'orquestador · plan',
  content: [
    { type: 'text', text: 'Plan: 1) medir la caída de margen por subcategoría; 2) revisar si subieron costos de compra. Promociones solo si 1) no explica la caída.' },
    { type: 'tool_use', id: 'toolu_v1', name: 'analista_ventas', input: { pregunta: 'Margen bruto de electro Q3 2026 vs Q3 2025, por subcategoría.' } },
    { type: 'tool_use', id: 'toolu_c1', name: 'analista_compras', input: { pregunta: 'Variación de costo unitario de los 5 principales proveedores de electro en Q3.' } },
  ],
}
const ORQ_RES: ApiMessage = {
  role: 'user',
  note: 'resúmenes de los workers',
  content: [
    { type: 'tool_result', tool_use_id: 'toolu_v1', content: 'Margen electro: 26,1 % → 22,4 % (−3,7 pp). La caída se concentra en televisores (−6,2 pp).' },
    { type: 'tool_result', tool_use_id: 'toolu_c1', content: 'TecnoImport subió el costo unitario de televisores 9 % desde julio (tipo de cambio). Otros proveedores estables.' },
  ],
}
const ORQ_FINAL: ApiMessage = {
  role: 'assistant',
  note: 'síntesis · end_turn',
  content: [{ type: 'text', text: 'El margen de electro cayó 3,7 pp en Q3, casi todo en televisores: TecnoImport subió su costo 9 % y el precio de venta no se ajustó. Recomiendo renegociar o ajustar precios.' }],
}
const WORKER_HIST: ApiMessage[] = [
  { role: 'user', note: 'contexto limpio del worker', content: 'Margen bruto de electro Q3 2026 vs Q3 2025, por subcategoría.' },
  {
    role: 'assistant',
    content: [{ type: 'tool_use', id: 'toolu_w1', name: 'consultar_dwh', input: { sql: "SELECT subcategoria, trimestre, SUM(margen)/SUM(venta_neta) AS margen FROM ventas WHERE categoria = 'electro' AND trimestre IN ('2025Q3','2026Q3') GROUP BY 1, 2" } }],
  },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_w1', content: { filas: 14, televisores: { '2025Q3': 0.241, '2026Q3': 0.179 } } }] },
  { role: 'assistant', note: 'resumen que vuelve al orquestador', content: [{ type: 'text', text: 'Margen electro: 26,1 % → 22,4 % (−3,7 pp). La caída se concentra en televisores (−6,2 pp).' }] },
]

export const patronesOrquestador: IsoSpec = {
  id: 'patrones-orquestador',
  title: 'Orquestador-workers',
  summary:
    'Un LLM orquestador **decide en tiempo de ejecución** cómo descomponer la tarea, delega subtareas a workers y sintetiza los resultados. A diferencia de la paralelización, las subtareas no están predefinidas: aparecen como llamadas a herramientas (`analista_ventas`, `analista_compras`) que el modelo elige en cada pregunta.',
  height: 460,
  nodes: [
    { id: 'user', label: 'Analista', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pide algo abierto: "¿Por qué cayó el margen de la categoría electro en Q3 y qué proveedores lo explican?".' },
    { id: 'orch', label: 'Orquestador', sub: 'LLM que planifica', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'workflow', info: 'Analiza la pregunta, decide cuántos workers lanzar y con qué instrucciones. Suele usar el modelo más capaz.' },
    { id: 'plan', label: 'Plan', sub: 'subtareas dinámicas', at: [3.4, 3.3], shape: 'doc', tone: 'memory', icon: 'list', info: 'El plan se genera en cada ejecución y puede cambiar a mitad de camino según lo que devuelvan los workers.' },
    { id: 'w1', label: 'Worker ventas', sub: 'SQL sobre DWH', at: [7, -3.4], shape: 'box', tone: 'tool', icon: 'database', info: 'Worker con contexto limpio y herramientas acotadas: solo consultas de lectura al data warehouse.' },
    { id: 'w2', label: 'Worker compras', sub: 'costos de proveedor', at: [7, 0], shape: 'box', tone: 'tool', icon: 'boxes', info: 'Otro worker, lanzado solo porque el orquestador detectó que el costo de compra es relevante.' },
    { id: 'w3', label: 'Worker promociones', sub: 'no se lanzó esta vez', at: [7, 3.4], shape: 'box', tone: 'tool', icon: 'chart', info: 'Worker opcional: en esta pregunta el orquestador no lo necesitó. En otra (p. ej. "¿por qué subieron las ventas en septiembre?") sí lo lanzaría.' },
    { id: 'synth', label: 'Síntesis', sub: 'orquestador', at: [10.4, 0], shape: 'doc', tone: 'agent', icon: 'merge', info: 'El orquestador recibe **resúmenes** (no el trabajo completo de cada worker) y redacta la respuesta con evidencia.' },
  ],
  edges: [
    { from: 'user', to: 'orch' },
    { from: 'orch', to: 'plan', route: 'z' },
    { from: 'orch', to: 'w1', route: 'z' },
    { from: 'orch', to: 'w2' },
    { from: 'orch', to: 'w3', route: 'z', dashed: true },
    { from: 'w1', to: 'synth' },
    { from: 'w2', to: 'synth' },
    { from: 'w3', to: 'synth', dashed: true },
  ],
  code: {
    strands: { title: 'orquestador_strands.py', lang: 'python', source: ORQ_STRANDS },
    adk: { title: 'analisis_margen.py', lang: 'python', source: ORQ_ADK },
  },
  steps: [
    {
      title: '1 · Pregunta abierta',
      body: 'No se sabe de antemano cuántos pasos ni qué fuentes hacen falta. El orquestador recibe la pregunta y, como herramientas, a los analistas.',
      flows: ['user>orch'],
      data: { title: 'messages del orquestador', messages: [{ role: 'user', content: ORQ_Q }], newFrom: 0 },
      code: { file: 'strands', hl: ['orquestador = Agent(', 'tools=[analista_ventas, analista_compras]', 'orquestador("¿Por qué'] },
    },
    {
      title: '2 · Planificar',
      body: 'El orquestador escribe un plan y lo **materializa** pidiendo dos workers en el mismo turno (dos bloques `tool_use`). Es la diferencia clave con la paralelización: **el LLM decide** la descomposición; aquí descartó, por ahora, el de promociones.',
      flows: ['orch>plan'],
      data: { title: 'messages del orquestador', messages: [{ role: 'user', content: ORQ_Q }, ORQ_PLAN], newFrom: 1 },
      code: { file: 'strands', hl: ['system_prompt="Descompón la pregunta'] },
    },
    {
      title: '3 · Delegar con contexto limpio',
      body: 'Cada worker es un agente nuevo con **su propia ventana**: solo ve la subtarea y sus herramientas (`consultar_dwh`). Explora, consulta y devuelve únicamente un resumen compacto; el detalle queda aislado.',
      flows: ['orch>w1', 'orch>w2'],
      data: { title: 'messages internos del worker de ventas (ilustrativo)', messages: WORKER_HIST, newFrom: 1, hl: [3] },
      code: { file: 'strands', hl: ['def analista_ventas', 'worker = Agent(system_prompt="Eres analista de ventas', 'callback_handler=None)  # contexto limpio'] },
    },
    {
      title: '4 · Sintetizar',
      body: 'Los resúmenes vuelven al orquestador como `tool_result`. Integra la evidencia, detecta huecos (podría lanzar otra ronda, p. ej. promociones) y redacta la respuesta final.',
      flows: ['w1>synth', 'w2>synth'],
      data: { title: 'messages del orquestador', messages: [{ role: 'user', content: ORQ_Q }, ORQ_PLAN, ORQ_RES, ORQ_FINAL], newFrom: 2, hl: [2, 3] },
      code: { file: 'strands', hl: ['return str(worker(pregunta))'] },
    },
    {
      title: '5 · El mismo patrón en ADK',
      body: 'En ADK, `AgentTool` envuelve a cada analista como herramienta del orquestador. El costo es alto y variable (multiagente ≈15× los tokens de un chat, según Anthropic): úsalo cuando de verdad no puedes predecir las subtareas.',
      focus: ['orch', 'w1', 'w2'],
      code: { file: 'adk', hl: ['from google.adk.tools.agent_tool import AgentTool', 'tools=[AgentTool(agent=ventas), AgentTool(agent=compras)]'] },
    },
  ],
}

/* ═══════════════════════════ 5 · Evaluator-optimizer ═══════════════════════════ */

/** Bloque `ficha_producto_loop.py` del artículo (ADK LoopAgent). */
const FICHA = `from google.adk.agents import LlmAgent, LoopAgent
from google.adk.tools import ToolContext

MODEL = "gemini-flash-latest"

def aprobar_ficha(tool_context: ToolContext) -> dict:
    """Llama a esta herramienta SOLO si la ficha cumple toda la rúbrica."""
    tool_context.actions.escalate = True        # detiene el LoopAgent
    return {"estado": "aprobada"}

redactor = LlmAgent(name="redactor", model=MODEL, output_key="ficha",
    instruction="Redacta la ficha a partir de la hoja técnica. Si hay feedback "
                "del evaluador en el historial, corrígelo.")
evaluador = LlmAgent(name="evaluador", model=MODEL, tools=[aprobar_ficha],
    instruction="Evalúa la ficha con la rúbrica: tono de marca, sin datos ausentes "
                "en la hoja técnica, sistema métrico, máx. 120 palabras. Si cumple, "
                "llama a aprobar_ficha; si no, lista correcciones concretas.")

root_agent = LoopAgent(name="ficha_producto",
                       sub_agents=[redactor, evaluador],
                       max_iterations=3)         # límite duro`

export const patronesEvaluador: IsoSpec = {
  id: 'patrones-evaluador',
  title: 'Evaluator-optimizer: el loop de refinamiento',
  summary:
    'Un LLM **genera** y otro **evalúa** contra criterios explícitos; el feedback vuelve al generador hasta aprobar o agotar el límite de iteraciones. En ADK, un `LoopAgent` alterna `redactor` y `evaluador`; el evaluador detiene el loop llamando a `aprobar_ficha`. Útil cuando hay criterios claros y la iteración mejora el resultado de forma medible.',
  height: 460,
  nodes: [
    { id: 'in', label: 'Solicitud', sub: 'ficha de producto', at: [0, 0], shape: 'doc', tone: 'user', icon: 'file', info: 'Generar la ficha de un producto nuevo para el e-commerce a partir de la hoja técnica del fabricante.' },
    { id: 'gen', label: 'Generador', sub: 'LLM · redactor', at: [3.3, 0], shape: 'sphere', tone: 'model', icon: 'sparkles', info: 'Produce un borrador. En cada vuelta recibe el borrador anterior **y** el feedback concreto del evaluador (están en el historial de la sesión).' },
    { id: 'draft', label: 'Borrador', sub: 'state["ficha"]', at: [6.6, 0], shape: 'doc', tone: 'memory', icon: 'scroll', info: 'Cada versión queda en el estado (`output_key="ficha"`) y en el historial, para trazar la evolución y depurar.' },
    { id: 'eval', label: 'Evaluador', sub: 'LLM-as-judge', at: [9.9, 0], shape: 'tall', tone: 'guard', icon: 'eye', info: 'Califica el borrador con una rúbrica y devuelve veredicto + feedback accionable. Puede ser otro modelo o el mismo con otro prompt.' },
    { id: 'rubric', label: 'Rúbrica', sub: 'criterios explícitos', at: [9.9, 3.3], shape: 'doc', tone: 'data', icon: 'list', info: 'Criterios verificables: tono de marca, sin datos ausentes en la hoja técnica, sistema métrico, máximo 120 palabras.' },
    { id: 'limit', label: 'Límite', sub: 'max_iterations=3', at: [6.6, -3.3], shape: 'box', tone: 'infra', icon: 'timer', info: 'Tope duro de vueltas (y de costo). Si se alcanza sin aprobar, se entrega el mejor intento marcado para revisión humana.' },
    { id: 'out', label: 'Publicar', sub: 'CMS · borrador', at: [13.2, 0], shape: 'box', tone: 'tool', icon: 'check', info: 'Solo se publica (como borrador revisable) lo que el evaluador aprobó.' },
  ],
  edges: [
    { from: 'in', to: 'gen' },
    { from: 'gen', to: 'draft' },
    { from: 'draft', to: 'eval' },
    { from: 'rubric', to: 'eval', route: 'z' },
    { from: 'eval', to: 'gen', label: 'feedback', route: 'arc', dashed: true },
    { from: 'limit', to: 'draft', route: 'z', dashed: true },
    { from: 'eval', to: 'out', label: 'aprobado' },
  ],
  code: { loop: { title: 'ficha_producto_loop.py', lang: 'python', source: FICHA } },
  steps: [
    {
      title: '1 · Generar',
      body: 'El redactor produce la primera versión a partir de la hoja técnica y la guarda en `state["ficha"]`. Fíjate en los dos problemas: una promesa que la hoja no respalda y una medida en onzas.',
      flows: ['in>gen', 'gen>draft'],
      data: {
        title: 'hoja técnica → borrador v1',
        lang: 'text',
        content: `HOJA TÉCNICA · Hervidor eléctrico K-200
Capacidad 1,7 L · Potencia 2.200 W · Acero inoxidable
Apagado automático · Protección contra funcionamiento en seco
Base giratoria 360° · Cable 0,75 m

BORRADOR v1
Hierve hasta 57 oz en minutos y mantiene el agua caliente
por 2 horas. Su acero inoxidable y el apagado automático lo
hacen seguro y duradero. Base giratoria 360° para usarlo
desde cualquier lado.`,
        hl: ['57 oz', 'mantiene el agua caliente'],
      },
      code: { hl: ['redactor = LlmAgent(', 'output_key="ficha"'] },
    },
    {
      title: '2 · Evaluar con rúbrica',
      body: 'El evaluador compara el borrador con criterios explícitos. Sin rúbrica clara, el loop no converge: solo gasta tokens. Como no cumple, **no** llama a `aprobar_ficha` y lista correcciones.',
      flows: ['draft>eval', 'rubric>eval'],
      data: {
        title: 'respuesta del evaluador (iteración 1)',
        lang: 'text',
        content: `NO CUMPLE. Correcciones:
1. "mantiene el agua caliente por 2 horas" no aparece en la
   hoja técnica: elimínalo.
2. "57 oz" no es sistema métrico: usa 1,7 L.
3. Menciona la protección contra funcionamiento en seco
   (dato de seguridad relevante para el cliente).`,
        hl: ['NO CUMPLE'],
      },
      code: { hl: ['evaluador = LlmAgent(', 'instruction="Evalúa la ficha con la rúbrica', 'llama a aprobar_ficha; si no, lista correcciones'] },
    },
    {
      title: '3 · Feedback accionable',
      body: 'El feedback dice **qué** corregir, no solo "mejóralo". En la segunda vuelta del `LoopAgent`, el redactor ve ese feedback en el historial y reescribe.',
      flows: ['eval>gen', 'gen>draft'],
      data: {
        title: 'borrador v2',
        lang: 'text',
        content: `Hierve hasta 1,7 L con 2.200 W de potencia. Fabricado en
acero inoxidable, se apaga solo al hervir y se protege si
lo enciendes sin agua. Su base giratoria 360° permite
tomarlo desde cualquier lado.`,
        hl: ['1,7 L'],
      },
      code: { hl: ['Si hay feedback "', 'del evaluador en el historial, corrígelo'] },
    },
    {
      title: '4 · Límite de iteraciones',
      body: 'El `LoopAgent` corta tras `max_iterations=3`. Es obligatorio: dos LLMs pueden discrepar indefinidamente. Registra cada versión y, si se agota el límite, entrega el mejor intento para revisión humana.',
      focus: ['limit', 'draft'],
      data: {
        title: 'registro de iteraciones (ilustrativo)',
        lang: 'json',
        content: jsonc({
          max_iterations: 3,
          iteraciones: [
            { n: 1, palabras: 38, veredicto: 'no cumple', fallas: ['dato ausente en hoja', 'unidad no métrica'] },
            { n: 2, palabras: 41, veredicto: 'cumple', fallas: [] },
          ],
          tokens_totales: 4210,
        }),
        hl: ['"max_iterations"', '"veredicto"'],
      },
      code: { hl: ['max_iterations=3'] },
    },
    {
      title: '5 · Aprobado',
      body: 'Con la v2, el evaluador llama a `aprobar_ficha`: la herramienta pone `escalate = True` y el `LoopAgent` termina antes del límite. La ficha pasa al CMS como borrador. Costo y latencia crecen con las vueltas: mide cuántas aportan de verdad.',
      flows: ['eval>out'],
      data: {
        title: 'la llamada que detiene el loop (forma simplificada)',
        messages: [
          { role: 'assistant', note: 'evaluador · iteración 2', content: [{ type: 'text', text: 'Cumple la rúbrica.' }, { type: 'tool_use', id: 'call_ap1', name: 'aprobar_ficha', input: {} }] },
          { role: 'tool', note: 'actions.escalate = True', content: [{ type: 'tool_result', tool_use_id: 'call_ap1', content: { estado: 'aprobada' } }] },
        ],
        newFrom: 0,
      },
      code: { hl: ['def aprobar_ficha', 'tool_context.actions.escalate = True', 'return {"estado": "aprobada"}'] },
    },
  ],
}

/* ═════════════════════════ 6 · Manager vs. handoffs ═════════════════════════ */

const MANAGER = `from strands import Agent, tool

MODEL = "global.anthropic.claude-sonnet-5-5"

@tool
def facturacion(consulta: str) -> str:
    """Revisa cobros, boletas y cargos duplicados de un pedido."""
    especialista = Agent(model=MODEL, system_prompt="Eres especialista en facturación.",
                         tools=[ver_factura], callback_handler=None)
    return str(especialista(consulta))

@tool
def logistica(consulta: str) -> str:
    """Consulta estado de despacho y fecha estimada de entrega."""
    especialista = Agent(model=MODEL, system_prompt="Eres especialista en logística.",
                         tools=[estado_despacho], callback_handler=None)
    return str(especialista(consulta))

manager = Agent(model=MODEL,
    system_prompt="Atiendes al cliente. Consulta a los especialistas y responde tú, con una sola voz.",
    tools=[facturacion, logistica])
manager("Me cobraron dos veces el pedido 4512, ¿y cuándo llega?")`

/** Bloque `soporte_swarm.py` del artículo (Strands Swarm). */
const SWARM = `from strands import Agent
from strands.multiagent import Swarm

MODEL = "global.anthropic.claude-sonnet-5-5"
triage = Agent(name="triage", model=MODEL,
    system_prompt="Identifica la necesidad y transfiere al especialista.")
facturacion = Agent(name="facturacion", model=MODEL, tools=[ver_factura],
    system_prompt="Resuelves dudas de facturación.")
reembolsos = Agent(name="reembolsos", model=MODEL, tools=[crear_nota_credito],
    system_prompt="Gestionas reembolsos dentro de la política.")

swarm = Swarm(
    [triage, facturacion, reembolsos],
    entry_point=triage,
    max_handoffs=10,                       # evita ping-pong infinito
    execution_timeout=600.0,
    repetitive_handoff_detection_window=6,
    repetitive_handoff_min_unique_agents=2,
)
result = swarm("Me cobraron dos veces el pedido 4512 y quiero la devolución")
print(result.status, [n.node_id for n in result.node_history])`

const MGR_Q = 'Me cobraron dos veces el pedido 4512, ¿y cuándo llega?'
const MGR_CALL: ApiMessage = {
  role: 'assistant',
  note: 'manager',
  content: [
    { type: 'tool_use', id: 'toolu_f1', name: 'facturacion', input: { consulta: '¿Hay un cargo duplicado en el pedido 4512?' } },
    { type: 'tool_use', id: 'toolu_l1', name: 'logistica', input: { consulta: 'Estado de despacho y fecha estimada del pedido 4512.' } },
  ],
}

export const patronesManagerHandoffs: IsoSpec = {
  id: 'patrones-manager-handoffs',
  title: 'Multiagente: manager vs. handoffs',
  summary:
    'La guía de OpenAI distingue dos formas de coordinar agentes: un **manager** que usa a los especialistas como herramientas y conserva el control (`manager.py`), o un esquema **descentralizado** donde los agentes se **transfieren** la conversación entre sí (el `Swarm` de Strands, con la herramienta `handoff_to_agent`).',
  height: 450,
  zones: [
    { id: 'mgr', label: 'Manager (agentes como tools)', from: [-1.4, -6.4], to: [9.0, -1.0], tone: 'agent' },
    { id: 'dec', label: 'Descentralizado (handoffs)', from: [-1.4, 0.6], to: [9.0, 5.8], tone: 'protocol' },
  ],
  nodes: [
    { id: 'u1', label: 'Cliente', at: [0, -3.7], shape: 'person', tone: 'user', icon: 'user', info: 'Habla siempre con el mismo agente: el manager.' },
    { id: 'mgr', label: 'Manager', sub: 'mantiene el control', at: [3.4, -3.7], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Llama a cada especialista como si fuera una herramienta, recibe su resultado y redacta la respuesta final. Una sola voz hacia el usuario.' },
    { id: 'sa', label: 'Facturación', sub: 'agente como tool', at: [7.2, -5.2], shape: 'box', tone: 'tool', icon: 'card', info: 'Especialista invocado por el manager. No habla con el usuario: devuelve un resultado.' },
    { id: 'sb', label: 'Logística', sub: 'agente como tool', at: [7.2, -2.2], shape: 'box', tone: 'tool', icon: 'boxes', info: 'Otro especialista. El manager puede combinar varios en un mismo turno.' },
    { id: 'u2', label: 'Cliente', at: [0, 3.2], shape: 'person', tone: 'user', icon: 'user', info: 'Conversa con el agente que tenga el control en ese momento.' },
    { id: 'triage', label: 'Triage', sub: 'entry_point', at: [3.4, 3.2], shape: 'tall', tone: 'agent', icon: 'router', info: 'Identifica la necesidad y **transfiere** la conversación al especialista con `handoff_to_agent`. Después deja de participar.' },
    { id: 'da', label: 'Facturación', sub: 'toma el control', at: [7.2, 1.8], shape: 'tall', tone: 'agent', icon: 'card', scale: 0.85, info: 'Recibe el control y responde directamente al cliente. Puede volver a transferir si el caso cambia.' },
    { id: 'db', label: 'Reembolsos', sub: 'toma el control', at: [7.2, 4.6], shape: 'tall', tone: 'agent', icon: 'repeat', scale: 0.85, info: 'Otro par: los handoffs pueden encadenarse entre especialistas, hasta `max_handoffs`.' },
  ],
  edges: [
    { from: 'u1', to: 'mgr' },
    { from: 'mgr', to: 'sa', route: 'x' },
    { from: 'mgr', to: 'sb', route: 'x' },
    { from: 'u2', to: 'triage' },
    { from: 'triage', to: 'da', label: 'handoff', route: 'x' },
    { from: 'da', to: 'db', label: 'handoff', route: 'z' },
  ],
  code: {
    mgr: { title: 'manager.py (ilustrativo)', lang: 'python', source: MANAGER },
    swarm: { title: 'soporte_swarm.py', lang: 'python', source: SWARM },
  },
  steps: [
    {
      title: '1 · Manager: delega como herramientas',
      body: 'El cliente habla con el manager, que pide a los dos especialistas en el mismo turno (dos `tool_use`). Cada especialista es un agente completo envuelto en una función `@tool`.',
      flows: ['u1>mgr', 'mgr>sa', 'mgr>sb'],
      data: { title: 'messages del manager', messages: [{ role: 'user', content: MGR_Q }, MGR_CALL], newFrom: 1 },
      code: { file: 'mgr', hl: ['def facturacion(consulta: str)', 'def logistica(consulta: str)', 'tools=[facturacion, logistica]'] },
    },
    {
      title: '2 · Manager: una sola voz',
      body: 'Los especialistas devuelven resultados (no hablan con el cliente) y el manager compone **una** respuesta. Ideal cuando quieres control central, formato homogéneo y trazas simples; el riesgo es que su contexto se vuelva un cuello de botella.',
      flows: ['sa>mgr', 'sb>mgr', 'mgr>u1'],
      data: {
        title: 'messages del manager',
        messages: [
          { role: 'user', content: MGR_Q },
          MGR_CALL,
          {
            role: 'user',
            note: 'resultados',
            content: [
              { type: 'tool_result', tool_use_id: 'toolu_f1', content: 'Sí: dos cargos de $34.990 el 02-11. Corresponde nota de crédito por uno.' },
              { type: 'tool_result', tool_use_id: 'toolu_l1', content: 'En ruta; entrega estimada 07-11.' },
            ],
          },
          { role: 'assistant', note: 'una sola voz', content: [{ type: 'text', text: 'Confirmamos el cobro duplicado de $34.990 y ya solicitamos la nota de crédito. Tu pedido llega el 7 de noviembre.' }] },
        ],
        newFrom: 2,
      },
      code: { file: 'mgr', hl: ['return str(especialista(consulta))', 'responde tú, con una sola voz'] },
    },
    {
      title: '3 · Handoffs: se transfiere el control',
      body: 'En el `Swarm`, cada agente recibe automáticamente la herramienta `handoff_to_agent`. El triage la usa para pasar la conversación a facturación y se retira: desde ahí, facturación habla con el cliente.',
      flows: ['u2>triage', 'triage>da'],
      data: {
        title: 'tool_use del triage (forma simplificada)',
        messages: [
          { role: 'user', content: 'Me cobraron dos veces el pedido 4512 y quiero la devolución' },
          { role: 'assistant', note: 'triage', content: [{ type: 'tool_use', id: 'toolu_h1', name: 'handoff_to_agent', input: { agent_name: 'facturacion', message: 'Cliente reporta cobro duplicado en el pedido 4512.' } }] },
        ],
        newFrom: 1,
      },
      code: { file: 'swarm', hl: ['triage = Agent(name="triage"', 'entry_point=triage'] },
    },
    {
      title: '4 · Handoffs encadenados',
      body: 'Facturación confirma el doble cobro y detecta que es un reembolso: transfiere otra vez. Los límites (`max_handoffs`, ventana de detección de handoffs repetitivos) evitan el ping-pong entre agentes; esa detección viene desactivada por defecto.',
      flows: ['da>db'],
      data: {
        title: 'tool_use de facturación (forma simplificada)',
        messages: [
          { role: 'assistant', note: 'facturacion', content: [{ type: 'tool_use', id: 'toolu_h2', name: 'handoff_to_agent', input: { agent_name: 'reembolsos', message: 'Cobro duplicado confirmado: $34.990, pedido 4512. Emitir nota de crédito.' } }] },
        ],
        newFrom: 0,
      },
      code: { file: 'swarm', hl: ['max_handoffs=10', 'repetitive_handoff_detection_window=6', 'repetitive_handoff_min_unique_agents=2'] },
    },
    {
      title: '5 · Resultado del swarm',
      body: '`node_history` muestra quién tuvo el control y en qué orden: es la traza mínima que necesitas para depurar un sistema descentralizado. Menos saltos por turno que con un manager, pero sin visión global.',
      focus: ['triage', 'da', 'db'],
      data: { title: 'salida de print(...)', lang: 'text', content: "Status.COMPLETED ['triage', 'facturacion', 'reembolsos']", hl: ['COMPLETED'] },
      code: { file: 'swarm', hl: ['result = swarm(', 'print(result.status'] },
    },
    {
      title: '6 · Cuál elegir',
      body: 'Manager para respuestas que combinan varios especialistas; handoffs cuando cada especialista debe llevar la conversación completa de su dominio. Antes de cualquiera de los dos, maximiza un agente único: divide solo ante lógica compleja o sobrecarga de herramientas.',
      focus: ['mgr', 'triage'],
    },
  ],
}
