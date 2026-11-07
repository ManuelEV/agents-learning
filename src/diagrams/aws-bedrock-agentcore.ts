import type { ApiMessage, IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ------------------------------------------------------------------ */
/* Código reutilizado literalmente de aws-bedrock-agentcore.mdx        */
/* ------------------------------------------------------------------ */

/** Bloque `devoluciones.py` del artículo (Converse + cachePoint + guardrail). */
const DEVOLUCIONES = `import boto3

bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
POLITICAS = open("politicas_devoluciones.md", encoding="utf-8").read()  # ~6.000 tokens estáticos

def responder(pregunta: str) -> str:
    resp = bedrock.converse(
        modelId="global.anthropic.claude-sonnet-5-5",   # perfil, no el ID base
        system=[
            {"text": "Eres el asistente de devoluciones de una cadena de retail. "
                     "Responde solo con base en las políticas. Si no aplica, deriva a un humano."},
            {"text": POLITICAS},
            {"cachePoint": {"type": "default", "ttl": "1h"}},   # todo lo anterior se cachea 1 h
        ],
        messages=[{"role": "user", "content": [{"text": pregunta}]}],
        inferenceConfig={"maxTokens": 1024},
        guardrailConfig={
            "guardrailIdentifier": "gr-retail-atencion",   # ID o ARN del guardrail
            "guardrailVersion": "3",                        # versión publicada, nunca DRAFT en prod
            "trace": "enabled",
        },
    )
    u = resp["usage"]
    print(f"cache read={u.get('cacheReadInputTokens', 0)} write={u.get('cacheWriteInputTokens', 0)}")
    if resp["stopReason"] == "guardrail_intervened":
        return "No puedo ayudarte con eso. Te derivo con un ejecutivo."
    return resp["output"]["message"]["content"][0]["text"]`

/** Bloque `policy-bedrock-sonnet-global.json` del artículo. */
const POLICY_GLOBAL = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvocarPerfilGlobal",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:us-east-1:111122223333:inference-profile/global.anthropic.claude-sonnet-5-5"
    },
    {
      "Sid": "ModeloSoloViaPerfil",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-5-5",
        "arn:aws:bedrock:::foundation-model/anthropic.claude-sonnet-5-5"
      ],
      "Condition": {
        "StringLike": {
          "bedrock:InferenceProfileArn": "arn:aws:bedrock:us-east-1:111122223333:inference-profile/global.anthropic.claude-sonnet-5-5"
        }
      }
    }
  ]
}`

/** Bloque `app/agent/main.py` (pestaña Google ADK) del artículo. */
const ADK_MAIN = `from bedrock_agentcore.runtime import BedrockAgentCoreApp
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

def consultar_pedido(order_id: str) -> dict:
    """Devuelve estado y fecha estimada de un pedido."""
    return {"order_id": order_id, "estado": "en ruta", "eta": "2026-11-04"}

agent = LlmAgent(
    name="soporte_retail",
    model=LiteLlm(model="bedrock/global.anthropic.claude-sonnet-5-5"),  # litellm>=1.84
    instruction="Atiendes consultas de pedidos. Usa herramientas; no inventes datos.",
    tools=[consultar_pedido],
)
sessions = InMemorySessionService()   # vive en la microVM de la sesión; usa AgentCore Memory para persistir
runner = Runner(agent=agent, app_name="soporte", session_service=sessions)
app = BedrockAgentCoreApp()

@app.entrypoint
async def invoke(payload, context):
    uid, sid = payload.get("user_id", "anon"), context.session_id
    if not await sessions.get_session(app_name="soporte", user_id=uid, session_id=sid):
        await sessions.create_session(app_name="soporte", user_id=uid, session_id=sid)
    msg = types.Content(role="user", parts=[types.Part(text=payload["prompt"])])
    respuesta = ""
    async for event in runner.run_async(user_id=uid, session_id=sid, new_message=msg):
        if event.is_final_response() and event.content and event.content.parts:
            respuesta = event.content.parts[0].text
    return {"result": respuesta}

if __name__ == "__main__":
    app.run()   # sirve POST /invocations y GET /ping en el puerto 8080`

