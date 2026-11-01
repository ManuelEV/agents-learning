# Notas de investigación: casos reales de agentes en atención al cliente

Investigado el 1 de noviembre de 2026. Cada dato lleva la fuente (URL) y la fecha de publicación de la fuente.
Convención: **[empresa]** = cifra auto-reportada por la empresa o su proveedor; **[prensa]** = medio que cita a la empresa; **[3ro]** = resumen de terceros (no primario). No encontré verificaciones independientes (auditorías) de ninguna de las cifras de resolución.

---

## 1. Klarna — asistente de IA con OpenAI (2024) → modelo híbrido (2025–2026)

### Cifras de lanzamiento (feb. 2024)
Fuente: nota de prensa de Klarna, 27-feb-2024 — https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/ **[empresa]**
- 2,3 millones de conversaciones en el primer mes = dos tercios de los chats de atención.
- "Equivalente al trabajo de 700 agentes a tiempo completo".
- Tiempo de resolución: < 2 min vs. 11 min antes.
- 25 % menos consultas repetidas.
- 23 mercados, 24/7, más de 35 idiomas.
- Estimación: mejora de USD 40 millones en beneficio en 2024 (proyección, no resultado).

### Arquitectura (lo publicado)
Fuente: LangChain, caso de cliente, 12-feb-2025 — https://www.langchain.com/blog/customers-klarna **[proveedor]**
- Construido sobre **LangGraph** ("arquitectura de agente controlable"), luego evolucionó a **sistema multiagente**.
- Prompts adaptados a escenarios específicos (menos tokens y latencia).
- **LangSmith** para trazas paso a paso y desarrollo guiado por pruebas; evaluaciones con LLM.
- Cifras citadas por LangChain: 85 M usuarios activos, "~70 % de tareas repetitivas automatizadas", resolución promedio −80 % en 9 meses.
- El modelo subyacente (OpenAI) lo menciona la nota de Klarna de 2024 ("powered by OpenAI"). No hay detalle público de herramientas, RAG ni guardrails.
- No pude abrir https://openai.com/index/klarna/ (403).

### Giro de 2025
Fuente: CX Dive, 9-may-2025, citando entrevista de Bloomberg del 8-may-2025 — https://www.customerexperiencedive.com/news/klarna-reinvests-human-talent-customer-service-AI-chatbot/747586/ **[prensa]**
- Siemiatkowski: "As cost unfortunately seems to have been a too predominant evaluation factor when organizing this, what you end up having is lower quality."
- "Really investing in the quality of the human support is the way of the future for us."
- "...so critical that you are clear to your customer that there will be always a human if you want".
- Según CX Dive, el chatbot seguía atendiendo dos tercios de las consultas.

### Q3 2025
Fuente: transcripción de la llamada de resultados Q3 2025 (18-nov-2025) — https://tickertrends.io/transcripts/KLAR/Q3-earnings-transcript-2025 **[empresa, vía transcripción]**
- Siemiatkowski: "it used to do about 700 full-time jobs... now it's doing about 853 full-time jobs of a saving of $60 million."
- Plantilla −47 % "por rotación natural", sin contratar.
- Nota de prensa Q3: https://www.businesswire.com/news/home/20251118603505/en/ (18-nov-2025).

### 2026
Fuente: CX Dive, 20-feb-2026, citando podcast 20VC — https://www.customerexperiencedive.com/news/klarna-pursues-uber-style-customer-service-model/812763/ **[prensa]**
- "If AI can do customer service, it means it's going to be the cheap customer service."
- Modelo "tipo Uber": reclutar agentes humanos remotos desde su base de clientes; humano como "experiencia VIP".
- Plantilla de ~7.000 a ~3.000; meta < 2.000 en 2030.

### No verificado / matices
- "853 empleos equivalentes" y "USD 60 M" son estimaciones de la empresa; no hay metodología pública.
- No hay métricas de CSAT del asistente publicadas en estas fuentes.
- Klarna terceriza miles de agentes (CX Dive, sin número).

---

## 2. Intercom Fin

### Pipeline (lo publicado por Intercom)
Fuente: página Fin AI Engine (sin fecha, consultada 1-nov-2026) — https://fin.ai/ai-engine **[empresa]**
1. Refinar la consulta (seguridad, relevancia, comprensión; ¿aplica un Workflow o Custom Answer?).
2. Recuperar con modelo propio **fin-cx-retrieval** (artículos, conversaciones resueltas, snippets, sistemas integrados).
3. Re-rankear con **fin-cx-reranker**.
4. Generar con **Fin Apex 2.0** ("post-trained on Fin's own production data"); escala a humano si no puede responder.
5. Validar exactitud y seguridad antes de enviar.
- Afirma "76 % de resolución promedio en todos los clientes, muchos con 85 %+"; Apex 2.0 con "16,5 % menos alucinaciones que Apex 1.0"; uptime 99,97 %.

