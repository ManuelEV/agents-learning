import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* -------------------------------------------------------------------------- */
/* LLM gateway                                                                 */
/* -------------------------------------------------------------------------- */

/** Mismo código que el bloque `config.yaml` del artículo. */
const CONFIG_YAML = `model_list:
  - model_name: claude-sonnet                  # alias que ven los agentes
    litellm_params:
      model: bedrock/global.anthropic.claude-sonnet-5-5   # perfil de inferencia global
      aws_region_name: us-east-1               # credenciales: rol IAM de la tarea ECS
  - model_name: claude-sonnet-eu
    litellm_params:
      model: bedrock/eu.anthropic.claude-sonnet-5-5
      aws_region_name: eu-west-1
      aws_role_name: arn:aws:iam::222233334444:role/litellm-bedrock   # otra cuenta, otra cuota
      aws_session_name: litellm-gw
  - model_name: claude-haiku
    litellm_params:
      model: bedrock/global.anthropic.claude-haiku-5-5

litellm_settings:
  num_retries: 2                               # reintentos sobre el mismo alias

router_settings:
  fallbacks: [{"claude-sonnet": ["claude-sonnet-eu", "claude-haiku"]}]
  allowed_fails: 3                             # tras 3 fallos, el despliegue entra en cooldown
  cooldown_time: 30                            # segundos fuera de rotación

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY    # solo para administrar, nunca para agentes
  database_url: os.environ/DATABASE_URL        # Postgres: claves, equipos y gasto

mcp_servers:                                   # el mismo proxy como gateway MCP
  tickets:
    url: "https://mcp-tickets.interno/mcp"
    transport: "http"
    description: "Sistema de tickets de postventa"
    auth_type: "api_key"
    auth_value: os.environ/TICKETS_MCP_KEY`

/** Mismo código que el bloque `agent.py` del artículo. */
const AGENT_PY = `# pip install google-adk "litellm>=1.84"
import os
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

root_agent = LlmAgent(
    name="asistente_ventas",
    model=LiteLlm(
        model="litellm_proxy/claude-sonnet",          # alias del gateway, no el id de Bedrock
        api_base="https://ai-gateway.interno",
        api_key=os.environ["LITELLM_VIRTUAL_KEY"],    # clave virtual con presupuesto propio
    ),
    instruction="Ayudas al equipo comercial con cotizaciones y disponibilidad.",
)`

/** Mismo código que el bloque `crear-clave.sh` del artículo. */
const KEY_SH = `curl -X POST https://ai-gateway.interno/key/generate \\
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
        "key_alias": "agente-ventas-prod",
        "models": ["claude-sonnet", "claude-haiku"],
        "max_budget": 500,
        "budget_duration": "30d",
        "tpm_limit": 200000,
        "rpm_limit": 120,
        "metadata": {"equipo": "ventas", "centro_costo": "CC-4410"}
      }'
# → {"key": "sk-...", ...}  guárdala en Secrets Manager, nunca en el repo`

const Q_VENTAS = '¿Tenemos stock del notebook NB-15 para cotizar 40 unidades a Comercial Austral?'

