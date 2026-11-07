import type { IsoSpec } from '../components/iso/types'

export const casosAnatomia: IsoSpec = {
  id: 'casos-anatomia',
  title: 'Anatomía común de un sistema agéntico a escala',
  summary:
    '**Síntesis propia** a partir de los casos de esta sección, no la arquitectura de una empresa concreta. Cada pieza aparece en varios casos publicados; recorre los pasos para ver cuáles. Las cifras son las que reporta cada empresa, con su fecha.',
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
  steps: [
    { title: '1 · Entrar por donde ya trabaja la gente', body: 'La adopción depende más del canal que del modelo. LinkedIn multiplicó **5–10x** el uso de SQL Bot al integrarlo en su plataforma de notebooks; Uber Genie responde en los canales de Slack de on-call.', flows: ['user>orq'] },
    { title: '2 · El contexto curado es el trabajo duro', body: 'Catálogos de tablas, documentación deduplicada, reranking. En el paper de LinkedIn, con solo esquemas el modelo logra **9 %** de respuestas bien evaluadas; con su grafo de conocimiento, **53 %**. Salesforce descubrió que artículos duplicados confundían la recuperación.', flows: ['ctx>orq'] },
    { title: '3 · Modelos detrás de un gateway', body: 'Uber, Cloudflare, Robinhood y JPMorgan centralizan el acceso a modelos: claves, cuotas, costos por equipo, PII y cambio de proveedor sin tocar a los agentes. Es exactamente el rol de un *AI gateway* corporativo.', flows: ['orq>aigw', 'aigw>llm'] },
    { title: '4 · Herramientas con registro y control', body: 'Cuando hay cientos de equipos, las tools se publican en un registro y se exponen por un gateway: Uber tiene **800+ servidores MCP** y **5.000+ tools** detrás del suyo (oct-2026). Así se aplican autenticación, permisos y auditoría en un solo lugar.', flows: ['orq>mcpgw', 'mcpgw>systems'] },
    { title: '5 · Verificar antes de actuar', body: 'Los casos más exitosos tienen un **oráculo**: el compilador y los tests en las migraciones (Airbnb, Google, Spotify). Donde no hay oráculo, usan guardrails y jueces LLM calibrados (DoorDash, Spotify, Robinhood).', flows: ['orq>verify'] },
    { title: '6 · Humano donde el riesgo lo exige', body: 'Revisión del PR, handoff a soporte humano, firma en pagos. Salesforce **subió** el umbral de derivación a humano de 1 % a ~5 % al ver que su agente impedía llegar a una persona.', flows: ['verify>human'] },
    { title: '7 · Evals y trazas cierran el ciclo', body: 'Morgan Stanley no despliega un caso de uso sin evals aprobadas por expertos; DoorDash simula conversaciones con jueces antes de cada cambio; Anthropic evalúa su sistema de investigación con LLM-judge más revisión humana.', flows: ['orq>evals'] },
  ],
}

export const casosEscalera: IsoSpec = {
  id: 'casos-escalera',
  title: 'Qué nivel de autonomía eligió cada caso',
  summary:
    'Clasificación propia de los casos de esta sección según la arquitectura que publicaron. Subir de nivel da más flexibilidad a cambio de **más costo, latencia y dificultad para evaluar**; varios de los casos más grandes se quedan deliberadamente abajo.',
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
  steps: [
    { title: 'Workflow con pasos LLM', body: 'Muchos de los resultados más sólidos vienen de **pipelines fijos** con el LLM en pasos acotados: Google generó el **74 %** de los cambios de sus migraciones `int32→int64` así (2025). Son baratos, predecibles y fáciles de evaluar.', focus: ['wf'] },
    { title: 'Agente único con herramientas', body: 'Un loop con buenas tools cubre más de lo que parece. Block llevó **goose** a ~12.000 empleados (dic-2025) con un solo agente general y servidores MCP curados, sin multiagente.', flows: ['wf>single'] },
    { title: 'Agente más verificador', body: 'El salto de calidad más repetido: dejar que el agente itere contra un **oráculo**. Airbnb migró ~3.500 archivos de tests en 6 semanas; Spotify fusionó más de 1.500 PRs con Honk, con un juez que veta ~1 de cada 4 sesiones.', flows: ['single>verif'] },
    { title: 'Orquestador con subagentes', body: 'Rinde en tareas **amplias y paralelizables**: el sistema de Anthropic mejora **90,2 %** a su agente único en su eval interna, pero gasta ~**15x** los tokens de un chat. Cognition argumenta lo contrario para tareas con mucho estado compartido.', flows: ['verif>multi'] },
    { title: 'Plataforma para cientos de equipos', body: 'Cuando hay muchos agentes, el problema pasa a ser de **plataforma**: gateway de modelos, registro de tools, identidad, observabilidad y catálogo. Es el nivel de Uber, Deutsche Telekom, LinkedIn y Cloudflare.', flows: ['multi>plat'] },
  ],
}
