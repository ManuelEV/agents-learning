import type { IsoSpec } from '../components/iso/types'

// Diagramas de la página "Casos reales: agentes de datos y analítica".
// Todos son RECONSTRUCCIONES a partir de los blogs de ingeniería y papers citados;
// las empresas no publican diagramas de despliegue completos.

export const cdaQueryGpt: IsoSpec = {
  id: 'cda-querygpt',
  title: 'Uber QueryGPT: de la pregunta al SQL',
  summary:
    'Reconstrucción a partir del blog de Uber (septiembre de 2024). En vez de un RAG plano sobre todos los esquemas, QueryGPT encadena **llamadas LLM especializadas** que van acotando el contexto: dominio (*workspace*), tablas, columnas y, al final, la generación del SQL con su explicación. El usuario confirma las tablas antes de generar.',
  height: 500,
  nodes: [
    { id: 'user', label: 'Analista de Ops', sub: 'pregunta en inglés', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Operaciones genera cerca del 36 % de ~1,2 millones de consultas interactivas mensuales en la plataforma de datos de Uber (cifra de Uber, sept. 2024).' },
    { id: 'enh', label: 'Prompt enhancer', sub: 'expande la pregunta', at: [3.2, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Uber agregó un paso que expande preguntas escuetas, porque el nivel de detalle de los prompts de los usuarios variaba mucho.' },
    { id: 'intent', label: 'Intent Agent', sub: 'pregunta → dominio', at: [6.4, 0], shape: 'diamond', tone: 'agent', icon: 'router', info: 'Una llamada LLM clasifica la pregunta en uno o más *workspaces* de negocio. Eso reduce drásticamente el espacio de búsqueda del RAG.' },
    { id: 'ws', label: 'Workspaces', sub: '12 de sistema + propios', at: [6.4, -3.4], shape: 'stack', tone: 'data', icon: 'layers', info: 'Colecciones curadas de tablas y SQL de ejemplo por dominio (Mobility, Core Services, Ads, IT…). Los equipos pueden crear workspaces personalizados.' },
    { id: 'table', label: 'Table Agent', sub: 'propone tablas', at: [9.6, 0], shape: 'tall', tone: 'agent', icon: 'search', info: 'Un agente LLM propone las tablas. El usuario las acepta o edita: así se corrige el error más caro (elegir la tabla equivocada) antes de generar SQL.' },
    { id: 'schema', label: 'Esquemas', sub: 'tablas de 200+ columnas', at: [9.6, 3.3], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Algunos esquemas de Uber superan las 200 columnas (40–60K tokens). Incluir varios rompía la ventana de contexto de la primera versión.' },
    { id: 'prune', label: 'Column Prune Agent', sub: 'quita columnas', at: [12.8, 0], shape: 'box', tone: 'agent', icon: 'filter', info: 'Una llamada LLM elimina columnas irrelevantes de cada esquema antes de generar. Menos tokens, menos costo y menos latencia.' },
    { id: 'gen', label: 'Generación SQL', sub: 'GPT-4 Turbo (2024)', at: [12.8, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Con el esquema podado y SQL de ejemplo del workspace como few-shot, el LLM escribe la consulta y una explicación. Uber cita GPT-4 Turbo (1106) con 128K tokens.' },
    { id: 'out', label: 'SQL + explicación', sub: 'el usuario lo ejecuta', at: [16, -1.7], shape: 'doc', tone: 'neutral', icon: 'code', info: 'Uber estima ~3 minutos por consulta con QueryGPT frente a ~10 a mano. No publica porcentajes de precisión agregados.' },
  ],
  edges: [
    { from: 'user', to: 'enh' },
    { from: 'enh', to: 'intent' },
    { from: 'ws', to: 'intent', route: 'z' },
    { from: 'intent', to: 'table' },
    { from: 'table', to: 'user', route: 'arc', dashed: true, label: 'confirma' },
    { from: 'schema', to: 'prune', route: 'x' },
    { from: 'table', to: 'prune' },
    { from: 'prune', to: 'gen', route: 'z' },
    { from: 'ws', to: 'gen', route: 'arc' },
    { from: 'gen', to: 'out' },
  ],
  steps: [
    { title: '1 · Pregunta y expansión', body: 'El analista escribe en lenguaje natural. Un paso previo expande la pregunta si viene demasiado escueta.', flows: ['user>enh'] },
    { title: '2 · Intención → workspace', body: 'El **Intent Agent** mapea la pregunta a uno o más dominios. El RAG ya no busca en todo Uber, sino en un subconjunto curado de tablas y ejemplos.', flows: ['enh>intent', 'ws>intent'] },
    { title: '3 · Tablas con humano en el bucle', body: 'El **Table Agent** propone tablas y el usuario las confirma o corrige. Es la decisión que más condiciona el resultado y la que el humano valida con menos esfuerzo.', flows: ['intent>table', 'table>user'] },
    { title: '4 · Poda de columnas', body: 'El **Column Prune Agent** recorta los esquemas enormes a las columnas relevantes, para que quepan varias tablas sin desbordar el contexto.', flows: ['schema>prune', 'table>prune'] },
    { title: '5 · Generación con few-shot', body: 'El LLM recibe el esquema podado más SQL de ejemplo del workspace y genera la consulta con una explicación.', flows: ['prune>gen', 'ws>gen'] },
    { title: '6 · Entrega', body: 'El usuario recibe SQL y explicación. Uber reconoce alucinaciones de tablas, columnas y valores de filtro aún no resueltas; por eso el resultado se revisa antes de usarse.', flows: ['gen>out'] },
  ],
}

export const cdaLinkedin: IsoSpec = {
  id: 'cda-linkedin',
  title: 'LinkedIn SQL Bot: recuperar, ordenar, escribir, validar',
  summary:
    'Reconstrucción a partir del blog de LinkedIn (diciembre de 2024) y del paper de KDD 2025. La calidad sale del **grafo de conocimiento** (metadatos de DataHub, logs de consultas, ejemplos certificados), de un **re-ranking** con LLM y de **validadores** que verifican lo que el escritor no podía saber.',
  height: 500,
  nodes: [
    { id: 'user', label: 'Usuario en DARWIN', sub: 'editor SQL + chat', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'SQL Bot vive dentro de DARWIN, la plataforma de ciencia de datos. Integrarlo ahí multiplicó la adopción 5–10x frente al prototipo independiente (cifra de LinkedIn).' },
    { id: 'kg', label: 'Grafo de conocimiento', sub: 'DataHub + query logs', at: [0, -3.4], shape: 'stack', tone: 'data', icon: 'network', info: 'Esquemas, valores frecuentes, partition keys, clasificación métrica/dimensión, joins comunes, notebooks certificados y jerga de dominio aportada por usuarios.' },
    { id: 'pers', label: 'Personalización', sub: 'organigrama + historial', at: [3.2, 3.3], shape: 'doc', tone: 'memory', icon: 'users', info: 'Datasets por defecto según el área del usuario (organigrama) y componentes de uso aprendidos del historial de acceso. Desambigua preguntas como "¿cuántos miembros activos…?".' },
    { id: 'ebr', label: 'Recuperación EBR', sub: 'top-20 tablas', at: [3.2, 0], shape: 'box', tone: 'tool', icon: 'search', info: 'La popularidad de acceso reduce millones de tablas a unos miles; la búsqueda por embeddings trae 20 candidatas.' },
    { id: 'rank', label: 'Re-ranker LLM', sub: '20 → 7 tablas + campos', at: [6.4, 0], shape: 'diamond', tone: 'model', icon: 'filter', info: 'Un LLM puntúa la relevancia de cada tabla y deja 7; un segundo paso elige los campos. En el benchmark, el recall de tablas llega a 78 % con la configuración completa.' },
    { id: 'writer', label: 'Query Writer', sub: 'plan incremental', at: [9.6, 0], shape: 'tall', tone: 'agent', icon: 'code', info: 'Construye un plan y resuelve paso a paso, con la instrucción de minimizar pasos para que lo simple siga siendo simple.' },
    { id: 'val', label: 'Validadores', sub: 'existencia + EXPLAIN', at: [12.8, 0], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Verifica que tablas y campos existan y ejecuta EXPLAIN en Trino. Con validación, la compilación exitosa sube de 66 % a 96 % en el benchmark del paper.' },
    { id: 'trino', label: 'Trino', sub: 'EXPLAIN (VALIDATE)', at: [12.8, 3.3], shape: 'cylinder', tone: 'data', icon: 'database', info: 'El motor de consultas se usa para validar sintaxis y semántica sin ejecutar la consulta completa.' },
    { id: 'fix', label: 'Autocorrección', sub: 'busca lo que faltó', at: [12.8, -3.4], shape: 'tall', tone: 'agent', icon: 'repeat', info: 'Si un validador falla, un agente investigador puede recuperar tablas o campos adicionales y un "fixer" reescribe la consulta (máximo dos pasadas, según el paper).' },
  ],
  edges: [
    { from: 'user', to: 'ebr' },
    { from: 'kg', to: 'ebr', route: 'x' },
    { from: 'pers', to: 'ebr', route: 'z' },
    { from: 'ebr', to: 'rank' },
    { from: 'rank', to: 'writer' },
    { from: 'writer', to: 'val' },
    { from: 'val', to: 'trino', route: 'z' },
    { from: 'val', to: 'fix', route: 'z' },
    { from: 'fix', to: 'writer', route: 'arc' },
    { from: 'val', to: 'user', route: 'arc', dashed: true },
  ],
  steps: [
    { title: '1 · Contexto antes que modelo', body: 'El grafo de conocimiento se construye offline desde DataHub, logs de consultas y ejemplos certificados. Según el paper, con solo esquemas apenas el 9 % de las respuestas alcanza puntaje alto.', focus: ['kg'] },
    { title: '2 · Recuperación personalizada', body: 'La pregunta se busca por embeddings entre tablas populares, sesgada por los datasets del área del usuario.', flows: ['user>ebr', 'kg>ebr', 'pers>ebr'] },
    { title: '3 · Re-ranking', body: 'Un LLM reduce 20 candidatas a 7 y elige campos. Es más barato equivocarse aquí y corregir que pasar 20 esquemas al escritor.', flows: ['ebr>rank'] },
    { title: '4 · Escritura con plan', body: 'El escritor arma un plan proporcional a la complejidad y genera el SQL.', flows: ['rank>writer'] },
    { title: '5 · Validar y corregir', body: 'Existencia de tablas/campos y EXPLAIN en Trino. Si algo falla, el agente de autocorrección busca lo que faltó y reescribe.', flows: ['writer>val', 'val>trino', 'val>fix', 'fix>writer'] },
    { title: '6 · Respuesta en el flujo de trabajo', body: 'La consulta vuelve al editor con metadatos de tablas y resultados de validación. "Fix with AI" sobre consultas fallidas concentra ~80 % de las sesiones.', flows: ['val>user'] },
  ],
}

export const cdaPinterest: IsoSpec = {
  id: 'cda-pinterest',
  title: 'Pinterest Analytics Agent: contexto gobernado vía MCP',
  summary:
    'Reconstrucción a partir del post de Pinterest (marzo de 2026), consultado a través de resúmenes secundarios, y del caso publicado por DataHub. El agente usa **herramientas MCP** sobre un catálogo con *tiers* (PinCat) y un índice que guarda la **intención analítica** de cada consulta histórica, no solo la documentación de tablas.',
  height: 500,
  zones: [{ id: 'ctx', label: 'Capa de contexto', from: [11.7, -5.1], to: [14.7, 5.0], tone: 'data' }],
  nodes: [
    { id: 'analyst', label: 'Analista', sub: '2.500+ en Pinterest', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pinterest reporta más de 100.000 tablas analíticas y más de 2.500 usuarios analíticos. El agente llegó al 40 % de los analistas en dos meses.' },
    { id: 'orch', label: 'Analytics Agent', sub: 'LLM orquestador', at: [3.3, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Clasifica la tarea (descubrir tablas, reutilizar consultas, generar SQL) y elige herramientas. Es el agente más usado de Pinterest, con ~10x el uso del siguiente.' },
    { id: 'mcp', label: 'Tools vía MCP', sub: 'tablas · consultas · docs', at: [6.6, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Búsqueda de tablas, búsqueda de consultas, búsqueda de conocimiento (docs de expertos, métricas) y ejecución en Presto, expuestas como herramientas MCP.' },
    { id: 'tsearch', label: 'Búsqueda de tablas', sub: 'similitud + tier + owner', at: [9.9, -3.4], shape: 'box', tone: 'tool', icon: 'search', info: 'El ranking combina similitud semántica con tier, frescura, completitud de documentación y ownership: las tablas gobernadas ganan.' },
    { id: 'qsearch', label: 'Búsqueda de consultas', sub: 'intención + patrones', at: [9.9, 0], shape: 'box', tone: 'tool', icon: 'scroll', info: 'Encuentra consultas pasadas que respondían preguntas parecidas y reutiliza sus joins, filtros y agregaciones conocidos.' },
    { id: 'exec', label: 'Ejecución Presto', sub: 'EXPLAIN · LIMIT 100', at: [9.9, 3.4], shape: 'box', tone: 'guard', icon: 'terminal', info: 'Antes de ejecutar se corre EXPLAIN; hay reintentos acotados y un LIMIT de 100 filas por defecto.' },
    { id: 'pincat', label: 'PinCat (DataHub)', sub: 'tiers, owners, glosario', at: [13.2, -3.4], shape: 'cylinder', tone: 'data', icon: 'book', info: 'Sistema de registro: tier 1/2/3, dueño, retención y términos de glosario. La limpieza de gobernanza bajó de ~400K a ~100K tablas.' },
    { id: 'idx', label: 'Índice de intención', sub: 'OpenSearch, diario', at: [13.2, 0], shape: 'stack', tone: 'data', icon: 'layers', info: 'Millones de embeddings con actualización incremental diaria, sobre un Vector DB as a Service en AWS OpenSearch.' },
    { id: 'sql2txt', label: 'SQL histórico → texto', sub: 'LLM + contexto PinCat', at: [13.2, 3.4], shape: 'sphere', tone: 'model', icon: 'sparkles', scale: 0.8, info: 'Cada consulta histórica se enriquece con metadatos y un LLM la describe como la pregunta de negocio que respondía. Eso es lo que se embebe.' },
  ],
  edges: [
    { from: 'analyst', to: 'orch' },
    { from: 'orch', to: 'mcp' },
    { from: 'mcp', to: 'tsearch', route: 'z' },
    { from: 'mcp', to: 'qsearch' },
    { from: 'mcp', to: 'exec', route: 'z' },
    { from: 'tsearch', to: 'pincat' },
    { from: 'qsearch', to: 'idx' },
    { from: 'sql2txt', to: 'idx', route: 'z' },
    { from: 'pincat', to: 'sql2txt', route: 'arc', dashed: true },
  ],
  steps: [
    { title: '1 · Gobernanza primero', body: 'PinCat asigna tier, dueño y retención a cada tabla. Pinterest describe la gobernanza y la IA como esfuerzos que se refuerzan mutuamente: sin tiers, el agente recomendaría tablas abandonadas.', focus: ['pincat'] },
    { title: '2 · Indexar intenciones, no solo tablas', body: 'Offline, un LLM convierte SQL histórico (enriquecido con contexto de PinCat) en descripciones de la pregunta de negocio. Se embeben y se actualizan a diario.', flows: ['pincat>sql2txt', 'sql2txt>idx'] },
    { title: '3 · Orquestación', body: 'El agente recibe la pregunta, clasifica la tarea y decide qué herramientas MCP llamar.', flows: ['analyst>orch', 'orch>mcp'] },
    { title: '4 · Descubrir tablas gobernadas', body: 'La búsqueda de tablas pondera similitud con tier, frescura y documentación.', flows: ['mcp>tsearch', 'tsearch>pincat'] },
    { title: '5 · Reutilizar consultas probadas', body: 'La búsqueda por intención encuentra consultas pasadas equivalentes y sus joins y filtros correctos, que el agente usa como base.', flows: ['mcp>qsearch', 'qsearch>idx'] },
    { title: '6 · Validar y ejecutar acotado', body: 'Tablas y columnas se verifican contra PinCat, se corre EXPLAIN en Presto y se ejecuta con LIMIT 100 y reintentos limitados.', flows: ['mcp>exec'] },
  ],
}

export const cdaPatron: IsoSpec = {
  id: 'cda-patron',
  title: 'El patrón común, aplicado a ADK + gateway + Bedrock',
  summary:
    'Síntesis propia (no es la arquitectura de ninguna empresa) de lo que comparten los casos: **contexto semántico curado**, un **validador determinista** entre el agente y el warehouse, ejecución con la **identidad del usuario**, SQL visible en la respuesta y **evaluación con set dorado**. Mapeado al stack ADK + AI gateway + Bedrock.',
  height: 500,
  nodes: [
    { id: 'user', label: 'Analista', sub: 'identidad OIDC', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'La identidad (y sus grupos) viaja en la sesión. El agente nunca recibe credenciales "de servicio" con más permisos que el usuario.' },
    { id: 'agent', label: 'Agente de datos', sub: 'Google ADK', at: [3.3, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Un solo agente con pocas herramientas: buscar contexto, validar SQL, ejecutar. Sub-agentes solo si la medición lo justifica (como el supervisor de Finch).' },
    { id: 'gw', label: 'AI gateway', sub: 'LiteLLM → Bedrock', at: [3.6, -3.7], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Como el Generative AI Gateway de Uber: permite cambiar de modelo, atribuir costos por caso de uso y aplicar límites.' },
    { id: 'llm', label: 'LLM', sub: 'Claude en Bedrock', at: [7.4, -3.7], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Cualquier modelo fuerte en SQL. En los casos públicos, el modelo pesa menos que el contexto: LinkedIn lo comprobó con ablaciones.' },
    { id: 'ctx', label: 'Contexto semántico', sub: 'catálogo, glosario, SQL', at: [6.6, 0], shape: 'stack', tone: 'data', icon: 'book', info: 'Tablas certificadas con tier y dueño, descripciones, valores de columnas, alias de negocio y consultas históricas indexadas por intención.' },
    { id: 'guard', label: 'Validador SQL', sub: 'solo lectura + allowlist', at: [9.9, 0], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Código determinista: parsea el SQL, rechaza escrituras, verifica tablas contra una allowlist, fuerza LIMIT y estima el costo con un dry run.' },
    { id: 'dw', label: 'Data warehouse', sub: 'rol del usuario', at: [13.2, 0], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Redshift, Athena, BigQuery o Snowflake. La ejecución usa el rol del usuario (o de su grupo, como LinkedIn), con permisos de fila/columna del propio warehouse.' },
    { id: 'resp', label: 'Respuesta + SQL', sub: 'supuestos visibles', at: [13.2, -3.4], shape: 'doc', tone: 'neutral', icon: 'code', info: 'Resultado, SQL ejecutado, tablas usadas y supuestos. Hacer visible el SQL convierte cada respuesta en algo auditable.' },
    { id: 'evals', label: 'Evals + trazas', sub: 'set dorado, regresión', at: [9.9, 3.4], shape: 'box', tone: 'infra', icon: 'gauge', info: 'Set dorado con varias respuestas aceptadas por pregunta, comparación por resultados y regresión antes de cambiar prompt o modelo.' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'agent', to: 'gw', route: 'z' },
    { from: 'gw', to: 'llm' },
    { from: 'agent', to: 'ctx' },
    { from: 'ctx', to: 'guard' },
    { from: 'guard', to: 'dw' },
    { from: 'dw', to: 'resp', route: 'z' },
    { from: 'resp', to: 'user', route: 'arc', dashed: true },
    { from: 'agent', to: 'evals', route: 'arc', dashed: true },
  ],
  steps: [
    { title: '1 · Identidad en la sesión', body: 'El analista pregunta; su identidad y grupos quedan en el estado de la sesión, fuera del alcance del modelo.', flows: ['user>agent'] },
    { title: '2 · Razonar vía gateway', body: 'El agente llama al modelo a través del AI gateway: cambio de modelo, cuotas y costos por caso de uso.', flows: ['agent>gw', 'gw>llm'] },
    { title: '3 · Recuperar contexto curado', body: 'Tablas certificadas, glosario, valores de columnas y consultas parecidas. Aquí se decide la mayor parte de la precisión.', flows: ['agent>ctx'] },
    { title: '4 · Validar antes de ejecutar', body: 'El SQL pasa por un validador determinista: solo SELECT, tablas permitidas, LIMIT y costo estimado. El modelo no puede saltarse este paso.', flows: ['ctx>guard'] },
    { title: '5 · Ejecutar con permisos reales', body: 'La consulta corre con el rol del usuario; el warehouse aplica sus propias políticas de fila y columna.', flows: ['guard>dw'] },
    { title: '6 · Responder y medir', body: 'La respuesta incluye el SQL y los supuestos. Cada traza alimenta evals de regresión.', flows: ['dw>resp', 'resp>user', 'agent>evals'] },
  ],
}
