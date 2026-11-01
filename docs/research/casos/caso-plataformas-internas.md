# Notas de investigación: plataformas internas de agentes

Fecha de investigación: 1 de noviembre de 2026. Cada dato lleva URL y fecha de la fuente. "Auto-reportado" = la empresa habla de sí misma; ninguna cifra de esta página está auditada por terceros.

## Casos incluidos

### 1. Uber — GenAI Gateway (2024) → MCP Gateway + Agent Builder (2026)

Fuentes:
- Uber Engineering, "Navigating the LLM Landscape: Uber's Innovation with GenAI Gateway", 11-jul-2024. https://www.uber.com/blog/genai-gateway/ (primaria)
  - Servicio en Go del equipo Michelangelo; envuelve clientes de proveedores (OpenAI, Vertex AI) y stack propio de serving (ej. Llama 2 70B).
  - Interfaz que imita la API HTTP/JSON de OpenAI (decisión explícita: no inventar API propia que envejezca).
  - Componentes: authn/authz, redactor de PII antes de proveedores externos (y des-redacción en la respuesta), métricas/alertas, logs de auditoría (costo, seguridad, evaluación de calidad), gestión centralizada de presupuesto.
  - Escala (auto-reportada, jul-2024): ~30 equipos cliente, 16 millones de consultas/mes, pico 25 QPS, >60 casos de uso LLM identificados.
  - Problemas: la redacción de PII agrega latencia y puede bajar calidad; placeholders inconsistentes según posición.
- Uber Engineering, "Designing MCP Gateway: Uber's MCP Management Platform", 1-oct-2026. https://www.uber.com/blog/designing-mcp-gateway/ (primaria)
  - Motivación: integraciones MCP ad hoc de cientos de equipos → herramientas fragmentadas, infraestructura duplicada, difícil descubrimiento, acoplamiento.
  - Control plane: MCP Registry (fuente de verdad de descubrimiento, ownership, habilitación). Data plane: Proxy Gateway (traduce MCP ↔ HTTP/gRPC/TChannel; config en memoria refrescada periódicamente; endpoint `/<service-name>/mcp` por servidor virtual).
  - AutoCrawler: workflow en Cadence suscrito al registro de IDL; crea un servidor MCP virtual por servicio, parsea Protobuf/Thrift, usa un LLM para generar descripciones de tools, registra tools **deshabilitadas por defecto**. También descubre servidores nativos (MCPFx) por métricas de heartbeat.
  - Gobierno: descubrir ≠ exponer; el equipo dueño revisa y habilita; cada cambio de descripción genera un diff que el dueño aprueba; rollback a versión anterior.
  - Seguridad: autorización a nivel de tool con el Access Control System interno (políticas por servidor, override por tool; llamadores humanos, servicios o agentes). Redacción de PII en respuestas de tools. Terceros (Jira, Google): se reenvía el token del usuario y el servicio de terceros lo intercambia por token externo.
  - Ejecución vía Muttley (sidecar de service mesh).
  - Descubrimiento en runtime: "Omni MCP" (discover_server, discover_tools, get_tool_schema, invoke_tool), "Response Projection" (el LLM pide solo campos), "Code Mode" vía CLI `aifx` (`aifx mcp list/search/call`); Code Mode es el default para agentes de código.
  - Escala (auto-reportada, oct-2026): más de 800 servidores MCP y más de 5.000 tools; "cientos de equipos"; la bio de un autor dice que el ecosistema lo usan "decenas de miles de empleados". No publica volumen de llamadas ni número de agentes.
