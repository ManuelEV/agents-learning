# Notas de investigación: agentes de datos y analítica (caso-datos-analitica)

Investigación realizada el 1 de noviembre de 2026. Cada dato lleva URL y fecha de la fuente.
Convención: **[P]** = fuente primaria (blog de ingeniería / paper de la empresa); **[S]** = secundaria (prensa, resúmenes de terceros); **[V]** = proveedor/vendor que publica el caso del cliente.
Todas las cifras son **auto-reportadas** por las empresas salvo que se indique lo contrario. No encontramos evaluaciones independientes de ninguno de estos sistemas.

---

## 1. Uber QueryGPT (text-to-SQL)

Fuente [P]: "QueryGPT – Natural Language to SQL using Generative AI", Uber Engineering, 19-09-2024. https://www.uber.com/blog/query-gpt/
Autores: Jeffrey Johnson, Callie Busch, Abhi Khune (agradecimientos: Pradeep Chakka).

- Escala de la plataforma: ~1,2 millones de consultas interactivas al mes; Operaciones ≈ 36 % de ellas.
- Escribir una consulta a mano: ~10 min (estimación conservadora de Uber); con QueryGPT ~3 min.
- Lanzamiento limitado a equipos de Operaciones y Soporte: ~300 usuarios activos diarios en promedio. 78 % dijo que las consultas generadas redujeron el tiempo frente a escribirlas desde cero (encuesta interna).
- Historia: nació en Hackdayz (mayo 2023); v1 = RAG simple + few-shot: vectoriza el prompt, k-NN sobre esquemas y SQL de ejemplo; recupera 3 tablas y 7 ejemplos de un conjunto de 7 tablas tier-1 y 20 consultas. La precisión cayó al incorporar más tablas.
- Problemas v1: similitud entre prompt en lenguaje natural y esquemas/SQL da malos resultados; esquemas grandes (>200 columnas, ~40–60K tokens) rompían la ventana de contexto (32K en el modelo de la época).
- Diseño final:
  - **Workspaces**: colecciones curadas de tablas y SQL de ejemplo por dominio; 12 de sistema (Mobility, Core Services, Platform Engineering, IT, Ads, etc.) + workspaces personalizados.
  - **Intent Agent**: llamada LLM que mapea la pregunta a uno o más dominios/workspaces → acota el RAG.
  - **Table Agent**: LLM propone tablas; el usuario las confirma o edita (human-in-the-loop).
  - **Column Prune Agent**: LLM elimina columnas irrelevantes del esquema → menos tokens, costo y latencia.
  - Salida: SQL + explicación generada por LLM. Modelo citado: GPT-4 Turbo (1106), 128K tokens.
  - Se agregó un "prompt enhancer/expander" porque los prompts de usuarios varían mucho en detalle.
- Evaluación: set dorado de preguntas reales de los logs con intención, tablas y SQL dorado verificados a mano. Dos flujos: "vanilla" (end-to-end) y "decoupled" (se dan intención y tablas correctas, aísla la generación; imita el human-in-the-loop). Métricas: acierto de intención, solapamiento de tablas (0–1), ejecución exitosa, devuelve filas >0, similitud cualitativa con SQL dorado (LLM, 0–1).
- **No publican porcentajes de precisión** agregados.
- Límites: alucinación de tablas/columnas inexistentes y de valores de filtro (p. ej. un status mal escrito → 0 filas); mitigaciones en experimentación (prompts, modo chat, agente de validación planeado); "no está resuelto". Variación ~5 % entre corridas idénticas. Cientos de miles de datasets: el set dorado no cubre todo. Usuarios esperan precisión muy alta.

## 2. Uber Finch (agente de datos financieros)

Fuente [P]: "Unlocking Financial Insights with Finch: Uber's Conversational AI Data Agent", Uber Engineering, 17-07-2025. https://www.uber.com/blog/unlocking-financial-insights-with-finch/
Autores: Eddie Huang, Taya Yusuf, Tim Ross.

