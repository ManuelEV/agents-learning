# Investigación: protocolos, patrones y buenas prácticas (verificado al 31-10-2026)

> "(no verificado)" = solo fuente secundaria o de memoria.

## 1. Model Context Protocol (MCP)
- Protocolo abierto (JSON-RPC 2.0) entre **Host** (app LLM), **Client** (conector dentro del host) y **Server** (expone contexto/capacidades). Inspirado en LSP.
- **Versión actual: `2026-07-28`** — la mayor revisión: el protocolo es **stateless**. Historial: 2024-11-05 → 2025-03-26 → 2025-06-18 → 2025-11-25 → 2026-07-28. Versiones = fechas.
  - https://modelcontextprotocol.io/specification/versioning · https://modelcontextprotocol.io/specification/2026-07-28 · https://modelcontextprotocol.io/specification/2026-07-28/changelog
- Cambios 2026-07-28:
  - Sin handshake `initialize`; cada request lleva versión, capacidades y clientInfo en `_meta` (SEP-2575). Nuevo RPC obligatorio `server/discover`.
  - Sin sesiones a nivel protocolo (se elimina `Mcp-Session-Id`); el estado se maneja con *handles* explícitos como argumentos (SEP-2567).
  - `subscriptions/listen` reemplaza el stream GET y `resources/subscribe`. Se elimina reanudación SSE.
  - **Multi Round-Trip Requests (MRTR)**: reemplazan requests iniciadas por el servidor (sampling, elicitation, roots). El servidor responde `resultType: "input_required"` con `inputRequests`; el cliente reintenta con `inputResponses` (SEP-2322).
  - **Tasks** sale del core a extensión oficial `io.modelcontextprotocol/tasks` (polling `tasks/get`, `tasks/update`).
  - Streamable HTTP exige headers `Mcp-Method`/`Mcp-Name` (gateways enrutan sin parsear el body).
  - Listas con `ttlMs`/`cacheScope`; `tools/list` en orden determinista (ayuda al prompt caching).
  - Trace context OpenTelemetry en `_meta` (`traceparent`…) (SEP-414). JSON Schema 2020-12 completo.
  - **Deprecados**: Roots, Sampling, Logging (SEP-2577); transporte HTTP+SSE antiguo; Dynamic Client Registration → **Client ID Metadata Documents (CIMD)**.
