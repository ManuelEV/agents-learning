import type { IsoSpec } from '../components/iso/types'

export const a2aTareas: IsoSpec = {
  id: 'a2a-tareas',
  title: 'Descubrimiento y ciclo de vida de una tarea A2A',
  summary:
    'Un agente cliente descubre a un agente remoto por su **Agent Card**, se autentica según lo que la card declara y le envía un **mensaje**. El remoto crea una **tarea** que pasa por estados (`SUBMITTED` → `WORKING` → `INPUT_REQUIRED` → `COMPLETED`) y entrega el resultado como **artefactos**. Ninguno ve el código, las herramientas ni la memoria del otro.',
  height: 500,
  zones: [{ id: 'fin', label: 'Equipo de Finanzas', from: [5.6, -5.2], to: [11.6, 1.6], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Ejecutivo comercial', at: [-3.4, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pide: "Ofrécele al cliente C-889 un descuento por el retraso del pedido 4512".' },
    { id: 'client', label: 'Agente cliente', sub: 'orquestador ADK', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'El agente de soporte. No sabe aprobar descuentos: delega en el agente de Finanzas, que es de otro equipo y está escrito en otro framework.' },
    { id: 'idp', label: 'IdP corporativo', sub: 'OAuth 2.0 / OIDC', at: [0, -3.6], shape: 'hex', tone: 'guard', icon: 'key', info: 'Emite el token que exige el `securitySchemes` de la Agent Card. A2A reutiliza esquemas estándar (OAuth2, OIDC, API key, mTLS); v1.0 eliminó los flujos implicit y password.' },
    { id: 'card', label: 'Agent Card', sub: 'firmada (JWS)', at: [3.6, -3.6], shape: 'doc', tone: 'protocol', icon: 'card', info: 'JSON en `/.well-known/agent-card.json`: nombre, skills, capacidades (streaming, push), interfaces soportadas y seguridad. En v1.0 puede ir **firmada** (JWS + JSON canonicalizado RFC 8785).' },
    { id: 'remote', label: 'Agente remoto', sub: 'Finanzas · Strands', at: [7.2, 0], shape: 'tall', tone: 'agent', icon: 'network', info: 'Expone una skill `approve_discount`. Internamente usa sus propias herramientas y reglas; hacia afuera solo habla A2A.' },
    { id: 'store', label: 'Task store', sub: 'estado y artefactos', at: [7.2, -3.6], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Persiste cada tarea con su estado, historial de mensajes y artefactos. Permite `GetTask`, `ListTasks` y reconectarse con `SubscribeToTask`.' },
    { id: 'human', label: 'Jefe de Finanzas', sub: 'aprueba > 10 %', at: [10.6, -1.8], shape: 'person', tone: 'user', icon: 'hand', info: 'Política interna del agente remoto: descuentos sobre 10 % requieren aprobación humana. El cliente no necesita saber cómo se resuelve.' },
    { id: 'hook', label: 'Webhook', sub: 'push notifications', at: [3.6, 3.4], shape: 'box', tone: 'infra', icon: 'mail', info: 'Para tareas que duran horas, el cliente registra un webhook y el remoto le notifica cambios de estado en vez de mantener un stream abierto.' },
  ],
  edges: [
    { from: 'user', to: 'client' },
    { from: 'client', to: 'idp' },
    { from: 'client', to: 'card', route: 'z' },
    { from: 'client', to: 'remote', label: 'SendMessage' },
    { from: 'remote', to: 'store' },
    { from: 'remote', to: 'human', route: 'z' },
    { from: 'remote', to: 'hook', route: 'z', dashed: true },
  ],
  steps: [
    { title: '1 · Descubrir', body: 'El agente cliente descarga `https://finanzas.interno/.well-known/agent-card.json` (o la obtiene de un registry). Verifica la **firma** de la card y lee skills, interfaces y esquemas de seguridad.', flows: ['user>client', 'client>card', 'card>client'] },
    { title: '2 · Autenticarse', body: 'La card exige OIDC: el cliente obtiene un token del IdP corporativo. La identidad viaja en la capa HTTP, no dentro del mensaje.', flows: ['client>idp', 'idp>client'] },
    { title: '3 · Enviar mensaje', body: '`SendStreamingMessage` con un mensaje `role: user` compuesto de **Parts**: texto con la petición y un `data` con `{"order_id": "4512", "customer": "C-889"}`.', flows: ['client>remote'] },
    { title: '4 · SUBMITTED → WORKING', body: 'El remoto crea la tarea (con `id` y `contextId`) y emite por **SSE** los cambios de estado. El cliente puede mostrar progreso.', flows: ['remote>store', 'remote>client'] },
    { title: '5 · INPUT_REQUIRED', body: 'El descuento pedido (15 %) supera el umbral. La tarea pasa a `TASK_STATE_INPUT_REQUIRED` mientras el agente de Finanzas consulta a su jefe; además pide al cliente el monto total del pedido.', flows: ['remote>human', 'remote>client'] },
    { title: '6 · Continuar la misma tarea', body: 'El cliente responde con un nuevo mensaje que referencia el mismo `taskId`. La tarea vuelve a `WORKING`.', flows: ['client>remote', 'human>remote'] },
    { title: '7 · COMPLETED + artefacto', body: 'La tarea termina en `COMPLETED` con un **artefacto** estructurado: descuento aprobado 12 %, código de autorización y vigencia.', flows: ['remote>store', 'remote>client', 'client>user'] },
    { title: '8 · Tareas largas: push', body: 'Si la aprobación tardara horas, el cliente registra un **webhook** y cierra la conexión; el remoto notifica cada cambio de estado.', flows: ['remote>hook'] },
  ],
}

export const a2aCapas: IsoSpec = {
  id: 'a2a-capas',
  title: 'Tres protocolos, tres capas: AG-UI, A2A y MCP',
  summary:
    'Los protocolos de agentes no compiten: cubren **interfaces distintas**. **AG-UI** conecta el agente con la interfaz de usuario, **A2A** conecta agentes entre sí (cajas negras) y **MCP** conecta un agente con sus herramientas y datos.',
  height: 480,
  zones: [
    { id: 'agui', label: 'AG-UI', from: [-1.4, -1.4], to: [4.6, 1.4], tone: 'user' },
    { id: 'mcp', label: 'MCP', from: [5.2, -5.2], to: [11.4, -2.0], tone: 'protocol' },
    { id: 'a2a', label: 'A2A', from: [8.4, -1.4], to: [11.4, 4.8], tone: 'agent' },
  ],
  nodes: [
    { id: 'user', label: 'Usuario', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Interactúa con una app web que muestra el razonamiento, las llamadas a herramientas y pide aprobaciones en tiempo real.' },
    { id: 'ui', label: 'Frontend', sub: 'React · CopilotKit', at: [3.2, 0], shape: 'box', tone: 'user', icon: 'eye', info: '**AG-UI** define un stream de eventos agente → UI (texto incremental, llamadas a tools, cambios de estado) y acciones UI → agente.' },
    { id: 'orch', label: 'Agente orquestador', sub: 'Google ADK', at: [6.6, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Entiende el objetivo, usa sus herramientas por MCP y delega subtareas a otros agentes por A2A.' },
    { id: 'crm', label: 'Servidor MCP CRM', sub: 'tools + resources', at: [6.6, -3.6], shape: 'box', tone: 'protocol', icon: 'plug', info: 'Herramientas deterministas: `get_customer`, `list_orders`. El agente controla cuándo llamarlas y ve sus esquemas.' },
    { id: 'kb', label: 'Servidor MCP KB', sub: 'búsqueda de políticas', at: [9.9, -3.6], shape: 'stack', tone: 'protocol', icon: 'book', info: 'La búsqueda RAG expuesta como tool MCP (por ejemplo, el endpoint MCP de una instancia de AI Search).' },
    { id: 'fin', label: 'Agente Finanzas', sub: 'otro equipo · Strands', at: [9.9, 0], shape: 'tall', tone: 'agent', icon: 'network', info: 'Agente autónomo con su propio modelo, tools y memoria. Se le delega una **tarea**; el orquestador no ve cómo la resuelve.' },
    { id: 'log', label: 'Agente Logística', sub: 'proveedor externo', at: [9.9, 3.4], shape: 'tall', tone: 'agent', icon: 'globe', info: 'Agente de un partner (transportista) publicado con su Agent Card. A2A permite colaborar entre organizaciones sin compartir código.' },
  ],
  edges: [
    { from: 'user', to: 'ui' },
    { from: 'ui', to: 'orch', label: 'eventos' },
    { from: 'orch', to: 'crm' },
    { from: 'orch', to: 'kb', route: 'z' },
    { from: 'orch', to: 'fin', label: 'tarea' },
    { from: 'orch', to: 'log', route: 'x' },
  ],
  steps: [
    { title: 'AG-UI: agente ↔ interfaz', body: 'El usuario conversa con el orquestador desde una app web. AG-UI transmite tokens, llamadas a tools y solicitudes de aprobación como eventos.', flows: ['user>ui', 'ui>orch', 'orch>ui'] },
    { title: 'MCP: agente ↔ herramientas', body: 'El orquestador consulta el CRM y la base de políticas mediante **MCP**: llamadas a funciones con esquema, control total del agente sobre qué y cuándo.', flows: ['orch>crm', 'crm>orch', 'orch>kb', 'kb>orch'] },
    { title: 'A2A: agente ↔ agente (interno)', body: 'La aprobación del descuento se delega como **tarea A2A** al agente de Finanzas: tiene su propia lógica, puede pedir más datos y tardar.', flows: ['orch>fin', 'fin>orch'] },
    { title: 'A2A entre organizaciones', body: 'La reprogramación del despacho se pide al agente del transportista, descubierto por su Agent Card pública. Mismo protocolo, otra empresa.', flows: ['orch>log', 'log>orch'] },
    { title: 'Regla para elegir', body: '¿El otro lado es una función con entrada/salida predecible? **MCP**. ¿Es un agente autónomo con estado y criterio propio? **A2A**. ¿Es una persona frente a una UI? **AG-UI**.', focus: ['crm', 'fin', 'ui'] },
  ],
}
