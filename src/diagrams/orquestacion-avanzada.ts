import type { IsoSpec } from '../components/iso/types'

export const orquestacionSupervisor: IsoSpec = {
  id: 'orquestacion-supervisor',
  title: 'Supervisor con especialistas y aprobación humana',
  summary:
    'Un **supervisor** descompone el caso y delega en especialistas con contexto aislado. Antes de cualquier acción de escritura, una **política de riesgo** decide si hace falta **aprobación humana**; el estado queda en un checkpoint para poder esperar horas sin perder nada. Ejemplo: disputas de cobro a clientes empresa.',
  height: 500,
  nodes: [
    { id: 'user', label: 'Ejecutivo de cuenta', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Abre el caso: "El cliente Andina SpA disputa la factura 88123 por cobro duplicado de fletes".' },
    { id: 'sup', label: 'Supervisor', sub: 'planifica y sintetiza', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'workflow', info: 'Decide qué especialistas invocar, con qué instrucciones y en qué orden. Recibe resúmenes, no transcripciones completas. Suele usar el modelo más capaz.' },
    { id: 's1', label: 'Investigador ERP', sub: 'solo lectura', at: [3.4, -3.4], shape: 'box', tone: 'tool', icon: 'search', info: 'Consulta facturas, guías de despacho y pagos. Herramientas de lectura únicamente: su contexto se llena de datos que el supervisor nunca verá completos.' },
    { id: 's2', label: 'Analista de contrato', sub: 'RAG sobre contratos', at: [6.8, -3.4], shape: 'box', tone: 'data', icon: 'book', info: 'Busca en el contrato marco las condiciones de flete y penalidades aplicables. Devuelve citas.' },
    { id: 's3', label: 'Redactor', sub: 'propuesta y correo', at: [10.2, -3.4], shape: 'box', tone: 'model', icon: 'mail', info: 'Redacta la resolución propuesta (nota de crédito parcial) y el correo al cliente, sin ejecutar nada.' },
    { id: 'gate', label: 'Política de riesgo', sub: 'monto · tipo de acción', at: [6.8, 0], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Regla determinista: notas de crédito sobre USD 1.000, o cualquier acción irreversible, requieren aprobación. El LLM no puede saltarse este nodo.' },
    { id: 'human', label: 'Aprobador', sub: 'finanzas', at: [6.8, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'Recibe la propuesta con evidencia y decide: aprobar, editar o rechazar. Puede tardar minutos o días.' },
    { id: 'erp', label: 'ERP (escritura)', sub: 'nota de crédito', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'La acción real, con idempotency key para que un reintento no emita dos notas de crédito.' },
    { id: 'ckpt', label: 'Checkpoint', sub: 'estado del caso', at: [10.2, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Estado persistido tras cada paso. Permite pausar mientras el humano decide y reanudar exactamente en el mismo punto, incluso en otro proceso.' },
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
  steps: [
    { title: '1 · Caso abierto', body: 'El ejecutivo plantea el caso. El supervisor arma un plan: investigar, revisar contrato, redactar propuesta.', flows: ['user>sup'] },
    { title: '2 · Especialistas con contexto aislado', body: 'Cada especialista trabaja con su propia ventana y herramientas mínimas, y devuelve un **resumen**. El supervisor mantiene un contexto limpio.', flows: ['sup>s1', 's1>sup', 'sup>s2', 's2>sup'] },
    { title: '3 · Propuesta', body: 'El redactor prepara la nota de crédito parcial y el correo. Nada se ha ejecutado todavía.', flows: ['sup>s3', 's3>sup'] },
    { title: '4 · Política de riesgo', body: 'La acción propuesta pasa por una regla determinista. Como supera el umbral, el flujo se **interrumpe** y el estado se guarda en el checkpoint.', flows: ['sup>gate', 'gate>ckpt'] },
    { title: '5 · Humano en el loop', body: 'El aprobador revisa la evidencia y aprueba con un ajuste de monto. Su respuesta reanuda el flujo desde el checkpoint, sin repetir pasos.', flows: ['gate>human', 'human>gate'] },
    { title: '6 · Ejecución idempotente', body: 'Solo ahora se escribe en el ERP, con una clave de idempotencia. El supervisor confirma al ejecutivo.', flows: ['gate>erp', 'sup>user'] },
  ],
}

export const orquestacionSwarm: IsoSpec = {
  id: 'orquestacion-swarm',
  title: 'Swarm: handoffs entre pares',
  summary:
    'En un **swarm** no hay jefe: cada agente puede **transferir** el control a otro con una herramienta de handoff, compartiendo el contexto de la tarea. Es flexible, pero necesita **límites** de handoffs y detección de ping-pong.',
  height: 470,
  nodes: [
    { id: 'user', label: 'Cliente', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: '"Mi pedido llegó incompleto y además me cobraron el envío dos veces."' },
    { id: 'triage', label: 'Triage', sub: 'entry point', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'router', info: 'Punto de entrada del swarm. Entiende el caso y decide a quién transferir.' },
    { id: 'logis', label: 'Logística', at: [6.8, -3.4], shape: 'tall', tone: 'agent', icon: 'boxes', scale: 0.9, info: 'Verifica el despacho y confirma el faltante. Luego transfiere a facturación con un mensaje de contexto.' },
    { id: 'billing', label: 'Facturación', at: [6.8, 3.4], shape: 'tall', tone: 'agent', icon: 'card', scale: 0.9, info: 'Detecta el cobro duplicado de envío. Puede devolver el control o transferir a reembolsos.' },
    { id: 'refund', label: 'Reembolsos', at: [10.2, 0], shape: 'tall', tone: 'agent', icon: 'repeat', scale: 0.9, info: 'Emite el reembolso dentro de la política y redacta la respuesta final al cliente.' },
    { id: 'ctx', label: 'Contexto compartido', sub: 'historial de handoffs', at: [3.4, 3.4], shape: 'doc', tone: 'memory', icon: 'layers', info: 'Todos los agentes ven la tarea original y la lista de agentes que ya participaron, con sus aportes.' },
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
  steps: [
    { title: '1 · Entrada', body: 'El caso entra por el agente de triage, definido como *entry point*.', flows: ['user>triage'] },
    { title: '2 · Primer handoff', body: 'Triage transfiere a logística con un mensaje que resume lo entendido. El control pasa por completo.', flows: ['triage>logis'] },
    { title: '3 · Handoffs encadenados', body: 'Logística confirma el faltante y transfiere a facturación, que detecta el cobro duplicado y transfiere a reembolsos.', flows: ['logis>billing', 'billing>refund'] },
    { title: '4 · Contexto compartido', body: 'Cada agente ve la tarea original y quién participó antes. Sin esto, cada handoff pierde información.', focus: ['ctx'] },
    { title: '5 · Límites', body: 'El swarm se corta si supera el máximo de handoffs, el timeout o si detecta ping-pong. Sin límites, un swarm puede girar indefinidamente.', flows: ['limits>refund'] },
    { title: '6 · Respuesta', body: 'Reembolsos resuelve y responde al cliente. La traza muestra el recorrido completo: triage → logística → facturación → reembolsos.', flows: ['refund>user'] },
  ],
}

export const orquestacionDurable: IsoSpec = {
  id: 'orquestacion-durable',
  title: 'Ejecución durable: checkpoint y reanudación tras una caída',
  summary:
    'En ejecución durable, el **motor** registra cada paso completado en un **historial**. Si el worker cae, otro retoma la ejecución: los pasos ya hechos (llamadas LLM, APIs) **no se repiten**; sus resultados se leen del historial. Así un agente puede esperar días una aprobación sin mantener un proceso vivo.',
  height: 490,
  nodes: [
    { id: 'event', label: 'Evento de negocio', sub: 'EventBridge · SQS', at: [0, 0], shape: 'cloud', tone: 'infra', icon: 'zap', info: 'Un evento dispara el flujo: "reclamo de garantía recibido". El agente no espera a que un humano abra un chat.' },
    { id: 'engine', label: 'Motor durable', sub: 'Temporal · Step Functions', at: [3.4, 0], shape: 'hex', tone: 'infra', icon: 'workflow', info: 'Orquesta el workflow: agenda pasos, aplica reintentos y timeouts, y persiste cada resultado. Ej.: Temporal (con la integración GA del OpenAI Agents SDK), AWS Step Functions, o checkpointers de LangGraph.' },
    { id: 'history', label: 'Historial de eventos', sub: 'resultados por paso', at: [3.4, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Registro append-only de cada paso completado y su resultado. Es lo que permite *replay*: reconstruir el estado sin volver a ejecutar efectos.' },
    { id: 'wa', label: 'Worker A', sub: 'cae a mitad de camino', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'bot', scale: 0.9, info: 'Ejecuta el loop del agente. En el paso 3 el contenedor se reinicia por un despliegue. Sin durabilidad, se perdería todo el progreso.' },
    { id: 'wb', label: 'Worker B', sub: 'retoma la ejecución', at: [6.8, 3.4], shape: 'tall', tone: 'agent', icon: 'repeat', scale: 0.9, info: 'Otro worker toma la tarea, reproduce el historial y continúa desde el último paso confirmado.' },
    { id: 'llm', label: 'Llamada LLM', sub: 'activity', at: [10.2, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Cada llamada al modelo es una *activity*: no determinista, con reintentos. Su resultado se guarda; en un replay no se vuelve a pagar.' },
    { id: 'api', label: 'API de garantías', sub: 'activity', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'Llamadas a sistemas externos, también como activities con reintentos e idempotencia.' },
    { id: 'human', label: 'Técnico', sub: 'señal de aprobación', at: [10.2, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'La aprobación llega como una **señal** (o un task token en Step Functions) horas o días después. Mientras tanto no hay ningún proceso consumiendo recursos.' },
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
  steps: [
    { title: '1 · Disparo por evento', body: 'Un evento de negocio inicia el workflow. El motor crea una ejecución con un ID único.', flows: ['event>engine'] },
    { title: '2 · Pasos como activities', body: 'El worker A ejecuta el loop: llamada LLM para clasificar el reclamo, consulta a la API de garantías. Cada resultado se persiste en el historial.', flows: ['engine>wa', 'wa>llm', 'wa>api', 'engine>history'] },
    { title: '3 · Caída', body: 'El worker A se reinicia por un despliegue en mitad del paso 3. El motor detecta que la tarea no se completó (timeout de heartbeat).', focus: ['wa'] },
    { title: '4 · Replay y reanudación', body: 'El worker B toma la ejecución y reproduce el historial: la clasificación y la consulta a la API **no se repiten**, sus resultados se leen del registro.', flows: ['engine>wb', 'history>engine'] },
    { title: '5 · Espera larga', body: 'El flujo pide aprobación al técnico y queda en pausa. Puede esperar días sin procesos vivos ni costo de cómputo.', flows: ['wb>human'] },
    { title: '6 · Señal y fin', body: 'La aprobación llega como señal; el motor reanuda, ejecuta la acción final y cierra la ejecución con toda la traza.', flows: ['human>engine'] },
  ],
}
