import type { ApiMessage, IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* -------------------------------------------------------------------------- */
/* Arquitectura y flujo de una llamada                                         */
/* -------------------------------------------------------------------------- */

/** Mismo código que el bloque `server.py` del artículo. */
const SERVER_PY = `# pip install "mcp[cli]"   (SDK v2, Python 3.11+)
from mcp.server import MCPServer

mcp = MCPServer("pedidos-retail")

@mcp.tool()
def get_order_status(order_id: str) -> dict:
    """Devuelve el estado logístico de un pedido.

    Args:
        order_id: Identificador del pedido, p. ej. "4512".
    """
    # En producción: consulta al OMS con la credencial del servidor, no del usuario.
    return {"order_id": order_id, "status": "en_transito", "eta": "2026-11-04"}

@mcp.resource("policy://devoluciones/{country}")
def return_policy(country: str) -> str:
    """Política de devoluciones vigente por país (CL, PE, CO)."""
    return f"Política de devoluciones {country.upper()}: 30 días con boleta..."

@mcp.prompt()
def resumir_reclamo(ticket_id: str) -> str:
    """Plantilla para resumir un reclamo antes de escalarlo."""
    return f"Resume el reclamo {ticket_id}: causa, impacto y acción sugerida."

if __name__ == "__main__":
    # Local: transport="stdio". Remoto: Streamable HTTP en /mcp.
    mcp.run(transport="streamable-http", host="0.0.0.0", port=8000)`

/** Mismo código que el bloque `strands_mcp.py` del artículo. */
const STRANDS_PY = `from mcp import stdio_client, StdioServerParameters
from strands import Agent
from strands.tools.mcp import MCPClient

pedidos = MCPClient(
    lambda: stdio_client(StdioServerParameters(command="python", args=["server.py"])),
    tool_filters={"allowed": ["get_order_status"]},
    prefix="pedidos",                    # evita choques de nombres entre servidores
)

agent = Agent(
    model="global.anthropic.claude-sonnet-5-5",   # perfil de inferencia de Bedrock
    system_prompt="Resuelves dudas de pedidos. No inventes datos.",
    tools=[pedidos],                     # Strands gestiona el ciclo de vida del cliente
)
agent("¿Dónde está el pedido 4512?")`

const META = { protocolVersion: '2026-07-28', clientInfo: { name: 'soporte-agent', version: '1.3.0' }, capabilities: { elicitation: {} } }

const Q_MCP = '¿Dónde está el pedido 4512? Si viene atrasado, abre un ticket.'
const M_Q: ApiMessage = { role: 'user', content: Q_MCP }
const M_T1: ApiMessage = {
  role: 'assistant',
  note: 'llamada 1',
  content: [
    { type: 'text', text: 'Consulto el estado del pedido.' },
    { type: 'tool_use', id: 'toolu_01', name: 'get_order_status', input: { order_id: '4512' } },
  ],
}
const M_R1: ApiMessage = {
  role: 'user',
  note: 'resultado (servidor local)',
  content: [{ type: 'tool_result', tool_use_id: 'toolu_01', content: { order_id: '4512', status: 'en_transito', eta: '2026-11-04' } }],
}
const M_T2: ApiMessage = {
  role: 'assistant',
  note: 'llamada 2',
  content: [
    { type: 'text', text: 'La ETA (4 de noviembre) ya venció: abro un ticket.' },
    { type: 'tool_use', id: 'toolu_02', name: 'create_ticket', input: { order_id: '4512', summary: 'Pedido 4512 en tránsito con ETA 2026-11-04 vencida' } },
  ],
}

const HTTP_CALL = [
  'POST /mcp HTTP/1.1',
  'Host: mcp.tickets.interno',
  'Authorization: Bearer eyJhbGciOiJSUzI1NiIs…',
  'Content-Type: application/json',
  'Accept: application/json, text/event-stream',
  'Mcp-Method: tools/call',
  'Mcp-Name: create_ticket',
  '',
  json({
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'create_ticket', arguments: { order_id: '4512', summary: 'Pedido 4512 en tránsito con ETA 2026-11-04 vencida' }, _meta: META },
  }),
].join('\n')

