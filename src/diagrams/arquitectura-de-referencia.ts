import type { ApiMessage, IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ------------------------------------------------------------------ */
/* Código reutilizado literalmente de arquitectura-de-referencia.mdx   */
/* ------------------------------------------------------------------ */

/** Bloque `app/ops_agent/agent.py` del artículo. */
const AGENT_PY = `import os
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from guardrails import guardrail_entrada, validar_argumentos

modelo = LiteLlm(
    model="litellm_proxy/claude-sonnet",          # alias del gateway, no el ID de Bedrock
    api_base=os.environ["AI_GATEWAY_URL"],
    api_key=os.environ["AI_GATEWAY_KEY"],         # inyectada desde Secrets Manager
)

herramientas = McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url=os.environ["AGENTCORE_GATEWAY_URL"],  # endpoint MCP del AgentCore Gateway
        headers={"Authorization": f"Bearer {os.environ['GATEWAY_TOKEN']}"},
    ),
    tool_filter=[                                  # solo lo que este agente necesita
        "Pedidos___consultar_pedido",
        "Inventario___stock_por_tienda",
        "Procedimientos___buscar",
        "Tickets___crear_ticket",
    ],
)

root_agent = LlmAgent(
    name="asistente_operaciones",
    model=modelo,
    instruction=(
        "Eres el asistente de operaciones de la cadena. Usa las herramientas; no inventes "
        "estados ni políticas. Cita el procedimiento que respalda cada recomendación.\\n"
        "Recuerdos del usuario: {recuerdos}"       # se rellena desde el estado de la sesión
    ),
    tools=[herramientas],
    before_model_callback=guardrail_entrada,       # defensa en profundidad (ver abajo)
    before_tool_callback=validar_argumentos,       # reglas de negocio antes de cada tool
)`

/** Bloque `app/ops_agent/main.py` del artículo. */
const MAIN_PY = `import os
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from bedrock_agentcore.memory import MemoryClient
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from agent import root_agent

APP = "asistente_operaciones"
MEMORY_ID = os.environ["MEMORY_ID"]
app = BedrockAgentCoreApp()
memoria = MemoryClient(region_name=os.environ["AWS_REGION"])
sesiones = InMemorySessionService()      # caché local: vive lo que vive la microVM de la sesión
runner = Runner(agent=root_agent, app_name=APP, session_service=sesiones)

@app.entrypoint
async def invocar(payload, context):
    user_id = payload["user_id"]         # en producción: derívalo del JWT validado, no del payload
    sid = context.session_id             # una microVM por session_id
    if await sesiones.get_session(app_name=APP, user_id=user_id, session_id=sid) is None:
        recuerdos = memoria.retrieve_memories(memory_id=MEMORY_ID,
            namespace=f"/preferencias/{user_id}/", query=payload["prompt"])
        await sesiones.create_session(app_name=APP, user_id=user_id, session_id=sid,
            state={"recuerdos": "\\n".join(r["content"]["text"] for r in recuerdos)})
    mensaje = types.Content(role="user", parts=[types.Part(text=payload["prompt"])])
    final = ""
    async for evento in runner.run_async(user_id=user_id, session_id=sid, new_message=mensaje):
        if evento.is_final_response() and evento.content and evento.content.parts:
            final = evento.content.parts[0].text or ""
    memoria.create_event(memory_id=MEMORY_ID, actor_id=user_id, session_id=sid,
        messages=[(payload["prompt"], "USER"), (final, "ASSISTANT")])
    return {"result": final}

if __name__ == "__main__":
    app.run()                            # sirve :8080 /invocations y /ping`

/** Bloque `plataforma-ai-gateway/config.yaml` del artículo. */
const CONFIG_YAML = `model_list:
  - model_name: claude-sonnet                  # alias que usan los agentes
    litellm_params:
      model: bedrock/global.anthropic.claude-sonnet-5-5
      aws_region_name: us-east-1               # región de origen; global. enruta a todo el mundo
      cache_control_injection_points:          # prompt caching (repítelo en cada deployment)
        - location: message
          role: system
  - model_name: claude-sonnet-eu
    litellm_params:
      model: bedrock/eu.anthropic.claude-sonnet-5-5
      aws_region_name: eu-west-1               # los perfiles eu. se invocan desde regiones UE
  - model_name: claude-sonnet-us
    litellm_params:
      model: bedrock/us.anthropic.claude-sonnet-5-5
      aws_region_name: us-east-1

router_settings:
  fallbacks: [{"claude-sonnet": ["claude-sonnet-eu", "claude-sonnet-us"]}]
  num_retries: 2                               # reintentos antes de pasar al fallback
  allowed_fails: 3                             # fallos antes del cooldown de una deployment
  cooldown_time: 30

guardrails:
  - guardrail_name: bedrock-corporativo
    litellm_params:
      guardrail: bedrock
      mode: pre_call                           # permite enmascarar PII antes del modelo
      guardrailIdentifier: gr-ops-retail       # ID del guardrail en Bedrock
      guardrailVersion: "3"
      aws_region_name: us-east-1

litellm_settings:
  callbacks: ["otel"]                          # trazas hacia el colector ADOT → CloudWatch
  request_timeout: 120

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL        # RDS Postgres: claves, presupuestos, gasto`

/** Bloque `crear_clave.sh` del artículo. */
const CREAR_CLAVE = `curl -s -X POST "$AI_GATEWAY_URL/key/generate" \\
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H "Content-Type: application/json" \\
  -d '{"models": ["claude-sonnet"], "max_budget": 800, "budget_duration": "30d",
       "tpm_limit": 400000, "rpm_limit": 300,
       "metadata": {"agente": "asistente_operaciones", "centro_costo": "OPS-114"}}'`

/** Bloque `rol-ai-gateway.json` del artículo. */
const ROL_GATEWAY = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PerfilGlobal",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:us-east-1:111122223333:inference-profile/global.anthropic.claude-sonnet-5-5"
    },
    {
      "Sid": "ModeloViaPerfiles",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-5-5",
        "arn:aws:bedrock:::foundation-model/anthropic.claude-sonnet-5-5"
      ],
      "Condition": { "StringLike": {
        "bedrock:InferenceProfileArn": "arn:aws:bedrock:*:111122223333:inference-profile/*.anthropic.claude-sonnet-5-5"
      } }
    },
    {
      "Sid": "PerfilesGeograficos",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:us-east-1:111122223333:inference-profile/us.anthropic.claude-sonnet-5-5",
        "arn:aws:bedrock:eu-west-1:111122223333:inference-profile/eu.anthropic.claude-sonnet-5-5"
      ]
    },
    {
      "Sid": "Guardrail",
      "Effect": "Allow",
      "Action": "bedrock:ApplyGuardrail",
      "Resource": "arn:aws:bedrock:us-east-1:111122223333:guardrail/*"
    }
  ]
}`

/** Bloque `policies/herramientas.cedar` del artículo. */
const CEDAR = `// Consultas: cualquier usuario autenticado del IdP corporativo
permit(
  principal is AgentCore::OAuthUser,
  action == AgentCore::Action::"Pedidos___consultar_pedido",
  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/ops-retail"
);

// Notas de crédito: solo jefes de tienda y por debajo de 500
permit(
  principal is AgentCore::OAuthUser,
  action == AgentCore::Action::"Pedidos___emitir_nota_credito",
  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/ops-retail"
) when {
  principal.hasTag("role") && principal.getTag("role") == "jefe_tienda" &&
  context.input.monto < 500
};`

/* ------------------------------------------------------------------ */
/* Código ilustrativo para el pipeline de CI/CD (no está en la página) */
/* ------------------------------------------------------------------ */

const CI_YAML = `name: asistente-operaciones
on:
  pull_request:                            # todo cambio entra por PR
  push:
    branches: [main]

