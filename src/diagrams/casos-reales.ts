import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/**
 * Esqueleto ILUSTRATIVO de la anatomía común. No es el código de ninguna empresa:
 * sirve para ubicar en qué línea vive cada pieza que los casos publicaron por separado.
 */
const ANATOMIA = `# Ilustrativo del patrón común: no es el código de ninguna empresa.
# Los módulos (plataforma, contexto, verificacion) son nombres de ejemplo.
from plataforma import ai_gateway, mcp_gateway, trazas
from contexto import buscar_contexto
from verificacion import verificar, derivar_a_humano

INSTRUCCIONES = "Eres el asistente de soporte de la tienda. Responde solo con las fuentes."

def atender(evento: dict) -> dict:
    usuario, pregunta = evento["user"], evento["text"]            # 1 · canal existente
    with trazas.span("agente.atender", usuario=usuario) as span:   # 7 · todo queda trazado
        fuentes = buscar_contexto(pregunta, usuario=usuario, k=6)   # 2 · contexto curado
        messages = [{"role": "user", "content": f"{fuentes}\\n\\n{pregunta}"}]
        for _ in range(6):                                          # límite de turnos
            r = ai_gateway.completion(                              # 3 · modelos tras un gateway
                model="claude-sonnet",                              #     alias, no ID de proveedor
                system=INSTRUCCIONES, messages=messages,
                tools=mcp_gateway.list_tools(agente="soporte"),
                metadata={"equipo": "cx", "caso_uso": "pedidos"})
            messages.append(r.message)
            if not r.tool_calls:
                break
            for call in r.tool_calls:                               # 4 · tools vía gateway MCP
                res = mcp_gateway.call_tool(call.name, call.arguments,
                                            on_behalf_of=usuario)   #     con la identidad del usuario
                messages.append(tool_result(call.id, res))
        veredicto = verificar(r.text, fuentes=fuentes, propuesta=r.propuesta)  # 5 · oráculo
        span.set_attribute("verificacion.resultado", veredicto.resultado)
        if veredicto.resultado != "ok":                             # 6 · humano si hay riesgo
            return derivar_a_humano(evento, messages, veredicto)
        return {"text": r.text, "citas": veredicto.citas}`