- Interfaz: Slack (Slack SDK + Slack AI Assistant APIs); callback de LangGraph publica estados en tiempo real.
- Orquestación: LangGraph. **Supervisor agent** enruta a sub-agentes (SQL Writer Agent, Document Reader Agent).
- SQL Writer: encuentra la tabla, aplica guías por tabla, construye y ejecuta SQL, verifica permisos del usuario, reescribe ante error.
- **Índice de metadatos en OpenSearch**: nombres de columnas, valores de columnas y alias en lenguaje natural (p. ej. "GBs" → gross bookings, "US&C" → US and Canada). Fuzzy matching de términos extraídos por el LLM → mejora precisión de WHERE.
- **Data marts curados de una sola tabla** con métricas frecuentes → consultas simples, rápidas, y el LLM se recupera mejor de errores.
- **RBAC**: solo usuarios autorizados consultan dimensiones financieras sensibles.
- Modelos vía **Generative AI Gateway** de Uber (self-hosted y de terceros; permite cambiar modelos).
- Fuentes: Presto, IBM Planning Analytics, Oracle EPM; export a Google Sheets.
- Evaluación: precisión por sub-agente; SQL Writer compara **resultados** con los de una consulta "dorada" (no el texto del SQL); precisión de enrutamiento del supervisor (detecta "intent collisions", p. ej. Presto vs Oracle EPM); validación end-to-end con consultas simuladas; **regresión** re-ejecutando consultas históricas antes de cambiar prompt o modelo.
- **No publica** precisión, latencia, volumen ni usuarios. Admite "no 100 % confiable", "propenso a alucinar"; uso ejecutivo requiere verificación; plan de botón "Request validation" para revisión de un experto.
- Nota de alcance: Finch es finanzas corporativas internas (no banca); se trata aquí como producto de datos. La página caso-servicios-financieros cubre banca/finanzas reguladas.

## 3. LinkedIn SQL Bot