permissions:
  id-token: write                          # OIDC: credenciales AWS de corta duración
  contents: read

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: uv sync --locked              # litellm>=1.84 fijado por hash en uv.lock
      - run: uv run pytest tests/          # herramientas, callbacks y guardrails
      - run: cedar validate --schema policies/schema.cedarschema --policies policies/herramientas.cedar
      - run: npm install -g @aws/agentcore && agentcore build

  staging:
    needs: ci
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: "\${{ vars.STAGING_DEPLOY_ROLE }}", aws-region: us-east-1 }
      - run: npm install -g @aws/agentcore && agentcore deploy   # cuenta staging (aws-targets.json)
      - run: uv run python evals/correr_evals.py --dataset evals/set_dorado.jsonl --k 3

  produccion:
    needs: staging                         # solo si el gate de evals salió con código 0
    runs-on: ubuntu-latest
    environment: produccion                # reglas del entorno: aprobación, ventanas
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: "\${{ vars.PROD_DEPLOY_ROLE }}", aws-region: us-east-1 }
      - run: npm install -g @aws/agentcore && agentcore deploy   # la versión anterior queda para rollback`

const EVALS_PY = `import argparse, json, os, sys, uuid
import boto3
from metricas import costo_y_latencia      # lee tokens y duración de las trazas en CloudWatch

agentcore = boto3.client("bedrock-agentcore")
ARN = os.environ["RUNTIME_ARN_STAGING"]
UMBRAL = {"pass_k": 0.90, "costo_usd": 0.12, "p95_s": 18.0}   # referencia: producción actual

def correr(caso: dict) -> dict:
    sid = f"eval-{uuid.uuid4()}"            # sesión nueva por intento: sin memoria compartida
    r = agentcore.invoke_agent_runtime(agentRuntimeArn=ARN, runtimeSessionId=sid,
        payload=json.dumps({"prompt": caso["prompt"], "user_id": "eval"}))
    salida = json.loads(r["response"].read())["result"]
    ok = all(frase.lower() in salida.lower() for frase in caso["debe_mencionar"])
    return {"ok": ok, "sid": sid}

def main(args):
    casos = [json.loads(l) for l in open(args.dataset, encoding="utf-8")]
    intentos = {c["id"]: [correr(c) for _ in range(args.k)] for c in casos}
    pass_k = sum(all(i["ok"] for i in rs) for rs in intentos.values()) / len(casos)
    costo, p95 = costo_y_latencia([i["sid"] for rs in intentos.values() for i in rs])
    reporte = {"pass^k": round(pass_k, 3), "costo_usd_tarea": costo, "p95_s": p95}
    print(json.dumps(reporte))
    if pass_k < UMBRAL["pass_k"] or costo > UMBRAL["costo_usd"] or p95 > UMBRAL["p95_s"]:
        sys.exit(1)                          # bloquea la promoción a producción

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--dataset"); p.add_argument("--k", type=int, default=3)
    main(p.parse_args())`

/* ------------------------------------------------------------------ */
/* Datos compartidos del escenario                                     */
/* ------------------------------------------------------------------ */

const SID = 'ops-sess-0c41e7b2-9a6f-4d38-b1e5-27f8a9c3d610'
const PREGUNTA = '¿Por qué el pedido 4512 no llegó y qué le puedo ofrecer al cliente?'
const SYSTEM =
  'Eres el asistente de operaciones de la cadena. Usa las herramientas; no inventes estados ni políticas. Cita el procedimiento que respalda cada recomendación.\nRecuerdos del usuario: Jefe de la tienda 114 (Providencia). Prefiere respuestas cortas con pasos numerados.'

/* ------------------------------------------------------------------ */
/* 1. Recorrido de una petición                                        */
/* ------------------------------------------------------------------ */

