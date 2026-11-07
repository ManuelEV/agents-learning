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

/* ═══════════════════════════ Ciclo de evaluaciones ═══════════════════════════ */

/** Bloque `tests/test_soporte_evals.py` del artículo. */
const EVALS = `import json, pathlib
import boto3, pytest
from soporte.agent import run_agent   # tu agente: devuelve .answer y .state

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
JUDGE_MODEL = "global.anthropic.claude-sonnet-5-5"   # perfil de inferencia
TRIALS = 3
TASKS = [json.loads(l) for l in pathlib.Path("evals/soporte.jsonl")
         .read_text(encoding="utf-8").splitlines() if l.strip()]

RUBRIC = """Eres un evaluador estricto de un agente de soporte retail.
Criterios binarios (0 o 1):
- resuelve: responde exactamente lo que pidió el cliente.
- fiel: no afirma nada que no esté en <datos>.
- politica: no ofrece compensaciones fuera de <politica>.
Primero razona en "razon"; después puntúa. Responde SOLO JSON:
{"razon": "...", "resuelve": 0, "fiel": 0, "politica": 0}"""

def judge(task: dict, answer: str) -> dict:
    prompt = (f"{RUBRIC}\\n<datos>{json.dumps(task['context'], ensure_ascii=False)}</datos>"
              f"\\n<politica>{task['policy']}</politica>"
              f"\\n<pregunta>{task['input']}</pregunta>\\n<respuesta>{answer}</respuesta>")
    resp = bedrock.converse(modelId=JUDGE_MODEL,
                            messages=[{"role": "user", "content": [{"text": prompt}]}],
                            inferenceConfig={"temperature": 0})
    return json.loads(resp["output"]["message"]["content"][0]["text"])

@pytest.mark.parametrize("task", TASKS, ids=lambda t: t["id"])
def test_tarea(task):
    passed = 0
    for _ in range(TRIALS):
        result = run_agent(task["input"], fixtures=task["context"])  # entorno limpio
        outcome_ok = result.state.get("ticket") == task["expected"]["ticket"]  # grader de código
        verdict = judge(task, result.answer)                                    # grader LLM
        if outcome_ok and all(verdict[k] == 1 for k in ("resuelve", "fiel", "politica")):
            passed += 1
    assert passed == TRIALS, f"{task['id']}: {passed}/{TRIALS} trials (pass^{TRIALS} falló)"`

const TAREA = {
  id: 'logistica-017',
  input: 'Mi pedido 4512 lleva 4 días de retraso, ¿qué me ofrecen?',
  context: { pedido: { id: '4512', estado: 'retrasado', eta: '2026-11-07' } },
  policy: 'Retrasos sobre 3 días: envío gratis en la próxima compra. Sin reembolsos en efectivo.',
  expected: { ticket: { categoria: 'logistica', prioridad: 'alta' } },
}

const TRIAL: ApiMessage[] = [
  { role: 'user', content: TAREA.input },
  { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_01', name: 'get_order_status', input: { order_id: '4512' } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_01', content: { estado: 'retrasado', eta: '2026-11-07' } }] },
  { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_02', name: 'create_ticket', input: { order_id: '4512', categoria: 'logistica', prioridad: 'alta' } }] },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_02', content: { ticket_id: 'TCK-90412' } }] },
  { role: 'assistant', note: 'respuesta final', content: [{ type: 'text', text: 'Lamentamos el retraso: tu pedido 4512 llega el 7 de noviembre. Te ofrecemos envío gratis en tu próxima compra (ticket TCK-90412).' }] },
]

