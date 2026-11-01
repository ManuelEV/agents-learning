# Notas de investigación: caso-servicios-financieros

Investigación hecha el 1 de noviembre de 2026. Cada dato lleva URL y fecha de la fuente. "AR" = auto-reportado por la empresa o su proveedor (no verificado de forma independiente).

## Criterios

- Fuentes primarias primero: páginas de la empresa, casos del proveedor, sesiones grabadas (AWS re:Invent en el canal oficial AWS Events).
- Las sesiones de re:Invent se consultaron a través de resúmenes basados en transcripción automática (dev.to/kazuya_dev, ZenML LLMOps Database). Los títulos y la autoría de los videos se verificaron con el oEmbed de YouTube. Cualquier cifra que solo aparece en esas transcripciones se marca como tal.
- Los casos de estudio de OpenAI y AWS son material comercial: lo indicamos en la página.

---

## 1. Morgan Stanley Wealth Management + OpenAI (evals antes de desplegar)

Fuente principal: OpenAI, "Morgan Stanley uses AI evals to shape the future of financial services", https://openai.com/index/morgan-stanley/ — `publicationDateText: December 4, 2024` (descargada el 2026-11-01). Caso de estudio del proveedor (marketing).

- Herramientas: AI @ Morgan Stanley Assistant (chatbot interno para asesores, GPT-4) y AI @ Morgan Stanley Debrief (resúmenes de reuniones, Whisper + GPT-4).
- Framework de evaluación para **cada caso de uso antes del despliegue**; evals con feedback de expertos en cada paso.
- Primeros evals: de resumen (condensar capital intelectual y contenido de procesos). Asesores y prompt engineers calificaron respuestas por exactitud y coherencia; luego evals de traducción para clientes multilingües; trabajo con OpenAI para ajustar métodos de recuperación.
- Cita de David Wu: pasaron de responder 7.000 preguntas a "cualquier pregunta" de un corpus de 100.000 documentos (AR).
- Debrief: convierte grabaciones de Zoom (con consentimiento del cliente) en notas que se integran al CRM y borradores de seguimiento; **el asesor revisa y ajusta antes de finalizar** (humano en el loop). Datasets de evaluación con distintos tipos de reunión para medir captura de action items sin errores.
- Controles: QA integrado al framework de evals; **pruebas diarias con una suite de regresión** de preguntas de muestra; política de **zero data retention** de OpenAI.
- Resultados (AR): más del 98 % de los equipos de asesores usan el Assistant; acceso a documentos de 20 % a 80 %; seguimientos que tomaban días ahora en horas (cita de Kaitlin Elliott).
- Planes: extender el Assistant al grupo de valores institucionales ("super app").
- Límites: no publican arquitectura, tasas de error ni umbrales de los evals; las cifras son de la empresa y del proveedor.

## 2. JPMorgan Chase — LLM Suite (plataforma multimodelo para toda la empresa)

- JPMorganChase Technology Blog, "LLM Suite named 2025 Innovation of the Year by American Banker", https://www.jpmorganchase.com/about/technology/blog/llmsuite-ab-award — 2025-06-03.
  - Plataforma propietaria de IA generativa; acceso a LLMs en un entorno protegido.
  - Lanzada en verano de 2024 a empleados elegibles; **de 0 a 200.000 usuarios en ocho meses** (AR).
  - Próximos pasos declarados: integrar más fuentes de datos internas y combinar IA generativa con workflows para crear agentes que ejecuten series de acciones.
  - "North Star": posicionarla como hub de IA para empleados (Derek Waldron, Chief Analytics Officer).
- CNBC, "Here's JPMorgan Chase's blueprint to become the world's first fully AI-powered megabank", https://www.cnbc.com/2025/09/30/jpmorgan-chase-fully-ai-connected-megabank.html — 2025-09-30 (prensa, entrevista exclusiva).
  - LLM Suite es un portal creado por el banco para usar modelos de proveedores líderes; enlaza a OpenAI y Anthropic.
  - Se actualiza **cada ocho semanas** a medida que se conecta a más bases de datos y aplicaciones.
  - ~250.000 empleados con acceso (toda la plantilla salvo sucursales y call center); la mitad lo usa aproximadamente a diario (Waldron, AR).
  - Inició despliegue de IA agéntica para tareas multipaso, según hoja de ruta interna entregada por el banco.
  - Demo: deck de banca de inversión de cinco páginas en ~30 segundos.
  - Presupuesto tecnológico anual: 18.000 millones de dólares.
  - Próximo: IA generativa interactuando directamente con clientes, empezando con casos limitados.
  - Waldron: los empleados pasan de "makers" a "checkers".
