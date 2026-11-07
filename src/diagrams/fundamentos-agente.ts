import type { ApiMessage, IsoSpec } from '../components/iso/types'

/** Mismo código que el bloque `loop_minimo.py` del artículo: el diagrama resalta sus líneas paso a paso. */
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

const GOAL = 'Reprograma mi reunión con el equipo de ventas al jueves'
const M_USER: ApiMessage = { role: 'user', content: GOAL }
const M_CALL1: ApiMessage = {
  role: 'assistant',
  note: 'llamada 1',
  content: [
    { type: 'text', text: 'Busco huecos libres el jueves.' },
    { type: 'tool_use', id: 'toolu_01', name: 'find_slots', input: { day: '2026-11-12', duration_min: 30, attendees: ['ventas@acme.cl'] } },
  ],
}
const M_RES1: ApiMessage = {
  role: 'user',
  note: 'resultado de la herramienta',
  content: [{ type: 'tool_result', tool_use_id: 'toolu_01', content: { slots: ['10:00', '15:30'] } }],
}
const M_CALL2: ApiMessage = {
  role: 'assistant',
  note: 'llamada 2',
  content: [{ type: 'tool_use', id: 'toolu_02', name: 'move_event', input: { event_id: 'evt_77', start: '2026-11-12T10:00:00-03:00' } }],
}
const M_RES2: ApiMessage = {
  role: 'user',
  note: 'aprobado por el usuario',
  content: [{ type: 'tool_result', tool_use_id: 'toolu_02', content: { ok: true, notified: 6 } }],
}
const M_FINAL: ApiMessage = {
  role: 'assistant',
  note: 'llamada 3 · end_turn',
  content: [{ type: 'text', text: 'Listo: la reunión con ventas quedó el jueves 12 a las 10:00 y avisé a los 6 asistentes.' }],
}

const json = (v: unknown) => JSON.stringify(v, null, 2)