- **SDK oficial de Python v2**: `FastMCP` pasó a llamarse **`MCPServer`** (`from mcp.server import MCPServer`); la ruta `mcp.server.fastmcp` ya no existe (verificado en el README de https://github.com/modelcontextprotocol/python-sdk, nov 2026).
- Transportes: **stdio** (subproceso local, recomendado local) y **Streamable HTTP** (remoto). https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
- Primitivas servidor: **Tools** (las ejecuta el modelo), **Resources** (datos/contexto), **Prompts** (plantillas invocadas por el usuario). Cliente: **Elicitation** (única activa; formulario o URL); Sampling/Roots deprecados. Extensiones: **Tasks**, **MCP Apps** (UI `ui://` en iframe sandbox; spec 2026-01-26), Skills over MCP (WG). https://modelcontextprotocol.io/extensions/apps/overview
- **Autorización** (solo HTTP; stdio usa credenciales del entorno): servidor MCP = **resource server OAuth 2.1**; **Protected Resource Metadata (RFC 9728)** obligatorio (401 con `WWW-Authenticate` + `resource_metadata`); descubrimiento AS vía RFC 8414/OIDC; **PKCE obligatorio**; **Resource Indicators (RFC 8707)**; validación `iss` (RFC 9207); registro: CIMD > pre-registro > DCR (deprecado); scopes mínimos con step-up en `403 insufficient_scope`; validar audiencia; **prohibido token passthrough**. https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- Seguridad (página oficial): confused deputy (consentimiento por cliente, redirect_uri exacto, `state` de un uso), token passthrough prohibido, SSRF en discovery (solo HTTPS, bloquear IPs privadas/169.254.169.254), secuestro de handles (aleatorios y ligados al usuario), compromiso de servidor local (mostrar comando, sandbox), URLs OAuth maliciosas, mix-up (`iss`), scopes amplios. Descripciones de tools = **no confiables**. https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices
- **Tool poisoning** (Invariant Labs, abr 2025): instrucciones ocultas en descripciones de tools; "rug pull", shadowing entre servidores. https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks
- **Registry**: preview desde 2025-09-08 (aún preview); metadatos `server.json`, namespaces DNS inverso; OpenAPI para registries privados. https://modelcontextprotocol.io/registry/about
- **Gobernanza**: MCP donado a la **Agentic AI Foundation (AAIF)** de la Linux Foundation, anunciada **2025-12-09** (proyectos fundadores MCP, goose, AGENTS.md; platinum: AWS, Anthropic, Block, Bloomberg, Cloudflare, Google, Microsoft, OpenAI). https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation

## 2. A2A, AG-UI, ACP, Agent Skills, AGENTS.md
- **A2A**: agente↔agente (descubrimiento, delegación de tareas, resultados). Complementa MCP (agente↔herramientas). Versiones: v0.3.0 (2025-07-30) → **v1.0.0 (2026-03-12)** → **v1.0.1 (2026-05-28)**. https://github.com/a2aproject/A2A/releases
  - Lanzado por Google abr 2025; a Linux Foundation jun 2025 (no verificado); **se une a AAIF el 2026-08-27** (150+ organizaciones). https://a2a-protocol.org/latest/blog/2026/08/27/a-new-chapter-for-a2a-joining-the-agentic-ai-foundation/
  - **Agent Card** en `/.well-known/agent-card.json` (identidad, skills, capacidades, interfaces, auth); v1.0: `supportedInterfaces[]`, **Agent Cards firmadas** (JWS + RFC 8785), extended card autenticada.
  - **Task** con estados SUBMITTED, WORKING, INPUT_REQUIRED, AUTH_REQUIRED, COMPLETED, FAILED, CANCELED, REJECTED. **Message** (user/agent) hecho de **Parts** (text, raw, url, data). **Artifact** = salida de la tarea.
  - Bindings: JSON-RPC, gRPC, HTTP+JSON. Streaming SSE (`SendStreamingMessage`, `SubscribeToTask`); push notifications por webhook. Extensiones vía header `A2A-Extensions`.
  - Breaking v1.0: operaciones en PascalCase (`SendMessage`, `GetTask`), enums `TASK_STATE_*`, paginación por cursor, multi-tenant, OAuth implicit/password eliminados.
  - https://a2a-protocol.org/latest/specification/ · https://a2a-protocol.org/latest/whats-new-v1/
- **ACP (IBM) se fusionó en A2A** (2025-08-29). https://lfaidata.foundation/?p=7689
- **AG-UI**: protocolo de eventos agente↔frontend (CopilotKit). Capas: MCP = tools, A2A = agente↔agente, AG-UI = agente↔UI. https://docs.ag-ui.com/introduction
- **Agent Skills**: carpeta con `SKILL.md` (frontmatter `name`, `description` + instrucciones; `scripts/`, `references/`, `assets/` opcionales). **Progressive disclosure**: descubrimiento (solo name/description) → activación (SKILL.md completo) → ejecución (scripts/archivos on demand). Estándar abierto dic 2025; **donado a AAIF 2026-10-22**; 70+ plataformas. https://agentskills.io/ · https://agentskills.io/specification · https://anthropic.com/news/donating-agent-skills-to-the-agentic-ai-foundation
- **AGENTS.md**: "README para agentes" (Markdown libre: comandos build/test, estilo, seguridad); anidable en monorepos; bajo AAIF; 60k+ proyectos. https://agents.md/

## 3. Patrones de diseño
- **Anthropic, "Building effective agents" (2024-12-19)** https://www.anthropic.com/engineering/building-effective-agents
  - Workflows (rutas de código predefinidas) vs agentes (el LLM dirige su proceso).
  - Patrones: LLM aumentado (retrieval+tools+memoria) → prompt chaining (con *gates*) → routing → parallelization (sectioning/voting) → orchestrator-workers → evaluator-optimizer → agentes autónomos.
  - Principios: simplicidad, transparencia (mostrar planificación), diseño cuidadoso del ACI (agent-computer interface). Tools documentadas como docstrings, probadas, "poka-yoke". Empezar con llamadas directas a la API y entender el framework.
- **"Effective context engineering for AI agents" (2025-09-29)** https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
  - Contexto = presupuesto de atención finito, sufre **context rot**; objetivo: el set mínimo de tokens de alta señal. System prompt a la "altitud correcta". Pocas tools, distintas, eficientes. Ejemplos canónicos diversos.
  - Recuperación *just-in-time* (guardar referencias y cargar bajo demanda). Tareas largas: **compactación**, notas estructuradas fuera del contexto, **sub-agentes** con contexto limpio que devuelven resúmenes.
- **"How we built our multi-agent research system" (2025-06-13)** https://www.anthropic.com/engineering/multi-agent-research-system — orquestador Opus 4 + subagentes Sonnet 4: **+90,2%** vs agente único en eval interna; uso de tokens explica 80% de la varianza; agentes ≈ **4×** tokens vs chat, multiagente ≈ **15×**; paralelismo reduce tiempo hasta 90%; reescribir descripciones de tools −40% tiempo; evals con ~20 queries y LLM-judge; producción: ejecución durable, tracing, *rainbow deployments*.
- Otros posts Anthropic: "Writing effective tools for agents" (sep 2025), "Code execution with MCP" (nov 2025), "Effective harnesses for long-running agents" (nov 2025), "Demystifying evals for AI agents" (2026-01-09). https://www.anthropic.com/engineering
- **OpenAI, "A practical guide to building agents"** (abr 2025) https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf — cuándo: decisiones complejas, reglas difíciles de mantener, datos no estructurados. Base: modelo + tools + instrucciones. Tools: Data, Action, Orchestration. Empezar con **un agente**; multiagente: patrón **Manager** (agentes como tools) o **Descentralizado** (handoffs). Guardrails en capas (relevancia, seguridad, PII, moderación, riesgo por tool bajo/medio/alto, regex, validación de salida). Intervención humana: umbral de fallos y acciones de alto riesgo.
- **Google/Kaggle**: whitepapers del 5-Day AI Agents Intensive (nov 2025): "Introduction to Agents", "Agent Quality". https://www.kaggle.com/whitepaper-agent-quality · https://blog.google/innovation-and-ai/technology/developers-tools/ai-agents-intensive-recap/
- **AWS Prescriptive Guidance — agentic AI patterns**: https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/introduction.html · https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/agentic-workflow-patterns.html (Bedrock razonamiento, Lambda/ECS tools, Step Functions orquestación, EventBridge/SQS mensajería, CloudWatch/X-Ray).
- Consenso: empezar simple (1 llamada → workflow → agente → multiagente), invertir en tools/ACI, controlar contexto, guardrails + aprobación humana en acciones irreversibles, evals desde casos reales.

## 4. RAG
- Naive: chunk → embed → top-k → generar. Advanced: reescritura/expansión de query, HyDE, **híbrido BM25 + vectores** fusionado con **RRF**, **reranking** cross-encoder, compresión. **Agentic RAG**: el agente decide cuándo/dónde/cómo buscar, multi-paso, multi-fuente, autocorrección.
- **Contextual Retrieval (Anthropic, sep 2024)** https://www.anthropic.com/news/contextual-retrieval — anteponer 50–100 tokens de contexto generado a cada chunk. Tasa de fallo (1−recall@20) base 5,7%: Contextual Embeddings 3,7% (−35%); + Contextual BM25 2,9% (−49%); + reranking 1,9% (−67%). ~US$1,02 por millón de tokens de documento con prompt caching. **Base < 200k tokens (~500 páginas): meter todo en el prompt** con caching.
- **GraphRAG (Microsoft)** https://microsoft.github.io/graphrag/ — extrae entidades/relaciones, clustering **Leiden**, resúmenes de comunidad; búsquedas Global, Local, DRIFT, Basic. Paper arXiv 2404.16130.
- **RAGAS** https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/ — Context Precision/Recall, Faithfulness, Response Relevancy, Noise Sensitivity; agentes: Tool Call Accuracy/F1, Agent Goal Accuracy, Topic Adherence. Evaluar retrieval (recall@k, MRR) separado de generación (faithfulness).

## 5. Producción
- **Evals** (Anthropic, "Demystifying evals for AI agents", 2026-01-09) https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents — task, trial, transcript, outcome, harness, suite. Graders: código (barato, frágil), modelo (LLM-as-judge, calibrar con humanos), humano (gold). **pass@k vs pass^k** (75% por intento → ~42% de pasar 3 de 3). Capability evals (bajas al inicio) vs regression evals (~100%). Empezar con **20–50 tareas de fallos reales**; **evaluar el resultado, no el camino exacto**; leer transcripts.
- **Observabilidad**: convenciones semánticas **OpenTelemetry GenAI** en estado *Development*, ahora en repo `open-telemetry/semantic-conventions-genai` (spans de cliente, agente, eventos, métricas, MCP; Anthropic, Bedrock, OpenAI…). https://github.com/open-telemetry/semantic-conventions-genai — **Langfuse** (MIT, self-host; adquirido por ClickHouse 2026-01-16) https://langfuse.com/blog/joining-clickhouse · LangSmith · Arize Phoenix (OpenInference).
- **HITL**: tools clasificadas por riesgo; aprobación humana en acciones irreversibles; en MCP elicitation/MRTR; en A2A `INPUT_REQUIRED`/`AUTH_REQUIRED`.
- **Ejecución durable**: Temporal + OpenAI Agents SDK GA (2026-03-23): loop como Workflow, llamadas al modelo como Activities. https://temporal.io/blog/announcing-openai-agents-sdk-integration · alternativas: Step Functions, checkpointers LangGraph, MCP Tasks.
- **Costos**: agentes ~4×, multiagente ~15× tokens; prompt caching, routing a modelos baratos, límites de turnos/reintentos, compactación.
- **Seguridad**: OWASP Top 10 LLM 2025 (LLM01 Prompt Injection, LLM02 Sensitive Info Disclosure, LLM03 Supply Chain, LLM04 Data/Model Poisoning, LLM05 Improper Output Handling, LLM06 Excessive Agency, LLM07 System Prompt Leakage, LLM08 Vector/Embedding Weaknesses, LLM09 Misinformation, LLM10 Unbounded Consumption) https://genai.owasp.org/llm-top-10/ · **OWASP Top 10 for Agentic Applications 2026** (2025-12-09): ASI01 Agent Goal Hijack, ASI02 Tool Misuse, ASI03 Identity & Privilege Abuse, ASI04 Agentic Supply Chain, ASI05 Unexpected Code Execution, ASI06 Memory & Context Poisoning, ASI07 Insecure Inter-Agent Communication, ASI08 Cascading Failures, ASI09 Human-Agent Trust Exploitation, ASI10 Rogue Agents (nombres de fuente secundaria) https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
- Prompt injection: todo contenido recuperado y output de tools = no confiable; separación de privilegios; mínimo privilegio; sandbox; allowlist de egress; confirmación humana.
- NIST AI RMF 1.0 + perfil GenAI (AI 600-1); **CAISI AI Agent Standards Initiative (2026-02-17)** https://nist.gov/news-events/news/2026/02/announcing-ai-agent-standards-initiative-interoperable-and-secure · ISO/IEC 42001:2023 · EU AI Act por fases.

## 6. Ruta de aprendizaje sugerida
| Nivel | Contenido | Proyecto hito |
|---|---|---|
| 0 Fundamentos | LLMs, tokens, ventana de contexto, prompting, Messages API, salida estructurada, costo/latencia | CLI que clasifica tickets en JSON con 20 casos de prueba |
| 1 LLM aumentado + tools | Tool calling, loop del agente, diseño de tools (ACI), guardrails básicos | Agente con 3 tools y límite de turnos |
| 2 RAG | Chunking, embeddings, híbrido, reranking, contextual retrieval, citas, RAGAS | Asistente Q&A sobre políticas internas con métricas |
| 3 Workflows | Chaining, routing, paralelización, evaluator-optimizer, context engineering | Pipeline de contratos: extraer → validar → resumir con gate |
| 4 Protocolos | Servidor/cliente MCP (stdio → HTTP, OAuth 2.1), Skills, AGENTS.md | Servidor MCP de un sistema corporativo + Skill |
| 5 Producción | Evals, tracing OTel/Langfuse, HITL, durable, OWASP, costos | Agente instrumentado con 30 evals en CI y aprobación |
| 6 Multiagente | Orquestador-workers, manager vs handoffs, A2A, gobierno, identidad | Sistema orquestador + especialistas, uno vía A2A, con evals y tracing |

Cursos gratuitos:
- DeepLearning.AI "Agentic AI" (Andrew Ng) https://www.deeplearning.ai/courses/agentic-ai · "MCP: Build Rich-Context AI Apps with Anthropic" https://www.deeplearning.ai/short-courses/mcp-build-rich-context-ai-apps-with-anthropic/ · "A2A: The Agent2Agent Protocol" https://learn.deeplearning.ai/courses/a2a-the-agent2agent-protocol · "Evaluating AI Agents" https://www.deeplearning.ai/courses/evaluating-ai-agents · "Serverless Agentic Workflows with Amazon Bedrock" https://learn.deeplearning.ai/courses/serverless-agentic-workflows-with-amazon-bedrock
- Hugging Face Agents Course https://huggingface.co/learn/agents-course/unit0/introduction · MCP course https://huggingface.co/learn/mcp-course (no verificado)
- Google/Kaggle 5-Day AI Agents Intensive https://blog.google/innovation-and-ai/technology/developers-tools/ai-agents-intensive-recap/
- Anthropic Academy https://anthropic.skilljar.com/
- Microsoft AI Agents for Beginners https://microsoft.github.io/ai-agents-for-beginners
