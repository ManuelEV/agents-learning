import type { IsoSpec } from '../components/iso/types'

/* Reconstrucciones a partir de lo publicado por cada empresa
   (ver docs/research/casos/caso-investigacion-multiagente.md). Los datos y el
   código de los paneles son ILUSTRATIVOS DEL PATRÓN, salvo `investigacion/agent.py`,
   que es el bloque de ADK de la propia página. Ninguna empresa publicó su código. */

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ─────────────────────────── Anthropic: flujo ─────────────────────────── */

const LIDER = `# lider.py (ilustrativo del patrón descrito por Anthropic; no es su código)
import asyncio

LIDER, TRABAJADOR = "opus-4", "sonnet-4"      # roles de modelo en jun-2025, según el post
MAX_SUBAGENTES, MAX_RONDAS = 10, 3            # topes duros en código, además del prompt
REGLAS_ESFUERZO = """Dato puntual: 1 agente, 3-10 llamadas a herramientas.
Comparación directa: 2-4 subagentes, 10-15 llamadas cada uno.
Investigación compleja: más de 10 subagentes con responsabilidades separadas."""

async def investigar(consulta: str, memoria, llm) -> dict:
    plan = await llm.planificar(LIDER, consulta, reglas=REGLAS_ESFUERZO,
                                thinking=True)            # extended thinking
    memoria.guardar("plan", plan)     # sobrevive si el contexto (>200k tokens) se trunca
    hallazgos = []
    for _ in range(MAX_RONDAS):
        lote = plan.subtareas[:MAX_SUBAGENTES]
        resultados = await asyncio.gather(          # lote síncrono: espera a todos
            *[subagente(t, llm) for t in lote])
        hallazgos += resultados                      # solo lo condensado, no el historial
        plan = await llm.evaluar(LIDER, plan, hallazgos)
        if not plan.necesita_otra_ronda:
            break
    borrador = await llm.sintetizar(LIDER, consulta, hallazgos)
    fuentes = [f for h in hallazgos for f in h["fuentes"]]
    return await citation_agent(borrador, documentos=fuentes)   # atribuye cada afirmación

async def subagente(t, llm) -> dict:
    contrato = {                                     # sin esto: trabajo duplicado y huecos
        "objetivo": t.objetivo,
        "formato_salida": "hallazgos (máx. 250 palabras), URL de cada fuente y vacíos",
        "herramientas_y_fuentes": t.fuentes_sugeridas,
        "limites": {"llamadas_max": t.presupuesto, "fuera_de_alcance": t.excluir},
    }
    return await llm.agente(TRABAJADOR, tarea=contrato,     # contexto propio y limpio
                            tools=t.herramientas,
                            interleaved_thinking=True)      # evalúa cada resultado`

// Bloque literal de la sección "Cómo aplicarlo: un ejemplo con ADK" de la página.
const ADK_AGENT = `import os
from google.adk.agents.llm_agent import LlmAgent
from google.adk.agents.parallel_agent import ParallelAgent
from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.models.lite_llm import LiteLlm
from herramientas import buscar_web, buscar_informes_internos   # FunctionTools propias

def via_gateway(alias: str) -> LiteLlm:
    # Cada alias del gateway apunta a un modelo de Bedrock y tiene su propio presupuesto
    return LiteLlm(model=f"litellm_proxy/{alias}", api_base=os.environ["AI_GATEWAY_URL"],
                   api_key=os.environ["AI_GATEWAY_KEY"])

TRABAJADOR, LIDER = via_gateway("claude-sonnet"), via_gateway("claude-opus")
CONTRATO = (" Devuelve como máximo 250 palabras: hallazgos, URL de cada fuente y vacíos. "
            "Haz entre 3 y 10 búsquedas: empieza con consultas amplias y luego acota.")

regulacion = LlmAgent(name="regulacion", model=TRABAJADOR, tools=[buscar_web],
    output_key="hallazgos_regulacion",
    instruction="Investiga requisitos regulatorios para abrir tiendas de retail en Perú." + CONTRATO)
competencia = LlmAgent(name="competencia", model=TRABAJADOR, tools=[buscar_web],
    output_key="hallazgos_competencia",
    instruction="Mapea a los 5 principales competidores de retail de conveniencia en Lima." + CONTRATO)
interno = LlmAgent(name="interno", model=TRABAJADOR, tools=[buscar_informes_internos],
    output_key="hallazgos_internos",
    instruction="Resume aprendizajes de nuestras aperturas en Chile y Colombia." + CONTRATO)

investigacion = ParallelAgent(name="investigacion", sub_agents=[regulacion, competencia, interno])
sintesis = LlmAgent(name="sintesis", model=LIDER,
    instruction="Redacta un informe de entrada al mercado con estos hallazgos:\\n"
                "{hallazgos_regulacion}\\n{hallazgos_competencia}\\n{hallazgos_internos}\\n"
                "Cita la URL de cada afirmación y señala contradicciones entre fuentes.")
root_agent = SequentialAgent(name="informe_mercado", sub_agents=[investigacion, sintesis])`

const CONSULTA = '¿Conviene entrar al mercado peruano con nuestro formato de tienda de conveniencia?'