export const adkBedrockArquitectura: IsoSpec = {
  id: 'adk-bedrock-arquitectura',
  title: 'ADK + AI gateway + Bedrock: recorrido de una petición',
  summary:
    'Como **ejemplo concreto**: un agente **Google ADK** corre en **AgentCore Runtime**; todas sus llamadas al modelo pasan por un **AI gateway** (LiteLLM Proxy) hacia **Claude en Bedrock**; las herramientas llegan por **MCP** a través de **AgentCore Gateway** con Identity y Policy; el conocimiento sale de **Knowledge Bases** y la memoria de **AgentCore Memory**. Recorre los 8 pasos: en **Datos** verás la petición HTTP, la request OpenAI-compatible con clave virtual, la llamada `converse` que arma el gateway y el JSON-RPC de MCP; en **Código**, las líneas de `main.py`, `agent.py` y `config.yaml` del artículo.',
  height: 520,
  zones: [
    { id: 'agentcore', label: 'AgentCore', from: [1.9, -1.5], to: [8.3, 4.9], tone: 'agent' },
    { id: 'vpc', label: 'VPC · AI gateway', from: [1.9, -4.9], to: [8.3, -1.9], tone: 'gateway' },
    { id: 'bedrock', label: 'Amazon Bedrock', from: [8.7, -8.3], to: [12.0, -1.9], tone: 'model' },
  ],
  nodes: [
    { id: 'user', label: 'Usuario / canal', sub: 'portal, Teams, API', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Un jefe de tienda pregunta desde el portal interno. La app envía el prompt con el **JWT corporativo** del usuario (Entra ID, Okta o Cognito) a `InvokeAgentRuntime`.' },
    { id: 'obs', label: 'Observabilidad', sub: 'OTel → CloudWatch', at: [0, -3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'Trazas OpenTelemetry del agente (spans de agente, modelo y tools) en **AgentCore Observability / CloudWatch**, más los logs de costo del gateway. Langfuse es opcional como segunda vista para el equipo de producto.' },
    { id: 'agent', label: 'Agente ADK', sub: 'AgentCore Runtime', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Código ADK (`LlmAgent` + `Runner`) envuelto con `BedrockAgentCoreApp` y `@app.entrypoint`. Runtime da una **microVM aislada por sesión**, escalado serverless y autorizador JWT de entrada.' },
    { id: 'memory', label: 'AgentCore Memory', sub: 'corto y largo plazo', at: [3.4, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Complementa a `InMemorySessionService`: eventos de la conversación (corto plazo, `create_event`) y registros extraídos por estrategias como resúmenes o preferencias (largo plazo, `retrieve_memories`), por `actor_id` y `session_id`.' },
    { id: 'gateway', label: 'AgentCore Gateway', sub: 'MCP + Policy (Cedar)', at: [6.8, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Expone APIs, Lambdas y servidores MCP como **un solo endpoint MCP**. Cada `tools/call` se evalúa contra un **policy engine Cedar** antes de llegar al sistema destino.' },
    { id: 'identity', label: 'AgentCore Identity', sub: 'OAuth entrante/saliente', at: [6.8, 3.4], shape: 'box', tone: 'guard', icon: 'key', info: 'Valida el token de entrada y guarda las credenciales salientes (OAuth 2.0, API keys) en un *token vault*: el agente nunca ve secretos de los sistemas destino.' },
    { id: 'erp', label: 'Sistemas internos', sub: 'ERP, tickets, CRM', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'Targets del Gateway: APIs OpenAPI, funciones Lambda o servidores MCP propios. Las herramientas de escritura llevan políticas más estrictas y aprobación humana.' },
    { id: 'kb', label: 'Knowledge Bases', sub: 'RAG híbrido + rerank', at: [10.2, 3.4], shape: 'stack', tone: 'data', icon: 'book', info: '**Bedrock Knowledge Bases** sobre manuales y políticas (OpenSearch Serverless para búsqueda híbrida o S3 Vectors por costo). Se consulta como herramienta con `Retrieve` + reranking y filtros de metadatos.' },
    { id: 'pg', label: 'Postgres (RDS)', sub: 'keys, budgets, spend', at: [3.4, -3.4], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Base del LiteLLM Proxy: claves virtuales, equipos, presupuestos (`max_budget`) y gasto acumulado por clave. Credenciales en Secrets Manager.' },
    { id: 'litellm', label: 'LiteLLM Proxy', sub: 'ECS Fargate', at: [6.8, -3.4], shape: 'hex', tone: 'gateway', icon: 'router', info: 'AI gateway según la guía **Multi-Provider GenAI Gateway** de AWS: API OpenAI-compatible, claves virtuales, límites tpm/rpm, fallbacks entre perfiles de inferencia, caché de prompts y logs de costo.' },
    { id: 'claude', label: 'Claude Sonnet 5.5', sub: 'perfil global.', at: [10.7, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Invocado **solo mediante perfil de inferencia** (`global.anthropic.claude-sonnet-5-5`); con el ID base del modelo Bedrock responde 400. El rol del gateway necesita permisos sobre el perfil y los modelos en todas las regiones destino.' },
    { id: 'guard', label: 'Bedrock Guardrails', sub: 'ApplyGuardrail', at: [10.2, -6.8], shape: 'box', tone: 'guard', icon: 'shield', info: 'El gateway llama `ApplyGuardrail` antes (y opcionalmente después) del modelo: prompt attacks, PII, temas denegados y *contextual grounding*. Funciona igual para cualquier proveedor detrás del gateway.' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'memory', to: 'agent', route: 'z' },
    { from: 'agent', to: 'litellm', label: 'OpenAI API' },
    { from: 'litellm', to: 'pg', route: 'x' },
    { from: 'litellm', to: 'claude', label: 'Converse' },
    { from: 'litellm', to: 'guard' },
    { from: 'agent', to: 'gateway', label: 'MCP' },
    { from: 'gateway', to: 'identity', route: 'z' },
    { from: 'gateway', to: 'erp' },
    { from: 'gateway', to: 'kb' },
    { from: 'agent', to: 'obs', dashed: true },
  ],
  code: {
    main: { title: 'app/ops_agent/main.py', lang: 'python', source: MAIN_PY },
    agent: { title: 'app/ops_agent/agent.py', lang: 'python', source: AGENT_PY },
    gw: { title: 'plataforma-ai-gateway/config.yaml', lang: 'yaml', source: CONFIG_YAML },
  },
  steps: [
    {
      title: '1 · Petición autenticada',
      body: 'La app llama a `InvokeAgentRuntime` con el JWT del usuario y un id de sesión. El **autorizador JWT** del Runtime valida emisor y audiencia y asigna (o reutiliza) una microVM para ese `session_id`; recién entonces se ejecuta `invocar(payload, context)`.',
      flows: ['user>agent: InvokeAgentRuntime'],
      focus: ['user', 'agent', 'identity'],
      data: {
        title: 'InvokeAgentRuntime (HTTPS + JWT)',
        lang: 'http',
        content: `POST /runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A111122223333%3Aruntime%2Fops_agent-Xy12Ab/invocations?qualifier=DEFAULT HTTP/1.1
Host: bedrock-agentcore.us-east-1.amazonaws.com
Authorization: Bearer eyJraWQiOiJ…   ← JWT del IdP corporativo
X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: ${SID}
Content-Type: application/json

${json({ prompt: PREGUNTA, user_id: 'jefe-tienda-114' })}`,
        hl: ['Authorization: Bearer', 'Runtime-Session-Id', '"prompt"'],
      },
      code: { file: 'main', hl: ['app = BedrockAgentCoreApp()', '@app.entrypoint', 'user_id = payload["user_id"]', 'sid = context.session_id'] },
    },
    {
      title: '2 · Memoria y contexto',
      body: 'Si la sesión es nueva en esta microVM, el entrypoint recupera de **AgentCore Memory** los recuerdos de largo plazo del usuario y los guarda en el estado de la sesión ADK. La instrucción del agente los interpola en `{recuerdos}`: así llegan al system prompt.',
      flows: ['memory>agent: retrieve_memories'],
      data: {
        title: 'retrieve_memories → estado de la sesión (forma simplificada)',
        lang: 'json',
        content: json({
          retrieve_memories: [
            { content: { text: 'Jefe de la tienda 114 (Providencia).' } },
            { content: { text: 'Prefiere respuestas cortas con pasos numerados.' } },
          ],
          'session.state': { recuerdos: 'Jefe de la tienda 114 (Providencia).\nPrefiere respuestas cortas con pasos numerados.' },
        }),
        hl: ['"retrieve_memories"', '"recuerdos"'],
      },
      code: { file: 'main', hl: ['memoria.retrieve_memories(', 'namespace=f"/preferencias/{user_id}/"', 'state={"recuerdos"'] },
    },
    {
      title: '3 · Inferencia vía AI gateway',
      body: 'El modelo de ADK es `LiteLlm("litellm_proxy/claude-sonnet")`: la llamada sale en **formato OpenAI** hacia el LiteLLM Proxy con la **clave virtual** del agente. `claude-sonnet` es un **alias** del gateway, no un ID de Bedrock. Las herramientas MCP viajan como `tools` de tipo `function`.',
      flows: ['agent>litellm: POST /chat/completions', 'litellm>pg: ¿clave y presupuesto?'],
      data: {
        title: 'request OpenAI-compatible al gateway',
        lang: 'http',
        content: `POST /chat/completions HTTP/1.1
Host: ai-gateway.interno
Authorization: Bearer sk-ops-…   ← clave virtual del agente
Content-Type: application/json

${json({
  model: 'claude-sonnet',
  messages: [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: PREGUNTA },
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'Pedidos___consultar_pedido',
        description: 'Estado, transportista e incidencias de un pedido.',
        parameters: { type: 'object', properties: { pedido: { type: 'string' } }, required: ['pedido'] },
      },
    },
  ],
})}`,
        hl: ['POST /chat/completions', 'Authorization: Bearer sk-ops', '"model": "claude-sonnet"'],
      },
      code: { file: 'agent', hl: ['model="litellm_proxy/claude-sonnet"', 'api_base=os.environ["AI_GATEWAY_URL"]', 'api_key=os.environ["AI_GATEWAY_KEY"]'] },
    },
    {
      title: '4 · Guardrail y Claude en Bedrock',
      body: 'Con la clave válida, el proxy aplica `ApplyGuardrail` (modo `pre_call`), traduce el alias a `bedrock/global.anthropic.claude-sonnet-5-5` y llama a **Converse** firmando con el rol IAM del gateway. `cache_control_injection_points` agrega un `cachePoint` tras el system prompt. Si hay throttling, el router cae a `eu.` y luego a `us.`. La respuesta pide una herramienta.',
      flows: ['litellm>guard: ApplyGuardrail', 'litellm>claude: converse', 'claude>litellm: toolUse', 'litellm>agent: tool_calls'],
      data: {
        title: 'la llamada bedrock/converse que arma el gateway (forma simplificada)',
        lang: 'http',
        content: `POST /model/global.anthropic.claude-sonnet-5-5/converse HTTP/1.1
Host: bedrock-runtime.us-east-1.amazonaws.com
Authorization: AWS4-HMAC-SHA256 Credential=ASIA…/20261107/us-east-1/bedrock/aws4_request, …   ← rol del gateway
Content-Type: application/json

${json({
  system: [{ text: SYSTEM }, { cachePoint: { type: 'default' } }],
  messages: [{ role: 'user', content: [{ text: PREGUNTA }] }],
  toolConfig: {
    tools: [
      {
        toolSpec: {
          name: 'Pedidos___consultar_pedido',
          description: 'Estado, transportista e incidencias de un pedido.',
          inputSchema: { json: { type: 'object', properties: { pedido: { type: 'string' } }, required: ['pedido'] } },
        },
      },
    ],
  },
})}`,
        hl: ['/model/global.anthropic.claude-sonnet-5-5/converse', '"cachePoint"', '"toolSpec"'],
      },
      code: { file: 'gw', hl: ['- model_name: claude-sonnet ', 'model: bedrock/global.anthropic.claude-sonnet-5-5', 'cache_control_injection_points', 'fallbacks:', 'mode: pre_call'] },
    },
    {
      title: '5 · Herramientas por MCP',
      body: 'ADK traduce el `tool_call` a un `tools/call` JSON-RPC hacia **AgentCore Gateway**, con el token del agente. El policy engine Cedar decide; si permite, **Identity** entrega el token OAuth saliente del ERP y la petición llega al sistema. El agente nunca tuvo esa credencial.',
      flows: ['agent>gateway: tools/call', 'gateway>identity: token saliente', 'gateway>erp'],
      data: {
        title: 'POST al endpoint MCP del Gateway',
        lang: 'http',
        content: `POST /mcp HTTP/1.1
Host: ops-retail-k3x9.gateway.bedrock-agentcore.us-east-1.amazonaws.com
Authorization: Bearer eyJhbGciOi…   ← GATEWAY_TOKEN
Content-Type: application/json

${json({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'Pedidos___consultar_pedido', arguments: { pedido: '4512' } } })}`,
        hl: ['"method": "tools/call"', '"name": "Pedidos___consultar_pedido"'],
      },
      code: { file: 'agent', hl: ['herramientas = McpToolset(', 'url=os.environ["AGENTCORE_GATEWAY_URL"]', 'headers={"Authorization"', '"Pedidos___consultar_pedido",'] },
    },
    {
      title: '6 · Conocimiento (RAG)',
      body: 'El pedido está retenido por una incidencia del transportista. Para justificar qué ofrecer, el agente llama `Procedimientos___buscar`: detrás, una **Knowledge Base** con búsqueda híbrida, reranking y filtro por país. Vuelven fragmentos **con su fuente** para citar.',
      flows: ['agent>gateway: tools/call', 'gateway>kb: Retrieve', 'kb>gateway'],
      data: {
        title: 'Retrieve (Knowledge Base) → lo que devuelve la tool (forma simplificada)',
        lang: 'json',
        content: json({
          retrievalResults: [
            {
              content: { text: 'Si un pedido supera en 48 h la fecha comprometida por incidencia del transportista, ofrecer despacho express sin costo o nota de crédito de hasta 10 %.' },
              location: { type: 'S3', s3Location: { uri: 's3://kb-ops-retail/procedimientos/PRC-021-compensaciones.pdf' } },
              score: 0.87,
              metadata: { pais: 'CL', vigente_desde: '2026-06-01' },
            },
          ],
        }),
        hl: ['"text"', '"uri"', '"pais": "CL"'],
      },
      code: { file: 'agent', hl: ['"Procedimientos___buscar",', 'Cita el procedimiento que respalda'] },
    },
    {
      title: '7 · Respuesta y memoria',
      body: 'Claude redacta la respuesta final (de nuevo vía gateway). El entrypoint toma el evento final del `Runner`, guarda el turno en Memory con `create_event` —las estrategias extraen hechos en segundo plano— y responde al usuario.',
      flows: ['agent>memory: create_event', 'agent>user: result'],
      data: {
        title: 'create_event + respuesta HTTP',
        lang: 'json',
        content: json({
          create_event: {
            actor_id: 'jefe-tienda-114',
            session_id: SID,
            messages: [[PREGUNTA, 'USER'], ['El pedido 4512 está retenido…', 'ASSISTANT']],
          },
          respuesta: {
            result:
              '1. El 4512 está retenido en el centro de Pudahuel por una incidencia del transportista (+52 h).\n2. Según PRC-021, ofrece despacho express sin costo o nota de crédito de hasta 10 %.\n3. ¿Creo un ticket al transportista?',
          },
        }),
        hl: ['"create_event"', '"result"'],
      },
      code: { file: 'main', hl: ['evento.is_final_response()', 'memoria.create_event(', 'return {"result": final}'] },
    },
    {
      title: '8 · Trazas, costos y evals',
      body: 'Cada span (agente, modelo, tool) llega a **CloudWatch** vía OpenTelemetry con las convenciones `gen_ai.*`; el gateway exporta sus propios spans (callback `otel`) con tokens, cache hits y costo por clave. Las **evaluaciones online** puntúan una muestra de sesiones de producción.',
      flows: ['agent>obs: spans OTel'],
      focus: ['obs', 'litellm', 'agent'],
      data: {
        title: 'span de la llamada al modelo (forma simplificada)',
        lang: 'json',
        content: json({
          name: 'chat claude-sonnet',
          trace_id: '7c2e1a9b4f3d48e6a1b0c9d8e7f6a5b4',
          attributes: {
            'gen_ai.operation.name': 'chat',
            'gen_ai.provider.name': 'aws.bedrock',
            'gen_ai.agent.name': 'asistente_operaciones',
            'gen_ai.request.model': 'claude-sonnet',
            'gen_ai.response.model': 'global.anthropic.claude-sonnet-5-5',
            'gen_ai.usage.input_tokens': 1312,
            'gen_ai.usage.output_tokens': 164,
            'gen_ai.conversation.id': SID,
          },
          duration_ms: 2310,
        }),
        hl: ['"gen_ai.request.model"', '"gen_ai.response.model"', '"gen_ai.usage.input_tokens"'],
      },
      code: { file: 'gw', hl: ['callbacks: ["otel"]', 'database_url'] },
    },
  ],
}

/* ------------------------------------------------------------------ */
/* 2. Dentro del AI gateway                                            */
/* ------------------------------------------------------------------ */

export const adkBedrockGateway: IsoSpec = {
  id: 'adk-bedrock-gateway',
  title: 'Dentro del AI gateway: presupuesto, guardrails y fallback',
  summary:
    'En el ejemplo, el **LiteLLM Proxy** es el único camino del agente a los modelos. Valida la **clave virtual**, aplica **presupuesto** y límites, pasa el prompt por **Guardrails**, enruta al perfil `global.` y cae a `eu.` o `us.` si hay errores o throttling. Todo queda registrado con costo por equipo. El código es el `config.yaml`, el `crear_clave.sh` y el rol IAM del artículo; los datos, lo que entra y sale del proxy en cada paso.',
  height: 500,
  zones: [
    { id: 'vpc', label: 'VPC privada', from: [1.8, -4.9], to: [8.0, 4.9], tone: 'gateway' },
    { id: 'bedrock', label: 'Bedrock (perfiles de inferencia)', from: [8.6, -4.9], to: [11.6, 4.9], tone: 'model' },
  ],
  nodes: [
    { id: 'agent', label: 'Agente ADK', sub: 'LiteLlm → proxy', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Solo conoce la URL interna del gateway y una **clave virtual** (`sk-…`) inyectada desde Secrets Manager. No tiene permisos IAM sobre Bedrock.' },
    { id: 'alb', label: 'ALB interno + WAF', sub: 'TLS, sin acceso público', at: [3.2, 0], shape: 'box', tone: 'infra', icon: 'shield', info: 'Balanceador interno con WAF y TLS. El acceso desde AgentCore Runtime se hace con el Runtime configurado en modo VPC o por PrivateLink.' },
    { id: 'proxy', label: 'LiteLLM Proxy', sub: 'ECS Fargate', at: [6.4, 0], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Contenedores sin estado detrás del ALB, con `litellm>=1.84` fijado por digest. El estado (claves, gasto) vive en Postgres; Redis opcional para límites compartidos entre réplicas.' },
    { id: 'budget', label: '¿Clave y presupuesto?', sub: 'max_budget · tpm · rpm', at: [6.4, 3.4], shape: 'diamond', tone: 'guard', icon: 'gauge', info: 'Gate determinista: clave válida, modelo permitido para esa clave, presupuesto restante y límites por minuto. Si falla, el proxy rechaza **antes** de gastar un token.' },
    { id: 'pg', label: 'Postgres (RDS)', sub: 'claves, equipos, gasto', at: [3.2, 3.4], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Tablas de claves virtuales, equipos, presupuestos y spend logs. Permite *chargeback* por equipo y por agente.' },
    { id: 'logs', label: 'Logs y costos', sub: 'CloudWatch · S3 · Langfuse', at: [3.2, -3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'Callbacks del proxy (`otel`, `langfuse`, S3) con tokens de entrada/salida, cache hits, latencia y modelo efectivamente usado tras el fallback.' },
    { id: 'guard', label: 'Bedrock Guardrails', sub: 'pre_call / post_call', at: [6.4, -3.4], shape: 'box', tone: 'guard', icon: 'shield', info: 'Guardrail declarado en `config.yaml` (`guardrail: bedrock`). En `pre_call` puede enmascarar PII; en `post_call` revisa también la salida.' },
    { id: 'global', label: 'Claude · global.', sub: 'ruta principal', at: [10.1, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: '`bedrock/global.anthropic.claude-sonnet-5-5`: enruta a cualquier región comercial soportada. Más capacidad y menor precio, pero sin garantía de residencia.' },
    { id: 'eu', label: 'Claude · eu.', sub: 'fallback 1', at: [10.1, 0], shape: 'sphere', tone: 'model', icon: 'brain', info: '`bedrock/eu.anthropic.claude-sonnet-5-5`: perfil geográfico. Útil como fallback y como ruta **primaria** para datos con requisito de residencia en la UE.' },
    { id: 'us', label: 'Claude · us.', sub: 'fallback 2', at: [10.1, 3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: '`bedrock/us.anthropic.claude-sonnet-5-5`: segundo fallback. Cada perfil tiene cuotas separadas, por eso encadenarlos mejora la disponibilidad ante throttling.' },
  ],
  edges: [
    { from: 'agent', to: 'alb' },
    { from: 'alb', to: 'proxy' },
    { from: 'proxy', to: 'budget', route: 'z' },
    { from: 'budget', to: 'pg' },
    { from: 'proxy', to: 'guard', route: 'z' },
    { from: 'proxy', to: 'logs', route: 'z', dashed: true },
    { from: 'proxy', to: 'global' },
    { from: 'proxy', to: 'eu', label: 'fallback' },
    { from: 'proxy', to: 'us' },
  ],
  code: {
    gw: { title: 'plataforma-ai-gateway/config.yaml', lang: 'yaml', source: CONFIG_YAML },
    clave: { title: 'crear_clave.sh', lang: 'bash', source: CREAR_CLAVE },
    iam: { title: 'rol-ai-gateway.json', lang: 'json', source: ROL_GATEWAY },
  },
  steps: [
    {
      title: '1 · Llamada con clave virtual',
      body: 'ADK envía un `chat/completions` OpenAI-compatible con `Authorization: Bearer sk-…` (la clave virtual del agente) y `model: "claude-sonnet"`, el **alias** que define `config.yaml`. El ALB interno termina TLS y reparte entre las tareas del proxy.',
      flows: ['agent>alb', 'alb>proxy'],
      data: {
        title: 'request del agente (forma simplificada)',
        lang: 'http',
        content: `POST /chat/completions HTTP/1.1
Host: ai-gateway.interno
Authorization: Bearer sk-ops-…
Content-Type: application/json

${json({
  model: 'claude-sonnet',
  messages: [
    { role: 'system', content: 'Eres el asistente de operaciones de la cadena…' },
    { role: 'user', content: 'Cliente ana.rojas@correo.cl reclama: ¿por qué el pedido 4512 no llegó?' },
  ],
})}`,
        hl: ['Authorization: Bearer sk-ops', '"model": "claude-sonnet"'],
      },
      code: { file: 'gw', hl: ['- model_name: claude-sonnet ', 'model: bedrock/global.anthropic.claude-sonnet-5-5'] },
    },
    {
      title: '2 · Gate de clave y presupuesto',
      body: 'El proxy busca la clave en Postgres: ¿está activa?, ¿puede usar `claude-sonnet`?, ¿le queda presupuesto en el período de 30 días?, ¿supera tpm/rpm? Todo se decide en milisegundos y **sin tocar el modelo**. Esos límites se fijaron al crear la clave.',
      flows: ['proxy>budget', 'budget>pg'],
      data: {
        title: 'registro de la clave virtual (forma simplificada de /key/info)',
        lang: 'json',
        content: json({
          key_alias: 'asistente_operaciones',
          models: ['claude-sonnet'],
          max_budget: 800,
          budget_duration: '30d',
          spend: 512.37,
          tpm_limit: 400000,
          rpm_limit: 300,
          metadata: { agente: 'asistente_operaciones', centro_costo: 'OPS-114' },
        }),
        hl: ['"models"', '"max_budget"', '"spend"'],
      },
      code: { file: 'clave', hl: ['/key/generate', '"models": ["claude-sonnet"], "max_budget": 800', '"tpm_limit": 400000'] },
    },
    {
      title: '3 · Rechazo temprano',
      body: 'Si el presupuesto se agotó, el agente recibe un **error explícito** (no un timeout) y no se gasta un token. El harness debe tratarlo como fallo **no recuperable** y avisar, en vez de reintentar en bucle.',
      flows: ['budget>proxy', 'proxy>agent: 400 budget_exceeded'],
      focus: ['budget', 'agent'],
      data: {
        title: 'respuesta cuando la clave superó max_budget (forma simplificada)',
        lang: 'http',
        content: `HTTP/1.1 400 Bad Request
Content-Type: application/json

${json({ error: { message: 'Budget has been exceeded! Current cost: 803.12, Max budget: 800.0', type: 'budget_exceeded', param: null, code: '400' } })}`,
        hl: ['"type": "budget_exceeded"'],
      },
      code: { file: 'clave', hl: ['"budget_duration": "30d"'] },
    },
    {
      title: '4 · Guardrail de entrada',
      body: 'Con la clave válida, el proxy llama `ApplyGuardrail` en modo `pre_call`: bloquea prompt attacks, aplica temas denegados y **enmascara PII** antes de que el texto llegue al modelo. Es el mismo guardrail para todos los agentes de la empresa.',
      flows: ['proxy>guard: ApplyGuardrail', 'guard>proxy'],
      data: {
        title: 'respuesta de ApplyGuardrail (forma simplificada)',
        lang: 'json',
        content: json({
          action: 'GUARDRAIL_INTERVENED',
          outputs: [{ text: 'Cliente {EMAIL} reclama: ¿por qué el pedido 4512 no llegó?' }],
          assessments: [
            { sensitiveInformationPolicy: { piiEntities: [{ type: 'EMAIL', match: 'ana.rojas@correo.cl', action: 'ANONYMIZED' }] } },
          ],
        }),
        hl: ['"action": "GUARDRAIL_INTERVENED"', '{EMAIL}', '"ANONYMIZED"'],
      },
      code: { file: 'gw', hl: ['guardrail: bedrock', 'mode: pre_call', 'guardrailIdentifier: gr-ops-retail', 'guardrailVersion: "3"'] },
    },
    {
      title: '5 · Ruta principal: global.',
      body: 'El router envía la petición al perfil `global.` con el `cachePoint` que inyecta `cache_control_injection_points`. Firma con **el rol del gateway**, el único con `bedrock:InvokeModel`: el perfil en la región de origen, el modelo en todas las regiones y el modelo "global" sin región.',
      flows: ['proxy>global: converse', 'global>proxy'],
      data: {
        title: 'usage de la respuesta de Converse',
        lang: 'json',
        content: json({
          stopReason: 'end_turn',
          usage: { inputTokens: 212, cacheReadInputTokens: 1840, cacheWriteInputTokens: 0, outputTokens: 164, totalTokens: 2216 },
          metrics: { latencyMs: 1975 },
        }),
        hl: ['"cacheReadInputTokens": 1840'],
      },
      code: { file: 'iam', hl: ['"Sid": "PerfilGlobal"', '"Sid": "ModeloViaPerfiles"', 'arn:aws:bedrock:::foundation-model', '"Sid": "Guardrail"'] },
    },
    {
      title: '6 · Fallback encadenado',
      body: 'Ante `ThrottlingException` o 5xx, tras `num_retries`, el proxy prueba `claude-sonnet-eu` y luego `claude-sonnet-us`. Tras `allowed_fails` fallos, la deployment entra en *cooldown* 30 s. Recuerda: este orden es para **capacidad**; con datos regulados, el fallback a `global.` no corresponde.',
      flows: ['proxy>global: 429', 'proxy>eu: fallback', 'eu>proxy: 200'],
      focus: ['eu', 'us', 'proxy'],
      data: {
        title: 'log del router (ilustrativo)',
        lang: 'text',
        content: `14:03:21.402  claude-sonnet     global.anthropic.claude-sonnet-5-5  ThrottlingException (429) → reintento 1/2
14:03:21.913  claude-sonnet     global.anthropic.claude-sonnet-5-5  ThrottlingException (429) → reintento 2/2
14:03:22.640  claude-sonnet     → fallback a claude-sonnet-eu
14:03:24.118  claude-sonnet-eu  eu.anthropic.claude-sonnet-5-5      200 OK  1478 ms
14:03:24.120  deployment global. en cooldown 30 s (allowed_fails=3 alcanzado)`,
        hl: ['→ fallback a claude-sonnet-eu', '200 OK', 'cooldown 30 s'],
      },
      code: { file: 'gw', hl: ['fallbacks: [{"claude-sonnet": ["claude-sonnet-eu", "claude-sonnet-us"]}]', 'num_retries: 2', 'allowed_fails: 3', 'cooldown_time: 30'] },
    },
    {
      title: '7 · Gasto y trazas',
      body: 'Se registran tokens, cache hits, costo y el **modelo efectivamente usado** tras el fallback. El gasto se descuenta del presupuesto de la clave en Postgres y se exporta a CloudWatch/Langfuse para el *chargeback* por centro de costo.',
      flows: ['proxy>logs: spend log', 'budget>pg: spend += 0.0071'],
      focus: ['logs', 'pg'],
      data: {
        title: 'fila del spend log (forma simplificada)',
        lang: 'json',
        content: json({
          request_id: 'chatcmpl-8b1f…',
          model_group: 'claude-sonnet',
          model: 'eu.anthropic.claude-sonnet-5-5',
          prompt_tokens: 2052,
          completion_tokens: 164,
          cache_hit: false,
          spend: 0.0071,
          metadata: { key_alias: 'asistente_operaciones', centro_costo: 'OPS-114' },
          startTime: '2026-11-07T14:03:21.398Z',
          endTime: '2026-11-07T14:03:24.118Z',
        }),
        hl: ['"model_group"', '"model": "eu.anthropic', '"spend"'],
      },
      code: { file: 'gw', hl: ['callbacks: ["otel"]', 'database_url: os.environ/DATABASE_URL'] },
    },
  ],
}

/* ------------------------------------------------------------------ */
/* 3. Herramientas gobernadas                                          */
/* ------------------------------------------------------------------ */

const M_NC_CALL: ApiMessage = {
  role: 'assistant',
  note: 'Claude pide la herramienta',
  content: [{ type: 'tool_use', id: 'toolu_nc1', name: 'Pedidos___emitir_nota_credito', input: { pedido: '4512', monto: 820 } }],
}
const M_NC_DENY: ApiMessage = {
  role: 'user',
  note: 'resultado: denegado por Policy',
  content: [{ type: 'tool_result', tool_use_id: 'toolu_nc1', is_error: true, content: 'Acción no permitida por la política del gateway.' }],
}

export const adkBedrockHerramientas: IsoSpec = {
  id: 'adk-bedrock-herramientas',
  title: 'Herramientas gobernadas: Gateway, Policy e Identity',
  summary:
    'El agente no habla directo con los sistemas: llama **un endpoint MCP** de AgentCore Gateway. Cada `tools/call` pasa por el **policy engine (Cedar)**, que decide con la identidad del usuario (claims del JWT como *tags*) y los argumentos (`context.input`); **Identity** inyecta la credencial saliente y el target ejecuta. Todo queda auditado. El código es `policies/herramientas.cedar` y el `McpToolset` de `agent.py`, tal como en el artículo.',
  height: 480,
  zones: [{ id: 'gw', label: 'AgentCore Gateway', from: [1.8, -4.9], to: [8.0, 4.9], tone: 'protocol' }],
  nodes: [
    { id: 'agent', label: 'Agente ADK', sub: 'McpToolset', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'ADK se conecta con `McpToolset` + `StreamableHTTPConnectionParams` a la URL del Gateway, enviando un token OAuth del agente (o del usuario, si se propaga la identidad).' },
    { id: 'mcp', label: 'Endpoint MCP', sub: 'tools/list · tools/call', at: [3.2, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Un solo servidor MCP que agrega todos los targets. Las herramientas se nombran `NombreTarget___herramienta`. Soporta búsqueda semántica de herramientas para no cargar cientos de definiciones en el contexto.' },
    { id: 'policy', label: '¿Permite la política?', sub: 'Cedar · default deny', at: [6.4, 0], shape: 'diamond', tone: 'guard', icon: 'scroll', info: 'En el ejemplo: `permit` a `Pedidos___consultar_pedido` para cualquier usuario autenticado; `permit` a `Pedidos___emitir_nota_credito` solo si el rol es `jefe_tienda` y `context.input.monto < 500`. Lo que no casa con ningún `permit` queda **denegado por defecto**.' },
    { id: 'identity', label: 'Identity · vault', sub: 'OAuth 2.0 / API keys', at: [3.2, 3.4], shape: 'box', tone: 'guard', icon: 'key', info: 'Credential providers para Salesforce, ServiceNow, Jira o APIs internas. Gateway obtiene el token saliente en nombre del agente; el modelo nunca lo ve.' },
    { id: 'audit', label: 'Auditoría', sub: 'decisiones en CloudWatch', at: [3.2, -3.4], shape: 'box', tone: 'infra', icon: 'eye', info: 'Cada decisión de política (permit/deny, regla, principal, herramienta) queda en logs y métricas para seguridad y cumplimiento.' },
    { id: 'lambda', label: 'Lambda', sub: 'lógica propia', at: [10, -3.4], shape: 'box', tone: 'tool', icon: 'code', info: 'Target Lambda: útil para herramientas compuestas o para adaptar APIs legadas a una interfaz amigable para el modelo.' },
    { id: 'openapi', label: 'API REST (OpenAPI)', sub: 'ERP / pedidos', at: [10, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'Target OpenAPI: el Gateway traduce cada operación en una herramienta MCP. Conviene curar el spec (nombres y descripciones claras) en vez de exponerlo entero.' },
    { id: 'kb', label: 'Knowledge Base', sub: 'Retrieve como tool', at: [10, 3.4], shape: 'stack', tone: 'data', icon: 'book', info: 'La KB de Bedrock se expone como herramienta de búsqueda (vía Lambda o el conector de *Managed Knowledge Base* del Gateway), con filtros por metadatos.' },
  ],
  edges: [
    { from: 'agent', to: 'mcp', label: 'MCP + OAuth' },
    { from: 'mcp', to: 'policy' },
    { from: 'policy', to: 'audit', route: 'z', dashed: true },
    { from: 'policy', to: 'identity', route: 'z' },
    { from: 'policy', to: 'lambda' },
    { from: 'policy', to: 'openapi' },
    { from: 'policy', to: 'kb' },
  ],
  code: {
    policy: { title: 'policies/herramientas.cedar', lang: 'text', source: CEDAR },
    agent: { title: 'app/ops_agent/agent.py', lang: 'python', source: AGENT_PY },
  },
  steps: [
    {
      title: '1 · Descubrir herramientas',
      body: 'Al iniciar, ADK llama `tools/list` en el Gateway, que devuelve **todas** las herramientas de todos los targets. Con `tool_filter` el agente solo ve las cuatro que necesita: menos tokens y menos superficie. Ojo: el filtro es **higiene del cliente, no seguridad**; quien decide es la política.',
      flows: ['agent>mcp: tools/list', 'mcp>agent'],
      data: {
        title: 'respuesta de tools/list (forma simplificada)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tools: [
              { name: 'Pedidos___consultar_pedido', description: 'Estado, transportista e incidencias de un pedido.' },
              { name: 'Pedidos___emitir_nota_credito', description: 'Emite una nota de crédito sobre un pedido.' },
              { name: 'Inventario___stock_por_tienda', description: 'Stock de un SKU por tienda.' },
              { name: 'Procedimientos___buscar', description: 'Busca en la KB de procedimientos operativos.' },
              { name: 'Tickets___crear_ticket', description: 'Crea un ticket de incidencia.' },
            ],
          },
        }),
        hl: ['"Pedidos___emitir_nota_credito"'],
      },
      code: { file: 'agent', hl: ['herramientas = McpToolset(', 'tool_filter=[', '"Pedidos___consultar_pedido",', '"Tickets___crear_ticket",'] },
    },
    {
      title: '2 · Llamada a una herramienta',
      body: 'Un agente para jefes de tienda (que sí incluye `Pedidos___emitir_nota_credito` en su filtro) recibe "dale 820 de crédito al cliente". Claude pide la herramienta y ADK envía el `tools/call` con el token OAuth: los argumentos viajan tal cual a la política.',
      flows: ['agent>mcp: tools/call', 'mcp>policy'],
      data: {
        title: 'tools/call',
        lang: 'json',
        content: json({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'Pedidos___emitir_nota_credito', arguments: { pedido: '4512', monto: 820 } } }),
        hl: ['"name": "Pedidos___emitir_nota_credito"', '"monto": 820'],
      },
      code: { file: 'policy', hl: ['action == AgentCore::Action::"Pedidos___emitir_nota_credito"'] },
    },
    {
      title: '3 · Decisión determinista',
      body: 'El policy engine arma la solicitud Cedar: principal con los claims del JWT como *tags*, acción y `context.input`. El rol es `jefe_tienda`, pero 820 no es < 500: ningún `permit` aplica → **Deny por defecto**. La decisión queda auditada y el agente recibe un error que debe explicar al usuario.',
      flows: ['policy>audit: Deny'],
      focus: ['policy', 'audit'],
      data: {
        title: 'solicitud y decisión Cedar (forma simplificada)',
        lang: 'json',
        content: json({
          request: {
            principal: { type: 'AgentCore::OAuthUser', id: 'jefe-tienda-114', tags: { role: 'jefe_tienda' } },
            action: 'AgentCore::Action::"Pedidos___emitir_nota_credito"',
            resource: 'AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/ops-retail"',
            context: { input: { pedido: '4512', monto: 820 } },
          },
          decision: 'Deny',
          diagnostics: { reason: [], errors: [] },
        }),
        hl: ['"role": "jefe_tienda"', '"monto": 820', '"decision": "Deny"', '"reason": []'],
      },
      code: { file: 'policy', hl: ['principal.hasTag("role") && principal.getTag("role") == "jefe_tienda"', 'context.input.monto < 500'] },
    },
    {
      title: '4 · El agente recibe el rechazo',
      body: 'El rechazo vuelve como resultado de herramienta con error. El modelo no puede "convencer" al gateway: lo correcto es explicarlo y ofrecer la alternativa (pedir aprobación o emitir hasta el límite).',
      flows: ['policy>mcp', 'mcp>agent: isError'],
      data: { title: 'messages', messages: [{ role: 'user', content: 'Dale 820 de nota de crédito al cliente del pedido 4512.' }, M_NC_CALL, M_NC_DENY], newFrom: 1, hl: [2] },
    },
    {
      title: '5 · Llamada permitida',
      body: 'Una consulta de pedido sí está permitida para cualquier usuario autenticado. Gateway pide a **Identity** el token saliente del ERP y ejecuta la operación OpenAPI. La credencial del ERP nunca pasa por el agente.',
      flows: ['policy>identity: token ERP', 'policy>openapi: GET /pedidos/4512', 'openapi>policy'],
      data: {
        title: 'resultado de tools/call (Allow)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 10,
          result: {
            content: [{ type: 'text', text: '{"pedido":"4512","estado":"retenido","motivo":"incidencia transportista","retraso_h":52}' }],
            isError: false,
          },
        }),
        hl: ['"isError": false'],
      },
      code: { file: 'policy', hl: ['action == AgentCore::Action::"Pedidos___consultar_pedido"'] },
    },
    {
      title: '6 · Otros targets',
      body: 'El mismo endpoint expone Lambdas y la Knowledge Base. Para el agente todo son herramientas MCP con el mismo modelo de autenticación y auditoría; para seguridad, todas pasan por la misma política.',
      flows: ['policy>lambda', 'policy>kb'],
      data: {
        title: 'tools/call a la KB',
        lang: 'json',
        content: json({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'Procedimientos___buscar', arguments: { consulta: 'compensación por retraso del transportista', pais: 'CL' } } }),
        hl: ['"Procedimientos___buscar"'],
      },
      code: { file: 'agent', hl: ['"Procedimientos___buscar",', '"Inventario___stock_por_tienda",'] },
    },
  ],
}

/* ------------------------------------------------------------------ */
/* 4. CI/CD con gate de evaluaciones                                   */
/* ------------------------------------------------------------------ */

export const adkBedrockCicd: IsoSpec = {
  id: 'adk-bedrock-cicd',
  title: 'Despliegue y CI/CD con gate de evaluaciones',
  summary:
    'Cada cambio —prompt, herramienta, modelo o versión de dependencia— pasa por **tests**, `agentcore build`, despliegue a **staging**, un **set dorado de evaluaciones** y un **gate** antes de producción. En producción, las evaluaciones online y las alarmas cierran el ciclo. El pipeline y el script de evals son **ilustrativos** (GitHub Actions + boto3); los comandos `agentcore build`/`deploy` son los del artículo.',
  height: 480,
  zones: [
    { id: 'stg', label: 'Cuenta staging', from: [8.1, -1.5], to: [14.3, 4.9], tone: 'infra' },
    { id: 'prd', label: 'Cuenta producción', from: [7.6, -4.9], to: [14.3, -1.9], tone: 'agent' },
  ],
  nodes: [
    { id: 'dev', label: 'Desarrollador', sub: 'agentcore dev', at: [0, 0], shape: 'person', tone: 'user', icon: 'terminal', info: 'Itera en local con `agentcore dev` (hot reload e inspector en el navegador) apuntando al gateway de desarrollo con una clave virtual de bajo presupuesto.' },
    { id: 'repo', label: 'Pull request', sub: 'código + prompts + IaC', at: [3.2, 0], shape: 'box', tone: 'neutral', icon: 'branch', info: 'Prompts, definiciones de herramientas, políticas Cedar, `agentcore.json` y `config.yaml` del gateway versionados juntos: un cambio de prompt es un cambio de código.' },
    { id: 'ci', label: 'CI: tests + build', sub: 'agentcore build', at: [5.9, 0], shape: 'box', tone: 'infra', icon: 'workflow', info: 'Tests unitarios de herramientas, validación de políticas, escaneo de dependencias (`litellm>=1.84` fijado por hash) y `agentcore build` para validar el proyecto y generar artefactos.' },
    { id: 'staging', label: 'Runtime staging', sub: 'agentcore deploy', at: [9.6, 0], shape: 'tall', tone: 'agent', icon: 'server', info: 'Despliegue automático a la cuenta de staging (destinos en `aws-targets.json`). Usa el gateway de staging y datos de prueba.' },
    { id: 'golden', label: 'Set dorado', sub: '50–200 casos reales', at: [9.6, 3.4], shape: 'doc', tone: 'data', icon: 'list', info: 'Casos tomados de fallos reales y escenarios críticos, con resultado esperado y herramientas que deberían usarse. Se ejecuta cada caso varias veces para medir consistencia.' },
    { id: 'evals', label: 'AgentCore Evaluations', sub: 'on-demand / dataset', at: [12.8, 3.4], shape: 'box', tone: 'guard', icon: 'trophy', info: 'Evaluadores integrados (`Builtin.Helpfulness`, etc.) y personalizados sobre las trazas de la corrida. ADK se instrumenta con `openinference-instrumentation-google-adk`.' },
    { id: 'gate', label: '¿Pasa el umbral?', sub: 'calidad · costo · latencia', at: [12.8, 0], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Bloquea la promoción si cae la tasa de éxito, sube el costo por tarea o la latencia p95 respecto de la versión en producción.' },
    { id: 'prod', label: 'Runtime producción', sub: 'versionado', at: [12.8, -3.4], shape: 'tall', tone: 'agent', icon: 'server', info: 'Promoción a la cuenta de producción. Mantén la versión anterior disponible para revertir rápido (rollback por endpoint/versión).' },
    { id: 'online', label: 'Evals online', sub: 'muestreo', at: [9.1, -3.4], shape: 'box', tone: 'guard', icon: 'eye', info: 'Evaluación continua de un porcentaje de sesiones reales. Los fallos detectados se convierten en nuevos casos del set dorado.' },
    { id: 'alarms', label: 'Alarmas y dashboards', sub: 'CloudWatch', at: [5.9, -3.4], shape: 'box', tone: 'infra', icon: 'gauge', info: 'Errores, latencia, costo por sesión, tasa de denegaciones de política y presupuesto consumido en el gateway.' },
  ],
  edges: [
    { from: 'dev', to: 'repo' },
    { from: 'repo', to: 'ci' },
    { from: 'ci', to: 'staging' },
    { from: 'golden', to: 'evals' },
    { from: 'staging', to: 'golden', route: 'z' },
    { from: 'evals', to: 'gate', route: 'z' },
    { from: 'gate', to: 'prod', route: 'z' },
    { from: 'prod', to: 'online' },
    { from: 'online', to: 'alarms' },
    { from: 'online', to: 'golden', route: 'arc', dashed: true },
  ],
  code: {
    ci: { title: '.github/workflows/agente.yml (ilustrativo)', lang: 'yaml', source: CI_YAML },
    evals: { title: 'evals/correr_evals.py (ilustrativo)', lang: 'python', source: EVALS_PY },
  },
  steps: [
    {
      title: '1 · Cambio en un PR',
      body: 'El desarrollador agrega una herramienta y ajusta el prompt. Todo va en el **mismo PR**: código, prompts, políticas Cedar y configuración. Si la herramienta nueva no tiene política, el gateway la denegará por defecto: por eso la política viaja con el código.',
      flows: ['dev>repo'],
      data: {
        title: 'diff del PR (ilustrativo)',
        lang: 'text',
        content: `--- a/app/ops_agent/agent.py
+++ b/app/ops_agent/agent.py
@@ tool_filter=[
         "Procedimientos___buscar",
         "Tickets___crear_ticket",
+        "Pedidos___proponer_nota_credito",
     ],
--- a/policies/herramientas.cedar
+++ b/policies/herramientas.cedar
+permit(
+  principal is AgentCore::OAuthUser,
+  action == AgentCore::Action::"Pedidos___proponer_nota_credito",
+  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/ops-retail"
+);`,
        hl: ['+        "Pedidos___proponer_nota_credito",', '+permit('],
      },
      code: { file: 'ci', hl: ['pull_request:'] },
    },
    {
      title: '2 · Tests y build',
      body: 'CI instala dependencias **desde el lockfile** (versiones fijadas por hash), corre tests de herramientas y callbacks, valida las políticas Cedar contra el esquema y ejecuta `agentcore build`. Sin evals todavía: es barato y rápido.',
      flows: ['repo>ci'],
      data: {
        title: 'salida del job ci (ilustrativo)',
        lang: 'text',
        content: `$ uv sync --locked
Resolved 84 packages · litellm==1.84.2 (sha256 verificado)
$ uv run pytest tests/
42 passed in 6.81s
$ cedar validate --schema policies/schema.cedarschema --policies policies/herramientas.cedar
✓ validation passed
$ agentcore build
✓ proyecto válido · artefactos generados`,
        hl: ['litellm==1.84.2', 'validation passed', 'agentcore build'],
      },
      code: { file: 'ci', hl: ['uv sync --locked', 'uv run pytest tests/', 'cedar validate', 'agentcore build'] },
    },
    {
      title: '3 · Despliegue a staging',
      body: 'Al fusionar en `main`, el job asume un rol de despliegue por **OIDC** (sin claves estáticas en el CI) y ejecuta `agentcore deploy` (CDK por debajo) en la cuenta de staging, con su propia clave virtual y presupuesto en el gateway.',
      flows: ['ci>staging'],
      data: {
        title: 'credenciales efímeras del job (ilustrativo)',
        lang: 'json',
        content: json({
          AssumedRoleUser: { Arn: 'arn:aws:sts::222233334444:assumed-role/gha-deploy-staging/GitHubActions' },
          Credentials: { Expiration: '2026-11-07T15:12:09Z' },
          SourceIdentity: 'repo:retail/asistente-operaciones:ref:refs/heads/main',
        }),
        hl: ['"Expiration"', '"SourceIdentity"'],
      },
      code: { file: 'ci', hl: ['id-token: write', 'STAGING_DEPLOY_ROLE', 'agentcore deploy   # cuenta staging'] },
    },
    {
      title: '4 · Set dorado',
      body: 'Un script invoca el Runtime de staging con cada caso del set dorado, **k veces** y con una sesión nueva por intento. Las trazas OTel quedan en CloudWatch con el id de sesión, para que AgentCore Evaluations y el cálculo de costo las encuentren.',
      flows: ['staging>golden', 'golden>evals'],
      data: {
        title: 'evals/set_dorado.jsonl · un caso',
        lang: 'json',
        content: json({
          id: 'retraso-transportista-07',
          prompt: '¿Por qué el pedido 4512 no llegó y qué le puedo ofrecer al cliente?',
          debe_mencionar: ['retenido', 'PRC-021'],
          herramientas_esperadas: ['Pedidos___consultar_pedido', 'Procedimientos___buscar'],
          origen: 'postmortem 2026-09-14',
        }),
        hl: ['"debe_mencionar"', '"herramientas_esperadas"'],
      },
      code: { file: 'evals', hl: ['def correr(caso: dict)', 'sid = f"eval-{uuid.uuid4()}"', 'agentcore.invoke_agent_runtime(', 'for _ in range(args.k)'] },
    },
    {
      title: '5 · Gate',
      body: 'Se calcula **pass^k** (un caso cuenta solo si acierta en los k intentos), el costo por tarea y la latencia p95, y se comparan con producción. Si algo empeora, el script sale con código 1 y el PR queda bloqueado con el reporte.',
      flows: ['evals>gate'],
      data: {
        title: 'reporte del gate',
        lang: 'json',
        content: json({
          'pass^k': 0.86,
          costo_usd_tarea: 0.094,
          p95_s: 14.2,
          umbral: { pass_k: 0.9, costo_usd: 0.12, p95_s: 18.0 },
          resultado: 'BLOQUEADO: pass^k 0.86 < 0.90 (3 casos fallan 1 de 3 intentos)',
        }),
        hl: ['"pass^k": 0.86', '"resultado"'],
      },
      code: { file: 'evals', hl: ['pass_k = sum(', 'UMBRAL = {', 'sys.exit(1)'] },
    },
    {
      title: '6 · Promoción',
      body: 'Con el gate en verde, el job de producción (protegido por las reglas del entorno) despliega con otro rol en otra cuenta, manteniendo la versión anterior lista para **rollback**.',
      flows: ['gate>prod'],
      code: { file: 'ci', hl: ['needs: staging', 'environment: produccion', 'PROD_DEPLOY_ROLE', 'la versión anterior queda para rollback'] },
    },
    {
      title: '7 · Ciclo continuo',
      body: 'Evaluaciones online sobre una muestra de tráfico real y alarmas. Cada fallo nuevo se convierte en un caso del set dorado: la suite crece con la experiencia y la próxima versión debe pasarlo antes de desplegarse.',
      flows: ['prod>online', 'online>alarms', 'online>golden: nuevo caso'],
      data: {
        title: 'fallo detectado online → nuevo caso (ilustrativo)',
        lang: 'json',
        content: json({
          sesion: 'ops-sess-91ac…',
          evaluador: 'Builtin.Helpfulness',
          puntaje: 0.31,
          motivo: 'Ofreció nota de crédito del 20 %, fuera de PRC-021.',
          accion: 'agregar a evals/set_dorado.jsonl como compensacion-limite-03',
        }),
        hl: ['"evaluador"', '"accion"'],
      },
    },
  ],
}
