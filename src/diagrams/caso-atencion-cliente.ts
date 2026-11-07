import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

// ─────────────────────────────────────────────────────────────────────────────
// Intercom Fin
// ─────────────────────────────────────────────────────────────────────────────

/** ILUSTRATIVO: reproduce el orden de etapas que publicó Intercom, no su código. */
const FIN_PIPELINE = `# Ilustrativo del pipeline que describe Intercom; no es su código.
K_CANDIDATOS = 40             # Intercom: top 40 tras la recuperación
PRESUPUESTO_TOKENS = 3000     # valor de ejemplo: Intercom no publica el suyo

def responder(conversacion: list[dict], empresa: str) -> dict:
    # 1 · Refinar: seguridad, relevancia y una consulta corta
    ref = refinar(conversacion)        # {"segura", "relevante", "consulta", "workflow"}
    if not (ref["segura"] and ref["relevante"]):
        return escalar(conversacion, motivo="fuera_de_alcance")
    # 2 · ¿Calza con un Workflow o una Custom Answer de la empresa?
    if ref["workflow"]:
        return ejecutar_workflow(empresa, ref["workflow"], conversacion)
    # 3 · Recuperación: embeber la consulta y traer K candidatos
    candidatos = indice(empresa).buscar(embeber(ref["consulta"]), k=K_CANDIDATOS)
    # 4 · Reranking y presupuesto de contexto
    ordenados = reranker.puntuar(ref["consulta"], candidatos)
    pasajes = recortar_a_presupuesto(ordenados, PRESUPUESTO_TOKENS)
    # 5 · Generación fundamentada solo en esos pasajes
    borrador = generar(conversacion, pasajes)
    if borrador["sin_respuesta"]:
        return escalar(conversacion, motivo="contenido_insuficiente")
    # 6 · Validación antes de enviar
    val = validar(borrador["texto"], pasajes)       # exactitud + políticas
    if not val["ok"]:
        return escalar(conversacion, motivo=val["motivo"])
    return {"respuesta": borrador["texto"], "fuentes": [p["id"] for p in pasajes]}`

