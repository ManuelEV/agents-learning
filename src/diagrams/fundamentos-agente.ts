import type { IsoSpec } from '../components/iso/types'

export const agentLoop: IsoSpec = {
  id: 'agent-loop',
  title: 'El loop agéntico paso a paso',
  summary:
    'Un agente es un LLM que **usa herramientas en un loop** hasta cumplir el objetivo. El código del agente (el *harness*) arma el contexto, llama al modelo, ejecuta las herramientas que el modelo pide y repite hasta que el modelo responde sin pedir más herramientas o se alcanza un límite.',
  height: 470,
  nodes: [
    { id: 'user', label: 'Usuario', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Plantea un objetivo, no una secuencia de pasos: "Reprograma mi reunión con el equipo de ventas al jueves".' },
    { id: 'agent', label: 'Harness del agente', sub: 'tu código / framework', at: [3.2, 0], shape: 'tall', tone: 'agent', icon: 'repeat', info: 'El "esqueleto" que implementa el loop: mantiene el historial, valida llamadas a herramientas, aplica límites de turnos/costo y guardrails. Es lo que te dan ADK, Strands, LangGraph o el Claude Agent SDK.' },
    { id: 'context', label: 'Contexto', sub: 'instrucciones + historial', at: [3.2, 3.2], shape: 'doc', tone: 'memory', icon: 'scroll', info: 'Lo que el modelo "ve" en cada turno: system prompt, definiciones de herramientas, historial y resultados previos. Gestionarlo bien es *context engineering*.' },
    { id: 'model', label: 'LLM', sub: 'razona y decide', at: [3.2, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Recibe el contexto y responde con texto **o** con una solicitud estructurada de herramienta (`tool_use`: nombre + argumentos JSON). No ejecuta nada por sí mismo.' },
    { id: 'cal', label: 'calendar.find_slots', sub: 'herramienta', at: [6.6, -1.6], shape: 'box', tone: 'tool', icon: 'timer', info: 'Herramienta de lectura: busca huecos libres. Bajo riesgo, se ejecuta sin aprobación.' },
    { id: 'move', label: 'calendar.move_event', sub: 'herramienta (escritura)', at: [6.6, 1.6], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Herramienta de escritura: modifica el calendario y notifica a asistentes. Riesgo medio: conviene confirmación del usuario o una política explícita.' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'context', to: 'agent', route: 'z' },
    { from: 'agent', to: 'model', label: 'contexto + tools' },
    { from: 'agent', to: 'cal', route: 'x' },
    { from: 'agent', to: 'move', route: 'x' },
  ],
  steps: [
    { title: '1 · Objetivo', body: 'El usuario expresa un objetivo en lenguaje natural. El harness lo agrega al historial de la sesión.', flows: ['user>agent'] },
    { title: '2 · Armar el contexto', body: 'El harness compone el contexto: instrucciones del sistema, definiciones de herramientas (nombre, descripción, JSON Schema) y el historial relevante.', flows: ['context>agent'] },
    { title: '3 · El modelo decide', body: 'Se llama al LLM. En vez de responder texto, devuelve un bloque `tool_use`: quiere llamar `calendar.find_slots` con `{"day": "jueves"}`.', flows: ['agent>model', 'model>agent'] },
    { title: '4 · Ejecutar la herramienta', body: 'El harness **valida** los argumentos y ejecuta la herramienta. El resultado (`tool_result`) se agrega al historial. El modelo nunca toca el sistema directamente.', flows: ['agent>cal', 'cal>agent'] },
    { title: '5 · Iterar', body: 'Con los huecos disponibles en contexto, el modelo pide `calendar.move_event`. Al ser una acción de escritura, el harness puede pedir confirmación (*human-in-the-loop*).', flows: ['agent>model', 'model>agent', 'agent>move', 'move>agent'] },
    { title: '6 · Condición de parada', body: 'El modelo responde sin pedir más herramientas: el loop termina. También debe terminar por **límite de turnos, costo o tiempo**, o por un error no recuperable.', flows: ['agent>model', 'model>agent'] },
    { title: '7 · Respuesta', body: 'El harness devuelve la respuesta final al usuario y persiste la sesión. Cada iteración del loop queda trazada para depurar y evaluar.', flows: ['agent>user', 'agent>context'] },
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
