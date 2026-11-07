import type { IsoSpec } from '../components/iso/types'

// Diagramas de la página "Casos reales: servicios financieros".
// Son RECONSTRUCCIONES a partir de fuentes públicas. Ninguna de estas empresas publicó
// su código ni sus formatos internos: todo el código y los datos de los paneles son
// ILUSTRATIVOS del patrón y así lo indican sus títulos.

const json = (v: unknown) => JSON.stringify(v, null, 2)

// ─────────────────────────────────────────────────────────────────────────────
// Moody's
// ─────────────────────────────────────────────────────────────────────────────

const MOODYS_WF = `{
  "_nota": "Ilustrativo: Moody's no publicó su formato de definición",
  "workflow": "memo_credito",
  "pasos": [
    { "id": "perfil", "agente": "extractor_perfil", "entradas": ["entidad_id"] },
    { "id": "financieros", "agente": "analista_ratios", "entradas": ["entidad_id"] },
    { "id": "pares", "agente": "comparador_pares", "depende_de": ["perfil"] },
    { "id": "riesgos", "agente": "investigador_docs", "depende_de": ["perfil"] },
    { "id": "memo", "agente": "redactor_memo",
      "depende_de": ["financieros", "pares", "riesgos"] }
  ],
  "agentes": {
    "analista_ratios": {
      "tipo": "simple",
      "modelo": "modelo-pequeno",
      "system_prompt": "Calcula ratios de apalancamiento y liquidez. Cita la fuente de cada cifra.",
      "tools": ["obtener_estados_financieros", "calcular_ratios"],
      "validaciones": ["cada_cifra_tiene_cita"]
    },
    "investigador_docs": {
      "tipo": "complejo",
      "imagen_ecs": "investigador-docs:1.4",
      "modelo": "modelo-razonamiento",
      "tools": ["recuperacion_agentica"]
    }
  },
  "inferencia": { "perfil": "geografico-ue", "fallback_global": false },
  "auditoria": { "registrar": ["paso", "llamada_llm", "tool_call", "citas"] }
}`

const MOODYS_INGESTA = `# Ilustrativo del enfoque descrito en IND3303; no es el código de Moody's.
def ingerir_pdf(pdf) -> list[dict]:
    chunks = []
    for n, pagina in enumerate(paginas(pdf), start=1):
        tipo = clasificar_pagina(pagina)          # "texto" | "tabla" | "grafico"
        if tipo == "texto":
            md = llm_a_markdown(pagina)           # LLM de Bedrock → markdown
        elif tipo == "tabla":
            md = data_automation(pagina)          # Bedrock Data Automation
        else:
            md = describir_grafico(pagina)        # visión → metadatos buscables
        chunks += trocear(md, doc=pdf.nombre, pagina=n, tipo=tipo)  # chunking propio
    return chunks                                 # → Bedrock Knowledge Base`

const MOODYS_RETR = `# Ilustrativo del patrón "recuperación agéntica" de IND3303; no es código de Moody's.
import boto3

kb = boto3.client("bedrock-agent-runtime", region_name="eu-west-1")
KB_ID = "KBEJEMPLO01"

def recuperacion_agentica(pregunta: str, max_rondas: int = 3) -> dict:
    busquedas = llm_json(DESCOMPONER, pregunta)          # plan de búsquedas
    evidencia = []
    for _ in range(max_rondas):
        for q in busquedas:
            r = kb.retrieve(
                knowledgeBaseId=KB_ID, retrievalQuery={"text": q},
                retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 5}})
            evidencia += [{"texto": x["content"]["text"], "fuente": x["location"], "q": q}
                          for x in r["retrievalResults"]]
        juicio = llm_json(EVALUAR_SUFICIENCIA, pregunta, evidencia)  # ¿ya puedo responder?
        if juicio["suficiente"]:
            break
        busquedas = juicio["nuevas_busquedas"]              # vuelve a buscar
    return {"fragmentos": evidencia}                        # cada fragmento con su cita`

