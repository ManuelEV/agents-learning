# Notas de investigación: sistemas multiagente de investigación en producción

> Verificado el 01-11-2026 con WebFetch/WebSearch. "Auto-reportado" = cifra publicada por la propia empresa, sin auditoría independiente. "(no verificado)" = no se pudo leer la fuente primaria.

## 1. Anthropic — Research (sistema multiagente de investigación) — CASO ANCLA

Fuente primaria: "How we built our multi-agent research system", Anthropic Engineering, **2025-06-13**. Autores: Jeremy Hadfield, Barry Zhang, Kenneth Lien, Florian Scholz, Jeremy Fox, Daniel Ford.
https://www.anthropic.com/engineering/multi-agent-research-system

- Patrón **orquestador-trabajadores**: un agente líder (LeadResearcher) analiza la consulta, define estrategia, lanza subagentes en paralelo y sintetiza; decide si hace falta más investigación.
- Subagentes: contexto propio, herramientas, prompt y límites de tarea; buscan iterativamente y devuelven hallazgos condensados al líder.
- Memoria: el líder guarda su plan en memoria porque el contexto se trunca más allá de **200.000 tokens**.
- **CitationAgent**: recibe documentos + informe y ubica las citas para que cada afirmación quede atribuida.
- Contraste con RAG estático: búsqueda multi-paso que se adapta a lo que encuentra.
- Modelos (jun 2025): líder **Claude Opus 4**, subagentes **Claude Sonnet 4**. Extended thinking para planificar; interleaved thinking tras resultados de herramientas.
- Cifras (auto-reportadas, eval interna, jun 2025):
  - Multiagente (Opus 4 + Sonnet 4) supera a Opus 4 agente único en **90,2 %** en eval interna de investigación.
  - En BrowseComp, tres factores explican **95 %** de la varianza; el uso de tokens solo explica **80 %** (los otros: número de tool calls y elección de modelo).
  - Agentes ≈ **4×** tokens vs chat; multiagente ≈ **15×**.
  - Pasar a Sonnet 4 dio más ganancia que duplicar el presupuesto de tokens en Sonnet 3.7.
  - Líder lanza **3–5** subagentes en paralelo; cada subagente usa **3+** herramientas en paralelo → tiempo de investigación **hasta −90 %** en consultas complejas.
  - Reescritura de descripciones de herramientas por un agente: **−40 %** tiempo de tarea.
  - Eval inicial con **~20** consultas reales. Fallo temprano: lanzar **50** subagentes para consultas simples.
- Reglas de esfuerzo en el prompt: hecho simple = 1 agente, 3–10 tool calls; comparación = 2–4 subagentes, 10–15 calls c/u; investigación compleja = más de 10 subagentes.
- Principios de prompting: pensar como los agentes (simular y observar paso a paso); enseñar a delegar (objetivo, formato de salida, guía de herramientas/fuentes, límites); escalar esfuerzo; diseñar herramientas (propósito distinto, descripción clara); dejar que los agentes mejoren prompts/herramientas; empezar amplio y luego acotar; guiar el pensamiento; paralelizar. Heurísticas de calidad de fuentes para evitar sesgo hacia granjas SEO.
- Evaluación: empezar con ~20 casos; **LLM-as-judge** con rúbrica (precisión factual, precisión de citas, completitud, calidad de fuentes, eficiencia de herramientas); una sola llamada con puntaje 0,0–1,0 y pass/fail fue lo más alineado con humanos; evaluación humana detecta alucinaciones raras y sesgos de fuentes; evaluar resultado/estado final, no el camino.
- Producción: agentes con estado → errores se componen; **ejecución durable** que reanuda desde el punto de falla; combinar adaptabilidad del modelo (avisarle que una herramienta falla) con reintentos deterministas y **checkpoints**. Tracing completo en producción; monitoreo de patrones de decisión sin monitorear contenido de conversaciones (privacidad). **Rainbow deployments** (tráfico gradual entre versiones que corren a la vez).
- Cuello de botella: ejecución **síncrona** (el líder espera cada lote; un subagente lento bloquea todo; no hay coordinación entre subagentes). Asíncrono = más paralelismo pero más complejidad (coordinación, consistencia de estado, propagación de errores).
- Cuándo sí: tareas de alto valor, muy paralelizables, información que excede una ventana de contexto, muchas herramientas. Cuándo no: dominios que requieren contexto compartido o muchas dependencias entre agentes; la mayoría de tareas de código tienen menos partes paralelizables.
- Apéndice: resumir fases completas y guardar en memoria externa; al acercarse al límite, lanzar subagentes frescos con handoff; **artefactos en sistema de archivos** (subagentes escriben resultados fuera y pasan referencias livianas → evita "teléfono roto" y tokens).
- Uso (análisis Clio): desarrollo de software especializado 10 %, contenido profesional 8 %, estrategia de negocio 8 %, investigación académica 7 %, verificación de información sobre personas/lugares/organizaciones 5 %.

