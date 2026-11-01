import type { IsoSpec } from '../components/iso/types'

export const gatewaysLlm: IsoSpec = {
  id: 'gateways-llm',
  title: 'LLM gateway: claves virtuales, presupuestos y fallback',
  summary:
    'Todos los agentes hablan con **un solo endpoint** (compatible OpenAI) usando claves virtuales por equipo. El gateway valida presupuesto y límites, enruta al modelo principal en Bedrock y, ante throttling o caída, hace **fallback** a otro perfil regional u otro proveedor. Cada llamada queda registrada con su costo.',
  height: 500,
  zones: [{ id: 'prov', label: 'Proveedores de modelos', from: [6.0, -5.2], to: [9.2, 5.0], tone: 'model' }],
  nodes: [
    { id: 'ventas', label: 'Agente de ventas', sub: 'ADK · clave sk-ventas', at: [0, -1.8], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Usa `LiteLlm(model="litellm_proxy/claude-sonnet")` con su clave virtual. Nunca ve credenciales de AWS ni de otros proveedores.' },
    { id: 'soporte', label: 'Agente de soporte', sub: 'Strands · sk-soporte', at: [0, 1.8], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Otro equipo, otro framework, mismo gateway. Su clave tiene otro presupuesto y otros modelos permitidos.' },
    { id: 'gw', label: 'LiteLLM Proxy', sub: 'AI gateway corporativo', at: [3.6, 0], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Autentica la clave virtual, verifica modelos permitidos, presupuesto (`max_budget`) y límites tpm/rpm; enruta, reintenta y aplica fallbacks.' },
    { id: 'db', label: 'Postgres', sub: 'claves, equipos, gasto', at: [3.6, 3.6], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Guarda claves virtuales, equipos, presupuestos y el gasto acumulado por clave. Requisito para usar virtual keys en LiteLLM.' },
    { id: 'obs', label: 'Observabilidad', sub: 'Langfuse · OTel', at: [3.6, -3.6], shape: 'box', tone: 'infra', icon: 'chart', info: 'Cada request se registra con equipo, modelo, tokens, latencia y costo. Base para *showback/chargeback* y para detectar abusos.' },
    { id: 'global', label: 'Bedrock global.', sub: 'claude-sonnet-5-5', at: [7.6, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Primario: perfil de inferencia `global.anthropic.claude-sonnet-5-5`. Bedrock ya reparte entre regiones, pero puede devolver throttling si se agota la cuota.' },
    { id: 'eu', label: 'Bedrock eu.', sub: 'otra cuenta / región', at: [7.6, 0], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Fallback 1: perfil geográfico en otra cuenta o región con cuota propia. Revisa residencia de datos antes de cruzar geografías.' },
    { id: 'alt', label: 'Otro proveedor', sub: 'Gemini · Foundry', at: [7.6, 3.4], shape: 'cloud', tone: 'model', icon: 'cloud', info: 'Fallback 2: un modelo comparable de otro proveedor. Solo si tus evals confirman calidad aceptable y el contrato lo permite.' },
  ],
  edges: [
    { from: 'ventas', to: 'gw' },
    { from: 'soporte', to: 'gw' },
    { from: 'gw', to: 'db', route: 'z' },
    { from: 'gw', to: 'obs', route: 'z', dashed: true },
    { from: 'gw', to: 'global', route: 'z' },
    { from: 'gw', to: 'eu' },
    { from: 'gw', to: 'alt', route: 'z' },
  ],
  steps: [
    { title: '1 · Un endpoint, muchas claves', body: 'El agente de ventas llama al gateway con `Authorization: Bearer sk-ventas…` y el alias `claude-sonnet`. No conoce el proveedor real.', flows: ['ventas>gw'] },
    { title: '2 · Autorizar y presupuestar', body: 'El gateway busca la clave: ¿puede usar `claude-sonnet`? ¿le queda presupuesto este mes? ¿está bajo su límite de tpm/rpm? Si no, responde error sin gastar un token.', flows: ['gw>db', 'db>gw'] },
    { title: '3 · Ruta principal', body: 'Enruta a Bedrock con el perfil `global.` usando el rol IAM del gateway. Las credenciales viven solo en el gateway.', flows: ['gw>global', 'global>gw'] },
    { title: '4 · Fallback regional', body: 'Si Bedrock devuelve throttling o error, tras los reintentos el gateway prueba el siguiente despliegue de la lista: el perfil `eu.` en otra cuenta con cuota propia.', flows: ['gw>eu', 'eu>gw'] },
    { title: '5 · Fallback de proveedor', body: 'Como último recurso, un modelo comparable de otro proveedor. Es una decisión de negocio: calidad, contrato y residencia de datos deben estar validados de antemano.', flows: ['gw>alt', 'alt>gw'] },
    { title: '6 · Registrar costo', body: 'La respuesta vuelve al agente y el gasto se suma a la clave y al equipo. Las trazas van a la plataforma de observabilidad.', flows: ['gw>ventas', 'gw>db', 'gw>obs'] },
    { title: '7 · Otro equipo, otras reglas', body: 'El agente de soporte usa el mismo gateway con su propia clave: otros modelos permitidos, otro presupuesto y otros límites.', flows: ['soporte>gw', 'gw>global'] },
  ],
}

export const gatewaysMcp: IsoSpec = {
  id: 'gateways-mcp',
  title: 'Tool / MCP gateway: OAuth, política y auditoría',
  summary:
    'Un **gateway de herramientas** expone APIs internas, Lambdas y servidores MCP de terceros como **un único endpoint MCP**. Valida el token del agente, evalúa una **política** en cada llamada a herramienta, obtiene credenciales hacia cada sistema y audita todo.',
  height: 500,
  zones: [{ id: 'back', label: 'Sistemas de destino', from: [6.0, -5.2], to: [9.2, 5.0], tone: 'tool' }],
  nodes: [
    { id: 'agent', label: 'Agente', sub: 'ADK en AgentCore Runtime', at: [0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Conoce una sola URL MCP. Recibe la lista de tools que su identidad puede usar, ya filtrada.' },
    { id: 'idp', label: 'IdP', sub: 'Okta · Entra ID · Cognito', at: [0, -3.6], shape: 'hex', tone: 'guard', icon: 'key', info: 'Emite el token del agente (o del usuario en nombre de quien actúa) con audiencia = gateway.' },
    { id: 'gw', label: 'Tool gateway', sub: 'AgentCore Gateway', at: [3.6, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Termina OAuth (inbound), agrega herramientas de varios orígenes bajo un endpoint MCP y gestiona credenciales salientes (outbound) por destino.' },
    { id: 'policy', label: 'Policy', sub: 'Cedar · por tool call', at: [3.6, -3.6], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Reglas deterministas evaluadas en cada llamada: "soporte puede `issue_refund` solo si `amount <= 200`". Fuera del modelo, no se puede saltar con un prompt.' },
    { id: 'audit', label: 'Auditoría', sub: 'CloudWatch · OTel', at: [3.6, 3.6], shape: 'box', tone: 'infra', icon: 'eye', info: 'Quién llamó qué herramienta, con qué argumentos, qué decidió la política y qué respondió el sistema.' },
    { id: 'oms', label: 'API de pedidos', sub: 'OpenAPI → tools', at: [7.6, -3.4], shape: 'box', tone: 'tool', icon: 'server', info: 'Una API REST existente descrita con OpenAPI, convertida en herramientas MCP sin escribir un servidor.' },
    { id: 'refund', label: 'Reembolsos', sub: 'Lambda', at: [7.6, 0], shape: 'box', tone: 'tool', icon: 'zap', info: 'Una función Lambda expuesta como herramienta. Acción de escritura: política estricta y, sobre cierto monto, aprobación humana.' },
    { id: 'saas', label: 'Servidor MCP SaaS', sub: 'tickets / CRM', at: [7.6, 3.4], shape: 'cloud', tone: 'tool', icon: 'cloud', info: 'Un servidor MCP remoto de un proveedor. El gateway se autentica con OAuth hacia él; el agente nunca ve ese token.' },
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
  steps: [
    { title: '1 · Identidad del agente', body: 'El agente obtiene un token OAuth del IdP con audiencia = gateway (y, si actúa por un usuario, con la identidad de ese usuario).', flows: ['agent>idp', 'idp>agent'] },
    { title: '2 · Descubrir herramientas', body: 'El agente lista herramientas en el gateway. Recibe solo las que su identidad puede usar: de 40 herramientas registradas, ve 6.', flows: ['agent>gw', 'gw>agent'] },
    { title: '3 · Llamada + política', body: 'El modelo pide `issue_refund {"order_id": "4512", "amount": 420}`. El gateway evalúa la política: el monto supera 200, se **deniega** o se exige aprobación.', flows: ['agent>gw', 'gw>policy', 'policy>gw'] },
    { title: '4 · Lectura permitida', body: '`get_order` pasa la política. El gateway llama a la API de pedidos con la credencial de salida configurada para ese destino.', flows: ['gw>oms', 'oms>gw'] },
    { title: '5 · Escritura controlada', body: 'Con la aprobación registrada, se invoca la Lambda de reembolsos. El agente nunca tuvo permisos IAM directos sobre ella.', flows: ['gw>refund', 'refund>gw'] },
    { title: '6 · Terceros por MCP', body: 'Para crear el ticket, el gateway reenvía la llamada al servidor MCP del SaaS con su propio token OAuth (sin token passthrough).', flows: ['gw>saas', 'saas>gw'] },
    { title: '7 · Auditoría', body: 'Cada llamada, decisión de política y resultado queda auditado y trazado, correlacionado con la traza del agente.', flows: ['gw>audit'] },
  ],
}