export const cimAnthropicFlujo: IsoSpec = {
  id: 'cim-anthropic-flujo',
  title: 'Anthropic Research: orquestador y subagentes en paralelo',
  summary:
    'Reconstrucción simplificada a partir del post de ingeniería de Anthropic (13-06-2025). Un **agente líder** (Claude Opus 4 en ese momento) planifica, guarda el plan en memoria y lanza **subagentes** (Claude Sonnet 4) que buscan en paralelo con su propio contexto. Al final, un **CitationAgent** atribuye cada afirmación a su fuente. La secuencia muestra el intercambio en orden. `lider.py` es **ilustrativo del patrón** (Anthropic no publicó su código) y la consulta es el ejemplo de retail de esta página; `investigacion/agent.py` es el bloque de ADK de la página.',
  height: 520,
  layout: 'sequence',
  lanes: ['usuario', 'lider', 'memoria', 'sub1', 'sub2', 'sub3', 'tools', 'citas'],
  nodes: [
    { id: 'usuario', label: 'Usuario', sub: 'consulta abierta', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Una pregunta de investigación sin camino fijo: comparar opciones, mapear un mercado, revisar literatura. El número de pasos no se puede definir de antemano.' },
    { id: 'lider', label: 'Agente líder', sub: 'LeadResearcher · Opus 4', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'workflow', info: 'Analiza la consulta con *extended thinking*, decide la estrategia, cuántos subagentes lanzar y con qué rol, y al final sintetiza. Puede lanzar una segunda ronda si falta información.' },
    { id: 'memoria', label: 'Memoria del plan', sub: 'sobrevive al truncado', at: [3.4, -3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'El líder persiste su plan porque, pasados los 200.000 tokens, el contexto se trunca. Si se acerca al límite, puede retomar el plan desde aquí con un contexto limpio.' },
    { id: 'sub1', label: 'Subagente 1', sub: 'Sonnet 4 · contexto propio', at: [7, -3.4], shape: 'tall', tone: 'agent', icon: 'search', scale: 0.85, info: 'Recibe un objetivo, un formato de salida, guía sobre fuentes y herramientas, y límites claros. Investiga de forma iterativa y devuelve solo lo esencial.' },
    { id: 'sub2', label: 'Subagente 2', sub: 'Sonnet 4 · contexto propio', at: [7, 0], shape: 'tall', tone: 'agent', icon: 'search', scale: 0.85, info: 'Corre en paralelo con los demás. Usa *interleaved thinking* después de cada resultado para evaluar calidad y ajustar la siguiente búsqueda.' },
    { id: 'sub3', label: 'Subagente 3', sub: 'Sonnet 4 · contexto propio', at: [7, 3.4], shape: 'tall', tone: 'agent', icon: 'search', scale: 0.85, info: 'El post reporta 3–5 subagentes en paralelo para consultas complejas, y más de 10 solo en investigaciones muy amplias.' },
    { id: 'tools', label: 'Herramientas', sub: 'búsqueda web · MCP', at: [10.4, 0], shape: 'cloud', tone: 'tool', icon: 'globe', info: 'Búsqueda web, Google Workspace e integraciones. Cada subagente llama 3 o más herramientas en paralelo. Las descripciones de herramientas reescritas por un agente redujeron el tiempo de tarea un 40 %.' },
    { id: 'citas', label: 'CitationAgent', sub: 'atribuye cada afirmación', at: [3.4, 3.4], shape: 'box', tone: 'guard', icon: 'link', info: 'Recibe el informe y los documentos recopilados, y ubica dónde va cada cita. Separar esta tarea mejora la trazabilidad sin cargar al líder.' },
  ],
  edges: [
    { from: 'usuario', to: 'lider' },
    { from: 'lider', to: 'memoria', route: 'z', label: 'plan' },
    { from: 'lider', to: 'sub1' },
    { from: 'lider', to: 'sub2' },
    { from: 'lider', to: 'sub3' },
    { from: 'sub1', to: 'tools' },
    { from: 'sub2', to: 'tools' },
    { from: 'sub3', to: 'tools' },
    { from: 'lider', to: 'citas', route: 'z' },
    { from: 'citas', to: 'usuario', route: 'z' },
  ],
  code: {
    lider: { title: 'lider.py (ilustrativo del patrón)', lang: 'python', source: LIDER },
    adk: { title: 'investigacion/agent.py', lang: 'python', source: ADK_AGENT },
  },
  steps: [
    {
      title: '1 · Consulta y estrategia',
      body: 'El líder recibe la consulta y planifica con *extended thinking*: qué tan compleja es, cuántos subagentes lanzar y qué rol tendrá cada uno, según **reglas de esfuerzo escritas en el prompt** (un fallo temprano fue lanzar 50 subagentes para preguntas simples).',
      flows: ['usuario>lider: consulta'],
      data: { title: 'messages del líder', messages: [{ role: 'user', content: CONSULTA }], newFrom: 0 },
      code: { file: 'lider', hl: ['REGLAS_ESFUERZO = ', 'llm.planificar(', 'thinking=True'] },
    },
    {
      title: '2 · Plan persistente',
      body: 'El plan se guarda en memoria externa. Si el contexto supera los 200.000 tokens y se trunca, el líder lo recupera desde ahí en vez de perderlo.',
      flows: ['lider>memoria: guardar plan'],
      data: {
        title: 'plan guardado en memoria (forma ilustrativa)',
        lang: 'json',
        content: json({
          consulta: CONSULTA,
          tipo: 'comparación con varias facetas',
          regla_aplicada: '2-4 subagentes, 10-15 llamadas cada uno',
          subtareas: [
            { id: 'sub1', objetivo: 'Requisitos regulatorios para abrir tiendas en Perú' },
            { id: 'sub2', objetivo: 'Mapa de los 5 principales competidores de conveniencia en Lima' },
            { id: 'sub3', objetivo: 'Aprendizajes de nuestras aperturas en Chile y Colombia' },
          ],
          criterio_de_cierre: 'las tres facetas con fuentes; contradicciones señaladas',
        }),
        hl: ['"regla_aplicada"', '"subtareas"'],
      },
      code: { file: 'lider', hl: ['memoria.guardar("plan", plan)'] },
    },
    {
      title: '3 · Delegación en paralelo',
      body: 'El líder lanza los subagentes a la vez. Cada uno recibe **objetivo, formato de salida, guía de herramientas y fuentes, y límites**: con instrucciones vagas ("investiga X") duplicaban búsquedas o dejaban huecos.',
      flows: ['lider>sub1: tarea', 'lider>sub2: tarea', 'lider>sub3: tarea'],
      data: {
        title: 'contrato de delegación del subagente 1 (ilustrativo)',
        lang: 'json',
        content: json({
          objetivo: 'Requisitos regulatorios para abrir tiendas de retail de conveniencia en Perú',
          formato_salida: 'hallazgos (máx. 250 palabras), URL de cada fuente y vacíos',
          herramientas_y_fuentes: ['web_search', 'web_fetch', 'priorizar sitios oficiales del Estado sobre blogs y granjas SEO'],
          limites: { llamadas_max: 15, fuera_de_alcance: ['competencia', 'datos internos'] },
        }),
        hl: ['"objetivo"', '"formato_salida"', '"herramientas_y_fuentes"', '"limites"'],
      },
      code: { file: 'lider', hl: ['asyncio.gather(', 'contrato = {', '"objetivo"', '"formato_salida"', '"limites"'] },
    },
    {
      title: '4 · Búsqueda amplia, luego estrecha',
      body: 'Cada subagente empieza con **consultas cortas y amplias**, evalúa lo que obtiene con *interleaved thinking* y acota. Llama varias herramientas en paralelo dentro de su propio contexto.',
      flows: ['sub1>tools: web_search ×2', 'sub2>tools: web_search', 'sub3>tools: búsqueda interna'],
      data: {
        title: 'contexto del subagente 1 (ilustrativo)',
        messages: [
          { role: 'user', note: 'contrato del líder', content: 'Objetivo: requisitos regulatorios para abrir tiendas de conveniencia en Perú. Formato: máx. 250 palabras, URL por fuente, vacíos. Límite: 15 llamadas.' },
          {
            role: 'assistant',
            note: 'dos búsquedas amplias en paralelo',
            content: [
              { type: 'tool_use', id: 'toolu_11', name: 'web_search', input: { query: 'licencia de funcionamiento tienda Lima' } },
              { type: 'tool_use', id: 'toolu_12', name: 'web_search', input: { query: 'requisitos apertura retail Perú' } },
            ],
          },
          {
            role: 'user',
            note: 'resultados (resumidos)',
            content: [
              { type: 'tool_result', tool_use_id: 'toolu_11', content: '8 resultados: 2 portales oficiales, 6 blogs de trámites' },
              { type: 'tool_result', tool_use_id: 'toolu_12', content: '10 resultados: guías de consultoras y notas de prensa' },
            ],
          },
          { role: 'assistant', note: 'acota', content: [{ type: 'tool_use', id: 'toolu_13', name: 'web_fetch', input: { url: 'https://www.gob.pe/…' } }] },
        ],
        hl: [1, 3],
        newFrom: 1,
      },
      code: { file: 'lider', hl: ['tools=t.herramientas', 'interleaved_thinking=True'] },
    },
    {
      title: '5 · Compresión y síntesis',
      body: 'Los subagentes devuelven **hallazgos condensados**, no su historial: funcionan como compresores. El líder los evalúa y decide si basta o si lanza otra ronda.',
      flows: ['sub1>lider: hallazgos', 'sub2>lider: hallazgos', 'sub3>lider: hallazgos'],
      data: {
        title: 'resultado comprimido del subagente 1 (ilustrativo)',
        lang: 'json',
        content: json({
          subagente: 'sub1',
          hallazgos: 'Se requiere licencia municipal de funcionamiento y certificado de defensa civil; los plazos varían por distrito… (≤ 250 palabras)',
          fuentes: ['https://www.gob.pe/…', 'https://www.munlima.gob.pe/…'],
          vacios: ['No encontré requisitos específicos para venta de alcohol 24 h'],
          llamadas_usadas: 9,
        }),
        hl: ['"hallazgos"', '"vacios"'],
      },
      code: { file: 'lider', hl: ['hallazgos += resultados', 'llm.evaluar(', 'necesita_otra_ronda'] },
    },
    {
      title: '6 · Citas',
      body: 'El líder sintetiza un borrador y lo pasa, junto con los documentos recopilados, al **CitationAgent**, que ubica dónde va cada cita para que toda afirmación tenga fuente.',
      flows: ['lider>citas: borrador + documentos'],
      data: {
        title: 'salida del CitationAgent (forma ilustrativa)',
        lang: 'json',
        content: json({
          afirmaciones: [
            { texto: 'Cada local necesita licencia municipal de funcionamiento.', fuente: 'https://www.gob.pe/…', fragmento: '«…la licencia de funcionamiento es otorgada por la municipalidad…»' },
            { texto: 'En Chile, el ticket promedio cayó en los primeros 6 meses.', fuente: 'drive://informes/apertura-cl-2024.pdf', fragmento: '«…ticket promedio…»' },
          ],
          sin_fuente: [],
        }),
        hl: ['"fuente"', '"sin_fuente"'],
      },
      code: { file: 'lider', hl: ['llm.sintetizar(', 'citation_agent(borrador'] },
    },
    {
      title: '7 · Entrega',
      body: 'El usuario recibe el informe con citas. Según Anthropic, un sistema multiagente consume del orden de **15× los tokens** de un chat: solo se paga si el valor de la respuesta lo justifica.',
      flows: ['citas>usuario: informe con citas'],
      data: {
        title: 'informe final (extracto ilustrativo)',
        lang: 'text',
        content: `Entrada a Perú: recomendación preliminar

1. Regulación: cada local requiere licencia municipal de funcionamiento [1]
   y certificado de defensa civil [2]. Vacío: venta de alcohol 24 h.
2. Competencia: …
3. Aprendizajes internos: en Chile el ticket promedio cayó al inicio [3].

Contradicciones entre fuentes: plazos de licencia (15 vs. 30 días) [1][4].

[1] https://www.gob.pe/…  [2] …  [3] drive://informes/apertura-cl-2024.pdf`,
        hl: ['Contradicciones', '[1] https'],
      },
    },
    {
      title: '8 · El mismo patrón en ADK',
      body: 'En la página, el patrón se aproxima con un `ParallelAgent` de tres investigadores y un sintetizador. Diferencia clave: aquí el **fan-out es estático** (subagentes fijos al definir el agente); el líder de Anthropic decide en tiempo de ejecución cuántos lanzar.',
      focus: ['lider', 'sub1', 'sub2', 'sub3'],
      code: { file: 'adk', hl: ['CONTRATO = (', 'output_key="hallazgos_regulacion"', 'ParallelAgent(name="investigacion"', 'sintesis = LlmAgent', 'SequentialAgent('] },
    },
  ],
}

/* ─────────────────────────── Anthropic: producción ─────────────────────────── */

const DURABLE = `# runtime_durable.py (ilustrativo del patrón; Anthropic no publicó su código)
import time
from opentelemetry import trace

tracer = trace.get_tracer("research")

def ejecutar_sesion(sesion_id: str, store, agente):
    # Reanudar desde el último checkpoint, no reiniciar la investigación
    estado = store.ultimo_checkpoint(sesion_id) or agente.estado_inicial()
    while not estado.terminado:
        with tracer.start_as_current_span("paso_agente") as span:
            accion = agente.siguiente_accion(estado)
            span.set_attribute("decision.tipo", accion.tipo)          # qué decidió…
            span.set_attribute("subagentes.lanzados", accion.n_subagentes)
            # …pero nunca el contenido de la conversación (privacidad)
            if accion.es_tool:
                resultado = llamar_tool_con_reintentos(accion)
            else:
                resultado = agente.ejecutar(accion)
            estado = estado.aplicar(resultado)
            store.guardar_checkpoint(sesion_id, estado)    # plan, hallazgos, avance

def llamar_tool_con_reintentos(accion, intentos=3):
    for i in range(intentos):                              # reintento determinista
        try:
            return accion.tool.run(**accion.args)
        except (TimeoutError, ConnectionError):
            time.sleep(2 ** i)
    return {"is_error": True,                              # y luego: avisar al modelo
            "content": f"{accion.tool.nombre} no responde tras {intentos} intentos. "
                       "Prueba otra herramienta u otra fuente."}

def entregar_resultado(subagente, texto_largo: str, fs) -> dict:
    ruta = fs.escribir(f"artefactos/{subagente.sesion}/{subagente.nombre}.md", texto_largo)
    return {"artefacto": ruta,                             # referencia liviana
            "resumen": subagente.resumir(texto_largo, max_palabras=120)}`

const JUEZ = `# juez.py (ilustrativo: rúbrica de 5 criterios en una sola llamada)
RUBRICA = """Evalúa el informe frente a la consulta y sus fuentes. Criterios:
1. Precisión factual   2. Precisión de citas   3. Completitud
4. Calidad de fuentes  5. Eficiencia en el uso de herramientas
Devuelve JSON: {"puntaje": 0.0-1.0, "aprobado": true|false, "motivo": "..."}"""

def evaluar(caso, informe, traza, llm) -> dict:
    # Se evalúa el resultado final, no el camino: hay muchas rutas válidas.
    return llm.json(modelo="juez", system=RUBRICA,
                    user={"consulta": caso.consulta, "informe": informe.texto,
                          "fuentes": informe.fuentes, "llamadas_tools": traza.n_tools})

def correr_suite(casos, sistema, llm) -> float:     # empezaron con ~20 consultas reales
    resultados = [evaluar(c, *sistema.run(c), llm) for c in casos]
    return sum(r["aprobado"] for r in resultados) / len(resultados)
    # los humanos siguen revisando: alucinaciones raras y sesgo de fuentes`

export const cimAnthropicProduccion: IsoSpec = {
  id: 'cim-anthropic-produccion',
  title: 'Anthropic Research: lo que hizo falta para producción',
  summary:
    'Reconstrucción de las prácticas de producción descritas por Anthropic (no es un diagrama publicado por la empresa): **rainbow deployments** para no cortar sesiones largas, **checkpoints** y reanudación ante fallos, **artefactos** fuera del contexto, tracing sin leer conversaciones y evaluación con **LLM-judge** más revisión humana. El código y los payloads son **ilustrativos del patrón**: Anthropic describió las prácticas, no su implementación.',
  height: 480,
  nodes: [
    { id: 'trafico', label: 'Sesiones en curso', sub: 'agentes a mitad de tarea', at: [0, 0], shape: 'box', tone: 'infra', icon: 'users', info: 'Un agente de investigación puede estar trabajando minutos cuando sale una versión nueva. Cortarlo significa perder todo el trabajo hecho.' },
    { id: 'rainbow', label: 'Rainbow deploy', sub: 'versión vieja y nueva', at: [3.4, 0], shape: 'diamond', tone: 'gateway', icon: 'split', info: 'Las dos versiones corren a la vez y el tráfico pasa gradualmente a la nueva. Las sesiones que empezaron en la vieja terminan ahí.' },
    { id: 'agente', label: 'Sistema de agentes', sub: 'líder + subagentes', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'workflow', info: 'Agentes con estado que corren por largo tiempo. Un error pequeño se compone a lo largo de muchos pasos.' },
    { id: 'checkpoint', label: 'Checkpoints', sub: 'ejecución durable', at: [6.8, -3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'El estado se guarda en puntos de control. Ante un fallo, el sistema se reanuda desde donde estaba en vez de reiniciar la investigación.' },
    { id: 'tool', label: 'Herramienta', sub: 'puede fallar', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Búsquedas que expiran, APIs que devuelven error, contenido inaccesible.' },
    { id: 'reintento', label: 'Reintento', sub: 'determinista + aviso', at: [10.2, -3.4], shape: 'diamond', tone: 'guard', icon: 'repeat', info: 'Anthropic combina reintentos deterministas con la adaptabilidad del modelo: se le informa que la herramienta falla para que cambie de enfoque.' },
    { id: 'artefactos', label: 'Artefactos', sub: 'sistema de archivos', at: [10.2, 3.4], shape: 'stack', tone: 'data', icon: 'layers', info: 'Los subagentes pueden escribir resultados fuera del contexto y pasar solo una referencia liviana al coordinador: menos tokens y menos pérdida por "teléfono roto".' },
    { id: 'traza', label: 'Tracing', sub: 'decisiones, no contenido', at: [6.8, 3.4], shape: 'box', tone: 'infra', icon: 'eye', info: 'Trazas completas en producción con monitoreo de patrones de decisión e interacción entre agentes, sin monitorear el contenido de las conversaciones (privacidad).' },
    { id: 'evals', label: 'Evaluación', sub: 'LLM-judge + humanos', at: [3.4, 3.4], shape: 'box', tone: 'guard', icon: 'check', info: 'Un juez LLM con rúbrica (precisión factual, citas, completitud, calidad de fuentes, eficiencia de herramientas) y evaluadores humanos que detectan casos raros.' },
  ],
  edges: [
    { from: 'trafico', to: 'rainbow' },
    { from: 'rainbow', to: 'agente' },
    { from: 'agente', to: 'checkpoint', route: 'z' },
    { from: 'agente', to: 'tool' },
    { from: 'tool', to: 'reintento', route: 'z' },
    { from: 'agente', to: 'artefactos', route: 'arc' },
    { from: 'agente', to: 'traza', route: 'z', dashed: true },
    { from: 'traza', to: 'evals' },
  ],
  code: {
    durable: { title: 'runtime_durable.py (ilustrativo del patrón)', lang: 'python', source: DURABLE },
    juez: { title: 'juez.py (ilustrativo del patrón)', lang: 'python', source: JUEZ },
  },
  steps: [
    {
      title: '1 · Desplegar sin cortar sesiones',
      body: 'Con **rainbow deployments** la versión nueva convive con la anterior y el tráfico nuevo se mueve de a poco. Las investigaciones que empezaron en la versión vieja terminan ahí.',
      flows: ['trafico>rainbow', 'rainbow>agente'],
      data: {
        title: 'estado del despliegue (forma ilustrativa, valores de ejemplo)',
        lang: 'yaml',
        content: `versiones:
  - id: v41                 # anterior
    sesiones_nuevas: 20%
    sesiones_en_curso: 312  # siguen aquí hasta terminar
  - id: v42                 # nueva
    sesiones_nuevas: 80%
    sesiones_en_curso: 1045
regla: una sesión nunca cambia de versión a mitad de tarea
retiro_v41: cuando sesiones_en_curso llegue a 0`,
        hl: ['sesiones_en_curso: 312', 'regla:'],
      },
    },
    {
      title: '2 · Guardar estado',
      body: 'Durante la ejecución, el sistema registra **checkpoints**: plan, hallazgos y avance. Es lo que permite reanudar en vez de reiniciar.',
      flows: ['agente>checkpoint'],
      data: {
        title: 'checkpoint (forma ilustrativa)',
        lang: 'json',
        content: json({
          sesion: 'res_8f2a',
          version: 'v42',
          paso: 14,
          plan_ref: 'memoria://res_8f2a/plan',
          subagentes: { completados: ['sub1', 'sub3'], pendientes: ['sub2'] },
          hallazgos_refs: ['artefactos/res_8f2a/sub1.md', 'artefactos/res_8f2a/sub3.md'],
        }),
        hl: ['"paso"', '"pendientes"'],
      },
      code: { file: 'durable', hl: ['store.guardar_checkpoint', 'store.ultimo_checkpoint'] },
    },
    {
      title: '3 · Falla una herramienta',
      body: 'Primero, **reintento determinista**. Si persiste, se le avisa al agente con un `tool_result` de error para que adapte la estrategia. Si el proceso cae, se **reanuda desde el último checkpoint**.',
      flows: ['agente>tool', 'tool>reintento', 'checkpoint>agente'],
      data: {
        title: 'lo que ve el subagente tras 3 reintentos (ilustrativo)',
        messages: [
          { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_31', name: 'web_fetch', input: { url: 'https://portal-lento.example/informe' } }] },
          {
            role: 'user',
            note: 'aviso al modelo',
            content: [{ type: 'tool_result', tool_use_id: 'toolu_31', is_error: true, content: 'web_fetch no responde tras 3 intentos. Prueba otra herramienta u otra fuente.' }],
          },
          { role: 'assistant', note: 'cambia de enfoque', content: [{ type: 'tool_use', id: 'toolu_32', name: 'web_search', input: { query: 'informe sector retail Perú 2025 resumen' } }] },
        ],
        hl: [1],
      },
      code: { file: 'durable', hl: ['def llamar_tool_con_reintentos', 'time.sleep(2 ** i)', '"is_error": True', 'Prueba otra herramienta'] },
    },
    {
      title: '4 · Resultados fuera del contexto',
      body: 'Los subagentes escriben salidas largas como **artefactos** en un sistema de archivos y pasan una referencia liviana: el coordinador no paga tokens por copiar todo ni pierde detalle por "teléfono roto".',
      flows: ['agente>artefactos'],
      data: {
        title: 'lo que recibe el coordinador (ilustrativo)',
        lang: 'json',
        content: json({
          artefacto: 'artefactos/res_8f2a/sub2.md',
          resumen: 'Cinco competidores principales; dos con más de 300 locales en Lima… (≤ 120 palabras)',
          tamano_artefacto: '≈ 9.000 palabras (no entra al contexto del líder)',
        }),
        hl: ['"artefacto"', 'no entra al contexto'],
      },
      code: { file: 'durable', hl: ['def entregar_resultado', 'fs.escribir(', '"artefacto": ruta'] },
    },
    {
      title: '5 · Tracing',
      body: 'Trazas completas para depurar fallos no deterministas: qué decidió el líder, cuántos subagentes lanzó, qué herramientas usaron. Se monitorean **patrones de decisión**, no el contenido de las conversaciones.',
      flows: ['agente>traza'],
      data: {
        title: 'span de un paso (ilustrativo)',
        lang: 'json',
        content: json({
          name: 'paso_agente',
          attributes: {
            'decision.tipo': 'lanzar_subagentes',
            'subagentes.lanzados': 3,
            'tools.llamadas': 27,
            'tools.errores': 1,
          },
          contenido_conversacion: 'no registrado',
        }),
        hl: ['"decision.tipo"', '"contenido_conversacion"'],
      },
      code: { file: 'durable', hl: ['tracer.start_as_current_span', 'span.set_attribute("decision.tipo"', 'nunca el contenido'] },
    },
    {
      title: '6 · Evaluar resultados',
      body: 'Empezaron con unas **20 consultas reales**. Lo más alineado con humanos fue una sola llamada a un juez LLM que devuelve un puntaje de 0,0 a 1,0 y pass/fail; los humanos revisan lo que la automatización no ve.',
      flows: ['traza>evals'],
      data: {
        title: 'veredicto del juez para un caso (ilustrativo)',
        lang: 'json',
        content: json({
          caso: 'consulta-07',
          puntaje: 0.72,
          aprobado: false,
          motivo: 'Completitud baja: falta la faceta regulatoria; 2 citas apuntan a fuentes SEO de baja calidad.',
        }),
        hl: ['"puntaje"', '"aprobado"'],
      },
      code: { file: 'juez', hl: ['RUBRICA = ', 'Precisión factual', 'resultado final, no el camino', '~20 consultas reales'] },
    },
  ],
}

/* ─────────────────────────── LinkedIn Hiring Assistant ─────────────────────────── */

const LI_SUPERVISOR = `# supervisor.py (ilustrativo del patrón plan-and-execute; no es código de LinkedIn)
# Sub-agentes modelados como HERRAMIENTAS: sin identidad ni buzón propios.
HERRAMIENTAS = [intake, sourcing, evaluacion, outreach, screening, learning,
                memoria_cognitiva]
REQUIERE_APROBACION = {
    "intake.calificaciones",          # antes de evaluar candidatos
    "evaluacion.decision_final",      # la decisión sobre cada candidato es humana
    "learning.cambio_calificaciones", # lo que aprende el agente
}

def al_recibir_mensaje(msg, instancia):            # lo despierta el buzón, no un HTTP abierto
    contexto = memoria_cognitiva.leer(reclutador=instancia.reclutador_id)
    plan = planner.generar(objetivo=msg.texto, contexto=contexto)  # plan estructurado
    for paso in plan.pendientes():
        resultado = executor.react(paso, tools=HERRAMIENTAS)       # bucle ReAct por paso
        plan.marcar(paso, resultado)
        if paso.salida in REQUIERE_APROBACION:
            instancia.pedir_aprobacion(paso, resultado)   # aparece en Recruiter
            return                                       # sigue con el próximo mensaje
        instancia.publicar(resultado)                    # pub-sub → UI en tiempo real

def al_aprobar(msg, instancia):
    plan = instancia.plan_actual()
    plan.aprobar(msg.paso, msg.cambios)                  # el reclutador puede editar
    al_recibir_mensaje(msg, instancia)                   # retoma donde quedó`

export const cimLinkedin: IsoSpec = {
  id: 'cim-linkedin',
  title: 'LinkedIn Hiring Assistant: supervisor y sub-agentes como herramientas',
  summary:
    'Reconstrucción a partir del post de ingeniería de LinkedIn (21-10-2025). Cada reclutador tiene **su propia instancia** con buzón, sobre una plataforma de mensajería asíncrona. Un **supervisor** plan-and-execute coordina sub-agentes que LinkedIn modela **como herramientas**, no como agentes con identidad propia. La posición de cada nodo, el código y los payloads son **ilustrativos del patrón**: LinkedIn no publicó su implementación.',
  height: 500,
  nodes: [
    { id: 'reclutador', label: 'Reclutador', sub: 'SDK en Recruiter', at: [-0.5, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Interactúa desde el producto Recruiter. La UI se actualiza en tiempo real por un canal pub-sub y puede ser dirigida por el agente (GraphQL con view models).' },
    { id: 'plataforma', label: 'Buzón del agente', sub: 'plataforma async', at: [2.9, 0], shape: 'hex', tone: 'protocol', icon: 'mail', info: 'Cada instancia de Hiring Assistant tiene identidad y buzón propios. Su ciclo de vida lo guía el paso de mensajes asíncrono, no una petición HTTP larga.' },
    { id: 'supervisor', label: 'Supervisor', sub: 'planner + executor', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'workflow', info: 'Todo pasa por él: enruta tareas, gestiona el workflow, observa cambios del entorno y presenta las tareas que requieren aprobación. Patrón plan-and-execute: un planner genera el plan y un executor lo ejecuta con un bucle ReAct.' },
    { id: 'memoria', label: 'Memoria cognitiva', sub: 'por reclutador', at: [6.8, -3.4], shape: 'cylinder', tone: 'memory', icon: 'brain', info: 'Memoria persistente y acotada al entorno de cada reclutador. LinkedIn afirma que no se usa para entrenar LLMs.' },
    { id: 'intake', label: 'Intake', sub: 'requisitos del cargo', at: [10.2, -3.4], shape: 'box', tone: 'agent', icon: 'list', info: 'Recoge y refina los requisitos de la vacante y genera las calificaciones del rol, que el reclutador aprueba antes de evaluar candidatos.' },
    { id: 'sourcing', label: 'Sourcing', sub: 'Recruiter Search', at: [10.2, 0], shape: 'box', tone: 'agent', icon: 'search', info: 'Genera y ejecuta búsquedas con Recruiter Search y Recommended Matches, y las refina según su rendimiento.' },
    { id: 'evaluacion', label: 'Evaluación', sub: 'LLM afinado propio', at: [10.2, 3.4], shape: 'box', tone: 'agent', icon: 'check', info: 'Compara candidatos con las calificaciones y produce recomendaciones estructuradas con evidencia. Usa LLMs propios afinados y speculative decoding para tardar segundos por candidato.' },
    { id: 'perfiles', label: 'Perfiles', sub: '1.200+ millones', at: [13.6, 0], shape: 'stack', tone: 'data', icon: 'users', info: 'Base de sourcing y evaluación, con jobs de fondo sobre millones de perfiles y refresco diario (cifras de LinkedIn, oct 2025).' },
    { id: 'outreach', label: 'Outreach + screening', sub: 'mensajes y entrevistas', at: [6.8, 3.4], shape: 'box', tone: 'agent', icon: 'message', info: 'Envía mensajes y seguimientos, responde preguntas de candidatos, agenda y resume entrevistas telefónicas. El reclutador puede tomar el control en cualquier momento.' },
    { id: 'learning', label: 'Learning', sub: 'aprende del feedback', at: [3.4, -3.4], shape: 'box', tone: 'agent', icon: 'graduation', info: 'Aprende de las acciones y comentarios del reclutador. Sus cambios a las calificaciones solo se aplican tras aprobación.' },
    { id: 'aprobacion', label: 'Aprobación', sub: 'decide el reclutador', at: [3.4, 3.4], shape: 'diamond', tone: 'guard', icon: 'hand', info: 'Aprobación de calificaciones antes de evaluar, decisión final sobre cada candidato y aprobación de los cambios que propone el learning agent.' },
  ],
  edges: [
    { from: 'reclutador', to: 'plataforma' },
    { from: 'plataforma', to: 'supervisor' },
    { from: 'supervisor', to: 'memoria', route: 'z' },
    { from: 'supervisor', to: 'intake', route: 'arc' },
    { from: 'supervisor', to: 'sourcing' },
    { from: 'supervisor', to: 'evaluacion', route: 'arc' },
    { from: 'sourcing', to: 'perfiles' },
    { from: 'evaluacion', to: 'perfiles' },
    { from: 'supervisor', to: 'outreach', route: 'z' },
    { from: 'supervisor', to: 'learning', route: 'arc' },
    { from: 'supervisor', to: 'aprobacion', route: 'arc' },
    { from: 'aprobacion', to: 'reclutador' },
  ],
  code: { supervisor: { title: 'supervisor.py (ilustrativo del patrón)', lang: 'python', source: LI_SUPERVISOR } },
  steps: [
    {
      title: '1 · Una instancia por reclutador',
      body: 'El pedido llega como **mensaje** al buzón de la instancia del reclutador. La plataforma despierta al supervisor; nada depende de una conexión abierta, así el agente puede trabajar días en una vacante.',
      flows: ['reclutador>plataforma', 'plataforma>supervisor'],
      data: {
        title: 'mensaje al buzón de la instancia (forma ilustrativa)',
        lang: 'json',
        content: json({
          buzon: 'hiring-assistant/reclutador-8812',
          tipo: 'nueva_tarea',
          vacante: '3301',
          texto: 'Necesito 20 candidatos para ingeniería de datos senior en Santiago, híbrido.',
        }),
        hl: ['"buzon"'],
      },
      code: { hl: ['def al_recibir_mensaje', 'lo despierta el buzón'] },
    },
    {
      title: '2 · Plan con contexto',
      body: 'El *planner* arma un plan estructurado para la tarea y consulta la **memoria cognitiva** del reclutador (preferencias, historial). LinkedIn eligió plan-and-execute sobre ReAct puro por seguimiento de instrucciones, control de alucinaciones y costo/latencia.',
      flows: ['supervisor>memoria'],
      data: {
        title: 'plan estructurado (forma ilustrativa)',
        lang: 'json',
        content: json({
          contexto_memoria: ['prefiere experiencia con Spark', 'descarta perfiles sin inglés'],
          pasos: [
            { id: 1, tool: 'intake', salida: 'intake.calificaciones' },
            { id: 2, tool: 'sourcing', depende_de: [1] },
            { id: 3, tool: 'evaluacion', depende_de: [2] },
            { id: 4, tool: 'outreach', depende_de: [3] },
          ],
        }),
        hl: ['"contexto_memoria"', '"pasos"'],
      },
      code: { hl: ['memoria_cognitiva.leer', 'planner.generar('] },
    },
    {
      title: '3 · Intake y aprobación',
      body: 'Intake genera las calificaciones del rol. El supervisor las presenta y el reclutador las **aprueba (o edita) antes de evaluar** a nadie. La instancia queda esperando el próximo mensaje.',
      flows: ['supervisor>intake', 'supervisor>aprobacion', 'aprobacion>reclutador'],
      data: {
        title: 'calificaciones pendientes de aprobación (ilustrativo)',
        lang: 'json',
        content: json({
          paso: 'intake.calificaciones',
          estado: 'pendiente_aprobacion',
          calificaciones: { obligatorias: ['5+ años en ingeniería de datos', 'Spark o Flink', 'inglés profesional'], deseables: ['experiencia en retail', 'Airflow'] },
        }),
        hl: ['"pendiente_aprobacion"'],
      },
      code: { hl: ['REQUIERE_APROBACION = {', '"intake.calificaciones"', 'instancia.pedir_aprobacion'] },
    },
    {
      title: '4 · Sourcing y evaluación',
      body: 'Con las calificaciones aprobadas, el *executor* llama a sourcing (Recruiter Search) y a evaluación, que puntúa candidatos **con evidencia** usando LLMs propios afinados.',
      flows: ['supervisor>sourcing', 'sourcing>perfiles', 'supervisor>evaluacion', 'evaluacion>perfiles'],
      data: {
        title: 'executor: sub-agentes como tools (ilustrativo)',
        messages: [
          { role: 'assistant', note: 'executor (ReAct)', content: [{ type: 'tool_use', id: 'toolu_41', name: 'sourcing', input: { vacante: '3301', filtros: { ubicacion: 'Santiago', habilidades: ['Spark'] } } }] },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_41', content: { candidatos: 64, busqueda_id: 'rs-7710' } }] },
          { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_42', name: 'evaluacion', input: { busqueda_id: 'rs-7710', calificaciones: 'aprobadas' } }] },
          {
            role: 'user',
            note: 'recomendación estructurada',
            content: [{ type: 'tool_result', tool_use_id: 'toolu_42', content: { candidato: 'c-1182', encaje: 'alto', evidencia: ['6 años con Spark', 'inglés C1'], faltantes: ['sin Airflow'] } }],
          },
        ],
        hl: [3],
      },
      code: { hl: ['HERRAMIENTAS = [', 'executor.react('] },
    },
    {
      title: '5 · Contacto y screening',
      body: 'Outreach redacta y hace seguimiento; screening prepara preguntas y resume conversaciones. La **decisión final sobre cada candidato** es del reclutador, que puede tomar el control cuando quiera.',
      flows: ['supervisor>outreach'],
      data: {
        title: 'borrador de outreach (ilustrativo)',
        lang: 'json',
        content: json({
          candidato: 'c-1182',
          canal: 'InMail',
          borrador: 'Hola, vi tu experiencia con Spark en logística…',
          seguimiento: 'en 4 días si no responde',
          control: 'el reclutador puede editar o tomar la conversación',
        }),
        hl: ['"control"'],
      },
      code: { hl: ['"evaluacion.decision_final"', 'instancia.publicar('] },
    },
    {
      title: '6 · Aprender con permiso',
      body: 'Learning propone ajustes a partir de lo que hace el reclutador (por ejemplo, a quién contacta). Los cambios a las calificaciones **solo se aplican con su aprobación**.',
      flows: ['supervisor>learning', 'supervisor>aprobacion'],
      data: {
        title: 'cambio propuesto por learning (ilustrativo)',
        lang: 'json',
        content: json({
          paso: 'learning.cambio_calificaciones',
          senal: 'contactaste 9 de 10 candidatos con Airflow',
          propuesta: { mover: 'Airflow', de: 'deseables', a: 'obligatorias' },
          estado: 'pendiente_aprobacion',
        }),
        hl: ['"senal"', '"propuesta"'],
      },
      code: { hl: ['"learning.cambio_calificaciones"', 'def al_aprobar', 'plan.aprobar('] },
    },
  ],
}

/* ─────────────────────────── Exa ─────────────────────────── */

const EXA_GRAFO = `# grafo.py (ilustrativo del patrón en LangGraph; Exa no publicó su código)
import operator
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

class Estado(TypedDict):
    consulta: str
    esquema: dict                                   # lo define el cliente en runtime
    tareas: list[dict]
    salidas: Annotated[list[dict], operator.add]    # salidas limpias de cada tarea
    razonamiento: Annotated[list[str], operator.add]   # solo lo lee el observer
    resultado: dict

def planner(e: Estado):
    return {"tareas": planificar(e["consulta"])}    # N tareas según la complejidad

def repartir(e: Estado):
    return [Send("tarea", {"tarea": t, "esquema": e["esquema"],
                           "previas": e.get("salidas", [])})   # nunca su razonamiento
            for t in e["tareas"]]

def tarea(s: dict):
    resultados = buscar_snippets(s["tarea"]["consulta"])       # snippets primero
    if not alcanza(resultados, s["tarea"]):
        resultados += leer_paginas(elegir_urls(resultados))    # página completa solo si falta
    salida, notas = extraer(s["tarea"], resultados, schema=s["esquema"])  # function calling
    return {"salidas": [salida], "razonamiento": [notas]}

def observer(e: Estado):                            # contexto completo: plan, razonamiento,
    return {"resultado": integrar(e)}               # salidas y citas

g = StateGraph(Estado)
g.add_node("planner", planner)
g.add_node("tarea", tarea)
g.add_node("observer", observer)
g.add_edge(START, "planner")
g.add_conditional_edges("planner", repartir, ["tarea"])
g.add_edge("tarea", "observer")
g.add_edge("observer", END)
app = g.compile()`

export const cimExa: IsoSpec = {
  id: 'cim-exa',
  title: 'Exa: planner, tareas paralelas y observer',
  summary:
    'Reconstrucción a partir del caso publicado por LangChain (30-06-2025). Un **planner** genera tantas tareas como pida la complejidad; cada **tarea** investiga con la API de Exa y devuelve JSON según un esquema; un **observer** mantiene el contexto completo. Las tareas solo ven las salidas limpias de otras, no su razonamiento. Exa usó **LangGraph**; el grafo y los payloads son **ilustrativos del patrón**, no su código.',
  height: 480,
  nodes: [
    { id: 'cliente', label: 'Cliente de API', sub: 'define el esquema JSON', at: [0, 0], shape: 'box', tone: 'user', icon: 'code', info: 'Exa diseñó el agente para consumidores de API, no para un chat: el formato de salida se define en tiempo de ejecución.' },
    { id: 'planner', label: 'Planner', sub: 'tareas según complejidad', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'split', info: 'Analiza la consulta y genera varias tareas paralelas. El número no es fijo: escala con la complejidad.' },
    { id: 'observer', label: 'Observer', sub: 'contexto completo', at: [3.4, -3.4], shape: 'tall', tone: 'agent', icon: 'eye', info: 'Ve todo: planificación, razonamiento, salidas y citas. Es el único con el panorama completo.' },
    { id: 't1', label: 'Tarea 1', sub: 'instrucción + esquema', at: [6.8, -3.4], shape: 'box', tone: 'agent', icon: 'search', info: 'Unidad de investigación independiente con instrucciones específicas, esquema JSON obligatorio y acceso a las herramientas de Exa.' },
    { id: 't2', label: 'Tarea 2', sub: 'instrucción + esquema', at: [6.8, 0], shape: 'box', tone: 'agent', icon: 'search', info: 'Recibe solo las salidas finales y limpias de otras tareas, no su razonamiento intermedio.' },
    { id: 't3', label: 'Tarea N', sub: 'instrucción + esquema', at: [6.8, 3.4], shape: 'box', tone: 'agent', icon: 'search', info: 'Las tareas corren en paralelo; su cantidad depende de la consulta.' },
    { id: 'exa', label: 'API de Exa', sub: 'snippets → página', at: [10.2, 0], shape: 'cloud', tone: 'tool', icon: 'globe', info: 'Primero se razona sobre snippets; el contenido completo de la página solo se pide si los snippets no bastan. Menos tokens con calidad similar, según Exa.' },
    { id: 'langsmith', label: 'LangSmith', sub: 'tokens y caché', at: [10.2, -3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'Exa midió consumo de tokens, tasa de aciertos de caché y tokens de razonamiento, y usó esos datos para definir sus precios.' },
    { id: 'salida', label: 'Resultado JSON', sub: 'con citas', at: [-0.5, -3.4], shape: 'doc', tone: 'data', icon: 'file', info: 'Salida estructurada en todos los niveles, generada con function calling. Latencia reportada: de 15 segundos a 3 minutos.' },
  ],
  edges: [
    { from: 'cliente', to: 'planner' },
    { from: 'planner', to: 'observer', route: 'z', label: 'plan' },
    { from: 'planner', to: 't1' },
    { from: 'planner', to: 't2' },
    { from: 'planner', to: 't3' },
    { from: 't1', to: 'exa' },
    { from: 't2', to: 'exa' },
    { from: 't3', to: 'exa' },
    { from: 't1', to: 'observer', label: 'salidas limpias' },
    { from: 'exa', to: 'langsmith', route: 'z', dashed: true },
    { from: 'observer', to: 'salida' },
    { from: 'salida', to: 'cliente', route: 'z' },
  ],
  code: { grafo: { title: 'grafo.py (ilustrativo del patrón, LangGraph)', lang: 'python', source: EXA_GRAFO } },
  steps: [
    {
      title: '1 · Petición con esquema',
      body: 'El cliente envía la consulta y el **formato JSON que espera recibir**. El esquema viaja en el estado del grafo hasta cada tarea.',
      flows: ['cliente>planner'],
      data: {
        title: 'petición del cliente (forma ilustrativa)',
        lang: 'json',
        content: json({
          consulta: 'Startups latinoamericanas de pagos B2B que levantaron Serie A en 2025',
          esquema: {
            type: 'object',
            properties: {
              empresas: { type: 'array', items: { type: 'object', properties: { nombre: { type: 'string' }, pais: { type: 'string' }, monto_usd: { type: 'number' }, fuente: { type: 'string' } } } },
            },
          },
        }),
        hl: ['"esquema"', '"fuente"'],
      },
      code: { hl: ['esquema: dict', 'class Estado'] },
    },
    {
      title: '2 · Plan dinámico',
      body: 'El planner decide **cuántas tareas** lanzar según la complejidad y las reparte en paralelo; el plan también queda a la vista del observer.',
      flows: ['planner>observer', 'planner>t1', 'planner>t2', 'planner>t3'],
      data: {
        title: 'tareas generadas (ilustrativo)',
        lang: 'json',
        content: json({
          tareas: [
            { id: 't1', consulta: 'rondas Serie A pagos B2B México 2025' },
            { id: 't2', consulta: 'rondas Serie A pagos B2B Brasil 2025' },
            { id: 't3', consulta: 'rondas Serie A pagos B2B Colombia y Chile 2025' },
          ],
          motivo: 'una tarea por mercado; volumen esperado alto en Brasil',
        }),
        hl: ['"tareas"'],
      },
      code: { hl: ['def planner', 'def repartir', 'Send("tarea"', 'add_conditional_edges'] },
    },
    {
      title: '3 · Investigación en paralelo',
      body: 'Cada tarea busca con la API de Exa: **snippets primero**, página completa solo si los fragmentos no alcanzan. Según Exa, menos tokens con calidad similar.',
      flows: ['t1>exa', 't2>exa', 't3>exa'],
      data: {
        title: 'tarea 1: snippets y decisión (ilustrativo)',
        lang: 'json',
        content: json({
          snippets: [
            { url: 'https://ejemplo-noticias.mx/…', fragmento: '…cerró una Serie A de USD 12 M para su plataforma de cuentas por pagar…' },
            { url: 'https://ejemplo-blog.com/…', fragmento: '…la ronda fue liderada por…' },
          ],
          alcanza: false,
          motivo: 'el segundo snippet no trae el monto',
          leer_pagina: ['https://ejemplo-blog.com/…'],
        }),
        hl: ['"alcanza": false', '"leer_pagina"'],
      },
      code: { hl: ['buscar_snippets(', 'if not alcanza', 'leer_paginas('] },
    },
    {
      title: '4 · Contexto mínimo compartido',
      body: 'Cada tarea entrega una **salida limpia** que cumple el esquema; su razonamiento intermedio va solo al observer. Otras tareas, si las necesitan, reciben las salidas, nunca las notas.',
      flows: ['t1>observer'],
      focus: ['t1', 't2', 't3', 'observer'],
      data: {
        title: 'salida limpia de la tarea 1 (ilustrativo)',
        lang: 'json',
        content: json({
          salidas: [{ nombre: 'Empresa A', pais: 'MX', monto_usd: 12000000, fuente: 'https://ejemplo-noticias.mx/…' }],
          razonamiento: '(solo observer) descarté un resultado de 2024 por fecha',
        }),
        hl: ['"salidas"', '(solo observer)'],
      },
      code: { hl: ['salidas: Annotated', 'razonamiento: Annotated', '"previas"', 'return {"salidas": [salida]'] },
    },
    {
      title: '5 · Resultado estructurado',
      body: 'El observer integra las salidas con el contexto completo y entrega JSON con citas, listo para el sistema del cliente. Latencia reportada: de 15 segundos a 3 minutos según la complejidad.',
      flows: ['observer>salida', 'salida>cliente'],
      data: {
        title: 'respuesta al cliente (ilustrativo)',
        lang: 'json',
        content: json({
          empresas: [
            { nombre: 'Empresa A', pais: 'MX', monto_usd: 12000000, fuente: 'https://ejemplo-noticias.mx/…' },
            { nombre: 'Empresa B', pais: 'BR', monto_usd: 20000000, fuente: 'https://ejemplo.com.br/…' },
          ],
        }),
        hl: ['"empresas"'],
      },
      code: { hl: ['def observer', 'integrar(e)'] },
    },
    {
      title: '6 · Costo medido',
      body: 'LangSmith registra tokens, aciertos de caché y tokens de razonamiento por ejecución; con esos datos Exa **fijó sus precios** de producción.',
      flows: ['exa>langsmith'],
      data: {
        title: 'métricas de una ejecución (forma ilustrativa, valores de ejemplo)',
        lang: 'json',
        content: json({
          run: 'deep-research-4417',
          tareas: 3,
          tokens: { entrada: 48210, salida: 3120, razonamiento: 9800 },
          cache: { aciertos: 0.41 },
          paginas_completas_leidas: 2,
        }),
        hl: ['"razonamiento"', '"cache"'],
      },
    },
  ],
}

/* ─────────────────────────── Thomson Reuters ─────────────────────────── */

const TR_ORQ = `# orquestador.py (ilustrativo del patrón; TR construyó su propio andamiaje y no lo publicó)
import asyncio

MODELO_POR_TAREA = {                  # TR elige el modelo según la tarea (varios proveedores)
    "planificar": "alias-razonamiento",
    "orquestar_tools": "alias-tools",
    "redactar_informe": "alias-redaccion",
}
HERRAMIENTAS = [buscar, abrir_documento, keycite, seguir_referencias]   # bloques modulares

async def investigar(pregunta: str, jurisdiccion: str, llm) -> dict:
    plan = await llm.json(MODELO_POR_TAREA["planificar"], prompt=PLAN_EXPERTO,  # método de abogados
                          entrada={"pregunta": pregunta, "jurisdiccion": jurisdiccion})
    evidencia = []
    while not criterio_de_parada(plan, evidencia):    # difícil, según TR Labs (vía ZenML)
        lote = await llm.elegir_tools(MODELO_POR_TAREA["orquestar_tools"], plan,
                                      evidencia, HERRAMIENTAS)
        resultados = await asyncio.gather(*[c.ejecutar() for c in lote])   # en paralelo
        evidencia += [r for r in resultados if r.relevante]
        plan = await llm.revisar_plan(plan, evidencia)    # cambia de rumbo si hace falta
    return await llm.json(MODELO_POR_TAREA["redactar_informe"], prompt=INFORME_CON_CITAS,
                          entrada={"plan": plan, "evidencia": evidencia})`

export const cimThomson: IsoSpec = {
  id: 'cim-thomson',
  title: 'Thomson Reuters Deep Research: agentes sobre herramientas de Westlaw',
  summary:
    'Reconstrucción a partir de lo publicado por Thomson Reuters (05-08-2025) y entrevistas a TR Labs: agentes de **planificación, investigación, descubrimiento y orquestación** sobre un andamiaje propio, que ejecutan **herramientas de Westlaw en paralelo** y entregan un informe con citas que el abogado verifica. Los roles exactos y su disposición son ilustrativos; el código y los payloads también (TR no publicó su implementación) y la consulta y sus resultados son ficticios.',
  height: 500,
  nodes: [
    { id: 'abogado', label: 'Abogado', sub: 'consulta y jurisdicción', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Plantea la pregunta legal. El sistema corre de forma autónoma; el profesional valida el resultado.' },
    { id: 'planif', label: 'Planificación', sub: 'plan multi-paso', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'list', info: 'Genera un plan de investigación y explica su lógica. TR afirma que los planes se diseñaron con abogados de Westlaw y Practical Law, imitando cómo investiga un profesional.' },
    { id: 'orq', label: 'Orquestador', sub: 'andamiaje propio de TR', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'workflow', info: 'TR construyó su propio framework de orquestación. Según TR Labs, llevarlo a producción exigió ajuste continuo de function calling, instrucciones, evaluación, memoria y orquestación.' },
    { id: 'modelos', label: 'Modelos por tarea', sub: 'OpenAI, Google, Anthropic', at: [6.8, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'TR elige el modelo frontera más adecuado para cada tarea y tiene contratos con los tres proveedores (Constellation Research, ago 2025).' },
    { id: 'inv1', label: 'Investigación A', sub: 'en paralelo', at: [10.2, -3.4], shape: 'tall', tone: 'agent', icon: 'search', scale: 0.85, info: 'Varios agentes ejecutan herramientas de investigación en paralelo; TR atribuye a eso buena parte de la ganancia de velocidad.' },
    { id: 'inv2', label: 'Investigación B', sub: 'en paralelo', at: [10.2, 0], shape: 'tall', tone: 'agent', icon: 'search', scale: 0.85, info: 'Revisa resultados y cambia de rumbo si la evidencia lo exige.' },
    { id: 'desc', label: 'Descubrimiento', sub: 'rol citado por TR Labs', at: [10.2, 3.4], shape: 'tall', tone: 'agent', icon: 'branch', scale: 0.85, info: 'Omar Bari (TR Labs) menciona agentes de descubrimiento entre los roles del sistema. TR no publicó su interfaz exacta.' },
    { id: 'tools', label: 'Herramientas Westlaw', sub: 'KeyCite · Key Numbers', at: [13.6, 0], shape: 'stack', tone: 'tool', icon: 'wrench', info: 'KeyCite, Key Numbers, clasificaciones de Precision Research y anotaciones de leyes, expuestas a los agentes como herramientas.' },
    { id: 'contenido', label: 'Contenido curado', sub: 'Westlaw · Practical Law', at: [13.6, -3.4], shape: 'cylinder', tone: 'data', icon: 'book', info: 'La ventaja competitiva no es el modelo sino el contenido editorial curado y actualizado sobre el que se investiga.' },
    { id: 'informe', label: 'Informe con citas', sub: 'el abogado verifica', at: [6.8, 3.4], shape: 'doc', tone: 'data', icon: 'scroll', info: 'Informe estructurado con citas a Westlaw. El profesional verifica antes de usarlo.' },
  ],
  edges: [
    { from: 'abogado', to: 'planif' },
    { from: 'planif', to: 'orq' },
    { from: 'orq', to: 'modelos', route: 'z' },
    { from: 'orq', to: 'inv1', route: 'arc' },
    { from: 'orq', to: 'inv2' },
    { from: 'orq', to: 'desc', route: 'arc' },
    { from: 'inv2', to: 'tools' },
    { from: 'inv1', to: 'tools', route: 'arc' },
    { from: 'desc', to: 'tools', route: 'arc' },
    { from: 'tools', to: 'contenido', route: 'z' },
    { from: 'orq', to: 'informe', route: 'z' },
    { from: 'informe', to: 'abogado' },
  ],
  code: { orq: { title: 'orquestador.py (ilustrativo del patrón)', lang: 'python', source: TR_ORQ } },
  steps: [
    {
      title: '1 · Consulta',
      body: 'El abogado plantea la pregunta legal y su alcance (jurisdicción, tipo de fuentes).',
      flows: ['abogado>planif'],
      data: {
        title: 'consulta (ficticia, ilustrativa)',
        lang: 'json',
        content: json({
          pregunta: '¿Es exigible una cláusula de no competencia de 24 meses para un gerente de ventas?',
          jurisdiccion: 'estado X (EE. UU.)',
          fuentes: ['jurisprudencia', 'leyes', 'fuentes secundarias'],
        }),
        hl: ['"jurisdiccion"'],
      },
      code: { hl: ['async def investigar', 'jurisdiccion: str'] },
    },
    {
      title: '2 · Plan explicado',
      body: 'El agente de planificación genera un **plan multi-paso** y explica su lógica, siguiendo el método de un investigador legal entrenado (TR lo diseñó con abogados de Westlaw y Practical Law).',
      flows: ['planif>orq'],
      data: {
        title: 'plan con su lógica (forma ilustrativa)',
        lang: 'json',
        content: json({
          pasos: [
            { id: 1, accion: 'buscar la ley aplicable a pactos de no competencia', logica: 'la ley fija el marco antes que los casos' },
            { id: 2, accion: 'buscar casos que interpreten duración y alcance', logica: 'la razonabilidad se decide caso a caso' },
            { id: 3, accion: 'verificar con KeyCite que los casos sigan vigentes', logica: 'un caso revocado invalida el argumento' },
            { id: 4, accion: 'revisar fuentes secundarias', logica: 'resumen de tendencias' },
          ],
        }),
        hl: ['"logica"', 'KeyCite'],
      },
      code: { hl: ['MODELO_POR_TAREA["planificar"]', 'PLAN_EXPERTO'] },
    },
    {
      title: '3 · Modelo por tarea',
      body: 'El orquestador usa el modelo más adecuado para cada paso; TR tiene contratos con OpenAI, Google y Anthropic. En el código, cada tarea apunta a un alias.',
      flows: ['orq>modelos'],
      data: {
        title: 'ruteo de modelos (aliases ilustrativos)',
        lang: 'json',
        content: json({ planificar: 'alias-razonamiento', orquestar_tools: 'alias-tools', redactar_informe: 'alias-redaccion' }),
        hl: ['"orquestar_tools"'],
      },
      code: { hl: ['MODELO_POR_TAREA = {', '"orquestar_tools": "alias-tools"'] },
    },
    {
      title: '4 · Agentes en paralelo',
      body: 'Investigación y descubrimiento corren a la vez sobre las herramientas de Westlaw, rediseñadas como **bloques modulares** (buscar, abrir documento, KeyCite, seguir referencias, según el resumen de ZenML). TR atribuye al paralelismo buena parte de la ganancia de velocidad.',
      flows: ['orq>inv1', 'orq>inv2', 'orq>desc', 'inv1>tools', 'inv2>tools', 'desc>tools'],
      data: {
        title: 'lote de llamadas en paralelo (nombres ilustrativos)',
        lang: 'json',
        content: json([
          { agente: 'investigacion_a', tool: 'buscar', args: { consulta: 'non-compete reasonableness duration sales manager', tipo: 'jurisprudencia' } },
          { agente: 'investigacion_b', tool: 'buscar', args: { consulta: 'restrictive covenant statute', tipo: 'leyes' } },
          { agente: 'descubrimiento', tool: 'seguir_referencias', args: { documento: 'caso-ficticio-A' } },
        ]),
        hl: ['"seguir_referencias"'],
      },
      code: { hl: ['HERRAMIENTAS = [', 'asyncio.gather(', 'llm.elegir_tools('] },
    },
    {
      title: '5 · Contenido curado',
      body: 'Las herramientas consultan el **contenido editorial de Westlaw y Practical Law**, no la web abierta. KeyCite indica si un caso sigue siendo buen derecho; el orquestador revisa el plan con esa evidencia.',
      flows: ['tools>contenido'],
      data: {
        title: 'resultado con señal de KeyCite (ficticio, ilustrativo)',
        lang: 'json',
        content: json({
          documento: 'caso-ficticio-A',
          relevante: true,
          keycite: { estado: 'bandera_amarilla', nota: 'tratamiento negativo parcial en un caso posterior' },
          fragmento: '«…la restricción debe ser razonable en duración y territorio…»',
        }),
        hl: ['"keycite"', '"relevante"'],
      },
      code: { hl: ['r.relevante', 'llm.revisar_plan(', 'criterio_de_parada('] },
    },
    {
      title: '6 · Informe verificable',
      body: 'El resultado es un informe con citas, alertas y fragmentos que el abogado **verifica** antes de usarlo: un ciclo de generación y verificación. Trabajo que antes tomaba horas ahora toma minutos, según TR (sin métricas publicadas).',
      flows: ['orq>informe', 'informe>abogado'],
      data: {
        title: 'informe (extracto ficticio, ilustrativo)',
        lang: 'text',
        content: `Respuesta corta: probablemente no exigible en 24 meses; sí con un plazo menor.

Fundamentos
1. La ley del estado X exige que la restricción sea razonable [L1].
2. Los tribunales han reducido plazos similares [C1][C2].
   ⚠ KeyCite: [C2] tiene tratamiento negativo parcial; verificar.

Citas: [L1] ley ficticia §12 · [C1] caso-ficticio-B · [C2] caso-ficticio-A`,
        hl: ['KeyCite', 'Citas:'],
      },
      code: { hl: ['MODELO_POR_TAREA["redactar_informe"]', 'INFORME_CON_CITAS'] },
    },
  ],
}