## 2. LinkedIn — Hiring Assistant

Fuente primaria: "How we engineered LinkedIn's Hiring Assistant", LinkedIn Engineering, **2025-10-21**. Autor: Xiaoyang Gu (con Xie Lu y Daniel Hewlett).
https://www.linkedin.com/blog/engineering/ai/how-we-engineered-linkedins-hiring-assistant

- **Plan-and-execute**: planner genera plan estructurado; executor lo ejecuta paso a paso con bucle ReAct para herramientas. Elegido sobre ReAct puro por seguimiento de instrucciones, control de alucinaciones, costo/latencia.
- Una instancia de Hiring Assistant **por reclutador**, con identidad y **buzón** propios; ciclo de vida guiado por **mensajería asíncrona** en la plataforma de agentes.
- **Supervisor**: planificador y orquestador central; toda interacción pasa por él; enruta tareas, gestiona workflows, observa cambios del entorno, presenta tareas que requieren aprobación humana.
- Sub-agentes **modelados como herramientas** (sin identidad ni buzón propio): intake, sourcing (Recruiter Search, Recommended Matches), evaluation, candidate outreach, candidate screening, learning, cognitive memory.
- Memoria cognitiva persistente, acotada al entorno del reclutador; **no se usa para entrenar LLMs**.
- Evaluación de candidatos con **LLMs propios afinados**; **speculative decoding** para evaluar en segundos.
- Calidad: benchmarks por escenario; marco con dos pilares: política de producto (jueces LLM) y alineación humana (datasets anotados + actividad de reclutadores). Sin métricas de precisión publicadas.
- HITL: reclutador aprueba calificaciones antes de evaluar; decisión final humana; cambios del learning agent requieren aprobación.
- Escala: sourcing y evaluación sobre **1.200+ millones de perfiles**; jobs de fondo sobre millones de perfiles; refresco diario.
- Plataforma: plataforma/framework de agentes GenAI, SDK cliente, API GraphQL (UI dirigida por servidor/agente), canal pub-sub en tiempo real.
- El post **no menciona LangGraph** ni modelos concretos. Computer Weekly (prensa) reporta LangGraph — no pude leer el artículo (403); tratar como no verificado.

Resultados (auto-reportados): news.linkedin.com, **2025-09-03**, https://news.linkedin.com/2025/hiring-assistant-globally-available
- Early adopters: **4+ horas ahorradas por vacante**, **62 % menos perfiles revisados**, **+69 % aceptación de InMail**. Sin metodología ni muestra publicada.
- Lanzado a charter customers en oct 2024; global en inglés a fines de sep 2025.

## 3. Thomson Reuters — Deep Research (Westlaw Advantage / CoCounsel Legal)

Fuentes:
- TR Innovation blog, Mike Dahn, **2025-08-05**: https://www.thomsonreuters.com/en-us/posts/innovation/thomson-reuters-is-changing-legal-research-forever-meet-deep-research/
  - Planifica estrategia, revisa resultados, cambia de rumbo; **múltiples agentes ejecutan herramientas de investigación en paralelo**; herramientas KeyCite, Key Numbers, Precision Research, anotaciones de leyes; contenido curado de Westlaw y Practical Law. Más de un año probando modelos frontera; **más de 1.200 clientes** revisaron/probaron diseños y planes. No es un wrapper de deep research de proveedores. Sin métricas de precisión.
- Press release TR, **2025-08-05**: https://www.thomsonreuters.com/en/press-releases/2025/august/thomson-reuters-launches-cocounsel-legal-transforming-legal-work-with-agentic-ai-and-deep-research — plan de investigación multi-paso, razonamiento trazable, informes con citas.
- Constellation Research, Larry Dignan, **2025-08-05** (entrevista a David Wong, CPO, y Omar Bari, VP Applied Research TR Labs): https://www.constellationr.com/insights/news/thomson-reuters-brings-agentic-ai-legal-workflows
  - Agentes de investigación, planificación, descubrimiento y orquestación; lanzamiento en paralelo; "We built the agent scaffolding ourselves" (framework propio); contenido expuesto vía herramientas; modelos de OpenAI, Google y Anthropic según tarea; producción exige ajuste continuo de function calling, instrucciones, evaluación, memoria y orquestación.
- TR Labs (Medium), "Deep Research in Westlaw and CoCounsel: Building Agents that Research Like Lawyers" (2025): https://medium.com/tr-labs-ml-engineering-blog/deep-research-in-westlaw-and-cocounsel-building-agents-that-research-like-lawyers-508ad5c70e45 — **no pude leerlo (403)**. Resumen secundario de ZenML LLMOps DB: https://zenml.io/llmops-database/agentic-ai-for-legal-research-building-deep-research-in-westlaw-and-cocounsel
  - (vía ZenML, no verificado en original) componentes por tipo de documento (jurisprudencia, leyes, fuentes secundarias); criterios de parada difíciles; funciones de Westlaw reconstruidas como bloques para agentes (buscar, abrir documento, KeyCite, seguir referencias); **Claude 4** para orquestación de herramientas al lanzamiento, agnóstico de modelo; evaluación con objetivos editoriales (completitud, corrección) y decenas de rúbricas, evaluadores calibrados con humanos + revisión manual costosa; "generation-verification loop"; análisis más completos **~10 minutos**; retos: ruido vs exhaustividad, lenguaje legal, límite de contexto.