/** Política Cedar del escenario de reembolsos (mismo formato que el artículo de seguridad). */
const CEDAR_REEMBOLSOS = `// ILUSTRATIVO: valida entidades, acciones y atributos contra el esquema
// que genera tu gateway. Acción MCP = "NombreTarget___herramienta".

// Consultar pedidos: cualquier usuario autenticado del portal
permit(
  principal is AgentCore::OAuthUser,
  action == AgentCore::Action::"Pedidos___get_order",
  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/soporte-gw"
);

// Reembolsos de hasta 100 USD: cualquier usuario autenticado
permit(
  principal is AgentCore::OAuthUser,
  action == AgentCore::Action::"Pedidos___issue_refund",
  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/soporte-gw"
) when { context.input.amount <= 100 };

// Reembolsos mayores: solo si el JWT trae el rol supervisor
permit(
  principal is AgentCore::OAuthUser,
  action == AgentCore::Action::"Pedidos___issue_refund",
  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/soporte-gw"
) when { principal.hasTag("role") && principal.getTag("role") == "supervisor" };`

/* ------------------------------------------------------------------ */
/* Ruta de una inferencia en Bedrock                                   */
/* ------------------------------------------------------------------ */

const PREGUNTA = 'Compré unas zapatillas hace 40 días y no las usé. ¿Puedo devolverlas?'

