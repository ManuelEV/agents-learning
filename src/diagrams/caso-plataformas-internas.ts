import type { IsoSpec } from '../components/iso/types'

/* Todos los diagramas de esta página son RECONSTRUCCIONES a partir del texto
   publicado por cada empresa (ver docs/research/casos/caso-plataformas-internas.md).
   No son diagramas oficiales. El último (blueprint) es una síntesis propia.
   Los datos y el código de los paneles son ILUSTRATIVOS DEL PATRÓN: ninguna de
   estas empresas publicó ese código ni esos payloads. */

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* ─────────────────────────── Uber ─────────────────────────── */

const UBER_CRAWLER = `# autocrawler.py (ilustrativo del patrón; no es código de Uber)
# Workflow programado, suscrito al registro de IDL.
def crawl(idl_registry, registro, llm):
    for servicio in idl_registry.servicios_modificados():
        servidor = registro.upsert_servidor(
            nombre=servicio.nombre,              # un servidor MCP virtual por servicio
            dueno=servicio.equipo,
            endpoint=f"/{servicio.nombre}/mcp",
            origen="idl",
        )
        for metodo in servicio.metodos:
            schema = idl_a_json_schema(metodo.request)      # Protobuf/Thrift → JSON Schema
            borrador = llm.describir(metodo, servicio.docs) # descripción legible por agentes
            registro.upsert_tool(
                servidor, metodo.nombre, schema, borrador,
                habilitada=False,                # descubrir no es exponer
            )

def aprobar_cambio(registro, tool, diff, revisor):
    """El dueño revisa el diff de descripción/habilitación; queda versionado."""
    version = registro.aplicar(tool, diff, aprobado_por=revisor)
    return version                               # rollback = volver a version - 1`

const UBER_PROXY = `# proxy_gateway.py (ilustrativo del patrón; no es código de Uber)
import time

CONFIG = {}                       # snapshot en memoria del control plane

def refrescar_config(registro, cada_s=30):
    global CONFIG
    while True:                   # habilitar una tool no requiere redeploy
        CONFIG = registro.snapshot(solo_habilitadas=True)
        time.sleep(cada_s)

def manejar_tools_call(servidor: str, req: dict, llamador) -> dict:
    tool = CONFIG.get(servidor, {}).get(req["params"]["name"])
    if tool is None:                                  # deshabilitada o inexistente
        return error_jsonrpc(req, -32602, "tool no disponible")
    if not acs.permitir(llamador, servidor, tool.nombre):
        return error_jsonrpc(req, -32001, "acceso denegado")   # política por tool
    args = req["params"]["arguments"]
    if tool.origen == "idl":                          # gRPC/Thrift por la malla
        resp = mesh.call(tool.servicio, tool.metodo, serializar(tool.idl, args))
    elif tool.origen == "tercero":                    # Jira, Google…
        resp = terceros.call(tool, args, token_usuario=llamador.token)
    else:                                             # servidor MCP nativo
        resp = mcp_nativo.forward(tool, req)
    datos = redactar_pii(resp)                        # antes de llegar al agente
    return resultado_jsonrpc(req, datos)`