export const evalCiclo: IsoSpec = {
  id: 'evaluacion-ciclo',
  title: 'Ciclo de vida de las evaluaciones',
  summary:
    'Las evals de un agente son un **ciclo**, no un paso previo al lanzamiento: un dataset de tareas alimenta un *harness* que ejecuta varios *trials* contra el agente, los *graders* puntúan cada resultado, un *gate* en CI/CD decide si se despliega, y en producción el muestreo de trazas y el feedback generan **nuevos casos** que vuelven al dataset. El código es el harness mínimo del artículo (`pytest` + juez LLM, pass^3); los datos siguen una tarea real: el pedido 4512 retrasado.',
  height: 500,
  zones: [
    { id: 'offline', label: 'Offline (CI/CD)', from: [-1.4, -5.6], to: [11.8, 1.4], tone: 'infra' },
    { id: 'online', label: 'Online (producción)', from: [1.9, 2.1], to: [11.8, 4.9], tone: 'agent' },
  ],
  nodes: [
    { id: 'dataset', label: 'Dataset de tareas', sub: '20–50 casos reales', at: [0, 0], shape: 'stack', tone: 'data', icon: 'list', info: 'Cada **tarea** tiene entrada, contexto (estado inicial, usuario simulado) y criterios de éxito. Se empieza con 20–50 tareas sacadas de fallos reales: tickets de soporte, bugs, revisiones manuales previas al lanzamiento.' },
    { id: 'harness', label: 'Harness de evals', sub: 'ejecuta N trials', at: [3.3, 0], shape: 'tall', tone: 'infra', icon: 'workflow', info: 'Infraestructura que corre las tareas de punta a punta: prepara el entorno, ejecuta varios **trials** por tarea (las salidas varían entre corridas), registra el **transcript** completo y agrega resultados.' },
    { id: 'agent', label: 'Agente bajo prueba', sub: 'modelo + harness', at: [3.3, -3.4], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Se evalúa el **sistema completo**: modelo, prompt, herramientas y el código del loop. Cambiar cualquiera de ellos (incluso la descripción de una tool) exige volver a correr la suite.' },
    { id: 'graders', label: 'Graders', sub: 'código · LLM · humano', at: [6.6, 0], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Puntúan cada trial. **Código**: comprobaciones deterministas del resultado (¿existe el ticket con la prioridad correcta?). **LLM-as-judge**: rúbricas para lo subjetivo, calibrado con humanos. **Humanos**: el estándar de oro, caro y lento.' },
    { id: 'judge', label: 'Modelo juez', sub: 'rúbrica calibrada', at: [6.6, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Un LLM (idealmente distinto del agente) que aplica una rúbrica explícita, con temperatura 0, y devuelve justificación + puntaje en JSON. Su acuerdo con evaluadores humanos se mide periódicamente.' },
    { id: 'report', label: 'Reporte', sub: 'pass@k · pass^k · costo', at: [10.4, -4.2], shape: 'doc', tone: 'neutral', icon: 'chart', info: 'Tasa de éxito por suite, **pass@k** y **pass^k**, latencia, tokens y costo por tarea. Comparado contra la versión en producción, no contra un número absoluto.' },
    { id: 'gate', label: 'Gate de CI/CD', sub: '¿regresión?', at: [9.9, 0], shape: 'diamond', tone: 'guard', icon: 'flag', info: 'La suite de **regresión** (≈100% esperado) bloquea el merge o el despliegue si baja. La suite de **capacidad** se reporta pero no bloquea: mide hacia dónde mejorar.' },
    { id: 'prod', label: 'Producción', sub: 'trazas OTel', at: [9.9, 3.4], shape: 'cloud', tone: 'infra', icon: 'cloud', info: 'El agente desplegado emite trazas de cada paso. Es la fuente de verdad sobre cómo se usa realmente el agente.' },
    { id: 'online', label: 'Evals online', sub: 'muestreo + feedback', at: [6.6, 3.4], shape: 'box', tone: 'infra', icon: 'eye', info: 'Se evalúa una **muestra** de trazas reales con graders automáticos (p. ej. AgentCore Evaluations online, Langfuse, Phoenix) y se cruza con el feedback de usuarios (pulgar arriba/abajo, escalamientos).' },
    { id: 'triage', label: 'Revisión humana', sub: 'leer transcripts', at: [3.3, 3.4], shape: 'person', tone: 'user', icon: 'search', info: 'Alguien del equipo **lee transcripts** de los casos marcados: ¿falló el agente o falló el grader? Los fallos confirmados se convierten en tareas nuevas del dataset.' },
  ],
  edges: [
    { from: 'dataset', to: 'harness' },
    { from: 'harness', to: 'agent', label: 'trials' },
    { from: 'harness', to: 'graders', label: 'transcripts' },
    { from: 'graders', to: 'judge', dashed: true },
    { from: 'graders', to: 'gate' },
    { from: 'gate', to: 'report', dashed: true },
    { from: 'gate', to: 'prod', label: 'deploy' },
    { from: 'prod', to: 'online' },
    { from: 'online', to: 'triage' },
    { from: 'triage', to: 'dataset', label: 'casos nuevos', route: 'z' },
  ],
  code: { evals: { title: 'tests/test_soporte_evals.py', lang: 'python', source: EVALS } },
  steps: [
    {
      title: '1 · Dataset desde fallos reales',
      body: 'El punto de partida son 20–50 **tareas** con criterios de éxito verificables, extraídas de tickets, bugs y pruebas manuales. Cada línea de `evals/soporte.jsonl` trae la entrada, el contexto (fixtures), la política aplicable y el **outcome** esperado. Incluye casos donde el agente **debe** actuar y casos donde **no** debe hacerlo.',
      focus: ['dataset'],
      data: { title: 'evals/soporte.jsonl · una tarea', lang: 'json', content: jsonc(TAREA), hl: ['"expected"', '"policy"'] },
      code: { hl: ['TASKS = [json.loads(l)', '"evals/soporte.jsonl"'] },
    },
    {
      title: '2 · El harness ejecuta trials',
      body: 'Por cada tarea, el harness prepara un entorno limpio con los fixtures y corre **3 trials** contra el agente. Guarda el transcript completo: mensajes, tool calls, resultados intermedios y estado final. Este es uno de los tres.',
      flows: ['dataset>harness', 'harness>agent', 'agent>harness'],
      data: { title: 'transcript del trial 1', messages: TRIAL, hl: [3] },
      code: { hl: ['TRIALS = 3', 'for _ in range(TRIALS)', 'run_agent(task["input"], fixtures=task["context"])'] },
    },
    {
      title: '3 · Graders puntúan el resultado',
      body: 'Primero un grader de **código** sobre el *outcome*: ¿el estado final tiene el ticket con categoría y prioridad esperadas? Después un **juez LLM** con rúbrica binaria, que razona antes de puntuar. Se evalúa el resultado, no el camino exacto.',
      flows: ['harness>graders', 'graders>judge', 'judge>graders'],
      data: {
        title: 'graders del trial 1',
        lang: 'json',
        content: jsonc({
          outcome: { esperado: TAREA.expected.ticket, obtenido: { categoria: 'logistica', prioridad: 'alta' }, ok: true },
          juez: { razon: 'Da la fecha real del pedido y ofrece envío gratis, que está en la política. No promete reembolso en efectivo.', resuelve: 1, fiel: 1, politica: 1 },
        }),
        hl: ['"ok": true', '"politica": 1'],
      },
      code: { hl: ['outcome_ok = result.state.get("ticket")', 'verdict = judge(task, result.answer)', 'RUBRIC = """', 'inferenceConfig={"temperature": 0}'] },
    },
    {
      title: '4 · Gate de regresión en CI',
      body: 'Una tarea solo aprueba si pasan **los 3 trials** (pass^3). Si alguna que pasaba de forma consistente en la versión desplegada empieza a fallar, el pipeline **bloquea** el despliegue. Recuerda: 75% por intento es solo ≈42% de pasar 3 de 3.',
      flows: ['graders>gate', 'gate>report'],
      data: {
        title: 'reporte de la suite (ilustrativo)',
        lang: 'json',
        content: jsonc({
          suite: 'regresion-soporte',
          tareas: 30,
          'pass@1': 0.96,
          'pass^3': 0.9,
          vs_produccion: { 'logistica-017': '3/3 → 3/3', 'devolucion-008': '3/3 → 2/3' },
          costo_por_tarea_usd: 0.038,
          latencia_p95_s: 8.1,
          gate: 'BLOQUEADO (devolucion-008 regresionó)',
        }),
        hl: ['"pass^3"', '"devolucion-008"', '"gate"'],
      },
      code: { hl: ['assert passed == TRIALS'] },
    },
    {
      title: '5 · Despliegue y trazas',
      body: 'Si pasa el gate, la nueva versión llega a producción (idealmente con despliegue gradual). Cada sesión emite trazas OpenTelemetry con spans por llamada al modelo y por herramienta, etiquetadas con la versión del agente para poder comparar.',
      flows: ['gate>prod'],
      data: {
        title: 'span de una sesión real (forma simplificada)',
        lang: 'json',
        content: jsonc({
          name: 'invoke_agent soporte',
          resource: { 'service.name': 'agente-soporte', 'service.version': '2026.11.1' },
          attributes: { 'gen_ai.operation.name': 'invoke_agent', 'gen_ai.agent.name': 'soporte', 'gen_ai.conversation.id': 'conv-7f3a' },
          children: ['chat global.anthropic.claude-sonnet-5-5', 'execute_tool get_order_status', 'chat global.anthropic.claude-sonnet-5-5'],
        }),
        hl: ['"service.version"'],
      },
    },
    {
      title: '6 · Evals online',
      body: 'Un porcentaje de las trazas se evalúa automáticamente (relevancia, fidelidad, uso correcto de tools, seguridad), más el 100% de las sesiones con error, escalamiento o feedback negativo. Se cruza con el **feedback** de los usuarios para detectar lo que el dataset no cubría.',
      flows: ['prod>online'],
      data: {
        title: 'resultado de evals online (ilustrativo)',
        lang: 'json',
        content: jsonc({
          muestreo: { base: '5 %', siempre: ['error', 'escalamiento', 'feedback_negativo'] },
          ultimas_24h: { trazas_evaluadas: 1240, fidelidad: 0.94, uso_correcto_tools: 0.91, politica: 0.97 },
          marcada: { trace_id: '4bf92f35…', motivo: 'ofreció reembolso en efectivo (fuera de política)', feedback: 'pulgar arriba' },
        }),
        hl: ['"muestreo"', '"marcada"'],
      },
    },
    {
      title: '7 · Cerrar el ciclo',
      body: 'Las trazas marcadas se **leen**. Aquí falló el agente, no el grader: el cliente quedó contento, pero la oferta violaba la política. El caso se convierte en una tarea nueva (negativa: el agente **no** debe ofrecer efectivo); las capacidades que ya pasan siempre se "gradúan" a la suite de regresión.',
      flows: ['online>triage', 'triage>dataset'],
      data: {
        title: 'tarea nueva agregada a evals/soporte.jsonl',
        lang: 'json',
        content: jsonc({
          id: 'logistica-031',
          origen: 'traza de producción 4bf92f35… (revisada por humano)',
          input: 'El pedido 4519 llegó con 6 días de retraso, quiero mi plata de vuelta.',
          context: { pedido: { id: '4519', estado: 'entregado', retraso_dias: 6 } },
          policy: 'Retrasos sobre 3 días: envío gratis en la próxima compra. Sin reembolsos en efectivo.',
          expected: { ticket: { categoria: 'logistica', prioridad: 'media' } },
        }),
        hl: ['"origen"', '"policy"'],
      },
      code: { hl: ['@pytest.mark.parametrize("task", TASKS'] },
    },
  ],
}

/* ═══════════════════════════ Pipeline de trazas ═══════════════════════════ */

/** Bloque `telemetria.py` del artículo. */
const TELEMETRIA = `from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

provider = TracerProvider(resource=Resource.create(
    {"service.name": "agente-soporte", "service.version": "2026.11.0"}))
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4318/v1/traces")))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("agente-soporte")
MODEL_ID = "global.anthropic.claude-sonnet-5-5"

def call_model(bedrock, messages, tool_config):
    with tracer.start_as_current_span(f"chat {MODEL_ID}") as span:
        span.set_attribute("gen_ai.operation.name", "chat")
        span.set_attribute("gen_ai.provider.name", "aws.bedrock")
        span.set_attribute("gen_ai.request.model", MODEL_ID)
        resp = bedrock.converse(modelId=MODEL_ID, messages=messages, toolConfig=tool_config)
        span.set_attribute("gen_ai.usage.input_tokens", resp["usage"]["inputTokens"])
        span.set_attribute("gen_ai.usage.output_tokens", resp["usage"]["outputTokens"])
        return resp

def run_tool(name: str, call_id: str, args: dict, tools: dict):
    with tracer.start_as_current_span(f"execute_tool {name}") as span:
        span.set_attribute("gen_ai.operation.name", "execute_tool")
        span.set_attribute("gen_ai.tool.name", name)
        span.set_attribute("gen_ai.tool.call.id", call_id)
        return tools[name](**args)   # las excepciones quedan registradas en el span`

const COLLECTOR = `receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318              # el agente exporta aquí (OTLP/HTTP)

processors:
  redaction:                                 # quita PII antes de exportar
    allow_all_keys: true
    blocked_values:
      - '[\\w.+-]+@[\\w-]+\\.[\\w.]+'           # emails
      - '\\d{1,2}\\.?\\d{3}\\.?\\d{3}-[\\dkK]'      # RUT chileno
  tail_sampling:                             # decide con la traza completa
    decision_wait: 10s
    policies:
      - {name: errores, type: status_code, status_code: {status_codes: [ERROR]}}
      - {name: lentas, type: latency, latency: {threshold_ms: 15000}}
      - {name: muestra, type: probabilistic, probabilistic: {sampling_percentage: 10}}
  batch: {}

exporters:
  otlphttp/langfuse:
    endpoint: https://langfuse.interno/api/public/otel
  otlphttp/evals:
    endpoint: https://evals-online.interno/otlp
  awsxray: {}                                # trazas visibles en CloudWatch

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [redaction, tail_sampling, batch]
      exporters: [otlphttp/langfuse, otlphttp/evals, awsxray]`

export const evalTrazas: IsoSpec = {
  id: 'evaluacion-trazas',
  title: 'Pipeline de trazas de un agente',
  summary:
    'Cada invocación del agente genera una **traza** con spans anidados: `invoke_agent` → `chat` (llamada al modelo, con tokens) → `execute_tool`. El contexto de traza viaja a los servidores MCP en `_meta.traceparent`. Un **OpenTelemetry Collector** recibe todo por OTLP, redacta, muestrea y reparte a los backends de observabilidad y evaluación. Los atributos siguen las convenciones GenAI de OpenTelemetry, aún en estado *Development*.',
  height: 480,
  zones: [{ id: 'app', label: 'Proceso del agente', from: [-1.5, -4.9], to: [1.5, 4.9], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Usuario', sub: 'session_id', at: [-3.6, 0], shape: 'person', tone: 'user', icon: 'user', info: 'La petición llega con identificadores de sesión y usuario que se propagan como atributos (`gen_ai.conversation.id`) para poder agrupar trazas por conversación.' },
    { id: 'agent', label: 'invoke_agent', sub: 'span raíz del agente', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Span de agente según las convenciones GenAI de OpenTelemetry (estado *Development*). Nombre sugerido `invoke_agent {gen_ai.agent.name}`. Agrupa todo el trabajo de un turno.' },
    { id: 'model', label: 'chat', sub: 'span por llamada LLM', at: [0, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Un span por llamada al modelo con `gen_ai.provider.name` (p. ej. `aws.bedrock`), `gen_ai.request.model`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens` y latencia. De aquí sale el costo.' },
    { id: 'tool', label: 'execute_tool', sub: 'servidor MCP', at: [0, 3.4], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Span `execute_tool {gen_ai.tool.name}` con `gen_ai.tool.call.id`. Desde MCP `2026-07-28` el `traceparent` viaja en `_meta`, así que los spans del servidor MCP quedan como hijos de esta llamada.' },
    { id: 'collector', label: 'OTel Collector', sub: 'OTLP · filtros', at: [3.6, 0], shape: 'hex', tone: 'gateway', icon: 'filter', info: 'Recibe OTLP, agrega atributos de entorno, **redacta PII** de prompts y respuestas, aplica muestreo (*tail sampling*: guardar 100% de errores) y exporta a uno o varios backends.' },
    { id: 'cw', label: 'CloudWatch', sub: 'AgentCore Observability', at: [7.2, -3.4], shape: 'cloud', tone: 'infra', icon: 'chart', info: 'AgentCore emite telemetría compatible con OTEL hacia CloudWatch: dashboards de sesiones, latencia, tokens y errores, con visualización de trazas para agentes en Runtime.' },
    { id: 'lf', label: 'Langfuse / Phoenix', sub: 'trazas LLM + evals', at: [7.2, 0], shape: 'box', tone: 'infra', icon: 'layers', info: 'Backends especializados en LLM: vista de conversación, costos por usuario, datasets y evaluadores sobre trazas. Langfuse es MIT y autoalojable; Phoenix usa OpenInference.' },
    { id: 'evals', label: 'Evals online', sub: 'muestra de trazas', at: [7.2, 3.4], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Graders automáticos que puntúan una muestra de trazas de producción (p. ej. AgentCore Evaluations en modo online). Sus puntajes vuelven como métricas.' },
    { id: 'alerts', label: 'Dashboards y alertas', sub: 'SLO · costo · calidad', at: [10.8, 0], shape: 'box', tone: 'neutral', icon: 'gauge', info: 'Alertas sobre p95 de latencia, tasa de error de tools, costo diario por agente/equipo, caída del puntaje de evals online y bucles (turnos por sesión anómalos).' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'agent', to: 'model' },
    { from: 'agent', to: 'tool', label: 'traceparent' },
    { from: 'agent', to: 'collector', label: 'OTLP' },
    { from: 'collector', to: 'cw' },
    { from: 'collector', to: 'lf' },
    { from: 'collector', to: 'evals' },
    { from: 'cw', to: 'alerts', route: 'x' },
    { from: 'evals', to: 'alerts', route: 'x' },
    { from: 'lf', to: 'alerts' },
  ],
  code: {
    tel: { title: 'telemetria.py', lang: 'python', source: TELEMETRIA },
    col: { title: 'otel-collector.yaml (ilustrativo)', lang: 'yaml', source: COLLECTOR },
  },
  steps: [
    {
      title: '1 · Se abre la traza',
      body: 'Llega la petición y el agente abre el span raíz `invoke_agent`, con atributos de sesión y agente. La versión del servicio va en el **resource** (se adjunta a todos los spans): sin ella no puedes comparar versiones.',
      flows: ['user>agent'],
      data: {
        title: 'span raíz (forma simplificada)',
        lang: 'json',
        content: jsonc({
          name: 'invoke_agent soporte',
          trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
          span_id: 'a3ce929d0e0e4736',
          resource: { 'service.name': 'agente-soporte', 'service.version': '2026.11.0' },
          attributes: {
            'gen_ai.operation.name': 'invoke_agent',
            'gen_ai.agent.name': 'soporte',
            'gen_ai.conversation.id': 'conv-7f3a',
            'app.tenant': 'retail-cl',
            'app.equipo': 'postventa',
          },
        }),
        hl: ['"gen_ai.operation.name"', '"gen_ai.conversation.id"', '"service.version"'],
      },
      code: { file: 'tel', hl: ['Resource.create(', '"service.version": "2026.11.0"', 'tracer = trace.get_tracer'] },
    },
    {
      title: '2 · Span por llamada al modelo',
      body: 'Cada llamada al LLM genera un span `chat` hijo del raíz, con proveedor, modelo, tokens de entrada/salida y duración. Es la base para calcular **costo por sesión** y para separar la latencia del modelo de la de las herramientas.',
      flows: ['agent>model', 'model>agent'],
      data: {
        title: 'span chat (forma simplificada)',
        lang: 'json',
        content: jsonc({
          name: 'chat global.anthropic.claude-sonnet-5-5',
          parent_span_id: 'a3ce929d0e0e4736',
          duration_ms: 1840,
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.provider.name': 'aws.bedrock',
            'gen_ai.request.model': 'global.anthropic.claude-sonnet-5-5',
            'gen_ai.usage.input_tokens': 2140,
            'gen_ai.usage.output_tokens': 88,
          },
        }),
        hl: ['"gen_ai.provider.name"', '"gen_ai.usage.input_tokens"', '"gen_ai.usage.output_tokens"'],
      },
      code: { file: 'tel', hl: ['def call_model', 'start_as_current_span(f"chat {MODEL_ID}")', '"gen_ai.provider.name", "aws.bedrock"', '"gen_ai.usage.input_tokens"'] },
    },
    {
      title: '3 · Span por herramienta y propagación',
      body: 'Cada tool call genera `execute_tool`. Si la herramienta es un servidor MCP, el cliente inyecta el `traceparent` en `_meta` de la request: el servidor lo extrae y su trabajo (la consulta al ERP) queda **en la misma traza**, como hijo de este span.',
      flows: ['agent>tool', 'tool>agent'],
      data: {
        title: 'tools/call con contexto de traza (MCP 2026-07-28)',
        lang: 'json',
        content: jsonc({
          jsonrpc: '2.0',
          id: 31,
          method: 'tools/call',
          params: {
            name: 'get_order_status',
            arguments: { order_id: '4512' },
            _meta: { protocolVersion: '2026-07-28', traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-b7ad6b7169203331-01' },
          },
        }),
        hl: ['"_meta"', '"traceparent"'],
      },
      code: { file: 'tel', hl: ['def run_tool', 'start_as_current_span(f"execute_tool {name}")', '"gen_ai.tool.call.id"'] },
    },
    {
      title: '4 · Exportación al Collector',
      body: 'El `BatchSpanProcessor` agrupa spans y el exportador OTLP/HTTP los envía al Collector (en protobuf; aquí en su forma JSON). El agente no sabe nada de los backends: solo conoce el endpoint del Collector.',
      flows: ['agent>collector'],
      data: {
        title: 'POST /v1/traces (OTLP, mostrado como JSON)',
        lang: 'json',
        content: jsonc({
          resourceSpans: [
            {
              resource: { attributes: [{ key: 'service.name', value: { stringValue: 'agente-soporte' } }] },
              scopeSpans: [
                {
                  scope: { name: 'agente-soporte' },
                  spans: [
                    {
                      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
                      spanId: 'c1d2e3f405a6b7c8',
                      parentSpanId: 'a3ce929d0e0e4736',
                      name: 'chat global.anthropic.claude-sonnet-5-5',
                      kind: 3,
                      attributes: [{ key: 'gen_ai.usage.input_tokens', value: { intValue: '2140' } }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
        hl: ['"resourceSpans"', '"parentSpanId"'],
      },
      code: { file: 'tel', hl: ['BatchSpanProcessor(', 'OTLPSpanExporter(endpoint="http://otel-collector:4318/v1/traces")'] },
    },
    {
      title: '5 · Redactar, muestrear y repartir',
      body: 'El Collector **redacta PII** (emails, RUT) antes de que salga nada, aplica *tail sampling* (100% de errores y sesiones lentas, 10% del resto) y exporta el mismo flujo a Langfuse, a los evaluadores online y a CloudWatch. Instrumentar con un estándar evita amarrarse a un proveedor.',
      flows: ['collector>cw', 'collector>lf', 'collector>evals'],
      data: {
        title: 'atributo antes y después de la redacción (ilustrativo)',
        lang: 'json',
        content: jsonc({
          antes: { 'gen_ai.input.messages': 'Soy ana.rojas@correo.cl, RUT 12.345.678-9, ¿y mi pedido 4512?' },
          despues: { 'gen_ai.input.messages': 'Soy ****, RUT ****, ¿y mi pedido 4512?' },
          muestreo: 'conservada (política "lentas": 16,2 s)',
        }),
        hl: ['"despues"', '"muestreo"'],
      },
      code: { file: 'col', hl: ['redaction:', 'blocked_values:', 'tail_sampling:', 'exporters: [otlphttp/langfuse, otlphttp/evals, awsxray]'] },
    },
    {
      title: '6 · Alertas',
      body: 'Latencia, errores, costo y calidad se consolidan en dashboards con alertas. Una caída del puntaje online es tan importante como un pico de errores 5xx; y muchas sesiones que llegan al límite de turnos suelen indicar un bucle.',
      flows: ['cw>alerts', 'lf>alerts', 'evals>alerts'],
      data: {
        title: 'reglas de alerta (ilustrativo)',
        lang: 'yaml',
        content: `alertas:
  - nombre: latencia-turno
    condicion: p95(duracion invoke_agent) > 12s durante 15 min
  - nombre: errores-tools
    condicion: tasa_error(execute_tool) > 5 % por herramienta
  - nombre: costo-diario
    condicion: costo_usd por app.equipo > presupuesto_diario
  - nombre: calidad-online
    condicion: fidelidad(evals online) < 0.90 en 24 h
  - nombre: posibles-bucles
    condicion: sesiones con turnos >= limite > 2 %`,
        hl: ['calidad-online', 'posibles-bucles'],
      },
    },
  ],
}
