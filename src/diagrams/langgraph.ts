import type { IsoSpec } from '../components/iso/types'

export const langgraphGrafo: IsoSpec = {
  id: 'langgraph-grafo',
  title: 'StateGraph con routing, checkpoints e interrupt',
  summary:
    'Un **StateGraph** de soporte: un nodo clasifica, una **arista condicional** enruta a reembolso o FAQ, y el reembolso pasa por un **interrupt** que espera aprobación humana. El **checkpointer** guarda el estado tras cada paso (por `thread_id`), lo que permite pausar días y reanudar con `Command(resume=...)`.',
  height: 490,
  zones: [{ id: 'g', label: 'StateGraph compilado', from: [-1.4, -4.9], to: [14.2, 1.6], tone: 'agent' }],
  nodes: [
    { id: 'client', label: 'App / supervisor', sub: 'invoke · Command(resume)', at: [0, -3.3], shape: 'person', tone: 'user', icon: 'user', info: 'La aplicación invoca el grafo con `config={"configurable": {"thread_id": ...}}`. Cuando el grafo se pausa, un supervisor revisa y reanuda con `Command(resume=True)`.' },
    { id: 'start', label: 'START', at: [0, 0], shape: 'box', tone: 'neutral', icon: 'flag', info: 'Nodo virtual de entrada. `builder.add_edge(START, "clasificar")` define por dónde empieza la ejecución.' },
    { id: 'classify', label: 'clasificar', sub: 'nodo LLM', at: [3.2, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Un nodo es una función que recibe el estado y devuelve una **actualización parcial** (p. ej. `{"intent": "reembolso"}`). Los reducers deciden cómo se combina con el estado actual.' },
    { id: 'router', label: 'route_intent', sub: 'arista condicional', at: [6.4, 0], shape: 'diamond', tone: 'guard', icon: 'split', info: '`add_conditional_edges("clasificar", route_intent)`: una función de Python que lee el estado y devuelve el nombre del siguiente nodo. Routing determinista en código.' },
    { id: 'refund', label: 'preparar_reembolso', sub: 'tools: ERP', at: [9.6, -3.3], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Calcula el monto y arma la acción, pero no la ejecuta: una acción irreversible pasa antes por aprobación.' },
    { id: 'approval', label: 'aprobación', sub: 'interrupt()', at: [12.8, -3.3], shape: 'box', tone: 'guard', icon: 'hand', info: '`interrupt("¿Apruebas...?")` pausa el grafo, guarda el checkpoint y devuelve el payload al cliente. Al reanudar, `interrupt()` retorna el valor de `Command(resume=...)`. El nodo se **re-ejecuta desde el inicio** al reanudar.' },
    { id: 'faq', label: 'responder_faq', sub: 'RAG', at: [9.6, 3.3], shape: 'box', tone: 'data', icon: 'book', info: 'Rama de consultas informativas: recupera de la base de conocimiento y responde. Sin acciones de escritura.' },
    { id: 'end', label: 'END', at: [12.8, 0], shape: 'box', tone: 'neutral', icon: 'check', info: 'Nodo virtual de salida. El estado final queda guardado en el último checkpoint del thread.' },
    { id: 'ckpt', label: 'Checkpointer', sub: 'PostgresSaver · thread_id', at: [3.2, 3.3], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Guarda un snapshot del estado al final de cada *super-step*. Habilita memoria de conversación, HITL, *time travel* y tolerancia a fallos. `InMemorySaver` para desarrollo, Postgres/Redis en producción.' },
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
  steps: [
    { title: '1 · Invocación con thread_id', body: 'La app llama `graph.invoke({"messages": [...]}, config)` con `thread_id="ticket-4512"`. Ese ID agrupa todos los checkpoints de la conversación.', flows: ['client>start', 'start>classify'] },
    { title: '2 · Nodo y reducer', body: 'El nodo `clasificar` devuelve `{"intent": "reembolso"}`. El estado se actualiza según los reducers (p. ej. `add_messages` agrega mensajes en vez de reemplazarlos). Se guarda un checkpoint.', flows: ['classify>ckpt'] },
    { title: '3 · Arista condicional', body: '`route_intent(state)` lee `state["intent"]` y devuelve `"preparar_reembolso"`. La decisión es código, no el LLM: predecible y testeable.', flows: ['classify>router', 'router>refund'] },
    { title: '4 · Interrupt: pausa durable', body: 'El nodo de aprobación llama `interrupt(...)`. El grafo se detiene, persiste el estado y el cliente recibe el payload en `__interrupt__`. Puede pasar un minuto o tres días.', flows: ['refund>approval', 'approval>client'] },
    { title: '5 · Reanudar con Command', body: 'El supervisor aprueba: la app llama `graph.invoke(Command(resume=True), config)` con el mismo `thread_id`. El checkpointer restaura el estado y el nodo continúa.', flows: ['client>approval', 'ckpt>approval'] },
    { title: '6 · Fin o rama alternativa', body: 'El grafo llega a `END`. Si la intención hubiera sido informativa, la arista condicional habría ido a `responder_faq`, sin aprobación.', flows: ['approval>end', 'router>faq', 'faq>end'] },
  ],
}

export const langgraphSupervisor: IsoSpec = {
  id: 'langgraph-supervisor',
  title: 'Patrón supervisor con subgrafos',
  summary:
    'En el patrón **supervisor**, un agente central decide a qué especialista delegar. Cada especialista puede ser un **subgrafo** compilado (con su propio estado y herramientas) usado como nodo o como herramienta. El checkpointer del grafo padre se propaga a los subgrafos y el **store** guarda memoria de largo plazo entre threads.',
  height: 480,
  nodes: [
    { id: 'user', label: 'Cliente banca', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Escribe al asistente del banco: *"No reconozco un cargo de ayer y quiero bloquear la tarjeta"*.' },
    { id: 'sup', label: 'Supervisor', sub: 'create_agent + tools', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'router', info: 'Agente cuyas herramientas son los especialistas. Decide el orden, consolida resultados y responde. Con LangChain 1.x se construye con `create_agent`.' },
    { id: 'cards', label: 'Tarjetas', sub: 'subgrafo', at: [6.8, -3.4], shape: 'tall', tone: 'agent', icon: 'card', scale: 0.85, info: 'Subgrafo con su propio estado y un interrupt antes de bloquear la tarjeta. Al estar dentro del grafo padre, hereda el checkpointer.' },
    { id: 'disputes', label: 'Disputas', sub: 'subgrafo', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'scroll', scale: 0.85, info: 'Especialista que abre la disputa de un cargo y genera el folio. Su lógica interna es un grafo con pasos deterministas.' },
    { id: 'faq', label: 'Productos', sub: 'agente RAG', at: [6.8, 3.4], shape: 'tall', tone: 'agent', icon: 'book', scale: 0.85, info: 'Responde preguntas sobre productos y condiciones desde la base de conocimiento. Solo lectura.' },
    { id: 'core', label: 'Core bancario', sub: 'API vía MCP', at: [10.2, -1.7], shape: 'box', tone: 'tool', icon: 'server', info: 'Sistemas transaccionales expuestos como herramientas. Las de escritura requieren aprobación (middleware HITL o `interrupt`).' },
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
  steps: [
    { title: '1 · Petición compuesta', body: 'El cliente pide dos cosas a la vez. El supervisor recupera del **store** que es cliente premium y prefiere WhatsApp.', flows: ['user>sup', 'store>sup'] },
    { title: '2 · Delegar el bloqueo', body: 'El supervisor delega al subgrafo de **Tarjetas**, que prepara el bloqueo y se pausa con un interrupt para confirmación del cliente.', flows: ['sup>cards', 'cards>core'] },
    { title: '3 · Delegar la disputa', body: 'Tras confirmar, delega al subgrafo de **Disputas**, que abre el caso en el core y devuelve el folio.', flows: ['sup>disputes', 'disputes>core', 'disputes>sup'] },
    { title: '4 · Consulta informativa', body: 'El cliente pregunta si le cobrarán la reposición. El supervisor consulta al agente de **Productos** (RAG).', flows: ['sup>faq', 'faq>sup'] },
    { title: '5 · Respuesta consolidada', body: 'El supervisor responde con el folio, el estado del bloqueo y la condición de reposición. Todo quedó en checkpoints del mismo thread.', flows: ['sup>user'] },
  ],
}