export const agentLoop: IsoSpec = {
  id: 'agent-loop',
  title: 'El loop agéntico paso a paso',
  summary:
    'Un agente es un LLM que **usa herramientas en un loop** hasta cumplir el objetivo. El código del agente (el *harness*) arma el contexto, llama al modelo, ejecuta las herramientas que el modelo pide y repite hasta que el modelo responde sin pedir más herramientas o se alcanza un límite. En cada paso ves el arreglo `messages` crecer y la línea de `loop_minimo.py` que lo produce.',
  height: 470,
  nodes: [
    { id: 'user', label: 'Usuario', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Plantea un objetivo, no una secuencia de pasos: "Reprograma mi reunión con el equipo de ventas al jueves".' },
    { id: 'agent', label: 'Harness del agente', sub: 'tu código / framework', at: [3.2, 0], shape: 'tall', tone: 'agent', icon: 'repeat', info: 'El "esqueleto" que implementa el loop: mantiene el historial, valida llamadas a herramientas, aplica límites de turnos/costo y guardrails. Es lo que te dan ADK, Strands, LangGraph o el Claude Agent SDK.' },
    { id: 'context', label: 'Contexto', sub: 'instrucciones + historial', at: [3.2, 3.2], shape: 'doc', tone: 'memory', icon: 'scroll', info: 'Lo que el modelo "ve" en cada turno: system prompt, definiciones de herramientas, historial y resultados previos. Gestionarlo bien es *context engineering*.' },
    { id: 'model', label: 'LLM', sub: 'razona y decide', at: [3.2, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Recibe el contexto y responde con texto **o** con una solicitud estructurada de herramienta (`tool_use`: nombre + argumentos JSON). No ejecuta nada por sí mismo.' },
    { id: 'cal', label: 'find_slots', sub: 'calendario · lectura', at: [6.6, -1.6], shape: 'box', tone: 'tool', icon: 'timer', info: 'Herramienta de lectura: busca huecos libres. Bajo riesgo, se ejecuta sin aprobación.' },
    { id: 'move', label: 'move_event', sub: 'calendario · escritura', at: [6.6, 1.6], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Herramienta de escritura: modifica el calendario y notifica a asistentes. Riesgo medio: conviene confirmación del usuario o una política explícita.' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'context', to: 'agent', route: 'z' },
    { from: 'agent', to: 'model', label: 'contexto + tools' },
    { from: 'agent', to: 'cal', route: 'x' },
    { from: 'agent', to: 'move', route: 'x' },
  ],
  code: { loop: { title: 'loop_minimo.py', lang: 'python', source: LOOP } },
  steps: [
    {
      title: '1 · Objetivo',
      body: 'El usuario expresa un objetivo en lenguaje natural. El harness crea el historial de la sesión con un único mensaje `user`.',
      flows: ['user>agent'],
      data: { title: 'messages', messages: [M_USER], newFrom: 0 },
      code: { hl: ['def run_agent', 'messages = [{"role": "user"'] },
    },
    {
      title: '2 · Armar el contexto',
      body: 'Cada vuelta del loop compone la petición completa: instrucciones del sistema, **definiciones de herramientas** (nombre, descripción, JSON Schema) y todo el historial. El modelo no recuerda nada entre llamadas: lo que no está aquí, no existe.',
      flows: ['context>agent'],
      data: {
        title: 'POST /v1/messages · cuerpo de la petición',
        lang: 'json',
        content: json({
          model: 'claude-sonnet-5-5',
          max_tokens: 1024,
          system: 'Eres el asistente de agenda de Acme. Confirma antes de modificar eventos.',
          tools: [
            {
              name: 'find_slots',
              description: 'Busca huecos libres en el calendario.',
              input_schema: { type: 'object', properties: { day: { type: 'string', format: 'date' }, duration_min: { type: 'integer' } }, required: ['day'] },
            },
            {
              name: 'move_event',
              description: 'Mueve un evento y notifica a los asistentes.',
              input_schema: { type: 'object', properties: { event_id: { type: 'string' }, start: { type: 'string', format: 'date-time' } }, required: ['event_id', 'start'] },
            },
          ],
          messages: [{ role: 'user', content: GOAL }],
        }),
        hl: ['"system"', '"tools"', '"messages"'],
      },
      code: { hl: ['for _ in range(max_turns)', 'llm.call(system=INSTRUCTIONS', 'tools=[t.schema'] },
    },
    {
      title: '3 · El modelo decide',
      body: 'El LLM no responde con texto final: devuelve un bloque `tool_use` con el nombre de la herramienta y argumentos JSON, y `stop_reason: "tool_use"`. Es una **solicitud**, no una ejecución.',
      flows: ['agent>model', 'model>agent'],
      data: {
        title: 'respuesta de la API',
        lang: 'json',
        content: json({
          id: 'msg_01',
          type: 'message',
          role: 'assistant',
          content: [
            { type: 'text', text: 'Busco huecos libres el jueves.' },
            { type: 'tool_use', id: 'toolu_01', name: 'find_slots', input: { day: '2026-11-12', duration_min: 30 } },
          ],
          stop_reason: 'tool_use',
          usage: { input_tokens: 512, output_tokens: 61 },
        }),
        hl: ['"tool_use"', '"stop_reason"'],
      },
      code: { hl: ['messages.append(response.as_message())', 'if not response.tool_calls'] },
    },
    {
      title: '4 · Ejecutar la herramienta',
      body: 'El harness **valida** los argumentos contra el esquema y ejecuta la herramienta. El resultado vuelve al historial como bloque `tool_result` enlazado por `tool_use_id`. El modelo nunca toca el sistema directamente.',
      flows: ['agent>cal', 'cal>agent'],
      data: { title: 'messages', messages: [M_USER, M_CALL1, M_RES1], newFrom: 1, hl: [2] },
      code: { hl: ['for call in response.tool_calls', 'tool = tools[call.name]', 'tool.validate', 'tool.run(**args)', 'tool_result(call.id'] },
    },
    {
      title: '5 · Iterar',
      body: 'Segunda vuelta: con los huecos en contexto, el modelo pide `move_event`. Es una acción de **escritura**, así que el harness puede pausar y pedir confirmación (*human-in-the-loop*) antes de ejecutarla.',
      flows: ['agent>model', 'model>agent', 'agent>move', 'move>agent'],
      data: { title: 'messages', messages: [M_USER, M_CALL1, M_RES1, M_CALL2, M_RES2], newFrom: 3, hl: [3, 4] },
      code: { hl: ['for _ in range(max_turns)', 'llm.call(system=INSTRUCTIONS', 'tool.run(**args)'] },
    },
    {
      title: '6 · Condición de parada',
      body: 'El modelo responde solo con texto y `stop_reason: "end_turn"`: no hay `tool_calls`, el loop termina. También debe terminar por **límite de turnos, costo o tiempo**: la última línea es tu red de seguridad.',
      flows: ['agent>model', 'model>agent'],
      data: {
        title: 'respuesta de la API',
        lang: 'json',
        content: json({
          id: 'msg_03',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Listo: la reunión con ventas quedó el jueves 12 a las 10:00 y avisé a los 6 asistentes.' }],
          stop_reason: 'end_turn',
          usage: { input_tokens: 781, output_tokens: 34 },
        }),
        hl: ['"stop_reason"'],
      },
      code: { hl: ['if not response.tool_calls', 'return response.text', 'raise TurnLimitExceeded'] },
    },
    {
      title: '7 · Respuesta',
      body: 'El harness devuelve la respuesta al usuario y persiste la sesión. Fueron **3 llamadas al modelo y 2 a herramientas**: cada una queda trazada para depurar, medir costo y evaluar.',
      flows: ['agent>user', 'agent>context'],
      data: { title: 'messages (historial final)', messages: [M_USER, M_CALL1, M_RES1, M_CALL2, M_RES2, M_FINAL], newFrom: 5, hl: [5] },
      code: { hl: ['return response.text'] },
    },
  ],
}

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

/** Workflow: la ruta está escrita en código; los LLMs son pasos acotados dentro de ella. */
const WF = `import json
from pydantic import BaseModel, ValidationError

class Reclamo(BaseModel):
    order_id: str
    motivo: str        # "retraso" | "dañado" | "otro"
    pide: str
    tono: str

MOTIVOS = {"retraso", "dañado", "otro"}

def procesar_reclamo(correo: str) -> dict:
    # Paso 1 · LLM acotado: SOLO extraer campos a JSON (modelo pequeño)
    raw = llm(EXTRAER_PROMPT, correo, model="claude-haiku")

    # Paso 2 · gate en código: esquema + reglas de negocio
    try:
        r = Reclamo.model_validate_json(raw)
    except ValidationError as e:
        return a_revision(correo, motivo=str(e))
    if r.motivo not in MOTIVOS or not erp.existe_pedido(r.order_id):
        return a_revision(correo, motivo="pedido o motivo inválido")

    # Paso 3 · LLM con entrada ya validada: redactar la respuesta
    pedido = erp.estado_pedido(r.order_id)
    contexto = json.dumps({"reclamo": r.model_dump(), "pedido": pedido})
    borrador = llm(RESPONDER_PROMPT, contexto, model="claude-sonnet")
    return {"estado": "borrador_listo", "respuesta": borrador}`

/** Agente: mismo dominio, pero el modelo decide qué herramienta usar y cuándo parar. */
const AG = `from strands import Agent, tool

@tool
def get_order_status(order_id: str) -> dict:
    """Devuelve el estado logístico de un pedido."""
    return erp.estado_pedido(order_id)

@tool
def create_ticket(order_id: str, motivo: str, prioridad: str) -> dict:
    """Crea un ticket de postventa. prioridad: "baja" | "media" | "alta"."""
    return tickets.crear(order_id=order_id, motivo=motivo, prioridad=prioridad)

agent = Agent(
    model="global.anthropic.claude-sonnet-5-5",   # perfil de inferencia de Bedrock
    system_prompt="Resuelves reclamos de pedidos. Usa las herramientas; no inventes datos.",
    tools=[get_order_status, create_ticket],
)

# No hay ruta escrita: el modelo elige herramientas, orden y cuándo terminar
respuesta = agent("Mi pedido 4512 no llega y lo necesito para el viernes. ¿Qué pueden hacer?")`

const CORREO = `De: ana.rojas@correo.cl
Asunto: Pedido 4512 atrasado

Hola, compré una chaqueta (pedido 4512) y me dijeron que llegaba
el 1 de noviembre. Hoy es 5 y nada. Necesito una solución o
quiero mi dinero de vuelta. Ana`

const AG_GOAL = 'Mi pedido 4512 no llega y lo necesito para el viernes. ¿Qué pueden hacer?'

export const workflowVsAgent: IsoSpec = {
  id: 'workflow-vs-agent',
  title: 'Workflow vs. agente',
  summary:
    'En un **workflow** el código define la ruta: los LLMs son pasos dentro de un flujo predefinido. En un **agente** el LLM decide dinámicamente qué hacer a continuación. Arriba, un reclamo por correo recorre siempre los mismos tres pasos; abajo, un agente atiende el mismo tipo de reclamo eligiendo él mismo las herramientas. Compara en cada paso el dato que viaja y quién toma la decisión: `workflow.py` o el modelo.',
  height: 440,
  zones: [
    { id: 'wf', label: 'Workflow (ruta fija)', from: [-1.4, -4.8], to: [9.8, -2.2], tone: 'infra' },
    { id: 'ag', label: 'Agente (ruta dinámica)', from: [-1.4, 0.6], to: [9.8, 5.6], tone: 'agent' },
  ],
  nodes: [
    { id: 'in1', label: 'Correo de reclamo', sub: 'pedido 4512', at: [0, -3.5], shape: 'doc', tone: 'user', icon: 'mail', info: 'Un reclamo llega por correo. El workflow siempre lo procesa igual, sin importar el contenido.' },
    { id: 'llm1', label: 'Extraer campos', sub: 'LLM pequeño', at: [2.8, -3.5], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Paso LLM acotado: convierte texto libre en JSON (`order_id`, `motivo`, `pide`, `tono`). Un modelo pequeño basta porque la tarea es simple.' },
    { id: 'gate', label: 'Validar', sub: 'código', at: [5.6, -3.5], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Gate programático: Pydantic valida el esquema y el código comprueba que el pedido exista. Si falla, el reclamo va a revisión humana en vez de seguir.' },
    { id: 'llm2', label: 'Redactar respuesta', sub: 'LLM', at: [8.4, -3.5], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Segundo paso LLM con entrada ya validada y el estado real del pedido: redacta un borrador de respuesta.' },
    { id: 'in2', label: 'Cliente', sub: 'chat web', at: [0, 3], shape: 'person', tone: 'user', icon: 'user', info: 'El cliente plantea un objetivo abierto en el chat: "Mi pedido 4512 no llega, ¿qué pueden hacer?".' },
    { id: 'ag', label: 'Agente', sub: 'LLM en loop · Strands', at: [3.4, 3], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Decide qué herramientas usar, en qué orden y cuándo parar. El loop lo implementa el framework (aquí Strands sobre Bedrock).' },
    { id: 't1', label: 'get_order_status', sub: 'lectura · ERP', at: [7, 1.6], shape: 'box', tone: 'tool', icon: 'search', info: 'Herramienta de lectura. El agente decide si la usa; no hay ninguna línea de código que diga "primero consulta el pedido".' },
    { id: 't2', label: 'create_ticket', sub: 'escritura · tickets', at: [7, 4.4], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Herramienta de escritura. El agente la invoca solo si lo considera necesario, con la prioridad que él elige.' },
  ],
  edges: [
    { from: 'in1', to: 'llm1' },
    { from: 'llm1', to: 'gate' },
    { from: 'gate', to: 'llm2', label: 'ok' },
    { from: 'in2', to: 'ag' },
    { from: 'ag', to: 't1' },
    { from: 'ag', to: 't2' },
  ],
  code: {
    wf: { title: 'workflow.py (ilustrativo)', lang: 'python', source: WF },
    ag: { title: 'agente.py (ilustrativo)', lang: 'python', source: AG },
  },
  steps: [
    {
      title: '1 · Workflow: entra el reclamo',
      body: 'Llega un correo. La función `procesar_reclamo` ya tiene escritos sus tres pasos: lo que diga el correo no cambia la ruta, solo los datos que la recorren.',
      flows: ['in1>llm1'],
      data: { title: 'entrada: correo del cliente', lang: 'text', content: CORREO, hl: ['pedido 4512', 'dinero de vuelta'] },
      code: { file: 'wf', hl: ['def procesar_reclamo'] },
    },
    {
      title: '2 · Paso LLM acotado',
      body: 'El primer paso hace **una sola cosa**: extraer campos a JSON. Al acotar la tarea, un modelo pequeño y barato rinde bien y el resultado es fácil de verificar.',
      focus: ['llm1'],
      data: {
        title: 'salida del paso 1 (texto JSON del modelo)',
        lang: 'json',
        content: json({ order_id: '4512', motivo: 'retraso', pide: 'solución o reembolso', tono: 'molesto' }),
        hl: ['"order_id"', '"motivo"'],
      },
      code: { file: 'wf', hl: ['raw = llm(EXTRAER_PROMPT'] },
    },
    {
      title: '3 · Gate programático',
      body: 'Antes de gastar otra llamada, el **código** valida el esquema y una regla de negocio (el pedido existe en el ERP). Si algo falla, el reclamo sale del flujo hacia revisión humana con el motivo exacto.',
      flows: ['llm1>gate'],
      data: {
        title: 'resultado del gate (ilustrativo)',
        lang: 'json',
        content: json({ schema_ok: true, motivo_valido: true, pedido_existe: true, siguiente: 'redactar' }),
        hl: ['"schema_ok"', '"pedido_existe"'],
      },
      code: { file: 'wf', hl: ['Reclamo.model_validate_json', 'except ValidationError', 'erp.existe_pedido', 'a_revision(correo, motivo="pedido'] },
    },
    {
      title: '4 · Segundo paso LLM',
      body: 'Con datos validados y el estado real del pedido, otra llamada redacta la respuesta. Siempre son **2 llamadas LLM** por reclamo: costo y latencia predecibles, y cada paso se evalúa por separado.',
      flows: ['gate>llm2'],
      data: {
        title: 'salida del workflow',
        lang: 'json',
        content: json({
          estado: 'borrador_listo',
          respuesta: 'Hola Ana, lamentamos el retraso del pedido 4512. Hoy está en ruta con entrega estimada el 7 de noviembre. Si prefieres, puedes solicitar la devolución al recibirlo.',
        }),
        hl: ['"estado"'],
      },
      code: { file: 'wf', hl: ['pedido = erp.estado_pedido', 'borrador = llm(RESPONDER_PROMPT', 'return {"estado": "borrador_listo"'] },
    },
    {
      title: '5 · Agente: objetivo + herramientas',
      body: 'El agente no recibe pasos, recibe un **objetivo** y un menú de herramientas. Strands envía a Bedrock el mensaje y las definiciones (`toolSpec`) generadas desde las funciones decoradas con `@tool`.',
      flows: ['in2>ag'],
      data: {
        title: 'bedrock.converse(...) que arma Strands (forma simplificada)',
        lang: 'json',
        content: jsonc({
          modelId: 'global.anthropic.claude-sonnet-5-5',
          system: [{ text: 'Resuelves reclamos de pedidos. Usa las herramientas; no inventes datos.' }],
          messages: [{ role: 'user', content: [{ text: AG_GOAL }] }],
          toolConfig: {
            tools: [
              { toolSpec: { name: 'get_order_status', description: 'Devuelve el estado logístico de un pedido.', inputSchema: { json: { type: 'object', properties: { order_id: { type: 'string' } }, required: ['order_id'] } } } },
              { toolSpec: { name: 'create_ticket', description: 'Crea un ticket de postventa.', inputSchema: { json: { type: 'object', properties: { order_id: { type: 'string' }, motivo: { type: 'string' }, prioridad: { type: 'string' } }, required: ['order_id', 'motivo', 'prioridad'] } } } },
            ],
          },
        }),
        hl: ['"toolConfig"', '"get_order_status"', '"create_ticket"'],
      },
      code: { file: 'ag', hl: ['agent = Agent(', 'tools=[get_order_status, create_ticket]', 'respuesta = agent('] },
    },
    {
      title: '6 · El modelo elige la ruta',
      body: 'Nadie escribió "consulta y luego crea un ticket": el modelo decidió llamar `get_order_status`, leyó el retraso y **eligió** abrir un ticket con prioridad alta. Con otro mensaje podría haber hecho una sola llamada, o tres.',
      flows: ['ag>t1', 't1>ag', 'ag>t2', 't2>ag'],
      data: {
        title: 'messages tras dos vueltas del loop (formato Converse)',
        lang: 'json',
        content: jsonc([
          { role: 'user', content: [{ text: AG_GOAL }] },
          { role: 'assistant', content: [{ toolUse: { toolUseId: 'tooluse_01', name: 'get_order_status', input: { order_id: '4512' } } }] },
          { role: 'user', content: [{ toolResult: { toolUseId: 'tooluse_01', content: [{ json: { status: 'retrasado', eta: '2026-11-07' } }] } }] },
          { role: 'assistant', content: [{ toolUse: { toolUseId: 'tooluse_02', name: 'create_ticket', input: { order_id: '4512', motivo: 'retraso > 3 días', prioridad: 'alta' } } }] },
          { role: 'user', content: [{ toolResult: { toolUseId: 'tooluse_02', content: [{ json: { ticket_id: 'TCK-88231' } }] } }] },
        ]),
        hl: ['"toolUse"', '"toolResult"', '"prioridad"'],
      },
      code: { file: 'ag', hl: ['def get_order_status', 'def create_ticket'] },
    },
    {
      title: '7 · Regla práctica',
      body: 'El workflow hace siempre 2 llamadas; el agente hizo 3 en este caso y puede hacer más en otro. Empieza por lo más simple: **una llamada → workflow → agente**, y sube de nivel solo cuando una medición muestre que lo necesitas.',
      focus: ['llm1', 'ag'],
      code: { file: 'ag', hl: ['# No hay ruta escrita'] },
    },
  ],
}
