# Investigación: plataformas gestionadas y gateways (verificado al 31-10-2026)

> "(secundario)" = solo fuente secundaria; "(no verificado)" = no confirmado.

## Renombres a reflejar
- Vertex AI → **Gemini Enterprise Agent Platform** (22-04-2026, Next '26). Agent Engine → **Agent Runtime**; Vertex AI Search → **Agent Search**.
- Azure AI Foundry → **Microsoft Foundry** (Ignite, nov 2025).
- Cloudflare AutoRAG → **AI Search** (GA 01-10-2026).
- Envoy AI Gateway → **Agent Router** (proyecto de la Agentic AI Foundation).
- Bedrock Agents → **Bedrock Agents Classic**, ya no acepta clientes nuevos.
- Portkey adquirida por Palo Alto Networks (anuncio 30-04-2026, cierre 29-05-2026, secundario).

## 1. Amazon Bedrock
### 1.1 Bedrock AgentCore
- GA 13-10-2025 (9 regiones; VPC, PrivateLink, CloudFormation, tags). Agnóstico de framework (CrewAI, LangGraph, LlamaIndex, **Google ADK**, OpenAI Agents SDK, Strands) y de modelo.
- Runtime soporta HTTP (8080, `/invocations`, `/ws`), MCP (8000, `/mcp`), A2A (9000, `/`) y AG-UI.
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html · https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/release-notes.html

| Componente | Qué hace | Estado |
|---|---|---|
| Runtime | Serverless, aislamiento por sesión en microVM, ejecuciones largas; CodeZip o contenedor | GA oct 2025 |
| Gateway | APIs/OpenAPI/Lambda/Step Functions/MCP → tools MCP con auth unificada; "inference targets" con fallback de modelo; passthrough HTTP para A2A | GA oct 2025; inference targets jun-jul 2026; fallback oct 2026 |
| Memory | Corto y largo plazo, compartible entre agentes | GA oct 2025 |
| Identity | Identidad de agente, OAuth entrante/saliente (Cognito, Okta, Entra ID, Auth0) | GA oct 2025 |
| Code Interpreter | Sandbox Python/JS/TS | GA oct 2025 |
| Browser | Navegador gestionado (Playwright, BrowserUse) | GA oct 2025 |
| Observability | Trazas OTEL en CloudWatch | GA oct 2025 |
| Policy | Reglas deterministas sobre cada tool call en Gateway (lenguaje natural o Cedar); integra Guardrails | GA 03-03-2026 |
| Evaluations | Online (trazas de producción) y on-demand; batch | GA 31-03-2026 |
| Harness | Loop de agente gestionado sin contenedor (`CreateHarness`/`InvokeHarness`) | GA 17-06-2026 |
| Registry | Catálogo gobernado de agentes, MCP y skills | GA ago 2026 |
| Payments | Micropagos x402 para agentes | GA 18-08-2026 |
| Managed Knowledge Base | RAG gestionado vía Gateway (S3, SharePoint, Confluence, Drive…) | GA jun-jul 2026 |

### 1.2 Bedrock Agents (Classic)
"No longer open to new customers… explore Amazon Bedrock AgentCore". No usar en proyectos nuevos. https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html

### 1.3 Knowledge Bases
- Vector stores: OpenSearch Serverless, OpenSearch Managed, **S3 Vectors** (GA 02-12-2025; 2.000M vectores/índice; el más barato), **Aurora PostgreSQL pgvector**, **Neptune Analytics (GraphRAG, GA 07-03-2025)**, Pinecone, Redis Enterprise Cloud, MongoDB Atlas.
- Reranking: Amazon Rerank 1.0, Cohere Rerank 3.5 en `Retrieve`/`RetrieveAndGenerate`.
- https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html · https://aws.amazon.com/about-aws/whats-new/2025/12/amazon-s3-vectors-generally-available/ · https://docs.aws.amazon.com/bedrock/latest/userguide/rerank-use.html

### 1.4 Guardrails
Filtros de contenido (incl. **prompt attack**), temas denegados, palabras, PII/regex, **contextual grounding**, **Automated Reasoning checks**. `ApplyGuardrail` evalúa texto sin invocar modelo (sirve para modelos fuera de Bedrock). https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html

### 1.5 Prompt caching
Converse `cachePoint` (`{"type":"default","ttl":"1h"}`), InvokeModel `cache_control`; TTL 5 min o 1 h; hasta 4 checkpoints. https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html

### 1.6 Cross-region inference profiles
Prefijos `us.`, `eu.`, `apac.`, `jp.`, `au.`, `global.` (~10% más barato). Claude recientes **solo on-demand vía inference profile** (`global.anthropic.claude-sonnet-5-5`, `us.anthropic.claude-opus-5-5`). IAM/SCP deben permitir todas las regiones destino. https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html · https://docs.aws.amazon.com/bedrock/latest/userguide/global-cross-region-inference.html

### 1.7 Converse API / Mantle
Converse/ConverseStream = API unificada chat + tool use. **Bedrock Mantle** = endpoint compatible OpenAI (Chat/Responses) y Anthropic Messages. API keys: `AWS_BEARER_TOKEN_BEDROCK`. https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html · https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints.html

## 2. Google Cloud — Gemini Enterprise Agent Platform
- "Evolution of Vertex AI" (22-04-2026). Pilares: **Build** (ADK, Agent Studio, Agent Garden, Model Garden, RAG Engine, Vector Search), **Scale** (Agent Runtime, Sessions, Memory Bank, Code Execution), **Govern** (Agent Registry, Agent Identity, Agent Gateway, Model Armor), **Optimize** (evaluación, observabilidad).
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/overview · https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes · https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes
- **Agent Runtime** (ex Agent Engine): ADK, LangChain, LangGraph, AG2, LlamaIndex, CrewAI o contenedor. Sessions y Memory Bank GA dic 2025. A2A en preview. https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/runtime
- **Agent Gateway** y **Agent Registry** GA 18-06-2026 (Registry con A2A v1.0).
- **Gemini Enterprise** (ex Agentspace): producto para empleados (chat, búsqueda, agentes). https://cloud.google.com/gemini-enterprise/faq
- **RAG Engine**: RagManagedDb, Vector Search, Feature Store, Pinecone, Weaviate; VPC-SC, CMEK. https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/vector-db-choices
- **Agent Search** (ex Vertex AI Search). https://cloud.google.com/products/gemini-enterprise-agent-platform/agent-search

## 3. Microsoft Foundry Agent Service
- Microsoft Foundry (ex Azure AI Foundry, nov 2025). Agent Service next-gen GA mar 2026; **hosted agents** GA ~jun 2026 (microVM).
- Tipos: prompt agents (declarativos), hosted agents (Agent Framework, LangGraph, OpenAI Agents SDK, Claude Agent SDK o propio).
- **Toolboxes**: web search, file search, code interpreter, memoria, OpenAPI y MCP tras un endpoint MCP gestionado. Identidad Entra por agente; VNet; publicación en Teams/Copilot. **A2A v1.0 GA**. Claude disponible en Foundry.
- https://learn.microsoft.com/en-us/azure/foundry/agents/overview · https://learn.microsoft.com/azure/foundry/foundry-models/concepts/claude-models

## 4. Cloudflare
- **Agents SDK**: cada agente es un Durable Object (SQL local, WebSockets, scheduler, cliente MCP). https://developers.cloudflare.com/agents/
- **Remote MCP en Workers**: Streamable HTTP + OAuth. https://developers.cloudflare.com/agents/model-context-protocol/
- **AI Gateway**: analítica, logs, caché, rate limiting, retries, fallback; 24 proveedores incl. Bedrock. https://developers.cloudflare.com/ai-gateway/ · https://developers.cloudflare.com/ai-gateway/usage/providers/
- **Workers AI**: inferencia serverless de modelos abiertos.
- **AI Search** (ex AutoRAG): GA 01-10-2026; híbrido por defecto, endpoint MCP por instancia. https://developers.cloudflare.com/ai-search/

## 5. Gateways
- **LLM gateway** (app ↔ proveedores): API unificada, claves virtuales, presupuestos, rate limits, fallbacks, caché, costos.
- **Gateway MCP/tools** (agente ↔ herramientas): catálogo, OAuth hacia sistemas, políticas por llamada, auditoría.
- Tendencia 2026: convergencia (LiteLLM, Kong, Portkey, Agent Router incluyen MCP; AgentCore Gateway acepta inference targets).

| Gateway | Tipo | Hechos | URL |
|---|---|---|---|
| LiteLLM Proxy (OSS) | LLM + MCP | Claves virtuales (Postgres), `max_budget`, tpm/rpm, fallbacks, Bedrock nativo, MCP gateway con permisos. ⚠️ 1.82.7/1.82.8 comprometidas → `>=1.84` | https://docs.litellm.ai/docs/proxy/virtual_keys · https://docs.litellm.ai/docs/mcp |
| Cloudflare AI Gateway | LLM SaaS | Caché, rate limit, fallback, analítica; Bedrock | https://developers.cloudflare.com/ai-gateway/ |
| Vercel AI Gateway | LLM SaaS | OpenAI/Anthropic-compatible, fallbacks, presupuestos, BYOK, zero markup | https://vercel.com/docs/ai-gateway |
| Kong AI Gateway | LLM + MCP | Plugin `ai-mcp-proxy`, caché semántica | https://developer.konghq.com/plugins/ai-mcp-proxy/ |
| Portkey | LLM + MCP | OSS desde mar 2026; Palo Alto Networks | https://portkey.ai/docs |
| Agent Router (ex Envoy AI Gateway) | LLM + MCP (K8s) | AAIF; 22+ proveedores; rate limit por tokens | https://theagentrouter.ai/ |
| AWS Multi-Provider GenAI Gateway | Ref. arquitectura | LiteLLM en ECS/EKS + ALB/WAF + RDS + Secrets Manager; Guardrails para cualquier proveedor | https://aws.amazon.com/solutions/guidance/multi-provider-generative-ai-gateway-on-aws/ |
| AgentCore Gateway | Tools/MCP (+inferencia) | APIs/Lambda/MCP → MCP; Policy (Cedar) | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html |
| Docker MCP Gateway | MCP | `docker mcp gateway run`; servidores MCP en contenedores aislados | https://docs.docker.com/ai/mcp-catalog-and-toolkit/mcp-gateway/ |
| Google Agent Gateway / Apigee | Agentes-tools / LLM | GA jun 2026; ADK conector `ApigeeLlm` | https://adk.dev/agents/models/ |

## 6. ADK → LiteLLM → Claude en Bedrock
- ADK no tiene integración nativa con Bedrock; usa LiteLLM. `from google.adk.models.lite_llm import LiteLlm`. Formato `bedrock/<model-or-profile-id>`; `bedrock/converse/...`. Claude recientes **exigen inference profile id** (con id base → 400). https://adk.dev/agents/models/litellm/ · https://docs.litellm.ai/docs/providers/bedrock
- Model IDs: `anthropic.claude-sonnet-5-5`, `anthropic.claude-opus-5-5`, `anthropic.claude-haiku-5-5`; perfiles `us.`, `eu.`, `global.`. https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-sonnet-5-5.html

Opción A — SDK embebido:
```python
# pip install google-adk "litellm>=1.84"
import os
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

os.environ["AWS_REGION_NAME"] = "us-east-1"  # credenciales: cadena estándar boto3 (rol IAM)
agent = LlmAgent(
    name="asistente",
    model=LiteLlm(model="bedrock/global.anthropic.claude-sonnet-5-5"),
    instruction="Eres un asistente corporativo.",
)
```

Opción B — LiteLLM Proxy como AI gateway corporativo (recomendada):
```yaml
model_list:
  - model_name: claude-sonnet
    litellm_params:
      model: bedrock/global.anthropic.claude-sonnet-5-5
      aws_region_name: os.environ/AWS_REGION_NAME
```
```python
LiteLlm(model="litellm_proxy/claude-sonnet", api_base="https://ai-gateway.interno", api_key="sk-<virtual-key>")
```
https://docs.litellm.ai/docs/providers/litellm_proxy — el agente nunca ve credenciales AWS; claves virtuales, presupuestos, fallbacks (us. → eu.) y logs centralizados.

- IAM mínimo: `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream` sobre el ARN del inference profile **y** los foundation models en todas las regiones destino.
- Desplegar ADK en AgentCore Runtime: CLI `agentcore create` → `agentcore dev` → `agentcore deploy` → `agentcore invoke` (CLI v1.0 `@aws/agentcore`, oct 2026). https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/agentcore-get-started-cli.html · Sample oficial: https://github.com/awslabs/agentcore-samples/tree/main/03-integrations/agentic-frameworks/adk (envuelve el Runner de ADK con `BedrockAgentCoreApp` + `@app.entrypoint`). Contrato: HTTP 8080 `/invocations`. https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-service-contract.html
- Otros samples: A2A multi-agent incident response con host ADK (`02-use-cases/01-conversational-agents/A2A-multi-agent-incident-response`); evaluations sobre ADK.

## 7. Bases vectoriales
- **pgvector**: Postgres (HNSW/IVFFlat) en Aurora/RDS, Cloud SQL, AlloyDB, Azure. Si ya tienes Postgres.
- **OpenSearch**: híbrido léxico+vectorial; store por defecto en Bedrock KB.
- **S3 Vectors**: costo mínimo, escala masiva, latencia sub-segundo; consultas poco frecuentes.
- **Pinecone**: SaaS gestionado (Bedrock KB, RAG Engine).
- **Weaviate**: OSS/gestionado, híbrido.
- **Qdrant**: OSS en Rust, filtrado por payload rápido.
- **AlloyDB AI**: Postgres de Google con ScaNN.
- **Azure AI Search**: híbrido + semantic ranker; natural para Foundry.
- Neptune Analytics (GraphRAG), MongoDB Atlas, Redis, RagManagedDb.

## 8. Guía de decisión
- **AWS**: Bedrock (Converse/Mantle), perfiles `global.`/geo según residencia, prompt caching 1 h; AgentCore Runtime para ADK + Memory + Identity + Gateway/Policy + Evaluations/Observability; **no Bedrock Agents Classic**; RAG con Knowledge Bases (S3 Vectors costo, OpenSearch híbrido, pgvector si hay Postgres, Neptune GraphRAG); LiteLLM Proxy si multi-proveedor; Guardrails (`ApplyGuardrail`).
- **GCP**: ADK → Agent Runtime + Sessions/Memory Bank; Agent Gateway/Registry; RAG Engine/Agent Search; Gemini Enterprise; Apigee.
- **Azure/M365**: Foundry Agent Service (prompt o hosted agents), Toolboxes MCP, Entra Agent ID, Azure AI Search; A2A v1.0 GA.
- **Multi-cloud**: framework portable (ADK, LangGraph, Strands) + MCP + A2A; gateway LLM autoalojado (LiteLLM, Agent Router) o SaaS; gateway MCP separado; ejecutar donde están los datos.
- **Edge**: Cloudflare Agents SDK + Workers AI + AI Search + AI Gateway.