export const mcpArquitectura: IsoSpec = {
  id: 'mcp-arquitectura',
  title: 'Arquitectura MCP y flujo de una llamada (spec 2026-07-28)',
  summary:
    'Un **host** (IDE, chat corporativo o tu agente) crea **un cliente MCP por servidor**. Aquí el agente de soporte tiene dos: uno **local por stdio** que lanza `server.py` (pedidos) como subproceso, y uno **remoto por Streamable HTTP** hacia el servidor de tickets. Desde la versión `2026-07-28` el protocolo es **stateless**: no hay handshake `initialize` ni sesión; cada request se describe a sí misma. En Datos ves cada mensaje JSON-RPC; en Código, `server.py` y `strands_mcp.py` del artículo.',
  height: 500,
  zones: [{ id: 'host', label: 'Proceso host', from: [-1.4, -5], to: [4.8, 3.2], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Usuario', at: [-4.2, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Ejecutivo de soporte: "¿Dónde está el pedido 4512? Si viene atrasado, abre un ticket".' },
    { id: 'host', label: 'Host', sub: 'Strands · IDE · chat', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'La aplicación con el LLM. Decide qué servidores conectar, muestra consentimientos y aplica políticas. Contiene uno o más clientes MCP.' },
    { id: 'llm', label: 'LLM', sub: 'elige herramientas', at: [0, -3.6], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Ve las definiciones de tools que el host le pasa y decide cuál invocar. No habla MCP: el host traduce `inputSchema` al formato de su API.' },
    { id: 'c1', label: 'Cliente MCP A', sub: 'stdio', at: [3.4, -1.7], shape: 'box', tone: 'protocol', icon: 'plug', info: 'Conector 1:1 con un servidor local. Lanza `python server.py` como subproceso y habla JSON-RPC por stdin/stdout, una línea por mensaje.' },
    { id: 'c2', label: 'Cliente MCP B', sub: 'Streamable HTTP', at: [3.4, 1.7], shape: 'box', tone: 'protocol', icon: 'plug', info: 'Conector 1:1 con un servidor remoto. Cada request es un POST HTTP con headers `Mcp-Method` y `Mcp-Name` y un token OAuth.' },
    { id: 's1', label: 'Servidor local', sub: 'pedidos-retail (stdio)', at: [7.2, -1.7], shape: 'tall', tone: 'tool', icon: 'terminal', info: 'El `server.py` del artículo, corriendo en la máquina del host con sus credenciales. Riesgo: un servidor local malicioso tiene el mismo acceso que el usuario.' },
    { id: 's2', label: 'Servidor remoto', sub: 'tickets (HTTP)', at: [7.2, 1.7], shape: 'tall', tone: 'tool', icon: 'server', info: 'Servicio HTTP desplegado por TI (o un SaaS). Al ser stateless, cualquier réplica detrás de un balanceador puede atender cualquier request.' },
    { id: 'api', label: 'API de tickets', sub: 'mesa de ayuda', at: [10.6, 1.7], shape: 'cloud', tone: 'neutral', icon: 'cloud', info: 'El sistema real. El servidor MCP lo llama con **su propia** credencial (o un token obtenido por on-behalf-of), nunca reenviando el token del cliente.' },
  ],
  edges: [
    { from: 'user', to: 'host' },
    { from: 'host', to: 'llm' },
    { from: 'host', to: 'c1', route: 'z' },
    { from: 'host', to: 'c2', route: 'z' },
    { from: 'c1', to: 's1', label: 'JSON-RPC' },
    { from: 'c2', to: 's2', label: 'HTTPS' },
    { from: 's2', to: 'api' },
  ],
  code: {
    server: { title: 'server.py', lang: 'python', source: SERVER_PY },
    host: { title: 'strands_mcp.py', lang: 'python', source: STRANDS_PY },
  },
  steps: [
    {
      title: '1 · Un cliente por servidor',
      body: 'El host crea un cliente MCP para cada servidor configurado. El de pedidos es **local**: el cliente lanza `python server.py` como subproceso (stdio). El de tickets es **remoto**: una URL HTTPS y un token OAuth.',
      flows: ['host>c1', 'host>c2'],
      data: {
        title: 'servidores configurados en el host (forma típica)',
        lang: 'json',
        content: json({
          pedidos: { transport: 'stdio', command: 'python', args: ['server.py'], allowed_tools: ['get_order_status'] },
          tickets: { transport: 'streamable-http', url: 'https://mcp.tickets.interno/mcp', auth: 'oauth2' },
        }),
        hl: ['"transport": "stdio"', '"transport": "streamable-http"'],
      },
      code: { file: 'host', hl: ['pedidos = MCPClient(', 'StdioServerParameters(command="python", args=["server.py"])', 'tool_filters='] },
    },
    {
      title: '2 · Descubrimiento',
      body: 'Sin handshake: cada cliente llama `server/discover` para conocer versión, capacidades e identidad del servidor. Cada request posterior lleva en `_meta` la versión del protocolo, las capacidades y `clientInfo`, así que ninguna depende de una sesión.',
      flows: ['c1>s1', 's1>c1', 'c2>s2', 's2>c2'],
      data: {
        title: 'server/discover · respuesta de pedidos-retail (forma simplificada)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 1,
          result: {
            protocolVersion: '2026-07-28',
            capabilities: { tools: { listChanged: true }, resources: {}, prompts: {} },
            serverInfo: { name: 'pedidos-retail', version: '1.4.0' },
          },
        }),
        hl: ['"protocolVersion"', '"capabilities"', '"serverInfo"'],
      },
      code: { file: 'server', hl: ['mcp = MCPServer("pedidos-retail")'] },
    },
    {
      title: '3 · Listar herramientas',
      body: '`tools/list` devuelve nombre, descripción y JSON Schema de cada tool. El SDK los genera desde la firma y el docstring de la función. La lista viene en **orden determinista** y con `ttlMs` para cachearla (bueno para el prompt caching).',
      flows: ['c1>s1', 'c2>s2'],
      data: {
        title: 'tools/list · respuesta de pedidos-retail',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 2,
          result: {
            tools: [
              {
                name: 'get_order_status',
                description: 'Devuelve el estado logístico de un pedido.',
                inputSchema: { type: 'object', properties: { order_id: { type: 'string', description: 'Identificador del pedido, p. ej. "4512".' } }, required: ['order_id'] },
              },
            ],
            ttlMs: 300000,
          },
        }),
        hl: ['"name"', '"inputSchema"', '"ttlMs"'],
      },
      code: { file: 'server', hl: ['@mcp.tool()', 'def get_order_status(order_id: str) -> dict:', 'Devuelve el estado logístico'] },
    },
    {
      title: '4 · El modelo elige',
      body: 'El host traduce las tools de ambos servidores al formato de su API y se las pasa al LLM junto con la pregunta. El modelo responde con un `tool_use`: es una **solicitud**, el host decide a qué cliente enviarla.',
      flows: ['user>host', 'host>llm', 'llm>host'],
      data: { title: 'messages', messages: [M_Q, M_T1], newFrom: 0, hl: [1] },
      code: { file: 'host', hl: ['agent = Agent(', 'tools=[pedidos]', 'agent("¿Dónde está el pedido 4512?")'] },
    },
    {
      title: '5 · tools/call local',
      body: 'El cliente A escribe la request en el **stdin** del subproceso (una línea = un mensaje) y lee la respuesta de su **stdout**. No hay red ni OAuth: el servidor usa las credenciales del entorno.',
      flows: ['c1>s1', 's1>c1'],
      data: {
        title: 'stdio · lo que viaja por las tuberías',
        lang: 'text',
        content: [
          '# host → stdin del subproceso',
          JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_order_status', arguments: { order_id: '4512' }, _meta: { protocolVersion: '2026-07-28' } } }),
          '',
          '# stdout del subproceso → host',
          JSON.stringify({ jsonrpc: '2.0', id: 3, result: { content: [{ type: 'text', text: '{"order_id":"4512","status":"en_transito","eta":"2026-11-04"}' }], structuredContent: { order_id: '4512', status: 'en_transito', eta: '2026-11-04' }, isError: false } }),
        ].join('\n'),
        hl: ['"method":"tools/call"', '"structuredContent"'],
      },
      code: { file: 'server', hl: ['return {"order_id": order_id, "status": "en_transito"', 'Local: transport="stdio"'] },
    },
    {
      title: '6 · tools/call remoto',
      body: 'Con el resultado, el modelo pide `create_ticket`. El cliente B hace `POST /mcp` con `Mcp-Method: tools/call` y `Mcp-Name: create_ticket`: un gateway puede enrutar y aplicar políticas **sin parsear el body**. El `_meta` reemplaza a la antigua sesión.',
      flows: ['llm>host', 'c2>s2'],
      data: { title: 'request HTTP del cliente B', lang: 'http', content: HTTP_CALL, hl: ['Mcp-Method: tools/call', 'Mcp-Name: create_ticket', 'Authorization: Bearer', '"_meta"'] },
    },
    {
      title: '7 · El servidor actúa',
      body: 'El servidor valida el token (firma, emisor, **audiencia** = este servidor), llama a la API de tickets con **su propia** credencial y responde con el mismo `id` de la request. El token del cliente nunca sale del servidor MCP.',
      flows: ['s2>api', 'api>s2', 's2>c2'],
      data: {
        title: 'respuesta JSON-RPC del servidor de tickets',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 7,
          result: {
            content: [{ type: 'text', text: 'Ticket SOP-7731 creado para el pedido 4512.' }],
            structuredContent: { ticket_id: 'SOP-7731', status: 'abierto', queue: 'courier' },
            isError: false,
          },
        }),
        hl: ['"id": 7', '"structuredContent"', '"isError"'],
      },
    },
    {
      title: '8 · De vuelta al modelo',
      body: 'El host convierte cada resultado MCP en un `tool_result` enlazado por `tool_use_id` y vuelve a llamar al modelo, que redacta la respuesta final. Dos servidores, dos transportes, una sola conversación: el modelo nunca supo cuál tool era local y cuál remota.',
      flows: ['c2>host', 'host>llm', 'host>user'],
      data: {
        title: 'messages',
        messages: [
          M_Q,
          M_T1,
          M_R1,
          M_T2,
          { role: 'user', note: 'resultado (servidor remoto)', content: [{ type: 'tool_result', tool_use_id: 'toolu_02', content: { ticket_id: 'SOP-7731', status: 'abierto', queue: 'courier' } }] },
          { role: 'assistant', note: 'end_turn', content: 'El pedido 4512 sigue en tránsito y su entrega estimada (4 de noviembre) ya venció. Abrí el ticket SOP-7731 con el courier.' },
        ],
        newFrom: 2,
        hl: [4, 5],
      },
      code: { file: 'host', hl: ['# Strands gestiona el ciclo de vida del cliente', 'agent("¿Dónde está el pedido 4512?")'] },
    },
  ],
}