export const cacFinPipeline: IsoSpec = {
  id: 'cac-fin-pipeline',
  title: 'Intercom Fin: el pipeline de una respuesta',
  summary:
    '**Reconstrucción simplificada** a partir de la página *Fin AI Engine* y del post de investigación sobre el reranker de Intercom (sep. 2025). Fin no es "un LLM con un prompt": es una cadena de etapas especializadas —refinar la consulta, recuperar con un modelo propio, reordenar con otro, generar con un modelo post-entrenado y **validar antes de enviar**—, con escalamiento a una persona cuando no puede responder. Los paneles **Datos** y **Código** siguen una conversación de ejemplo con un pipeline **ilustrativo** del mismo orden de etapas: no son datos ni código de Intercom.',
  height: 500,
  zones: [{ id: 'engine', label: 'Fin AI Engine (según Intercom)', from: [1.6, -4.9], to: [15.2, 4.9], tone: 'agent' }],
  nodes: [
    { id: 'cliente', label: 'Cliente final', sub: 'chat · email · voz', at: [-1.4, 0], shape: 'person', tone: 'user', icon: 'user', info: 'El cliente de una empresa que usa Fin (más de 12.000 empresas según Intercom). Escribe su pregunta en el canal que la empresa tenga habilitado.' },
    { id: 'refinar', label: 'Refinar consulta', sub: 'seguridad · relevancia', at: [3.3, 0], shape: 'diamond', tone: 'guard', icon: 'filter', info: 'Primera etapa: chequea seguridad y relevancia, condensa la conversación en una consulta corta y decide si aplica un *Workflow* o una *Custom Answer* definida por la empresa.' },
    { id: 'workflow', label: 'Workflows', sub: 'procedimientos definidos', at: [3.3, -3.4], shape: 'box', tone: 'tool', icon: 'workflow', info: 'Procedimientos que la empresa configura (p. ej., un reembolso con pasos y llamadas a sus APIs). Si la consulta calza con uno, se sigue ese camino en vez de responder solo con conocimiento.' },
    { id: 'retrieval', label: 'fin-cx-retrieval', sub: 'top 40 candidatos', at: [6.6, 0], shape: 'stack', tone: 'data', icon: 'search', info: 'Modelo de recuperación propio de Intercom. Según su post de investigación, la consulta se embebe y se compara contra artículos y snippets pre-embebidos; se toman los **40** mejores candidatos.' },
    { id: 'fuentes', label: 'Conocimiento', sub: 'artículos · conversaciones', at: [6.6, 3.4], shape: 'doc', tone: 'memory', icon: 'book', info: 'Artículos del help center, conversaciones resueltas, snippets estructurados y datos de sistemas integrados de cada empresa cliente.' },
    { id: 'rerank', label: 'fin-cx-reranker', sub: 'ModernBERT-large', at: [10.0, 0], shape: 'box', tone: 'model', icon: 'list', info: 'Reranker propio entrenado con 400.000 consultas reales × 40 pasajes, etiquetados por un LLM "maestro". Según Intercom superó a Cohere Rerank 3.5 (+17,5 % MAP offline) y redujo 80 % el costo de reranking, con P50 ≈ 150 ms.' },
    { id: 'apex', label: 'Fin Apex', sub: 'generador', at: [13.6, 0], shape: 'sphere', tone: 'model', icon: 'sparkles', info: 'Modelo generador post-entrenado por Intercom con datos de producción de Fin (Apex 1.0 en marzo de 2026; la página actual menciona Apex 2.0). Intercom no revela el modelo base.' },
    { id: 'validar', label: 'Validación', sub: 'exactitud · seguridad', at: [13.6, -3.4], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Última etapa antes de enviar: comprueba la respuesta contra estándares de exactitud y seguridad. El caso de AWS describe 15–20 subcomponentes, algunos dedicados a verificar respuestas y cumplimiento de políticas.' },
    { id: 'humano', label: 'Agente humano', sub: 'inbox de la empresa', at: [13.6, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'Si Fin no puede responder con el contenido disponible, escala la conversación al equipo humano de la empresa. Esa conversación **no** cuenta como resolución (ni se cobra).' },
  ],
  edges: [
    { from: 'cliente', to: 'refinar' },
    { from: 'refinar', to: 'workflow', route: 'z' },
    { from: 'refinar', to: 'retrieval' },
    { from: 'fuentes', to: 'retrieval', route: 'z' },
    { from: 'retrieval', to: 'rerank', label: 'K=40' },
    { from: 'rerank', to: 'apex', label: 'presupuesto' },
    { from: 'apex', to: 'validar', route: 'z' },
    { from: 'apex', to: 'humano', route: 'z', dashed: true },
    { from: 'validar', to: 'cliente', route: 'arc' },
  ],
  code: { fin: { title: 'pipeline.py (ilustrativo del patrón, no es código de Intercom)', lang: 'python', source: FIN_PIPELINE } },
  steps: [
    {
      title: '1 · Pregunta',
      body: 'Un cliente escribe "¿Cómo cambio el plan de mi cuenta a anual?". Fin recibe toda la conversación, no solo el último mensaje: el contexto de los turnos anteriores cambia qué hay que buscar.',
      flows: ['cliente>refinar'],
      data: {
        title: 'conversación que entra al pipeline (ilustrativa)',
        lang: 'json',
        content: json({
          canal: 'chat',
          empresa: 'acme-software',
          conversacion: [
            { autor: 'cliente', texto: 'Hola, hoy pago el plan Pro mes a mes' },
            { autor: 'cliente', texto: '¿Cómo cambio el plan de mi cuenta a anual?' },
          ],
        }),
        hl: ['"conversacion"'],
      },
      code: { hl: ['def responder(conversacion'] },
    },
    {
      title: '2 · Refinar y enrutar',
      body: 'Se chequea seguridad y relevancia y se condensa la conversación en una consulta corta. Si la empresa configuró un *Workflow* (o una *Custom Answer*) para cambios de plan, se sigue ese procedimiento. En este ejemplo no hay uno, así que la consulta sigue a recuperación.',
      flows: ['refinar>workflow'],
      focus: ['refinar', 'workflow'],
      data: {
        title: 'salida de la etapa de refinado (ilustrativa)',
        lang: 'json',
        content: json({ segura: true, relevante: true, consulta: 'cambiar suscripción Pro de mensual a anual', workflow: null, custom_answer: null }),
        hl: ['"consulta"', '"workflow"'],
      },
      code: { hl: ['ref = refinar(conversacion)', 'if not (ref["segura"]', 'if ref["workflow"]'] },
    },
    {
      title: '3 · Recuperación',
      body: 'La consulta se embebe y `fin-cx-retrieval` busca en artículos, conversaciones resueltas y snippets. Salen **40** candidatos: muchos parecidos entre sí, por eso hace falta la etapa siguiente.',
      flows: ['refinar>retrieval', 'fuentes>retrieval'],
      data: {
        title: 'candidatos recuperados (ilustrativo, 3 de 40)',
        lang: 'json',
        content: json({
          k: 40,
          candidatos: [
            { id: 'art_812', tipo: 'articulo', titulo: 'Cambiar de facturación mensual a anual', similitud: 0.83 },
            { id: 'conv_55120', tipo: 'conversacion_resuelta', titulo: 'Upgrade a anual con descuento', similitud: 0.81 },
            { id: 'art_377', tipo: 'articulo', titulo: 'Cancelar o pausar tu suscripción', similitud: 0.79 },
          ],
        }),
        hl: ['"k": 40', '"candidatos"'],
      },
      code: { hl: ['K_CANDIDATOS = 40', 'indice(empresa).buscar('] },
    },
    {
      title: '4 · Reranking propio',
      body: '`fin-cx-reranker` reordena los 40 pasajes; un filtro de **presupuesto de contexto** deja solo los mejores. Es la etapa donde Intercom publicó más detalle técnico: un modelo sobre ModernBERT-large destilado de un LLM "maestro".',
      flows: ['retrieval>rerank'],
      data: {
        title: 'reranking y presupuesto (ilustrativo)',
        lang: 'json',
        content: json({
          entrada: 40,
          orden: [
            { id: 'art_812', score: 0.97 },
            { id: 'conv_55120', score: 0.88 },
            { id: 'art_377', score: 0.21 },
          ],
          presupuesto_tokens: 3000,
          seleccionados: ['art_812', 'conv_55120'],
          tokens_usados: 1460,
        }),
        hl: ['"orden"', '"seleccionados"'],
      },
      code: { hl: ['reranker.puntuar(', 'recortar_a_presupuesto('] },
    },
    {
      title: '5 · Generación',
      body: 'Fin Apex redacta la respuesta usando solo los pasajes seleccionados (grounding en la base de conocimiento de la empresa). Si con ese contenido no puede responder, lo dice y la conversación se escala.',
      flows: ['rerank>apex'],
      data: {
        title: 'contexto que recibe el generador (ilustrativo)',
        messages: [
          { role: 'system', content: 'Responde solo con los PASAJES. Si no alcanzan, dilo.\n\n[art_812] Cambiar de facturación mensual a anual: Ajustes → Facturación → Cambiar ciclo…\n[conv_55120] …el cambio se aplica al cierre del ciclo actual.' },
          { role: 'user', content: 'Hola, hoy pago el plan Pro mes a mes. ¿Cómo cambio el plan de mi cuenta a anual?' },
          { role: 'assistant', note: 'borrador', content: 'Ve a Ajustes → Facturación → Cambiar ciclo y elige "Anual". El cambio se aplica al cierre de tu ciclo mensual actual.' },
        ],
        newFrom: 2,
      },
      code: { hl: ['borrador = generar(conversacion, pasajes)', 'if borrador["sin_respuesta"]'] },
    },
    {
      title: '6 · Validar y responder',
      body: 'La respuesta pasa una validación de exactitud y seguridad antes de llegar al cliente. Si Fin resuelve sin derivar a una persona (según la definición de Intercom), cuenta como **resolución** y se cobra (USD 0,99).',
      flows: ['apex>validar', 'validar>cliente'],
      data: {
        title: 'resultado de la validación (ilustrativo)',
        lang: 'json',
        content: json({
          ok: true,
          afirmaciones: [
            { texto: 'Ajustes → Facturación → Cambiar ciclo', respaldo: 'art_812' },
            { texto: 'se aplica al cierre del ciclo actual', respaldo: 'conv_55120' },
          ],
          politicas: 'ok',
          accion: 'enviar',
        }),
        hl: ['"afirmaciones"', '"accion"'],
      },
      code: { hl: ['val = validar(borrador["texto"], pasajes)', 'return {"respuesta"'] },
    },
    {
      title: '7 · Escalamiento',
      body: 'Si el contenido no alcanza, Fin deriva al equipo humano. Aquí está el incentivo del precio por resolución: Intercom solo cobra cuando Fin resuelve, así que la conversación escalada no se cobra.',
      flows: ['apex>humano'],
      data: {
        title: 'escalamiento al inbox de la empresa (ilustrativo)',
        lang: 'json',
        content: json({
          accion: 'escalar',
          motivo: 'contenido_insuficiente',
          consulta: '¿puedo pasar a anual y que me devuelvan lo que queda del mes?',
          pasajes_consultados: ['art_812', 'art_377'],
          cuenta_como_resolucion: false,
        }),
        hl: ['"motivo"', '"cuenta_como_resolucion"'],
      },
      code: { hl: ['motivo="contenido_insuficiente"', 'motivo=val["motivo"]'] },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// DoorDash: guardrail en dos niveles
// ─────────────────────────────────────────────────────────────────────────────

/** Mismo código que el bloque `guardrail_cascada.py` de la página (ilustrativo, no es de DoorDash). */
const GUARDRAIL = `import numpy as np
from litellm import completion, embedding

UMBRAL = 0.82  # calíbralo con conversaciones etiquetadas, no a ojo

def _emb(textos: list[str]) -> np.ndarray:
    r = embedding(model="litellm_proxy/embeddings", input=textos)
    return np.array([d["embedding"] for d in r.data])

def respuesta_fundamentada(respuesta: str, fragmentos: list[str]) -> bool:
    # Nivel 1: similitud entre la respuesta y cada fragmento recuperado (barato)
    v = _emb([respuesta] + fragmentos)
    v = v / np.linalg.norm(v, axis=1, keepdims=True)
    if float((v[1:] @ v[0]).max()) >= UMBRAL:
        return True
    # Nivel 2: juez LLM binario, solo para los casos dudosos (caro)
    juez = completion(
        model="litellm_proxy/claude-haiku",
        messages=[{"role": "user", "content":
            "¿Cada afirmación de la RESPUESTA está respaldada por las FUENTES? "
            "Responde solo SI o NO.\\n\\nFUENTES:\\n" + "\\n---\\n".join(fragmentos)
            + f"\\n\\nRESPUESTA:\\n{respuesta}"}],
        max_tokens=3,
    )
    return juez.choices[0].message.content.strip().upper().startswith("SI")`

/** ILUSTRATIVO: el flujo alrededor del guardrail, tal como lo resume la página. */
const DASHER_FLUJO = `# Ilustrativo del flujo publicado por DoorDash (sep-2024); no es su código.
from guardrail_cascada import respuesta_fundamentada

def atender_dasher(historial: list[dict]) -> dict:
    problema = condensar(historial)              # LLM: resume al problema central
    articulos = kb.buscar(problema, k=3)         # artículos + casos resueltos similares
    fragmentos = [a.texto for a in articulos]
    for intento in range(2):                     # se regenera una vez como máximo
        respuesta = generar(PLANTILLA, problema=problema,
                            articulos=fragmentos, historial=historial)
        if respuesta_fundamentada(respuesta, fragmentos):
            muestrear_para_judge(historial, articulos, respuesta)  # offline
            return {"tipo": "respuesta", "texto": respuesta}
    # Mejor una derivación que una respuesta inventada
    return derivar_a_humano(historial, resumen=problema, articulos=articulos)`

const ART_DASHER = 'Si el cliente no responde: llámalo y escríbele desde la app. Espera el tiempo que indica el temporizador de la app. Si se cumple, sigue las instrucciones de la app para dejar o devolver el pedido.'
const RESP_DASHER = 'Primero llama y escribe al cliente desde la app. Luego espera a que termine el temporizador que muestra la app; cuando se cumpla, la app te indicará si dejar el pedido o devolverlo.'

export const cacDoordashGuardrail: IsoSpec = {
  id: 'cac-doordash-guardrail',
  title: 'DoorDash: soporte a Dashers con RAG, guardrail en dos niveles y LLM Judge',
  summary:
    '**Reconstrucción simplificada** a partir del post de ingeniería de DoorDash (sep. 2024). El chatbot condensa la conversación, recupera artículos de la base de conocimiento y genera una respuesta que **no se muestra** hasta pasar un guardrail barato (similitud semántica) y, solo si hace falta, uno caro (evaluador LLM). Fuera de línea, un LLM Judge y revisión humana miden la calidad. El código es el `guardrail_cascada.py` de la página (**ilustrativo**, no es de DoorDash) y un flujo ilustrativo alrededor; el artículo y la conversación de los datos son inventados.',
  height: 500,
  nodes: [
    { id: 'dasher', label: 'Dasher', sub: 'repartidor en ruta', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Repartidor con un problema en plena entrega (p. ej., no encuentra la dirección o hay un problema con el pago). Necesita respuesta rápida y correcta.' },
    { id: 'condensar', label: 'Condensar', sub: 'problema central', at: [3.3, 0], shape: 'box', tone: 'agent', icon: 'scroll', info: 'Resume la conversación de varios turnos para identificar el problema central y contextualizar la consulta de búsqueda.' },
    { id: 'kb', label: 'KB + casos resueltos', sub: 'vector store', at: [3.3, 3.4], shape: 'stack', tone: 'data', icon: 'book', info: 'Artículos de la base de conocimiento y casos históricos resueltos. DoorDash detectó que muchas fallas venían de **vacíos en la KB**, no del modelo, y priorizó mejorarla.' },
    { id: 'llm', label: 'LLM generador', sub: 'prompt + artículo', at: [6.6, 0], shape: 'sphere', tone: 'model', icon: 'sparkles', info: 'Genera la respuesta con el artículo recuperado insertado en una plantilla. Prácticas reportadas: dividir prompts complejos, evitar negaciones, dar ejemplos y usar chain-of-thought. DoorDash no publica qué modelo usa.' },
    { id: 'g1', label: 'Guardrail nivel 1', sub: 'similitud semántica', at: [9.9, 0], shape: 'diamond', tone: 'guard', icon: 'filter', info: 'Chequeo barato propio: compara la respuesta contra segmentos del artículo con una ventana deslizante. Si se parece lo suficiente, es poco probable que sea alucinación y pasa.' },
    { id: 'g2', label: 'Guardrail nivel 2', sub: 'evaluador LLM', at: [9.9, -3.4], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Solo se invoca si el nivel 1 marca la respuesta. Recibe respuesta, artículos e historial y decide si está fundamentada, con una justificación. Rechazaron un guardrail más sofisticado por latencia y costo.' },
    { id: 'humano', label: 'Agente humano', sub: 'soporte DoorDash', at: [9.9, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'Si la respuesta falla el guardrail, se reintenta o se deriva a un agente humano. Mejor una derivación que una respuesta inventada.' },
    { id: 'judge', label: 'LLM Judge', sub: '5 dimensiones', at: [13.2, 0], shape: 'box', tone: 'infra', icon: 'eye', info: 'Monitoreo fuera de línea: corrección del retrieval, exactitud de la respuesta, gramática, coherencia con el contexto y relevancia. Se complementa con revisión humana de muestras aleatorias y regresión con Promptfoo en cada cambio de prompt.' },
  ],
  edges: [
    { from: 'dasher', to: 'condensar' },
    { from: 'condensar', to: 'kb', route: 'z' },
    { from: 'condensar', to: 'llm' },
    { from: 'llm', to: 'g1' },
    { from: 'g1', to: 'g2', route: 'z', label: 'dudosa' },
    { from: 'g1', to: 'humano', route: 'z', dashed: true },
    { from: 'g1', to: 'dasher', route: 'arc' },
    { from: 'g1', to: 'judge', dashed: true },
  ],
  code: {
    flujo: { title: 'soporte_dasher.py (ilustrativo, no es de DoorDash)', lang: 'python', source: DASHER_FLUJO },
    guardrail: { title: 'guardrail_cascada.py (de la página; ilustrativo)', lang: 'python', source: GUARDRAIL },
  },
  steps: [
    {
      title: '1 · Consulta del Dasher',
      body: 'Antes, el soporte se basaba en flujos predefinidos que solo cubrían un subconjunto pequeño de problemas. Ahora el Dasher escribe en lenguaje natural, a veces en varios mensajes cortos mientras está en ruta.',
      flows: ['dasher>condensar'],
      data: {
        title: 'conversación del Dasher (ilustrativa)',
        lang: 'json',
        content: json({
          historial: [
            { rol: 'dasher', texto: 'Llegué al edificio' },
            { rol: 'dasher', texto: 'El cliente no contesta y no hay portería' },
            { rol: 'dasher', texto: '¿Qué hago con el pedido?' },
          ],
        }),
        hl: ['"historial"'],
      },
      code: { file: 'flujo', hl: ['def atender_dasher(historial'] },
    },
    {
      title: '2 · Condensar y recuperar',
      body: 'Se resume la conversación al problema central y con eso se buscan artículos y casos resueltos similares en el vector store. Buscar con el resumen, y no con el último mensaje ("¿Qué hago con el pedido?"), es lo que hace útil la recuperación.',
      flows: ['condensar>kb', 'kb>condensar'],
      data: {
        title: 'problema condensado y artículos (ilustrativo)',
        lang: 'json',
        content: json({
          problema: 'Cliente no responde en la dirección de entrega; Dasher no sabe si dejar o devolver el pedido',
          articulos: [
            { id: 'kb-cliente-no-responde', score: 0.89, texto: ART_DASHER },
            { id: 'caso-resuelto-20931', score: 0.77, texto: 'Dasher esperó el temporizador y la app indicó dejar el pedido en la puerta.' },
          ],
        }),
        hl: ['"problema"', '"articulos"'],
      },
      code: { file: 'flujo', hl: ['problema = condensar(historial)', 'articulos = kb.buscar(problema'] },
    },
    {
      title: '3 · Generar',
      body: 'El artículo se inserta en la plantilla de prompt y el LLM genera una respuesta candidata. **Todavía no la ve nadie**: primero tiene que pasar el guardrail.',
      flows: ['condensar>llm', 'llm>g1'],
      data: {
        title: 'plantilla con el artículo y respuesta candidata (ilustrativo)',
        messages: [
          { role: 'system', content: `Eres el asistente de soporte para Dashers. Responde solo con el ARTÍCULO, en pasos cortos.\n\nARTÍCULO:\n${ART_DASHER}` },
          { role: 'user', content: 'Cliente no responde en la dirección de entrega; Dasher no sabe si dejar o devolver el pedido' },
          { role: 'assistant', note: 'candidata · aún no se muestra', content: RESP_DASHER },
        ],
        newFrom: 2,
      },
      code: { file: 'flujo', hl: ['for intento in range(2)', 'respuesta = generar(PLANTILLA'] },
    },
    {
      title: '4 · Guardrail barato',
      body: 'La similitud semántica contra el artículo filtra la mayoría de los casos sin llamar a otro LLM. Diseño en cascada: lo barato primero. En este ejemplo la respuesta parafrasea mucho y queda **bajo el umbral**, así que pasa al nivel 2.',
      focus: ['g1'],
      data: {
        title: 'nivel 1: similitud coseno (valores ilustrativos)',
        lang: 'json',
        content: json({
          umbral: 0.82,
          similitud_por_fragmento: { 'kb-cliente-no-responde': 0.79, 'caso-resuelto-20931': 0.64 },
          maxima: 0.79,
          resultado: 'dudosa → nivel 2',
        }),
        hl: ['"umbral"', '"maxima"', '"resultado"'],
      },
      code: { file: 'guardrail', hl: ['UMBRAL = 0.82', 'v = _emb([respuesta] + fragmentos)', 'if float((v[1:] @ v[0]).max()) >= UMBRAL'] },
    },
    {
      title: '5 · Guardrail caro (solo si hace falta)',
      body: 'Si el nivel 1 duda, un evaluador LLM revisa si la respuesta está fundamentada. Según DoorDash, el guardrail redujo 90 % las alucinaciones y 99 % los problemas graves de cumplimiento (sin línea base publicada). En la versión de la página, el juez responde solo SI o NO.',
      flows: ['g1>g2', 'g2>g1'],
      data: {
        title: 'nivel 2: juez binario (ilustrativo)',
        messages: [
          { role: 'user', content: `¿Cada afirmación de la RESPUESTA está respaldada por las FUENTES? Responde solo SI o NO.\n\nFUENTES:\n${ART_DASHER}\n---\nDasher esperó el temporizador y la app indicó dejar el pedido en la puerta.\n\nRESPUESTA:\n${RESP_DASHER}` },
          { role: 'assistant', note: 'max_tokens=3', content: 'SI' },
        ],
        newFrom: 1,
      },
      code: { file: 'guardrail', hl: ['juez = completion(', 'model="litellm_proxy/claude-haiku"', 'max_tokens=3', 'startswith("SI")'] },
    },
    {
      title: '6 · Responder o derivar',
      body: 'Si pasa, llega al Dasher. Si falla, se regenera una vez y, si vuelve a fallar, se deriva a un humano con el contexto del caso. El costo: más latencia por cada verificación y reintento, que DoorDash aceptó a cambio de no mostrar respuestas inventadas.',
      flows: ['g1>dasher', 'g1>humano'],
      data: {
        title: 'registro de la decisión (ilustrativo)',
        lang: 'json',
        content: json({
          intento: 1,
          nivel_1: { maxima: 0.79, paso: false },
          nivel_2: { veredicto: 'SI' },
          accion: 'responder',
          si_hubiera_fallado: ['regenerar una vez', 'derivar_a_humano con resumen y artículos'],
        }),
        hl: ['"accion"', '"si_hubiera_fallado"'],
      },
      code: { file: 'flujo', hl: ['if respuesta_fundamentada(respuesta, fragmentos)', 'return {"tipo": "respuesta"', 'return derivar_a_humano('] },
    },
    {
      title: '7 · Medir fuera de línea',
      body: 'El LLM Judge puntúa transcripciones en cinco dimensiones y humanos revisan muestras. Los hallazgos alimentan mejoras de KB, retrieval y prompts; cada cambio de prompt pasa una regresión con Promptfoo. DoorDash no publica el formato de salida del Judge: el de abajo es ilustrativo.',
      flows: ['g1>judge'],
      focus: ['judge', 'kb'],
      data: {
        title: 'evaluación de una transcripción (formato ilustrativo)',
        lang: 'json',
        content: json({
          transcripcion: 'dx-2024-09-0113',
          correccion_del_retrieval: 'ok',
          exactitud_de_la_respuesta: 'ok',
          gramatica: 'ok',
          coherencia_con_el_contexto: 'ok',
          relevancia: 'falla: no aclara qué hacer si la app no muestra temporizador',
          accion_sugerida: 'revisar vacío en el artículo kb-cliente-no-responde',
        }),
        hl: ['"relevancia"', '"accion_sugerida"'],
      },
      code: { file: 'flujo', hl: ['muestrear_para_judge('] },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// DoorDash: simulación y evaluación
// ─────────────────────────────────────────────────────────────────────────────

/** ILUSTRATIVO del flywheel descrito por DoorDash (ene-2026); no es su código. */
const SIMULACION = `# Ilustrativo del flywheel publicado por DoorDash (ene-2026); no es su código.
def perfil_desde(transcripcion: str) -> dict:
    return llm_json(EXTRAER_PERFIL, transcripcion)   # rasgos, narrativa, objetivo

def simular(perfil: dict, chatbot, mocks, max_turnos: int = 12) -> list[dict]:
    t = [{"rol": "cliente", "texto": cliente_simulado.abrir(perfil)}]
    for _ in range(max_turnos):
        r = chatbot.responder(t, herramientas=mocks)     # APIs mockeadas, no producción
        t.append({"rol": "bot", **r})
        siguiente = cliente_simulado.reaccionar(perfil, t)   # ¿avanza? ¿se frustra?
        if siguiente is None:                            # el cliente da por cerrado
            break
        t.append({"rol": "cliente", "texto": siguiente})
    return t

def contexto_del_bot(historial_tools: list[dict]) -> dict:
    # Case state layer: estado estructurado en vez de logs crudos de herramientas
    return resumir_estado_del_caso(historial_tools)

def evaluar(t: list[dict], politica: str, jueces) -> dict:
    v = {j.nombre: j(t, politica) for j in jueces}       # pass/fail + razonamiento
    return {"pasa": all(x["pass"] for x in v.values()), "veredictos": v}

def gate(transcripciones: list[str], chatbot_candidato, jueces) -> bool:
    resultados = []
    for tr in transcripciones:
        perfil = perfil_desde(tr)
        t = simular(perfil, chatbot_candidato, MOCKS)
        resultados.append(evaluar(t, politica_para(perfil), jueces))
    return all(r["pasa"] for r in resultados)            # toda la suite debe pasar`

export const cacDoordashFlywheel: IsoSpec = {
  id: 'cac-doordash-flywheel',
  title: 'DoorDash: simulación y evaluación antes de producción',
  summary:
    '**Reconstrucción simplificada** a partir del post de DoorDash de enero de 2026 y su cobertura en InfoQ y ByteByteGo. Un LLM hace de cliente a partir de perfiles extraídos de transcripciones reales, conversa con el chatbot en prueba contra **APIs mockeadas**, y más de 50 jueces LLM binarios —calibrados con expertos humanos— deciden si el cambio puede ir a producción. DoorDash no publicó modelos, esquemas ni código: los datos y el código de los paneles son **ilustrativos** del patrón.',
  height: 500,
  nodes: [
    { id: 'transcripts', label: 'Transcripciones', sub: 'históricas reales', at: [0, 0], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Conversaciones reales de soporte de clientes, comercios y Dashers. Son la materia prima de los escenarios, incluidas las que salieron mal.' },
    { id: 'perfiles', label: 'Perfiles', sub: 'perfil del cliente', at: [3.5, 0], shape: 'doc', tone: 'memory', icon: 'file', info: 'Un LLM extrae de cada transcripción un perfil de comportamiento: rasgos de personalidad, narrativa de la situación y resultado que busca el cliente.' },
    { id: 'simulador', label: 'Cliente simulado', sub: 'LLM sin guion', at: [7.4, 0], shape: 'sphere', tone: 'model', icon: 'users', info: 'Conversa sin guion fijo: en cada turno evalúa si avanza, si debe dar más datos o si la conversación da vueltas, y escala su frustración gradualmente.' },
    { id: 'chatbot', label: 'Chatbot en prueba', sub: 'versión candidata', at: [10.5, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'La versión candidata del chatbot de producción (prompts, contexto y herramientas modificados).' },
    { id: 'mocks', label: 'APIs mockeadas', sub: 'pedidos · reembolsos', at: [10.5, 3.4], shape: 'box', tone: 'tool', icon: 'plug', info: 'Backends simulados que mezclan datos reales con datos del escenario, preservando relaciones y timestamps. Permiten probar fraude o reembolsos de alto valor sin tocar producción.' },
    { id: 'casestate', label: 'Case state layer', sub: 'contexto resumido', at: [9.6, -3.8], shape: 'doc', tone: 'memory', icon: 'layers', info: 'Sintetiza el historial crudo de herramientas (pedidos, estados de entrega, decisiones de reembolso) en una representación estructurada. Reemplazó volcar logs crudos al contexto, que causaba alucinaciones.' },
    { id: 'jueces', label: 'Jueces LLM', sub: '+50 evals pass/fail', at: [14.0, 0], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Cada evaluación recibe la transcripción completa (con llamadas a herramientas) y la política aplicable, y devuelve pass/fail con razonamiento: alucinación, tono, clasificación del problema, etc.' },
    { id: 'expertos', label: 'Expertos humanos', sub: 'calibran jueces', at: [14.0, 3.4], shape: 'person', tone: 'user', icon: 'graduation', info: 'Etiquetan muestras de conversaciones; se mide el acuerdo con el juez LLM y se ajusta su prompt hasta que coincide con el criterio humano.' },
    { id: 'gate', label: 'Gate de despliegue', sub: 'suite completa', at: [14.0, -3.6], shape: 'hex', tone: 'infra', icon: 'flag', info: 'La suite completa debe pasar antes de que cualquier cambio llegue a producción. Un solo job orquesta generación de escenarios, simulación y evaluación.' },
  ],
  edges: [
    { from: 'transcripts', to: 'perfiles' },
    { from: 'perfiles', to: 'simulador' },
    { from: 'simulador', to: 'chatbot', label: 'multi-turno' },
    { from: 'chatbot', to: 'mocks', route: 'z' },
    { from: 'chatbot', to: 'casestate', route: 'z' },
    { from: 'chatbot', to: 'jueces', label: 'transcripción' },
    { from: 'expertos', to: 'jueces', route: 'z', dashed: true },
    { from: 'jueces', to: 'gate', route: 'z' },
  ],
  code: { sim: { title: 'simulacion.py (ilustrativo del patrón)', lang: 'python', source: SIMULACION } },
  steps: [
    {
      title: '1 · Escenarios desde datos reales',
      body: 'Se toman transcripciones históricas y un LLM extrae perfiles: quién es el cliente, qué le pasó y qué quiere lograr. Así los escenarios cubren lo que de verdad ocurre, incluidas las conversaciones que salieron mal.',
      flows: ['transcripts>perfiles'],
      data: {
        title: 'perfil extraído de una transcripción (ilustrativo)',
        lang: 'json',
        content: json({
          origen: 'transcripcion-real-anonimizada',
          rasgos: ['impaciente', 'escribe mensajes cortos'],
          narrativa: 'El pedido llegó incompleto: falta la bebida y una porción de papas.',
          objetivo: 'reembolso parcial de lo que faltó',
          datos_del_escenario: { pedido: 'mock-ord-771', items_faltantes: 2 },
        }),
        hl: ['"rasgos"', '"narrativa"', '"objetivo"'],
      },
      code: { hl: ['def perfil_desde(', 'EXTRAER_PERFIL'] },
    },
    {
      title: '2 · Simular la conversación',
      body: 'El cliente simulado conversa con el chatbot candidato sin guion fijo, reaccionando a sus respuestas y escalando su frustración si la conversación da vueltas. Según la cobertura, el sistema corre más de 200 conversaciones en menos de 5 minutos.',
      flows: ['perfiles>simulador', 'simulador>chatbot', 'chatbot>simulador'],
      data: {
        title: 'transcripción simulada (ilustrativa)',
        lang: 'json',
        content: json([
          { rol: 'cliente', texto: 'me faltó la bebida y las papas' },
          { rol: 'bot', texto: 'Lo siento. ¿Me confirmas el pedido? Veo uno entregado hace 20 minutos.' },
          { rol: 'cliente', texto: 'sí ese. ya te dije lo que faltó' },
          { rol: 'bot', tool: 'emitir_reembolso_parcial', texto: 'Listo, reembolsé los 2 ítems que faltaron.' },
        ]),
        hl: ['"tool"'],
      },
      code: { hl: ['def simular(', 'chatbot.responder(t, herramientas=mocks)', 'cliente_simulado.reaccionar('] },
    },
    {
      title: '3 · Backends mockeados',
      body: 'Consultar un pedido o pedir un reembolso llama a APIs simuladas con datos realistas (mezcla de datos reales y del escenario, con relaciones y timestamps coherentes), para cubrir casos borde como fraude o reembolsos de alto valor sin riesgo.',
      flows: ['chatbot>mocks', 'mocks>chatbot'],
      data: {
        title: 'llamada a la API mockeada (ilustrativa)',
        lang: 'json',
        content: json({
          herramienta: 'consultar_pedido',
          entrada: { pedido: 'mock-ord-771' },
          salida_mock: {
            estado: 'entregado',
            entregado_hace_min: 20,
            items: [{ nombre: 'combo hamburguesa', ok: true }, { nombre: 'bebida', ok: false }, { nombre: 'papas', ok: false }],
            reembolsos_previos_30d: 0,
          },
        }),
        hl: ['"salida_mock"'],
      },
      code: { hl: ['herramientas=mocks'] },
    },
    {
      title: '4 · Contexto estructurado',
      body: 'El *case state layer* resume el historial de herramientas antes de pasarlo al modelo. Tras 11 iteraciones (una empeoró los resultados), redujo ~90 % las alucinaciones en simulación, según DoorDash. **No publicaron su esquema**: el de abajo solo ilustra la idea de "estado, no logs".',
      flows: ['chatbot>casestate', 'casestate>chatbot'],
      data: {
        title: 'logs crudos vs. estado del caso (esquema inventado)',
        lang: 'json',
        content: json({
          antes_logs_crudos: [
            'GET /orders/mock-ord-771 200 {"status":"DELIVERED","items":[…]}',
            'GET /refunds?order=mock-ord-771 200 []',
          ],
          despues_estado_del_caso: {
            pedido: 'mock-ord-771',
            estado_entrega: 'entregado',
            faltantes: ['bebida', 'papas'],
            reembolsos_previos: 'ninguno',
            decision_pendiente: 'reembolso parcial por 2 ítems',
          },
        }),
        hl: ['"antes_logs_crudos"', '"despues_estado_del_caso"'],
      },
      code: { hl: ['def contexto_del_bot(', 'resumir_estado_del_caso('] },
    },
    {
      title: '5 · Jueces calibrados',
      body: 'Más de 50 evaluaciones binarias revisan cada transcripción (con sus llamadas a herramientas) contra la política aplicable. Antes de confiar en un juez, se compara su veredicto con etiquetas de expertos humanos y se ajusta su prompt hasta que coinciden.',
      flows: ['chatbot>jueces', 'expertos>jueces'],
      data: {
        title: 'veredictos y calibración (ilustrativo)',
        lang: 'json',
        content: json({
          transcripcion: 'sim-0042',
          veredictos: {
            alucinacion: { pass: true, razon: 'Los ítems reembolsados coinciden con consultar_pedido.' },
            tono: { pass: true, razon: 'Se disculpa sin repetir preguntas innecesarias.' },
            clasificacion_del_problema: { pass: true, razon: 'Pedido incompleto, no pedido tardío.' },
          },
          resto: 'más de 50 evaluaciones en total (según DoorDash)',
          calibracion: { etiqueta_experto: 'pass', coincide_con_juez: true },
        }),
        hl: ['"veredictos"', '"calibracion"'],
      },
      code: { hl: ['def evaluar(', 'j(t, politica) for j in jueces'] },
    },
    {
      title: '6 · Gate',
      body: 'Solo si la suite completa pasa, el cambio va a producción. Cada falla nueva observada se convierte en una evaluación más: ese es el *flywheel*. Un solo job orquesta generación de escenarios, simulación y evaluación.',
      flows: ['jueces>gate'],
      data: {
        title: 'resultado del gate (ilustrativo)',
        lang: 'json',
        content: json({
          candidato: 'prompt-reembolsos-v2',
          escenarios: 'todos los de la suite',
          fallas: [{ escenario: 'sim-0107', evaluacion: 'alucinacion', razon: 'Prometió un crédito que la política no contempla.' }],
          decision: 'bloqueado',
          siguiente: 'corregir el prompt y volver a correr la suite completa',
        }),
        hl: ['"fallas"', '"decision"'],
      },
      code: { hl: ['def gate(', 'return all(r["pasa"] for r in resultados)'] },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Salesforce Help
// ─────────────────────────────────────────────────────────────────────────────

/** ILUSTRATIVO: organización por topics. No es el formato de configuración de Agentforce. */
const SF_TOPICS = `# Ilustrativo: un agente organizado por topics.
# NO es el formato de Agentforce; solo muestra las ideas que publicó Salesforce.
agente: soporte-help
instrucciones_globales:
  - "Actúa en el mejor interés de Salesforce."   # reemplazó la lista de competidores prohibidos
  - "En un incidente activo: reconócelo, discúlpate y deriva."
  - "Si el cliente pide una persona, deriva sin insistir."
topics:
  - nombre: reseteo_contrasena
    descripcion: "No puede iniciar sesión o quiere cambiar su contraseña"
    acciones: [enviar_enlace_reseteo]
    autonomo: true                                # se resuelve sin humano
  - nombre: pregunta_producto
    descripcion: "Cómo configurar o usar una funcionalidad"
    acciones: [buscar_contenido_ayuda, consultar_cuenta_data360]
  - nombre: caso_complejo
    descripcion: "Errores en producción, incidentes, casos técnicos largos"
    acciones: [crear_caso, derivar_a_ingeniero]
handoff:
  disparadores: [cliente_pide_humano, incidente_activo, sin_contenido_relevante]
  entregar: [resumen, topic, articulos_consultados, datos_de_cuenta]
observabilidad:
  metricas: [latencia, escalamientos, errores]   # con alertas
  revision_semanal: [resueltas, abandonadas, derivadas]`

/** ILUSTRATIVO: el recorrido de un mensaje, en el orden del diagrama. */
const SF_FLUJO = `# Ilustrativo del recorrido publicado por Salesforce; no es su código.
def atender(sesion, mensaje: str):
    topic = clasificar_intencion(mensaje, TOPICS)          # intención → topic
    if debe_derivar(sesion, mensaje, topic):               # disparadores de handoff
        return derivar(sesion, topic, resumen=resumir(sesion))
    consulta_en = a_ingles(mensaje)                        # el corpus está en inglés
    fragmentos = buscar_contenido(consulta_en, k=5)        # corpus deduplicado
    cuenta = data360.perfil(sesion.org_id, campos=["edicion", "productos", "uso"])
    respuesta = llm.generar(instrucciones=INSTRUCCIONES[topic],
                            pregunta=mensaje, fuentes=fragmentos, cuenta=cuenta,
                            idioma=sesion.idioma)          # responde en el idioma del cliente
    registrar(sesion, topic, fragmentos, respuesta)        # observabilidad
    return respuesta`

export const cacSalesforceHelp: IsoSpec = {
  id: 'cac-salesforce-help',
  title: 'Salesforce: Agentforce en help.salesforce.com',
  summary:
    '**Reconstrucción simplificada** a partir de publicaciones de Salesforce (ene. y nov. 2025) y de la cobertura de VentureBeat (jul. 2025). El agente clasifica la intención en *topics*, recupera contenido de ayuda y datos de la cuenta desde Data 360, genera con un LLM externo y deriva a ingenieros de soporte. La observabilidad y la revisión semanal cierran el ciclo. Los archivos y datos de los paneles son **ilustrativos**: no reproducen el formato ni los datos de Agentforce.',
  height: 500,
  nodes: [
    { id: 'cliente', label: 'Cliente Salesforce', sub: 'help.salesforce.com', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Administradores y desarrolladores de clientes de Salesforce. El portal recibe más de 60 millones de visitas al año, según la empresa.' },
    { id: 'agente', label: 'Agentforce', sub: 'Atlas Reasoning Engine', at: [3.3, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Orquesta prompts, código y llamadas al LLM para clasificar la intención y elegir un *topic* con sus instrucciones y acciones.' },
    { id: 'topics', label: 'Topics + acciones', sub: 'instrucciones', at: [3.3, -3.4], shape: 'box', tone: 'tool', icon: 'list', info: 'Cada topic agrupa instrucciones y acciones (p. ej., reseteo de contraseña). Salesforce reemplazó listas de reglas rígidas por instrucciones de objetivo, como "actúa en el mejor interés de Salesforce".' },
    { id: 'contenido', label: 'Contenido de ayuda', sub: '~740.000 piezas', at: [6.6, 0], shape: 'stack', tone: 'data', icon: 'book', info: 'Artículos y documentación en varios idiomas y líneas de producto. Los duplicados ("content collisions", como decenas de artículos de reseteo de contraseña) confundían la recuperación y hubo que limpiar y consolidar.' },
    { id: 'data360', label: 'Data 360', sub: 'cuenta · uso del producto', at: [6.6, 3.4], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Antes Data Cloud. Aporta datos estructurados del cliente (historial de cuenta, uso de producto) para personalizar y fundamentar la respuesta.' },
    { id: 'llm', label: 'LLM', sub: 'OpenAI (según prensa)', at: [9.9, 0], shape: 'sphere', tone: 'model', icon: 'sparkles', info: 'VentureBeat reporta que los fragmentos se envían a OpenAI para generar la respuesta; no se publicó el modelo exacto. Responde en el idioma del cliente a partir de contenido en inglés.' },
    { id: 'ingeniero', label: 'Ingeniero de soporte', sub: 'handoff', at: [9.9, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'Recibe los casos derivados. El handoff pasó de ~1 % a ~5 % cuando el equipo vio que impedir el acceso a humanos perjudicaba a los clientes.' },
    { id: 'obs', label: 'Observabilidad', sub: 'revisión semanal', at: [9.9, -3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'Agentforce Observability mide latencia, escalamientos y errores con alertas. El equipo revisa semanalmente resueltas, abandonadas y derivadas para detectar vacíos de contenido.' },
  ],
  edges: [
    { from: 'cliente', to: 'agente' },
    { from: 'agente', to: 'topics', route: 'z' },
    { from: 'agente', to: 'contenido' },
    { from: 'agente', to: 'data360', route: 'z' },
    { from: 'contenido', to: 'llm' },
    { from: 'llm', to: 'cliente', route: 'arc' },
    { from: 'llm', to: 'ingeniero', route: 'z', dashed: true },
    { from: 'llm', to: 'obs', route: 'z', dashed: true },
  ],
  code: {
    flujo: { title: 'flujo.py (ilustrativo, no es código de Salesforce)', lang: 'python', source: SF_FLUJO },
    topics: { title: 'agente.yaml (ilustrativo, no es el formato de Agentforce)', lang: 'yaml', source: SF_TOPICS },
  },
  steps: [
    {
      title: '1 · Primer contacto: el agente',
      body: 'Salesforce quitó el botón "contact support" de sus sitios en inglés: casi todos los clientes empiezan con Agentforce. Antes hubo un piloto con 200 usuarios autenticados durante 4 semanas, y el lanzamiento fue con ~10 % del tráfico, solo inglés y usuarios autenticados.',
      flows: ['cliente>agente'],
      data: {
        title: 'despliegue gradual (cifras de Salesforce y VentureBeat; formato ilustrativo)',
        lang: 'json',
        content: json({
          piloto: { usuarios_autenticados: 200, semanas: 4 },
          lanzamiento_oct_2024: { trafico: '~10 %', idiomas: ['en'], solo_autenticados: true },
          boton_contact_support: 'retirado en los sitios en inglés',
          pagina_actual: { idiomas: 7 },
        }),
        hl: ['"piloto"', '"lanzamiento_oct_2024"'],
      },
      code: { file: 'flujo', hl: ['def atender(sesion, mensaje'] },
    },
    {
      title: '2 · Intención → topic',
      body: 'Atlas clasifica la intención y elige un topic con sus instrucciones y acciones (p. ej., reseteo de contraseña, que se resuelve de forma autónoma). Una de las lecciones: una lista de competidores prohibidos hacía que el agente rechazara preguntas legítimas, y la reemplazaron por una instrucción de objetivo.',
      flows: ['agente>topics'],
      data: {
        title: 'clasificación de un mensaje (ilustrativa)',
        lang: 'json',
        content: json({
          mensaje: 'No puedo entrar a mi org, olvidé la contraseña',
          topic: 'reseteo_contrasena',
          acciones_disponibles: ['enviar_enlace_reseteo'],
          autonomo: true,
        }),
        hl: ['"topic"', '"autonomo"'],
      },
      code: { file: 'topics', hl: ['Actúa en el mejor interés de Salesforce', 'nombre: reseteo_contrasena', 'autonomo: true'] },
    },
    {
      title: '3 · Recuperar contenido',
      body: 'Busca en el contenido de ayuda. La lección más cara: artículos duplicados o contradictorios ("content collisions") producían respuestas erróneas; hubo que **limpiar y consolidar el corpus**, no cambiar el modelo.',
      flows: ['agente>contenido'],
      data: {
        title: 'el problema de las colisiones de contenido (ilustrativo)',
        lang: 'json',
        content: json({
          consulta: 'reset password',
          antes_de_consolidar: [
            { articulo: 'Reset Your Password (Classic)', score: 0.86 },
            { articulo: 'How to reset a user password', score: 0.85 },
            { articulo: 'Password reset for SSO users', score: 0.85 },
            { articulo: 'Reset password (2019, obsoleto)', score: 0.84 },
          ],
          despues_de_consolidar: [{ articulo: 'Reset a Password (canónico, con variantes por caso)', score: 0.9 }],
        }),
        hl: ['"antes_de_consolidar"', '"despues_de_consolidar"'],
      },
      code: { file: 'flujo', hl: ['consulta_en = a_ingles(mensaje)', 'buscar_contenido(consulta_en'] },
    },
    {
      title: '4 · Datos de la cuenta',
      body: 'Data 360 (antes Data Cloud) aporta contexto de la cuenta y del uso del producto para fundamentar y personalizar la respuesta: no es lo mismo resetear una contraseña con o sin SSO.',
      flows: ['agente>data360'],
      data: {
        title: 'contexto de la cuenta (campos ilustrativos)',
        lang: 'json',
        content: json({ org_id: '00D5g000000EJEMPLO', edicion: 'Enterprise', productos: ['Sales Cloud', 'Service Cloud'], sso_habilitado: true, casos_abiertos: 1 }),
        hl: ['"sso_habilitado"'],
      },
      code: { file: 'flujo', hl: ['data360.perfil('] },
    },
    {
      title: '5 · Generar en el idioma del cliente',
      body: 'El LLM genera desde contenido en inglés y responde en el idioma del cliente (japonés, francés, etc.) sin traducir los artículos. Según VentureBeat, para japonés la consulta se lleva al inglés, se responde con el contenido en inglés y la respuesta vuelve al idioma del cliente. Los fragmentos se envían a OpenAI (modelo no publicado).',
      flows: ['contenido>llm', 'llm>cliente'],
      data: {
        title: 'generación multilingüe (ilustrativa)',
        messages: [
          { role: 'system', content: 'Responde en el idioma del cliente usando solo las FUENTES (en inglés).\n\nFUENTES:\n[Reset a Password] SSO users must reset through their identity provider…\nCUENTA: sso_habilitado=true' },
          { role: 'user', content: 'Je ne peux plus me connecter à mon org, comment réinitialiser mon mot de passe ?' },
          { role: 'assistant', content: 'Votre org utilise le SSO : réinitialisez le mot de passe depuis votre fournisseur d’identité, pas depuis Salesforce. Voulez-vous que je vous indique les étapes ?' },
        ],
        newFrom: 2,
      },
      code: { file: 'flujo', hl: ['respuesta = llm.generar(', 'idioma=sesion.idioma'] },
    },
    {
      title: '6 · Handoff sin fricción',
      body: 'En incidentes o casos complejos el agente reconoce el problema, se disculpa y deriva rápido. Un handoff de 1 % parecía un éxito hasta que leyeron las conversaciones: el agente se interponía. Facilitaron el escalamiento y el handoff subió a ~5 %.',
      flows: ['llm>ingeniero'],
      data: {
        title: 'derivación a un ingeniero (ilustrativa)',
        lang: 'json',
        content: json({
          disparador: 'incidente_activo',
          mensaje_al_cliente: 'Estamos al tanto de un incidente que afecta el inicio de sesión. Lamentamos la molestia; te paso con un ingeniero de soporte.',
          para_el_ingeniero: { topic: 'caso_complejo', resumen: 'No puede iniciar sesión desde hace 1 h; coincide con el incidente activo.', articulos_consultados: ['Reset a Password'], datos_de_cuenta: { edicion: 'Enterprise', sso_habilitado: true } },
        }),
        hl: ['"disparador"', '"para_el_ingeniero"'],
      },
      code: { file: 'topics', hl: ['En un incidente activo', 'disparadores: [cliente_pide_humano', 'entregar: [resumen'] },
    },
    {
      title: '7 · Medir y corregir',
      body: 'Agentforce Observability (latencia, escalamientos, errores, con alertas) y la revisión semanal de resueltas, abandonadas y derivadas alimentan cambios de contenido, prompts y retrievers. Mirar las **abandonadas** es lo que revela clientes atrapados.',
      flows: ['llm>obs'],
      focus: ['obs', 'contenido'],
      data: {
        title: 'revisión semanal (formato ilustrativo)',
        lang: 'json',
        content: json({
          muestras: { resueltas: 'muestra aleatoria', abandonadas: 'revisar todas las del topic con más abandono', derivadas: 'motivo de cada derivación' },
          hallazgos: [
            'artículos duplicados sobre SSO → consolidar',
            'clientes que piden una persona y el agente insiste → ajustar instrucción',
          ],
          cambios: ['contenido', 'instrucciones del topic', 'configuración del retriever'],
        }),
        hl: ['"abandonadas"', '"hallazgos"'],
      },
      code: { file: 'topics', hl: ['metricas: [latencia, escalamientos, errores]', 'revision_semanal: [resueltas, abandonadas, derivadas]'] },
    },
  ],
}
