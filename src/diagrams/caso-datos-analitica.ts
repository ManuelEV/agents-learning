import type { IsoSpec } from '../components/iso/types'

// Diagramas de la página "Casos reales: agentes de datos y analítica".
// Todos son RECONSTRUCCIONES a partir de los blogs de ingeniería y papers citados;
// las empresas no publican diagramas de despliegue completos. El código y los datos
// de los paneles son ILUSTRATIVOS del patrón (tablas y valores inventados), salvo
// los dos archivos de `cda-patron`, que son los bloques de código de la página.

const json = (v: unknown) => JSON.stringify(v, null, 2)

// ─────────────────────────────────────────────────────────────────────────────
// Uber QueryGPT
// ─────────────────────────────────────────────────────────────────────────────

const QGPT_FLUJO = `# Ilustrativo de la cadena que publicó Uber (sep-2024); no es su código.
def query_gpt(pregunta: str, usuario) -> dict:
    pregunta = llm(EXPANDIR, pregunta)                    # prompt enhancer
    workspaces = llm_json(INTENT_AGENT, pregunta,         # pregunta → dominio(s)
                          opciones=WORKSPACES)
    candidatas = [t for w in workspaces for t in w.tablas]
    tablas = llm_json(TABLE_AGENT, pregunta, candidatas=candidatas)
    tablas = usuario.confirmar(tablas)                    # humano: acepta o edita
    esquemas = {t: catalogo.esquema(t) for t in tablas}   # hay tablas de 200+ columnas
    esquemas = {t: llm_json(COLUMN_PRUNE, pregunta, esquema=e)
                for t, e in esquemas.items()}
    ejemplos = [q for w in workspaces for q in w.sql_ejemplo]
    salida = llm_json(GENERAR_SQL, pregunta, esquemas=esquemas,
                      ejemplos=ejemplos)                  # few-shot del workspace
    return {"sql": salida["sql"], "explicacion": salida["explicacion"]}`

const QGPT_EVAL = `# Ilustrativo de la evaluación que describe Uber: dos modos sobre un set dorado.
def evaluar(caso: dict, modo: str) -> dict:
    if modo == "vanilla":                     # de punta a punta: infiere todo
        r = query_gpt(caso["pregunta"], usuario=AUTO_CONFIRMA)
    else:                                     # "decoupled": intención y tablas correctas
        r = generar_con(caso["pregunta"], caso["workspace"], caso["tablas"])
    filas = ejecutar(r["sql"])
    return {
        "intencion_ok": r.get("workspace") == caso["workspace"],
        "solapamiento_tablas": jaccard(tablas_de(r["sql"]), caso["tablas"]),  # 0 a 1
        "corre": filas is not None,
        "devuelve_filas": bool(filas),
        "similitud_llm": juez_llm(r["sql"], caso["sql_dorado"]),            # 0 a 1
    }`