export const cpiUberMcp: IsoSpec = {
  id: 'cpi-uber-mcp',
  title: 'Uber: MCP Gateway con registro (control plane) y proxy (data plane)',
  summary:
    'Reconstrucción a partir del post de Uber Engineering del 1 de octubre de 2026 (no es un diagrama oficial). Un **MCP Registry** es la fuente de verdad de qué servidores y tools existen, quién es dueño y qué está habilitado; un **Proxy Gateway** ejecuta cada llamada MCP traduciéndola a HTTP, gRPC o TChannel. Un crawler convierte las IDL existentes en tools **deshabilitadas por defecto**. Los paneles de datos y código son **ilustrativos del patrón**: Uber no publicó su código ni sus payloads, y el servicio `trip-receipts` es un ejemplo inventado.',
  height: 540,
  zones: [{ id: 'back', label: 'Servicios y servidores de destino', from: [8.6, -5.0], to: [11.8, 5.0], tone: 'tool' }],
  nodes: [
    { id: 'agente', label: 'Agentes y clientes', sub: 'Agent Builder · aifx · IDE', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Agentes no-code de Uber Agent Builder, agentes de código aprovisionados con la CLI `aifx`, IDE y servicios. Para todos hay un solo punto de entrada MCP.' },
    { id: 'dueno', label: 'Equipo dueño', sub: 'revisa y habilita', at: [0, -3.4], shape: 'person', tone: 'user', icon: 'user', info: 'Cada servidor y cada tool nace deshabilitado. El equipo dueño del servicio revisa la descripción, la habilita y aprueba cada cambio como un diff con rollback.' },
    { id: 'proxy', label: 'Proxy Gateway', sub: 'data plane', at: [3.4, 0], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Expone un endpoint MCP por servidor virtual, traduce la llamada al protocolo del servicio y vuelve a MCP. Refresca su configuración en memoria periódicamente: habilitar una tool no requiere reiniciar.' },
    { id: 'registry', label: 'MCP Registry', sub: 'control plane', at: [3.4, -3.4], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Fuente de verdad de descubrimiento, ownership y habilitación. Uber reporta más de 800 servidores MCP y más de 5.000 tools (octubre de 2026).' },
    { id: 'acs', label: 'Control de acceso', sub: 'política por tool', at: [3.4, 3.8], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'El Access Control System interno evalúa políticas por servidor, con override por tool. El llamador puede ser una persona, un servicio o un agente.' },
    { id: 'crawler', label: 'AutoCrawler', sub: 'workflow Cadence · cron', at: [6.8, -3.4], shape: 'box', tone: 'infra', icon: 'repeat', info: 'Suscrito al registro de IDL: crea un servidor MCP virtual por servicio, convierte Protobuf/Thrift a JSON-RPC y usa un LLM para redactar descripciones de tools legibles por agentes.' },
    { id: 'mesh', label: 'Muttley', sub: 'sidecar de service mesh', at: [6.8, 0], shape: 'box', tone: 'infra', icon: 'network', info: 'Las llamadas a servicios con IDL se serializan a Protobuf/Thrift y salen por el sidecar de malla existente: mismo ruteo que el tráfico entre microservicios.' },
    { id: 'idl', label: 'Registro de IDL', sub: 'Protobuf · Thrift', at: [10.2, -3.4], shape: 'doc', tone: 'data', icon: 'file', info: 'Las definiciones de interfaz que Uber ya tenía para miles de servicios. Son la materia prima de las tools: no hubo que reescribir servicios.' },
    { id: 'svc', label: 'Servicios internos', sub: 'HTTP · gRPC · TChannel', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'Miles de servicios internos que pasan a ser herramientas sin escribir un servidor MCP para cada uno.' },
    { id: 'saas', label: 'Nativos y terceros', sub: 'MCPFx · Jira · Google', at: [10.2, 3.4], shape: 'cloud', tone: 'tool', icon: 'cloud', info: 'Servidores MCP nativos (construidos con MCPFx y descubiertos por heartbeat) se proxifican tal cual. Para terceros se reenvía el token del usuario, que se intercambia por una credencial externa.' },
  ],
  edges: [
    { from: 'agente', to: 'proxy', label: 'MCP' },
    { from: 'dueno', to: 'registry' },
    { from: 'registry', to: 'proxy', route: 'z', dashed: true },
    { from: 'proxy', to: 'acs', route: 'z' },
    { from: 'proxy', to: 'mesh' },
    { from: 'mesh', to: 'svc' },
    { from: 'proxy', to: 'saas' },
    { from: 'idl', to: 'crawler' },
    { from: 'crawler', to: 'registry' },
  ],
  code: {
    crawler: { title: 'autocrawler.py (ilustrativo del patrón)', lang: 'python', source: UBER_CRAWLER },
    proxy: { title: 'proxy_gateway.py (ilustrativo del patrón)', lang: 'python', source: UBER_PROXY },
  },
  steps: [
    {
      title: '1 · Descubrir lo que ya existe',
      body: 'AutoCrawler lee el registro de IDL, genera **un servidor MCP virtual por servicio**, convierte cada método a un JSON Schema y pide a un LLM una descripción legible por agentes. Todo queda registrado **deshabilitado**.',
      flows: ['idl>crawler', 'crawler>registry'],
      data: {
        title: 'registro de una tool recién descubierta (forma ilustrativa)',
        lang: 'json',
        content: json({
          servidor: { nombre: 'trip-receipts', endpoint: '/trip-receipts/mcp', origen: 'idl', virtual: true, dueno: 'equipo-recibos' },
          tool: {
            name: 'GetReceipt',
            description: '[borrador LLM] Devuelve el recibo de un viaje: tarifa, impuestos y método de pago.',
            inputSchema: { type: 'object', properties: { trip_id: { type: 'string' } }, required: ['trip_id'] },
            fuente_idl: 'receipts.proto · ReceiptService.GetReceipt',
          },
          habilitada: false,
        }),
        hl: ['"virtual"', '"habilitada"', '[borrador LLM]'],
      },
      code: { file: 'crawler', hl: ['servicios_modificados()', 'idl_a_json_schema', 'llm.describir', 'habilitada=False'] },
    },
    {
      title: '2 · Descubrir no es exponer',
      body: 'El equipo dueño revisa la descripción, la corrige y habilita solo las tools que quiere ofrecer. Cada cambio posterior es un **diff versionado** que el dueño aprueba y puede revertir.',
      flows: ['dueno>registry'],
      data: {
        title: 'cambio aprobado por el dueño (forma ilustrativa)',
        lang: 'json',
        content: json({
          tool: 'trip-receipts/GetReceipt',
          version: 2,
          diff: {
            description: {
              antes: '[borrador LLM] Devuelve el recibo de un viaje: tarifa, impuestos y método de pago.',
              despues: 'Recibo de un viaje ya finalizado. Úsala solo con un trip_id que el usuario te dio; no sirve para viajes en curso.',
            },
            habilitada: { antes: false, despues: true },
          },
          aprobado_por: 'equipo-recibos',
          rollback_a: 1,
        }),
        hl: ['"habilitada"', '"aprobado_por"', '"rollback_a"'],
      },
      code: { file: 'crawler', hl: ['def aprobar_cambio', 'aprobado_por=revisor', 'rollback'] },
    },
    {
      title: '3 · Config al data plane',
      body: 'El proxy no consulta el registro en cada llamada: guarda un **snapshot en memoria** y lo refresca a intervalos. Una tool recién habilitada aparece sin redeploy.',
      flows: ['registry>proxy'],
      data: {
        title: 'snapshot que mantiene el proxy (forma ilustrativa)',
        lang: 'yaml',
        content: `trip-receipts:            # servidor virtual → /trip-receipts/mcp
  GetReceipt:
    origen: idl
    servicio: receipts
    metodo: ReceiptService.GetReceipt
    protocolo: grpc
    politica: servidor          # override por tool posible
# las tools con habilitada: false no entran al snapshot`,
        hl: ['GetReceipt:', 'habilitada: false'],
      },
      code: { file: 'proxy', hl: ['CONFIG = {}', 'def refrescar_config', 'solo_habilitadas=True'] },
    },
    {
      title: '4 · Llamada y autorización',
      body: 'El agente invoca la tool en el endpoint del servidor virtual. El gateway resuelve la tool en su snapshot y consulta el **control de acceso a nivel de tool** para esa identidad (persona, servicio o agente).',
      flows: ['agente>proxy', 'proxy>acs', 'acs>proxy'],
      data: {
        title: 'POST /trip-receipts/mcp (ilustrativo)',
        lang: 'http',
        content: `POST /trip-receipts/mcp HTTP/1.1
Authorization: Bearer <identidad del agente o del usuario>
Content-Type: application/json

{"jsonrpc": "2.0", "id": 41, "method": "tools/call",
 "params": {"name": "GetReceipt", "arguments": {"trip_id": "t-90211"}}}

# decisión del control de acceso (forma ilustrativa)
# llamador=agente:soporte-reembolsos  servidor=trip-receipts  tool=GetReceipt
# política del servidor: permitir · override de la tool: ninguno → PERMITIR`,
        hl: ['tools/call', 'PERMITIR'],
      },
      code: { file: 'proxy', hl: ['def manejar_tools_call', 'if tool is None', 'acs.permitir('] },
    },
    {
      title: '5 · Traducir y ejecutar',
      body: 'La llamada MCP se convierte en una petición gRPC/Thrift/HTTP según la IDL y sale por el **sidecar de la malla** existente, con el mismo ruteo que el tráfico entre microservicios.',
      flows: ['proxy>mesh', 'mesh>svc', 'svc>mesh'],
      data: {
        title: 'traducción MCP → gRPC (forma ilustrativa)',
        lang: 'text',
        content: `entrada MCP   tools/call GetReceipt {"trip_id": "t-90211"}
              │  serializar(tool.idl, args)
              ▼
gRPC          receipts.ReceiptService/GetReceipt
              GetReceiptRequest { trip_id: "t-90211" }
              │  sidecar de malla (Muttley)
              ▼
respuesta     GetReceiptResponse { fare: 18.40, tax: 1.62,
                                   rider_phone: "+1 415 555 0134", ... }`,
        hl: ['serializar(tool.idl, args)', 'sidecar de malla'],
      },
      code: { file: 'proxy', hl: ['tool.origen == "idl"', 'mesh.call('] },
    },
    {
      title: '6 · Nativos y terceros',
      body: 'Los servidores MCP nativos se proxifican tal cual. Para terceros como Jira o Google se **reenvía el token del usuario**, que se intercambia por una credencial externa: el agente nunca recibe la credencial de terceros.',
      flows: ['proxy>saas', 'saas>proxy'],
      data: {
        title: 'reenvío a un tercero (forma ilustrativa)',
        lang: 'json',
        content: json({
          tool: 'jira/create_issue',
          origen: 'tercero',
          reenviado: { token_usuario: '<token corporativo del usuario>' },
          intercambio: 'el token del usuario se canjea por una credencial de Jira (no la ve el agente)',
          resultado: { issue: 'SUP-4821', estado: 'creado' },
        }),
        hl: ['"token_usuario"', '"intercambio"'],
      },
      code: { file: 'proxy', hl: ['tool.origen == "tercero"', 'token_usuario=llamador.token', 'mcp_nativo.forward'] },
    },
    {
      title: '7 · Respuesta redactada',
      body: 'Antes de devolver el resultado, el gateway **redacta PII** de la respuesta de la tool. Lo que entra al contexto del agente ya no trae teléfonos ni datos personales que no necesita.',
      flows: ['proxy>agente'],
      data: {
        title: 'resultado JSON-RPC tras la redacción (ilustrativo)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 41,
          result: {
            content: [{ type: 'text', text: '{"fare": 18.40, "tax": 1.62, "rider_phone": "[REDACTADO]"}' }],
            isError: false,
          },
        }),
        hl: ['[REDACTADO]'],
      },
      code: { file: 'proxy', hl: ['redactar_pii(resp)', 'resultado_jsonrpc'] },
    },
    {
      title: '8 · No saturar el contexto',
      body: 'Con cientos de servidores no se pueden cargar todos los esquemas. Uber agregó **Omni MCP** (descubrir servidores, descubrir tools, pedir el esquema, invocar), **proyección de respuestas** (el modelo pide solo los campos que necesita) y *Code Mode* vía `aifx`, el modo por defecto para agentes de código.',
      focus: ['agente', 'proxy'],
      flows: ['agente>proxy: discover_tools', 'proxy>agente'],
      data: {
        title: 'descubrimiento incremental (operaciones según el post; argumentos ilustrativos)',
        lang: 'json',
        content: json([
          { op: 'discover_server', args: { consulta: 'recibos de viaje' }, devuelve: ['trip-receipts'] },
          { op: 'discover_tools', args: { servidor: 'trip-receipts' }, devuelve: ['GetReceipt', 'ListReceipts'] },
          { op: 'get_tool_schema', args: { tool: 'trip-receipts/GetReceipt' } },
          { op: 'invoke_tool', args: { tool: 'trip-receipts/GetReceipt', arguments: { trip_id: 't-90211' }, campos: ['fare', 'tax'] } },
        ]),
        hl: ['discover_server', 'get_tool_schema', '"campos"'],
      },
    },
  ],
}

/* ─────────────────────────── Block ─────────────────────────── */

const BLOCK_SERVER = `# servidor_ventas.py (ilustrativo del playbook de Block; no es su código)
import keyring
from mcp.server import MCPServer
from mcp.types import ToolAnnotations

mcp = MCPServer("ventas-snowflake")
LIMITE_FILAS = 50                     # presupuesto de tokens de la salida

def token_usuario(usuario: str) -> str:
    token = keyring.get_password("ventas-snowflake", usuario)   # keychain del SO
    if token is None:                 # primer uso: OAuth con scopes mínimos
        token = oauth_login(scopes=["snowflake:read"])
        keyring.set_password("ventas-snowflake", usuario, token)
    return token

# Diseñada desde el workflow ("cruzar leads con cuentas"), no espejo de la API.
@mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
def cruzar_leads(emails: list[str], campos: list[str]) -> dict:
    """Cruza una lista de leads con las cuentas en Snowflake.
    Devuelve solo los campos pedidos, máximo 50 filas."""
    filas = snowflake.query(SQL_CRUCE, emails, campos, token=token_usuario(ctx_usuario()))
    return {"filas": filas[:LIMITE_FILAS], "omitidas": max(0, len(filas) - LIMITE_FILAS)}

# Un solo nivel de riesgo por tool: esta escribe, así que va aparte.
@mcp.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=True))
def actualizar_etapa_lead(lead_id: str, etapa: str) -> dict:
    """Cambia la etapa de un lead en el CRM. El cliente pide confirmación."""
    return crm.update(lead_id, etapa=etapa, token=token_usuario(ctx_usuario()))`

export const cpiBlockGoose: IsoSpec = {
  id: 'cpi-block-goose',
  title: 'Block: goose en cada laptop + servidores MCP curados',
  summary:
    'Reconstrucción a partir de publicaciones de Block de 2025 (no es un diagrama oficial). La "plataforma" es sobre todo **distribución y curaduría**: goose llega preinstalado con modelos configurados y un set de servidores MCP internos aprobados; la autorización es OAuth por usuario y el riesgo se marca en cada tool. El servidor de ejemplo aplica el **playbook de diseño** que Block publicó (junio de 2025); el código y los datos son ilustrativos, no de Block.',
  height: 520,
  nodes: [
    { id: 'empleado', label: 'Empleado', sub: '15 funciones', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Block reporta uso en 15 funciones, no solo ingeniería (charla de diciembre de 2025).' },
    { id: 'sw', label: 'Software center', sub: 'instala y actualiza', at: [0, -3.4], shape: 'box', tone: 'infra', icon: 'boxes', info: 'goose se distribuye por el centro de software interno: instalación y actualización automáticas en los equipos de la empresa.' },
    { id: 'devrel', label: 'DevRel interno', sub: 'talleres · canales', at: [0, 3.4], shape: 'person', tone: 'neutral', icon: 'graduation', info: 'Sesiones semanales de formación y canales internos para preguntas y para compartir casos que funcionaron.' },
    { id: 'goose', label: 'goose', sub: 'desktop · CLI · local', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Agente de propósito general open source (hoy en la Agentic AI Foundation). Corre en la máquina del empleado y habla MCP con las herramientas.' },
    { id: 'idp', label: 'OAuth / SSO', sub: 'keychain', at: [3.4, -3.6], shape: 'hex', tone: 'guard', icon: 'key', info: 'OAuth al primer uso, scopes mínimos y tokens en el keychain del sistema. En abril de 2025 el flujo corría dentro de servidores MCP locales, algo que Block llamó solución temporal.' },
    { id: 'review', label: 'Revisión y riesgo', sub: 'read-only vs destructiva', at: [3.4, 3.4], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Cada tool se anota como de solo lectura o destructiva; las destructivas piden confirmación. Algunos servidores limitan qué modelos pueden usarlos.' },
    { id: 'modelos', label: 'Modelos', sub: 'vía Databricks', at: [6.8, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'En 2025 Block usaba Databricks como plataforma de hosting para acceder a modelos de Anthropic y OpenAI mediante endpoints gestionados por la empresa.' },
    { id: 'mcp', label: 'MCP internos', sub: '60+ (jun-2025)', at: [6.8, 0], shape: 'tall', tone: 'tool', icon: 'plug', info: 'Escritos por ingenieros de Block y diseñados desde el workflow, no desde el endpoint. Más de 60 en junio de 2025; una charla posterior habla de más de 100.' },
    { id: 'sistemas', label: 'Sistemas', sub: 'Snowflake · Jira · Slack', at: [10.2, 0], shape: 'cloud', tone: 'tool', icon: 'cloud', info: 'Datos y herramientas de trabajo: Snowflake, GitHub, Jira, Slack, Google Drive y APIs internas (compliance, triage de soporte).' },
  ],
  edges: [
    { from: 'sw', to: 'goose' },
    { from: 'empleado', to: 'goose' },
    { from: 'devrel', to: 'empleado', dashed: true },
    { from: 'goose', to: 'idp', route: 'z' },
    { from: 'goose', to: 'modelos' },
    { from: 'goose', to: 'mcp' },
    { from: 'review', to: 'mcp', dashed: true },
    { from: 'mcp', to: 'sistemas' },
  ],
  code: { server: { title: 'servidor_ventas.py (ilustrativo del patrón)', lang: 'python', source: BLOCK_SERVER } },
  steps: [
    {
      title: '1 · Llega instalado',
      body: 'goose se instala y actualiza solo desde el centro de software, con el proveedor de modelos ya configurado y un **set curado de servidores MCP aprobados**. El empleado no configura nada.',
      flows: ['sw>goose'],
      data: {
        title: 'perfil preconfigurado (ilustrativo; forma aproximada del config.yaml de goose)',
        lang: 'yaml',
        content: `GOOSE_PROVIDER: databricks          # endpoints corporativos (2025)
GOOSE_MODEL: <endpoint-corporativo>
extensions:                         # servidores MCP aprobados por defecto
  ventas-snowflake:
    type: stdio
    cmd: ventas-snowflake-mcp
    enabled: true
  jira:
    type: stdio
    cmd: jira-mcp
    enabled: true
  google-drive:
    type: stdio
    cmd: gdrive-mcp
    enabled: true`,
        hl: ['GOOSE_PROVIDER', 'extensions:'],
      },
    },
    {
      title: '2 · Pedido en lenguaje natural',
      body: 'Alguien de ventas pide cruzar una lista de leads con datos de Snowflake. goose razona con un modelo servido por endpoints corporativos y decide llamar a la tool del servidor curado.',
      flows: ['empleado>goose', 'goose>modelos', 'modelos>goose'],
      data: {
        title: 'messages (ilustrativo)',
        messages: [
          { role: 'user', content: 'Cruza estos 120 leads del evento con nuestras cuentas en Snowflake y dime cuáles ya son clientes.' },
          {
            role: 'assistant',
            note: 'el modelo elige la tool',
            content: [
              { type: 'text', text: 'Cruzo la lista con las cuentas; pido solo los campos necesarios.' },
              { type: 'tool_use', id: 'toolu_01', name: 'cruzar_leads', input: { emails: ['ana@ejemplo.com', '…'], campos: ['cuenta', 'plan', 'es_cliente'] } },
            ],
          },
        ],
        hl: [1],
        newFrom: 1,
      },
      code: { hl: ['def cruzar_leads', 'campos: list[str]'] },
    },
    {
      title: '3 · OAuth al primer uso',
      body: 'La primera vez que la tool necesita acceso se lanza el flujo **OAuth con scopes mínimos**. El token queda en el keychain del sistema operativo, no en un archivo de configuración.',
      flows: ['goose>idp', 'idp>goose'],
      data: {
        title: 'primer uso: autorización (forma ilustrativa)',
        lang: 'http',
        content: `GET /oauth/authorize?response_type=code
    &client_id=ventas-snowflake-mcp
    &scope=snowflake:read
    &redirect_uri=http://127.0.0.1:8765/callback
    &code_challenge=<PKCE> HTTP/1.1
Host: sso.empresa.internal

# tras el login SSO: el token se guarda en el keychain
# keyring.set_password("ventas-snowflake", "ana", "<token>")`,
        hl: ['scope=snowflake:read', 'keyring.set_password'],
      },
      code: { hl: ['keyring.get_password', 'if token is None', 'scopes=["snowflake:read"]', 'keyring.set_password'] },
    },
    {
      title: '4 · Tool con nivel de riesgo',
      body: 'El servidor declara el riesgo con **anotaciones MCP**: la lectura se ejecuta sin fricción; una tool destructiva haría que el cliente pida confirmación. Un solo nivel de riesgo por tool.',
      flows: ['goose>mcp', 'review>mcp'],
      data: {
        title: 'respuesta a tools/list (extracto)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 2,
          result: {
            tools: [
              { name: 'cruzar_leads', description: 'Cruza una lista de leads con las cuentas en Snowflake…', annotations: { readOnlyHint: true } },
              { name: 'actualizar_etapa_lead', description: 'Cambia la etapa de un lead en el CRM…', annotations: { readOnlyHint: false, destructiveHint: true } },
            ],
          },
        }),
        hl: ['"readOnlyHint": true', '"destructiveHint": true'],
      },
      code: { hl: ['readOnlyHint=True))', 'destructiveHint=True))', 'Un solo nivel de riesgo'] },
    },
    {
      title: '5 · Sistemas reales, salida acotada',
      body: 'El servidor consulta Snowflake **con el token del usuario** y devuelve un resultado acotado en tokens: solo los campos pedidos y un tope de filas, con aviso de lo omitido.',
      flows: ['mcp>sistemas', 'sistemas>mcp', 'mcp>goose'],
      data: {
        title: 'resultado de tools/call (ilustrativo)',
        lang: 'json',
        content: json({
          jsonrpc: '2.0',
          id: 3,
          result: {
            structuredContent: {
              filas: [
                { email: 'ana@ejemplo.com', cuenta: 'Panadería Sur', plan: 'Plus', es_cliente: true },
                { email: 'luis@ejemplo.com', cuenta: null, plan: null, es_cliente: false },
              ],
              omitidas: 0,
            },
            isError: false,
          },
        }),
        hl: ['"omitidas"'],
      },
      code: { hl: ['LIMITE_FILAS = 50', 'token=token_usuario', 'filas[:LIMITE_FILAS]'] },
    },
    {
      title: '6 · Adopción por pares',
      body: 'DevRel enseña en sesiones semanales y difunde casos reales por canales internos. Block atribuye la adopción más a historias de colegas que a mandatos.',
      flows: ['devrel>empleado'],
    },
  ],
}

/* ─────────────────────────── Cloudflare ─────────────────────────── */

const CF_PROXY = `// proxy-worker.ts (ilustrativo del patrón; no es el código de Cloudflare)
import { jwtVerify, createRemoteJWKSet } from 'jose'

const JWKS = createRemoteJWKSet(new URL('https://acme.cloudflareaccess.com/cdn-cgi/access/certs'))
const PROVEEDORES: Record<string, [string, string]> = {   // header y secreto por proveedor
  anthropic: ['x-api-key', 'ANTHROPIC_KEY'],
  openai: ['Authorization', 'OPENAI_KEY'],
  'workers-ai': ['Authorization', 'WORKERS_AI_TOKEN'],
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // 1. Identidad: Access ya autenticó; el Worker verifica su JWT
    const jwt = req.headers.get('Cf-Access-Jwt-Assertion')
    if (!jwt) return new Response('sin identidad', { status: 401 })
    const { payload } = await jwtVerify(jwt, JWKS, { audience: env.ACCESS_AUD })

    // 2. Atribución anónima: el gateway ve un UUID estable, no el correo
    const uuid = await uuidAnonimo(String(payload.email), env.SALT)

    // 3. Clave del proveedor del lado servidor (ninguna vive en laptops)
    const url = new URL(req.url)
    const proveedor = url.pathname.split('/')[1]            // /anthropic/v1/messages
    const par = PROVEEDORES[proveedor]
    if (!par) return new Response('proveedor no permitido', { status: 403 })
    const [header, secreto] = par
    const headers = new Headers(req.headers)
    headers.delete('Cf-Access-Jwt-Assertion')
    headers.set(header, header === 'Authorization' ? 'Bearer ' + env[secreto] : env[secreto])
    headers.set('cf-aig-metadata', JSON.stringify({ user: uuid }))

    // 4. Un solo destino: AI Gateway (ruteo, costo, logs)
    return fetch(env.AI_GATEWAY_BASE + url.pathname, { method: req.method, headers, body: req.body })
  },
}`

const CF_AGENTS_MD = `# AGENTS.md (ilustrativo; generado y revisado por el equipo dueño vía MR)

## Cómo compilar y probar
- \`make build\` compila el servicio (Go 1.24)
- \`make test\` corre los tests unitarios; \`make test-integration\` requiere Docker
- Antes de abrir un MR: \`make lint\`

## Qué no tocar
- \`internal/generated/\`: código generado desde protobuf (\`make proto\`)
- \`migrations/\`: las migraciones aplicadas no se editan, se agregan nuevas

## Contexto
- Dueño: equipo edge-config (ver Backstage: component/edge-config-api)
- Dependencias: config-store, auth-service`

export const cpiCloudflare: IsoSpec = {
  id: 'cpi-cloudflare',
  title: 'Cloudflare: Access → proxy Worker → AI Gateway, y MCP tras un portal',
  summary:
    'Reconstrucción a partir del post de Cloudflare del 20 de abril de 2026 (no es un diagrama oficial). Todo el tráfico de IA pasa por **identidad Zero Trust** y un **único proxy** que inyecta las claves de proveedor; las herramientas se agrupan tras un **portal MCP** con un solo OAuth y *Code Mode*. El Worker y el AGENTS.md de los paneles son **ilustrativos del patrón** (usan APIs públicas de Workers y AI Gateway), no el código de Cloudflare.',
  height: 540,
  zones: [{ id: 'mod', label: 'Modelos', from: [8.6, -7.0], to: [12.2, -0.2], tone: 'model' }],
  nodes: [
    { id: 'dev', label: 'Ingeniero', sub: 'OpenCode · Windsurf', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: '3.683 usuarios activos en 30 días (60 % de ~6.100 empleados, 93 % de R&D), según Cloudflare (abril de 2026). Un `opencode auth login` configura proveedores, MCP y permisos.' },
    { id: 'access', label: 'Cloudflare Access', sub: 'Zero Trust · JWT', at: [3.4, 0], shape: 'hex', tone: 'guard', icon: 'lock', info: 'Autenticación y política Zero Trust delante de todo: modelos y herramientas.' },
    { id: 'proxy', label: 'Proxy Worker', sub: 'claves del lado servidor', at: [3.4, -3.4], shape: 'box', tone: 'gateway', icon: 'key', info: 'Valida el JWT de Access, inyecta las claves de proveedor (ninguna vive en laptops) y envía al gateway solo un UUID anónimo para atribuir costo por usuario.' },
    { id: 'aigw', label: 'AI Gateway', sub: '20 M req · 30 días', at: [6.8, -3.4], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Ruteo, observabilidad y control de costo. 241,37 mil millones de tokens en 30 días (auto-reportado, abril de 2026).' },
    { id: 'frontier', label: 'Laboratorios frontera', sub: '91 % de requests', at: [10.6, -5.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'La mayoría del trabajo agéntico complejo sigue en modelos frontera de terceros.' },
    { id: 'wai', label: 'Workers AI', sub: 'Kimi K2.5 · 9 %', at: [10.2, -1.8], shape: 'sphere', tone: 'model', icon: 'cpu', info: 'Modelos abiertos en la red propia, para tareas donde costo y latencia pesan más que la capacidad máxima (p. ej. un agente de seguridad de >7 mil millones de tokens/día).' },
    { id: 'portal', label: 'MCP Server Portal', sub: 'un OAuth · Code Mode', at: [6.8, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Agrupa los servidores MCP tras un solo flujo OAuth. *Code Mode* colapsa las definiciones en dos tools para no gastar contexto: solo las 34 tools de GitLab costaban ~15.000 tokens por request.' },
    { id: 'mcps', label: 'Servidores MCP', sub: '13 · 182+ tools', at: [10.2, 1.6], shape: 'tall', tone: 'tool', icon: 'wrench', info: 'Servidores internos construidos con Agents SDK y workers-oauth-provider, detrás de Access.' },
    { id: 'ctx', label: 'Contexto del repo', sub: 'AGENTS.md · Backstage', at: [3.4, 3.4], shape: 'doc', tone: 'data', icon: 'book', info: 'AGENTS.md generado en ~3.900 repos (revisado por los dueños vía MR) y Backstage como catálogo de servicios, APIs y equipos.' },
    { id: 'review', label: 'AI Code Reviewer', sub: 'GitLab CI · por riesgo', at: [0, 3.4], shape: 'tall', tone: 'agent', icon: 'check', info: 'Un coordinador clasifica cada MR por nivel de riesgo y delega en revisores especializados (seguridad, calidad, docs, rendimiento). También usa el AI Gateway.' },
  ],
  edges: [
    { from: 'dev', to: 'access' },
    { from: 'access', to: 'proxy' },
    { from: 'proxy', to: 'aigw' },
    { from: 'aigw', to: 'frontier', route: 'z' },
    { from: 'aigw', to: 'wai', route: 'z' },
    { from: 'access', to: 'portal' },
    { from: 'portal', to: 'mcps' },
    { from: 'dev', to: 'ctx', dashed: true },
    { from: 'review', to: 'aigw', route: 'arc' },
  ],
  code: {
    proxy: { title: 'proxy-worker.ts (ilustrativo del patrón)', lang: 'ts', source: CF_PROXY },
    agents: { title: 'AGENTS.md (ilustrativo)', lang: 'text', source: CF_AGENTS_MD },
  },
  steps: [
    {
      title: '1 · Identidad primero',
      body: 'El cliente de código se autentica contra Access. Con el mismo login, un endpoint de descubrimiento le entrega la configuración de **proveedores, servidores MCP y permisos**: todos apuntan a la plataforma, no a los proveedores.',
      flows: ['dev>access'],
      data: {
        title: 'configuración que recibe el cliente (forma simplificada, ilustrativa)',
        lang: 'json',
        content: json({
          provider: {
            anthropic: { options: { baseURL: 'https://ai-proxy.acme.internal/anthropic/v1' } },
            'workers-ai': { options: { baseURL: 'https://ai-proxy.acme.internal/workers-ai/v1' } },
          },
          mcp: { portal: { type: 'remote', url: 'https://mcp-portal.acme.internal/mcp' } },
          permission: { edit: 'allow', bash: 'ask' },
        }),
        hl: ['ai-proxy.acme.internal/anthropic', '"mcp"'],
      },
    },
    {
      title: '2 · Un único proxy',
      body: 'El Worker valida el JWT de Access, añade la **clave del proveedor** del lado servidor y reemplaza la identidad por un **UUID anónimo** para atribuir costo. Cambiar de modelo o de proveedor no toca la configuración de los clientes.',
      flows: ['access>proxy', 'proxy>aigw'],
      data: {
        title: 'lo que entra y lo que sale del proxy (ilustrativo)',
        lang: 'http',
        content: `# entra (desde el laptop: sin claves de proveedor)
POST /anthropic/v1/messages HTTP/1.1
Host: ai-proxy.acme.internal
Cf-Access-Jwt-Assertion: eyJhbGciOiJSUzI1NiIs…

# sale (hacia AI Gateway)
POST /v1/<account>/<gateway>/anthropic/v1/messages HTTP/1.1
Host: gateway.ai.cloudflare.com
x-api-key: <clave del proveedor, inyectada por el Worker>
cf-aig-metadata: {"user":"6f1c2e9a-…"}`,
        hl: ['Cf-Access-Jwt-Assertion', 'x-api-key', 'cf-aig-metadata'],
      },
      code: { file: 'proxy', hl: ['Cf-Access-Jwt-Assertion', 'jwtVerify(', 'uuidAnonimo(', "headers.set(header", 'cf-aig-metadata'] },
    },
    {
      title: '3 · Elegir modelo',
      body: 'El gateway envía la mayoría del tráfico a modelos frontera (91 % de requests) y una parte a **Workers AI** (9 %) cuando el costo manda. En el Worker ilustrativo, el proxy solo comprueba que el proveedor esté permitido; la observabilidad y el costo quedan en el gateway.',
      flows: ['aigw>frontier', 'aigw>wai'],
      data: {
        title: 'registro de una petición en AI Gateway (forma ilustrativa, valores de ejemplo)',
        lang: 'json',
        content: json({
          provider: 'workers-ai',
          model: 'Kimi K2.5 (modelo abierto en Workers AI)',
          metadata: { user: '6f1c2e9a-…' },
          tokens_in: 18240,
          tokens_out: 912,
          cached: false,
          status: 200,
        }),
        hl: ['"provider"', '"metadata"'],
      },
      code: { file: 'proxy', hl: ['const PROVEEDORES', "'workers-ai'", 'proveedor no permitido', 'AI_GATEWAY_BASE'] },
    },
    {
      title: '4 · Herramientas tras el portal',
      body: 'Las tools internas se descubren y llaman a través del **portal MCP** con un solo OAuth. *Code Mode* colapsa las definiciones en **dos tools**: el agente busca la operación y luego la ejecuta como código, en vez de cargar cientos de esquemas.',
      flows: ['access>portal', 'portal>mcps', 'mcps>portal'],
      data: {
        title: 'tools/list del portal con Code Mode (nombres ilustrativos)',
        lang: 'json',
        content: json({
          antes_sin_code_mode: { servidor: 'gitlab', tools: 34, tokens_por_request: '~15.000 (≈7,5 % de 200k)' },
          con_code_mode: {
            tools: [
              { name: 'buscar_operaciones', description: 'Busca operaciones en los 13 servidores del portal y devuelve sus firmas.' },
              { name: 'ejecutar_codigo', description: 'Ejecuta un script que llama a las operaciones encontradas.' },
            ],
          },
        }),
        hl: ['"tools": 34', 'buscar_operaciones', 'ejecutar_codigo'],
      },
    },
    {
      title: '5 · Contexto local',
      body: 'Sin saber cómo se compila y prueba cada repo, las salidas eran **plausibles pero incorrectas**. AGENTS.md (generado en ~3.900 repos y revisado por el dueño vía MR) y Backstage aportan ese contexto. Uno desactualizado resultó peor que no tenerlo.',
      flows: ['dev>ctx'],
      code: { file: 'agents', hl: ['## Cómo compilar y probar', '## Qué no tocar', 'Backstage'] },
    },
    {
      title: '6 · Enforcement en CI',
      body: 'El revisor automático corre en cada MR: un coordinador **clasifica por riesgo** y delega en revisores especializados. Consume el mismo AI Gateway, con su costo atribuido, y avisa cuando hay que actualizar el AGENTS.md.',
      flows: ['review>aigw'],
      data: {
        title: 'decisión del coordinador (forma ilustrativa)',
        lang: 'json',
        content: json({
          merge_request: '!48213',
          riesgo: 'alto',
          motivo: 'toca autenticación y una migración de esquema',
          revisores: ['seguridad', 'calidad', 'rendimiento'],
          omitidos: ['documentacion'],
          aviso: 'AGENTS.md no menciona el nuevo comando make test-integration',
        }),
        hl: ['"riesgo"', '"revisores"', 'AGENTS.md'],
      },
    },
  ],
}

/* ─────────────────────────── Deutsche Telekom ─────────────────────────── */

const LMOS_CRDS = `# Recursos de Eclipse LMOS (ilustrativo; forma simplificada de los CRDs)
# Agent: lo crea el LMOS Operator al instalar el agente
apiVersion: lmos.eclipse/v1
kind: Agent
metadata:
  name: billing-agent
spec:
  description: Responde preguntas sobre facturas y cobros.
  supportedTenants: [de]
  supportedChannels: [web, app]
  providedCapabilities:
    - name: view-bill
      version: 1.1.0
    - name: explain-charge
      version: 1.0.0
---
# Channel: declara qué capacidades necesita el canal
apiVersion: lmos.eclipse/v1
kind: Channel
metadata:
  name: de-web
spec:
  requiredCapabilities:
    - name: view-bill
      version: ">=1.0.0"
    - name: explain-charge
      version: ">=1.0.0"
    - name: change-tariff
      version: ">=2.0.0"
# Si alguna capacidad no se resuelve, el channel no se activa.`

export const cpiTelekomLmos: IsoSpec = {
  id: 'cpi-telekom-lmos',
  title: 'Deutsche Telekom: LMOS, agentes como recursos de Kubernetes',
  summary:
    'Reconstrucción a partir de InfoQ (febrero de 2025) y la documentación de Eclipse LMOS (no es un diagrama oficial). Cada agente es un microservicio de un dominio; el **LMOS Operator** los registra como recursos `Agent` y resuelve qué agentes forman cada `Channel`; el **router** elige el agente por capacidades. Los YAML y JSON de los paneles siguen la forma de los CRDs documentados por Eclipse LMOS, simplificada; los nombres y valores son ilustrativos.',
  height: 540,
  zones: [{ id: 'k8s', label: 'Kubernetes + Istio', from: [1.8, -5.0], to: [11.8, 5.0], tone: 'infra' }],
  nodes: [
    { id: 'cliente', label: 'Cliente', sub: 'chat · voz · ~10 países', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Clientes de Frag Magenta en las filiales europeas, en varios idiomas y canales.' },
    { id: 'canal', label: 'Channel', sub: 'Frag Magenta OneBOT', at: [3.4, 0], shape: 'box', tone: 'protocol', icon: 'message', info: 'Un `Channel` agrupa agentes por tenant o tarea y declara las capacidades que necesita, con restricción de versión (p. ej. `>=1.0.0`).' },
    { id: 'router', label: 'LMOS Router', sub: 'elige por capacidad', at: [6.8, 0], shape: 'diamond', tone: 'gateway', icon: 'split', info: 'Usa los metadatos de los agentes (capacidades, ejemplos) para enviar cada consulta al agente más adecuado.' },
    { id: 'operator', label: 'LMOS Operator', sub: 'CRDs Agent · Channel', at: [6.8, -3.4], shape: 'box', tone: 'infra', icon: 'layers', info: 'Al instalar un agente, guarda su descripción y crea un recurso `Agent`. Al aplicar un `Channel`, resuelve capacidades y genera un `ChannelRouting`. Si falta una capacidad, el channel no se activa.' },
    { id: 'registry', label: 'Registro de agentes', sub: 'Thing Description (WoT)', at: [3.4, -3.4], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Metadatos de cada agente basados en la Thing Description del W3C Web of Things.' },
    { id: 'billing', label: 'Agente facturación', sub: 'ARC · Kotlin', at: [10.2, -3.4], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Primer agente con tool calling (febrero de 2024). Un dominio por agente limita el radio de impacto de un prompt roto.' },
    { id: 'contrato', label: 'Agente contratos', sub: 'microservicio aislado', at: [10.2, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Agentes de dominio que pasaron de 2 meses a 10 días de desarrollo, según los autores (febrero de 2025).' },
    { id: 'nonarc', label: 'Agente no-ARC', sub: 'Python · LangChain', at: [10.2, 3.4], shape: 'tall', tone: 'agent', icon: 'bot', info: 'La plataforma acepta agentes en otros frameworks si cumplen sus especificaciones.' },
    { id: 'search', label: 'Search API', sub: 'RAG fuera del agente', at: [6.8, 3.4], shape: 'stack', tone: 'data', icon: 'search', info: 'Los pipelines de RAG viven en una API de búsqueda compartida, no dentro de cada agente.' },
  ],
  edges: [
    { from: 'cliente', to: 'canal' },
    { from: 'canal', to: 'router' },
    { from: 'router', to: 'billing', route: 'z' },
    { from: 'router', to: 'contrato' },
    { from: 'router', to: 'nonarc', route: 'z' },
    { from: 'operator', to: 'registry' },
    { from: 'operator', to: 'router', dashed: true },
    { from: 'contrato', to: 'search', route: 'arc' },
  ],
  code: { crds: { title: 'lmos-recursos.yaml (ilustrativo, forma simplificada)', lang: 'yaml', source: LMOS_CRDS } },
  steps: [
    {
      title: '1 · Instalar un agente',
      body: 'Al desplegar el agente de facturación, el operator guarda su descripción (basada en la **Thing Description** del W3C) en el registro y crea un recurso `Agent` con sus **capacidades versionadas**.',
      flows: ['operator>registry'],
      focus: ['operator', 'registry', 'billing'],
      data: {
        title: 'descripción del agente (estilo Thing Description, simplificada e ilustrativa)',
        lang: 'json',
        content: json({
          '@context': 'https://www.w3.org/2022/wot/td/v1.1',
          id: 'urn:lmos:agent:billing-agent',
          title: 'billing-agent',
          description: 'Responde preguntas sobre facturas y cobros.',
          capabilities: [
            { name: 'view-bill', version: '1.1.0', examples: ['¿Cuánto es mi factura de este mes?'] },
            { name: 'explain-charge', version: '1.0.0', examples: ['¿Qué es este cargo de 4,99 €?'] },
          ],
        }),
        hl: ['"@context"', '"capabilities"'],
      },
      code: { hl: ['kind: Agent', 'providedCapabilities:', 'version: 1.1.0'] },
    },
    {
      title: '2 · Resolver el channel',
      body: 'El channel declara qué capacidades necesita y con qué versión. El operator busca agentes que las cumplan y genera el `ChannelRouting` para el router. Si una capacidad no se resuelve, **el channel no se activa**.',
      flows: ['registry>operator', 'operator>router'],
      data: {
        title: 'ChannelRouting generado (forma simplificada, ilustrativa)',
        lang: 'yaml',
        content: `apiVersion: lmos.eclipse/v1
kind: ChannelRouting
metadata:
  name: de-web
spec:
  capabilityGroups:
    - name: billing-agent
      capabilities:
        - name: view-bill
          requiredVersion: ">=1.0.0"
          providedVersion: 1.1.0
        - name: explain-charge
          requiredVersion: ">=1.0.0"
          providedVersion: 1.0.0
    - name: contract-agent
      capabilities:
        - name: change-tariff
          requiredVersion: ">=2.0.0"
          providedVersion: 2.0.3`,
        hl: ['kind: ChannelRouting', 'providedVersion: 1.1.0'],
      },
      code: { hl: ['kind: Channel', 'requiredCapabilities:', 'version: ">=2.0.0"', 'el channel no se activa'] },
    },
    {
      title: '3 · Consulta del cliente',
      body: 'Un cliente pregunta por un cobro en su factura. Entra por el channel de su país y canal.',
      flows: ['cliente>canal', 'canal>router'],
      data: {
        title: 'mensaje entrante (forma ilustrativa)',
        lang: 'json',
        content: json({ tenant: 'de', channel: 'web', conversationId: 'c-77a1', text: 'Warum habe ich diesen Monat 4,99 € mehr bezahlt?', locale: 'de-DE' }),
        hl: ['"tenant"', '"channel"'],
      },
    },
    {
      title: '4 · Ruteo por capacidad',
      body: 'El router compara la consulta con las capacidades y ejemplos del `ChannelRouting` y elige el agente de facturación. Cada dominio es un microservicio aislado con su propio ciclo de releases.',
      flows: ['router>billing', 'billing>router'],
      data: {
        title: 'decisión del router (forma ilustrativa)',
        lang: 'json',
        content: json({
          capacidad: 'explain-charge',
          agente: 'billing-agent',
          version: '1.0.0',
          descartados: [{ agente: 'contract-agent', motivo: 'no ofrece explain-charge' }],
        }),
        hl: ['"capacidad"', '"agente"'],
      },
      code: { hl: ['name: explain-charge', 'supportedChannels'] },
    },
    {
      title: '5 · Conocimiento compartido',
      body: 'Los agentes consultan la **Search API** para RAG; el conocimiento no se duplica dentro de cada agente.',
      flows: ['contrato>search', 'search>contrato'],
      data: {
        title: 'consulta a la Search API (forma ilustrativa)',
        lang: 'http',
        content: `POST /search HTTP/1.1
Host: search-api.lmos.svc
Content-Type: application/json

{"tenant": "de", "query": "Kündigungsfrist Mobilfunkvertrag", "top_k": 5}`,
        hl: ['POST /search'],
      },
    },
    {
      title: '6 · Rollout y rollback',
      body: 'Como channels y agentes declaran versiones, se puede liberar o revertir un agente sin tocar los demás: subir `billing-agent` a una versión nueva o volver a la anterior cambia solo su recurso. Aun así, el ritmo quedó limitado a **~2 agentes por semana** por pruebas y seguridad.',
      focus: ['operator', 'billing', 'contrato', 'nonarc'],
      data: {
        title: 'rollback de un agente (forma ilustrativa)',
        lang: 'yaml',
        content: `# billing-agent 1.2.0 falla en pruebas del canal → volver a 1.1.0
providedCapabilities:
  - name: view-bill
-   version: 1.2.0
+   version: 1.1.0
# el channel pide >=1.0.0: sigue resuelto y activo
# contract-agent y los demás no se tocan`,
        hl: ['+   version: 1.1.0', 'sigue resuelto'],
      },
      code: { hl: ['version: ">=1.0.0"', 'version: 1.1.0'] },
    },
  ],
}

/* ─────────────────────────── LinkedIn ─────────────────────────── */

const LI_PROTO = `// agente.proto (ilustrativo: LinkedIn no publicó sus opciones proto3)
syntax = "proto3";
import "plataforma/agentes/opciones.proto";   // opciones de la plataforma (nombre ilustrativo)

service AsistenteContratacion {
  option (plataforma.agente) = { nombre: "hiring-assistant" };
  // el agent lifecycle service traduce cada mensaje en esta llamada
  rpc ProcesarMensaje(MensajeEntrante) returns (stream MensajeSaliente);
}

message MensajeEntrante {
  string conversacion_id = 1;
  int64 secuencia = 2;          // orden FIFO que garantiza la mensajería
  string remitente = 3;
  string texto = 4;
}

message MensajeSaliente {
  string conversacion_id = 1;
  string fragmento = 2;         // respuesta incremental (streaming)
  bool final = 3;
}`

const LI_SUPERVISOR = `# supervisor.py (ilustrativo del patrón; no es código de LinkedIn)
from opentelemetry import trace

tracer = trace.get_tracer("agentes")

def ProcesarMensaje(msg, ctx):                       # lo invoca el lifecycle service
    with tracer.start_as_current_span("invoke_agent hiring-assistant"):
        skills = skill_registry.buscar(tarea=msg.texto)        # qué agentes/skills existen
        hechos = memoria.experiencial.leer(usuario=msg.remitente)   # preferencias
        dialogo = memoria.conversacional.leer(msg.conversacion_id)  # historial
        for paso in planificar(msg.texto, skills, hechos, dialogo):
            resultado = invocar_subagente(paso)       # tools internas vía tool calling
            yield MensajeSaliente(conversacion_id=msg.conversacion_id,
                                  fragmento=resumen(resultado), final=False)
        memoria.experiencial.escribir(usuario=msg.remitente, hechos=extraer_hechos(dialogo))
        yield MensajeSaliente(conversacion_id=msg.conversacion_id, fragmento="", final=True)`

export const cpiLinkedin: IsoSpec = {
  id: 'cpi-linkedin',
  title: 'LinkedIn: la mensajería como orquestador de agentes',
  summary:
    'Reconstrucción a partir del post de LinkedIn Engineering del 10 de septiembre de 2025 (no es un diagrama oficial). En vez de un orquestador nuevo, LinkedIn reutilizó su **sistema de mensajería** (orden, historial, reintentos) y puso un **agent lifecycle service** que traduce mensajes a llamadas gRPC hacia los agentes. El `.proto`, el supervisor y los payloads son **ilustrativos del patrón**: LinkedIn no publicó su esquema ni sus opciones de plataforma.',
  height: 520,
  nodes: [
    { id: 'usuario', label: 'Usuario', sub: 'producto LinkedIn', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Por ejemplo, un reclutador usando Hiring Assistant, el primer agente en producción sobre esta plataforma.' },
    { id: 'front', label: 'Frontend API', sub: 'librería compañera', at: [3.4, 0], shape: 'box', tone: 'infra', icon: 'server', info: 'Expone endpoints de mensajería, recuperación de respuestas y autorización. Las librerías cliente manejan streaming, sincronización entre dispositivos y fallbacks.' },
    { id: 'msg', label: 'Mensajería', sub: 'FIFO · historial · retries', at: [6.8, 0], shape: 'cylinder', tone: 'data', icon: 'message', info: 'El mismo sistema que mueve los mensajes de LinkedIn: persiste, ordena y reintenta la entrega (online y nearline).' },
    { id: 'life', label: 'Agent lifecycle', sub: 'mensajes ↔ gRPC', at: [6.6, -3.0], shape: 'hex', tone: 'gateway', icon: 'repeat', info: 'Servicio central que crea, actualiza y recupera mensajes e invoca el endpoint RPC del agente correcto. Los desarrolladores no tocan la mensajería directamente.' },
    { id: 'skills', label: 'Skill registry', sub: 'hacia MCP y A2A', at: [3.4, -3.4], shape: 'stack', tone: 'protocol', icon: 'list', info: 'Registro de agentes y skills con su metadata e invocación. LinkedIn dijo estar migrando de este registro propietario hacia protocolos abiertos.' },
    { id: 'super', label: 'Supervisor', sub: 'gRPC · LangGraph', at: [10.4, -3.4], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Los agentes se definen como servicios gRPC con opciones proto3 de la plataforma y se registran con un plugin de build.' },
    { id: 'subag', label: 'Subagentes', sub: 'tools internas', at: [10.2, 0], shape: 'tall', tone: 'agent', icon: 'boxes', info: 'Especialistas que el supervisor coordina; acceden a servicios de LinkedIn mediante tool calling.' },
    { id: 'mem', label: 'Memoria', sub: 'experiencial + diálogo', at: [10.2, 3.4], shape: 'cylinder', tone: 'memory', icon: 'brain', info: 'Memoria experiencial (hechos, preferencias) y conversacional, separadas por diseño.' },
    { id: 'obs', label: 'OTel + evaluación', sub: 'LangSmith en pre-prod', at: [6.8, 3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'LangSmith para trazas y evals antes de producción; OpenTelemetry en producción. Las trazas alimentan evaluación offline y pruebas de regresión.' },
  ],
  edges: [
    { from: 'usuario', to: 'front' },
    { from: 'front', to: 'msg' },
    { from: 'msg', to: 'life', route: 'z' },
    { from: 'life', to: 'super' },
    { from: 'super', to: 'skills', route: 'arc' },
    { from: 'super', to: 'subag', route: 'z' },
    { from: 'subag', to: 'mem', route: 'z' },
    { from: 'subag', to: 'obs', dashed: true },
  ],
  code: {
    proto: { title: 'agente.proto (ilustrativo)', lang: 'text', source: LI_PROTO },
    supervisor: { title: 'supervisor.py (ilustrativo del patrón)', lang: 'python', source: LI_SUPERVISOR },
  },
  steps: [
    {
      title: '1 · El pedido es un mensaje',
      body: 'La solicitud del usuario no abre una sesión con el agente: entra como **mensaje** y queda persistida con orden e historial, igual que un mensaje entre personas.',
      flows: ['usuario>front', 'front>msg'],
      data: {
        title: 'mensaje persistido (forma ilustrativa)',
        lang: 'json',
        content: json({
          conversacion_id: 'conv-5521',
          secuencia: 18,
          remitente: 'reclutador:8812',
          destinatario: 'agente:hiring-assistant',
          texto: 'Busca 20 candidatos de ingeniería de datos en Santiago para la vacante 3301.',
          entrega: { estado: 'pendiente', reintentos: 0 },
        }),
        hl: ['"secuencia"', '"entrega"'],
      },
    },
    {
      title: '2 · Entrega al agente',
      body: 'El lifecycle service toma el mensaje e invoca el endpoint gRPC del agente. Si la entrega falla, la **mensajería reintenta**: no hay que reimplementar colas ni reintentos en cada agente.',
      flows: ['msg>life', 'life>super'],
      data: {
        title: 'llamada gRPC del lifecycle service (ilustrativa)',
        lang: 'text',
        content: `AsistenteContratacion/ProcesarMensaje
MensajeEntrante {
  conversacion_id: "conv-5521"
  secuencia: 18
  remitente: "reclutador:8812"
  texto: "Busca 20 candidatos de ingeniería de datos…"
}
→ si falla: la mensajería reintenta la entrega (estado: pendiente)`,
        hl: ['ProcesarMensaje', 'reintenta'],
      },
      code: { file: 'proto', hl: ['service AsistenteContratacion', 'rpc ProcesarMensaje', 'int64 secuencia'] },
    },
    {
      title: '3 · Descubrir skills',
      body: 'El supervisor consulta el registro para saber qué agentes y skills existen y cómo invocarlos. LinkedIn declaró que migra este registro propietario hacia **MCP y A2A**.',
      flows: ['super>skills', 'skills>super'],
      data: {
        title: 'entrada del skill registry (forma ilustrativa)',
        lang: 'json',
        content: json({
          skill: 'buscar_candidatos',
          agente: 'sourcing',
          descripcion: 'Genera y ejecuta búsquedas de candidatos para una vacante.',
          invocacion: { tipo: 'grpc', servicio: 'SourcingAgent/Buscar' },
          dueno: 'equipo-talent-ai',
        }),
        hl: ['"invocacion"'],
      },
      code: { file: 'supervisor', hl: ['skill_registry.buscar'] },
    },
    {
      title: '4 · Delegar y recordar',
      body: 'Los subagentes ejecutan con herramientas internas. La memoria **experiencial** (hechos, preferencias) y la **conversacional** (historial) se leen y escriben por separado, por diseño.',
      flows: ['super>subag', 'subag>mem'],
      data: {
        title: 'las dos memorias (forma ilustrativa)',
        lang: 'json',
        content: json({
          experiencial: { usuario: 'reclutador:8812', hechos: ['prefiere candidatos con Spark', 'no contactar fuera de Chile'] },
          conversacional: { conversacion_id: 'conv-5521', ultimos_turnos: 6 },
        }),
        hl: ['"experiencial"', '"conversacional"'],
      },
      code: { file: 'supervisor', hl: ['memoria.experiencial.leer', 'memoria.conversacional.leer', 'invocar_subagente(paso)'] },
    },
    {
      title: '5 · Respuesta incremental',
      body: 'Las respuestas vuelven como **mensajes** y el cliente las recibe en streaming, sincronizadas entre dispositivos. Para experiencias interactivas se añadió después un modo **síncrono**.',
      flows: ['subag>super', 'super>life', 'life>msg', 'msg>front', 'front>usuario'],
      data: {
        title: 'stream de MensajeSaliente (ilustrativo)',
        lang: 'json',
        content: json([
          { conversacion_id: 'conv-5521', fragmento: 'Busqué con 3 combinaciones de filtros…', final: false },
          { conversacion_id: 'conv-5521', fragmento: 'Encontré 23 perfiles; te muestro los 20 más afines.', final: false },
          { conversacion_id: 'conv-5521', fragmento: '', final: true },
        ]),
        hl: ['"final": true'],
      },
      code: { file: 'supervisor', hl: ['yield MensajeSaliente', 'final=True'] },
    },
    {
      title: '6 · Trazas a evaluación',
      body: 'En producción, cada invocación deja una traza **OpenTelemetry**; esas trazas alimentan evaluaciones offline y pruebas de regresión antes del siguiente cambio de prompt. En pre-producción se usa LangSmith.',
      flows: ['subag>obs'],
      data: {
        title: 'span OpenTelemetry (atributos gen_ai.*, valores ilustrativos)',
        lang: 'json',
        content: json({
          name: 'invoke_agent hiring-assistant',
          attributes: {
            'gen_ai.operation.name': 'invoke_agent',
            'gen_ai.agent.name': 'hiring-assistant',
            'gen_ai.usage.input_tokens': 9120,
            'gen_ai.usage.output_tokens': 640,
          },
          destino: ['evaluación offline', 'set de regresión'],
        }),
        hl: ['"gen_ai.operation.name"', '"destino"'],
      },
      code: { file: 'supervisor', hl: ['tracer.start_as_current_span'] },
    },
  ],
}

/* ─────────────────────────── Blueprint (síntesis) ─────────────────────────── */

// Bloques de la página "Arquitectura de referencia", sin cambios.
const BP_AGENT = `import os
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

const BP_GATEWAY = `model_list:
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

export const cpiBlueprint: IsoSpec = {
  id: 'cpi-blueprint',
  title: 'Blueprint de plataforma interna de agentes (síntesis)',
  summary:
    '**Síntesis propia** de los cinco casos, no la arquitectura de ninguna empresa. Con ejemplos de ADK + AI gateway + Bedrock (cada pieza tiene equivalentes en otras nubes): un camino pavimentado para crear agentes, un **AI gateway** y un **gateway MCP** como únicos caminos hacia modelos y sistemas, **identidad por agente**, un **registro de agentes**, y trazas + evaluaciones como contrato para pasar a producción. El código son los bloques de la [arquitectura de referencia](/guia/arquitectura-de-referencia) (un ejemplo, no "tu stack"); los payloads son ilustrativos.',
  height: 560,
  nodes: [
    { id: 'equipos', label: 'Equipos de producto', sub: 'ADK · Strands · LangGraph', at: [0, 0], shape: 'person', tone: 'user', icon: 'users', info: 'Cientos de equipos con frameworks distintos. La plataforma no les impone uno: les impone los caminos hacia modelos, herramientas e identidad.' },
    { id: 'golden', label: 'Portal / CLI', sub: 'plantillas · golden path', at: [0, -3.4], shape: 'box', tone: 'neutral', icon: 'terminal', info: 'Como el `aifx` de Uber o el login de OpenCode en Cloudflare: un comando deja el agente o el cliente con gateway, MCP y permisos configurados.' },
    { id: 'runtime', label: 'Runtime de agentes', sub: 'AgentCore · K8s', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'AgentCore Runtime, Kubernetes (como LMOS) o el laptop del empleado (como goose). Lo importante: aislamiento por sesión y despliegue versionado con rollback.' },
    { id: 'catalog', label: 'Registro de agentes', sub: 'dueño · versión · A2A', at: [3.4, -3.4], shape: 'stack', tone: 'data', icon: 'list', info: 'Qué agentes existen, quién es dueño, qué capacidades ofrece y qué versión está activa. Equivale al skill registry de LinkedIn o a los recursos `Agent` de LMOS.' },
    { id: 'idp', label: 'Identidad', sub: 'IdP · OAuth · por agente', at: [3.4, 3.4], shape: 'hex', tone: 'guard', icon: 'key', info: 'Cada agente con identidad propia y, cuando actúa por alguien, con el token del usuario. Sin secretos en el código ni en laptops.' },
    { id: 'llmgw', label: 'AI gateway', sub: 'claves · presupuestos', at: [6.8, -3.4], shape: 'hex', tone: 'gateway', icon: 'router', info: 'LiteLLM o AgentCore Gateway: API compatible OpenAI, claves por equipo, presupuestos, redacción de PII y atribución de costo. Uber lo tenía en 2024, antes que los agentes.' },
    { id: 'mcpgw', label: 'Gateway MCP', sub: 'registro · política', at: [6.8, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Registro de servidores y tools con dueño, habilitación explícita, autorización por tool, redacción de respuestas y descubrimiento incremental para no saturar contexto.' },
    { id: 'obs', label: 'Trazas y evals', sub: 'OTel · set dorado · costo', at: [6.8, 3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'OpenTelemetry de punta a punta, costo por equipo/agente y evaluaciones offline y online como gate de promoción.' },
    { id: 'modelos', label: 'Modelos', sub: 'Bedrock · Gemini', at: [10.8, -4.5], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Varios proveedores detrás de un alias. Cloudflare manda ~9 % del tráfico a modelos abiertos propios por costo.' },
    { id: 'sistemas', label: 'Sistemas internos', sub: 'APIs · IDL · SaaS', at: [10.2, 0], shape: 'box', tone: 'tool', icon: 'server', info: 'Lo más rápido es convertir las APIs que ya existen (IDL, OpenAPI) en tools, como hizo Uber, en vez de escribir un servidor por sistema.' },
    { id: 'gob', label: 'Gobierno', sub: 'revisión · allowlist', at: [10.2, 3.4], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Revisión de seguridad de servidores MCP, allowlist, detección de "shadow MCP", anotación de riesgo por tool y límites de release.' },
  ],
  edges: [
    { from: 'golden', to: 'equipos' },
    { from: 'equipos', to: 'runtime' },
    { from: 'runtime', to: 'catalog' },
    { from: 'runtime', to: 'idp', route: 'z' },
    { from: 'runtime', to: 'llmgw', route: 'z' },
    { from: 'runtime', to: 'mcpgw' },
    { from: 'llmgw', to: 'modelos' },
    { from: 'mcpgw', to: 'sistemas' },
    { from: 'runtime', to: 'obs', route: 'arc', dashed: true },
    { from: 'gob', to: 'mcpgw', route: 'z', dashed: true },
  ],
  code: {
    agent: { title: 'app/ops_agent/agent.py (de la arquitectura de referencia)', lang: 'python', source: BP_AGENT },
    gateway: { title: 'plataforma-ai-gateway/config.yaml (de la arquitectura de referencia)', lang: 'yaml', source: BP_GATEWAY },
  },
  steps: [
    {
      title: '1 · Camino pavimentado',
      body: 'Un equipo crea un agente desde una plantilla o un comando. Hereda gateway, MCP, identidad y telemetría sin configurarlos a mano: por ejemplo, la plataforma le emite una **clave virtual** con modelos permitidos y presupuesto, y la inyecta como variable de entorno.',
      flows: ['golden>equipos', 'equipos>runtime'],
      data: {
        title: 'crear_clave.sh (de la arquitectura de referencia)',
        lang: 'bash',
        content: `curl -s -X POST "$AI_GATEWAY_URL/key/generate" \\
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H "Content-Type: application/json" \\
  -d '{"models": ["claude-sonnet"], "max_budget": 800, "budget_duration": "30d",
       "tpm_limit": 400000, "rpm_limit": 300,
       "metadata": {"agente": "asistente_operaciones", "centro_costo": "OPS-114"}}'`,
        hl: ['/key/generate', '"max_budget"', '"centro_costo"'],
      },
      code: { file: 'agent', hl: ['api_base=os.environ["AI_GATEWAY_URL"]', 'api_key=os.environ["AI_GATEWAY_KEY"]'] },
    },
    {
      title: '2 · Registrar el agente',
      body: 'El agente queda en el registro con **dueño, versión y estado**. Si otros agentes lo invocan, publica una **Agent Card** de A2A con sus skills; dueño y estado son metadatos del registro, no de la card.',
      flows: ['runtime>catalog'],
      data: {
        title: 'entrada del registro (forma ilustrativa) + Agent Card A2A (extracto)',
        lang: 'json',
        content: json({
          registro: { dueno: 'equipo-operaciones-tiendas', estado: 'produccion', version_activa: '1.4.0', version_anterior: '1.3.2' },
          agent_card: {
            name: 'Asistente de Operaciones',
            description: 'Consulta pedidos, stock y procedimientos de tienda; crea tickets.',
            version: '1.4.0',
            supportedInterfaces: [{ url: 'https://ops.interno/a2a/jsonrpc', protocolBinding: 'JSONRPC', protocolVersion: '1.0' }],
            skills: [{ id: 'estado_pedido', name: 'Estado de pedido', description: 'Responde el estado de un pedido citando el procedimiento.', tags: ['pedidos', 'tiendas'] }],
          },
        }),
        hl: ['"dueno"', '"version_activa"', '"skills"'],
      },
    },
    {
      title: '3 · Identidad propia',
      body: 'El agente obtiene un token del IdP con **su propia identidad**; si actúa en nombre de una persona, el token lleva también al usuario (delegación). Así, el gateway MCP puede decidir por agente **y** por usuario.',
      flows: ['runtime>idp', 'idp>runtime'],
      data: {
        title: 'claims del token del agente (forma ilustrativa, con delegación RFC 8693)',
        lang: 'json',
        content: json({
          iss: 'https://login.empresa.com',
          sub: 'user:jefe.tienda.0412',
          act: { sub: 'agent:asistente_operaciones' },
          aud: 'ops-retail-gateway',
          scope: 'pedidos.leer tickets.crear',
          role: 'jefe_tienda',
          exp: 1794067200,
        }),
        hl: ['"sub"', '"act"', '"role"'],
      },
      code: { file: 'agent', hl: ['headers={"Authorization"'] },
    },
    {
      title: '4 · Modelos por un solo camino',
      body: 'Toda inferencia pasa por el AI gateway: el agente pide un **alias** (`claude-sonnet`), el gateway resuelve el modelo de Bedrock, aplica el guardrail de PII, el fallback regional y atribuye el costo a la clave del equipo.',
      flows: ['runtime>llmgw', 'llmgw>modelos'],
      data: {
        title: 'petición al AI gateway (ilustrativa)',
        lang: 'http',
        content: `POST /v1/chat/completions HTTP/1.1
Host: ai-gateway.plataforma.internal
Authorization: Bearer sk-<clave virtual del equipo>
Content-Type: application/json

{"model": "claude-sonnet",
 "messages": [{"role": "user", "content": "¿Dónde está el pedido 4512?"}]}

# el gateway: alias → bedrock/global.anthropic.claude-sonnet-5-5
#             guardrail pre_call (PII) · fallback eu/us · gasto a la clave`,
        hl: ['"model": "claude-sonnet"', 'alias → bedrock'],
      },
      code: { file: 'gateway', hl: ['model_name: claude-sonnet ', 'bedrock/global.anthropic', 'fallbacks:', 'mode: pre_call'] },
    },
    {
      title: '5 · Herramientas gobernadas',
      body: 'Las tools salen del gateway MCP: el agente solo ve las de su `tool_filter`, y cada llamada pasa por una **política evaluada fuera del código del agente** (en el ejemplo, Cedar en AgentCore Gateway).',
      flows: ['runtime>mcpgw', 'mcpgw>sistemas'],
      data: {
        title: 'tools/call a través del gateway MCP (ilustrativo)',
        lang: 'http',
        content: `POST /mcp HTTP/1.1
Host: <gateway-id>.gateway.bedrock-agentcore.us-east-1.amazonaws.com
Authorization: Bearer eyJ…(token del paso 3)

{"jsonrpc": "2.0", "id": 12, "method": "tools/call",
 "params": {"name": "Pedidos___consultar_pedido", "arguments": {"pedido": "4512"}}}

# política: Pedidos___consultar_pedido → cualquier usuario autenticado
# decisión: PERMITIR · la llamada sigue hacia la API de pedidos`,
        hl: ['Pedidos___consultar_pedido', 'PERMITIR'],
      },
      code: { file: 'agent', hl: ['McpToolset(', 'AGENTCORE_GATEWAY_URL', 'tool_filter=['] },
    },
    {
      title: '6 · Gobierno de servidores',
      body: 'Cada servidor nuevo pasa revisión de seguridad, declara el **riesgo de sus tools** y entra a la allowlist **deshabilitado** hasta que su dueño lo habilita. Lo que no está registrado ("shadow MCP") se detecta y bloquea.',
      flows: ['gob>mcpgw'],
      data: {
        title: 'registro de un servidor MCP (forma ilustrativa)',
        lang: 'yaml',
        content: `servidor: pedidos
dueno: equipo-oms
revision_seguridad: aprobada   # 2026-10-21
tools:
  - nombre: consultar_pedido
    riesgo: solo_lectura
    habilitada: true
  - nombre: emitir_nota_credito
    riesgo: destructiva          # requiere política y confirmación
    habilitada: false            # descubrir no es exponer
shadow_mcp: bloquear_no_registrados`,
        hl: ['riesgo: destructiva', 'habilitada: false', 'shadow_mcp'],
      },
    },
    {
      title: '7 · Medir para promover',
      body: 'Las trazas OpenTelemetry (incluidas las del gateway) dan costo por agente y equipo; el **set dorado** decide si una versión pasa a producción o se revierte a la anterior del registro.',
      flows: ['runtime>obs'],
      data: {
        title: 'gate de promoción (forma ilustrativa, valores de ejemplo)',
        lang: 'json',
        content: json({
          agente: 'asistente_operaciones',
          candidata: '1.5.0',
          set_dorado: { casos: 120, aprobados: 112, umbral: 0.9, resultado: 0.933 },
          costo_por_tarea_usd: { actual: 0.041, candidata: 0.038 },
          decision: 'promover',
        }),
        hl: ['"set_dorado"', '"decision"'],
      },
      code: { file: 'gateway', hl: ['callbacks: ["otel"]', 'database_url'] },
    },
  ],
}