/* -------------------------------------------------------------------------- */
/* OAuth                                                                       */
/* -------------------------------------------------------------------------- */

const AUTH_SERVER = `# auth.py del servidor MCP de tickets (ilustrativo)
import jwt                                    # PyJWT
from jwt import PyJWKClient

RESOURCE = "https://mcp.tickets.interno"
ISSUER = "https://login.retailandino.com"
jwks = PyJWKClient(f"{ISSUER}/.well-known/jwks.json")

def protected_resource_metadata() -> dict:    # GET /.well-known/oauth-protected-resource
    return {"resource": RESOURCE, "authorization_servers": [ISSUER],
            "scopes_supported": ["tickets.read", "tickets.write"],
            "bearer_methods_supported": ["header"]}

def unauthorized(scope: str | None = None):
    header = f'Bearer resource_metadata="{RESOURCE}/.well-known/oauth-protected-resource"'
    if scope:                                 # step-up: falta un scope
        return 403, {"WWW-Authenticate": f'Bearer error="insufficient_scope", scope="{scope}"'}
    return 401, {"WWW-Authenticate": header}

def validate(authorization: str | None, needed: str) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise Unauthorized(unauthorized())
    token = authorization.removeprefix("Bearer ")
    key = jwks.get_signing_key_from_jwt(token).key
    claims = jwt.decode(token, key, algorithms=["RS256"],
                        audience=RESOURCE, issuer=ISSUER)   # audiencia = ESTE servidor
    if needed not in claims.get("scope", "").split():
        raise Unauthorized(unauthorized(scope=needed))
    return claims

def list_tickets(claims: dict, order_id: str) -> dict:   # tool "list_tickets"
    token = service_token()                   # credencial propia (client credentials u OBO)
    # Nunca: requests.get(..., headers={"Authorization": f"Bearer {token_del_cliente}"})
    return tickets_api.get("/api/v2/tickets", params={"order_id": order_id},
                           token=token, requested_by=claims["sub"])`