Fuente: "How We Built a World-Class Reranker for Fin", Ramil Yarullin, 11-sep-2025 — https://fin.ai/research/how-we-built-a-world-class-reranker-for-fin/ **[empresa]**
- Fin condensa la conversación en una consulta corta → embedding → recuperación vectorial → top **K=40** → reranker → filtro por presupuesto de contexto → generación.
- Reranker sobre **ModernBERT-large**; entrenado con 400.000 consultas reales × 40 pasajes (16 M pares), etiquetas de un reranker LLM "maestro", pérdida RankNet.
- Offline vs Cohere Rerank-v3.5: MAP 0,521→0,612 (+17,5 %); NDCG@10 0,570→0,665.
- A/B online con 1,5 M conversaciones: latencia P50 ≈ 150 ms sin cambios; mejora significativa de Resolution Rate (p<0,01), tamaño del efecto no publicado.
- Costo de reranking −80 % vs Cohere.

Fuente: AWS, caso de estudio Intercom + Anthropic (sin fecha; © 2026) — https://aws.amazon.com/solutions/case-studies/intercom-anthropic/ **[empresa/proveedor]**
- Usa Amazon Bedrock y Claude (Claude fue el mejor modelo en sus pruebas).
- "15–20 subcomponentes", cada uno con un LLM para verificación de respuestas, cumplimiento de políticas o generación.
- 56 % de resolución promedio a los 30 días de despliegue; algunos clientes 80–90 %.
- Fin lanzado en marzo de 2023.

### Fin Apex 1.0 (mar. 2026)
Fuente: VentureBeat, 26-mar-2026 — https://venturebeat.com/technology/intercoms-new-post-trained-fin-apex-1-0-beats-gpt-5-4-and-claude-sonnet-4-6 **[prensa citando benchmark de Intercom]**
- Resolución: Apex 1.0 73,1 %; GPT-5.4 71,1 %; Claude Opus 4.5 71,1 %; Claude Sonnet 4.6 69,6 %.
- −65 % alucinaciones vs Claude Sonnet 4.6; respuestas de 3,7 s.
- Intercom no revela el modelo base ("cientos de miles de millones de parámetros").
- Precio sin cambios: USD 0,99 por resolución. ~2 M conversaciones/semana.
Fuente: https://fin.ai/updates/fin-apex-1-0 (mar-2026) **[empresa]**: "resuelve 2,8 % más conversaciones que modelos de la competencia", "65 % menos alucinaciones", "0,6 s más rápido en time to first token".

### Precio y escala
Fuente: https://fin.ai/ai-instructions (sin fecha) **[empresa]**: precio por resultado "desde USD 0,99 por resolución"; > 12.000 clientes; > 2 M resoluciones por semana; resolución calculada sobre conversaciones donde Fin participó.

### Matices
- La definición de "resolución" es de Intercom (sin escalamiento y/o confirmación del cliente); no hay auditoría independiente.
- Las cifras de resolución difieren por fuente y fecha: 56 % (AWS, a 30 días), 73,1 % (benchmark Apex 1.0), 76 % (página actual). No son comparables entre sí.

---

## 3. DoorDash — soporte a Dashers

### Chatbot RAG con guardrails y LLM Judge (2024)
Fuente primaria: "Path to high-quality LLM-based Dasher support automation", Zhe Jia et al., 17-sep-2024 — https://careersatdoordash.com/blog/large-language-modules-based-dasher-support-automation/ (403 al hacer fetch directo; detalles vía resumen de ZenML https://www.zenml.io/llmops-database/llm-based-dasher-support-automation-with-rag-and-quality-controls y resultados de búsqueda) **[empresa]**
- Problema: sistema previo basado en flujos predefinidos; solo un subconjunto pequeño de problemas se resolvía rápido.
- Condensa la conversación para identificar el problema central; contextualiza la consulta; busca artículos de KB (vector store) y casos resueltos.
- **LLM Guardrail en dos niveles**: (1) similitud semántica propia con ventana deslizante contra segmentos del artículo; (2) evaluador LLM solo si el nivel 1 marca la respuesta. Si falla: reintento o derivación a agente humano. Rechazaron un guardrail más sofisticado por latencia/costo.
- **LLM Judge** con 5 dimensiones: retrieval correctness, response accuracy, grammar/language, coherence to context, relevance to request; más revisión humana de muestras.
- Mejora de calidad: KB (portal de gestión en desarrollo), recuperación, prompts (dividir prompts complejos, evitar negaciones, ejemplos, CoT).
- Pruebas de regresión con **Promptfoo** en cada cambio de prompt.
- Resultados: guardrail −90 % alucinaciones, −99 % problemas de cumplimiento graves; "miles de Dashers al día". Línea base no publicada.
- Latencia: de sub-segundo a decenas de segundos según modelo y prompt; el guardrail suma latencia.