- The Pragmatic Engineer (Gergely Orosz), "How Uber uses AI for development: inside look", 10-mar-2026 (actualizado 11-mar). https://newsletter.pragmaticengineer.com/p/how-uber-uses-ai-for-development (secundaria; resume charla de Ty Smith y Anshu Chada en The Pragmatic Summit)
  - Gateway de modelos sobre Michelangelo (frontera + modelos propios); MCP Gateway con registro y sandbox; Uber Agent Builder (no-code, agentes con acceso a MCP y datasets, handoff entre agentes; Agent Studio para trazar, versionar y evaluar; registro de agentes); AIFX CLI (aprovisiona Claude Code, Codex, Cursor y configura MCP); Minion (agentes en segundo plano con acceso al monorepo); uReview; Autocover (>5.000 tests/mes).
  - Cifras (auto-reportadas por Uber vía el newsletter, mar-2026): ~3.000 personas en tech; 84 % "agentic coding users" (la sección de resumen dice 92 % uso mensual — inconsistencia en la fuente); 11 % de PRs abiertos por agentes; costo de IA ×6 desde 2024; Claude Code de 32 % (dic-2025) a 63 % (feb-2026).
  - Adopción: compartir entre pares funcionó mejor que mandatos (según resumen ZenML del mismo material — https://www.zenml.io/llmops-database/building-internal-ai-agent-infrastructure-for-software-development-at-scale, 2026).

### 2. Block — goose + MCP como plataforma para toda la empresa

Fuentes:
- Angie Jones (goose blog), "MCP in the Enterprise: Real World Adoption at Block", 21-abr-2025. https://goose-docs.ai/blog/2025/04/21/mcp-in-enterprise (primaria)
  - "Miles de empleados" lo usan a diario; reportan 50–75 % de ahorro de tiempo en tareas comunes (auto-reporte de empleados).
  - Funciones: ingeniería, diseño, seguridad, compliance, soporte, ventas, datos, producto, riesgo, marketing.
  - Servidores MCP internos escritos por ingenieros de Block (Snowflake, GitHub, Jira, Slack, Google Drive, APIs internas).
  - Controles: qué modelos pueden invocar qué tools; anotaciones read-only/destructive con confirmación; allowlists de LLM en algunos servidores; restricción para ciertos datos sensibles; acuerdos corporativos con proveedores.
  - OAuth con tokens en keychain del sistema; OAuth corre en servidores MCP locales ("solución temporal").
  - Modelos: Databricks como plataforma de hosting de LLM (Claude y OpenAI vía endpoints gestionados).
  - Distribución: goose preinstalado, modelos autoconfigurados, acceso por defecto a un set curado de servidores MCP aprobados; sesiones semanales de DevRel y canales internos.
- Salman Mohammed y Kalvin Chau, "Block's Playbook for Designing MCP Servers", 16-jun-2025. https://engineering.block.xyz/blog/blocks-playbook-for-designing-mcp-servers (primaria)
  - Más de 60 servidores MCP construidos. Diseñar desde el workflow, no desde el endpoint; nombres/descripciones = prompt; presupuesto de tokens en la salida; un nivel de riesgo por tool; anotaciones `readOnlyHint`; OAuth al primer uso, scopes mínimos, tokens en keyring. Ejemplo: Linear pasó de 30+ tools espejo a 2 tools GraphQL.
- All Things Open (resumen de charla de Angie Jones, VP de Ingeniería), "Block scaled MCP to 12,000 employees across 15 job functions", 2-dic-2025. https://allthingsopen.org/articles/block-scaled-mcp-12000-employees-15-job-functions (secundaria)
  - 12.000 empleados en 15 funciones en ~2 meses; >100 servidores MCP internos empaquetados por defecto; OAuth integrado con IdP (SSO); 75 % de ingenieros ahorra 8–10 h/semana (auto-reporte).
- Linux Foundation / AAIF, anuncio de la Agentic AI Foundation, 9-dic-2025. https://aaif.io/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation-aaif-anchored-by-new-project-contributions-including-model-context-protocol-mcp-goose-and-agents-md/ (primaria)
  - Proyectos fundacionales: MCP (Anthropic), goose (Block), AGENTS.md (OpenAI).
- Fortune, "Block CFO: AI leaps in 18 months led to decision to slash nearly half its workforce", 6-mar-2026. https://fortune.com/2026/03/06/exclusive-block-cfo-ai-leaps-18-months-led-decision-slash-nearly-half-its-workforce (prensa)
  - Block anunció el 26-feb-2026 el recorte de ~4.000 puestos (casi la mitad de la plantilla); goose ~18 meses en producción interna. → la cifra de "12.000 empleados" es previa al recorte.

### 3. Cloudflare — stack interno de ingeniería con IA sobre sus propios productos

Fuentes:
- Ayush Thakur, Scott Roe-Meschke, Rajesh Bhatia, "The AI engineering stack we built internally, on the platform we ship", 20-abr-2026. https://blog.cloudflare.com/internal-ai-engineering-stack/ (primaria; vendedor que hace dogfooding de lo que vende → sesgo comercial)
  - 11 meses; tiger team iMARS (Internal MCP Agent/Server Rollout Squad).
  - Capa plataforma: Cloudflare Access (Zero Trust) → un único proxy Worker valida JWT de Access, inyecta claves de proveedor del lado servidor, envía solo UUID anónimo a AI Gateway para costos por usuario → AI Gateway → proveedores frontera y Workers AI (Kimi K2.5). Endpoint de descubrimiento configura OpenCode con un `opencode auth login`. MCP Server Portal agrega servidores tras un solo OAuth; Code Mode a nivel portal (2 tools).
  - Capa conocimiento: Backstage (catálogo); AGENTS.md generado en ~3.900 repos vía MRs revisados por dueños.
  - Capa enforcement: AI Code Reviewer en GitLab CI, coordinador por nivel de riesgo + revisores especializados; Engineering Codex como reglas/skill.
  - Cifras (auto-reportadas, últimos 30 días a abr-2026): 3.683 usuarios activos (60 % de ~6.100 empleados; 93 % de R&D); 295 equipos; 20,18 M solicitudes y 241,37 B tokens por AI Gateway; 51,83 B tokens en Workers AI; 91,16 % de requests a laboratorios frontera vs 8,84 % Workers AI; 13 servidores MCP con 182+ tools; 34 tools de GitLab ≈ 15.000 tokens por request; agente de seguridad >7 B tokens/día en Kimi K2.5, estimado 77 % más barato; promedio semanal de MRs de ~5.600 a >8.700.
  - Lecciones: sin contexto local las salidas eran plausibles pero incorrectas (→ AGENTS.md); AGENTS.md obsoleto es peor que nada; el proxy único desde el día 1 dio punto de control; schemas de tools cuestan contexto (→ Code Mode).
- Cloudflare, "Scaling MCP adoption: Our reference architecture for simpler, safer and cheaper enterprise deployments of MCP", 14-abr-2026. https://blog.cloudflare.com/enterprise-mcp (primaria; contenido verificado solo vía resúmenes de búsqueda)
  - Access (SSO/MFA/postura), portales MCP con logs centralizados y DLP, AI Gateway para costo, detección de "shadow MCP" con Cloudflare Gateway.

### 4. Deutsche Telekom — LMOS / Eclipse LMOS para Frag Magenta

Fuentes:
- Arun Joseph y Patrick Whelan, InfoQ, "Eclipse LMOS: …" (charla InfoQ Dev Summit Boston 2024), 17-feb-2025. https://www.infoq.com/articles/eclipse-lmos-ai-agents (primaria: autores son los responsables del proyecto)
  - Contexto: Frag Magenta (ventas y servicio), ~10 países europeos, chat y voz, varios idiomas; ~100 M de clientes en Europa. Necesitaban plataforma, no bots RAG aislados. Inversión JVM → construir.
  - Línea de tiempo: sep-2023 bot FAQ en LangChain; oct-2023 framework Kotlin propio; feb-2024 primer agente con tool calling (facturación); jul-2024 iniciativa "F9" → 12 días por agente.
  - Arquitectura: ARC (DSL Kotlin), chatbot de cara al cliente + router + agentes aislados por dominio como microservicios; RAG en una search API fuera de los agentes; plataforma sobre Kubernetes e Istio con control plane propio; agentes y "channels" como conceptos de primera clase; versionado, ruteo dinámico, rollout/rollback; agentes no-ARC (Python, LangChain, LlamaIndex) si cumplen especificaciones.
  - Cifras (auto-reportadas, feb-2025): >1 M preguntas respondidas con 89 % de respuestas aceptables; >300.000 conversaciones humanas desviadas con tasa de riesgo <2 %; ~38 % mejor en handovers en A/B; agentes de dominio de 2 meses a 10 días; mejoras de semanas a 2,5 días; release limitado a 2 agentes/semana por seguridad y pruebas.
  - Lecciones: prompts frágiles → aislar dominios; diseñar para fallo (rollback); el ciclo de vida de un agente no es el de un microservicio; evitar acoplarse a un framework; ecosistema abierto.
- Qdrant, "How Deutsche Telekom Built a Multi-Agent Enterprise Platform Leveraging Qdrant", 7-mar-2025. https://qdrant.tech/blog/case-study-deutsche-telekom/ (caso de proveedor)
  - >2 M de conversaciones; 10 filiales europeas (el mismo texto dice "tres países" en otra parte: inconsistencia); tiempo por agente de 15 a 2 días (no coincide con InfoQ: métricas distintas o fechas distintas).
- Eclipse LMOS docs, "LMOS Control Plane" (consultado 1-nov-2026). https://eclipse.dev/lmos/docs/lmos_platform/lmos_control_plane/ (primaria)
  - LMOS Operator con CRDs Agent, Channel y ChannelRouting; capabilities versionadas; si una capability requerida no resuelve, el channel no se activa; el LMOS Router usa ChannelRouting; descripción de agente basada en Thing Description (W3C WoT); inspirado en requirements/capabilities de OSGi.
- SD Times, "Eclipse Foundation launches ADL…", 28-oct-2025. https://sdtimes.com/?p=58274 (prensa)
  - ADL (Agent Definition Language): lenguaje + toolkit visual para que negocio e ingeniería definan comportamiento versionable, separado de prompts. Coberturas describen LMOS en alpha.

### 5. LinkedIn — plataforma de agentes sobre mensajería

Fuentes:
- LinkedIn Engineering (republicado en Pressroom), "The LinkedIn Generative AI Application Tech Stack: Extending to Build AI agents", 10-sep-2025. https://news.linkedin.com/2025/linkedin-s-ai-stack--expanding-to-build-tomorrow-s-agents (primaria)
  - Agentes definidos como servicios gRPC con opciones proto3 de la plataforma, registrados con un build plugin.
  - Mensajería como orquestación (FIFO, historial, reintentos persistentes, entrega eventual); "agent lifecycle service" traduce mensajería ↔ gRPC; modo síncrono nuevo para experiencias interactivas.
  - Skill registry (propietario; migrando hacia protocolos abiertos); MCP y A2A adoptados incrementalmente.
  - Memoria: experiencial y conversacional, separadas por diseño.
  - Observabilidad: LangSmith en pre-producción; OpenTelemetry en producción; trazas alimentan evaluación offline y regresión.
  - LangGraph/LangChain adaptados con providers propios; Playground para prototipar; human-in-the-loop.
  - No publica número de agentes/equipos.
- ZenML LLMOps DB, resumen de podcast InfoQ "Platform Engineering Scaling Agents" (LinkedIn, Karthik Ramgopal y Prince Valluri), 2026. https://www.zenml.io/llmops-database/platform-engineering-for-ai-scaling-multi-agentic-systems-with-mcp (secundaria)
  - Agentes de fondo propios en sandbox remoto que abren PRs; cada agente con identidad propia y permisos restringidos; mismas tools MCP para agentes de IDE y de fondo; "miles de desarrolladores" a diario (vago, sin fecha exacta).

## Descartados
- Intuit GenOS: solo comunicados de prensa (Business Wire, 3-jun-2025 y 23-sep-2025) con features (Agent Starter Kit, Evaluation Service); sin arquitectura técnica primaria verificable. Cifras de QCon solo en resumen secundario dudoso.
- Walmart Element / WIBEY: coberturas de prensa (SiliconANGLE, ago/sep-2025); el "Agent Gateway" MCP (oct-2026) es de cara al cliente, no plataforma interna.
- Netflix, Salesforce, Cisco, Booking.com, Amazon interno: no encontré en el tiempo disponible publicaciones técnicas primarias comparables sobre su plataforma interna de agentes.
- Casos AgentCore/ADK con nombre propio y "cientos de equipos": no encontré ninguno con arquitectura publicada (solo material genérico de producto).

## Datos no verificados / inconsistencias
- Uber: 84 % vs 92 % en la misma fuente; "decenas de miles de empleados" viene de una bio de autor.
- Block: 60+ (jun-2025) vs >100 (dic-2025) servidores MCP: plausible crecimiento, pero la segunda cifra es secundaria. 12.000 empleados es anterior al recorte de feb-2026.
- Telekom: >1 M preguntas (InfoQ) vs >2 M conversaciones (Qdrant) vs ~4,5 M sesiones/mes (36Kr, no verificado, no usado).
- Cloudflare: blog enterprise-mcp verificado solo vía resúmenes.