const AUTH_CLIENT = `# cliente_oauth.py (ilustrativo): lo que hace el SDK del cliente MCP
import base64, hashlib, secrets, httpx
from urllib.parse import urlencode

CLIENT_ID = "https://app.retailandino.com/oauth/client.json"   # CIMD: el client_id es una URL
REDIRECT = "https://app.retailandino.com/oauth/callback"
RESOURCE = "https://mcp.tickets.interno"

def discover(www_authenticate: str) -> dict:
    prm_url = www_authenticate.split('resource_metadata="')[1].rstrip('"')
    prm = httpx.get(prm_url).json()                            # RFC 9728
    issuer = prm["authorization_servers"][0]
    return httpx.get(f"{issuer}/.well-known/oauth-authorization-server").json()  # RFC 8414

def authorize_url(as_meta: dict) -> tuple[str, str, str]:
    verifier = secrets.token_urlsafe(64)                       # PKCE
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    state = secrets.token_urlsafe(16)                          # un solo uso
    q = {"response_type": "code", "client_id": CLIENT_ID, "redirect_uri": REDIRECT,
         "code_challenge": challenge, "code_challenge_method": "S256", "state": state,
         "scope": "tickets.read", "resource": RESOURCE}        # RFC 8707
    return f"{as_meta['authorization_endpoint']}?{urlencode(q)}", verifier, state

def exchange(as_meta: dict, params: dict, verifier: str, state: str) -> dict:
    assert params["state"] == state                            # anti-CSRF
    assert params["iss"] == as_meta["issuer"]                  # RFC 9207: anti mix-up
    return httpx.post(as_meta["token_endpoint"], data={
        "grant_type": "authorization_code", "code": params["code"],
        "redirect_uri": REDIRECT, "client_id": CLIENT_ID,
        "code_verifier": verifier, "resource": RESOURCE}).json()`

const PKCE_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'