export const cdaQueryGpt: IsoSpec = {
  id: 'cda-querygpt',
  title: 'Uber QueryGPT: de la pregunta al SQL',
  summary:
    'Reconstrucción a partir del blog de Uber (septiembre de 2024). En vez de un RAG plano sobre todos los esquemas, QueryGPT encadena **llamadas LLM especializadas** que van acotando el contexto: dominio (*workspace*), tablas, columnas y, al final, la generación del SQL con su explicación. El usuario confirma las tablas antes de generar. El código y los datos de los paneles son **ilustrativos** (tablas y valores inventados), no de Uber.',
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
  code: {
    flujo: { title: 'query_gpt.py (ilustrativo del patrón)', lang: 'python', source: QGPT_FLUJO },
    eval: { title: 'evaluar.py (ilustrativo)', lang: 'python', source: QGPT_EVAL },
  },
  steps: [
    {
      title: '1 · Pregunta y expansión',
      body: 'El analista escribe en lenguaje natural. Un paso previo expande la pregunta si viene demasiado escueta, para que las etapas siguientes tengan con qué trabajar.',
      flows: ['user>enh'],
      data: {
        title: 'pregunta original y expandida (ilustrativa, traducida)',
        lang: 'json',
        content: json({
          original: 'viajes completados ayer seattle',
          expandida: 'Número de viajes con estado completado en la ciudad de Seattle durante el día de ayer, en hora local.',
        }),
        hl: ['"expandida"'],
      },
      code: { file: 'flujo', hl: ['pregunta = llm(EXPANDIR, pregunta)'] },
    },
    {
      title: '2 · Intención → workspace',
      body: 'El **Intent Agent** mapea la pregunta a uno o más dominios. El RAG ya no busca en todo Uber, sino en un subconjunto curado de tablas y SQL de ejemplo.',
      flows: ['enh>intent', 'ws>intent'],
      data: {
        title: 'salida del Intent Agent (ilustrativa)',
        lang: 'json',
        content: json({
          opciones: ['Mobility', 'Core Services', 'Platform Engineering', 'IT', 'Ads', '…'],
          workspaces: ['Mobility'],
          razon: 'Pregunta sobre viajes y ciudades',
          tablas_del_workspace: 'decenas, no cientos de miles',
        }),
        hl: ['"workspaces"'],
      },
      code: { file: 'flujo', hl: ['workspaces = llm_json(INTENT_AGENT', 'opciones=WORKSPACES'] },
    },
    {
      title: '3 · Tablas con humano en el bucle',
      body: 'El **Table Agent** propone tablas y el usuario las confirma o corrige. Es la decisión que más condiciona el resultado y la que el humano valida con menos esfuerzo.',
      flows: ['intent>table', 'table>user'],
      data: {
        title: 'propuesta y confirmación (tablas inventadas)',
        lang: 'json',
        content: json({
          propuestas: ['mobility.viajes', 'mobility.dim_ciudad', 'mobility.viajes_programados'],
          confirmadas_por_usuario: ['mobility.viajes', 'mobility.dim_ciudad'],
          editado: 'quitó mobility.viajes_programados',
        }),
        hl: ['"confirmadas_por_usuario"'],
      },
      code: { file: 'flujo', hl: ['tablas = llm_json(TABLE_AGENT', 'usuario.confirmar(tablas)'] },
    },
    {
      title: '4 · Poda de columnas',
      body: 'El **Column Prune Agent** recorta los esquemas enormes a las columnas relevantes, para que quepan varias tablas sin desbordar el contexto. Menos tokens también es menos costo y latencia.',
      flows: ['schema>prune', 'table>prune'],
      data: {
        title: 'esquema antes y después de podar (ilustrativo)',
        lang: 'json',
        content: json({
          tabla: 'mobility.viajes',
          antes: { columnas: '200+', tokens: '≈40–60K (orden de magnitud que reporta Uber)' },
          despues: { columnas: ['viaje_id', 'ciudad_id', 'estado', 'fecha_fin_local'] },
        }),
        hl: ['"antes"', '"despues"'],
      },
      code: { file: 'flujo', hl: ['catalogo.esquema(t)', 'llm_json(COLUMN_PRUNE'] },
    },
    {
      title: '5 · Generación con few-shot',
      body: 'El LLM recibe el esquema podado más SQL de ejemplo del workspace y genera la consulta con una explicación en lenguaje natural.',
      flows: ['prune>gen', 'ws>gen'],
      data: {
        title: 'contexto del generador (ilustrativo)',
        messages: [
          { role: 'system', content: 'Escribe SQL (Presto) y explícalo. ESQUEMAS:\nmobility.viajes(viaje_id, ciudad_id, estado, fecha_fin_local)\nmobility.dim_ciudad(ciudad_id, nombre)\nEJEMPLO del workspace Mobility:\nSELECT COUNT(*) FROM mobility.viajes WHERE estado = …' },
          { role: 'user', content: 'Número de viajes con estado completado en la ciudad de Seattle durante el día de ayer, en hora local.' },
        ],
      },
      code: { file: 'flujo', hl: ['ejemplos = [q for w in workspaces', 'llm_json(GENERAR_SQL'] },
    },
    {
      title: '6 · Entrega',
      body: 'El usuario recibe SQL y explicación. Uber reconoce alucinaciones de tablas, columnas y **valores de filtro** aún no resueltas (un estado mal escrito devuelve cero filas); por eso el resultado se revisa antes de usarse.',
      flows: ['gen>out'],
      data: {
        title: 'salida (ilustrativa) con el riesgo típico',
        lang: 'json',
        content: json({
          sql: "SELECT COUNT(*) AS viajes FROM mobility.viajes v JOIN mobility.dim_ciudad c ON v.ciudad_id = c.ciudad_id WHERE c.nombre = 'Seattle' AND v.estado = 'completed' AND DATE(v.fecha_fin_local) = current_date - INTERVAL '1' DAY",
          explicacion: 'Cuenta los viajes completados ayer en Seattle uniendo viajes con ciudades.',
          riesgo: "si el valor real es 'COMPLETED', la consulta corre y devuelve 0",
        }),
        hl: ["v.estado = 'completed'", '"riesgo"'],
      },
      code: { file: 'flujo', hl: ['return {"sql": salida["sql"]'] },
    },
    {
      title: '7 · Evaluar en dos modos',
      body: 'Uber evalúa con un set dorado de preguntas reales en modo **vanilla** (de punta a punta) y **decoupled** (con intención y tablas correctas, para aislar la generación). Las métricas son granulares; observaron ~5 % de variación entre corridas idénticas y no publicaron precisión agregada.',
      focus: ['intent', 'table', 'gen'],
      data: {
        title: 'resultado de un caso del set dorado (valores ilustrativos)',
        lang: 'json',
        content: json({
          caso: 'dorado-0381',
          modo: 'decoupled',
          intencion_ok: true,
          solapamiento_tablas: 1.0,
          corre: true,
          devuelve_filas: false,
          similitud_llm: 0.8,
          diagnostico: 'valor de filtro inventado: estado',
        }),
        hl: ['"modo"', '"devuelve_filas"'],
      },
      code: { file: 'eval', hl: ['if modo == "vanilla"', '"decoupled"', '"solapamiento_tablas"', '"devuelve_filas"'] },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// LinkedIn SQL Bot
// ─────────────────────────────────────────────────────────────────────────────

const LI_FLUJO = `# Ilustrativo del flujo publicado por LinkedIn (blog dic-2024, paper jul-2025).
MAX_CORRECCIONES = 2      # según el paper, como máximo dos pasadas

def sql_bot(pregunta: str, usuario) -> dict:
    # Recuperación: popularidad → EBR (top 20), sesgada por el área del usuario
    candidatas = ebr.buscar(pregunta, k=20, universo=tablas_populares(),
                            preferir=datasets_por_defecto(usuario.org))
    tablas = rerank_tablas_llm(pregunta, candidatas, top=7)
    campos = elegir_campos_llm(pregunta, tablas, grafo.atributos(tablas))
    sql = escribir(pregunta, tablas, campos,                 # plan + pasos mínimos
                   ejemplos=grafo.consultas_certificadas(tablas))
    errores = validar(sql)
    for _ in range(MAX_CORRECCIONES):
        if not errores:
            break
        extra = investigar(pregunta, errores)       # busca tablas/campos que faltaron
        sql = corregir(sql, errores, extra)          # "fixer"
        errores = validar(sql)
    return {"sql": sql, "tablas": tablas, "errores": errores}

def validar(sql: str) -> list[str]:
    errores = [f"no existe: {n}" for n in nombres_en(sql) if not grafo.existe(n)]
    try:
        trino.execute(f"EXPLAIN (TYPE VALIDATE) {sql}")   # valida sin ejecutar
    except TrinoError as e:
        errores.append(str(e))
    return errores`

export const cdaLinkedin: IsoSpec = {
  id: 'cda-linkedin',
  title: 'LinkedIn SQL Bot: recuperar, ordenar, escribir, validar',
  summary:
    'Reconstrucción a partir del blog de LinkedIn (diciembre de 2024) y del paper de KDD 2025. La calidad sale del **grafo de conocimiento** (metadatos de DataHub, logs de consultas, ejemplos certificados), de un **re-ranking** con LLM y de **validadores** que verifican lo que el escritor no podía saber. El código y los datos de los paneles son **ilustrativos** (tablas inventadas), no de LinkedIn.',
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
  code: { flujo: { title: 'sql_bot.py (ilustrativo del patrón)', lang: 'python', source: LI_FLUJO } },
  steps: [
    {
      title: '1 · Contexto antes que modelo',
      body: 'El grafo de conocimiento se construye offline desde DataHub, logs de consultas y ejemplos certificados. Según el paper, con solo esquemas apenas el 9 % de las respuestas alcanza puntaje alto; con el grafo completo, 53 % en la revisión experta.',
      focus: ['kg'],
      data: {
        title: 'un nodo del grafo de conocimiento (tabla inventada)',
        lang: 'json',
        content: json({
          tabla: 'metricas.miembros_activos_diarios',
          certificada: true,
          descripcion: 'Miembros activos por día y país. Usar para "miembros activos".',
          partition_key: 'fecha',
          columnas: { pais: 'dimension', fecha: 'dimension', miembros_activos: 'metrica' },
          valores_frecuentes: { pais: ['US', 'IN', 'BR', 'GB'] },
          joins_comunes: ['dim.paises ON pais = codigo_iso'],
          popularidad_30d: 'alta',
        }),
        hl: ['"certificada"', '"valores_frecuentes"', '"joins_comunes"'],
      },
      code: { hl: ['grafo.atributos(tablas)', 'grafo.consultas_certificadas(tablas)'] },
    },
    {
      title: '2 · Recuperación personalizada',
      body: 'La pregunta se busca por embeddings entre tablas populares, sesgada por los datasets del área del usuario. La misma pregunta significa cosas distintas según quién la hace.',
      flows: ['user>ebr', 'kg>ebr', 'pers>ebr'],
      data: {
        title: 'búsqueda EBR personalizada (ilustrativa)',
        lang: 'json',
        content: json({
          pregunta: '¿Cuántos miembros activos hubo la semana pasada en Brasil?',
          usuario: { area: 'Growth' },
          datasets_por_defecto: ['metricas.miembros_activos_diarios'],
          universo: 'tablas populares (de millones a unos miles)',
          top_20: ['metricas.miembros_activos_diarios', 'growth.sesiones_app', 'metricas.miembros_activos_mensuales', '… 17 más'],
        }),
        hl: ['"datasets_por_defecto"', '"top_20"'],
      },
      code: { hl: ['ebr.buscar(pregunta, k=20', 'preferir=datasets_por_defecto'] },
    },
    {
      title: '3 · Re-ranking',
      body: 'Un LLM reduce 20 candidatas a 7 y un segundo paso elige campos. Es más barato equivocarse aquí y corregir que pasar 20 esquemas completos al escritor.',
      flows: ['ebr>rank'],
      data: {
        title: 'salida del re-ranker (ilustrativa)',
        lang: 'json',
        content: json({
          tablas_top_7: [
            { tabla: 'metricas.miembros_activos_diarios', relevancia: 'alta' },
            { tabla: 'dim.paises', relevancia: 'media' },
            { tabla: 'metricas.miembros_activos_mensuales', relevancia: 'baja' },
          ],
          campos: ['fecha', 'pais', 'miembros_activos'],
        }),
        hl: ['"tablas_top_7"', '"campos"'],
      },
      code: { hl: ['rerank_tablas_llm(pregunta, candidatas, top=7)', 'elegir_campos_llm('] },
    },
    {
      title: '4 · Escritura con plan',
      body: 'El escritor arma un plan proporcional a la complejidad (el planner tiene instrucciones de minimizar pasos) y genera el SQL. Nota del paper: la planificación elaborada, los múltiples candidatos y la expansión de la pregunta **no** mejoraron sus resultados.',
      flows: ['rank>writer'],
      data: {
        title: 'plan y primer borrador (ilustrativo)',
        lang: 'json',
        content: json({
          plan: ['filtrar Brasil y la semana pasada', 'sumar miembros_activos por día', 'promediar'],
          sql: "SELECT AVG(miembros_activos) FROM metricas.miembros_activos_diarios WHERE pais_code = 'BR' AND fecha >= current_date - INTERVAL '7' DAY",
        }),
        hl: ['"plan"', 'pais_code'],
      },
      code: { hl: ['sql = escribir(pregunta, tablas, campos'] },
    },
    {
      title: '5 · Validar y corregir',
      body: 'Existencia de tablas/campos y `EXPLAIN` en Trino. Si algo falla, el agente de autocorrección busca lo que faltó y reescribe (máximo dos pasadas). Con validación, la compilación sube de 66 % a 96 % y los nombres válidos de 77 % a 99 % en su benchmark; el filtro incorrecto sigue siendo el error más frecuente (24 %).',
      flows: ['writer>val', 'val>trino', 'val>fix', 'fix>writer'],
      data: {
        title: 'pasadas de validación (ilustrativo)',
        lang: 'json',
        content: json({
          pasada_1: { errores: ['no existe: miembros_activos_diarios.pais_code'] },
          investigador: { encontro: 'la columna correcta es pais (valores ISO como BR)' },
          pasada_2: {
            sql: "SELECT AVG(miembros_activos) FROM metricas.miembros_activos_diarios WHERE pais = 'BR' AND fecha >= current_date - INTERVAL '7' DAY",
            explain_validate: 'ok',
            errores: [],
          },
        }),
        hl: ['"pasada_1"', '"investigador"', '"explain_validate"'],
      },
      code: { hl: ['errores = validar(sql)', 'extra = investigar(', 'sql = corregir(', 'EXPLAIN (TYPE VALIDATE)'] },
    },
    {
      title: '6 · Respuesta en el flujo de trabajo',
      body: 'La consulta vuelve al editor de DARWIN con metadatos de tablas y resultados de validación, lista para pegar. "Fix with AI" sobre consultas fallidas concentra ~80 % de las sesiones, según el blog.',
      flows: ['val>user'],
      data: {
        title: 'lo que recibe el editor (ilustrativo)',
        lang: 'json',
        content: json({
          sql: "SELECT AVG(miembros_activos) FROM metricas.miembros_activos_diarios WHERE pais = 'BR' AND fecha >= current_date - INTERVAL '7' DAY",
          tablas: [{ nombre: 'metricas.miembros_activos_diarios', certificada: true }],
          validacion: 'existencia ok · EXPLAIN ok',
          acciones_ui: ['insertar en el editor', 'Fix with AI', 'feedback'],
        }),
        hl: ['"validacion"', '"acciones_ui"'],
      },
      code: { hl: ['return {"sql": sql, "tablas": tablas'] },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Pinterest Analytics Agent
// ─────────────────────────────────────────────────────────────────────────────

const PIN_TOOLS = `# Ilustrativo del patrón descrito por Pinterest (mar-2026); no es su código.
from mcp.server import MCPServer

mcp = MCPServer("analytics-context")
LIMITE_FILAS = 100                      # Pinterest: LIMIT 100 por defecto

@mcp.tool()
def buscar_tablas(pregunta: str, k: int = 10) -> list[dict]:
    """Tablas candidatas, priorizando las gobernadas (tier, frescura, docs, dueño)."""
    candidatas = indice_tablas.similares(embeber(pregunta), k=k * 5)
    for t in candidatas:
        meta = pincat.metadatos(t["tabla"])          # tier, owner, retención, glosario
        t["score"] = (t["similitud"] * PESO_TIER[meta["tier"]] * frescura(meta)
                      * completitud_docs(meta) * (1 if meta["owner"] else 0.5))
    return sorted(candidatas, key=lambda t: -t["score"])[:k]

@mcp.tool()
def buscar_consultas(pregunta: str, k: int = 5) -> list[dict]:
    """Consultas históricas cuya intención de negocio se parece a la pregunta."""
    return indice_intencion.similares(embeber(pregunta), k=k)  # SQL + joins + filtros

@mcp.tool()
def ejecutar_presto(sql: str) -> dict:
    """Valida contra el catálogo, corre EXPLAIN y ejecuta con LIMIT 100."""
    if faltan := pincat.inexistentes(sql):              # tablas/columnas reales
        return {"ok": False, "error": f"No existen en PinCat: {faltan}"}
    presto.execute(f"EXPLAIN {sql}")                     # falla antes de gastar
    return {"ok": True, "filas": presto.execute(con_limite(sql, LIMITE_FILAS))}`

const PIN_INDEX = `# Job diario (ilustrativo): SQL histórico → pregunta de negocio → embedding.
def indexar_dia(fecha):
    for q in query_logs.del_dia(fecha):
        contexto = {t: pincat.metadatos(t) for t in tablas_de(q.sql)}  # tier, glosario
        intencion = llm(DESCRIBIR_INTENCION, sql=q.sql, contexto=contexto)
        patrones = extraer_patrones(q.sql)    # joins con claves, filtros, agregaciones
        opensearch.upsert(id=q.id, vector=embeber(intencion),
                          intencion=intencion, sql=q.sql, patrones=patrones)`

export const cdaPinterest: IsoSpec = {
  id: 'cda-pinterest',
  title: 'Pinterest Analytics Agent: contexto gobernado vía MCP',
  summary:
    'Reconstrucción a partir del post de Pinterest (marzo de 2026), consultado a través de resúmenes secundarios, y del caso publicado por DataHub. El agente usa **herramientas MCP** sobre un catálogo con *tiers* (PinCat) y un índice que guarda la **intención analítica** de cada consulta histórica, no solo la documentación de tablas. El código (un servidor MCP y un job de indexación) y los datos son **ilustrativos**: tablas, pesos y valores inventados.',
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
  code: {
    tools: { title: 'servidor_mcp.py (ilustrativo del patrón)', lang: 'python', source: PIN_TOOLS },
    index: { title: 'indexar_intencion.py (ilustrativo)', lang: 'python', source: PIN_INDEX },
  },
  steps: [
    {
      title: '1 · Gobernanza primero',
      body: 'PinCat asigna tier, dueño y retención a cada tabla. Pinterest describe la gobernanza y la IA como esfuerzos que se refuerzan mutuamente: sin tiers, el agente recomendaría tablas abandonadas. Según DataHub, la limpieza llevó el warehouse de ~400.000 a ~100.000 tablas.',
      focus: ['pincat'],
      data: {
        title: 'metadatos de una tabla en el catálogo (inventados)',
        lang: 'json',
        content: json({
          tabla: 'ads.metricas_anuncios_diarias',
          tier: 1,
          significado_tier: '1 = producción documentada y revisada',
          owner: 'equipo-ads-data',
          retencion_dias: 730,
          glosario: ['CTR', 'impresión válida'],
          documentada: true,
        }),
        hl: ['"tier": 1', '"owner"'],
      },
      code: { file: 'tools', hl: ['pincat.metadatos(t["tabla"])'] },
    },
    {
      title: '2 · Indexar intenciones, no solo tablas',
      body: 'Offline, un LLM convierte SQL histórico (enriquecido con contexto de PinCat) en la pregunta de negocio que respondía, y extrae patrones de joins, filtros y agregaciones. Se embeben y se actualizan a diario.',
      flows: ['pincat>sql2txt', 'sql2txt>idx'],
      data: {
        title: 'documento del índice de intención (ilustrativo)',
        lang: 'json',
        content: json({
          id: 'q-2026-02-11-88123',
          intencion: '¿Cuál fue el CTR de los anuncios de video por país en el último mes?',
          sql: "SELECT pais, SUM(clics) * 1.0 / SUM(impresiones) AS ctr FROM ads.metricas_anuncios_diarias WHERE formato = 'VIDEO' AND fecha >= … GROUP BY pais",
          patrones: { filtros: ["formato = 'VIDEO'"], agregaciones: ['SUM(clics) / SUM(impresiones)'], joins: [] },
        }),
        hl: ['"intencion"', '"patrones"'],
      },
      code: { file: 'index', hl: ['def indexar_dia', 'llm(DESCRIBIR_INTENCION', 'extraer_patrones(q.sql)', 'opensearch.upsert('] },
    },
    {
      title: '3 · Orquestación',
      body: 'El agente recibe la pregunta, clasifica la tarea (descubrir tablas, reutilizar consultas o generar SQL) y decide qué herramientas MCP llamar.',
      flows: ['analyst>orch', 'orch>mcp'],
      data: {
        title: 'clasificación de la tarea (ilustrativa)',
        lang: 'json',
        content: json({
          pregunta: 'CTR de anuncios de video por país, octubre',
          tarea: 'generar_sql',
          plan_de_herramientas: ['buscar_consultas', 'buscar_tablas', 'ejecutar_presto'],
          jerarquia_si_hay_conflicto: ['docs de expertos', 'metadatos de PinCat', 'patrones de consultas', 'conocimiento general del modelo'],
        }),
        hl: ['"tarea"', '"jerarquia_si_hay_conflicto"'],
      },
      code: { file: 'tools', hl: ['mcp = MCPServer("analytics-context")'] },
    },
    {
      title: '4 · Descubrir tablas gobernadas',
      body: 'La búsqueda de tablas pondera similitud con tier, frescura, documentación y ownership. En la fórmula ilustrativa de la derecha, una tabla tier 3 sin dueño pierde frente a una tier 1 aunque se parezca más a la pregunta.',
      flows: ['mcp>tsearch', 'tsearch>pincat'],
      data: {
        title: 'tools/call buscar_tablas (resultado ilustrativo)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 12,
          result: {
            structuredContent: [
              { tabla: 'ads.metricas_anuncios_diarias', similitud: 0.81, tier: 1, score: 0.78 },
              { tabla: 'tmp_jperez.ctr_video_test', similitud: 0.86, tier: 3, score: 0.19 },
            ],
          },
        }),
        hl: ['"tier": 1', '"tier": 3'],
      },
      code: { file: 'tools', hl: ['def buscar_tablas', 't["score"] = (t["similitud"] * PESO_TIER', 'sorted(candidatas'] },
    },
    {
      title: '5 · Reutilizar consultas probadas',
      body: 'La búsqueda por intención encuentra consultas pasadas equivalentes y sus joins y filtros correctos, que el agente usa como base. Así el filtro dice `\'VIDEO\'` y no `\'video\'`.',
      flows: ['mcp>qsearch', 'qsearch>idx'],
      data: {
        title: 'tools/call buscar_consultas (resultado ilustrativo)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 13,
          result: {
            structuredContent: [
              { id: 'q-2026-02-11-88123', intencion: '¿Cuál fue el CTR de los anuncios de video por país en el último mes?', similitud: 0.93, filtros: ["formato = 'VIDEO'"] },
            ],
          },
        }),
        hl: ['"similitud": 0.93', '"filtros"'],
      },
      code: { file: 'tools', hl: ['def buscar_consultas', 'indice_intencion.similares('] },
    },
    {
      title: '6 · Validar y ejecutar acotado',
      body: 'Tablas y columnas se verifican contra PinCat, se corre `EXPLAIN` en Presto y se ejecuta con `LIMIT 100` y reintentos limitados. Pinterest no publicó métricas de precisión del SQL generado.',
      flows: ['mcp>exec'],
      data: {
        title: 'tools/call ejecutar_presto (ilustrativo)',
        lang: 'json',
        content: json({
          request: { jsonrpc: '2.0', id: 14, method: 'tools/call', params: { name: 'ejecutar_presto', arguments: { sql: "SELECT pais, SUM(clics) * 1.0 / SUM(impresiones) AS ctr FROM ads.metricas_anuncios_diarias WHERE formato = 'VIDEO' AND fecha BETWEEN DATE '2026-10-01' AND DATE '2026-10-31' GROUP BY pais" } } },
          response: { result: { structuredContent: { ok: true, explain: 'ok', limit_aplicado: 100, filas: [{ pais: 'US', ctr: 0.012 }, { pais: 'BR', ctr: 0.015 }] } } },
        }),
        hl: ['"explain"', '"limit_aplicado"'],
      },
      code: { file: 'tools', hl: ['def ejecutar_presto', 'pincat.inexistentes(sql)', 'presto.execute(f"EXPLAIN {sql}")', 'con_limite(sql, LIMITE_FILAS)'] },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Patrón común (ejemplo con ADK + gateway + Bedrock)
// ─────────────────────────────────────────────────────────────────────────────

/** Mismo código que el bloque `herramientas/validar_sql.py` de la página. */
const VALIDAR_SQL = `import sqlglot
from sqlglot import exp

# Tablas certificadas que este agente puede leer. En producción, sácalas del catálogo.
ALLOWLIST = {"finanzas.ventas_diarias", "finanzas.dim_tienda", "ops.devoluciones"}
LIMITE_FILAS = 100

def validar_sql(sql: str) -> dict:
    """Valida el SQL generado antes de ejecutarlo. Devuelve el SQL normalizado
    (con LIMIT) o un error accionable para que el agente lo corrija."""
    try:
        sentencias = sqlglot.parse(sql, read="bigquery")
    except sqlglot.errors.ParseError as e:
        return {"ok": False, "error": f"SQL inválido: {e.errors[0]['description']}"}
    if len(sentencias) != 1:
        return {"ok": False, "error": "Envía exactamente una sentencia."}
    arbol = sentencias[0]
    # Solo lectura: SELECT, UNION o WITH ... SELECT, sin DML/DDL anidado
    if not isinstance(arbol, exp.Query) or arbol.find(
            exp.Insert, exp.Update, exp.Delete, exp.Merge, exp.Create, exp.Drop):
        return {"ok": False, "error": "Solo se permiten consultas SELECT."}
    ctes = {c.alias_or_name for c in arbol.find_all(exp.CTE)}
    usadas = {f"{t.db}.{t.name}" for t in arbol.find_all(exp.Table) if t.name not in ctes}
    fuera = sorted(usadas - ALLOWLIST)
    if fuera:  # típico de una tabla alucinada o no certificada
        return {"ok": False, "error": f"Tablas no permitidas o inexistentes: {fuera}. "
                                      f"Usa solo: {sorted(ALLOWLIST)}"}
    if not arbol.args.get("limit"):
        arbol = arbol.limit(LIMITE_FILAS)
    return {"ok": True, "sql": arbol.sql(dialect="bigquery"), "tablas": sorted(usadas)}`

/** Mismo código que el bloque `herramientas/consultar.py` de la página. */
const CONSULTAR = `from google.cloud import bigquery
from google.oauth2.credentials import Credentials
from google.adk.tools import ToolContext
from herramientas.validar_sql import validar_sql

MAX_BYTES = 5 * 10**9  # 5 GB por consulta; lo define el equipo de datos

def consultar_warehouse(sql: str, tool_context: ToolContext) -> dict:
    """Ejecuta una consulta de SOLO LECTURA sobre tablas certificadas y devuelve
    hasta 100 filas. Si recibes un error, corrige el SQL según el mensaje."""
    v = validar_sql(sql)
    if not v["ok"]:
        return v
    # El token del usuario lo fija el canal en el estado de la sesión, nunca el modelo
    cliente = bigquery.Client(credentials=Credentials(tool_context.state["user_token"]),
                              project=tool_context.state["proyecto"])
    plan = cliente.query(v["sql"], job_config=bigquery.QueryJobConfig(
        dry_run=True, use_query_cache=False))
    if plan.total_bytes_processed > MAX_BYTES:
        return {"ok": False, "error": "La consulta leería demasiados datos; "
                                      "agrega un filtro por fecha o partición."}
    filas = cliente.query(v["sql"], job_config=bigquery.QueryJobConfig(
        maximum_bytes_billed=MAX_BYTES)).result()
    return {"ok": True, "sql": v["sql"], "filas": [dict(f.items()) for f in filas]}`

/** ILUSTRATIVO: el agente ADK que usa esas herramientas, con el modelo vía AI gateway. */
const AGENTE_DATOS = `# Ilustrativo: el agente de datos del ejemplo (ADK + AI gateway + Bedrock).
import os
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from herramientas.consultar import consultar_warehouse
from herramientas.contexto import buscar_contexto   # catálogo, glosario, SQL histórico

root_agent = LlmAgent(
    name="agente_datos",
    model=LiteLlm(
        model="litellm_proxy/claude-sonnet",          # alias del gateway → Bedrock
        api_base=os.environ["AI_GATEWAY_URL"],
        api_key=os.environ["AI_GATEWAY_KEY"],         # clave virtual del agente
    ),
    instruction=(
        "Respondes preguntas de negocio con datos. Primero llama a buscar_contexto "
        "y usa solo tablas certificadas. Ejecuta con consultar_warehouse; si devuelve "
        "un error, corrige el SQL. Responde con la cifra, el SQL ejecutado y los supuestos."
    ),
    tools=[buscar_contexto, consultar_warehouse],
)`

const SQL_MALO = "SELECT t.nombre AS tienda, SUM(v.venta_neta) AS venta_neta FROM finanzas.ventas v JOIN finanzas.dim_tienda t ON v.tienda_id = t.tienda_id WHERE v.fecha BETWEEN '2026-10-26' AND '2026-11-01' AND t.region = 'RM' GROUP BY tienda ORDER BY venta_neta DESC"
const SQL_OK = "SELECT t.nombre AS tienda, SUM(v.venta_neta) AS venta_neta FROM finanzas.ventas_diarias AS v JOIN finanzas.dim_tienda AS t ON v.tienda_id = t.tienda_id WHERE v.fecha BETWEEN '2026-10-26' AND '2026-11-01' AND t.region = 'RM' GROUP BY tienda ORDER BY venta_neta DESC LIMIT 100"

export const cdaPatron: IsoSpec = {
  id: 'cda-patron',
  title: 'El patrón común (ejemplo con ADK + gateway + Bedrock)',
  summary:
    'Síntesis propia (no es la arquitectura de ninguna empresa) de lo que comparten los casos: **contexto semántico curado**, un **validador determinista** entre el agente y el warehouse, ejecución con la **identidad del usuario**, SQL visible en la respuesta y **evaluación con set dorado**. Mapeado, como ejemplo, a ADK + AI gateway + Bedrock (el warehouse del código de la página es BigQuery); cada pieza tiene equivalentes en otras nubes. El diagrama de secuencia sigue una pregunta de punta a punta; `validar_sql.py` y `consultar.py` son los bloques de código de la página y `agente.py` es ilustrativo.',
  height: 500,
  layout: 'sequence',
  lanes: ['user', 'agent', 'gw', 'llm', 'ctx', 'guard', 'dw', 'evals'],
  nodes: [
    { id: 'user', label: 'Analista', sub: 'identidad OIDC', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'La identidad (y sus grupos) viaja en la sesión. El agente nunca recibe credenciales "de servicio" con más permisos que el usuario.' },
    { id: 'agent', label: 'Agente de datos', sub: 'Google ADK', at: [3.3, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Un solo agente con pocas herramientas: buscar contexto, validar SQL, ejecutar. Sub-agentes solo si la medición lo justifica (como el supervisor de Finch).' },
    { id: 'gw', label: 'AI gateway', sub: 'LiteLLM → Bedrock', at: [3.6, -3.7], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Como el Generative AI Gateway de Uber: permite cambiar de modelo, atribuir costos por caso de uso y aplicar límites.' },
    { id: 'llm', label: 'LLM', sub: 'Claude en Bedrock', at: [7.4, -3.7], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Cualquier modelo fuerte en SQL. En los casos públicos, el modelo pesa menos que el contexto: LinkedIn lo comprobó con ablaciones.' },
    { id: 'ctx', label: 'Contexto semántico', sub: 'catálogo, glosario, SQL', at: [6.6, 0], shape: 'stack', tone: 'data', icon: 'book', info: 'Tablas certificadas con tier y dueño, descripciones, valores de columnas, alias de negocio y consultas históricas indexadas por intención.' },
    { id: 'guard', label: 'Validador SQL', sub: 'solo lectura + allowlist', at: [9.9, 0], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Código determinista: parsea el SQL, rechaza escrituras, verifica tablas contra una allowlist, fuerza LIMIT y estima el costo con un dry run.' },
    { id: 'dw', label: 'Data warehouse', sub: 'rol del usuario', at: [13.2, 0], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Redshift, Athena, BigQuery o Snowflake. La ejecución usa el rol del usuario (o de su grupo, como LinkedIn), con permisos de fila/columna del propio warehouse.' },
    { id: 'evals', label: 'Evals + trazas', sub: 'set dorado, regresión', at: [9.9, 3.4], shape: 'box', tone: 'infra', icon: 'gauge', info: 'Set dorado con varias respuestas aceptadas por pregunta, comparación por resultados y regresión antes de cambiar prompt o modelo.' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'agent', to: 'gw', route: 'z' },
    { from: 'gw', to: 'llm' },
    { from: 'agent', to: 'ctx' },
    { from: 'agent', to: 'guard', route: 'arc' },
    { from: 'guard', to: 'dw' },
    { from: 'dw', to: 'user', route: 'arc', dashed: true },
    { from: 'agent', to: 'evals', route: 'arc', dashed: true },
  ],
  code: {
    validar: { title: 'herramientas/validar_sql.py', lang: 'python', source: VALIDAR_SQL },
    consultar: { title: 'herramientas/consultar.py', lang: 'python', source: CONSULTAR },
    agente: { title: 'agente.py (ilustrativo)', lang: 'python', source: AGENTE_DATOS },
  },
  steps: [
    {
      title: '1 · Identidad en la sesión',
      body: 'El analista pregunta; el **canal** (no el modelo) deja su identidad, grupos y token en el estado de la sesión. El modelo nunca ve el token: solo lo lee la herramienta que ejecuta.',
      flows: ['user>agent: pregunta + sesión OIDC'],
      data: {
        title: 'estado de la sesión de ADK (ilustrativo)',
        lang: 'json',
        content: json({
          pregunta: '¿Cuánto vendimos la semana pasada por tienda en la Región Metropolitana?',
          state: {
            user_id: 'ana.rojas@empresa.cl',
            grupos: ['finanzas-analistas'],
            user_token: '(token OAuth del usuario, nunca entra al prompt)',
            proyecto: 'analitica-prod',
          },
        }),
        hl: ['"user_token"', '"proyecto"'],
      },
      code: { file: 'consultar', hl: ['El token del usuario lo fija el canal'] },
    },
    {
      title: '2 · Razonar vía gateway',
      body: 'El agente llama al modelo a través del AI gateway con un **alias** y la clave virtual del agente: cambio de modelo, cuotas y costos por caso de uso. El modelo decide empezar por buscar contexto.',
      flows: ['agent>gw: chat/completions', 'gw>llm: Bedrock', 'llm>gw: tool_call', 'gw>agent: buscar_contexto'],
      data: {
        title: 'petición al gateway y respuesta (forma simplificada)',
        lang: 'http',
        content: `POST /v1/chat/completions HTTP/1.1
Host: ai-gateway.interno
Authorization: Bearer sk-clave-virtual-agente-datos

${json({
  model: 'claude-sonnet',
  messages: [{ role: 'user', content: '¿Cuánto vendimos la semana pasada por tienda en la Región Metropolitana?' }],
  tools: [{ type: 'function', function: { name: 'buscar_contexto' } }, { type: 'function', function: { name: 'consultar_warehouse' } }],
})}

HTTP/1.1 200 OK

${json({ choices: [{ message: { tool_calls: [{ function: { name: 'buscar_contexto', arguments: '{"pregunta": "ventas semana pasada por tienda RM"}' } }] }, finish_reason: 'tool_calls' }] })}`,
        hl: ['Authorization', '"model"', '"finish_reason"'],
      },
      code: { file: 'agente', hl: ['model=LiteLlm(', 'model="litellm_proxy/claude-sonnet"', 'api_key=os.environ["AI_GATEWAY_KEY"]'] },
    },
    {
      title: '3 · Recuperar contexto curado',
      body: 'Tablas certificadas, glosario, valores de columnas y consultas parecidas. Aquí se decide la mayor parte de la precisión: "venta neta" y "RM" tienen definiciones que no están en el esquema.',
      flows: ['agent>ctx: buscar_contexto', 'ctx>agent: tablas + glosario'],
      data: {
        title: 'resultado de buscar_contexto (ilustrativo)',
        lang: 'json',
        content: json({
          tablas_certificadas: [
            { tabla: 'finanzas.ventas_diarias', tier: 1, columnas: ['fecha', 'tienda_id', 'venta_neta'] },
            { tabla: 'finanzas.dim_tienda', tier: 1, columnas: ['tienda_id', 'nombre', 'region'] },
          ],
          glosario: { venta_neta: 'venta bruta menos devoluciones y descuentos', RM: "region = 'RM'" },
          consulta_parecida: 'SELECT ... FROM finanzas.ventas_diarias v JOIN finanzas.dim_tienda t ...',
        }),
        hl: ['"tablas_certificadas"', '"glosario"'],
      },
      code: { file: 'agente', hl: ['Primero llama a buscar_contexto', 'tools=[buscar_contexto, consultar_warehouse]'] },
    },
    {
      title: '4 · El modelo escribe el SQL',
      body: 'Con el contexto, el modelo pide ejecutar una consulta. En este ejemplo **se equivoca de tabla** (`finanzas.ventas`, que no existe en la allowlist): justo el tipo de error que el validador está para atrapar.',
      flows: ['agent>gw: 2.ª llamada + contexto', 'gw>agent: consultar_warehouse(sql)'],
      data: {
        title: 'llamada de herramienta que pide el modelo (forma simplificada)',
        lang: 'json',
        content: json({ function_call: { name: 'consultar_warehouse', args: { sql: SQL_MALO } } }),
        hl: ['"consultar_warehouse"', 'finanzas.ventas v'],
      },
      code: { file: 'consultar', hl: ['def consultar_warehouse', 'Si recibes un error, corrige el SQL'] },
    },
    {
      title: '5 · Validar antes de ejecutar',
      body: 'El SQL pasa por un validador determinista: una sola sentencia, solo lectura, tablas permitidas y `LIMIT`. El modelo no puede saltarse este paso, y el error vuelve como mensaje **accionable** para que se corrija en la siguiente vuelta.',
      flows: ['agent>guard: validar_sql', 'guard>agent: error accionable', 'agent>guard: SQL corregido'],
      data: {
        title: 'salida de validar_sql en dos intentos',
        lang: 'json',
        content: json({
          intento_1: { ok: false, error: "Tablas no permitidas o inexistentes: ['finanzas.ventas']. Usa solo: ['finanzas.dim_tienda', 'finanzas.ventas_diarias', 'ops.devoluciones']" },
          intento_2: { ok: true, sql: SQL_OK, tablas: ['finanzas.dim_tienda', 'finanzas.ventas_diarias'] },
        }),
        hl: ['"intento_1"', 'LIMIT 100'],
      },
      code: { file: 'validar', hl: ['ALLOWLIST = {', 'if not isinstance(arbol, exp.Query)', 'fuera = sorted(usadas - ALLOWLIST)', 'arbol = arbol.limit(LIMITE_FILAS)'] },
    },
    {
      title: '6 · Ejecutar con permisos reales',
      body: 'Un *dry run* estima los bytes y bloquea consultas caras; luego la consulta corre con las **credenciales del usuario**, así el warehouse aplica sus propias políticas de fila y columna. Si Ana no puede ver una tabla, el agente tampoco.',
      flows: ['guard>dw: dry run + query (token de Ana)', 'dw>agent: filas'],
      data: {
        title: 'dry run y resultado (valores ilustrativos)',
        lang: 'json',
        content: json({
          dry_run: { total_bytes_processed: 1843200000, max_bytes: 5000000000, ok: true },
          resultado: {
            ok: true,
            filas: [
              { tienda: 'Costanera', venta_neta: 182450000 },
              { tienda: 'Plaza Oeste', venta_neta: 151020000 },
              { tienda: 'Florida Center', venta_neta: 97310000 },
            ],
          },
        }),
        hl: ['"total_bytes_processed"', '"filas"'],
      },
      code: { file: 'consultar', hl: ['Credentials(tool_context.state["user_token"])', 'dry_run=True', 'if plan.total_bytes_processed > MAX_BYTES', 'maximum_bytes_billed=MAX_BYTES'] },
    },
    {
      title: '7 · Responder y medir',
      body: 'La respuesta incluye la cifra, el SQL ejecutado y los supuestos: así cada respuesta es auditable. La traza alimenta evals de regresión que comparan **por resultados** y aceptan más de un SQL correcto.',
      flows: ['agent>user: cifra + SQL + supuestos', 'agent>evals: traza'],
      data: {
        title: 'respuesta y caso de regresión (ilustrativo)',
        lang: 'json',
        content: json({
          respuesta: {
            texto: 'La semana del 26-oct al 1-nov, Costanera lideró la RM con $182,5 M de venta neta.',
            sql: SQL_OK,
            supuestos: ['venta neta = bruta − devoluciones − descuentos', 'semana de lunes a domingo'],
          },
          caso_set_dorado: { id: 'ventas-012', respuestas_aceptadas: 2, comparacion: 'por resultados', pasa: true },
        }),
        hl: ['"supuestos"', '"comparacion"'],
      },
      code: { file: 'agente', hl: ['Responde con la cifra, el SQL ejecutado y los supuestos'] },
    },
  ],
}