export const casosAnatomia: IsoSpec = {
  id: 'casos-anatomia',
  title: 'Anatomía común de un sistema agéntico a escala',
  summary:
    '**Síntesis propia** a partir de los casos de esta sección, no la arquitectura de una empresa concreta. Cada pieza aparece en varios casos publicados; recorre los pasos para ver cuáles. Las cifras son las que reporta cada empresa, con su fecha. Para que se vea cómo encaja cada pieza, los paneles **Datos** y **Código** siguen un ejemplo **ilustrativo** (una devolución en el chat de una tienda): no son datos ni código de ninguna de las empresas citadas.',
  height: 560,
  nodes: [
    { id: 'user', label: 'Usuarios y canales', sub: 'donde ya trabajan', at: [0, 0], shape: 'person', tone: 'user', icon: 'users', info: 'Los casos con más adopción integran el agente en herramientas existentes: LinkedIn multiplicó 5–10x el uso de SQL Bot al llevarlo a DARWIN; Uber Genie vive en Slack; Salesforce Help atiende en su sitio de soporte.' },
    { id: 'orq', label: 'Agente / orquestador', sub: 'workflow o agente', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Desde un workflow con pasos LLM (Google, Uber QueryGPT) hasta un orquestador con subagentes (Anthropic Research, Allianz Nemo). La mayoría de los casos usa la forma más simple que resuelve el problema.' },
    { id: 'evals', label: 'Evals y trazas', sub: 'flywheel continuo', at: [3.4, -3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'Morgan Stanley evalúa cada caso de uso antes de desplegar; DoorDash simula conversaciones con más de 50 jueces calibrados; Robinhood bloquea cambios que no superan la línea base en su set dorado.' },
    { id: 'ctx', label: 'Contexto curado', sub: 'catálogos · RAG · rerank', at: [3.4, 3.4], shape: 'stack', tone: 'data', icon: 'layers', info: 'Es donde más se invierte. LinkedIn SQL Bot sube de 9 % a 53 % de respuestas bien evaluadas al pasar de solo esquemas a su grafo de conocimiento; Intercom entrenó su propio reranker para Fin.' },
    { id: 'aigw', label: 'AI gateway', sub: 'cuotas · costos · PII', at: [6.8, -3.4], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Un punto único hacia los modelos: Uber GenAI Gateway (16 M consultas/mes, jul-2024), AI Gateway interno de Cloudflare (20 M solicitudes en 30 días, abr-2026), LLM Gateway de Robinhood, LLM Suite multimodelo de JPMorgan.' },
    { id: 'llm', label: 'Modelos', sub: 'varios proveedores', at: [10.8, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Casi ningún caso depende de un solo modelo: combinan proveedores, modelos pequeños o afinados para etapas de latencia crítica (Robinhood con LoRA, Intercom con su reranker) y modelos grandes para razonar.' },
    { id: 'mcpgw', label: 'Gateway de tools', sub: 'registro MCP', at: [6.8, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Uber pone más de 800 servidores MCP y 5.000 tools detrás de un MCP Gateway con registro (oct-2026); Block cura sus servidores MCP internos para goose; Moody’s expone ~80 herramientas en Lambda.' },
    { id: 'systems', label: 'Sistemas internos', sub: 'APIs · datos · código', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'database', info: 'Pedidos, CRM, data warehouse, repositorios. El acceso se hace con identidad y permisos del usuario o del agente, nunca con credenciales compartidas embebidas en el prompt.' },
    { id: 'verify', label: 'Verificación', sub: 'tests · reglas · juez', at: [6.8, 3.4], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Oráculos deterministas (compilador y tests en Airbnb, Google, Spotify) y, donde no los hay, guardrails y jueces LLM: DoorDash bajó 90 % las alucinaciones con un guardrail en dos niveles; el juez de Spotify veta ~1 de cada 4 sesiones.' },
    { id: 'human', label: 'Humano en el loop', sub: 'PR · handoff · firma', at: [10.2, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'Revisión del PR en las migraciones, handoff a agente humano en soporte, decisión humana en pagos de seguros (Allianz nunca automatiza el pago), revisión del asesor en Morgan Stanley.' },
  ],
  edges: [
    { from: 'user', to: 'orq' },
    { from: 'orq', to: 'evals', route: 'z', dashed: true },
    { from: 'orq', to: 'ctx', route: 'z' },
    { from: 'orq', to: 'aigw', route: 'arc' },
    { from: 'aigw', to: 'llm' },
    { from: 'orq', to: 'mcpgw' },
    { from: 'mcpgw', to: 'systems' },
    { from: 'orq', to: 'verify', route: 'arc' },
    { from: 'verify', to: 'human' },
  ],
  code: { agente: { title: 'agente_tipo.py (ilustrativo del patrón)', lang: 'python', source: ANATOMIA } },
  steps: [
    {
      title: '1 · Entrar por donde ya trabaja la gente',
      body: 'La adopción depende más del canal que del modelo. LinkedIn multiplicó **5–10x** el uso de SQL Bot al integrarlo en su plataforma de notebooks; Uber Genie responde en los canales de Slack de on-call. Para el agente, el canal es solo un evento con el usuario autenticado y su texto.',
      flows: ['user>orq'],
      data: {
        title: 'evento que llega del canal (ilustrativo)',
        lang: 'http',
        content: `POST /chat/mensajes HTTP/1.1
Host: agente-soporte.interno
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.sesion-del-cliente
Content-Type: application/json

${json({ canal: 'web', user: 'cliente:88213', text: 'Quiero devolver el pedido 4512, la chaqueta me quedó chica' })}`,
        hl: ['Authorization', '"user"', '"text"'],
      },
      code: { hl: ['def atender', 'usuario, pregunta = evento["user"]'] },
    },
    {
      title: '2 · El contexto curado es el trabajo duro',
      body: 'Catálogos de tablas, documentación deduplicada, reranking. En el paper de LinkedIn, con solo esquemas el modelo logra **9 %** de respuestas bien evaluadas; con su grafo de conocimiento, **53 %**. Salesforce descubrió que artículos duplicados confundían la recuperación. Lo que entra al prompt son pocas fuentes buenas, con su origen.',
      flows: ['ctx>orq'],
      data: {
        title: 'fuentes recuperadas y reordenadas (ilustrativo)',
        lang: 'json',
        content: json({
          consulta: 'devolución por talla, pedido 4512',
          candidatos_recuperados: 40,
          fuentes: [
            { id: 'politica-devoluciones-v7', score: 0.91, fragmento: 'Cambios y devoluciones dentro de 30 días con la boleta y el producto sin uso.' },
            { id: 'faq-tallas-3', score: 0.84, fragmento: 'El cambio de talla no tiene costo si hay stock.' },
          ],
          descartadas: { duplicado: 3, desactualizado: 1 },
        }),
        hl: ['"fuentes"', '"descartadas"'],
      },
      code: { hl: ['buscar_contexto(pregunta', 'messages = [{"role": "user"'] },
    },
    {
      title: '3 · Modelos detrás de un gateway',
      body: 'Uber, Cloudflare, Robinhood y JPMorgan centralizan el acceso a modelos: claves, cuotas, costos por equipo, PII y cambio de proveedor sin tocar a los agentes. Es exactamente el rol de un *AI gateway* corporativo: el agente pide un **alias** con una clave virtual de su equipo.',
      flows: ['orq>aigw', 'aigw>llm'],
      data: {
        title: 'petición al AI gateway (forma simplificada, API compatible OpenAI)',
        lang: 'http',
        content: `POST /v1/chat/completions HTTP/1.1
Host: ai-gateway.interno
Authorization: Bearer sk-clave-virtual-equipo-cx

${json({
  model: 'claude-sonnet',
  metadata: { equipo: 'cx', caso_uso: 'pedidos' },
  messages: [
    { role: 'system', content: 'Eres el asistente de soporte de la tienda. Responde solo con las fuentes.' },
    { role: 'user', content: '[fuentes]\n\nQuiero devolver el pedido 4512, la chaqueta me quedó chica' },
  ],
  tools: [{ type: 'function', function: { name: 'pedidos___consultar_pedido' } }],
})}`,
        hl: ['Authorization', '"model"', '"metadata"'],
      },
      code: { hl: ['ai_gateway.completion(', 'model="claude-sonnet"', 'metadata={"equipo"'] },
    },
    {
      title: '4 · Herramientas con registro y control',
      body: 'Cuando hay cientos de equipos, las tools se publican en un registro y se exponen por un gateway: Uber tiene **800+ servidores MCP** y **5.000+ tools** detrás del suyo (oct-2026). Así se aplican autenticación, permisos y auditoría en un solo lugar, con la identidad del usuario y no con una credencial compartida.',
      flows: ['orq>mcpgw', 'mcpgw>systems'],
      data: {
        title: 'tools/call a través del gateway MCP (ilustrativo)',
        lang: 'json',
        content: json({
          request: { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'pedidos___consultar_pedido', arguments: { pedido_id: '4512' } } },
          response: {
            jsonrpc: '2.0',
            id: 3,
            result: { structuredContent: { pedido_id: '4512', estado: 'entregado', dias_desde_entrega: 6, total_clp: 89990 }, isError: false },
          },
        }),
        hl: ['"tools/call"', '"structuredContent"'],
      },
      code: { hl: ['for call in r.tool_calls', 'mcp_gateway.call_tool(', 'on_behalf_of=usuario'] },
    },
    {
      title: '5 · Verificar antes de actuar',
      body: 'Los casos más exitosos tienen un **oráculo**: el compilador y los tests en las migraciones (Airbnb, Google, Spotify). Donde no hay oráculo, usan guardrails y jueces LLM calibrados (DoorDash, Spotify, Robinhood). La verificación revisa la respuesta **y** la acción propuesta con reglas deterministas.',
      flows: ['orq>verify'],
      data: {
        title: 'resultado de la verificación (ilustrativo)',
        lang: 'json',
        content: json({
          fundamentada: true,
          citas: ['politica-devoluciones-v7', 'faq-tallas-3'],
          propuesta: { accion: 'crear_devolucion', pedido_id: '4512', monto_clp: 89990 },
          reglas: [
            { regla: 'dentro_de_30_dias', ok: true },
            { regla: 'monto_clp <= 50000 sin aprobación', ok: false },
          ],
          resultado: 'requiere_aprobacion',
        }),
        hl: ['"fundamentada"', '"ok": false', '"resultado"'],
      },
      code: { hl: ['veredicto = verificar(', 'span.set_attribute'] },
    },
    {
      title: '6 · Humano donde el riesgo lo exige',
      body: 'Revisión del PR, handoff a soporte humano, firma en pagos. Salesforce **subió** el umbral de derivación a humano de 1 % a ~5 % al ver que su agente impedía llegar a una persona. El handoff lleva un resumen estructurado para que la persona no rehaga el trabajo.',
      flows: ['verify>human'],
      data: {
        title: 'solicitud de aprobación al humano (ilustrativo)',
        lang: 'json',
        content: json({
          tipo: 'aprobacion',
          motivo: 'monto_clp <= 50000 sin aprobación',
          resumen: 'Cliente pide devolver chaqueta (pedido 4512) por talla, a 6 días de la entrega. Cumple la política de 30 días.',
          propuesta: { accion: 'crear_devolucion', monto_clp: 89990 },
          evidencia: ['politica-devoluciones-v7', 'pedidos___consultar_pedido#3'],
          opciones: ['aprobar', 'rechazar', 'tomar_conversacion'],
        }),
        hl: ['"tipo"', '"resumen"', '"opciones"'],
      },
      code: { hl: ['if veredicto.resultado != "ok"', 'derivar_a_humano('] },
    },
    {
      title: '7 · Evals y trazas cierran el ciclo',
      body: 'Morgan Stanley no despliega un caso de uso sin evals aprobadas por expertos; DoorDash simula conversaciones con jueces antes de cada cambio; Anthropic evalúa su sistema de investigación con LLM-judge más revisión humana. Cada traza con su veredicto puede convertirse en un caso del set de evaluación.',
      flows: ['orq>evals'],
      data: {
        title: 'span OpenTelemetry de la llamada al modelo (ilustrativo)',
        lang: 'json',
        content: json({
          name: 'chat claude-sonnet',
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.request.model': 'claude-sonnet',
            'gen_ai.usage.input_tokens': 2140,
            'gen_ai.usage.output_tokens': 188,
            'verificacion.resultado': 'requiere_aprobacion',
            'equipo': 'cx',
          },
          parent: 'agente.atender',
        }),
        hl: ['"gen_ai.usage.input_tokens"', '"verificacion.resultado"'],
      },
      code: { hl: ['trazas.span("agente.atender"', 'span.set_attribute'] },
    },
  ],
}

/** Cinco formas ILUSTRATIVAS de resolver una tarea, de menos a más autonomía. */
const NIVELES = `# Ilustrativo: la forma de cada nivel. No es el código de ninguna empresa.

# 1 · Workflow: el código decide la ruta; el LLM es un paso acotado
def workflow(pregunta):
    pasajes = reordenar(pregunta, recuperar(pregunta, k=40))[:5]
    borrador = llm(f"Responde solo con estas fuentes:\\n{pasajes}\\n\\n{pregunta}")
    return borrador if validar(borrador, pasajes) else escalar(pregunta)

# 2 · Agente único: el modelo elige herramientas en un loop
def agente(objetivo, tools, max_turnos=10):
    msgs = [{"role": "user", "content": objetivo}]
    for _ in range(max_turnos):
        r = llm(msgs, tools=tools)
        if not r.tool_calls:
            return r.text
        msgs += ejecutar(r.tool_calls, tools)

# 3 · Agente + verificador: itera contra un oráculo
def agente_con_oraculo(tarea, max_intentos=5):
    feedback = ""
    for _ in range(max_intentos):
        cambio = agente(tarea + feedback, tools=TOOLS_CODIGO)
        ok, salida = correr_tests(cambio)              # compilador, linters, tests
        if ok and juez_aprueba(cambio):
            return abrir_pr(cambio)                    # un humano revisa el PR
        feedback = f"\\nFallaron los tests:\\n{salida}"
    return escalar(tarea)

# 4 · Orquestador: subagentes en paralelo sobre partes independientes
async def orquestador(pregunta):
    plan = llm(f"Divide en subtemas independientes: {pregunta}")
    hallazgos = await asyncio.gather(*[subagente(t) for t in plan.subtemas])
    return llm(f"Sintetiza con citas:\\n{hallazgos}")

# 5 · Plataforma: el agente es configuración sobre servicios compartidos
registrar_agente(
    nombre="soporte-pedidos", dueno="equipo-cx",
    modelo="claude-sonnet",                  # alias del AI gateway
    tools=["mcp://pedidos", "mcp://devoluciones"],   # registro MCP
    presupuesto_usd_mes=2000, evals="evals/soporte.jsonl",
)`

export const casosEscalera: IsoSpec = {
  id: 'casos-escalera',
  title: 'Qué nivel de autonomía eligió cada caso',
  summary:
    'Clasificación propia de los casos de esta sección según la arquitectura que publicaron. Subir de nivel da más flexibilidad a cambio de **más costo, latencia y dificultad para evaluar**; varios de los casos más grandes se quedan deliberadamente abajo. El panel **Código** muestra la forma de cada nivel en un esqueleto **ilustrativo**, y **Datos** resume quién decide la ruta en cada uno.',
  height: 440,
  nodes: [
    { id: 'wf', label: 'Workflow con LLM', sub: 'pasos fijos', at: [0, 0], shape: 'box', tone: 'tool', icon: 'workflow', info: 'Google (migraciones int32→int64), Uber QueryGPT (agentes de intención, tablas y columnas en secuencia), Intercom Fin (recuperar → reordenar → generar → validar), Meta (causa raíz: recuperación + ranking con LLM).' },
    { id: 'single', label: 'Agente único', sub: 'loop + tools', at: [3.4, -1.2], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Block goose (un agente general con muchos servidores MCP), OpenAI deep research (un agente entrenado de punta a punta), Uber Genie en on-call.' },
    { id: 'verif', label: 'Agente + verificador', sub: 'oráculo o juez', at: [6.8, -2.4], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Airbnb y Spotify Honk (agente que itera contra linters, compilador y tests), DoorDash (respuesta + guardrail en dos niveles), Robinhood (juez calibrado como gate).' },
    { id: 'multi', label: 'Orquestador', sub: '+ subagentes en paralelo', at: [10.2, -3.6], shape: 'tall', tone: 'agent', icon: 'network', info: 'Anthropic Research (orquestador que lanza subagentes en paralelo), Allianz Nemo (siete agentes para reclamos), Moody’s (orquestador propio con agentes definidos en JSON), Exa, Thomson Reuters.' },
    { id: 'plat', label: 'Plataforma de agentes', sub: 'cientos de equipos', at: [13.6, -4.8], shape: 'cloud', tone: 'infra', icon: 'boxes', info: 'Uber (GenAI Gateway + MCP Gateway + Agent Builder), Deutsche Telekom (Eclipse LMOS sobre Kubernetes), LinkedIn (agentes sobre su sistema de mensajería), Cloudflare y Block.' },
  ],
  edges: [
    { from: 'wf', to: 'single', route: 'arc' },
    { from: 'single', to: 'verif', route: 'arc' },
    { from: 'verif', to: 'multi', route: 'arc' },
    { from: 'multi', to: 'plat', route: 'arc' },
  ],
  code: { niveles: { title: 'niveles.py (ilustrativo)', lang: 'python', source: NIVELES } },
  steps: [
    {
      title: 'Workflow con pasos LLM',
      body: 'Muchos de los resultados más sólidos vienen de **pipelines fijos** con el LLM en pasos acotados: Google generó el **74 %** de los cambios de sus migraciones `int32→int64` así (2025). Son baratos, predecibles y fáciles de evaluar: cada paso tiene una entrada y una salida que se pueden probar por separado.',
      focus: ['wf'],
      data: {
        title: 'quién decide la ruta (resumen propio)',
        lang: 'json',
        content: json({
          nivel: 'workflow',
          decide_la_ruta: 'el código',
          llamadas_al_llm: 'fijas, una por paso',
          traza_tipica: ['recuperar', 'reordenar', 'llm: generar', 'validar', 'responder o escalar'],
          casos: ['Google int32→int64', 'Uber QueryGPT', 'Intercom Fin', 'Meta (causa raíz)'],
        }),
        hl: ['"decide_la_ruta"', '"traza_tipica"'],
      },
      code: { hl: ['def workflow(pregunta)', 'reordenar(pregunta, recuperar(', 'validar(borrador, pasajes)'] },
    },
    {
      title: 'Agente único con herramientas',
      body: 'Un loop con buenas tools cubre más de lo que parece. Block llevó **goose** a ~12.000 empleados (dic-2025) con un solo agente general y servidores MCP curados, sin multiagente. Aquí el **modelo** decide qué herramienta usar y cuándo parar; el código solo pone límites.',
      flows: ['wf>single'],
      data: {
        title: 'quién decide la ruta (resumen propio)',
        lang: 'json',
        content: json({
          nivel: 'agente_unico',
          decide_la_ruta: 'el modelo, turno a turno',
          llamadas_al_llm: 'variables, hasta max_turnos',
          traza_tipica: ['llm → tool_use', 'tool_result', 'llm → tool_use', 'tool_result', 'llm → end_turn'],
          casos: ['Block goose', 'OpenAI deep research', 'Uber Genie'],
        }),
        hl: ['"decide_la_ruta"', '"llamadas_al_llm"'],
      },
      code: { hl: ['def agente(objetivo', 'for _ in range(max_turnos)', 'if not r.tool_calls'] },
    },
    {
      title: 'Agente más verificador',
      body: 'El salto de calidad más repetido: dejar que el agente itere contra un **oráculo**. Airbnb migró ~3.500 archivos de tests en 6 semanas; Spotify fusionó más de 1.500 PRs con Honk, con un juez que veta ~1 de cada 4 sesiones. El feedback del oráculo vuelve al agente como contexto del siguiente intento.',
      flows: ['single>verif'],
      data: {
        title: 'quién decide la ruta (resumen propio)',
        lang: 'json',
        content: json({
          nivel: 'agente_mas_verificador',
          decide_la_ruta: 'el modelo, pero el oráculo decide si termina',
          oraculos: ['compilador', 'linters', 'tests', 'juez LLM calibrado'],
          traza_tipica: ['agente: cambio', 'tests: fallan', 'agente: corrige', 'tests: pasan', 'juez: aprueba', 'PR para revisión humana'],
          casos: ['Airbnb', 'Spotify Honk', 'DoorDash', 'Robinhood'],
        }),
        hl: ['"oraculos"', '"juez: aprueba"'],
      },
      code: { hl: ['def agente_con_oraculo', 'correr_tests(cambio)', 'juez_aprueba(cambio)', 'feedback = f'] },
    },
    {
      title: 'Orquestador con subagentes',
      body: 'Rinde en tareas **amplias y paralelizables**: el sistema de Anthropic mejora **90,2 %** a su agente único en su eval interna, pero gasta ~**15x** los tokens de un chat. Cognition argumenta lo contrario para tareas con mucho estado compartido.',
      flows: ['verif>multi'],
      data: {
        title: 'quién decide la ruta (resumen propio)',
        lang: 'json',
        content: json({
          nivel: 'orquestador',
          decide_la_ruta: 'el orquestador reparte; cada subagente decide la suya',
          paralelismo: 'subtemas independientes al mismo tiempo',
          costo: '~15x los tokens de un chat (Anthropic, jun-2025)',
          cuando_no: 'tareas con mucho estado compartido (argumento de Cognition)',
          casos: ['Anthropic Research', 'Allianz Nemo', "Moody's", 'Exa', 'Thomson Reuters'],
        }),
        hl: ['"paralelismo"', '"costo"', '"cuando_no"'],
      },
      code: { hl: ['async def orquestador', 'asyncio.gather(', 'Sintetiza con citas'] },
    },
    {
      title: 'Plataforma para cientos de equipos',
      body: 'Cuando hay muchos agentes, el problema pasa a ser de **plataforma**: gateway de modelos, registro de tools, identidad, observabilidad y catálogo. Es el nivel de Uber, Deutsche Telekom, LinkedIn y Cloudflare. Un agente nuevo se parece más a una **configuración registrada** que a un proyecto.',
      flows: ['multi>plat'],
      data: {
        title: 'quién decide la ruta (resumen propio)',
        lang: 'json',
        content: json({
          nivel: 'plataforma',
          problema_principal: 'gobernar muchos agentes, no construir uno',
          servicios_compartidos: ['AI gateway', 'registro y gateway MCP', 'identidad', 'observabilidad', 'catálogo de agentes'],
          casos: ['Uber', 'Deutsche Telekom (Eclipse LMOS)', 'LinkedIn', 'Cloudflare', 'Block'],
        }),
        hl: ['"servicios_compartidos"'],
      },
      code: { hl: ['registrar_agente(', 'modelo="claude-sonnet"', 'tools=["mcp://pedidos"', 'presupuesto_usd_mes'] },
    },
  ],
}