export const csfMoodys: IsoSpec = {
  id: 'csf-moodys',
  title: "Moody's: sistema multiagente en AWS (reconstrucción)",
  summary:
    "**Reconstrucción** a partir de la sesión IND3303 de AWS re:Invent 2025 (Moody's + AWS); no es un diagrama oficial. Un orquestador propio ejecuta workflows definidos en JSON, combina agentes simples y complejos, ~80 herramientas en Lambda y recuperación agéntica con citas sobre Bedrock Knowledge Bases. Moody's no publicó su formato JSON, sus modelos ni su código: los tres archivos y los datos de los paneles son **ilustrativos** del patrón descrito en la sesión.",
  height: 540,
  zones: [{ id: 'aws', label: 'AWS · serverless-first', from: [1.8, -5.0], to: [15.3, 5.0], tone: 'infra' }],
  nodes: [
    { id: 'analyst', label: 'Analista de crédito', sub: 'banco o aseguradora', at: [0, -0.5], shape: 'person', tone: 'user', icon: 'user', info: "Cliente de Moody's (bancos, gestores de activos, aseguradoras) que lanza un workflow repetible, por ejemplo preparar un memo de crédito o comparar pares." },
    { id: 'orch', label: 'Orquestador', sub: 'propio · Amazon ECS', at: [3.4, -0.5], shape: 'box', tone: 'agent', icon: 'workflow', info: 'Interpreta definiciones JSON de workflows, agentes y prompts. Paraleliza pasos independientes, respeta dependencias y absorbe el *throttling* del LLM. Nació para ~20 pasos; según la sesión, hoy corre workflows de clientes de hasta ~400.' },
    { id: 'simple', label: 'Agentes simples', sub: 'JSON: prompt + tools', at: [6.8, -3.4], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Se declaran como datos: system prompt, lista curada de herramientas y pasos de validación. Crear uno nuevo no exige desplegar código.' },
    { id: 'complex', label: 'Agentes complejos', sub: 'código · estado · ECS', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'cpu', info: 'Código propio cuando hace falta estado, datasets o ejecuciones más largas que el límite de 15 minutos de Lambda.' },
    { id: 'tools', label: '~80 herramientas', sub: 'AWS Lambda stateless', at: [10.2, -3.4], shape: 'box', tone: 'tool', icon: 'wrench', info: 'Funciones de propósito único (traer datos, calcular ratios) compartidas por todos los workflows. Serverless porque la demanda puede subir ~50x en un evento crediticio.' },
    { id: 'retr', label: 'Recuperación agéntica', sub: 'descompone · itera · cita', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'search', info: 'Descompone la pregunta, planifica varias búsquedas, evalúa si ya puede responder y vuelve a buscar si no. Devuelve fragmentos **con citas**. Se expone como herramienta para otros agentes.' },
    { id: 'kb', label: 'Knowledge Base', sub: 'Bedrock KB · chunking', at: [13.6, 0], shape: 'stack', tone: 'data', icon: 'layers', info: 'Bedrock Knowledge Bases con chunking personalizado en Lambda. Moody\'s mencionó varias opciones de vector store (S3 Vectors, pgvector, OpenSearch, etc.) sin detallar cuál usa en cada caso.' },
    { id: 'ingest', label: 'Clasifica páginas', sub: 'texto · tablas · gráficos', at: [13.6, 3.4], shape: 'diamond', tone: 'data', icon: 'split', info: 'Cada página de un PDF financiero se clasifica y enruta: texto → LLM de Bedrock a markdown; tablas → Bedrock Data Automation; gráficos → modelo de visión que genera metadatos buscables.' },
    { id: 'bedrock', label: 'Amazon Bedrock', sub: 'modelo por paso', at: [6.8, 3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Cada agente o paso declara su modelo (razonamiento para análisis, modelos pequeños para tareas simples). Inferencia entre regiones **geográfica** para mantener los datos en UE o EE. UU.; global cuando solo importa la capacidad.' },
    { id: 'obs', label: 'Trazas y citas', sub: 'auditoría por paso', at: [3.4, 3.4], shape: 'cylinder', tone: 'data', icon: 'scroll', info: 'Objetivo declarado: registrar cada paso, llamada al LLM y tool call. En la sesión, AgentCore Observability e Identity aparecen **en evaluación**, no como componentes ya en producción.' },
  ],
  edges: [
    { from: 'analyst', to: 'orch', label: 'workflow' },
    { from: 'orch', to: 'simple', route: 'z' },
    { from: 'orch', to: 'complex' },
    { from: 'simple', to: 'tools' },
    { from: 'complex', to: 'retr' },
    { from: 'retr', to: 'kb' },
    { from: 'ingest', to: 'kb', label: 'indexa' },
    { from: 'complex', to: 'bedrock', label: 'LLM' },
    { from: 'orch', to: 'obs', dashed: true },
  ],
  code: {
    wf: { title: 'memo_credito.json (ilustrativo; formato inventado)', lang: 'json', source: MOODYS_WF },
    ingesta: { title: 'ingesta.py (ilustrativo del patrón)', lang: 'python', source: MOODYS_INGESTA },
    retr: { title: 'recuperacion_agentica.py (ilustrativo del patrón)', lang: 'python', source: MOODYS_RETR },
  },
  steps: [
    {
      title: '1 · Un workflow, no un chat',
      body: 'El analista lanza un workflow repetible (p. ej. memo de crédito). La secuencia de pasos está definida de antemano: es **determinista**, aunque algunos pasos sean agentes. Clement lo resumió así: un agente es "un for-loop con mejor PR".',
      flows: ['analyst>orch'],
      data: {
        title: 'ejecución de un workflow (petición ilustrativa)',
        lang: 'http',
        content: `POST /workflows/memo_credito/ejecuciones HTTP/1.1
Host: api.ejemplo-plataforma.interno
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.analista-banco
Content-Type: application/json

${json({ entidad_id: 'ENT-EJEMPLO-0042', solicitado_por: 'analista@banco-cliente.com', residencia: 'UE' })}`,
        hl: ['/workflows/memo_credito/ejecuciones', '"residencia"'],
      },
      code: { file: 'wf', hl: ['"workflow": "memo_credito"'] },
    },
    {
      title: '2 · Orquestación declarativa',
      body: 'El orquestador lee el JSON, lanza en paralelo los pasos independientes y respeta dependencias. Los agentes simples son configuración; los complejos, código en ECS. También absorbe el *throttling* del LLM en vez de dejar que cada agente lo gestione.',
      flows: ['orch>simple', 'orch>complex'],
      data: {
        title: 'plan de ejecución calculado (ilustrativo)',
        lang: 'json',
        content: json({
          ola_1: ['perfil', 'financieros'],
          ola_2: ['pares', 'riesgos'],
          ola_3: ['memo'],
          agentes: { simples: ['extractor_perfil', 'analista_ratios', 'comparador_pares', 'redactor_memo'], complejos: ['investigador_docs'] },
          throttling: 'cola con reintentos y backoff en el orquestador',
        }),
        hl: ['"ola_1"', '"ola_2"', '"throttling"'],
      },
      code: { file: 'wf', hl: ['"depende_de"', '"tipo": "simple"', '"tipo": "complejo"'] },
    },
    {
      title: '3 · Herramientas pequeñas y compartidas',
      body: 'Los agentes llaman ~80 funciones Lambda de propósito único. Una herramienta bien acotada se prueba y se reutiliza mejor que un agente que lo hace todo, y escala sola ante picos de ~50x en eventos crediticios.',
      flows: ['simple>tools'],
      data: {
        title: 'invocación de una herramienta Lambda (ilustrativa)',
        lang: 'json',
        content: json({
          tool: 'calcular_ratios',
          entrada: { entidad_id: 'ENT-EJEMPLO-0042', periodo: 'FY2025' },
          salida: {
            deuda_neta_ebitda: 3.1,
            liquidez_corriente: 1.4,
            fuentes: ['estados_financieros_FY2025.pdf#p14', 'estados_financieros_FY2025.pdf#p15'],
          },
        }),
        hl: ['"tool"', '"fuentes"'],
      },
      code: { file: 'wf', hl: ['"tools": ["obtener_estados_financieros"', '"validaciones"'] },
    },
    {
      title: '4 · Ingesta según el tipo de página',
      body: 'Tras cuatro intentos fallidos (librerías de extracción, bounding boxes, modelos multimodales y meter el PDF entero en un contexto de 1M tokens), clasifican cada página y la envían al extractor adecuado antes de indexar.',
      flows: ['ingest>kb'],
      data: {
        title: 'clasificación de páginas de un PDF (ilustrativa)',
        lang: 'json',
        content: json({
          documento: 'informe_anual_2025.pdf',
          paginas: [
            { p: 3, tipo: 'texto', destino: 'LLM de Bedrock → markdown' },
            { p: 14, tipo: 'tabla', destino: 'Bedrock Data Automation' },
            { p: 22, tipo: 'grafico', destino: 'modelo de visión → metadatos buscables' },
          ],
          chunk_ejemplo: { doc: 'informe_anual_2025.pdf', pagina: 14, tipo: 'tabla', texto: '| Deuda neta | 2024 | 2025 | …' },
        }),
        hl: ['"tipo": "tabla"', '"chunk_ejemplo"'],
      },
      code: { file: 'ingesta', hl: ['clasificar_pagina(pagina)', 'llm_a_markdown(pagina)', 'data_automation(pagina)', 'describir_grafico(pagina)', 'trocear(md'] },
    },
    {
      title: '5 · Recuperación agéntica con citas',
      body: 'La búsqueda se planifica, se repite y se autoevalúa. Lo que vuelve al agente son fragmentos **citables**: la cita es el mecanismo de confianza frente al cliente regulado y lo que permite al analista verificar cada afirmación.',
      flows: ['complex>retr', 'retr>kb'],
      data: {
        title: 'rondas de búsqueda y fragmentos citados (ilustrativo)',
        lang: 'json',
        content: json({
          pregunta: '¿Qué riesgos de refinanciamiento menciona la entidad para 2026?',
          ronda_1: { busquedas: ['vencimientos de deuda 2026', 'covenants financieros'], suficiente: false, falta: 'fuentes de liquidez' },
          ronda_2: { busquedas: ['líneas de crédito comprometidas'], suficiente: true },
          fragmentos: [
            { texto: 'El 38 % de la deuda vence en 2026…', fuente: 's3://docs/informe_anual_2025.pdf#p41' },
            { texto: 'Línea comprometida no utilizada por 250 M…', fuente: 's3://docs/informe_anual_2025.pdf#p44' },
          ],
        }),
        hl: ['"suficiente": false', '"fuente"'],
      },
      code: { file: 'retr', hl: ['busquedas = llm_json(DESCOMPONER', 'kb.retrieve(', 'EVALUAR_SUFICIENCIA', 'busquedas = juicio["nuevas_busquedas"]'] },
    },
    {
      title: '6 · Modelo por paso y residencia',
      body: 'Cada paso elige su modelo en Bedrock. La inferencia geográfica (perfil `eu.` o `us.`) mantiene los datos dentro de la región exigida por el regulador; la global se usa solo cuando importa la capacidad. Moody\'s no publicó qué modelos usa: el de abajo es un ejemplo.',
      flows: ['complex>bedrock'],
      data: {
        title: 'llamada Converse con perfil geográfico (modelo de ejemplo)',
        lang: 'http',
        content: `POST /model/eu.anthropic.claude-sonnet-5-5/converse HTTP/1.1
Host: bedrock-runtime.eu-west-1.amazonaws.com
Content-Type: application/json

${json({
  system: [{ text: 'Eres un analista de crédito. Usa solo los fragmentos y cita cada afirmación.' }],
  messages: [{ role: 'user', content: [{ text: '¿Qué riesgos de refinanciamiento…? FRAGMENTOS: [p41] … [p44] …' }] }],
  inferenceConfig: { maxTokens: 1500, temperature: 0 },
})}`,
        hl: ['eu.anthropic.claude-sonnet-5-5', 'eu-west-1'],
      },
      code: { file: 'wf', hl: ['"modelo": "modelo-razonamiento"', '"inferencia"'] },
    },
    {
      title: '7 · Trazabilidad',
      body: 'Cada paso, llamada al modelo y herramienta debe quedar registrado para auditoría. En la sesión, Moody\'s **evaluaba** migrar esta pieza a AgentCore Observability e Identity; no asumas que ya estaba en producción.',
      flows: ['orch>obs'],
      data: {
        title: 'registro de un paso (forma ilustrativa)',
        lang: 'json',
        content: json({
          ejecucion: 'memo_credito/0f3a',
          paso: 'riesgos',
          agente: 'investigador_docs',
          llamadas_llm: [{ modelo: 'eu.anthropic.claude-sonnet-5-5', input_tokens: 6120, output_tokens: 840 }],
          tool_calls: [{ tool: 'recuperacion_agentica', rondas: 2 }],
          citas: ['informe_anual_2025.pdf#p41', 'informe_anual_2025.pdf#p44'],
        }),
        hl: ['"llamadas_llm"', '"tool_calls"', '"citas"'],
      },
      code: { file: 'wf', hl: ['"auditoria"'] },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Allianz Project Nemo
// ─────────────────────────────────────────────────────────────────────────────

const NEMO_FLUJO = `# Ilustrativo de los roles publicados por Allianz; no es su código ni su stack.
TOPE_AUD = 500

def procesar_reclamo(reclamo: dict) -> dict:
    if reclamo["tipo"] != "alimentos_corte_luz" or reclamo["monto_aud"] >= TOPE_AUD:
        return flujo_manual(reclamo)                         # fuera del alcance acotado
    expediente = {"reclamo": reclamo, "decisiones": {}}
    with cyber_agent.supervisar(expediente):                 # seguridad de datos
        d = expediente["decisiones"]                         # (planner coordina)
        d["coverage"] = coverage_agent(reclamo["poliza_id"], reclamo["evento"])
        d["weather"] = weather_agent(reclamo["direccion"], reclamo["fecha_evento"])
        d["fraud"] = fraud_agent(reclamo)
        if all(x["ok"] for x in d.values()):
            d["payout"] = payout_agent(reclamo, d)           # PROPONE un monto
        expediente["resumen"] = audit_agent(expediente)      # resume cada decisión
    return cola_revision.crear(expediente)                   # siempre a una persona

def al_resolver(revision: dict) -> None:
    if revision["decision"] != "aprobar":                    # decisión humana
        return
    pagos.ejecutar(revision["expediente_id"],                # con identidad humana
                   monto_aud=revision["monto_aprobado_aud"],
                   aprobado_por=revision["profesional_id"])`

const NEMO_CEDAR = `// Ejemplo de la guía, NO de Allianz: cómo hacer que "el pago nunca se
// automatiza" sea una política determinista y no una instrucción del prompt.
// En Cedar todo lo no permitido está denegado: el token de un agente no
// tiene el rol requerido, así que su llamada a la tool de pago se rechaza.
permit(
  principal is AgentCore::OAuthUser,
  action == AgentCore::Action::"Pagos___ejecutar_pago",
  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:ap-southeast-2:111122223333:gateway/siniestros"
) when {
  principal.hasTag("role") &&
  principal.getTag("role") == "profesional_siniestros"
};`

export const csfAllianzNemo: IsoSpec = {
  id: 'csf-allianz-nemo',
  title: 'Allianz Project Nemo: siete agentes y una decisión humana',
  summary:
    'Flujo descrito por Allianz (noviembre de 2025) para reclamos por alimentos echados a perder tras cortes de luz, menores a 500 AUD. Los siete agentes son los publicados; el orden de las flechas es una **reconstrucción** del texto. Allianz no publica modelos ni nube de Nemo. El pago **nunca** se automatiza. El código y los datos son **ilustrativos** (un reclamo inventado); la política Cedar es un ejemplo de la guía para implementar esa regla, no algo que Allianz haya publicado.',
  height: 540,
  nodes: [
    { id: 'customer', label: 'Cliente', sub: 'reclamo < 500 AUD', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Presenta un reclamo de baja complejidad tras un evento climático (p. ej. 20 horas sin luz, 250 AUD en alimentos perdidos).' },
    { id: 'planner', label: 'Planner', sub: 'inicia y coordina', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'workflow', info: 'Arranca el workflow, coordina a los especialistas y recibe el monto calculado.' },
    { id: 'cyber', label: 'Cyber', sub: 'seguridad de datos', at: [3.4, -3.4], shape: 'box', tone: 'guard', icon: 'shield', info: 'Agente dedicado a supervisar la seguridad de los datos durante el flujo. La oficial de ciberseguridad de Allianz Australia supervisó el diseño de la gobernanza.' },
    { id: 'coverage', label: 'Coverage', sub: '¿la póliza lo cubre?', at: [6.8, -3.4], shape: 'box', tone: 'agent', icon: 'file', info: 'Verifica que la póliza cubra pérdida de alimentos por ese tipo de evento climático.' },
    { id: 'weather', label: 'Weather', sub: '¿hubo el evento?', at: [6.8, 0], shape: 'box', tone: 'agent', icon: 'cloud', info: 'Confirma que ocurrió un evento climático que coincide con el reclamo.' },
    { id: 'fraud', label: 'Fraud', sub: 'señales de fraude', at: [6.8, 3.4], shape: 'box', tone: 'guard', icon: 'eye', info: 'Busca indicios de fraude antes de que se calcule cualquier pago.' },
    { id: 'payout', label: 'Payout', sub: 'calcula el monto', at: [10.2, 0], shape: 'box', tone: 'agent', icon: 'card', info: 'Calcula el monto propuesto. **Propone**, no paga.' },
    { id: 'audit', label: 'Audit', sub: 'resume decisiones', at: [10.2, 3.4], shape: 'box', tone: 'data', icon: 'scroll', info: 'Revisa el proceso, resume lo que decidió cada agente y entrega el caso a una persona. Es la pieza que hace revisable el trabajo de los demás.' },
    { id: 'human', label: 'Profesional siniestros', sub: 'decisión final', at: [13.6, 0], shape: 'person', tone: 'user', icon: 'hand', info: 'Según Allianz, la responsabilidad final siempre es de un profesional de siniestros y las decisiones de pago nunca se automatizan.' },
    { id: 'pay', label: 'Pago', sub: 'solo si aprueba', at: [13.6, -3.4], shape: 'box', tone: 'tool', icon: 'check', info: 'El pago se ejecuta tras la aprobación humana. En el ejemplo publicado, todo el flujo hasta la revisión humana tomó menos de cinco minutos.' },
  ],
  edges: [
    { from: 'customer', to: 'planner', label: 'reclamo' },
    { from: 'planner', to: 'cyber' },
    { from: 'planner', to: 'coverage', route: 'arc' },
    { from: 'planner', to: 'weather' },
    { from: 'planner', to: 'fraud', route: 'z' },
    { from: 'coverage', to: 'payout' },
    { from: 'weather', to: 'payout' },
    { from: 'payout', to: 'audit' },
    { from: 'audit', to: 'human' },
    { from: 'human', to: 'pay', label: 'aprueba' },
  ],
  code: {
    flujo: { title: 'nemo_flujo.py (ilustrativo, no es código de Allianz)', lang: 'python', source: NEMO_FLUJO },
    politica: { title: 'pagos.cedar (ejemplo de la guía, no de Allianz)', lang: 'text', source: NEMO_CEDAR },
  },
  steps: [
    {
      title: '1 · Un reclamo acotado',
      body: 'Nemo solo atiende reclamos de **baja complejidad y bajo monto** (menos de 500 AUD) por alimentos perdidos tras un corte de luz. Acotar el alcance es la primera decisión de gobernanza: todo lo demás sigue el flujo manual.',
      flows: ['customer>planner'],
      data: {
        title: 'reclamo de entrada (inventado, con el ejemplo de magnitudes de Allianz)',
        lang: 'json',
        content: json({
          reclamo_id: 'CLM-EJEMPLO-1187',
          tipo: 'alimentos_corte_luz',
          monto_aud: 250,
          evento: { descripcion: 'tormenta y corte de luz', horas_sin_luz: 20 },
          fecha_evento: '2025-08-14',
          poliza_id: 'POL-EJEMPLO-5521',
          adjuntos: ['lista_alimentos.pdf', 'foto_refrigerador.jpg'],
        }),
        hl: ['"tipo"', '"monto_aud"'],
      },
      code: { file: 'flujo', hl: ['TOPE_AUD = 500', 'reclamo["monto_aud"] >= TOPE_AUD', 'flujo_manual(reclamo)'] },
    },
    {
      title: '2 · Seguridad como agente',
      body: 'Un agente dedicado vigila la seguridad de los datos durante todo el flujo, en vez de dejarlo implícito en los demás. Allianz no detalla qué controla exactamente: los controles de abajo son ilustrativos.',
      flows: ['planner>cyber'],
      data: {
        title: 'controles del agente Cyber (ilustrativos)',
        lang: 'json',
        content: json({
          agente: 'cyber',
          alcance: 'todo el expediente CLM-EJEMPLO-1187',
          controles: ['cada agente solo lee los campos que necesita', 'datos personales enmascarados en los logs', 'adjuntos escaneados antes de procesarse'],
          alertas: [],
        }),
        hl: ['"controles"'],
      },
      code: { file: 'flujo', hl: ['with cyber_agent.supervisar(expediente)'] },
    },
    {
      title: '3 · Verificaciones especializadas',
      body: 'Cobertura, clima y fraude se comprueban por separado. Cada agente tiene una pregunta concreta que responder, fácil de probar por aislado (en el framework de Allianz Technology hay casos de prueba por herramienta).',
      flows: ['planner>coverage', 'planner>weather', 'planner>fraud'],
      data: {
        title: 'decisiones de los especialistas (ilustrativas)',
        lang: 'json',
        content: json({
          coverage: { ok: true, motivo: 'La póliza cubre pérdida de alimentos por corte de luz tras tormenta.' },
          weather: { ok: true, motivo: 'Hubo una tormenta con cortes de luz en la zona en la fecha del reclamo.' },
          fraud: { ok: true, senales: [], motivo: 'Sin reclamos similares recientes; monto coherente con el evento.' },
        }),
        hl: ['"coverage"', '"weather"', '"fraud"'],
      },
      code: { file: 'flujo', hl: ['coverage_agent(', 'weather_agent(', 'fraud_agent(reclamo)'] },
    },
    {
      title: '4 · Propuesta de monto',
      body: 'Con las verificaciones, el agente de pago calcula un monto. Es una **recomendación**: en el código ilustrativo no existe ninguna ruta por la que este agente pague.',
      flows: ['coverage>payout', 'weather>payout'],
      data: {
        title: 'propuesta del agente Payout (ilustrativa)',
        lang: 'json',
        content: json({ monto_propuesto_aud: 250, base: 'lista de alimentos declarada', estado: 'propuesta', ejecuta_pago: false }),
        hl: ['"estado": "propuesta"', '"ejecuta_pago": false'],
      },
      code: { file: 'flujo', hl: ['if all(x["ok"] for x in d.values())', 'payout_agent(reclamo, d)'] },
    },
    {
      title: '5 · Auditoría y resumen',
      body: 'El agente de auditoría revisa el proceso y resume las decisiones de cada agente para que la persona pueda validarlas rápido. Sin ese resumen, la persona tendría que rehacer el trabajo.',
      flows: ['payout>audit'],
      data: {
        title: 'resumen para la revisión humana (ilustrativo)',
        lang: 'json',
        content: json({
          expediente: 'CLM-EJEMPLO-1187',
          resumen: 'Reclamo de 250 AUD por alimentos tras 20 h sin luz. Cobertura, evento y fraude verificados sin observaciones.',
          decisiones: [
            { agente: 'coverage', resultado: 'cubre' },
            { agente: 'weather', resultado: 'evento confirmado' },
            { agente: 'fraud', resultado: 'sin señales' },
            { agente: 'payout', resultado: 'propone 250 AUD' },
          ],
          requiere: 'decisión de un profesional de siniestros',
        }),
        hl: ['"resumen"', '"requiere"'],
      },
      code: { file: 'flujo', hl: ['audit_agent(expediente)', 'cola_revision.crear(expediente)'] },
    },
    {
      title: '6 · La persona decide',
      body: 'Un profesional de siniestros revisa el resumen y decide. Allianz reporta un 80 % menos de tiempo de procesamiento y liquidación (cifra propia) y, en su ejemplo, menos de cinco minutos desde la presentación hasta la revisión humana.',
      flows: ['audit>human'],
      data: {
        title: 'decisión registrada (ilustrativa)',
        lang: 'json',
        content: json({ expediente_id: 'CLM-EJEMPLO-1187', decision: 'aprobar', monto_aprobado_aud: 250, profesional_id: 'claims-pro-031', comentario: 'Consistente con el evento de la zona.' }),
        hl: ['"decision"', '"profesional_id"'],
      },
      code: { file: 'flujo', hl: ['def al_resolver', 'if revision["decision"] != "aprobar"'] },
    },
    {
      title: '7 · Pago tras aprobación',
      body: 'Solo con aprobación humana se ejecuta el pago. La autonomía está en la preparación, no en la decisión irreversible. Como ejemplo de implementación (de la guía, no de Allianz), una política Cedar en el gateway de herramientas solo permite la tool de pago a un usuario con rol de profesional de siniestros.',
      flows: ['human>pay'],
      data: {
        title: 'decisión de la política en el gateway (ejemplo de la guía)',
        lang: 'json',
        content: json({
          intentos: [
            { principal: 'agente:payout', accion: 'Pagos___ejecutar_pago', decision: 'DENY', motivo: 'sin permit aplicable' },
            { principal: 'claims-pro-031 (role=profesional_siniestros)', accion: 'Pagos___ejecutar_pago', decision: 'ALLOW' },
          ],
        }),
        hl: ['"DENY"', '"ALLOW"'],
      },
      code: { file: 'politica', hl: ['Pagos___ejecutar_pago', 'principal.getTag("role") == "profesional_siniestros"'] },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Patrón común: evals como puerta de producción
// ─────────────────────────────────────────────────────────────────────────────

const GATE = `# Ilustrativo del patrón común (Morgan Stanley + Robinhood); no es código de ninguno.
import json, statistics

def cargar_set_dorado(ruta="evals/set_dorado.jsonl") -> list[dict]:
    return [json.loads(l) for l in open(ruta, encoding="utf-8")]  # fallos reales + QA

def calibrar(juez, etiquetas_humanas: list[dict], minimo: float = 0.9) -> bool:
    acuerdo = statistics.mean(
        juez(e["entrada"], e["salida"], e["dorada"])["pass"] == e["humano_pass"]
        for e in etiquetas_humanas)
    return acuerdo >= minimo        # si no, se ajusta el prompt del juez y se repite

def evaluar(agente, casos: list[dict], juez) -> dict:
    res = []
    for c in casos:
        s = agente.run(c["entrada"])
        res.append({
            "intencion": c["intencion"],
            "tool_f1": f1(s.tools, c["tools_esperadas"]),
            "fallo_duro": bool(set(s.tools) - set(c["tools_esperadas"])),  # tool equivocada
            "juez": juez(c["entrada"], s.texto, c["respuesta_dorada"])["pass"],
        })
    return {"tool_f1": statistics.mean(r["tool_f1"] for r in res),
            "fallos_duros": sum(r["fallo_duro"] for r in res),
            "calidad": statistics.mean(r["juez"] for r in res),
            "por_intencion": promedio_por(res, "intencion", "juez")}

def gate(cand: dict, base: dict) -> bool:
    if cand["fallos_duros"] > base["fallos_duros"]:
        return False
    if cand["tool_f1"] < base["tool_f1"] or cand["calidad"] < base["calidad"]:
        return False
    return all(cand["por_intencion"][i] >= v for i, v in base["por_intencion"].items())

def regresion_diaria(agente_prod, preguntas_muestra, juez):
    fallos = [p for p in preguntas_muestra if not juez(p, agente_prod.run(p).texto)["pass"]]
    agregar_a_revision(fallos)      # expertos escriben la respuesta dorada → set dorado`

export const csfEvalsGate: IsoSpec = {
  id: 'csf-evals-gate',
  title: 'Patrón común: evals como puerta de producción',
  summary:
    'Síntesis de lo publicado por **Morgan Stanley** (evals por caso de uso antes de desplegar, regresión diaria, expertos que califican) y **Robinhood** (set dorado desde casos escalados, juez LLM calibrado por humanos, gate contra baseline). No es la arquitectura de ninguno de los dos. El código y los datos de los paneles son **ilustrativos**: ninguna de las dos empresas publicó umbrales, métricas ni ejemplos de su set dorado.',
  height: 520,
  nodes: [
    { id: 'experts', label: 'Expertos y QA', sub: 'asesores · equipo QA', at: [0, -3.4], shape: 'person', tone: 'user', icon: 'users', info: 'En Morgan Stanley, asesores y prompt engineers calificaron respuestas por exactitud y coherencia. En Robinhood, el equipo de QA escribe la respuesta dorada de cada caso.' },
    { id: 'escal', label: 'Casos escalados', sub: 'donde falló el agente', at: [0, 0], shape: 'doc', tone: 'data', icon: 'flag', info: 'Robinhood toma su set dorado de conversaciones donde el bot falló y entró un humano: los ejemplos más valiosos son los fallos reales.' },
    { id: 'golden', label: 'Set dorado', sub: 'respuestas de expertos', at: [3.4, 0], shape: 'stack', tone: 'data', icon: 'database', info: 'Dataset estratificado por intención y tipo de conversación, ampliado con ejemplos sintéticos y muestreo activo. Las categorías que ya funcionan bien se mantienen en evaluación para detectar regresiones.' },
    { id: 'change', label: 'Cambio candidato', sub: 'prompt · modelo · RAG', at: [3.4, 3.4], shape: 'doc', tone: 'neutral', icon: 'code', info: 'Cualquier cambio (prompt, modelo, método de retrieval, adaptador LoRA) es un candidato que debe pasar la misma batería que la versión actual.' },
    { id: 'suite', label: 'Suite de evals', sub: 'por caso de uso', at: [6.8, 0], shape: 'box', tone: 'guard', icon: 'check', info: 'Evals específicas: resumen y traducción (Morgan Stanley), corrección del routing de herramientas con precision/recall/F1 e intención semántica (Robinhood).' },
    { id: 'judge', label: 'Juez LLM', sub: 'calibrado por humanos', at: [6.8, -3.4], shape: 'sphere', tone: 'model', icon: 'gauge', info: 'Robinhood usa un juez en dos niveles y lo calibra contra revisores humanos, que por sí solos eran inconsistentes (unos laxos, otros estrictos).' },
    { id: 'gate', label: 'Gate de release', sub: 'regresión vs. baseline', at: [10.2, 0], shape: 'diamond', tone: 'guard', icon: 'filter', info: 'Nada se libera si empeora contra la versión actual. Elegir la herramienta equivocada cuenta como fallo duro en el planner de Robinhood.' },
    { id: 'prod', label: 'Agente en producción', sub: 'humano revisa la salida', at: [13.6, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'En Debrief (Morgan Stanley) el asesor revisa y ajusta notas y correos antes de enviarlos. El agente prepara; la persona firma.' },
    { id: 'daily', label: 'Regresión diaria', sub: 'preguntas de muestra', at: [13.6, 3.4], shape: 'box', tone: 'infra', icon: 'timer', info: 'Morgan Stanley corre a diario una suite de regresión con preguntas de muestra para detectar debilidades y salidas no conformes.' },
  ],
  edges: [
    { from: 'escal', to: 'golden' },
    { from: 'experts', to: 'golden', label: 'escriben' },
    { from: 'golden', to: 'suite' },
    { from: 'change', to: 'suite' },
    { from: 'suite', to: 'judge' },
    { from: 'suite', to: 'gate' },
    { from: 'gate', to: 'prod', label: 'aprueba' },
    { from: 'prod', to: 'daily' },
    { from: 'daily', to: 'golden', route: 'arc', dashed: true, label: 'fallos nuevos' },
  ],
  code: { gate: { title: 'gate_evals.py (ilustrativo del patrón)', lang: 'python', source: GATE } },
  steps: [
    {
      title: '1 · El dataset sale de la realidad',
      body: 'Los casos donde el agente falló y los expertos del negocio definen qué es una buena respuesta. Sin esto, cualquier métrica es decorativa. Cada caso lleva la intención, las herramientas que debían usarse y la respuesta que escribió QA.',
      flows: ['escal>golden', 'experts>golden'],
      data: {
        title: 'una línea de set_dorado.jsonl (ilustrativa)',
        lang: 'json',
        content: json({
          id: 'esc-0193',
          origen: 'caso_escalado',
          intencion: 'transferencias',
          entrada: '¿Por qué mi transferencia de ayer sigue pendiente?',
          tools_esperadas: ['consultar_transferencia'],
          respuesta_dorada: 'Explica el estado real de la transferencia y el plazo, sin prometer fechas que el sistema no confirma.',
          escrita_por: 'QA',
        }),
        hl: ['"origen"', '"tools_esperadas"', '"respuesta_dorada"'],
      },
      code: { hl: ['def cargar_set_dorado', 'fallos reales + QA'] },
    },
    {
      title: '2 · Todo cambio es un candidato',
      body: 'Prompt, modelo, método de recuperación o adaptador afinado: todos pasan por la misma batería. Un modelo afinado publicado detrás del mismo alias del gateway no tiene un camino más corto a producción.',
      flows: ['change>suite'],
      focus: ['change', 'suite'],
      data: {
        title: 'descripción del candidato (ilustrativa)',
        lang: 'yaml',
        content: `candidato: planner-soporte
cambio: "modelo afinado con LoRA detrás del alias del gateway"
base: "modelo frontera + trajectory tuning (versión en producción)"
alias_gateway: soporte-planner        # las apps no cambian
suite: evals/soporte.yaml
set_dorado: evals/set_dorado.jsonl`,
        hl: ['cambio:', 'base:'],
      },
      code: { hl: ['def evaluar(agente, casos'] },
    },
    {
      title: '3 · Evals por caso de uso',
      body: 'Cada caso de uso tiene sus métricas (resumen y traducción en Morgan Stanley; routing de herramientas con precision/recall/F1 en Robinhood). Elegir una herramienta que no correspondía cuenta como **fallo duro**.',
      flows: ['golden>suite'],
      data: {
        title: 'resultado por caso (ilustrativo)',
        lang: 'json',
        content: json([
          { id: 'esc-0193', intencion: 'transferencias', tool_f1: 1.0, fallo_duro: false, juez: true },
          { id: 'esc-0207', intencion: 'impuestos', tool_f1: 0.5, fallo_duro: true, juez: false },
          { id: 'esc-0211', intencion: 'cuenta', tool_f1: 1.0, fallo_duro: false, juez: true },
        ]),
        hl: ['"fallo_duro": true'],
      },
      code: { hl: ['"tool_f1": f1(', '"fallo_duro": bool(', 'tool equivocada'] },
    },
    {
      title: '4 · Juez automático, calibrado',
      body: 'Un juez LLM escala la evaluación, pero antes se compara con etiquetas humanas sobre las mismas salidas: Robinhood lo hizo porque sus revisores humanos, solos, eran inconsistentes. Solo si el acuerdo es suficiente se confía en el juez.',
      flows: ['suite>judge', 'judge>suite'],
      data: {
        title: 'calibración juez vs. humanos (ilustrativa)',
        lang: 'json',
        content: json({
          muestras: [
            { id: 'cal-01', humano_pass: true, juez_pass: true },
            { id: 'cal-02', humano_pass: false, juez_pass: false },
            { id: 'cal-03', humano_pass: false, juez_pass: true },
          ],
          acuerdo_minimo: 0.9,
          accion_si_no_alcanza: 'ajustar el prompt del juez y repetir la calibración',
        }),
        hl: ['"acuerdo_minimo"', '"accion_si_no_alcanza"'],
      },
      code: { hl: ['def calibrar(', 'return acuerdo >= minimo'] },
    },
    {
      title: '5 · Gate contra la línea base',
      body: 'La promoción se bloquea si el candidato empeora frente a la versión en producción, también **por categoría**: un promedio que sube puede esconder una intención que empeoró.',
      flows: ['suite>gate', 'gate>prod'],
      data: {
        title: 'decisión del gate (valores ilustrativos)',
        lang: 'json',
        content: json({
          base: { tool_f1: 0.94, fallos_duros: 3, calidad: 0.88, por_intencion: { transferencias: 0.9, impuestos: 0.85 } },
          candidato: { tool_f1: 0.95, fallos_duros: 3, calidad: 0.9, por_intencion: { transferencias: 0.93, impuestos: 0.81 } },
          decision: 'bloqueado',
          motivo: 'regresión en la intención impuestos',
        }),
        hl: ['"decision"', '"motivo"'],
      },
      code: { hl: ['def gate(cand', 'cand["fallos_duros"] > base["fallos_duros"]', 'cand["por_intencion"][i] >= v'] },
    },
    {
      title: '6 · Regresión continua',
      body: 'En producción, una suite diaria con preguntas de muestra detecta deriva y salidas no conformes (Morgan Stanley). Los fallos nuevos vuelven al set dorado con su respuesta escrita por expertos, y cierran el ciclo.',
      flows: ['prod>daily', 'daily>golden'],
      data: {
        title: 'reporte de la regresión diaria (ilustrativo)',
        lang: 'json',
        content: json({
          fecha: '2026-11-06',
          preguntas_muestra: 'suite diaria',
          fallos_nuevos: [{ pregunta: '¿Cómo reporto una transferencia no reconocida?', motivo: 'no ofrece el canal de fraude' }],
          siguiente: 'expertos escriben la respuesta dorada → set_dorado.jsonl',
        }),
        hl: ['"fallos_nuevos"', '"siguiente"'],
      },
      code: { hl: ['def regresion_diaria', 'agregar_a_revision(fallos)'] },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Patrón común: plataforma central multimodelo
// ─────────────────────────────────────────────────────────────────────────────

const PLAT_CONFIG = `# Ilustrativo del patrón (LiteLLM Proxy): no es la configuración de JPMorgan,
# Robinhood ni Allianz, que no publicaron la suya.
model_list:
  - model_name: chat-general            # alias que ven las apps
    litellm_params:
      model: openai/gpt-5.4             # proveedor A
      api_key: os.environ/OPENAI_API_KEY
  - model_name: chat-razonamiento
    litellm_params:
      model: bedrock/global.anthropic.claude-sonnet-5-5   # proveedor B
      aws_region_name: us-east-1
  # Un modelo afinado (p. ej. importado en Bedrock) se publica con su propio alias:
  # las apps no saben qué modelo responde.

router_settings:
  fallbacks: [{"chat-general": ["chat-razonamiento"]}]

litellm_settings:
  callbacks: ["otel"]                   # cada llamada queda trazada

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL # claves, presupuestos y gasto por app`

const PLAT_REGISTRO = `# Ilustrativo: registrar una app/agente con dueño, modelos permitidos y presupuesto.
curl -s -X POST "$AI_GATEWAY_URL/key/generate" \\
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H "Content-Type: application/json" \\
  -d '{"models": ["chat-general", "chat-razonamiento"],
       "max_budget": 1500, "budget_duration": "30d",
       "metadata": {"app": "asistente-research", "dueno": "equipo-wealth",
                    "centro_costo": "WM-221"}}'`

export const csfPlataforma: IsoSpec = {
  id: 'csf-plataforma',
  title: 'Patrón común: plataforma central multimodelo',
  summary:
    'Síntesis de **JPMorgan** (LLM Suite: portal propio sobre modelos de varios proveedores, ampliado cada ~8 semanas), **Robinhood** (LLM Gateway que oculta el modelo) y **Allianz** (control plane para registrar y gobernar agentes). Ninguno publica su arquitectura completa: esto es el patrón, no su diagrama. La configuración y los datos de los paneles son un ejemplo **ilustrativo** con LiteLLM Proxy, el AI gateway que usa esta guía.',
  height: 500,
  nodes: [
    { id: 'users', label: 'Empleados', sub: 'toda la organización', at: [0, 0], shape: 'person', tone: 'user', icon: 'users', info: 'En JPMorgan, ~250.000 empleados con acceso (septiembre de 2025, cifra del banco): toda la plantilla salvo sucursales y call center.' },
    { id: 'portal', label: 'Plataforma / gateway', sub: 'un punto de entrada', at: [3.4, 0], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Un solo punto por donde pasan todas las llamadas a modelos. Permite cambiar de proveedor sin tocar las aplicaciones y aplicar controles una sola vez.' },
    { id: 'registry', label: 'Control plane', sub: 'registro · costos', at: [3.4, -3.4], shape: 'box', tone: 'infra', icon: 'list', info: 'Allianz describe un control plane interno para descubrir, configurar, monitorear y gobernar agentes, con control de costos ("agentic ops").' },
    { id: 'logs', label: 'Logs y trazas', sub: 'auditoría', at: [3.4, 3.4], shape: 'cylinder', tone: 'data', icon: 'scroll', info: 'Allianz menciona trazas con razonamiento, timestamps y logs de auditoría para cumplimiento. Centralizar el acceso a modelos es lo que hace posible un registro completo.' },
    { id: 'mA', label: 'Modelo proveedor A', sub: 'p. ej. OpenAI', at: [6.8, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'LLM Suite usa modelos de OpenAI y Anthropic según CNBC (septiembre de 2025).' },
    { id: 'mB', label: 'Modelo proveedor B', sub: 'o modelo afinado', at: [10.2, -3.4], shape: 'sphere', tone: 'model', icon: 'sparkles', info: 'Robinhood sirve modelos afinados con LoRA detrás de su gateway (Bedrock Custom Model Import): las aplicaciones no saben qué modelo responde.' },
    { id: 'tools', label: 'Conectores', sub: 'datos y apps internas', at: [6.8, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'JPMorgan amplía LLM Suite cada ~8 semanas conectándolo a más bases de datos y aplicaciones de sus negocios. Las capacidades crecen por conectores, no por modelos nuevos.' },
    { id: 'systems', label: 'Sistemas internos', sub: 'research · CRM · core', at: [10.2, 0], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Datos propietarios: research, CRM, sistemas de operaciones. Es donde está el valor y también el riesgo.' },
  ],
  edges: [
    { from: 'users', to: 'portal' },
    { from: 'portal', to: 'registry' },
    { from: 'portal', to: 'logs', dashed: true },
    { from: 'portal', to: 'mA', route: 'arc' },
    { from: 'portal', to: 'mB', route: 'arc' },
    { from: 'portal', to: 'tools' },
    { from: 'tools', to: 'systems' },
  ],
  code: {
    config: { title: 'config.yaml (ilustrativo del patrón)', lang: 'yaml', source: PLAT_CONFIG },
    registro: { title: 'registrar_app.sh (ilustrativo)', lang: 'bash', source: PLAT_REGISTRO },
  },
  steps: [
    {
      title: '1 · Un solo punto de entrada',
      body: 'Empleados y aplicaciones acceden a la IA por una plataforma interna, no por herramientas de consumo ni claves sueltas de proveedores. La app solo conoce el gateway, un **alias** de modelo y su clave virtual.',
      flows: ['users>portal'],
      data: {
        title: 'petición de una app interna al gateway (ilustrativa)',
        lang: 'http',
        content: `POST /v1/chat/completions HTTP/1.1
Host: ai-gateway.interno
Authorization: Bearer sk-clave-virtual-asistente-research

${json({ model: 'chat-general', messages: [{ role: 'user', content: 'Resume los cambios de rating del sector energía de esta semana' }] })}`,
        hl: ['Authorization', '"model"'],
      },
      code: { file: 'config', hl: ['model_name: chat-general'] },
    },
    {
      title: '2 · Registro y costos',
      body: 'Cada agente o app se registra: quién es el dueño, qué modelos puede usar y cuánto gasta. Es lo que Allianz describe como su *control plane* y lo que permite atribuir costos por equipo.',
      flows: ['portal>registry'],
      data: {
        title: 'registro de la app en el gateway (forma simplificada)',
        lang: 'json',
        content: json({
          key_alias: 'asistente-research',
          info: {
            models: ['chat-general', 'chat-razonamiento'],
            max_budget: 1500,
            budget_duration: '30d',
            spend: 412.37,
            metadata: { app: 'asistente-research', dueno: 'equipo-wealth', centro_costo: 'WM-221' },
          },
        }),
        hl: ['"models"', '"spend"', '"dueno"'],
      },
      code: { file: 'registro', hl: ['/key/generate', '"max_budget": 1500', '"dueno": "equipo-wealth"'] },
    },
    {
      title: '3 · Modelos intercambiables',
      body: 'La plataforma enruta a varios proveedores o a modelos afinados. Cambiar de modelo es **configuración**, no un proyecto: se edita el destino de un alias y las aplicaciones no se enteran.',
      flows: ['portal>mA', 'portal>mB'],
      data: {
        title: 'resolución de alias y fallback (ilustrativa)',
        lang: 'json',
        content: json({
          alias_pedido: 'chat-general',
          destino: 'openai/gpt-5.4',
          resultado: 'timeout',
          fallback: { alias: 'chat-razonamiento', destino: 'bedrock/global.anthropic.claude-sonnet-5-5', resultado: 'ok' },
          visible_para_la_app: 'solo el alias',
        }),
        hl: ['"alias_pedido"', '"fallback"'],
      },
      code: { file: 'config', hl: ['model: openai/gpt-5.4', 'model: bedrock/global.anthropic.claude-sonnet-5-5', 'fallbacks:'] },
    },
    {
      title: '4 · Capacidades vía conectores',
      body: 'El valor crece al conectar datos y aplicaciones internas, con una cadencia de releases (JPMorgan: ~8 semanas). Un conector bien gobernado (p. ej. un servidor MCP detrás de un gateway de herramientas) suma capacidades sin tocar los modelos.',
      flows: ['portal>tools', 'tools>systems'],
      data: {
        title: 'tools/call a un conector interno (ilustrativo)',
        lang: 'json',
        content: json({
          request: { jsonrpc: '2.0', id: 21, method: 'tools/call', params: { name: 'research___buscar_reportes', arguments: { sector: 'energia', desde: '2026-11-02' } } },
          response: { result: { structuredContent: { reportes: [{ id: 'RPT-EJEMPLO-77', titulo: 'Perspectiva sector energía', fecha: '2026-11-04' }] }, isError: false } },
        }),
        hl: ['"tools/call"', '"structuredContent"'],
      },
    },
    {
      title: '5 · Todo queda registrado',
      body: 'Como todo pasa por un mismo lugar, el registro de prompts, respuestas, costos y tool calls es completo y auditable. Allianz menciona trazas con razonamiento, timestamps y logs de auditoría.',
      flows: ['portal>logs'],
      data: {
        title: 'registro de auditoría de una llamada (ilustrativo)',
        lang: 'json',
        content: json({
          timestamp: '2026-11-06T14:02:11Z',
          app: 'asistente-research',
          usuario: 'empleado:48812',
          alias: 'chat-general',
          modelo_real: 'bedrock/global.anthropic.claude-sonnet-5-5',
          fallback: true,
          tokens: { input: 1830, output: 412 },
          costo_usd: 0.012,
          tool_calls: ['research___buscar_reportes'],
        }),
        hl: ['"modelo_real"', '"costo_usd"', '"tool_calls"'],
      },
      code: { file: 'config', hl: ['callbacks: ["otel"]', 'database_url: os.environ/DATABASE_URL'] },
    },
  ],
}
