import type { IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ------------------------------------------------------------------ */
/* Código reutilizado literalmente de microsoft-foundry-cloudflare.mdx */
/* ------------------------------------------------------------------ */

/** Bloque `agente_gastos.py` del artículo (Microsoft Agent Framework). */
const GASTOS = `import asyncio
from agent_framework import Agent
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential   # en Foundry: la identidad Entra del agente

agent = Agent(
    client=FoundryChatClient(
        project_endpoint="https://contoso-ai.services.ai.azure.com/api/projects/finanzas",
        model="gpt-5.4-mini",                # nombre de tu deployment en el proyecto
        credential=AzureCliCredential(),
    ),
    name="AsistenteGastos",
    instructions=(
        "Ayudas a validar gastos de viaje contra la política corporativa. "
        "Cita la sección de la política y nunca apruebes: solo recomiendas."
    ),
)

async def main():
    print(await agent.run("¿Un hotel de 280 USD por noche en Bogotá cumple la política?"))

asyncio.run(main())`

/** Conexión genérica al Toolbox como servidor MCP (no está en la página). */
const TOOLBOX = `import os
from agent_framework import MCPStreamableHTTPTool
from azure.identity import DefaultAzureCredential

# En el sandbox, la credencial resuelve a la identidad Entra del hosted agent
credencial = DefaultAzureCredential()
token = credencial.get_token("https://ai.azure.com/.default").token

# Un solo endpoint MCP para todas las tools del Toolbox (versión "default").
# Agent Framework trae además FoundryToolbox; aquí se muestra el protocolo.
toolbox = MCPStreamableHTTPTool(
    name="toolbox_finanzas",
    url=os.environ["TOOLBOX_MCP_URL"],
    headers={"Authorization": f"Bearer {token}"},
)

# agent = Agent(client=FoundryChatClient(...), instructions=..., tools=[toolbox])`

/** Bloque `src/index.ts` del artículo (Agents SDK sobre Durable Objects). */
const INDEX_TS = `import { Agent, routeAgentRequest } from "agents";

type Estado = { consultas: number };

export class SoporteAgent extends Agent<Env, Estado> {
  initialState: Estado = { consultas: 0 };

  async onRequest(request: Request) {
    const { texto } = (await request.json()) as { texto: string };
    // SQLite propia de esta instancia (un cliente = un Durable Object)
    this.sql\`CREATE TABLE IF NOT EXISTS mensajes (rol TEXT, texto TEXT, ts INTEGER)\`;
    this.sql\`INSERT INTO mensajes VALUES ('user', \${texto}, \${Date.now()})\`;
    this.setState({ consultas: this.state.consultas + 1 });   // se sincroniza con clientes conectados
    // Aquí iría el loop del agente: modelo vía AI Gateway, tools MCP, AI Search...
    return Response.json({ ok: true, consultas: this.state.consultas });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    // Enruta /agents/:agente/:instancia al Durable Object correspondiente
    return (await routeAgentRequest(request, env)) || new Response("No encontrado", { status: 404 });
  },
} satisfies ExportedHandler<Env>;`

/** Configuración de Wrangler: binding del Durable Object y migración SQLite (no está en la página). */
const WRANGLER = `{
  "name": "soporte-edge",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-01",
  "durable_objects": {
    "bindings": [{ "name": "SoporteAgent", "class_name": "SoporteAgent" }]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["SoporteAgent"] }
  ],
  "ai": { "binding": "AI" },
  "vars": { "GATEWAY_ID": "soporte-gw" }
}`

/** Llamadas al modelo vía AI Gateway (no está en la página; sigue el patrón descrito en ella). */
const MODELO_TS = `import { AwsClient } from "aws4fetch";

// 1) Intención: modelo abierto en Workers AI, pasando por AI Gateway
export async function clasificar(env: Env, texto: string) {
  return env.AI.run("@cf/meta/llama-3.1-8b-instruct",
    { messages: [{ role: "user", content: \`Clasifica la intención: \${texto}\` }] },
    { gateway: { id: env.GATEWAY_ID } });
}

// 2) Respuesta compleja: Claude en Bedrock, también vía AI Gateway
export async function responder(env: Env, body: string) {
  const modelo = "global.anthropic.claude-sonnet-5-5";
  const aws = new AwsClient({ accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY, region: "us-east-1", service: "bedrock" });
  // Se firma con SigV4 contra la URL ORIGINAL de AWS...
  const original = \`https://bedrock-runtime.us-east-1.amazonaws.com/model/\${modelo}/converse\`;
  const firmada = await aws.sign(original, { method: "POST", body,
    headers: { "Content-Type": "application/json" } });
  // ...y se envía a la URL del gateway con esos mismos headers
  const viaGateway = \`https://gateway.ai.cloudflare.com/v1/\${env.ACCOUNT_ID}/\${env.GATEWAY_ID}\` +
    \`/aws-bedrock/bedrock-runtime/us-east-1/model/\${modelo}/converse\`;
  return fetch(viaGateway, { method: "POST", headers: firmada.headers, body });
}`

/* ------------------------------------------------------------------ */
/* 1. Hosted agent en Foundry                                          */
/* ------------------------------------------------------------------ */

const PREGUNTA_GASTO = '¿Puedo aprobar este gasto de viaje de 1.800 USD? Es hotel + vuelo a Bogotá para la feria de noviembre.'

export const foundryHostedAgent: IsoSpec = {
  id: 'foundry-hosted-agent',
  title: 'Hosted agent en Microsoft Foundry',
  summary:
    'Un **hosted agent** es tu código (Agent Framework, LangGraph, Claude Agent SDK…) empaquetado como contenedor. Foundry le asigna un **endpoint** con varios protocolos, una **identidad Entra** propia y un **sandbox aislado por sesión**; las herramientas llegan por un único **Toolbox MCP endpoint**. El código es `agente_gastos.py` del artículo y un cliente MCP ilustrativo para el Toolbox; los payloads están en **forma simplificada**.',
  height: 490,
  zones: [{ id: 'foundry', label: 'Proyecto de Microsoft Foundry', from: [1.6, -4.9], to: [11.2, 4.9], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Teams / M365', sub: 'o app propia', at: [-1.4, 0], shape: 'person', tone: 'user', icon: 'users', info: 'Un ejecutivo de finanzas conversa con el agente desde Teams o Microsoft 365 Copilot; una app interna puede llamar al mismo agente por API.' },
    { id: 'endpoint', label: 'Endpoint', at: [2.9, 0], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Endpoint dedicado por agente con los protocolos declarados: **Responses** (compatible OpenAI), **Invocations** (payload libre, webhooks, AG-UI), Invocations WebSocket y **A2A v1.0** (GA). Activity se puentea automáticamente al publicar en Teams/M365.' },
    { id: 'entra', label: 'Entra Agent ID', at: [2.9, -3.4], shape: 'box', tone: 'guard', icon: 'key', info: 'Cada hosted agent recibe automáticamente una identidad Microsoft Entra dedicada. Con usuario presente se admite On-Behalf-Of; en tareas autónomas actúa con su propia identidad. Los permisos se asignan con RBAC.' },
    { id: 'sandbox', label: 'Hosted agent', sub: 'sandbox', at: [6.4, 0], shape: 'tall', tone: 'agent', icon: 'cpu', info: 'Tu contenedor corre en un sandbox aislado por VM para cada sesión, con `$HOME` y `/files` persistentes. Escala a cero tras el idle timeout (2-240 min, 15 por defecto) y restaura el estado al volver.' },
    { id: 'model', label: 'Foundry Models', sub: 'GPT · Claude', at: [6.4, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'El agente llama a los modelos del catálogo a través del endpoint del proyecto. Claude está disponible alojado en Azure o en infraestructura de Anthropic, **sin filtro de contenido por defecto**: añade el tuyo.' },
    { id: 'state', label: 'Estado de sesión', sub: '$HOME · state store', at: [6.4, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Conversaciones persistidas por Foundry, archivos de sesión y un *state store* clave-valor para checkpoints de LangGraph o Agent Framework.' },
    { id: 'toolbox', label: 'Toolbox', sub: 'endpoint MCP', at: [9.8, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Agrupa herramientas (web search, file search, code interpreter, Azure AI Search, OpenAPI, MCP, A2A) tras **un único endpoint MCP** con autenticación, gobierno y versionado centralizados.' },
    { id: 'insights', label: 'App Insights', sub: 'trazas OTel · evals', at: [9.8, 3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'Foundry inyecta la cadena de conexión de Application Insights; las librerías de protocolo emiten trazas OpenTelemetry por defecto.' },
    { id: 'search', label: 'Azure AI Search', sub: 'políticas internas', at: [13.2, -1.7], shape: 'stack', tone: 'data', icon: 'search', info: 'Índice híbrido con semantic ranker sobre las políticas de gastos y viajes.' },
    { id: 'erp', label: 'ERP / SharePoint', sub: 'vía MCP u OpenAPI', at: [13.2, 1.7], shape: 'box', tone: 'tool', icon: 'server', info: 'Sistemas internos expuestos como herramientas; el Toolbox usa la identidad del agente o el token del usuario (OBO).' },
  ],
  edges: [
    { from: 'user', to: 'endpoint' },
    { from: 'endpoint', to: 'entra', dashed: true },
    { from: 'endpoint', to: 'sandbox' },
    { from: 'sandbox', to: 'model' },
    { from: 'sandbox', to: 'state' },
    { from: 'sandbox', to: 'toolbox', label: 'MCP' },
    { from: 'sandbox', to: 'insights', route: 'x', dashed: true },
    { from: 'toolbox', to: 'search', route: 'z' },
    { from: 'toolbox', to: 'erp', route: 'z' },
  ],
  code: {
    agent: { title: 'agente_gastos.py', lang: 'python', source: GASTOS },
    toolbox: { title: 'toolbox.py (ilustrativo)', lang: 'python', source: TOOLBOX },
  },
  steps: [
    {
      title: '1 · Petición desde Teams',
      body: 'El usuario pregunta en Teams. La plataforma traduce el protocolo **Activity** de Teams a **Responses** (compatible OpenAI) y autentica con Entra ID. Una app propia enviaría directamente esta request al endpoint del agente.',
      flows: ['user>endpoint: Activity → Responses'],
      data: {
        title: 'request Responses al hosted agent (forma simplificada)',
        lang: 'http',
        content: `POST /responses HTTP/1.1
Host: <endpoint del hosted agent>
Authorization: Bearer eyJ0eXAiOiJKV1Qi…   ← token Entra del usuario
Content-Type: application/json

${json({ input: [{ role: 'user', content: PREGUNTA_GASTO }], conversation: 'conv_7Hq2c…' })}`,
        hl: ['POST /responses', '"conversation"'],
      },
    },
    {
      title: '2 · Identidad del agente',
      body: 'El agente actúa con su **Entra Agent ID**; como hay usuario presente, usa **On-Behalf-Of** para consultar el presupuesto con los permisos del ejecutivo, no con privilegios propios amplios. En el código, la credencial se resuelve sola: no hay secretos.',
      flows: ['endpoint>entra: OBO'],
      focus: ['endpoint', 'entra'],
      data: {
        title: 'claims del token OBO hacia el ERP (decodificado, ilustrativo)',
        lang: 'json',
        content: json({
          aud: 'api://erp-finanzas',
          scp: 'Budget.Read',
          oid: '5f1c…-ejecutivo',
          azp: '9a7e…-AsistenteGastos',
          exp: 1794579420,
        }),
        hl: ['"aud"', '"scp"', '"azp"'],
      },
      code: { file: 'agent', hl: ['from azure.identity import AzureCliCredential', 'credential=AzureCliCredential()'] },
    },
    {
      title: '3 · Sandbox de la sesión',
      body: 'Foundry enruta al **sandbox de esa sesión** (o crea uno) y restaura `$HOME`, `/files` y el historial de la conversación. Si estuvo inactivo más del idle timeout, escaló a cero y ahora vuelve con el estado intacto.',
      flows: ['endpoint>sandbox', 'state>sandbox'],
      data: {
        title: 'estado restaurado (ilustrativo)',
        lang: 'json',
        content: json({
          sesion: 'sess_91d2…',
          aislamiento: 'VM por sesión',
          restaurado: { home: '$HOME', archivos: ['/files/recibos/hotel-bogota.pdf', '/files/recibos/vuelo-LA4512.pdf'], conversacion: 'conv_7Hq2c… (4 turnos)' },
          idle_timeout_min: 15,
        }),
        hl: ['"aislamiento"', '"idle_timeout_min"'],
      },
    },
    {
      title: '4 · Modelo',
      body: 'Tu código (aquí Microsoft Agent Framework) llama a un modelo del catálogo vía el **endpoint del proyecto**: `model` es el nombre de tu deployment (GPT o Claude según la tarea). Las instrucciones fijan el límite: **recomienda, nunca aprueba**.',
      flows: ['sandbox>model', 'model>sandbox'],
      data: {
        title: 'llamada al modelo del proyecto (forma simplificada)',
        lang: 'json',
        content: json({
          model: 'gpt-5.4-mini',
          instructions: 'Ayudas a validar gastos de viaje contra la política corporativa. Cita la sección de la política y nunca apruebes: solo recomiendas.',
          input: [{ role: 'user', content: PREGUNTA_GASTO }],
          tools: [{ type: 'mcp', server_label: 'toolbox_finanzas' }],
        }),
        hl: ['"model": "gpt-5.4-mini"', '"instructions"'],
      },
      code: { file: 'agent', hl: ['client=FoundryChatClient(', 'project_endpoint=', 'model="gpt-5.4-mini"', 'nunca apruebes: solo recomiendas'] },
    },
    {
      title: '5 · Herramientas vía Toolbox',
      body: 'El agente usa el **Toolbox MCP endpoint**: un solo servidor MCP que expone Azure AI Search (política de viajes) y el ERP (presupuesto del centro de costo). Creas una versión nueva del Toolbox y la promueves a *default* sin tocar el agente.',
      flows: ['sandbox>toolbox: tools/call', 'toolbox>search', 'toolbox>erp'],
      data: {
        title: 'tools/call al Toolbox (nombres ilustrativos)',
        lang: 'json',
        content: json({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'buscar_politica_viajes', arguments: { consulta: 'tope hotel por noche Bogotá', pais: 'CO' } } }),
        hl: ['"method": "tools/call"', '"buscar_politica_viajes"'],
      },
      code: { file: 'toolbox', hl: ['toolbox = MCPStreamableHTTPTool(', 'url=os.environ["TOOLBOX_MCP_URL"]', 'headers={"Authorization"'] },
    },
    {
      title: '6 · Respuesta y observabilidad',
      body: 'La respuesta vuelve a Teams. Las trazas OTel van a Application Insights con atributos `gen_ai.*`; tras el idle timeout el sandbox se apaga y el estado queda persistido.',
      flows: ['sandbox>endpoint', 'endpoint>user', 'sandbox>insights: spans'],
      data: {
        title: 'span del turno (forma simplificada)',
        lang: 'json',
        content: json({
          name: 'invoke_agent AsistenteGastos',
          attributes: {
            'gen_ai.operation.name': 'invoke_agent',
            'gen_ai.agent.name': 'AsistenteGastos',
            'gen_ai.request.model': 'gpt-5.4-mini',
            'gen_ai.conversation.id': 'conv_7Hq2c…',
          },
          respuesta: 'Recomiendo no aprobarlo tal cual: la sección 4.2 fija un tope de 220 USD/noche en Bogotá y el hotel suma 280. El vuelo cumple. Sugiero aprobar con el hotel ajustado al tope.',
        }),
        hl: ['"gen_ai.agent.name"', '"respuesta"'],
      },
      code: { file: 'agent', hl: ['await agent.run('] },
    },
  ],
}

/* ------------------------------------------------------------------ */
/* 2. Agente en el edge con Cloudflare                                 */
/* ------------------------------------------------------------------ */

export const cloudflareEdgeAgent: IsoSpec = {
  id: 'cloudflare-edge-agent',
  title: 'Agente en el edge con Cloudflare',
  summary:
    'Con el **Agents SDK**, cada agente es un **Durable Object**: una instancia con identidad propia (p. ej. una por cliente), SQL local, WebSockets y scheduler. Los modelos se llaman a través de **AI Gateway** (Workers AI o Bedrock), el conocimiento viene de **AI Search** y las herramientas de servidores **MCP remotos** en Workers. El código es el `src/index.ts` del artículo más dos archivos ilustrativos (`wrangler.jsonc` y `modelo.ts`) que siguen lo que la página describe.',
  height: 480,
  nodes: [
    { id: 'user', label: 'Cliente', sub: 'web · móvil', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Un cliente de una tienda online abre el chat de soporte. La conexión WebSocket termina en la ubicación de Cloudflare más cercana.' },
    { id: 'worker', label: 'Worker', sub: 'routeAgentRequest', at: [3.2, 0], shape: 'box', tone: 'infra', icon: 'zap', info: 'El Worker de entrada autentica y enruta `/agents/:agente/:instancia` al Durable Object correcto con `routeAgentRequest`.' },
    { id: 'agent', label: 'Agent (DO)', sub: 'una instancia por cliente', at: [6.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Clase que extiende `Agent`: un Durable Object con identidad durable. Mantiene el estado (`setState`), WebSockets, tareas programadas y el loop del agente.' },
    { id: 'sql', label: 'SQLite del DO', sub: 'estado + historial', at: [6.4, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Cada instancia tiene su propia base SQL (`this.sql`): historial, preferencias, carrito. Aislamiento por diseño entre clientes.' },
    { id: 'aigw', label: 'AI Gateway', sub: 'caché · fallback · logs', at: [9.6, -3.4], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Proxy hacia más de 20 proveedores: analítica, logs, caché, rate limiting, reintentos y fallback entre modelos, incluido Amazon Bedrock.' },
    { id: 'wai', label: 'Workers AI', sub: 'modelos abiertos', at: [13, -4.9], shape: 'sphere', tone: 'model', icon: 'cpu', info: 'Inferencia serverless de modelos abiertos en la red de Cloudflare: barata y cercana al usuario para clasificación o respuestas simples.' },
    { id: 'bedrock', label: 'Amazon Bedrock', sub: 'Claude vía perfil', at: [13, -2.1], shape: 'cloud', tone: 'model', icon: 'cloud', info: 'Para razonamiento complejo, AI Gateway reenvía a Bedrock (`.../aws-bedrock/bedrock-runtime/us-east-1/`), con la petición firmada con SigV4 contra la URL original de AWS.' },
    { id: 'mcp', label: 'MCP remoto', sub: 'Worker + OAuth', at: [9.6, 0], shape: 'box', tone: 'protocol', icon: 'plug', info: 'Servidor MCP en Workers sobre Streamable HTTP, protegido con OAuth (`createMcpHandler` + `OAuthResourceServer`). Envuelve la API de pedidos; las tools leen el usuario con `getMcpAuthContext()`.' },
    { id: 'api', label: 'API de pedidos', sub: 'origen', at: [13, 1.3], shape: 'box', tone: 'tool', icon: 'server', info: 'Backend existente (en AWS, por ejemplo) al que solo accede el servidor MCP.' },
    { id: 'aisearch', label: 'AI Search', sub: 'híbrido · MCP', at: [9.6, 3.4], shape: 'stack', tone: 'data', icon: 'search', info: 'Búsqueda gestionada (ex AutoRAG, GA 01-10-2026): indexación continua, híbrida por defecto y un endpoint MCP por instancia.' },
  ],
  edges: [
    { from: 'user', to: 'worker', label: 'WebSocket' },
    { from: 'worker', to: 'agent' },
    { from: 'agent', to: 'sql' },
    { from: 'agent', to: 'aigw', route: 'z' },
    { from: 'aigw', to: 'wai', route: 'z' },
    { from: 'aigw', to: 'bedrock', route: 'z' },
    { from: 'agent', to: 'mcp' },
    { from: 'mcp', to: 'api', route: 'z' },
    { from: 'agent', to: 'aisearch', route: 'z' },
  ],
  code: {
    index: { title: 'src/index.ts', lang: 'ts', source: INDEX_TS },
    wrangler: { title: 'wrangler.jsonc (ilustrativo)', lang: 'json', source: WRANGLER },
    modelo: { title: 'src/modelo.ts (ilustrativo)', lang: 'ts', source: MODELO_TS },
  },
  steps: [
    {
      title: '1 · Conexión al edge',
      body: 'El cliente abre un WebSocket. El Worker de entrada valida la sesión y `routeAgentRequest` enruta `/agents/:agente/:instancia` al Durable Object correcto (el segmento `:agente` es el nombre de la clase en kebab-case: `SoporteAgent` → `soporte-agent`).',
      flows: ['user>worker: WebSocket', 'worker>agent'],
      data: {
        title: 'upgrade a WebSocket',
        lang: 'http',
        content: `GET /agents/soporte-agent/cliente-8812 HTTP/1.1
Host: soporte.tienda.cl
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Version: 13
Cookie: session=…`,
        hl: ['/agents/soporte-agent/cliente-8812', 'Upgrade: websocket'],
      },
      code: { file: 'index', hl: ['Enruta /agents/:agente/:instancia', 'routeAgentRequest(request, env)'] },
    },
    {
      title: '2 · Instancia por cliente',
      body: 'Ese nombre identifica **un Durable Object único** en el mundo: si no existe se crea; si existe, recupera su estado e historial de **su propia** SQLite. Para eso Wrangler declara el binding de la clase y una migración `new_sqlite_classes`.',
      flows: ['sql>agent'],
      focus: ['agent', 'sql'],
      data: {
        title: 'estado e historial de la instancia cliente-8812',
        lang: 'json',
        content: json({
          state: { consultas: 3 },
          'SELECT * FROM mensajes': [
            { rol: 'user', texto: 'Hola, mi pedido A-55120 no llega', ts: 1794570012000 },
            { rol: 'assistant', texto: 'Lo reviso: salió de bodega ayer.', ts: 1794570015000 },
          ],
        }),
        hl: ['"consultas": 3', 'SELECT * FROM mensajes'],
      },
      code: { file: 'wrangler', hl: ['"durable_objects"', '"class_name": "SoporteAgent"', '"new_sqlite_classes"'] },
    },
    {
      title: '3 · Modelo vía AI Gateway',
      body: 'Clasificar la intención va a un modelo abierto en **Workers AI** (binding `env.AI` con `gateway`); la respuesta compleja va a **Claude en Bedrock**: se firma con SigV4 contra la URL original de AWS y se envía a la URL del gateway. AI Gateway registra costo, cachea (header `cf-aig-cache-status`) y hace fallback.',
      flows: ['agent>aigw', 'aigw>wai: clasificar', 'aigw>bedrock: converse'],
      data: {
        title: 'petición a Bedrock a través de AI Gateway',
        lang: 'http',
        content: `POST /v1/{account_id}/soporte-gw/aws-bedrock/bedrock-runtime/us-east-1/model/global.anthropic.claude-sonnet-5-5/converse HTTP/1.1
Host: gateway.ai.cloudflare.com
Authorization: AWS4-HMAC-SHA256 Credential=AKIA…/20261107/us-east-1/bedrock/aws4_request, …
X-Amz-Date: 20261107T153012Z
Content-Type: application/json

${json({ messages: [{ role: 'user', content: [{ text: 'Mi pedido A-55120 no llega, ¿puedo cambiar la dirección?' }] }], inferenceConfig: { maxTokens: 512 } })}`,
        hl: ['/aws-bedrock/bedrock-runtime/us-east-1/', 'AWS4-HMAC-SHA256'],
      },
      code: { file: 'modelo', hl: ['env.AI.run("@cf/meta/llama-3.1-8b-instruct"', '{ gateway: { id: env.GATEWAY_ID } }', 'aws.sign(original', 'gateway.ai.cloudflare.com'] },
    },
    {
      title: '4 · Conocimiento',
      body: 'Para la política de cambios y garantías, el agente consulta **AI Search** (búsqueda híbrida sobre el centro de ayuda, indexado de forma continua). También podría hacerlo por el endpoint MCP de la instancia.',
      flows: ['agent>aisearch', 'aisearch>agent'],
      data: {
        title: 'resultado de AI Search (forma simplificada)',
        lang: 'json',
        content: json({
          query: 'cambiar dirección de entrega pedido en tránsito',
          results: [{ filename: 'ayuda/envios/cambio-direccion.md', score: 0.82, text: 'Puedes cambiar la dirección mientras el pedido no esté "en reparto"…' }],
        }),
        hl: ['"filename"', '"score"'],
      },
    },
    {
      title: '5 · Herramientas MCP',
      body: 'Para ver el pedido, el agente llama al **servidor MCP remoto** con un token OAuth (con scopes por operación). El servidor valida el token, identifica al usuario con `getMcpAuthContext()` y consulta la API de pedidos de origen con su propia credencial.',
      flows: ['agent>mcp: tools/call', 'mcp>api', 'api>mcp', 'mcp>agent'],
      data: {
        title: 'tools/call al MCP remoto',
        lang: 'http',
        content: `POST /mcp HTTP/1.1
Host: mcp-pedidos.tienda.workers.dev
Authorization: Bearer eyJhbGciOi…   ← token OAuth con scope orders:read
Content-Type: application/json

${json({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_order', arguments: { order_id: 'A-55120' } } })}`,
        hl: ['Authorization: Bearer', '"method": "tools/call"'],
      },
    },
    {
      title: '6 · Respuesta y seguimiento',
      body: 'La respuesta se transmite por el WebSocket; el turno se guarda en SQLite y `setState` sincroniza el estado con los clientes conectados. El agente puede además **programar** un recordatorio ("avisarte cuando el pedido salga a reparto") con su scheduler.',
      flows: ['agent>worker', 'worker>user', 'agent>sql'],
      data: {
        title: 'lo que queda tras el turno (ilustrativo)',
        lang: 'json',
        content: json({
          respuesta_ws: 'Tu pedido A-55120 sigue en bodega de tránsito, así que aún puedes cambiar la dirección. ¿Cuál es la nueva?',
          state: { consultas: 4 },
          tarea_programada: { cuando: '2026-11-08T09:00:00-03:00', metodo: 'avisarReparto', datos: { order_id: 'A-55120' } },
        }),
        hl: ['"consultas": 4', '"tarea_programada"'],
      },
      code: { file: 'index', hl: ['this.sql`INSERT INTO mensajes', 'this.setState({ consultas', 'return Response.json'] },
    },
  ],
}
