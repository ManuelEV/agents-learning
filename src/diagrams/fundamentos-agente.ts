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

export const workflowVsAgent: IsoSpec = {
  id: 'workflow-vs-agent',
  title: 'Workflow vs. agente',
  summary:
    'En un **workflow** el código define la ruta: los LLMs son pasos dentro de un flujo predefinido. En un **agente** el LLM decide dinámicamente qué hacer a continuación. La mayoría de los sistemas empresariales combinan ambos.',
  height: 440,
  zones: [
    { id: 'wf', label: 'Workflow (ruta fija)', from: [-1.4, -4.8], to: [9.8, -2.2], tone: 'infra' },
    { id: 'ag', label: 'Agente (ruta dinámica)', from: [-1.4, 0.6], to: [9.8, 5.6], tone: 'agent' },
  ],
  nodes: [
    { id: 'in1', label: 'Entrada', at: [0, -3.5], shape: 'doc', tone: 'user', icon: 'file', info: 'Un documento o evento entra al flujo.' },
    { id: 'llm1', label: 'Extraer', sub: 'LLM', at: [2.8, -3.5], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Paso LLM acotado: extraer campos a JSON.' },
    { id: 'gate', label: 'Validar', sub: 'código', at: [5.6, -3.5], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Gate programático: si la validación falla, se reintenta o se escala.' },
    { id: 'llm2', label: 'Resumir', sub: 'LLM', at: [8.4, -3.5], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Segundo paso LLM con entrada ya validada.' },
    { id: 'in2', label: 'Objetivo', at: [0, 3], shape: 'person', tone: 'user', icon: 'user', info: 'El usuario plantea un objetivo abierto.' },
    { id: 'ag', label: 'Agente', sub: 'LLM en loop', at: [3.4, 3], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Decide qué herramientas usar, en qué orden y cuándo parar.' },
    { id: 't1', label: 'Buscar', at: [7, 1.6], shape: 'box', tone: 'tool', icon: 'search', info: 'Herramienta disponible; el agente decide si la usa.' },
    { id: 't2', label: 'Actuar', at: [7, 4.4], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Otra herramienta; el orden no está predefinido.' },
  ],
  edges: [
    { from: 'in1', to: 'llm1' },
    { from: 'llm1', to: 'gate' },
    { from: 'gate', to: 'llm2' },
    { from: 'in2', to: 'ag' },
    { from: 'ag', to: 't1' },
    { from: 'ag', to: 't2' },
  ],
  steps: [
    { title: 'Workflow: ruta definida por código', body: 'Cada paso está escrito de antemano: extraer → validar → resumir. Es **predecible, barato y fácil de evaluar**. Ideal cuando la tarea se descompone en pasos fijos.', flows: ['in1>llm1', 'llm1>gate', 'gate>llm2'] },
    { title: 'Gates programáticos', body: 'Entre pasos se colocan validaciones en código (esquemas, reglas de negocio). Si fallan, el flujo reintenta o escala a una persona.', focus: ['gate'] },
    { title: 'Agente: el modelo elige la ruta', body: 'El agente recibe un objetivo y decide sobre la marcha qué herramienta usar. Más **flexible** para tareas abiertas, pero más caro, más lento y más difícil de evaluar.', flows: ['in2>ag', 'ag>t1', 't1>ag', 'ag>t2'] },
    { title: 'Regla práctica', body: 'Empieza por la solución más simple: una sola llamada al LLM → workflow → agente. Sube de nivel solo cuando la medición muestre que lo necesitas.', focus: ['llm1', 'ag'] },
  ],
}
