import type { IsoSpec } from '../components/iso/types'

export const mcpArquitectura: IsoSpec = {
  id: 'mcp-arquitectura',
  title: 'Arquitectura MCP y flujo de una llamada (spec 2026-07-28)',
  summary:
    'Un **host** (IDE, chat corporativo o tu agente ADK) crea **un cliente MCP por servidor**. Cada servidor expone tools, resources y prompts. Desde la versión `2026-07-28` el protocolo es **stateless**: no hay handshake `initialize` ni sesión; cada request se describe a sí misma.',
  height: 500,
  zones: [{ id: 'host', label: 'Proceso host', from: [-1.4, -5], to: [4.8, 3.2], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Usuario', at: [-4.2, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pide: "Crea un ticket con el error del log de despliegue de ayer".' },
    { id: 'host', label: 'Host', sub: 'agente ADK · IDE · chat', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'La aplicación con el LLM. Decide qué servidores conectar, muestra consentimientos y aplica políticas. Contiene uno o más clientes MCP.' },
    { id: 'llm', label: 'LLM', sub: 'elige herramientas', at: [0, -3.6], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Ve las definiciones de tools que el host le pasa y decide cuál invocar. No habla MCP: el host traduce.' },
    { id: 'c1', label: 'Cliente MCP A', sub: 'stdio', at: [3.4, -1.7], shape: 'box', tone: 'protocol', icon: 'plug', info: 'Conector 1:1 con un servidor local. Lanza el servidor como subproceso y habla JSON-RPC por stdin/stdout.' },
    { id: 'c2', label: 'Cliente MCP B', sub: 'Streamable HTTP', at: [3.4, 1.7], shape: 'box', tone: 'protocol', icon: 'plug', info: 'Conector 1:1 con un servidor remoto. Cada request es un POST HTTP con headers `Mcp-Method` y `Mcp-Name` y un token OAuth.' },
    { id: 's1', label: 'Servidor local', sub: 'logs y repositorio', at: [7.2, -1.7], shape: 'tall', tone: 'tool', icon: 'terminal', info: 'Corre en la máquina del usuario con sus credenciales. Riesgo: un servidor local malicioso tiene el mismo acceso que el usuario.' },
    { id: 's2', label: 'Servidor remoto', sub: 'tickets (Jira)', at: [7.2, 1.7], shape: 'tall', tone: 'tool', icon: 'server', info: 'Servicio HTTP desplegado por TI (o un SaaS). Al ser stateless, cualquier réplica detrás de un balanceador puede atender cualquier request.' },
    { id: 'api', label: 'API de tickets', sub: 'sistema de origen', at: [10.6, 1.7], shape: 'cloud', tone: 'neutral', icon: 'cloud', info: 'El sistema real. El servidor MCP lo llama con **su propia** credencial (o un token obtenido por on-behalf-of), nunca reenviando el token del cliente.' },
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
  steps: [
    { title: '1 · Un cliente por servidor', body: 'El host lee su configuración y crea un cliente MCP para cada servidor: uno local por **stdio** y uno remoto por **Streamable HTTP**.', flows: ['host>c1', 'host>c2'] },
    { title: '2 · Descubrimiento', body: 'Sin handshake: el cliente llama `server/discover` para conocer versión y capacidades. Cada request posterior lleva en `_meta` la versión del protocolo, capacidades y `clientInfo`.', flows: ['c2>s2', 's2>c2'] },
    { title: '3 · Listar herramientas', body: '`tools/list` devuelve nombre, descripción y JSON Schema de cada tool, en **orden determinista** y con `ttlMs` para cachear (bueno para el prompt caching).', flows: ['c1>s1', 'c2>s2'] },
    { title: '4 · El modelo elige', body: 'El host pasa las tools al LLM junto con la pregunta. El modelo pide `read_deploy_log` y luego `create_ticket`.', flows: ['user>host', 'host>llm', 'llm>host'] },
    { title: '5 · tools/call local', body: 'El cliente A envía `tools/call` por stdin al subproceso local, que lee el log y responde por stdout.', flows: ['c1>s1', 's1>c1'] },
    { title: '6 · tools/call remoto', body: 'El cliente B hace `POST` con `Mcp-Method: tools/call` y `Mcp-Name: create_ticket`: un gateway puede enrutar y aplicar políticas **sin parsear el body**.', flows: ['c2>s2'] },
    { title: '7 · El servidor actúa', body: 'El servidor valida el token (audiencia correcta), llama a la API de tickets con su propia credencial y devuelve el resultado al host, que lo entrega al modelo.', flows: ['s2>api', 'api>s2', 's2>c2', 'c2>host'] },
  ],
}

export const mcpOauth: IsoSpec = {
  id: 'mcp-oauth',
  title: 'Autorización OAuth 2.1 en un servidor MCP remoto',
  summary:
    'El servidor MCP es un **resource server OAuth 2.1**. El cliente descubre al servidor de autorización mediante **Protected Resource Metadata (RFC 9728)**, se identifica con un **Client ID Metadata Document** (CIMD), usa **PKCE** y pide un token con `resource` (RFC 8707) para que la audiencia sea exactamente ese servidor.',
  height: 480,
  nodes: [
    { id: 'user', label: 'Usuario', at: [-3.4, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Inicia sesión en el IdP corporativo y da consentimiento a los scopes que pide el cliente.' },
    { id: 'client', label: 'Cliente MCP', sub: 'client_id = URL (CIMD)', at: [0, 0], shape: 'box', tone: 'protocol', icon: 'plug', info: 'En vez de registrarse dinámicamente (DCR, deprecado), usa como `client_id` una URL HTTPS que publica sus metadatos: nombre, `redirect_uris`, logo.' },
    { id: 'as', label: 'Auth Server', sub: 'Entra ID · Okta · Cognito', at: [0, -3.6], shape: 'hex', tone: 'guard', icon: 'key', info: 'Servidor de autorización corporativo. Se descubre con RFC 8414 u OIDC Discovery a partir de la URL que publica el PRM. Emite tokens con audiencia = servidor MCP.' },
    { id: 'cimd', label: 'Documento CIMD', sub: 'metadatos del cliente', at: [3.6, -3.6], shape: 'doc', tone: 'protocol', icon: 'file', info: 'JSON alojado en la URL del `client_id`. El AS lo descarga para conocer al cliente; debe protegerse contra SSRF (solo HTTPS, sin IPs privadas).' },
    { id: 'mcp', label: 'Servidor MCP', sub: 'resource server', at: [3.6, 0], shape: 'tall', tone: 'tool', icon: 'server', info: 'Rechaza requests sin token con `401` y `WWW-Authenticate: Bearer resource_metadata="…"`. Valida firma, `iss`, audiencia, expiración y scopes en cada request.' },
    { id: 'prm', label: 'Metadata PRM', sub: 'RFC 9728', at: [3.6, 3.4], shape: 'doc', tone: 'protocol', icon: 'scroll', info: 'Publicado en `/.well-known/oauth-protected-resource`: indica qué servidores de autorización acepta este recurso y qué scopes soporta.' },
    { id: 'api', label: 'API interna', sub: 'token propio u OBO', at: [7.2, 0], shape: 'box', tone: 'neutral', icon: 'database', info: 'Para llamar al sistema de fondo, el servidor usa su propia credencial o un intercambio on-behalf-of. **Reenviar el token del cliente (token passthrough) está prohibido.**' },
  ],
  edges: [
    { from: 'user', to: 'client' },
    { from: 'client', to: 'mcp' },
    { from: 'mcp', to: 'prm', route: 'z' },
    { from: 'client', to: 'as', route: 'z' },
    { from: 'as', to: 'cimd', dashed: true },
    { from: 'mcp', to: 'api' },
  ],
  steps: [
    { title: '1 · Request sin token', body: 'El cliente llama al servidor. Respuesta: `401 Unauthorized` con `WWW-Authenticate` que apunta al documento `resource_metadata`.', flows: ['client>mcp', 'mcp>client'] },
    { title: '2 · Descubrir el AS', body: 'El cliente lee el **Protected Resource Metadata** (RFC 9728) y obtiene la URL del servidor de autorización; luego descarga sus metadatos (RFC 8414 / OIDC).', flows: ['client>prm', 'prm>client'] },
    { title: '3 · Autorización con PKCE', body: 'Redirige al usuario al AS con `code_challenge` (PKCE obligatorio), `state` de un solo uso, scopes mínimos y `resource=https://mcp.tickets.interno` (RFC 8707).', flows: ['client>as', 'user>as'] },
    { title: '4 · El AS conoce al cliente', body: 'Como el `client_id` es una URL, el AS descarga el **Client ID Metadata Document** y verifica que el `redirect_uri` coincida exactamente.', flows: ['as>cimd'] },
    { title: '5 · Token con audiencia', body: 'Tras el consentimiento, el cliente canjea el código (con `code_verifier`) por un access token cuya audiencia es **solo** ese servidor MCP. Verifica `iss` (RFC 9207) contra ataques mix-up.', flows: ['as>client'] },
    { title: '6 · Requests autenticadas', body: 'Cada request lleva `Authorization: Bearer …`. El servidor valida audiencia y scopes; si falta un scope responde `403 insufficient_scope` y el cliente hace *step-up*.', flows: ['client>mcp'] },
    { title: '7 · Llamada al sistema de fondo', body: 'El servidor llama a la API interna con **otra** credencial (propia u OBO). El token del cliente nunca sale del servidor MCP.', flows: ['mcp>api', 'api>mcp'] },
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