- No verificado: cifras de 2026 (p. ej. "230.000 usuarios", "permisos escalonados para agentes", presupuesto de 19.800 millones) aparecen solo en fuentes secundarias de calidad dispar. No se usaron.
- Límites: no hay arquitectura pública de LLM Suite (gateway, guardrails, logging) ni métricas independientes.

## 3. Moody's — sistema multiagente en AWS (Research Assistant, AI Studio, Agentic Solutions)

- AWS re:Invent 2025, sesión IND3303 "Moody's: Architecting a multi-agent system on AWS", Samuel Baruffi (AWS) y Dennis Clement (Moody's). Video: https://www.youtube.com/watch?v=HC8jSzNmNpU (canal AWS Events; diciembre de 2025). Detalle tomado de resúmenes basados en transcripción:
  - https://dev.to/kazuya_dev/aws-reinvent-2025-moodys-architecting-a-multi-agent-system-on-aws-ind3303-37h7 (auto-generado; puede tener errores)
  - https://www.zenml.io/llmops-database/multi-agent-ai-system-for-financial-intelligence-and-risk-analysis
  - Evolución: chatbot RAG básico → Research Assistant (lanzado dic. 2023; carga de PDF en ago. 2024) → sistema multiagente.
  - Requisito declarado: exactitud de 99 %+ en decisiones de alto impacto (objetivo, no resultado medido).
  - Herramientas: ~80, como funciones **AWS Lambda** single-purpose y stateless, compartidas entre workflows.
  - Agentes simples definidos en **JSON** (system prompt, herramientas curadas, pasos de validación); agentes complejos en código sobre **Amazon ECS**.
  - **Orquestador propio** (ECS) que interpreta definiciones JSON, paraleliza pasos, respeta dependencias, maneja throttling; diseñado para ~20 pasos, hoy workflows de clientes de hasta ~400 pasos.
  - Modelo por agente/paso (razonamiento vs. modelos pequeños). Diseñador visual de workflows.
  - 100+ workflows; >1 millón de tokens/día; picos de ~50x en eventos crediticios → diseño serverless.
  - PDFs: cuatro enfoques fallidos (extracción Python, bounding boxes, FM multimodal, contexto de 1M tokens). Solución: **clasificar páginas** y enrutar: texto → LLM de Bedrock a markdown; tablas → **Bedrock Data Automation**; gráficos → modelo de visión que genera metadatos para búsqueda.
  - Bedrock Knowledge Bases con chunking personalizado en Lambda.
  - **Recuperación agéntica**: descompone la consulta, varias búsquedas, reflexiona, itera y devuelve chunks **con citas**; expuesta como herramienta.
  - Residencia: **inferencia entre regiones geográfica** (UE/EE. UU.) para regulación; global para capacidad.
  - Gobernanza: citas como prioridad, aislamiento de datos, AgentCore Identity y Observability **en evaluación** (no en producción confirmada) para registrar cada paso, llamada al LLM y tool call.
  - Resultados (AR, Research Assistant): 60 % más rápido para obtener insights, 30 % menos tiempo de tarea.
  - Lecciones: fronteras de contexto y agentes especializados > ajuste de prompts; no casarse con un modelo; "un agente es un for-loop con mejor PR" (Clement).
- Moody's, "Moody's Agentic Solutions" (blog), https://www.moodys.com/web/en/us/creditview/blog/agentic-solutions-announcement.html — 2025-09-16: agentes para crédito, monitoreo de portafolio, inteligencia comercial y KYC; >590 millones de entidades.
- Moody's (Business Wire), "Moody's brings decision-grade credit intelligence to AWS Marketplace", https://www.moodys.com/web/en/us/media-relations/press-releases/moodys-brings-decision-grade-credit-intelligence-to-aws-marketplace.html — 2026-04-16: MAS Credit Memo en AWS Marketplace; "context layer" gobernado; salidas explicables y trazables a datos fuente; 600 millones de entidades y 2.000 millones de vínculos de propiedad.
- No verificado: "más de 50 agentes" y "memo de crédito de 40 horas a 2 minutos" (PYMNTS, septiembre de 2025, fuente secundaria; no aparece en el texto del comunicado que pudimos leer).

## 4. Allianz — Project Nemo (siete agentes, decisión humana final)

- Allianz SE, "When the storm clears, so should the claim queue", https://www.allianz.com/en/mediacenter/news/articles/251103-when-the-storm-clears-so-should-the-claim-queue.html — 2025-11-03.
  - Lanzado en Australia en julio de 2025; en producción en menos de 100 días.
  - Reclamos de baja complejidad por **alimentos echados a perder** tras cortes de luz por tormentas; **reclamos menores a 500 AUD**.
  - Siete agentes: planner, cyber (seguridad de datos), coverage, weather, fraud, payout, audit (resume decisiones y pasa al humano).
  - **Las decisiones de pago nunca se automatizan**: la responsabilidad final es de un profesional de siniestros.
  - Resultado (AR): 80 % menos tiempo de procesamiento y liquidación (Maria Janssen); de varios días a ~un día o incluso horas (Thomas Baach). Ejemplo: menos de 5 minutos desde la presentación hasta la revisión humana final.
  - La oficial de ciberseguridad de Australia supervisó el diseño del proceso de gobernanza.
  - Próximos: retrasos de viaje, siniestros simples de auto, evaluación de daños a la propiedad.
  - **No menciona** modelos ni nube.
- AWS re:Invent 2025, INV209 "The next frontier: Building the agentic future of Financial Services", Axel Schell (CTO, Allianz Technology SE). Video: https://www.youtube.com/watch?v=_Wi_4I40bqQ (AWS Events). Resumen basado en transcripción: https://dev.to/kazuya_dev/aws-reinvent-2025-the-next-frontier-building-the-agentic-future-of-financial-services-inv209-55pa
  - Framework multiagente agnóstico de modelo construido con AWS, sobre **Amazon Bedrock**, usa mucho **MCP**, **LangGraph** y **AWS Fargate**.
  - Tres niveles de agentes: utilitarios (documentos, voz, email), de negocio (case management, policy assurance), planners.
  - "Agent control plane" interno: marketplace para descubrir, configurar, monitorear y gobernar agentes, con control de costos ("agentic ops") y prompt playground; "Gen AI mesh" con registro y descubrimiento.
  - Gobernanza: casos de prueba por herramienta; trazas con razonamiento, timestamps y logs de auditoría.
  - Presenta el ejemplo de siete agentes para reclamos por alimentos (no lo llama "Nemo" en la transcripción).
- AWS for Industries, "Financial institutions advance mission-critical workloads and agentic AI at re:Invent 2025", https://aws.amazon.com/blogs/industries/financial-institutions-advance-mission-critical-workloads-and-agentic-ai-at-reinvent-2025 — 2026-01-14. Resume: Allianz Technology, siete agentes, 80 % menos tiempo "desde unos 100 días". **Inconsistencia**: Allianz dice "de varios días a ~un día"; la cifra "100 días" parece confundir el tiempo de construcción con el de procesamiento. Usamos la versión de Allianz.
- No verificado: que Nemo en producción corra exactamente sobre el stack Bedrock/LangGraph descrito en INV209 (probable pero no confirmado por Allianz).

## 5. Robinhood — agentes con gateway de LLM, evals primero y fine-tuning

- AWS re:Invent 2025, IND392 "Fine-tuning models for accuracy and latency at Robinhood Markets", Nikhil Singhal y Davide Giovanardi (Robinhood), Viraj Padte (AWS). Video: https://www.youtube.com/watch?v=vQ8P-_u2tH4 (AWS Events). Resumen basado en transcripción: https://dev.to/kazuya_dev/aws-reinvent-2025-fine-tuning-models-for-accuracy-and-latency-at-robinhood-markets-ind392-1d6c
  - Casos: Cortex Digest (por qué se movió una acción), indicadores/scans en lenguaje natural, agente de soporte (CX) con tres etapas: intención → planner/selección de herramientas → respuesta final.
  - **Robinhood LLM Gateway**: capa de abstracción; los ingenieros llaman una API sin saber qué modelo hay detrás.
  - Bedrock (inferencia y Custom Model Import para modelos afinados), SageMaker (JumpStart y training jobs).
  - Hoja de ruta de ajuste: prompt tuning → trajectory tuning (few-shot dinámico desde vector DB con respuestas doradas anotadas) → fine-tuning LoRA.
  - Evals: plano de control unificado (ingeniería, producto, datos alineados en criterios), evaluación híbrida (LLM-as-judge + feedback humano + datasets curados), benchmark contra baseline.
  - Dataset dorado tomado de **casos escalados** (donde el bot falló y entró un humano); el equipo de QA escribe la respuesta dorada; expansión sintética y muestreo activo; ~15.000 ejemplos de entrenamiento.
  - Juez LLM en dos niveles, calibrado con revisiones humanas (que eran inconsistentes).
  - Métricas del planner: corrección categórica (precision/recall/F1; herramienta equivocada = fallo duro) e intención semántica.
  - Gating: los modelos solo se liberan tras regresión basada en evals contra la línea base.
  - Resultado (AR, transcripción): latencia de la etapa del agente CX de 3–6 s a 1–2 s (>50 %), con corrección categórica igual al modelo frontera con trajectory tuning.
  - Guardrails bloquean respuestas bajo un umbral de calidad (Cortex Digest debe ser equilibrado y conforme).
- AWS for Industries (2026-01-14, misma URL de arriba): confirma la sesión sobre tuning y evaluación de agentes en producción (CX, Cortex Digest, trading en lenguaje natural).

## Contexto regulatorio (para la sección de gobernanza)

- Orrick, "Agencies Overhaul Model Risk Management Guidance for Banks: Here's What Changed", https://www.orrick.com/en/Insights/2026/04/Agencies-Overhaul-Model-Risk-Management-Guidance-for-Banks-Heres-What-Changed — 2026-04-24. OCC, Fed y FDIC emitieron el 2026-04-17 la guía revisada de riesgo de modelo, que reemplaza SR 11-7 (2011); una nota al pie **excluye los modelos de IA generativa y agéntica** por ser "novedosos y de rápida evolución"; las agencias planean una consulta (RFI) sobre IA. La guía no es vinculante.
- AI Act (UE): acuerdo político provisional del 7 de mayo de 2026 (Digital Omnibus) que aplaza al 2 de diciembre de 2027 las obligaciones de sistemas de alto riesgo del Anexo III (incluye evaluación de solvencia de personas y tarificación de seguros de vida y salud). Fuente: Gibson Dunn, https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/ (2026-05-27). Adopción formal no confirmada en nuestra búsqueda.

## Casos breves / descartados

- **BBVA + OpenAI**: OpenAI, https://openai.com/index/bbva-collaboration-expansion/ — 2025-12-12; BBVA, https://www.bbva.com/en/innovation/bbva-and-openai-seal-a-strategic-alliance-to-redefine-banking-with-artificial-intelligence/ — 2025-12-12. ChatGPT Enterprise a 120.000 empleados en 25 países (10x); inicio en mayo de 2024 con 3.300 cuentas; fase de 11.000 empleados: >80 % uso diario y ~3 h/semana ahorradas (AR); herramientas para agentes internos conectados a sistemas BBVA; "alter ego" digital que ejecuta tareas con autorización y supervisión del empleado; asistente Blue sobre modelos OpenAI. **Solo mención**: no hay arquitectura ni mecanismos de gobernanza públicos más allá de "controles de seguridad y privacidad".
- **Itaú Unibanco**: agente de inversiones (junio 2025), asistente ia.i (2026-07-27, PDF de Itaú), informes con AWS/GFT (>60 % menos tiempo). Sin detalle técnico de arquitectura de agentes ni del proveedor de modelos → descartado.
- **Goldman Sachs** (GS AI Assistant, pruebas con Devin): poca información técnica primaria sobre gobernanza; Devin ya está cubierto en caso-migraciones-codigo → descartado.
- **Nubank**: cubierto en caso-migraciones-codigo.
- **Klarna**: cubierto en caso-atencion-cliente.
- **NAB, Prudential, Visa** (menciones en re:Invent 2025 vía AWS for Industries): sin detalle técnico suficiente.
- **Retail (Rufus, Walmart, Mercado Libre)**: no incluidos; la página se centra en industrias reguladas y no encontramos detalle de gobernanza comparable en fuentes primarias dentro del tiempo disponible.