Fuente [P]: "Practical text-to-SQL for data analytics", LinkedIn Engineering, 09-12-2024. https://www.linkedin.com/blog/engineering/ai/practical-text-to-sql-for-data-analytics
Autor principal Albert Chen (+17 coautores).
Fuente [P]: Chen et al., "Text-to-SQL for Enterprise Data Analytics", arXiv 2507.14372, 18-07-2025 (Workshop on Agentic AI for Enterprise, KDD '25). https://arxiv.org/abs/2507.14372
Fuente [P/S]: presentación Trino Summit 2024 (LinkedIn). https://trino.io/assets/blog/trino-summit-2024/trino-summit-2024-linkedin-ai.pdf (no revisada en detalle; cifras de ablación sólo vía resumen de búsqueda → no usadas).

Blog (dic-2024):
- Sistema multiagente en LangChain + LangGraph, integrado en DARWIN (plataforma de ciencia de datos).
- Millones de tablas. Popularidad de acceso reduce a unos miles; EBR (embedding-based retrieval) trae top-20 tablas; re-ranker LLM deja 7; segundo re-ranker selecciona campos (ordenados por frecuencia de acceso reciente).
- Certificación de datasets: expertos aportan descripciones obligatorias de tabla y opcionales de campos; anotaciones con IA desde documentación y Slack.
- Personalización: datasets por defecto inferidos del organigrama; ICA sobre historial de acceso usuario-dataset.
- Deprecación: tablas populares se ingieren solas; flags de deprecación de DataHub las sacan.
- Grafo de conocimiento: metadatos de DataHub (esquemas, top-K valores, partition keys, clasificación métrica/dimensión), conocimiento de dominio de usuarios, agregados de query logs (popularidad, joins comunes), notebooks certificados y ejemplos de wiki.
- Writer: plan + resolución incremental; planner instruido para minimizar pasos.
- Validadores: existencia de tablas/campos + EXPLAIN; agente de autocorrección puede recuperar más tablas/campos.
- Permisos: si el usuario no tiene acceso pero pertenece a un grupo que sí, SQL Bot entrega código que usa credenciales del grupo.
- UI en DARWIN: sidebar, botón "Fix with AI" en consultas fallidas (~80 % de las sesiones), historial, feedback, instrucciones personalizadas.
- Integración en DARWIN → adopción 5–10x frente al prototipo independiente.
- Benchmark: 130+ preguntas de expertos en 10 áreas; ~60 % con múltiples respuestas aceptadas (sin ellas el recall se subreporta 10–15 %); LLM-as-judge a ≤1 punto del humano 75 % de las veces; revisión experta cada 3 meses. Desarrollo >1 año.
- Encuesta: ~95 % califica precisión "Passes" o más; ~40 % "Very Good" o "Excellent".

Paper (jul-2025):
- Disponible desde julio 2024; >300 usuarios activos semanales; ~20 % retorna la semana siguiente; 33 % de sesiones terminan con código pegado al editor; runtime promedio <60 s por pregunta.
- Encuesta: 39 % "Very good/Excellent", 95 % ≥ "Passes".
- Benchmark: 133 preguntas, 10 áreas, 167 tablas de verdad; configuración completa: 78 % recall de tablas, 56 % recall de columnas, 48 % respuestas con puntaje ≥4 (LLM judge), 96 % compila, 99 % tablas/columnas válidas. Revisión experta (versión producción): 53 % puntaje 4–5, 77 % ≥3.
- Ablación: solo esquemas → 9 % con ≥4. Lo que más suma: consultas de ejemplo, clusters de tablas, atributos de tabla/columna. Componentes de modelado mejoran sobre todo compilación (66→96 %) y tablas/columnas válidas (77→99 %), no tanto el puntaje.
- Error más común: filtro incorrecto (24 %); joins incorrectos sólo 4 %.
- Resultados negativos: planificación de consulta, múltiples candidatos y query expansion no mejoraron.
- Modelos: gpt-4o (temp 0) vía Azure OpenAI; gpt-4o-mini para el researcher; embeddings E5-large-v2 y text-embedding-ada-002. Validación: Trino EXPLAIN (modo VALIDATE) + validador de alucinación de tablas/columnas; máx. 2 pasadas de corrección.
- Inconsistencia interna: 53 % (experto) vs 48 % (tabla) vs 49 % (conclusión): métodos distintos.

## 4. Pinterest: Text-to-SQL en Querybook → Analytics Agent

Fuente [P, no accesible directamente — Medium devolvió 403]: Obeng, Zhong, Gu, "How we built Text-to-SQL at Pinterest", Pinterest Engineering, 02-04-2024. https://medium.com/pinterest-engineering/how-we-built-text-to-sql-at-pinterest-30bad30dabff
Cifras verificadas vía resumen secundario [S]: ZenML LLMOps Database, https://www.zenml.io/llmops-database/text-to-sql-system-with-rag-enhanced-table-selection (consultado 01-11-2026).
- Integrado en Querybook (herramienta SQL open source de Pinterest).
- v1: el usuario elige tablas; prompt con esquema + dialecto; valores únicos de columnas de baja cardinalidad para que los filtros calcen (p. ej. "WEB" vs "web"); poda de columnas por tags; streaming por WebSocket.
- v2 (RAG para selección de tablas): índice offline de **resúmenes de tablas** (sólo tablas top-tier) y **resúmenes de consultas** en OpenSearch; resúmenes de tabla pesan más; top-N candidatos → LLM elige top-K; el usuario confirma tablas.
- Aceptación al primer intento: de 20 % a >40 %. Velocidad: +35 % en tareas de escritura de SQL (no controla diferencias de tarea). Hit rate de búsqueda de tablas: 40 % sin documentación en embeddings, sube hasta 90 % al aumentar el peso de la documentación.
- Límites: SQL devuelto sin validación; índices actualizados manualmente.

Fuente [P, no accesible directamente]: Li, Yang, "Unified Context-Intent Embeddings for Scalable Text-to-SQL", Pinterest Engineering, 06-03-2026. https://medium.com/pinterest-engineering/unified-context-intent-embeddings-for-scalable-text-to-sql-793635e60aac
Verificado vía [S]: sysdesign-wiki, https://sysdesign-wiki.pages.dev/sources/2026-03-06-pinterest-unified-context-intent-embeddings-for-scalable-text-to-sql/ (consultado 01-11-2026); y [V]: DataHub customer story Pinterest, https://datahub.com/?p=5615 (fecha en página "05.06.26").
- 100.000+ tablas analíticas; 2.500+ usuarios analíticos.
- Analytics Agent = agente más usado de Pinterest, ~10x el siguiente; 40 % de los analistas en dos meses; meta 50 % a fin de año (cifras del post y de DataHub).
- Técnica: convertir SQL histórico en descripción en lenguaje natural de la pregunta de negocio que respondía ("analytical intent"), enriquecido con contexto de PinCat; se embebe eso. En paralelo, se extraen patrones estructurales (joins con claves, filtros comunes, agregaciones).
- Capas: orquestación (LLM clasifica tareas y elige tools); **MCP**: tools de búsqueda de tablas, de consultas, de conocimiento y ejecución en Presto; contexto (PinCat, índices vectoriales, docs de expertos, métricas); ejecución: Presto con **EXPLAIN** antes de ejecutar, reintentos acotados, **LIMIT 100** por defecto.
- Validación: tablas/columnas contra PinCat; profiling de columnas para que los valores de filtro existan; reusa claves de join conocidas; jerarquía de conflictos: docs de expertos > metadatos PinCat > patrones de consultas > conocimiento general.
- Gobernanza: PinCat (DataHub) con tiers 1/2/3, owner, retención, glosario. Ranking combina similitud con tier, frescura, documentación y ownership. Reducción ~400K → ~100K tablas (DataHub: 75 % menos huella; ~30 % de tablas top eran de ex-empleados; 500 tablas nuevas/día).
- Documentación con IA: >75 % de usuarios la califica "usable" o mejor; ~70 % menos trabajo manual de documentación combinando IA + lineage + búsqueda.
- Vector DB as a Service sobre AWS OpenSearch, Hive como fuente de verdad, Airflow para ingesta; actualizaciones diarias incrementales.
- Límites: sin métricas de precisión de SQL ("room for improvement"); casos difíciles: window functions, términos ambiguos, conflictos entre dominios, patrones deprecados que persisten en el índice. No detallan control de acceso sobre el índice de query history.

## 5. Operaciones / on-call

### Meta: análisis de causa raíz asistido por IA
Fuente [P]: Hsu, Neu, Farrag, Kindi, "Leveraging AI for efficient incident response", Engineering at Meta, 24-06-2024. https://engineering.fb.com/2024/06/24/data-infrastructure/leveraging-ai-for-efficient-incident-response/
- Recuperador heurístico (ownership de código/directorios, grafo de código en runtime) reduce miles de cambios a unos cientos; ranker LLM (Llama 2 7B) deja top-5.
- "Ranking por elección": prompts de ≤20 cambios, el modelo elige 5 por lote, se agregan y repite.
- Entrenamiento: CPT con wikis/Q&A/código internos aprobados; SFT con ~5.000 ejemplos de RCA; segundo SFT para listas ordenadas usando logprobs.
- Resultado: 42 % de las investigaciones con la causa raíz en el top-5 al momento de crear la investigación (backtesting histórico; sólo web monorepo).
- Riesgos: sugerir causas equivocadas; mitigación: explicabilidad (respondedores reproducen resultados), retener respuestas de baja confianza (precisión sobre recall).
- Nota: no es un "agente" con bucle de herramientas; es un pipeline recuperador + LLM ranker.

### Uber Genie (copiloto on-call)
Fuente [P]: Marcott, Sidorovics, Chothani, "Genie: Uber's Gen AI On-Call Copilot", Uber Engineering, 10-10-2024. https://www.uber.com/blog/genie-ubers-gen-ai-on-call-copilot/
- ~45.000 preguntas/mes en canales de Slack de soporte (p. ej. Michelangelo).
- RAG (no fine-tuning) sobre Engwiki, Stack Overflow interno y documentos de requisitos; ETL Spark; embeddings OpenAI; vector DB interna Sia; Knowledge Service; llamadas vía Michelangelo Gateway con UUID para atribución de costos.
- Seguridad: sólo fuentes pre-curadas y ampliamente accesibles, para no exponer contenido restringido.
- Cada chunk lleva URL; el LLM sólo responde desde esos sub-contextos y cita.
- Feedback en Slack (Resolved/Helpful/Not Helpful/Not Relevant) → Kafka → Hive → dashboard. LLM-as-judge para alucinación y relevancia; evaluación de documentos.
- Resultados desde sept-2023: 154 canales, >70.000 preguntas, 48,9 % helpfulness, ~13.000 horas de ingeniería ahorradas (estimación).

## 6. Casos breves (menos profundidad pública)

- **Swiggy Hermes V3** [S]: InfoQ, 02-01-2026, https://www.infoq.com/news/2026/01/swiggy-hermes-conversational-ai ; original [P, no accedido]: https://bytes.swiggy.com/hermes-v3-building-swiggys-conversational-ai-analyst-a41057a2279d . Slack; base de consultas históricas de Snowflake convertidas a lenguaje natural para few-shot; memoria de sesión; orquestador estilo ReAct con chequeo de completitud y aclaraciones; capa de explicación con supuestos y confianza; RBAC/SSO/auditoría. Precisión de SQL 54 % → 93 % (auto-reportada; sin metodología publicada en el resumen).
- **MoneySuperMarket (Mony Group) en BigQuery Conversational Analytics** [V]: Google Cloud Blog, 30-06-2026, https://cloud.google.com/blog/products/data-analytics/conversational-analytics-in-bigquery-now-ga . Testimonio: análisis de "semanas" a "minutos", ~medio día por semana ahorrado por analista financiero. Producto GA el 30-06-2026; hereda permisos de BigQuery, auditoría, límite de bytes por agente, verified queries, Knowledge Catalog.
- **BigQuery remote MCP server** (contexto para el lector ADK): Google Cloud Blog, 07-01-2026, https://cloud.google.com/blog/products/data-analytics/using-the-fully-managed-remote-bigquery-mcp-server-to-build-data-ai-agents . Endpoint `https://bigquery.googleapis.com/mcp`, preview en ene-2026, OAuth 2.0, ejemplo con `McpToolset` de ADK.

## Descartados

- Airbnb, Netflix, Grab: no encontramos en esta pasada un post primario reciente con arquitectura de agente de datos y cifras comparable a los elegidos.
- Snowflake Cortex Analyst / Databricks Genie: abundan anuncios de producto, pero no encontramos casos de clientes con profundidad técnica (arquitectura + cifras) verificable.
- Amazon Bedrock / AgentCore: los posts de AWS sobre text-to-SQL encontrados son guías de solución, no casos de cliente con métricas. Fischer Identity (AWS Public Sector Blog) no es data warehouse.
- Vanna: framework open source, no un caso empresarial con cifras.
- Cifras de ablación de LinkedIn en Trino Summit (+16 % recall de tablas, etc.): vistas sólo en un resumen de búsqueda, no verificadas en la fuente → no usadas.