## 4. Exa — Deep research agent (API)

Fuente: LangChain blog (caso de cliente, auto-reportado), **2025-06-30**: https://www.langchain.com/blog/exa
- Construido íntegramente en **LangGraph**; observabilidad con **LangSmith**.
- Roles: **planner** (genera tareas paralelas), **tasks** (unidades independientes con herramientas de Exa, instrucciones específicas y **esquema JSON** obligatorio), **observer** (contexto completo: planificación, razonamiento, salidas, citas).
- Las tareas solo ven las salidas finales limpias de otras tareas, no su razonamiento intermedio.
- Número de tareas dinámico según complejidad.
- Primero razona sobre **snippets**; pide contenido completo solo si no alcanza → menos tokens.
- Salida estructurada (function calling), formato definible en runtime; pensado para consumidores de API.
- LangSmith: tokens, tasas de caching, tokens de razonamiento → alimentó el modelo de **precios**.
- Escala: **cientos de consultas diarias**; **15 s a 3 min** por consulta.
- Inspirado explícitamente en el sistema de Anthropic. Modelos no nombrados.

## 5. Contraste: OpenAI deep research (agente único entrenado con RL)

- "Introducing deep research", OpenAI, **2025-02-02** (PDF del post, metadatos 21-02-2025): https://openai.com/index/introducing-deep-research/ (copia PDF: https://cdn.openai.com/API/docs/deep_research_blog.pdf)
  - Entrenado con **aprendizaje por refuerzo de punta a punta** en tareas difíciles de navegación y razonamiento; tareas reales con browser y Python.
  - Puede tardar **5 a 30 minutos**.
  - Humanity's Last Exam: **26,6 %** (feb 2025).
  - Limitaciones: puede alucinar, débil en calibración de confianza; **muy intensivo en cómputo**.
- System card, **2025-02-25**: https://cdn.openai.com/deep-research-system-card.pdf — impulsado por una versión temprana de **o3** optimizada para navegación.
- Público: no describe arquitectura multiagente; es un modelo/agente único entrenado para la tarea.

## 6. Contrapunto: Cognition, "Don't Build Multi-Agents"

- Walden Yan, **2025-06-12**: https://cognition.com/blog/dont-build-multi-agents
- Principios: compartir contexto (trazas completas) y "las acciones llevan decisiones implícitas". Subagentes en paralelo producen trabajo inconsistente (ejemplo Flappy Bird). Recomienda agente lineal de un hilo + compresión de historial para tareas largas. Subagentes aceptables para preguntas bien definidas, no para escribir código en paralelo.

## Descartados / no usados

- **Harvey**: post propio "Integrating Deep Research into Harvey" (2025-07-03, https://www.harvey.ai/blog/integrating-deep-research-into-harvey; afirma integración del API de OpenAI en menos de 12 h, auto-reportado; usado solo como mención) — es integración del API de deep research de OpenAI, no un sistema multiagente propio documentado. Otros posts (Agent Technical Diagram, ago 2025) no se pudieron leer. Sin detalle técnico sólido verificado.
- **Genentech gRED Research Agent** (AWS case study, sin fecha; © 2026): Claude 3.5 Sonnet en Bedrock Agents; la arquitectura de **sub-agentes especializados (PubMed, Single Cell Hub) está "en desarrollo"**; 43.000 horas es una **proyección**. https://aws.amazon.com/solutions/case-studies/genentech-generativeai-case-study/ — no es multiagente en producción.
- **AWS "Build context-rich research agents with Deep Agents and Bedrock AgentCore"** (AWS ML Blog, 2026; fecha inconsistente entre agregadores): https://aws.amazon.com/blogs/machine-learning/build-context-rich-research-agents-with-deep-agents-and-bedrock-agentcore/ — es tutorial de referencia, no caso de cliente. Útil como "cómo hacerlo en AgentCore" (subagentes de navegador en paralelo en microVMs de AgentCore Browser; secuencial tardaría hasta 3× más, según el post — no leído en original, vía resultados de búsqueda).
- **Perplexity, Elastic, Rakuten**: no encontré documentación técnica primaria de una arquitectura multiagente de investigación con cifras; no investigados a fondo.

## APIs de código (ADK)
- `ParallelAgent`, `SequentialAgent`, `LlmAgent` con `output_key` y plantillas `{clave}` en instruction: ver docs/research/01-frameworks.md (https://adk.dev/agents/workflow-agents/parallel-agents/). En ADK 2.0 Python los workflow agents están "superseded" por graph workflows, pero siguen funcionando.
