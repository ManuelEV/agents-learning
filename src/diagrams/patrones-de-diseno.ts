import type { IsoSpec } from '../components/iso/types'

export const patronesChaining: IsoSpec = {
  id: 'patrones-chaining',
  title: 'Prompt chaining con gate',
  summary:
    'La tarea se descompone en **pasos LLM fijos**: cada llamada procesa la salida de la anterior. Entre pasos, un **gate programático** verifica que todo va bien antes de seguir. Ejemplo: procesar facturas de proveedores.',
  height: 440,
  nodes: [
    { id: 'in', label: 'Factura PDF', sub: 'correo de proveedor', at: [0, 0], shape: 'doc', tone: 'user', icon: 'file', info: 'Entrada del flujo: una factura que llega por correo o a un bucket. El formato varía según el proveedor.' },
    { id: 'extract', label: 'Extraer campos', sub: 'LLM · paso 1', at: [3.2, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Llamada LLM acotada: devuelve JSON con proveedor, RUT/NIF, monto, moneda y vencimiento. Un modelo pequeño suele bastar.' },
    { id: 'gate', label: 'Gate', sub: 'esquema + reglas', at: [6.4, 0], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Validación en **código**, no con un LLM: JSON Schema, proveedor existente en el maestro, monto coherente con la orden de compra. Si falla, el flujo no continúa.' },
    { id: 'draft', label: 'Redactar asiento', sub: 'LLM · paso 2', at: [9.6, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Segundo paso LLM con entrada ya validada: propone la imputación contable y un resumen para el aprobador.' },
    { id: 'out', label: 'ERP', sub: 'borrador de asiento', at: [12.8, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'El resultado se registra como **borrador**, no como asiento definitivo. Un humano o una regla posterior lo confirma.' },
    { id: 'fail', label: 'Cola de revisión', sub: 'humano', at: [6.4, 3.3], shape: 'person', tone: 'user', icon: 'hand', info: 'Cuando el gate falla, el caso va a una persona con el motivo exacto del rechazo. Mejor que reintentar a ciegas.' },
  ],
  edges: [
    { from: 'in', to: 'extract' },
    { from: 'extract', to: 'gate' },
    { from: 'gate', to: 'draft', label: 'ok' },
    { from: 'draft', to: 'out' },
    { from: 'gate', to: 'fail', label: 'falla', dashed: true },
  ],
  steps: [
    { title: '1 · Entrada', body: 'Llega una factura. El flujo es siempre el mismo: la ruta la define el código, no el modelo.', flows: ['in>extract'] },
    { title: '2 · Paso LLM acotado', body: 'El primer paso hace **una sola cosa**: extraer campos a JSON. Al acotar la tarea, cada llamada es más fácil y más precisa.', focus: ['extract'] },
    { title: '3 · Gate programático', body: 'Antes de gastar otra llamada, el código valida esquema y reglas de negocio. Es el punto que convierte un chaining en algo confiable.', flows: ['extract>gate'] },
    { title: '4 · Camino feliz', body: 'Si el gate pasa, el segundo paso LLM redacta el asiento y se registra como borrador en el ERP.', flows: ['gate>draft', 'draft>out'] },
    { title: '5 · Camino de excepción', body: 'Si el gate falla, el caso sale del flujo hacia revisión humana con el error concreto. Latencia total = suma de pasos: cambias velocidad por precisión.', flows: ['gate>fail'] },
  ],
}

export const patronesRouting: IsoSpec = {
  id: 'patrones-routing',
  title: 'Routing: clasificar y derivar',
  summary:
    'Un **router** clasifica la entrada y la envía a un manejador especializado: cada uno con su prompt, sus herramientas y, a menudo, **su propio modelo** (barato para lo simple, potente para lo difícil).',
  height: 450,
  nodes: [
    { id: 'in', label: 'Ticket de soporte', sub: 'web · correo · chat', at: [0, 0], shape: 'doc', tone: 'user', icon: 'message', info: 'Entrada heterogénea: dudas de facturación, problemas técnicos, solicitudes de reembolso.' },
    { id: 'router', label: 'Router', sub: 'clasificador LLM', at: [3.4, 0], shape: 'diamond', tone: 'gateway', icon: 'router', info: 'Un LLM pequeño (o un clasificador tradicional) devuelve una categoría con salida estructurada. Debe incluir una clase "otro" con salida segura.' },
    { id: 'faq', label: 'Preguntas simples', sub: 'modelo pequeño', at: [7, -3.4], shape: 'box', tone: 'model', icon: 'zap', info: 'Respuestas frecuentes con un modelo rápido y barato (p. ej. un Haiku). Aquí está la mayor parte del volumen.' },
    { id: 'tech', label: 'Soporte técnico', sub: 'modelo grande + tools', at: [7, 0], shape: 'tall', tone: 'agent', icon: 'wrench', info: 'Casos complejos: un agente con herramientas de diagnóstico y un modelo más capaz. Solo recibe lo que lo necesita.' },
    { id: 'refund', label: 'Reembolsos', sub: 'flujo con aprobación', at: [7, 3.4], shape: 'box', tone: 'guard', icon: 'card', info: 'Un workflow determinista con límites de monto y aprobación humana. No todo destino tiene que ser un LLM.' },
  ],
  edges: [
    { from: 'in', to: 'router' },
    { from: 'router', to: 'faq', route: 'z' },
    { from: 'router', to: 'tech' },
    { from: 'router', to: 'refund', route: 'z' },
  ],
  steps: [
    { title: '1 · Clasificar', body: 'El router lee el ticket y emite una categoría en JSON. Es una llamada corta y barata.', flows: ['in>router'] },
    { title: '2 · Lo simple, barato', body: 'Las preguntas frecuentes van a un modelo pequeño: baja latencia y costo por ticket mínimo.', flows: ['router>faq'] },
    { title: '3 · Lo difícil, potente', body: 'Los problemas técnicos van a un agente con herramientas y un modelo grande. Cada manejador tiene un prompt optimizado para su caso.', flows: ['router>tech'] },
    { title: '4 · Lo riesgoso, controlado', body: 'Los reembolsos van a un flujo con reglas y aprobación. El routing también sirve para **separar niveles de riesgo**.', flows: ['router>refund'] },
  ],
}

export const patronesParalelizacion: IsoSpec = {
  id: 'patrones-paralelizacion',
  title: 'Paralelización: sectioning y voting',
  summary:
    'Varias llamadas LLM corren **a la vez** y un agregador combina los resultados. En *sectioning* cada rama hace una parte distinta; en *voting* todas hacen la misma tarea y se vota.',
  height: 450,
  nodes: [
    { id: 'in', label: 'Contrato', sub: 'proveedor nuevo', at: [0, 0], shape: 'doc', tone: 'user', icon: 'scroll', info: 'Un contrato de 40 páginas que legal debe revisar antes de firmar.' },
    { id: 'split', label: 'Dividir', sub: 'código', at: [3.2, 0], shape: 'box', tone: 'infra', icon: 'split', info: 'Código determinista que reparte el trabajo: por sección del contrato (sectioning) o replicando la misma tarea (voting).' },
    { id: 'w1', label: 'Pagos y multas', sub: 'LLM', at: [6.6, -3.3], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Rama especializada en cláusulas económicas. Cada rama tiene un prompt enfocado: el modelo atiende a una sola cosa.' },
    { id: 'w2', label: 'Responsabilidad', sub: 'LLM', at: [6.6, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Rama de limitación de responsabilidad e indemnizaciones.' },
    { id: 'w3', label: 'Datos personales', sub: 'LLM', at: [6.6, 3.3], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Rama de privacidad y tratamiento de datos. También podría ser un guardrail que corre en paralelo a la respuesta principal.' },
    { id: 'agg', label: 'Agregador', sub: 'código o LLM', at: [10, 0], shape: 'box', tone: 'agent', icon: 'merge', info: 'Combina resultados: concatenar y priorizar hallazgos (sectioning) o aplicar un umbral de votos (voting).' },
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
  steps: [
    { title: '1 · Repartir', body: 'El código divide la tarea. No hay un LLM decidiendo cómo partir: las ramas están **predefinidas**.', flows: ['in>split'] },
    { title: '2 · Sectioning', body: 'Cada rama revisa un aspecto distinto del contrato al mismo tiempo. La latencia total ≈ la rama más lenta, no la suma.', flows: ['split>w1', 'split>w2', 'split>w3'] },
    { title: '3 · Voting (variante)', body: 'Alternativa: las tres ramas reciben **la misma** pregunta ("¿hay una cláusula abusiva?") con prompts distintos, y se exige mayoría o unanimidad para marcar el riesgo.', focus: ['w1', 'w2', 'w3'] },
    { title: '4 · Agregar', body: 'El agregador consolida un informe único. El costo en tokens es la suma de las ramas: pagas más para ganar velocidad o confianza.', flows: ['w1>agg', 'w2>agg', 'w3>agg'] },
  ],
}

export const patronesOrquestador: IsoSpec = {
  id: 'patrones-orquestador',
  title: 'Orquestador-workers',
  summary:
    'Un LLM orquestador **decide en tiempo de ejecución** cómo descomponer la tarea, delega subtareas a workers y sintetiza los resultados. A diferencia de la paralelización, las subtareas no están predefinidas.',
  height: 460,
  nodes: [
    { id: 'user', label: 'Analista', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pide algo abierto: "¿Por qué cayó el margen de la categoría electro en Q3 y qué proveedores lo explican?".' },
    { id: 'orch', label: 'Orquestador', sub: 'LLM que planifica', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'workflow', info: 'Analiza la pregunta, decide cuántos workers lanzar y con qué instrucciones. Suele usar el modelo más capaz.' },
    { id: 'plan', label: 'Plan', sub: 'subtareas dinámicas', at: [3.4, 3.3], shape: 'doc', tone: 'memory', icon: 'list', info: 'El plan se genera en cada ejecución y puede cambiar a mitad de camino según lo que devuelvan los workers.' },
    { id: 'w1', label: 'Worker ventas', sub: 'SQL sobre DWH', at: [7, -3.4], shape: 'box', tone: 'tool', icon: 'database', info: 'Worker con contexto limpio y herramientas acotadas: solo consultas de lectura al data warehouse.' },
    { id: 'w2', label: 'Worker compras', sub: 'costos de proveedor', at: [7, 0], shape: 'box', tone: 'tool', icon: 'boxes', info: 'Otro worker, lanzado solo porque el orquestador detectó que el costo de compra es relevante.' },
    { id: 'w3', label: 'Worker promociones', sub: 'calendario comercial', at: [7, 3.4], shape: 'box', tone: 'tool', icon: 'chart', info: 'Worker opcional: en otra pregunta, el orquestador podría no lanzarlo.' },
    { id: 'synth', label: 'Síntesis', sub: 'orquestador', at: [10.4, 0], shape: 'doc', tone: 'agent', icon: 'merge', info: 'El orquestador recibe **resúmenes** (no el trabajo completo de cada worker) y redacta la respuesta con evidencia.' },
  ],
  edges: [
    { from: 'user', to: 'orch' },
    { from: 'orch', to: 'plan', route: 'z' },
    { from: 'orch', to: 'w1', route: 'z' },
    { from: 'orch', to: 'w2' },
    { from: 'orch', to: 'w3', route: 'z' },
    { from: 'w1', to: 'synth' },
    { from: 'w2', to: 'synth' },
    { from: 'w3', to: 'synth' },
  ],
  steps: [
    { title: '1 · Pregunta abierta', body: 'No se sabe de antemano cuántos pasos ni qué fuentes hacen falta.', flows: ['user>orch'] },
    { title: '2 · Planificar', body: 'El orquestador escribe un plan con subtareas. Es la diferencia clave con la paralelización: **el LLM decide** la descomposición.', flows: ['orch>plan'] },
    { title: '3 · Delegar', body: 'Lanza workers con instrucciones claras (objetivo, formato de salida, límites). Pueden correr en paralelo.', flows: ['orch>w1', 'orch>w2', 'orch>w3'] },
    { title: '4 · Sintetizar', body: 'Cada worker devuelve un resumen compacto. El orquestador integra, detecta huecos y puede lanzar otra ronda.', flows: ['w1>synth', 'w2>synth', 'w3>synth'] },
  ],
}

export const patronesEvaluador: IsoSpec = {
  id: 'patrones-evaluador',
  title: 'Evaluator-optimizer: el loop de refinamiento',
  summary:
    'Un LLM **genera** y otro **evalúa** contra criterios explícitos; el feedback vuelve al generador hasta aprobar o agotar el límite de iteraciones. Útil cuando hay criterios claros y la iteración mejora el resultado de forma medible.',
  height: 460,
  nodes: [
    { id: 'in', label: 'Solicitud', sub: 'ficha de producto', at: [0, 0], shape: 'doc', tone: 'user', icon: 'file', info: 'Generar la ficha de un producto nuevo para el e-commerce a partir de la hoja técnica del fabricante.' },
    { id: 'gen', label: 'Generador', sub: 'LLM', at: [3.3, 0], shape: 'sphere', tone: 'model', icon: 'sparkles', info: 'Produce un borrador. En cada vuelta recibe el borrador anterior **y** el feedback concreto del evaluador.' },
    { id: 'draft', label: 'Borrador', sub: 'versión n', at: [6.6, 0], shape: 'doc', tone: 'memory', icon: 'scroll', info: 'Cada versión queda en el estado para trazar la evolución y depurar.' },
    { id: 'eval', label: 'Evaluador', sub: 'LLM-as-judge', at: [9.9, 0], shape: 'tall', tone: 'guard', icon: 'eye', info: 'Califica el borrador con una rúbrica y devuelve veredicto + feedback accionable. Puede ser otro modelo o el mismo con otro prompt.' },
    { id: 'rubric', label: 'Rúbrica', sub: 'criterios explícitos', at: [9.9, 3.3], shape: 'doc', tone: 'data', icon: 'list', info: 'Criterios verificables: tono de marca, sin promesas no respaldadas por la hoja técnica, medidas en sistema métrico, largo máximo.' },
    { id: 'limit', label: 'Límite', sub: 'máx. 3 iteraciones', at: [6.6, -3.3], shape: 'box', tone: 'infra', icon: 'timer', info: 'Tope duro de vueltas (y de costo). Si se alcanza sin aprobar, se entrega el mejor intento marcado para revisión humana.' },
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
  steps: [
    { title: '1 · Generar', body: 'El generador produce la primera versión a partir de la hoja técnica.', flows: ['in>gen', 'gen>draft'] },
    { title: '2 · Evaluar con rúbrica', body: 'El evaluador compara el borrador con criterios explícitos. Sin rúbrica clara, el loop no converge: solo gasta tokens.', flows: ['draft>eval', 'rubric>eval'] },
    { title: '3 · Feedback accionable', body: 'Si no aprueba, devuelve **qué** corregir ("la autonomía de batería no aparece en la hoja técnica; elimínala"). El generador reescribe.', flows: ['eval>gen', 'gen>draft'] },
    { title: '4 · Límite de iteraciones', body: 'Un contador corta el loop tras N vueltas. Es obligatorio: dos LLMs pueden discrepar indefinidamente.', focus: ['limit', 'draft'] },
    { title: '5 · Aprobado', body: 'Con veredicto positivo, la ficha pasa al CMS. Costo y latencia crecen linealmente con las vueltas: mide cuántas aportan de verdad.', flows: ['eval>out'] },
  ],
}

export const patronesManagerHandoffs: IsoSpec = {
  id: 'patrones-manager-handoffs',
  title: 'Multiagente: manager vs. handoffs',
  summary:
    'La guía de OpenAI distingue dos formas de coordinar agentes: un **manager** que usa a los especialistas como herramientas y conserva el control, o un esquema **descentralizado** donde los agentes se **transfieren** la conversación entre sí.',
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
    { id: 'triage', label: 'Triage', sub: 'deriva', at: [3.4, 3.2], shape: 'tall', tone: 'agent', icon: 'router', info: 'Identifica la necesidad y **transfiere** la conversación completa al especialista. Después deja de participar.' },
    { id: 'da', label: 'Facturación', sub: 'toma el control', at: [7.2, 1.8], shape: 'tall', tone: 'agent', icon: 'card', scale: 0.85, info: 'Recibe el control y responde directamente al cliente. Puede volver a transferir si el caso cambia.' },
    { id: 'db', label: 'Reembolsos', sub: 'toma el control', at: [7.2, 4.6], shape: 'tall', tone: 'agent', icon: 'repeat', scale: 0.85, info: 'Otro par: los handoffs pueden encadenarse entre especialistas.' },
  ],
  edges: [
    { from: 'u1', to: 'mgr' },
    { from: 'mgr', to: 'sa', route: 'x' },
    { from: 'mgr', to: 'sb', route: 'x' },
    { from: 'u2', to: 'triage' },
    { from: 'triage', to: 'da', label: 'handoff', route: 'x' },
    { from: 'da', to: 'db', label: 'handoff', route: 'z' },
  ],
  steps: [
    { title: 'Manager: una sola voz', body: 'El cliente habla con el manager, que consulta a los especialistas como herramientas y compone la respuesta. Ideal cuando quieres **control central**, formato homogéneo y trazas simples.', flows: ['u1>mgr', 'mgr>sa', 'sa>mgr', 'mgr>sb', 'sb>mgr'] },
    { title: 'Handoffs: se transfiere el control', body: 'El triage deriva y se retira; el especialista conversa directamente con el cliente. Menos saltos por turno, pero el control está **distribuido**.', flows: ['u2>triage', 'triage>da'] },
    { title: 'Handoffs encadenados', body: 'Facturación detecta que es un reembolso y transfiere otra vez. Necesitas límites de handoffs para evitar ping-pong entre agentes.', flows: ['da>db'] },
    { title: 'Cuál elegir', body: 'Manager para respuestas que combinan varios especialistas; handoffs cuando cada especialista debe llevar la conversación completa de su dominio.', focus: ['mgr', 'triage'] },
  ],
}