### Autoservicio por voz con Amazon Bedrock (2024)
Fuente: AWS, caso de estudio DoorDash (sin fecha; prueba a inicios de 2024) — https://aws.amazon.com/solutions/case-studies/doordash-bedrock-case-study/ **[empresa/proveedor]**
- Amazon Connect + Amazon Lex (IVR existente) + Amazon Bedrock con **Claude 3 Haiku** + Knowledge Bases for Amazon Bedrock (RAG sobre el help center público).
- Objetivo de latencia: **≤ 2,5 s**.
- 8 semanas de iteración con el AWS Generative AI Innovation Center hasta arquitectura lista para A/B.
- Marco de pruebas en SageMaker: "miles de pruebas automatizadas por hora", 50× capacidad de pruebas; evaluación semántica contra ground truth.
- "Cientos de miles" de llamadas al día; reduce escalamientos a agentes en "miles por día".
- Ojo: −49 % transferencias, +12 % FCR y USD 3 M de ahorro corresponden al IVR previo con Lex, no a la solución generativa.

### Simulación + evaluación (2026)
Fuente primaria: "A simulation and evaluation flywheel to develop LLM chatbots at scale", 26-ene-2026 (fecha según resultados de búsqueda) — https://careersatdoordash.com/blog/doordash-simulation-evaluation-flywheel-to-develop-llm-chatbots-at-scale/ (403). Secundarias: InfoQ, 13-mar-2026 — https://infoq.com/news/2026/03/doordash-llm-chatbot-simulator/ ; ByteByteGo — https://blog.bytebytego.com/p/how-doordash-built-a-testing-system
- Chatbot de soporte con "cientos de miles de contactos diarios" de clientes, comercios y Dashers (ByteByteGo).
- Simulador: un LLM hace de cliente; escenarios desde transcripciones históricas (perfil de comportamiento extraído por LLM); backends mockeados (mezcla de datos reales y de escenario).
- Jueces LLM binarios (pass/fail + razonamiento), calibrados contra etiquetas humanas; > 50 evaluaciones (alucinación, tono, clasificación del problema...). La suite completa debe pasar antes de producción.
- **Case state layer**: sintetiza el historial crudo de herramientas (pedidos, estados de entrega, decisiones de reembolso) en una representación estructurada; 11 iteraciones.
- > 200 conversaciones simuladas en < 5 min; −90 % alucinaciones en simulación, que según DoorDash se trasladó a producción.
- No publicado: modelos usados, esquema del case state, tasas exactas.

---

## 4. Salesforce — Agentforce en Salesforce Help ("Customer Zero")

Fuente: Salesforce newsroom, 16-ene-2025 — https://www.salesforce.com/news/stories/agentforce-customer-zero/ **[empresa]**
- ~32.000 conversaciones/semana; resolución 83 %; escalamientos costosos "reducidos a la mitad"; solo 1 % necesita hablar con un humano.
- Se quitó el botón "contact support" de los sitios en inglés; búsqueda tipo buscador.
- Grounding en Data Cloud.

Fuente: VentureBeat, 18-jul-2025 — https://venturebeat.com/ai/salesforce-used-ai-to-cut-support-load-by-5-but-the-real-win-was-teaching-bots-to-say-im-sorry/ **[prensa]**
- > 1 M conversaciones en 9 meses desde lanzamiento en octubre (2024); 84 % de consultas resueltas sin humano; casos de soporte −5 %; 500 ingenieros de soporte redeployados.
- Inicio: ~10 % del tráfico, solo inglés, solo usuarios autenticados; 126 conversaciones la primera semana → ~45.000/semana.
- Handoff 1 % → ~5 % al ver que bloquear el acceso a humanos dañaba la experiencia (Slowey: "It was just getting in the way").
- "Content collisions": artículos duplicados (p. ej., muchos de reseteo de contraseña) confundían la recuperación; se borró/consolidó contenido. Base de 740.000 piezas de contenido.
- Reemplazaron lista de competidores prohibidos por una instrucción general ("act in Salesforce's best interest...").
- Japonés: consulta traducida al inglés, respuesta desde contenido en inglés, traducida de vuelta.
- Fragmentos van a OpenAI para generar (sin versión de modelo).

