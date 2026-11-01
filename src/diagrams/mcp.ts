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

export const mcpMrtr: IsoSpec = {
  id: 'mcp-mrtr',
  title: 'Multi Round-Trip Requests: pedir datos al usuario sin sesión',
  summary:
    'En la spec `2026-07-28` el servidor ya no puede iniciar requests hacia el cliente (adiós a sampling y elicitation "push"). Si una tool necesita algo más, responde `resultType: "input_required"` con `inputRequests`; el cliente obtiene las respuestas y **reintenta** la misma llamada con `inputResponses`.',
  height: 460,
  nodes: [
    { id: 'llm', label: 'Agente', sub: 'host + LLM', at: [-3.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'El agente de soporte decidió llamar `issue_refund` para el pedido 4512.' },
    { id: 'client', label: 'Cliente MCP', at: [0, 0], shape: 'box', tone: 'protocol', icon: 'plug', info: 'Gestiona el ciclo MRTR: detecta `input_required`, resuelve las solicitudes (formulario al usuario) y reintenta. El `Client` del SDK de Python v2 lo hace automáticamente.' },
    { id: 'user', label: 'Supervisor', sub: 'aprueba el monto', at: [0, -3.6], shape: 'person', tone: 'user', icon: 'hand', info: 'Recibe un formulario de *elicitation* generado por el host: "¿Confirmas reembolso de US$420 al cliente C-889?".' },
    { id: 'server', label: 'Servidor MCP', sub: 'reembolsos', at: [3.6, 0], shape: 'tall', tone: 'tool', icon: 'server', info: 'No guarda estado entre intentos: lo que necesita recordar lo devuelve sellado en `requestState`, que el cliente reenvía tal cual.' },
    { id: 'state', label: 'requestState', sub: 'sellado por el servidor', at: [3.6, -3.6], shape: 'doc', tone: 'memory', icon: 'lock', info: 'Estado opaco firmado/cifrado por el servidor. Con varias réplicas, todas deben compartir las claves para verificarlo.' },
    { id: 'erp', label: 'ERP', sub: 'pagos', at: [7.2, 0], shape: 'cylinder', tone: 'data', icon: 'database', info: 'El reembolso se ejecuta solo después de la confirmación explícita.' },
  ],
  edges: [
    { from: 'llm', to: 'client' },
    { from: 'client', to: 'server' },
    { from: 'client', to: 'user', route: 'z' },
    { from: 'server', to: 'state', route: 'z', dashed: true },
    { from: 'server', to: 'erp' },
  ],
  steps: [
    { title: '1 · Primera llamada', body: 'El agente invoca `tools/call issue_refund {"order_id": "4512"}`.', flows: ['llm>client', 'client>server'] },
    { title: '2 · input_required', body: 'El servidor responde `resultType: "input_required"` con un `inputRequests` de tipo elicitation (monto y confirmación) y un `requestState` sellado.', flows: ['server>state', 'server>client'] },
    { title: '3 · Preguntar a una persona', body: 'El host muestra el formulario al supervisor. La respuesta no pasa por el LLM: va directo del usuario al cliente.', flows: ['client>user', 'user>client'] },
    { title: '4 · Reintento con respuestas', body: 'El cliente repite **la misma** `tools/call` agregando `inputResponses` y el `requestState`. Cualquier réplica del servidor puede atenderla.', flows: ['client>server'] },
    { title: '5 · Ejecutar y responder', body: 'El servidor verifica el estado, ejecuta el reembolso en el ERP y devuelve un resultado normal al agente.', flows: ['server>erp', 'erp>server', 'server>client', 'client>llm'] },
  ],
}
