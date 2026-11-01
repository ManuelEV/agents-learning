import type { IsoSpec } from '../components/iso/types'

export const strandsAgentsAsTools: IsoSpec = {
  id: 'strands-agents-as-tools',
  title: 'Agents as Tools: orquestador y especialistas',
  summary:
    'En el patrón **Agents as Tools** cada especialista es un agente Strands envuelto en una función `@tool`. El orquestador lo ve como cualquier otra herramienta: el modelo decide a cuál llamar, con qué consulta y cuándo terminar. El orquestador **conserva el control** y compone la respuesta final.',
  height: 480,
  nodes: [
    { id: 'user', label: 'Analista comercial', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pide: *"Explícame por qué cayeron las ventas de la tienda Providencia en septiembre y redacta un resumen para gerencia"*.' },
    { id: 'orch', label: 'Orquestador', sub: 'Agent(tools=[...])', at: [3.2, 0], shape: 'tall', tone: 'agent', icon: 'router', info: 'Un `Agent` cuyo `system_prompt` describe cuándo usar cada especialista. Sus herramientas son funciones `@tool` que internamente crean y llaman a otros agentes.' },
    { id: 'model', label: 'Claude en Bedrock', sub: 'global.…sonnet-5-5', at: [3.2, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'El proveedor por defecto de Strands es Amazon Bedrock. Cada agente puede usar un modelo distinto: el orquestador uno más capaz, los especialistas uno más barato.' },
    { id: 'research', label: 'Investigador', sub: '@tool research_assistant', at: [6.8, -3.4], shape: 'tall', tone: 'agent', icon: 'search', scale: 0.85, info: 'Agente especialista con herramientas de búsqueda (p. ej. `http_request` o un servidor MCP de noticias). Devuelve texto con fuentes.' },
    { id: 'data', label: 'Analista de datos', sub: '@tool sales_analyst', at: [6.8, 0], shape: 'tall', tone: 'agent', icon: 'chart', scale: 0.85, info: 'Especialista con acceso de solo lectura al data warehouse vía MCP. Genera consultas SQL y resume los hallazgos.' },
    { id: 'writer', label: 'Redactor', sub: '@tool report_writer', at: [6.8, 3.4], shape: 'tall', tone: 'agent', icon: 'file', scale: 0.85, info: 'Especialista sin herramientas externas: transforma hallazgos en un resumen ejecutivo con el formato corporativo.' },
    { id: 'web', label: 'MCP noticias', sub: 'MCPClient', at: [10.2, -3.4], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Un `MCPClient` pasado directamente en `tools=[...]` del especialista. Strands gestiona el ciclo de vida de la conexión.' },
    { id: 'dwh', label: 'Data warehouse', sub: 'Redshift vía MCP', at: [10.2, 0], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Datos de ventas. El especialista accede con credenciales de solo lectura: el orquestador nunca toca la base directamente.' },
  ],
  edges: [
    { from: 'user', to: 'orch' },
    { from: 'orch', to: 'model', route: 'z' },
    { from: 'orch', to: 'research', route: 'z' },
    { from: 'orch', to: 'data' },
    { from: 'orch', to: 'writer', route: 'z' },
    { from: 'research', to: 'web' },
    { from: 'data', to: 'dwh' },
  ],
  steps: [
    { title: '1 · Objetivo', body: 'El analista plantea una pregunta abierta. El orquestador la recibe con su `system_prompt` de enrutamiento.', flows: ['user>orch'] },
    { title: '2 · El modelo planifica', body: 'El modelo ve tres "herramientas" (los especialistas) con sus docstrings y decide empezar por los datos internos.', flows: ['orch>model', 'model>orch'] },
    { title: '3 · Especialista de datos', body: 'Llama `sales_analyst("ventas Providencia sept vs agosto")`. Ese agente consulta el warehouse por MCP y devuelve un resumen, no filas crudas.', flows: ['orch>data', 'data>dwh', 'dwh>data', 'data>orch'] },
    { title: '4 · Contexto externo', body: 'Para explicar la caída, consulta al investigador, que busca noticias locales (obras viales, competencia) vía un servidor MCP.', flows: ['orch>research', 'research>web', 'web>research', 'research>orch'] },
    { title: '5 · Redacción', body: 'Con ambos hallazgos, el orquestador pide al redactor el resumen ejecutivo. Cada especialista tuvo un contexto limpio y acotado.', flows: ['orch>writer', 'writer>orch'] },
    { title: '6 · Respuesta', body: 'El orquestador entrega el resultado. El costo es mayor que un agente único (varias conversaciones), a cambio de contextos más pequeños y especialistas evaluables por separado.', flows: ['orch>user'] },
  ],
}

export const strandsSwarm: IsoSpec = {
  id: 'strands-swarm',
  title: 'Swarm: handoffs entre agentes',
  summary:
    'En un **Swarm** no hay jefe: los agentes se pasan la tarea entre sí con la herramienta `handoff_to_agent`, que Strands inyecta automáticamente. Todos comparten el historial de quién intervino y un contexto común. Límites como `max_handoffs` y la detección de *ping-pong* evitan loops infinitos.',
  height: 470,
  zones: [{ id: 'swarm', label: 'Swarm (max_handoffs=20)', from: [1.8, -4.8], to: [11.6, 4.9], tone: 'agent' }],
  nodes: [
    { id: 'user', label: 'Equipo de TI', at: [-1.4, 0], shape: 'person', tone: 'user', icon: 'users', info: 'Reporta: *"El checkout devuelve errores 502 desde el despliegue de las 10:00"*.' },
    { id: 'triage', label: 'Triage', sub: 'entry_point', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'filter', info: 'Primer agente del swarm (`entry_point`). Clasifica el incidente y decide a quién entregarlo.' },
    { id: 'logs', label: 'Analista de logs', sub: 'CloudWatch MCP', at: [6.8, -3.2], shape: 'tall', tone: 'agent', icon: 'search', info: 'Especialista con herramientas de lectura sobre logs y métricas. Identifica el patrón de error y la hora de inicio.' },
    { id: 'deploy', label: 'Ingeniero deploy', sub: 'CI/CD tools', at: [10.2, 0], shape: 'tall', tone: 'agent', icon: 'code', info: 'Revisa el pipeline y el diff del despliegue. Puede proponer un rollback, pero la ejecución requiere aprobación humana.' },
    { id: 'comms', label: 'Comunicaciones', sub: 'status page', at: [6.8, 3.2], shape: 'tall', tone: 'agent', icon: 'message', info: 'Redacta la actualización para la status page y el canal de incidentes con el diagnóstico consolidado.' },
    { id: 'shared', label: 'Contexto compartido', sub: 'historial + knowledge', at: [3.4, 3.6], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Cada agente recibe la tarea original, la lista de agentes que ya intervinieron y el conocimiento que dejaron en sus handoffs.' },
  ],
  edges: [
    { from: 'user', to: 'triage' },
    { from: 'triage', to: 'logs', label: 'handoff', route: 'z' },
    { from: 'logs', to: 'deploy', label: 'handoff' },
    { from: 'deploy', to: 'comms', label: 'handoff', route: 'z' },
    { from: 'shared', to: 'triage', dashed: true, route: 'z' },
  ],
  steps: [
    { title: '1 · Entrada al swarm', body: 'El incidente entra por el `entry_point` (Triage). No hay un orquestador central que decida todo el plan.', flows: ['user>triage'] },
    { title: '2 · Primer handoff', body: 'Triage llama `handoff_to_agent(agent_name="logs", message="502 en checkout desde 10:00")`. El control pasa al analista de logs.', flows: ['triage>logs'] },
    { title: '3 · Diagnóstico y handoff', body: 'El analista encuentra timeouts contra el servicio de pagos que empiezan con el deploy y entrega al ingeniero de despliegue con ese contexto.', flows: ['logs>deploy'] },
    { title: '4 · Propuesta de acción', body: 'El ingeniero identifica un cambio de timeout en el diff y propone rollback. Luego entrega a Comunicaciones para informar.', flows: ['deploy>comms'] },
    { title: '5 · Contexto compartido', body: 'Cada agente ve la tarea original, el historial de nodos y el conocimiento compartido. El resultado expone `node_history`, `status` y uso de tokens.', flows: ['shared>triage'], focus: ['shared', 'triage', 'logs', 'deploy', 'comms'] },
    { title: '6 · Límites de seguridad', body: '`max_handoffs`, `max_iterations`, `execution_timeout`, `node_timeout` y la ventana de detección de handoffs repetitivos cortan los loops entre agentes.', focus: ['triage', 'logs', 'deploy', 'comms'] },
  ],
}

export const strandsAgentcore: IsoSpec = {
  id: 'strands-agentcore',
  title: 'Strands en AgentCore Runtime',
  summary:
    'El camino más directo a producción para Strands en AWS: envuelves el agente con `BedrockAgentCoreApp`, lo despliegas con la CLI `agentcore` y obtienes un runtime serverless con aislamiento por sesión, más Memory, Gateway, Identity y observabilidad OTel.',
  height: 480,
  zones: [{ id: 'aws', label: 'Cuenta AWS', from: [4.8, -5.0], to: [11.8, 4.9], tone: 'infra' }],
  nodes: [
    { id: 'dev', label: 'Desarrollador', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Escribe el agente y lo prueba localmente con `agentcore dev`.' },
    { id: 'cli', label: 'agentcore CLI', sub: 'create · dev · deploy', at: [3.0, 0], shape: 'box', tone: 'infra', icon: 'terminal', info: 'CLI v1.0 (`@aws/agentcore`, octubre de 2026): `agentcore create` genera el proyecto, `dev` lo corre local, `deploy` lo publica e `invoke` lo prueba.' },
    { id: 'app', label: 'App cliente', sub: 'InvokeAgentRuntime', at: [3.0, -3.4], shape: 'box', tone: 'user', icon: 'globe', info: 'Tu frontend o backend invoca el agente desplegado por su ARN, con un `runtimeSessionId` por conversación.' },
    { id: 'runtime', label: 'Agente Strands', sub: 'AgentCore Runtime', at: [6.6, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Tu código con `BedrockAgentCoreApp` + `@app.entrypoint`, servido en HTTP 8080 `/invocations`. Cada sesión corre aislada en una microVM.' },
    { id: 'model', label: 'Bedrock', sub: 'Claude · perfil global', at: [6.6, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Modelo por defecto de Strands. El rol de ejecución del runtime necesita permisos sobre el perfil de inferencia y los modelos destino.' },
    { id: 'gateway', label: 'AgentCore Gateway', sub: 'tools MCP', at: [10, -3.4], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Convierte APIs, Lambdas y servidores MCP en herramientas MCP con autenticación unificada y políticas por llamada. Strands lo consume con `MCPClient`.' },
    { id: 'memory', label: 'AgentCore Memory', sub: 'corto y largo plazo', at: [10, 0], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Memoria gestionada: eventos de la sesión y extracción de hechos/preferencias de largo plazo, compartible entre agentes.' },
    { id: 'obs', label: 'Observabilidad', sub: 'OTel → CloudWatch', at: [6.6, 3.4], shape: 'box', tone: 'infra', icon: 'chart', info: 'Strands emite spans OpenTelemetry (ciclo del agente, llamadas al modelo, herramientas). En AgentCore se ven en CloudWatch; fuera, en Langfuse o cualquier backend OTLP.' },
  ],
  edges: [
    { from: 'dev', to: 'cli' },
    { from: 'cli', to: 'runtime', label: 'deploy' },
    { from: 'app', to: 'runtime', route: 'x' },
    { from: 'runtime', to: 'model', route: 'z' },
    { from: 'runtime', to: 'gateway', route: 'z' },
    { from: 'runtime', to: 'memory' },
    { from: 'runtime', to: 'obs', dashed: true, route: 'z' },
  ],
  steps: [
    { title: '1 · Desarrollo local', body: 'El agente se escribe como siempre (`Agent`, `@tool`) y se envuelve con `BedrockAgentCoreApp`. `agentcore dev` lo sirve localmente con el mismo contrato que en la nube.', flows: ['dev>cli'] },
    { title: '2 · Despliegue', body: '`agentcore deploy` empaqueta (CodeZip o contenedor), crea el runtime y su rol IAM. No gestionas servidores ni escalado.', flows: ['cli>runtime'] },
    { title: '3 · Invocación', body: 'La app cliente invoca el runtime con un ID de sesión. AgentCore enruta cada sesión a su propia microVM aislada.', flows: ['app>runtime'] },
    { title: '4 · Modelo y herramientas', body: 'El agente llama a Claude en Bedrock y a herramientas MCP expuestas por AgentCore Gateway, que aplica autenticación y políticas.', flows: ['runtime>model', 'model>runtime', 'runtime>gateway', 'gateway>runtime'] },
    { title: '5 · Memoria', body: 'Historial y preferencias se guardan en AgentCore Memory, así una sesión nueva puede recordar lo relevante de las anteriores.', flows: ['runtime>memory', 'memory>runtime'] },
    { title: '6 · Trazas', body: 'Cada ciclo del agente queda trazado con OpenTelemetry y se analiza en CloudWatch o se exporta a tu backend de observabilidad.', flows: ['runtime>obs', 'runtime>app'] },
  ],
}