Fuente: blog de Salesforce, Jim Roth, 6-nov-2025 — https://www.salesforce.com/blog/support-requests-agentforce/ **[empresa]**
- > 2 M conversaciones. Japonés: > 50.000 conversaciones, 77 % de resolución.
- Data 360 (antes Data Cloud) + Atlas Reasoning Engine; topics, instrucciones y acciones; Agentforce Observability (latencia, escalamientos, errores).
- En incidentes (caída de Salesforce) el agente reconoce el problema y deriva rápido.

Fuente: página Customer Zero (sin fecha; consultada 1-nov-2026) — https://www.salesforce.com/ap/agentforce/use-cases/customer-zero/ **[empresa]**
- > 5 M conversaciones; "resolving more than 63% of them instantly"; decenas de miles por semana; 7 idiomas; piloto con 200 usuarios autenticados durante 4 semanas; > 60 M visitas/año; ~2 M solicitudes de soporte/año.
- Definición de total: resueltas + abandonadas + handoffs.

Plantilla de soporte: Benioff en The Logan Bartlett Show (fines de ago-2025), vía ITPro/TechRepublic — https://www.itpro.com/technology/artificial-intelligence/marc-benioff-says-salesforce-has-already-cut-4-000-customer-support-staff-for-ai-agents-and-workforce-productivity-hasnt-dipped **[prensa]**: de ~9.000 a ~5.000 personas en soporte ("I need less heads"); vocero: "no longer need to actively backfill support engineer roles".

### Matices
- La tasa de resolución publicada baja de 83–84 % (2025) a "más de 63 %" (página actual). No encontré explicación oficial (¿más idiomas/tráfico, cambio de definición?). No lo afirmo como causa.
- La cifra "2,6 M conversaciones / 63 %" de abril 2026 solo aparece en blogs de terceros: descartada.

---

## 5. Lyft — asistente de atención con Claude en Amazon Bedrock (breve)

Fuente: Anthropic, 6-feb-2025 — https://www.anthropic.com/news/lyft-announcement **[empresa]**: Claude vía Amazon Bedrock; −87 % en tiempo promedio de resolución; miles de consultas al día; deriva casos complejos a especialistas humanos.
Fuente: TechCrunch, 6-feb-2025 — https://techcrunch.com/2025/02/06/lyfts-new-ai-customer-assistant-is-powered-by-anthropics-claude **[prensa]**: un caso se marca resuelto cuando el cliente responde "sí" a "¿Resolvimos tu problema?"; Claude incorporado a fines de 2024.
Fuente: blog de Lyft, 1-dic-2025 — https://www.lyft.com/blog/posts/aws-and-lyft-bringing-agentic-ai-to-life-for-riders-and-drivers **[empresa]**: "intent agent" con el AWS Generative AI Innovation Center; usa datos de backend (viajes recientes, pagos); más de la mitad de las solicitudes resueltas en < 3 min; +70 % de uso por conductores en 2025; inglés y español 24/7. Sin detalle de AgentCore/Strands/herramientas.

---

## Mencionado brevemente
- **Deutsche Telekom "Frag Magenta"**: agentes por dominio (facturación, contratos, soporte técnico) sobre LMOS; según Qdrant, > 2 M conversaciones en tres países. La plataforma LMOS la cubre /guia/caso-plataformas-internas. Fuentes: https://eclipse.dev/lmos/blog/LMOS-Accelerated-Agent-Dev/ ; https://qdrant.tech/blog/case-study-deutsche-telekom/ (2025-03-07).

## Descartados
- **Air India AI.g** (Azure OpenAI): cifras de Microsoft inconsistentes entre historias (2024: ~4 M consultas, 97 % automatizado; 2026: > 13 M conversaciones, 97 % "éxito") y casi sin detalle técnico. https://www.microsoft.com/customers/story/19768-air-india-azure-open-ai-service
- **Vodafone (TOBi/SuperTOBi)**, **Octopus Energy**: no encontré fuentes primarias con profundidad técnica comparable en el tiempo disponible; cifras mayormente de entrevistas.
- **Google ADK / Gemini Enterprise for CX**: no encontré un caso nombrado de atención al cliente con cifras y arquitectura publicadas. Verizon (Conversational Agents + Gemini, abr-2025, https://www.googlecloudpresscorner.com/2025-04-09-Google-Cloud-and-Verizon-Drive-Customer-Experience-Improvements-for-Verizon-Customers-with-Gemini-Integration) solo da afirmaciones cualitativas.
- **Bedrock AgentCore**: no encontré caso público de atención al cliente a gran escala con cifras; solo tutoriales.