export const gatewaysLlm: IsoSpec = {
  id: 'gateways-llm',
  title: 'LLM gateway: claves virtuales, presupuestos y fallback',
  summary:
    'Todos los agentes hablan con **un solo endpoint** (compatible OpenAI) usando claves virtuales por equipo. El gateway valida presupuesto y límites, enruta al modelo principal en Bedrock y, ante throttling o caída, hace **fallback** al perfil `eu.` en otra cuenta y, como último recurso, a un modelo menor. Cada llamada queda registrada con su costo. Sigues una request real en orden; el código es `config.yaml`, `agent.py` y `crear-clave.sh` del artículo.',
  height: 500,
  layout: 'sequence',
  lanes: ['ventas', 'soporte', 'gw', 'db', 'global', 'eu', 'haiku', 'obs'],
  nodes: [
    { id: 'ventas', label: 'Agente de ventas', sub: 'ADK · clave sk-ventas', at: [0, -1.8], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Usa `LiteLlm(model="litellm_proxy/claude-sonnet")` con su clave virtual. Nunca ve credenciales de AWS ni de otros proveedores.' },
    { id: 'soporte', label: 'Agente de soporte', sub: 'Strands · sk-soporte', at: [0, 1.8], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Otro equipo, otro framework, mismo gateway. Su clave tiene otro presupuesto y otros modelos permitidos.' },
    { id: 'gw', label: 'LiteLLM Proxy', sub: 'AI gateway corporativo', at: [3.6, 0], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Autentica la clave virtual, verifica modelos permitidos, presupuesto (`max_budget`) y límites tpm/rpm; enruta, reintenta y aplica fallbacks.' },
    { id: 'db', label: 'Postgres', sub: 'claves, equipos, gasto', at: [3.6, 3.6], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Guarda claves virtuales, equipos, presupuestos y el gasto acumulado por clave. Requisito para usar virtual keys en LiteLLM.' },
    { id: 'global', label: 'Bedrock global.', sub: 'claude-sonnet-5-5', at: [7.6, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Primario: perfil de inferencia `global.anthropic.claude-sonnet-5-5`. Bedrock ya reparte entre regiones, pero puede devolver throttling si se agota la cuota.' },
    { id: 'eu', label: 'Bedrock eu.', sub: 'otra cuenta / región', at: [7.6, 0], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Fallback 1 (`claude-sonnet-eu`): perfil geográfico en otra cuenta con cuota propia, asumiendo un rol IAM. Revisa residencia de datos antes de cruzar geografías.' },
    { id: 'haiku', label: 'Modelo menor', sub: 'claude-haiku-5-5', at: [7.6, 3.4], shape: 'sphere', tone: 'model', icon: 'sparkles', info: 'Fallback 2 (`claude-haiku`): un modelo más pequeño de la misma familia. Otra opción es un modelo comparable de otro proveedor, solo si tus evals confirman calidad aceptable y el contrato lo permite.' },
    { id: 'obs', label: 'Observabilidad', sub: 'Langfuse · OTel', at: [3.6, -3.6], shape: 'box', tone: 'infra', icon: 'chart', info: 'Cada request se registra con equipo, modelo, tokens, latencia y costo. Base para *showback/chargeback* y para detectar abusos.' },
  ],
  edges: [
    { from: 'ventas', to: 'gw' },
    { from: 'soporte', to: 'gw' },
    { from: 'gw', to: 'db', route: 'z' },
    { from: 'gw', to: 'obs', route: 'z', dashed: true },
    { from: 'gw', to: 'global', route: 'z' },
    { from: 'gw', to: 'eu' },
    { from: 'gw', to: 'haiku', route: 'z' },
  ],
  code: {
    config: { title: 'config.yaml', lang: 'yaml', source: CONFIG_YAML },
    agent: { title: 'agent.py', lang: 'python', source: AGENT_PY },
    key: { title: 'crear-clave.sh', lang: 'bash', source: KEY_SH },
  },
  steps: [
    {
      title: '1 · Un endpoint, muchas claves',
      body: 'El agente de ventas llama al gateway en formato OpenAI con `Authorization: Bearer sk-ventas…` y el alias `claude-sonnet`. No conoce el proveedor real ni tiene credenciales de AWS.',
      flows: ['ventas>gw: POST /chat/completions'],
      data: {
        title: 'request del agente al gateway',
        lang: 'http',
        content: [
          'POST /chat/completions HTTP/1.1',
          'Host: ai-gateway.interno',
          'Authorization: Bearer sk-ventas-7Qm…',
          'Content-Type: application/json',
          '',
          json({
            model: 'claude-sonnet',
            messages: [
              { role: 'system', content: 'Ayudas al equipo comercial con cotizaciones y disponibilidad.' },
              { role: 'user', content: Q_VENTAS },
            ],
            max_tokens: 1024,
          }),
        ].join('\n'),
        hl: ['Authorization: Bearer sk-ventas', '"model": "claude-sonnet"'],
      },
      code: { file: 'agent', hl: ['model="litellm_proxy/claude-sonnet"', 'api_base="https://ai-gateway.interno"', 'api_key=os.environ["LITELLM_VIRTUAL_KEY"]'] },
    },
    {
      title: '2 · Autorizar y presupuestar',
      body: 'El gateway busca la clave en Postgres: ¿puede usar `claude-sonnet`? ¿le queda presupuesto en el ciclo de 30 días? ¿está bajo su límite de tpm/rpm? Si algo falla, responde error **sin gastar un token** del proveedor.',
      flows: ['gw>db: buscar clave', 'db>gw: límites y gasto'],
      data: {
        title: 'registro de la clave virtual (forma simplificada)',
        lang: 'json',
        content: json({
          key_alias: 'agente-ventas-prod',
          models: ['claude-sonnet', 'claude-haiku'],
          spend: 212.37,
          max_budget: 500,
          budget_duration: '30d',
          tpm_limit: 200000,
          rpm_limit: 120,
          metadata: { equipo: 'ventas', centro_costo: 'CC-4410' },
          '→ decisión': 'permitido: modelo en la lista, 42 % del presupuesto usado, bajo límites',
        }),
        hl: ['"models"', '"spend"', '"max_budget"', '"→ decisión"'],
      },
      code: { file: 'key', hl: ['"models": ["claude-sonnet", "claude-haiku"]', '"max_budget": 500', '"tpm_limit": 200000', '"rpm_limit": 120'] },
    },
    {
      title: '3 · Ruta principal',
      body: 'El alias `claude-sonnet` se resuelve al perfil `global.` y el gateway llama a la **Converse API** de Bedrock firmando con el rol IAM de su tarea ECS. Hoy hay cuota agotada: Bedrock responde `429 ThrottlingException`. Antes de rendirse, LiteLLM reintenta dos veces (`num_retries: 2`).',
      flows: ['gw>global: Converse', 'global>gw: 429 ThrottlingException'],
      data: {
        title: 'request traducida a Bedrock y respuesta',
        lang: 'http',
        content: [
          'POST /model/global.anthropic.claude-sonnet-5-5/converse HTTP/1.1',
          'Host: bedrock-runtime.us-east-1.amazonaws.com',
          'Authorization: AWS4-HMAC-SHA256 Credential=ASIA…/20261106/us-east-1/bedrock/aws4_request, …',
          'Content-Type: application/json',
          '',
          json({
            system: [{ text: 'Ayudas al equipo comercial con cotizaciones y disponibilidad.' }],
            messages: [{ role: 'user', content: [{ text: Q_VENTAS }] }],
            inferenceConfig: { maxTokens: 1024 },
          }),
          '',
          'HTTP/1.1 429 Too Many Requests',
          'x-amzn-ErrorType: ThrottlingException',
          '',
          json({ message: 'Too many requests, please wait before trying again.' }),
        ].join('\n'),
        hl: ['/model/global.anthropic.claude-sonnet-5-5/converse', 'AWS4-HMAC-SHA256', '429 Too Many Requests', 'ThrottlingException'],
      },
      code: { file: 'config', hl: ['model_name: claude-sonnet ', 'model: bedrock/global.anthropic.claude-sonnet-5-5', 'num_retries: 2'] },
    },
    {
      title: '4 · Fallback regional',
      body: 'Agotados los reintentos, el router prueba el siguiente alias de `fallbacks`: `claude-sonnet-eu`, en **otra cuenta** con cuota propia (asume `aws_role_name`). Responde bien. El despliegue `global.` acumula fallos y, tras 3, sale de rotación 30 s (*cooldown*).',
      flows: ['gw>eu: Converse (fallback 1)', 'eu>gw: 200 OK'],
      data: {
        title: 'respuesta de Bedrock (Converse, eu-west-1)',
        lang: 'json',
        content: json({
          output: { message: { role: 'assistant', content: [{ text: 'Sí: hay 52 unidades del NB-15 en el CD de Santiago. Para 40 unidades aplica la lista mayorista…' }] } },
          stopReason: 'end_turn',
          usage: { inputTokens: 812, outputTokens: 164, totalTokens: 976 },
          metrics: { latencyMs: 2140 },
        }),
        hl: ['"stopReason"', '"usage"'],
      },
      code: { file: 'config', hl: ['model_name: claude-sonnet-eu', 'aws_role_name: arn:aws:iam::222233334444', 'fallbacks: [{"claude-sonnet"', 'allowed_fails: 3', 'cooldown_time: 30'] },
    },
    {
      title: '5 · Último recurso',
      body: 'Si `eu.` también fallara, el siguiente de la lista es `claude-haiku`: un modelo menor de la misma familia, ya evaluado para este caso. Cambiar a otro proveedor también es posible, pero es una decisión de negocio: calidad, contrato y residencia de datos deben estar validados de antemano.',
      flows: ['gw>haiku: Converse (fallback 2)', 'haiku>gw'],
      data: {
        title: 'traza del router para esta request (ilustrativo)',
        lang: 'text',
        content: [
          'claude-sonnet     → bedrock/global.anthropic.claude-sonnet-5-5   429 ThrottlingException  (intento 1/3)',
          'claude-sonnet     → bedrock/global.anthropic.claude-sonnet-5-5   429 ThrottlingException  (intento 3/3)',
          'fallback          → claude-sonnet-eu',
          'claude-sonnet-eu  → bedrock/eu.anthropic.claude-sonnet-5-5       200 OK  2140 ms',
          'claude-haiku      → (no fue necesario)',
        ].join('\n'),
        hl: ['fallback', '200 OK'],
      },
      code: { file: 'config', hl: ['model_name: claude-haiku', '["claude-sonnet-eu", "claude-haiku"]'] },
    },
    {
      title: '6 · Registrar costo',
      body: 'La respuesta vuelve al agente en formato OpenAI, con el costo calculado en un header. El gasto se suma a la clave y al equipo en Postgres, y la traza (equipo, alias, despliegue real, tokens, latencia) va a la plataforma de observabilidad. Vigila la **tasa de fallback**: aquí respondió un despliegue distinto del primario.',
      flows: ['gw>ventas: 200 + costo', 'gw>db: suma gasto', 'gw>obs: traza'],
      data: {
        title: 'respuesta al agente (forma simplificada)',
        lang: 'http',
        content: [
          'HTTP/1.1 200 OK',
          'Content-Type: application/json',
          'x-litellm-response-cost: 0.004896',
          '',
          json({
            object: 'chat.completion',
            model: 'claude-sonnet',
            choices: [{ index: 0, message: { role: 'assistant', content: 'Sí: hay 52 unidades del NB-15 en el CD de Santiago…' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 812, completion_tokens: 164, total_tokens: 976 },
          }),
        ].join('\n'),
        hl: ['x-litellm-response-cost', '"usage"'],
      },
      code: { file: 'config', hl: ['database_url: os.environ/DATABASE_URL'] },
    },
    {
      title: '7 · Otro equipo, otras reglas',
      body: 'El agente de soporte usa el mismo gateway con su propia clave, que solo permite `claude-haiku`. Si pide `claude-sonnet`, el gateway lo rechaza antes de llegar a Bedrock. Cambiar esa regla es configuración del gateway, no un despliegue del agente.',
      flows: ['soporte>gw: model=claude-sonnet', 'gw>soporte: 401 modelo no permitido'],
      data: {
        title: 'rechazo por modelo no permitido (forma simplificada)',
        lang: 'json',
        content: json({
          error: {
            message: "key not allowed to access model. This key can only access models=['claude-haiku']. Tried to access claude-sonnet",
            code: '401',
          },
        }),
        hl: ['"message"'],
      },
      code: { file: 'key', hl: ['"key_alias": "agente-ventas-prod"', '"models": ['] },
    },
  ],
}

/* -------------------------------------------------------------------------- */
/* Tool / MCP gateway                                                          */
/* -------------------------------------------------------------------------- */

const GW_URL = 'https://soporte-gw-a1b2c3d4e5.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp'

const MCP_AGENT = `import os, httpx
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

GATEWAY = "${GW_URL}"

def token_del_agente() -> str:
    """Token OAuth del agente con audiencia = gateway (client credentials)."""
    r = httpx.post("https://login.retailandino.com/oauth2/token",
                   data={"grant_type": "client_credentials", "scope": "gateway/soporte.invoke"},
                   auth=(os.environ["AGENT_CLIENT_ID"], os.environ["AGENT_CLIENT_SECRET"]))
    return r.json()["access_token"]

herramientas = McpToolset(             # una sola URL MCP para todas las herramientas
    connection_params=StreamableHTTPConnectionParams(
        url=GATEWAY, headers={"Authorization": f"Bearer {token_del_agente()}"}))

root_agent = LlmAgent(
    name="soporte_postventa",
    model=LiteLlm(model="litellm_proxy/claude-sonnet"),
    instruction=("Resuelves reclamos de postventa. Los reembolsos sobre US$200 "
                 "requieren una aprobación registrada antes de solicitarlos."),
    tools=[herramientas],              # solo ve las tools que su identidad puede usar
)`

const CEDAR = `// Lecturas: cualquier agente autenticado en el gateway de soporte
permit(
  principal,
  action == AgentCore::Action::"Pedidos___get_order",
  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/soporte"
);

// Reembolsos chicos: sin más trámite
permit(
  principal,
  action == AgentCore::Action::"Reembolsos___issue_refund",
  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/soporte"
) when { context.input.amount <= 200 };

// Sobre 200: solo si referencia una aprobación humana (la Lambda la verifica)
permit(
  principal,
  action == AgentCore::Action::"Reembolsos___issue_refund",
  resource == AgentCore::Gateway::"arn:aws:bedrock-agentcore:us-east-1:111122223333:gateway/soporte"
) when { context.input.amount > 200 && context.input has approval_id };

// Todo lo que no tenga un permit explícito queda denegado (default deny de Cedar).`

const LAMBDA = `from aprobaciones import verificar        # sistema de aprobaciones (interno)
from pagos import reembolsar

def handler(event, context):
    # AgentCore Gateway entrega los argumentos de la tool en \`event\`
    # y el nombre "target___tool" en el client context.
    tool = context.client_context.custom["bedrockAgentCoreToolName"]
    if not tool.endswith("___issue_refund"):
        return {"error": f"Tool desconocida: {tool}"}
    if event["amount"] > 200 and not verificar(event.get("approval_id"), event["order_id"]):
        return {"error": "Aprobación inválida o ausente"}   # segunda línea de defensa
    op = reembolsar(event["order_id"], event["amount"],
                    idempotency_key=f"{event['order_id']}:{event['reason']}")
    return {"status": "reembolsado", "refund_id": op.id}`

const mcpPost = (name: string, id: number, args: unknown) =>
  [
    'POST /mcp HTTP/1.1',
    `Host: ${GW_URL.replace('https://', '').replace('/mcp', '')}`,
    'Authorization: Bearer eyJraWQiOi…',
    'Content-Type: application/json',
    'Mcp-Method: tools/call',
    `Mcp-Name: ${name}`,
    '',
    json({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } }),
  ].join('\n')

export const gatewaysMcp: IsoSpec = {
  id: 'gateways-mcp',
  title: 'Tool / MCP gateway: OAuth, política y auditoría',
  summary:
    'Un **gateway de herramientas** expone APIs internas, Lambdas y servidores MCP de terceros como **un único endpoint MCP**. Valida el token del agente, evalúa una **política** en cada llamada a herramienta, obtiene credenciales hacia cada sistema y audita todo. Seguimos al agente de soporte con el pedido 4512 a través de AgentCore Gateway; el código (ilustrativo) es el agente, la política Cedar y la Lambda de reembolsos.',
  height: 500,
  layout: 'sequence',
  lanes: ['agent', 'idp', 'gw', 'policy', 'oms', 'refund', 'saas', 'audit'],
  nodes: [
    { id: 'agent', label: 'Agente', sub: 'ADK en AgentCore Runtime', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Conoce una sola URL MCP. Recibe la lista de tools que su identidad puede usar, ya filtrada.' },
    { id: 'idp', label: 'IdP', sub: 'Okta · Entra ID · Cognito', at: [0, -3.6], shape: 'hex', tone: 'guard', icon: 'key', info: 'Emite el token del agente (o del usuario en nombre de quien actúa) con audiencia = gateway.' },
    { id: 'gw', label: 'Tool gateway', sub: 'AgentCore Gateway', at: [3.6, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Termina OAuth (inbound), agrega herramientas de varios orígenes bajo un endpoint MCP y gestiona credenciales salientes (outbound) por destino. Nombra cada tool como `target___tool`.' },
    { id: 'policy', label: 'Policy', sub: 'Cedar · por tool call', at: [3.6, -3.6], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Reglas deterministas evaluadas en cada llamada: "soporte puede `issue_refund` solo si `amount <= 200`". Fuera del modelo, no se puede saltar con un prompt.' },
    { id: 'oms', label: 'API de pedidos', sub: 'OpenAPI → tools', at: [7.6, -3.4], shape: 'box', tone: 'tool', icon: 'server', info: 'Una API REST existente descrita con OpenAPI, convertida en herramientas MCP sin escribir un servidor.' },
    { id: 'refund', label: 'Reembolsos', sub: 'Lambda', at: [7.6, 0], shape: 'box', tone: 'tool', icon: 'zap', info: 'Una función Lambda expuesta como herramienta. Acción de escritura: política estricta y, sobre cierto monto, aprobación humana.' },
    { id: 'saas', label: 'Servidor MCP SaaS', sub: 'tickets / CRM', at: [7.6, 3.4], shape: 'cloud', tone: 'tool', icon: 'cloud', info: 'Un servidor MCP remoto de un proveedor. El gateway se autentica con OAuth hacia él; el agente nunca ve ese token.' },
    { id: 'audit', label: 'Auditoría', sub: 'CloudWatch · OTel', at: [3.6, 3.6], shape: 'box', tone: 'infra', icon: 'eye', info: 'Quién llamó qué herramienta, con qué argumentos, qué decidió la política y qué respondió el sistema.' },
  ],
  edges: [
    { from: 'agent', to: 'idp' },
    { from: 'agent', to: 'gw', label: 'MCP' },
    { from: 'gw', to: 'policy' },
    { from: 'gw', to: 'audit', dashed: true },
    { from: 'gw', to: 'oms', route: 'z' },
    { from: 'gw', to: 'refund' },
    { from: 'gw', to: 'saas', route: 'z' },
  ],
  code: {
    agent: { title: 'agente.py (ilustrativo)', lang: 'python', source: MCP_AGENT },
    cedar: { title: 'politicas.cedar (ilustrativo)', lang: 'text', source: CEDAR },
    lambda: { title: 'reembolsos_lambda.py (ilustrativo)', lang: 'python', source: LAMBDA },
  },
  steps: [
    {
      title: '1 · Identidad del agente',
      body: 'El agente obtiene un token OAuth del IdP con audiencia = gateway (y, si actúa por un usuario, con la identidad de ese usuario). Es la única credencial que tendrá: ninguna hacia el OMS, la Lambda o el SaaS.',
      flows: ['agent>idp: client_credentials', 'idp>agent: access_token'],
      data: {
        title: 'token del agente (payload del JWT)',
        lang: 'json',
        content: json({
          iss: 'https://login.retailandino.com',
          sub: 'agent-soporte-postventa',
          aud: 'gateway/soporte',
          scope: 'gateway/soporte.invoke',
          exp: 1794002400,
        }),
        hl: ['"aud"', '"scope"'],
      },
      code: { file: 'agent', hl: ['def token_del_agente', '"grant_type": "client_credentials"'] },
    },
    {
      title: '2 · Descubrir herramientas',
      body: 'El agente lista herramientas en el gateway. Recibe solo las que su identidad puede usar: de 40 registradas, ve 6, con nombres `target___tool`. Menos tools también significa menos contexto y menos confusión para el modelo.',
      flows: ['agent>gw: tools/list', 'gw>agent: 6 de 40 tools'],
      data: {
        title: 'tools/list (resumida)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 1,
          result: {
            tools: [
              { name: 'Pedidos___get_order', description: 'Estado, ítems y montos de un pedido.' },
              { name: 'Pedidos___track_shipment', description: 'Tracking del envío.' },
              { name: 'Reembolsos___issue_refund', description: 'Emite un reembolso. Sobre US$200 requiere approval_id.' },
              { name: 'Tickets___create_ticket', description: 'Crea un ticket en la mesa de ayuda.' },
              { name: 'Tickets___search_tickets', description: 'Busca tickets por pedido o cliente.' },
              { name: 'CRM___get_customer', description: 'Perfil del cliente (campos mínimos).' },
            ],
          },
        }),
        hl: ['"Reembolsos___issue_refund"'],
      },
      code: { file: 'agent', hl: ['herramientas = McpToolset(', 'url=GATEWAY', 'tools=[herramientas]'] },
    },
    {
      title: '3 · Lectura permitida',
      body: 'El modelo pide `Pedidos___get_order`. El gateway lee `Mcp-Name` del header (sin parsear el body), la política lo permite y llama a la API REST del OMS con la **credencial saliente** configurada para ese destino.',
      flows: ['agent>gw: tools/call get_order', 'gw>oms: GET /orders/4512', 'oms>gw'],
      data: {
        title: 'request del agente al gateway',
        lang: 'http',
        content: mcpPost('Pedidos___get_order', 2, { order_id: '4512' }),
        hl: ['Mcp-Name: Pedidos___get_order', 'Authorization: Bearer'],
      },
      code: { file: 'cedar', hl: ['action == AgentCore::Action::"Pedidos___get_order"'] },
    },
    {
      title: '4 · Escritura denegada',
      body: 'El modelo pide `issue_refund` por US$420 **sin** aprobación. La política evalúa los argumentos: ningún `permit` aplica (monto > 200 y sin `approval_id`), así que Cedar **deniega** por defecto. La Lambda nunca se invoca.',
      flows: ['agent>gw: issue_refund 420', 'gw>policy: evaluar', 'policy>gw: DENY', 'gw>agent: denegado'],
      data: {
        title: 'tools/call bloqueada por la política',
        lang: 'http',
        content: [
          mcpPost('Reembolsos___issue_refund', 3, { order_id: '4512', amount: 420, reason: 'retraso_entrega' }),
          '',
          '# respuesta del gateway (forma simplificada)',
          json({ jsonrpc: '2.0', id: 3, result: { isError: true, content: [{ type: 'text', text: 'Denegado por política: issue_refund > 200 requiere approval_id.' }] } }),
        ].join('\n'),
        hl: ['Mcp-Name: Reembolsos___issue_refund', '"amount": 420', 'Denegado por política'],
      },
      code: { file: 'cedar', hl: ['when { context.input.amount <= 200 }', 'context.input has approval_id', 'default deny'] },
    },
    {
      title: '5 · Escritura controlada',
      body: 'El agente escala; un supervisor aprueba (`APR-7781`) y el agente reintenta con `approval_id`. Ahora el tercer `permit` aplica y el gateway invoca la Lambda, que **vuelve a verificar** la aprobación y usa una clave de idempotencia. El agente nunca tuvo permisos IAM sobre ella.',
      flows: ['gw>refund: Invoke', 'refund>gw: reembolsado'],
      data: {
        title: 'evento que recibe la Lambda (forma simplificada)',
        lang: 'json',
        content: json({
          event: { order_id: '4512', amount: 420, reason: 'retraso_entrega', approval_id: 'APR-7781' },
          'context.client_context.custom': { bedrockAgentCoreToolName: 'Reembolsos___issue_refund' },
          '→ resultado': { status: 'reembolsado', refund_id: 'RF-20931' },
        }),
        hl: ['"approval_id"', '"bedrockAgentCoreToolName"', '"→ resultado"'],
      },
      code: { file: 'lambda', hl: ['tool = context.client_context.custom["bedrockAgentCoreToolName"]', 'not verificar(', 'idempotency_key='] },
    },
    {
      title: '6 · Terceros por MCP',
      body: 'Para dejar constancia, el agente llama `Tickets___create_ticket`. El gateway reenvía la llamada al servidor MCP del SaaS con **su propio** token OAuth hacia ese proveedor (sin *token passthrough*): el token del agente no sale del gateway.',
      flows: ['gw>saas: tools/call (token del gateway)', 'saas>gw'],
      data: {
        title: 'request saliente del gateway al SaaS',
        lang: 'http',
        content: [
          'POST /mcp HTTP/1.1',
          'Host: mcp.helpdesk-saas.com',
          'Authorization: Bearer <token OAuth del gateway hacia el SaaS>',
          'Content-Type: application/json',
          'Mcp-Method: tools/call',
          'Mcp-Name: create_ticket',
          '',
          json({ jsonrpc: '2.0', id: 91, method: 'tools/call', params: { name: 'create_ticket', arguments: { order_id: '4512', summary: 'Reembolso RF-20931 por retraso (aprobación APR-7781)' } } }),
        ].join('\n'),
        hl: ['token OAuth del gateway', 'Mcp-Name: create_ticket'],
      },
    },
    {
      title: '7 · Auditoría',
      body: 'Cada llamada, decisión de política y resultado queda auditado y trazado, correlacionado con la traza del agente por `trace_id`. Ante un reclamo, se puede reconstruir quién pidió qué, qué regla aplicó y quién aprobó.',
      flows: ['gw>audit: registro'],
      data: {
        title: 'registro de auditoría (ilustrativo)',
        lang: 'json',
        content: json([
          { ts: '2026-11-06T15:02:11Z', principal: 'agent-soporte-postventa', tool: 'Reembolsos___issue_refund', args: { order_id: '4512', amount: 420 }, policy: 'DENY', trace_id: '4bf92f35…' },
          { ts: '2026-11-06T15:09:47Z', principal: 'agent-soporte-postventa', tool: 'Reembolsos___issue_refund', args: { order_id: '4512', amount: 420, approval_id: 'APR-7781' }, policy: 'ALLOW', result: 'RF-20931', trace_id: '4bf92f35…' },
        ]),
        hl: ['"policy": "DENY"', '"policy": "ALLOW"'],
      },
    },
  ],
}