export const bedrockInferencia: IsoSpec = {
  id: 'aws-bedrock-inferencia',
  title: 'Ruta de una inferencia en Bedrock',
  summary:
    'Qué ocurre entre que tu código llama a `Converse` y recibe la respuesta: **IAM** autoriza el perfil y los modelos en las regiones destino, **Guardrails** evalúa la entrada y la salida, el **prompt cache** reutiliza el prefijo estático y el **perfil de inferencia** (`global.` / `us.` / `eu.`) elige la región con capacidad. En cada paso verás el cuerpo HTTP o la respuesta JSON real y la línea de `devoluciones.py` (el ejemplo del artículo) que la produce.',
  height: 470,
  zones: [{ id: 'destinos', label: 'Regiones destino del perfil', from: [11.4, -4.6], to: [14.2, 4.6], tone: 'model' }],
  nodes: [
    { id: 'app', label: 'Agente / app', sub: 'boto3 · LiteLLM · Strands', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Tu código llama a `bedrock-runtime` con SigV4 (rol IAM) o con una **API key de Bedrock** (`AWS_BEARER_TOKEN_BEDROCK`). El `modelId` es el ID del perfil, p. ej. `global.anthropic.claude-sonnet-5-5`.' },
    { id: 'iam', label: 'IAM / SCP', sub: 'perfil + modelos', at: [3.2, -3.3], shape: 'diamond', tone: 'guard', icon: 'key', info: 'La política debe permitir `bedrock:InvokeModel*` sobre el ARN del **perfil** y sobre el **foundation model en cada región destino**. Una SCP que bloquee regiones provoca `AccessDenied` intermitentes según adónde se enrute.' },
    { id: 'endpoint', label: 'bedrock-runtime', at: [3.2, 0], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Endpoint regional recomendado. Expone `InvokeModel`, `Converse` y también las APIs compatibles con OpenAI (Chat Completions, Responses) y Anthropic Messages. Guardrails y perfiles entre regiones solo funcionan aquí, no en `bedrock-mantle`.' },
    { id: 'guard', label: 'Guardrail', sub: 'entrada y salida', at: [6.4, 0], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Con `guardrailConfig` se evalúan filtros de contenido, *prompt attack*, temas denegados, PII, *contextual grounding* y Automated Reasoning. Si interviene, `stopReason` vale `guardrail_intervened`.' },
    { id: 'cache', label: 'Prompt cache', sub: 'cachePoint · TTL 1 h', at: [6.4, 3.3], shape: 'cylinder', tone: 'memory', icon: 'timer', info: 'El prefijo hasta el `cachePoint` (tools → system → messages) se guarda 5 min por defecto o 1 h con `"ttl": "1h"`. Hasta 4 checkpoints; mínimo 512 tokens acumulados en Claude 5.5.' },
    { id: 'profile', label: 'Inference profile', sub: 'global.anthropic…', at: [9.6, 0], shape: 'diamond', tone: 'gateway', icon: 'split', info: 'Perfil de inferencia entre regiones definido por AWS. `global.` enruta a cualquier región comercial (≈10% más barato); `us.`, `eu.`, `apac.`, `jp.`, `au.` restringen a una geografía por residencia de datos.' },
    { id: 'r1', label: 'Región A', sub: 'p. ej. us-east-1', at: [12.8, -3.2], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Una de las regiones donde el perfil tiene capacidad. Los datos en reposo (logs, KB) siguen en tu región de origen; la inferencia puede ocurrir en otra.' },
    { id: 'r2', label: 'Región B', sub: 'p. ej. us-west-2', at: [12.8, 0], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Si la región A está saturada, el perfil enruta aquí sin que cambies código. Por eso IAM debe permitir el modelo en todas las regiones del perfil.' },
    { id: 'r3', label: 'Región C', sub: 'p. ej. eu-west-1', at: [12.8, 3.2], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Con `global.` la petición puede salir de tu geografía. Si tienes requisitos de residencia (GDPR, banca), usa un perfil geográfico como `eu.` o `us.`.' },
  ],
  edges: [
    { from: 'app', to: 'endpoint', label: 'Converse' },
    { from: 'endpoint', to: 'iam', route: 'z', dashed: true },
    { from: 'endpoint', to: 'guard' },
    { from: 'guard', to: 'cache', route: 'z' },
    { from: 'guard', to: 'profile' },
    { from: 'profile', to: 'r1', route: 'z' },
    { from: 'profile', to: 'r2' },
    { from: 'profile', to: 'r3', route: 'z' },
  ],
  code: {
    app: { title: 'devoluciones.py', lang: 'python', source: DEVOLUCIONES },
    iam: { title: 'policy-bedrock-sonnet-global.json', lang: 'json', source: POLICY_GLOBAL },
  },
  steps: [
    {
      title: '1 · Llamada a Converse',
      body: 'El código envía `system`, `messages`, `inferenceConfig` y `guardrailConfig` a `bedrock-runtime`. El `modelId` va en la **ruta** y es el ID del **perfil** (`global.…`), no el del modelo base. El bloque `cachePoint` marca hasta dónde llega el prefijo estático (~6.000 tokens de políticas).',
      flows: ['app>endpoint'],
      data: {
        title: 'POST /model/{modelId}/converse',
        lang: 'http',
        content: `POST /model/global.anthropic.claude-sonnet-5-5/converse HTTP/1.1
Host: bedrock-runtime.us-east-1.amazonaws.com
Authorization: AWS4-HMAC-SHA256 Credential=ASIA…/20261107/us-east-1/bedrock/aws4_request, SignedHeaders=content-type;host;x-amz-date, Signature=…
Content-Type: application/json

${json({
  system: [
    { text: 'Eres el asistente de devoluciones de una cadena de retail. Responde solo con base en las políticas. Si no aplica, deriva a un humano.' },
    { text: '# Política de devoluciones (v2026-10)\n1. Plazo general: 30 días… (≈6.000 tokens)' },
    { cachePoint: { type: 'default', ttl: '1h' } },
  ],
  messages: [{ role: 'user', content: [{ text: PREGUNTA }] }],
  inferenceConfig: { maxTokens: 1024 },
  guardrailConfig: { guardrailIdentifier: 'gr-retail-atencion', guardrailVersion: '3', trace: 'enabled' },
})}`,
        hl: ['POST /model/global.anthropic', '"cachePoint"', '"guardrailConfig"'],
      },
      code: { file: 'app', hl: ['bedrock.converse(', 'modelId="global.anthropic.claude-sonnet-5-5"', 'guardrailConfig={'] },
    },
    {
      title: '2 · Autorización IAM',
      body: 'Bedrock comprueba `bedrock:InvokeModel` sobre el ARN del perfil **y** sobre el foundation model en las regiones destino (con `global.`, también el ARN sin región). La condición `bedrock:InferenceProfileArn` impide invocar el modelo saltándose el perfil. Si una SCP bloquea una región destino, el error aparece solo cuando el perfil enruta allí.',
      flows: ['endpoint>iam'],
      focus: ['iam', 'endpoint'],
      data: {
        title: 'si falta un permiso o una SCP bloquea la región (ejemplo)',
        lang: 'http',
        content: `HTTP/1.1 403 Forbidden
x-amzn-ErrorType: AccessDeniedException
Content-Type: application/json

${json({
  message:
    'User: arn:aws:sts::111122223333:assumed-role/devoluciones-app/i-0a1b2c is not authorized to perform: bedrock:InvokeModel on resource: arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-sonnet-5-5 with an explicit deny in a service control policy',
})}`,
        hl: ['AccessDeniedException', 'us-west-2::foundation-model', 'service control policy'],
      },
      code: { file: 'iam', hl: ['"Sid": "InvocarPerfilGlobal"', '"Sid": "ModeloSoloViaPerfil"', 'arn:aws:bedrock:*::foundation-model', 'arn:aws:bedrock:::foundation-model', '"bedrock:InferenceProfileArn"'] },
    },
    {
      title: '3 · Guardrail de entrada',
      body: 'El guardrail evalúa el prompt: *prompt attack*, temas denegados, PII. Si bloquea, **el modelo no se invoca**: la respuesta trae el mensaje de bloqueo configurado y `stopReason = "guardrail_intervened"`. Con `trace: "enabled"` ves qué filtro actuó. Tu código lo detecta y deriva a un humano.',
      flows: ['endpoint>guard'],
      data: {
        title: 'respuesta si el usuario intenta un prompt attack (forma simplificada)',
        lang: 'json',
        content: json({
          output: { message: { role: 'assistant', content: [{ text: 'Lo siento, no puedo ayudarte con esa solicitud.' }] } },
          stopReason: 'guardrail_intervened',
          trace: {
            guardrail: {
              inputAssessment: {
                'gr-retail-atencion': { contentPolicy: { filters: [{ type: 'PROMPT_ATTACK', confidence: 'HIGH', action: 'BLOCKED' }] } },
              },
            },
          },
        }),
        hl: ['"stopReason"', '"PROMPT_ATTACK"'],
      },
      code: { file: 'app', hl: ['"trace": "enabled"', 'if resp["stopReason"] == "guardrail_intervened"', 'return "No puedo ayudarte con eso.'] },
    },
    {
      title: '4 · Prompt cache',
      body: 'La primera llamada **escribe** el prefijo en caché (`cacheWriteInputTokens`); las siguientes con el mismo prefijo lo **leen** (`cacheReadInputTokens`), más barato y rápido, y sin consumir cuota de rate limit. Con `ttl: "1h"` sobrevive a un usuario que tarda 8 minutos en responder. `inputTokens` pasa a contar solo lo no cacheado.',
      flows: ['guard>cache', 'cache>guard'],
      data: {
        title: 'usage de dos llamadas seguidas',
        lang: 'json',
        content: json({
          'llamada 1 (escribe caché)': { usage: { inputTokens: 41, cacheWriteInputTokens: 6182, cacheReadInputTokens: 0, outputTokens: 176 } },
          'llamada 2 (8 min después)': { usage: { inputTokens: 37, cacheWriteInputTokens: 0, cacheReadInputTokens: 6182, outputTokens: 149 } },
        }),
        hl: ['"cacheWriteInputTokens": 6182', '"cacheReadInputTokens": 6182'],
      },
      code: { file: 'app', hl: ['{"text": POLITICAS}', '{"cachePoint": {"type": "default", "ttl": "1h"}}', 'print(f"cache read='] },
    },
    {
      title: '5 · Enrutamiento entre regiones',
      body: 'El perfil elige la región con capacidad disponible. Tu código no cambia: **solo el prefijo del `modelId` decide el alcance**. Por residencia de datos, cambia `global.` por `eu.` o `us.`; con el ID base del modelo la llamada falla con 400.',
      flows: ['guard>profile', 'profile>r1', 'profile>r2', 'profile>r3'],
      data: {
        title: 'mismo código, distinto alcance: qué cambia en modelId',
        lang: 'yaml',
        content: `global.anthropic.claude-sonnet-5-5:   # cualquier región comercial con capacidad (≈10 % más barato)
eu.anthropic.claude-sonnet-5-5:       # solo regiones de la UE (GDPR, banca europea)
us.anthropic.claude-sonnet-5-5:       # solo regiones de EE. UU.
jp.anthropic.claude-haiku-5-5:        # solo Japón
anthropic.claude-sonnet-5-5:          # ID base → 400: los Claude recientes no se invocan sin perfil`,
        hl: ['global.anthropic', 'anthropic.claude-sonnet-5-5:          # ID base'],
      },
      code: { file: 'app', hl: ['modelId="global.anthropic.claude-sonnet-5-5"'] },
    },
    {
      title: '6 · Guardrail de salida y respuesta',
      body: 'La respuesta pasa de nuevo por el guardrail (PII, *grounding*) y vuelve con `stopReason: "end_turn"` y `usage` desglosado. Tu código registra los tokens de caché (la métrica que dice si el prefijo está bien diseñado) y extrae el texto.',
      flows: ['r2>profile', 'profile>guard', 'guard>endpoint', 'endpoint>app'],
      data: {
        title: 'respuesta de Converse',
        lang: 'json',
        content: json({
          output: {
            message: {
              role: 'assistant',
              content: [{ text: 'Según la política vigente, el plazo general es de 30 días, así que esta compra ya no califica para devolución. Puedo derivarte con un ejecutivo para revisar una excepción.' }],
            },
          },
          stopReason: 'end_turn',
          usage: { inputTokens: 37, outputTokens: 149, totalTokens: 6368, cacheReadInputTokens: 6182, cacheWriteInputTokens: 0 },
          metrics: { latencyMs: 1840 },
        }),
        hl: ['"stopReason"', '"cacheReadInputTokens"'],
      },
      code: { file: 'app', hl: ['u = resp["usage"]', 'return resp["output"]["message"]["content"][0]["text"]'] },
    },
  ],
}

/* ------------------------------------------------------------------ */
/* AgentCore: una petición de punta a punta                            */
/* ------------------------------------------------------------------ */

const SID = 'portal-sess-7f3c9a2e-41d8-4b6a-9e0f-5c2d18b7a604'
const PROMPT_REEMBOLSO = 'El pedido 4512 llegó con la caja rota y el producto dañado. Quiero el reembolso.'

const M_TOOLUSE: ApiMessage = {
  role: 'assistant',
  note: 'Converse · stopReason: tool_use (forma Messages)',
  content: [
    { type: 'text', text: 'Reviso el pedido y emito el reembolso.' },
    { type: 'tool_use', id: 'tooluse_kXz81', name: 'Pedidos___issue_refund', input: { order_id: '4512', amount: 89.9, reason: 'producto dañado' } },
  ],
}

export const agentcoreArquitectura: IsoSpec = {
  id: 'aws-agentcore-arquitectura',
  title: 'AgentCore: una petición de punta a punta',
  summary:
    'Un agente en **AgentCore Runtime** no está solo: **Identity** autentica al usuario y guarda credenciales salientes, **Memory** aporta contexto, **Gateway** expone herramientas como MCP, **Policy** evalúa cada llamada con reglas Cedar y **Observability** traza todo en CloudWatch. El código es el entrypoint ADK del artículo (`app/agent/main.py`) y una política Cedar ilustrativa; los datos muestran la petición HTTP, el payload que recibe tu contenedor, la evaluación de la política y el span resultante.',
  height: 500,
  zones: [{ id: 'agentcore', label: 'Amazon Bedrock AgentCore', from: [1.8, -4.8], to: [11.2, 4.8], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Usuario / app', sub: 'portal de soporte', at: [-1.2, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Una app web de atención al cliente llama a `InvokeAgentRuntime` con un JWT de tu IdP (Cognito, Entra ID, Okta, Auth0) o con SigV4, más el encabezado `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id`.' },
    { id: 'identity', label: 'Identity', sub: 'OAuth', at: [3.2, 0], shape: 'hex', tone: 'guard', icon: 'key', info: 'Valida el token entrante (*inbound auth*) y actúa como bóveda de credenciales salientes (OAuth 2LO/3LO, API keys) para que el agente nunca tenga secretos en el código. Soporta On-Behalf-Of.' },
    { id: 'runtime', label: 'Runtime', sub: 'microVM', at: [6.4, 0], shape: 'tall', tone: 'agent', icon: 'cpu', info: 'Serverless, con aislamiento por sesión en microVM y ejecuciones largas. Corre tu código (ADK, Strands, LangGraph, CrewAI…) como CodeZip o contenedor y sirve HTTP (`:8080/invocations`), MCP, A2A o AG-UI.' },
    { id: 'model', label: 'Bedrock', sub: 'global.anthropic…5-5', at: [6.4, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'El modelo es independiente de AgentCore: puede ser Claude en Bedrock vía perfil de inferencia, Gemini, OpenAI o un gateway propio como LiteLLM. En el código del artículo, ADK llega a Bedrock con `LiteLlm("bedrock/global.…")`.' },
    { id: 'memory', label: 'Memory', sub: 'corto y largo plazo', at: [6.4, 3.3], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Memoria de corto plazo (eventos de la sesión) y de largo plazo (hechos, preferencias, resúmenes extraídos por estrategias). Compartible entre agentes y con TTL configurable.' },
    { id: 'obs', label: 'Observability', sub: 'OTel → CloudWatch', at: [3.2, 3.3], shape: 'box', tone: 'infra', icon: 'chart', info: 'Trazas OpenTelemetry de cada paso (modelo, herramientas, memoria) en CloudWatch, con vistas de trayectoria. Alimenta **Evaluations** online y on-demand.' },
    { id: 'gateway', label: 'Gateway', sub: 'tools MCP', at: [9.8, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Convierte APIs OpenAPI, Lambda, Step Functions, servidores MCP y destinos HTTP en un único endpoint MCP con autenticación unificada. También acepta *inference targets* con fallback de modelo.' },
    { id: 'policy', label: 'Policy', sub: 'Cedar · Guardrails', at: [9.8, -3.4], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Reglas deterministas evaluadas en el Gateway **fuera del código del agente**: el modelo no puede "razonar" para saltárselas. Se escriben en Cedar o lenguaje natural e integran Bedrock Guardrails. Lo no permitido explícitamente queda denegado.' },
    { id: 'lambda', label: 'API de pedidos', sub: 'Lambda / OpenAPI', at: [13.4, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'Sistema interno expuesto como herramientas MCP (`Pedidos___get_order`, `Pedidos___issue_refund`). El Gateway traduce la llamada MCP a la invocación Lambda o HTTP.' },
    { id: 'saas', label: 'CRM SaaS', sub: 'OAuth 3LO', at: [13.4, 3.3], shape: 'cloud', tone: 'tool', icon: 'cloud', info: 'Herramienta externa (p. ej. Salesforce o Zendesk) a la que el Gateway llega con el token OAuth del usuario que Identity custodia.' },
  ],
  edges: [
    { from: 'user', to: 'identity' },
    { from: 'identity', to: 'runtime' },
    { from: 'runtime', to: 'model' },
    { from: 'runtime', to: 'memory' },
    { from: 'runtime', to: 'obs', route: 'z', dashed: true },
    { from: 'runtime', to: 'gateway', label: 'MCP' },
    { from: 'gateway', to: 'policy' },
    { from: 'gateway', to: 'lambda' },
    { from: 'gateway', to: 'saas', route: 'z' },
  ],
  code: {
    main: { title: 'app/agent/main.py', lang: 'python', source: ADK_MAIN },
    policy: { title: 'politica-reembolsos.cedar (ilustrativo)', lang: 'text', source: CEDAR_REEMBOLSOS },
  },
  steps: [
    {
      title: '1 · Invocación autenticada',
      body: 'El portal llama a `InvokeAgentRuntime`: el ARN del runtime va codificado en la ruta, el JWT del usuario en `Authorization` y el id de sesión en un encabezado. **Identity** (el autorizador JWT del Runtime) valida emisor y audiencia **antes** de que tu código se ejecute.',
      flows: ['user>identity', 'identity>runtime'],
      data: {
        title: 'InvokeAgentRuntime (HTTPS + OAuth)',
        lang: 'http',
        content: `POST /runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A111122223333%3Aruntime%2Fsoporte_retail-a1B2c3/invocations?qualifier=DEFAULT HTTP/1.1
Host: bedrock-agentcore.us-east-1.amazonaws.com
Authorization: Bearer eyJraWQiOiJ…   ← JWT del IdP corporativo
X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: ${SID}
Content-Type: application/json

${json({ prompt: PROMPT_REEMBOLSO, user_id: 'cli-8812' })}`,
        hl: ['/invocations?qualifier=DEFAULT', 'Authorization: Bearer', 'Runtime-Session-Id'],
      },
      code: { file: 'main', hl: ['app = BedrockAgentCoreApp()'] },
    },
    {
      title: '2 · Sesión aislada',
      body: 'Runtime enruta la petición a la **microVM de esa sesión** (o crea una). Dentro, tu contenedor recibe el mismo payload en `POST /invocations` del puerto 8080; el SDK entrega el cuerpo como `payload` y el id de sesión en `context.session_id`.',
      focus: ['runtime'],
      flows: ['identity>runtime: POST :8080/invocations'],
      data: {
        title: 'lo que recibe tu contenedor',
        lang: 'http',
        content: `POST /invocations HTTP/1.1
Host: localhost:8080
Content-Type: application/json
X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: ${SID}

${json({ prompt: PROMPT_REEMBOLSO, user_id: 'cli-8812' })}`,
        hl: ['POST /invocations', '"prompt"'],
      },
      code: { file: 'main', hl: ['@app.entrypoint', 'async def invoke(payload, context)', 'context.session_id', 'sessions.create_session'] },
    },
    {
      title: '3 · Contexto desde Memory',
      body: 'El agente recupera los últimos eventos de la sesión y los recuerdos de largo plazo del cliente. Ojo: el `InMemorySessionService` del ejemplo solo vive lo que vive la microVM; para recordar entre conversaciones se usa **AgentCore Memory** (en la [arquitectura de referencia](/guia/arquitectura-de-referencia) verás `retrieve_memories` y `create_event`).',
      flows: ['memory>runtime'],
      data: {
        title: 'retrieve_memories → registros de largo plazo (forma simplificada)',
        lang: 'json',
        content: json([
          { namespace: '/preferencias/cli-8812/', content: { text: 'Prefiere el reembolso como crédito en tienda.' }, score: 0.81 },
          { namespace: '/hechos/cli-8812/', content: { text: 'El pedido 3920 (sep-2026) también llegó dañado; se resolvió con reposición.' }, score: 0.74 },
        ]),
        hl: ['"namespace"', '"text"'],
      },
      code: { file: 'main', hl: ['usa AgentCore Memory para persistir', 'runner = Runner('] },
    },
    {
      title: '4 · Razonamiento',
      body: 'ADK llama al modelo (Claude en Bedrock vía perfil `global.`) con el contexto y las definiciones de herramientas. El modelo no responde con texto: pide `Pedidos___issue_refund` con argumentos JSON. Es una **solicitud**; nada se ha ejecutado aún.',
      flows: ['runtime>model', 'model>runtime: tool_use'],
      data: { title: 'messages (después de la llamada al modelo)', messages: [{ role: 'user', content: PROMPT_REEMBOLSO }, M_TOOLUSE], newFrom: 1, hl: [1] },
      code: { file: 'main', hl: ['model=LiteLlm(model="bedrock/global.anthropic.claude-sonnet-5-5")', 'runner.run_async('] },
    },
    {
      title: '5 · Gateway + Policy',
      body: 'La llamada MCP llega al **Gateway**, que arma una solicitud de autorización Cedar: principal (claims del JWT como *tags*), acción (`Target___herramienta`) y `context.input` (los argumentos). 89,90 ≤ 100 → **Allow**. Un reembolso de 300 sin rol `supervisor` no casaría con ningún `permit` y quedaría **denegado por defecto**, sin importar lo que "piense" el modelo.',
      flows: ['runtime>gateway: tools/call', 'gateway>policy', 'policy>gateway: Allow'],
      data: {
        title: 'solicitud y decisión Cedar (forma simplificada)',
        lang: 'json',
        content: json({
          request: {
            principal: 'AgentCore::OAuthUser::"cli-8812"',
            action: 'AgentCore::Action::"Pedidos___issue_refund"',
            resource: 'AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/soporte-gw"',
            context: { input: { order_id: '4512', amount: 89.9, reason: 'producto dañado' } },
          },
          decision: 'Allow',
          determiningPolicies: ['reembolsos-hasta-100'],
        }),
        hl: ['"action"', '"amount": 89.9', '"decision": "Allow"'],
      },
      code: { file: 'policy', hl: ['action == AgentCore::Action::"Pedidos___issue_refund"', 'context.input.amount <= 100', 'principal.getTag("role") == "supervisor"'] },
    },
    {
      title: '6 · Ejecución de herramientas',
      body: 'El Gateway invoca la Lambda de pedidos y devuelve un resultado MCP normal. Para registrar el caso en el CRM, pide a **Identity** el token OAuth que ese usuario autorizó (3LO): el código del agente nunca ve esa credencial.',
      flows: ['gateway>lambda', 'lambda>gateway', 'gateway>saas', 'gateway>runtime: result'],
      data: {
        title: 'respuesta JSON-RPC del Gateway',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 12,
          result: {
            content: [{ type: 'text', text: '{"refund_id":"RF-77120","status":"aprobado","amount":89.9,"crm_case":"CS-20931"}' }],
            isError: false,
          },
        }),
        hl: ['"refund_id', '"isError": false'],
      },
    },
    {
      title: '7 · Memoria y trazas',
      body: 'El agente escribe el turno en Memory (las estrategias extraerán hechos de largo plazo de forma asíncrona) y cada operación queda como span OpenTelemetry en CloudWatch, con las convenciones `gen_ai.*`: de ahí salen la vista de trayectoria y las **Evaluations** online.',
      flows: ['runtime>memory', 'runtime>obs'],
      data: {
        title: 'span OTel de la herramienta (forma simplificada)',
        lang: 'json',
        content: json({
          name: 'execute_tool Pedidos___issue_refund',
          trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
          parent_span_id: '00f067aa0ba902b7',
          attributes: {
            'gen_ai.operation.name': 'execute_tool',
            'gen_ai.tool.name': 'Pedidos___issue_refund',
            'gen_ai.tool.call.id': 'tooluse_kXz81',
            'gen_ai.conversation.id': SID,
          },
          duration_ms: 412,
          status: 'OK',
        }),
        hl: ['"gen_ai.operation.name"', '"gen_ai.tool.name"'],
      },
    },
    {
      title: '8 · Respuesta',
      body: 'El entrypoint toma el evento final del `Runner` y devuelve `{"result": …}`; Runtime lo entrega al portal (o como stream SSE). La microVM sigue viva para la sesión hasta su timeout de inactividad, con el historial en memoria.',
      flows: ['runtime>identity', 'identity>user'],
      data: {
        title: 'respuesta de InvokeAgentRuntime',
        lang: 'http',
        content: `HTTP/1.1 200 OK
Content-Type: application/json
X-Amzn-Bedrock-AgentCore-Runtime-Session-Id: ${SID}

${json({ result: 'Listo: emití un reembolso de 89,90 USD (RF-77120) por el pedido 4512 y registré el caso CS-20931. Si prefieres crédito en tienda, puedo cambiarlo.' })}`,
        hl: ['"result"'],
      },
      code: { file: 'main', hl: ['event.is_final_response()', 'return {"result": respuesta}', 'app.run()'] },
    },
  ],
}