export const mcpOauth: IsoSpec = {
  id: 'mcp-oauth',
  title: 'Autorización OAuth 2.1 en un servidor MCP remoto',
  summary:
    'El servidor MCP es un **resource server OAuth 2.1**. El cliente descubre al servidor de autorización mediante **Protected Resource Metadata (RFC 9728)**, se identifica con un **Client ID Metadata Document** (CIMD), usa **PKCE** y pide un token con `resource` (RFC 8707) para que la audiencia sea exactamente ese servidor. El diagrama de secuencia muestra cada request HTTP en orden; el código es ilustrativo (lado cliente y lado servidor).',
  height: 480,
  layout: 'sequence',
  lanes: ['user', 'client', 'mcp', 'prm', 'as', 'cimd', 'api'],
  nodes: [
    { id: 'user', label: 'Usuario', sub: 'navegador', at: [-3.4, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Inicia sesión en el IdP corporativo y da consentimiento a los scopes que pide el cliente.' },
    { id: 'client', label: 'Cliente MCP', sub: 'client_id = URL (CIMD)', at: [0, 0], shape: 'box', tone: 'protocol', icon: 'plug', info: 'En vez de registrarse dinámicamente (DCR, deprecado), usa como `client_id` una URL HTTPS que publica sus metadatos: nombre, `redirect_uris`, logo.' },
    { id: 'mcp', label: 'Servidor MCP', sub: 'resource server', at: [3.6, 0], shape: 'tall', tone: 'tool', icon: 'server', info: 'Rechaza requests sin token con `401` y `WWW-Authenticate: Bearer resource_metadata="…"`. Valida firma, `iss`, audiencia, expiración y scopes en cada request.' },
    { id: 'prm', label: 'Metadata PRM', sub: 'RFC 9728', at: [3.6, 3.4], shape: 'doc', tone: 'protocol', icon: 'scroll', info: 'Publicado en `/.well-known/oauth-protected-resource`: indica qué servidores de autorización acepta este recurso y qué scopes soporta.' },
    { id: 'as', label: 'Auth Server', sub: 'Entra ID · Okta · Cognito', at: [0, -3.6], shape: 'hex', tone: 'guard', icon: 'key', info: 'Servidor de autorización corporativo. Se descubre con RFC 8414 u OIDC Discovery a partir de la URL que publica el PRM. Emite tokens con audiencia = servidor MCP.' },
    { id: 'cimd', label: 'Documento CIMD', sub: 'metadatos del cliente', at: [3.6, -3.6], shape: 'doc', tone: 'protocol', icon: 'file', info: 'JSON alojado en la URL del `client_id`. El AS lo descarga para conocer al cliente; debe protegerse contra SSRF (solo HTTPS, sin IPs privadas).' },
    { id: 'api', label: 'API de tickets', sub: 'token propio u OBO', at: [7.2, 0], shape: 'box', tone: 'neutral', icon: 'database', info: 'Para llamar al sistema de fondo, el servidor usa su propia credencial o un intercambio on-behalf-of. **Reenviar el token del cliente (token passthrough) está prohibido.**' },
  ],
  edges: [
    { from: 'user', to: 'client' },
    { from: 'client', to: 'mcp' },
    { from: 'mcp', to: 'prm', route: 'z' },
    { from: 'client', to: 'as', route: 'z' },
    { from: 'as', to: 'cimd', dashed: true },
    { from: 'mcp', to: 'api' },
  ],
  code: {
    client: { title: 'cliente_oauth.py (ilustrativo)', lang: 'python', source: AUTH_CLIENT },
    server: { title: 'auth.py (ilustrativo)', lang: 'python', source: AUTH_SERVER },
  },
  steps: [
    {
      title: '1 · Request sin token',
      body: 'El cliente llama al servidor sin credenciales. Respuesta: `401 Unauthorized` con un `WWW-Authenticate` que apunta al documento `resource_metadata`. Es la única pista que necesita para empezar.',
      flows: ['client>mcp: POST /mcp', 'mcp>client: 401 + resource_metadata'],
      data: {
        title: 'respuesta del servidor MCP',
        lang: 'http',
        content: [
          'HTTP/1.1 401 Unauthorized',
          'WWW-Authenticate: Bearer resource_metadata="https://mcp.tickets.interno/.well-known/oauth-protected-resource"',
          'Content-Type: application/json',
          '',
          json({ error: 'invalid_token', error_description: 'Falta el token de acceso' }),
        ].join('\n'),
        hl: ['401 Unauthorized', 'resource_metadata='],
      },
      code: { file: 'server', hl: ['def unauthorized', "header = f'Bearer resource_metadata=", 'return 401'] },
    },
    {
      title: '2 · Descubrir el AS',
      body: 'El cliente lee el **Protected Resource Metadata** (RFC 9728) y obtiene la URL del servidor de autorización; luego descarga sus metadatos (RFC 8414 / OIDC): endpoints, PKCE soportado y si acepta CIMD.',
      flows: ['client>prm: GET PRM', 'prm>client: authorization_servers', 'client>as: GET AS metadata', 'as>client: endpoints'],
      data: {
        title: 'GET /.well-known/oauth-protected-resource → AS metadata',
        lang: 'json',
        content: json({
          'oauth-protected-resource': {
            resource: 'https://mcp.tickets.interno',
            authorization_servers: ['https://login.retailandino.com'],
            scopes_supported: ['tickets.read', 'tickets.write'],
            bearer_methods_supported: ['header'],
          },
          'oauth-authorization-server': {
            issuer: 'https://login.retailandino.com',
            authorization_endpoint: 'https://login.retailandino.com/authorize',
            token_endpoint: 'https://login.retailandino.com/token',
            code_challenge_methods_supported: ['S256'],
            client_id_metadata_document_supported: true,
          },
        }),
        hl: ['"authorization_servers"', '"code_challenge_methods_supported"', '"client_id_metadata_document_supported"'],
      },
      code: { file: 'client', hl: ['def discover', 'prm = httpx.get(prm_url).json()', 'oauth-authorization-server'] },
    },
    {
      title: '3 · Autorización con PKCE',
      body: 'El cliente genera un `code_verifier` secreto y envía solo su hash (`code_challenge`). Abre el navegador del usuario en el AS con `state` de un solo uso, scopes mínimos y `resource=https://mcp.tickets.interno` (RFC 8707). El usuario inicia sesión y consiente.',
      flows: ['client>user: abre /authorize', 'user>as: login + consentimiento'],
      data: {
        title: 'redirección al endpoint de autorización',
        lang: 'http',
        content: [
          'GET /authorize?response_type=code',
          '  &client_id=https%3A%2F%2Fapp.retailandino.com%2Foauth%2Fclient.json',
          '  &redirect_uri=https%3A%2F%2Fapp.retailandino.com%2Foauth%2Fcallback',
          `  &code_challenge=${PKCE_CHALLENGE}`,
          '  &code_challenge_method=S256',
          '  &state=af0ifjsldkj3x9',
          '  &scope=tickets.read',
          '  &resource=https%3A%2F%2Fmcp.tickets.interno HTTP/1.1',
          'Host: login.retailandino.com',
        ].join('\n'),
        hl: ['client_id=', 'code_challenge=', '&state=', '&resource='],
      },
      code: { file: 'client', hl: ['verifier = secrets.token_urlsafe(64)', 'challenge = base64.urlsafe_b64encode(', 'state = secrets.token_urlsafe(16)', '"resource": RESOURCE}'] },
    },
    {
      title: '4 · El AS conoce al cliente',
      body: 'Como el `client_id` es una URL, el AS descarga el **Client ID Metadata Document**, comprueba que su `client_id` coincida con la URL y que el `redirect_uri` pedido esté **exactamente** en la lista. Sin registro previo ni DCR.',
      flows: ['as>cimd: GET client.json', 'cimd>as: metadatos'],
      data: {
        title: 'GET https://app.retailandino.com/oauth/client.json',
        lang: 'json',
        content: json({
          client_id: 'https://app.retailandino.com/oauth/client.json',
          client_name: 'Asistente de soporte · Retail Andino',
          redirect_uris: ['https://app.retailandino.com/oauth/callback'],
          grant_types: ['authorization_code', 'refresh_token'],
          response_types: ['code'],
          token_endpoint_auth_method: 'none',
          logo_uri: 'https://app.retailandino.com/logo.png',
        }),
        hl: ['"client_id"', '"redirect_uris"'],
      },
      code: { file: 'client', hl: ['CLIENT_ID = "https://app.retailandino.com/oauth/client.json"'] },
    },
    {
      title: '5 · Token con audiencia',
      body: 'El AS redirige con `code`, `state` e `iss`. El cliente verifica `state` y el `iss` (**RFC 9207**, contra ataques *mix-up*) y canjea el código enviando el `code_verifier` y otra vez `resource`. El token que recibe tiene como audiencia **solo** este servidor MCP.',
      flows: ['as>client: code + state + iss', 'client>as: POST /token + verifier', 'as>client: access_token'],
      data: {
        title: 'POST /token y respuesta',
        lang: 'http',
        content: [
          'POST /token HTTP/1.1',
          'Host: login.retailandino.com',
          'Content-Type: application/x-www-form-urlencoded',
          '',
          'grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA',
          '&redirect_uri=https%3A%2F%2Fapp.retailandino.com%2Foauth%2Fcallback',
          '&client_id=https%3A%2F%2Fapp.retailandino.com%2Foauth%2Fclient.json',
          '&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
          '&resource=https%3A%2F%2Fmcp.tickets.interno',
          '',
          'HTTP/1.1 200 OK',
          'Content-Type: application/json',
          '',
          json({ access_token: 'eyJhbGciOiJSUzI1NiIs…', token_type: 'Bearer', expires_in: 3600, scope: 'tickets.read' }),
          '',
          '# payload del JWT: {"iss": "https://login.retailandino.com", "aud": "https://mcp.tickets.interno", "sub": "u-3381", "scope": "tickets.read"}',
        ].join('\n'),
        hl: ['&code_verifier=', '&resource=', '"access_token"', '"aud": "https://mcp.tickets.interno"'],
      },
      code: { file: 'client', hl: ['def exchange', 'params["state"] == state', 'params["iss"] == as_meta["issuer"]', '"code_verifier": verifier'] },
    },
    {
      title: '6 · Request autenticada',
      body: 'Cada request lleva `Authorization: Bearer …`. El servidor descarga la clave pública del AS (JWKS) y valida firma, emisor, **audiencia** y expiración. Un token emitido para otro recurso se rechaza aunque sea válido.',
      flows: ['client>mcp: tools/call + Bearer'],
      data: {
        title: 'request con token',
        lang: 'http',
        content: [
          'POST /mcp HTTP/1.1',
          'Host: mcp.tickets.interno',
          'Authorization: Bearer eyJhbGciOiJSUzI1NiIs…',
          'Content-Type: application/json',
          'Mcp-Method: tools/call',
          'Mcp-Name: list_tickets',
          '',
          json({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'list_tickets', arguments: { order_id: '4512' } } }),
        ].join('\n'),
        hl: ['Authorization: Bearer', 'Mcp-Name: list_tickets'],
      },
      code: { file: 'server', hl: ['def validate', 'jwks.get_signing_key_from_jwt(token)', 'audience=RESOURCE, issuer=ISSUER'] },
    },
    {
      title: '7 · Llamada al sistema de fondo',
      body: 'El servidor llama a la API de tickets con **otra** credencial (propia u on-behalf-of) y responde al cliente. El token del cliente nunca sale del servidor MCP: el *token passthrough* está prohibido por la spec.',
      flows: ['mcp>api: token de servicio', 'api>mcp', 'mcp>client: result'],
      data: {
        title: 'lo que el servidor envía a la API (ilustrativo)',
        lang: 'http',
        content: [
          'GET /api/v2/tickets?order_id=4512 HTTP/1.1',
          'Host: tickets-api.interno',
          'Authorization: Bearer <token de servicio del servidor MCP, aud=tickets-api>',
          'X-Requested-By: u-3381',
        ].join('\n'),
        hl: ['token de servicio', 'X-Requested-By'],
      },
      code: { file: 'server', hl: ['def list_tickets', 'token = service_token()', '# Nunca:'] },
    },
    {
      title: '8 · Step-up de scopes',
      body: 'Para `create_ticket` el token no alcanza: falta `tickets.write`. El servidor responde `403` con `error="insufficient_scope"` y el scope requerido; el cliente repite la autorización pidiendo solo ese scope adicional (*step-up*).',
      flows: ['client>mcp: tools/call create_ticket', 'mcp>client: 403 insufficient_scope'],
      data: {
        title: 'respuesta 403',
        lang: 'http',
        content: ['HTTP/1.1 403 Forbidden', 'WWW-Authenticate: Bearer error="insufficient_scope", scope="tickets.write"'].join('\n'),
        hl: ['403 Forbidden', 'insufficient_scope'],
      },
      code: { file: 'server', hl: ['if needed not in claims.get("scope"', 'insufficient_scope'] },
    },
  ],
}

const MRTR_SERVER = `from mcp.server import MCPServer, InputRequired, Elicitation

mcp = MCPServer("reembolsos")

@mcp.tool()
def issue_refund(order_id: str, ctx) -> dict:
    """Emite un reembolso tras confirmación humana."""
    amount = erp.refundable_amount(order_id)
    answer = ctx.input_response("confirmacion")       # None en el primer intento
    if answer is None:
        raise InputRequired(                           # → resultType: "input_required"
            confirmacion=Elicitation(
                message=f"¿Confirmas reembolso de US\${amount} del pedido {order_id}?",
                schema={"type": "object", "properties": {"ok": {"type": "boolean"}}},
            ),
            state={"order_id": order_id, "amount": amount},   # se sella en requestState
        )
    if not answer["ok"]:
        return {"status": "cancelado"}
    state = ctx.request_state                          # verificado por el SDK
    refund = erp.refund(state["order_id"], state["amount"])
    return {"status": "reembolsado", "refund_id": refund.id}`

const j = (v: unknown) => JSON.stringify(v, null, 2)

export const mcpMrtr: IsoSpec = {
  id: 'mcp-mrtr',
  title: 'Multi Round-Trip Requests: pedir datos al usuario sin sesión',
  summary:
    'En la spec `2026-07-28` el servidor ya no puede iniciar requests hacia el cliente (adiós a sampling y elicitation "push"). Si una tool necesita algo más, responde `resultType: "input_required"` con `inputRequests`; el cliente obtiene las respuestas y **reintenta** la misma llamada con `inputResponses`. El diagrama de secuencia muestra los mensajes en orden; a la derecha, el JSON-RPC y el código del servidor.',
  height: 460,
  layout: 'sequence',
  lanes: ['llm', 'client', 'user', 'server', 'erp'],
  nodes: [
    { id: 'llm', label: 'Agente', sub: 'host + LLM', at: [-3.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'El agente de soporte decidió llamar `issue_refund` para el pedido 4512.' },
    { id: 'client', label: 'Cliente MCP', sub: 'SDK v2', at: [0, 0], shape: 'box', tone: 'protocol', icon: 'plug', info: 'Gestiona el ciclo MRTR: detecta `input_required`, resuelve las solicitudes (formulario al usuario) y reintenta. El `Client` del SDK de Python v2 lo hace automáticamente.' },
    { id: 'user', label: 'Supervisor', sub: 'aprueba el monto', at: [0, -3.6], shape: 'person', tone: 'user', icon: 'hand', info: 'Recibe un formulario de *elicitation* generado por el host: "¿Confirmas reembolso de US$420 del pedido 4512?".' },
    { id: 'server', label: 'Servidor MCP', sub: 'reembolsos', at: [3.6, 0], shape: 'tall', tone: 'tool', icon: 'server', info: 'No guarda estado entre intentos: lo que necesita recordar lo devuelve sellado en `requestState`, que el cliente reenvía tal cual.' },
    { id: 'erp', label: 'ERP', sub: 'pagos', at: [7.2, 0], shape: 'cylinder', tone: 'data', icon: 'database', info: 'El reembolso se ejecuta solo después de la confirmación explícita.' },
  ],
  edges: [
    { from: 'llm', to: 'client' },
    { from: 'client', to: 'server' },
    { from: 'client', to: 'user', route: 'z' },
    { from: 'server', to: 'erp' },
  ],
  code: { server: { title: 'server.py (ilustrativo)', lang: 'python', source: MRTR_SERVER } },
  steps: [
    {
      title: '1 · Primera llamada',
      body: 'El agente decide reembolsar y el cliente envía `tools/call` **sin** respuestas: todavía no sabe que la tool necesita una confirmación.',
      flows: ['llm>client: issue_refund(4512)', 'client>server: tools/call'],
      data: {
        title: 'POST /mcp · Mcp-Method: tools/call',
        lang: 'json',
        content: j({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'issue_refund', arguments: { order_id: '4512' }, _meta: { protocolVersion: '2026-07-28' } } }),
        hl: ['"method"', '"arguments"'],
      },
      code: { hl: ['def issue_refund', 'erp.refundable_amount', 'ctx.input_response'] },
    },
    {
      title: '2 · input_required',
      body: 'El servidor no puede llamar al cliente, así que **responde** pidiendo lo que falta: un `inputRequests` de tipo elicitation y un `requestState` sellado con el monto calculado.',
      flows: ['server>client: input_required'],
      data: {
        title: 'respuesta JSON-RPC (forma simplificada)',
        lang: 'json',
        content: j({
          jsonrpc: '2.0',
          id: 7,
          result: {
            resultType: 'input_required',
            inputRequests: { confirmacion: { type: 'elicitation', message: '¿Confirmas reembolso de US$420 del pedido 4512?', requestedSchema: { type: 'object', properties: { ok: { type: 'boolean' } } } } },
            requestState: 'eyJhbGciOi…sellado',
          },
        }),
        hl: ['"resultType"', '"inputRequests"', '"requestState"'],
      },
      code: { hl: ['if answer is None', 'raise InputRequired', 'Elicitation(', 'state={"order_id"'] },
    },
    {
      title: '3 · Preguntar a una persona',
      body: 'El host muestra el formulario al supervisor. La respuesta **no pasa por el LLM**: va directo del usuario al cliente, así el modelo no puede "aprobarse a sí mismo".',
      flows: ['client>user: formulario', 'user>client: { ok: true }'],
      data: { title: 'respuesta del formulario', lang: 'json', content: j({ confirmacion: { ok: true } }), hl: ['"ok"'] },
    },
    {
      title: '4 · Reintento con respuestas',
      body: 'El cliente repite **la misma** `tools/call` agregando `inputResponses` y el `requestState` tal cual lo recibió. Cualquier réplica del servidor puede atenderla: no hay sesión.',
      flows: ['client>server: tools/call + inputResponses'],
      data: {
        title: 'POST /mcp · reintento',
        lang: 'json',
        content: j({
          jsonrpc: '2.0',
          id: 8,
          method: 'tools/call',
          params: { name: 'issue_refund', arguments: { order_id: '4512' }, inputResponses: { confirmacion: { ok: true } }, requestState: 'eyJhbGciOi…sellado' },
        }),
        hl: ['"inputResponses"', '"requestState"'],
      },
      code: { hl: ['ctx.input_response', 'state = ctx.request_state'] },
    },
    {
      title: '5 · Ejecutar y responder',
      body: 'El servidor verifica el sello, ejecuta el reembolso en el ERP con **su** credencial y devuelve un resultado normal, que el host entrega al modelo como `tool_result`.',
      flows: ['server>erp: refund()', 'erp>server', 'server>client: result', 'client>llm: tool_result'],
      data: {
        title: 'respuesta JSON-RPC',
        lang: 'json',
        content: j({ jsonrpc: '2.0', id: 8, result: { content: [{ type: 'text', text: '{"status":"reembolsado","refund_id":"RF-20931"}' }], structuredContent: { status: 'reembolsado', refund_id: 'RF-20931' }, isError: false } }),
        hl: ['"structuredContent"'],
      },
      code: { hl: ['erp.refund(', 'return {"status": "reembolsado"'] },
    },
  ],
}
