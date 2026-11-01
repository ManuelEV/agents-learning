import type { IsoSpec } from '../components/iso/types'

export const soporteRecorrido: IsoSpec = {
  id: 'soporte-recorrido',
  title: 'Asistente de soporte: recorrido de una conversación',
  summary:
    'Una clienta escribe por WhatsApp porque su pedido llegó dañado. El asistente pasa por **guardrails**, identifica a la clienta y el pedido con **herramientas de lectura MCP**, consulta la **política de devoluciones** con RAG y citas, y si el caso lo requiere **escala a una persona** con todo el contexto.',
  height: 500,
  zones: [
    { id: 'mcp', label: 'Servidores MCP', from: [11.3, -4.9], to: [14.3, 4.9], tone: 'protocol' },
  ],
  nodes: [
    { id: 'cliente', label: 'Clienta', sub: 'web · WhatsApp · Teams', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'El mismo asistente atiende varios canales. Cada canal autentica a su manera (sesión web, número verificado de WhatsApp, Entra ID en Teams) y entrega un `customer_id` confiable al agente.' },
    { id: 'canal', label: 'Adaptador de canal', sub: 'normaliza mensajes', at: [3.3, 0], shape: 'box', tone: 'infra', icon: 'message', info: 'Convierte cada canal a un formato común (texto, adjuntos, identidad verificada) y mantiene el `session_id`. Nunca deja que el usuario declare su propio ID de cliente en el texto.' },
    { id: 'guard', label: 'Guardrails', sub: 'PII · prompt attack', at: [3.3, -3.4], shape: 'box', tone: 'guard', icon: 'shield', info: 'Entrada: detección de prompt injection y enmascarado de PII (tarjetas, documentos). Salida: grounding contextual contra los fragmentos citados y temas denegados (asesoría legal, promesas fuera de política).' },
    { id: 'agente', label: 'Agente de soporte', sub: 'ADK o Strands', at: [7.0, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Un solo agente con pocas herramientas bien descritas. Instrucciones: resolver con datos, citar la política, no prometer lo que no puede ejecutar y escalar ante dudas o enojo.' },
    { id: 'kb', label: 'Políticas y FAQ', sub: 'híbrido + rerank + ACL', at: [6.6, 3.4], shape: 'stack', tone: 'data', icon: 'book', info: 'Índice con políticas de devolución, garantías y FAQ. Búsqueda híbrida (BM25 + vectores), reranking y filtro por país y audiencia (cliente vs. interno). Devuelve fragmentos con URL de origen para citar.' },
    { id: 'gw', label: 'Gateway MCP', sub: 'OAuth · políticas', at: [9.9, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Punto único hacia los servidores MCP (AgentCore Gateway, LiteLLM MCP o Kong). Aplica autenticación, separa herramientas de lectura y escritura y audita cada llamada.' },
    { id: 'pedidos', label: 'MCP Pedidos (OMS)', sub: 'lectura + reembolso', at: [12.8, -3.4], shape: 'box', tone: 'tool', icon: 'boxes', info: '`consultar_pedido`, `rastrear_envio` (lectura) y `solicitar_reembolso` (escritura con aprobación). El servidor valida que el pedido pertenezca al `customer_id` de la sesión.' },
    { id: 'crm', label: 'MCP CRM', sub: 'perfil e historial', at: [12.8, 0], shape: 'box', tone: 'tool', icon: 'users', info: '`perfil_cliente` y `casos_previos`: segmento, canal preferido y reclamos anteriores. Solo lectura para el agente.' },
    { id: 'tickets', label: 'MCP Tickets', sub: 'crear · escalar', at: [12.8, 3.4], shape: 'box', tone: 'tool', icon: 'card', info: '`crear_caso` y `escalar_a_humano`: abre el caso en la mesa de ayuda con resumen, evidencia y propuesta del agente.' },
    { id: 'humano', label: 'Ejecutivo humano', sub: 'mesa de ayuda', at: [9.9, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'Recibe el caso con el resumen y la conversación completa. Puede responder en el mismo canal; el agente queda en silencio en esa sesión.' },
  ],
  edges: [
    { from: 'cliente', to: 'canal' },
    { from: 'canal', to: 'guard', route: 'z' },
    { from: 'canal', to: 'agente' },
    { from: 'agente', to: 'kb', route: 'z' },
    { from: 'agente', to: 'gw', label: 'MCP' },
    { from: 'gw', to: 'pedidos' },
    { from: 'gw', to: 'crm' },
    { from: 'gw', to: 'tickets' },
    { from: 'tickets', to: 'humano', route: 'x' },
  ],
  steps: [
    { title: '1 · Mensaje entrante', body: '"Mi pedido 88123 llegó roto, quiero la plata de vuelta". El adaptador de WhatsApp verifica el número, resuelve el `customer_id` y abre o reanuda la sesión.', flows: ['cliente>canal'] },
    { title: '2 · Guardrails de entrada', body: 'Se enmascaran datos sensibles y se evalúa prompt injection antes de que el texto llegue al modelo.', flows: ['canal>guard', 'guard>canal', 'canal>agente'] },
    { title: '3 · Herramientas de lectura', body: 'El agente llama `perfil_cliente` y `consultar_pedido`: fecha de entrega, monto, método de pago, reclamos previos. El servidor MCP filtra por el `customer_id` de la sesión, no por lo que diga el modelo.', flows: ['agente>gw', 'gw>crm', 'gw>pedidos'] },
    { title: '4 · Política con citas', body: 'Busca "producto dañado en entrega" en la KB filtrando por país y audiencia *cliente*. El reranker deja 5 fragmentos; el agente responde citando la sección 4.2 de la política de devoluciones.', flows: ['agente>kb', 'kb>agente'] },
    { title: '5 · Propuesta y acción', body: 'La política permite reembolso o reposición. Si la clienta elige reembolso, el agente invoca `solicitar_reembolso`: es una **herramienta de escritura** y entra en el flujo de aprobación.', flows: ['agente>gw', 'gw>pedidos'] },
    { title: '6 · Escalamiento', body: 'Si el monto supera el umbral, hay sospecha de fraude o la clienta pide hablar con alguien, el agente llama `escalar_a_humano` con un resumen estructurado.', flows: ['agente>gw', 'gw>tickets', 'tickets>humano'] },
    { title: '7 · Respuesta verificada', body: 'Antes de enviar, el guardrail de salida comprueba que la respuesta esté respaldada por los fragmentos citados. La conversación queda trazada para evaluación.', flows: ['agente>canal', 'canal>cliente'], focus: ['guard', 'agente'] },
  ],
}

export const soporteIngesta: IsoSpec = {
  id: 'soporte-ingesta',
  title: 'Ingesta de conocimiento con permisos (ACL)',
  summary:
    'El RAG de soporte mezcla documentos públicos (FAQ) con documentos internos (procedimientos de excepción). La ingesta conserva **de dónde viene cada fragmento y quién puede verlo**, y la consulta filtra por esos metadatos **antes** de que el modelo vea nada.',
  height: 480,
  zones: [{ id: 'kb', label: 'Pipeline de la Knowledge Base', from: [1.8, -4.9], to: [11.4, 4.9], tone: 'data' }],
  nodes: [
    { id: 'sharepoint', label: 'SharePoint', sub: 'procedimientos internos', at: [-0.4, -1.7], shape: 'cloud', tone: 'neutral', icon: 'cloud', info: 'Fuente con permisos por sitio y carpeta. El conector lee también los grupos con acceso a cada documento.' },
    { id: 's3', label: 'S3 · CMS', sub: 'FAQ y políticas públicas', at: [-0.4, 1.7], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Contenido público exportado del CMS del sitio web, con archivos de metadatos (`.metadata.json`) que indican país, audiencia y vigencia.' },
    { id: 'sync', label: 'Conector + sync', sub: 'incremental', at: [3.3, 0], shape: 'box', tone: 'infra', icon: 'repeat', info: 'Sincronización incremental programada (y por evento al publicar). Detecta documentos borrados para eliminarlos del índice: un FAQ obsoleto es una fuente de respuestas incorrectas.' },
    { id: 'acl', label: 'Mapeo de ACL', sub: 'grupos → audiencia', at: [3.3, 3.4], shape: 'box', tone: 'guard', icon: 'lock', info: 'Traduce permisos de origen a metadatos simples y filtrables: `audiencia` (cliente/interno), `grupos` permitidos, `pais`. Mantén la lista de grupos corta y estable.' },
    { id: 'chunk', label: 'Parseo y chunking', sub: 'por sección', at: [6.6, 0], shape: 'box', tone: 'neutral', icon: 'layers', info: 'Chunking jerárquico o por sección (encabezados de la política), conservando título y número de sección para poder citar "Política de devoluciones §4.2".' },
    { id: 'contexto', label: 'Contexto del chunk', sub: 'contextual retrieval', at: [6.6, 3.4], shape: 'doc', tone: 'memory', icon: 'file', info: 'Antepone 50–100 tokens que sitúan el fragmento en su documento (técnica de Anthropic). Reduce fallos de recuperación de forma notable, sobre todo combinado con BM25 y reranking.' },
    { id: 'embed', label: 'Embeddings', sub: 'Titan / Cohere', at: [6.6, -3.4], shape: 'sphere', tone: 'model', icon: 'sparkles', info: 'Modelo de embeddings multilingüe. Versiona el modelo: cambiarlo obliga a reindexar todo.' },
    { id: 'indice', label: 'Índice híbrido', sub: 'OpenSearch Serverless', at: [9.9, 0], shape: 'stack', tone: 'data', icon: 'search', info: 'Vectores + texto en el mismo índice, con metadatos filtrables. Bedrock KB solo ofrece búsqueda `HYBRID` con OpenSearch y un campo de texto filtrable.' },
    { id: 'retrieve', label: 'Retrieve filtrado', sub: 'filtro + rerank', at: [13.2, 0], shape: 'diamond', tone: 'guard', icon: 'filter', info: 'En cada consulta: filtro por `audiencia` y `pais` derivados de la **sesión** (no del prompt), búsqueda híbrida, reranking y top 5 con URL de origen.' },
  ],
  edges: [
    { from: 'sharepoint', to: 'sync' },
    { from: 's3', to: 'sync' },
    { from: 'sync', to: 'acl', route: 'z' },
    { from: 'sync', to: 'chunk' },
    { from: 'chunk', to: 'contexto', route: 'z' },
    { from: 'chunk', to: 'embed', route: 'z' },
    { from: 'chunk', to: 'indice' },
    { from: 'indice', to: 'retrieve' },
  ],
  steps: [
    { title: '1 · Fuentes con permisos', body: 'Dos orígenes: FAQ y políticas públicas desde el CMS (S3) y procedimientos internos de excepción desde SharePoint, con permisos por grupo.', flows: ['sharepoint>sync', 's3>sync'] },
    { title: '2 · ACL a metadatos', body: 'Los permisos de origen se convierten en metadatos simples: `audiencia=interno`, `grupos=["soporte_n2"]`, `pais="CL"`. Sin este paso, el RAG filtra contenido interno a clientes.', flows: ['sync>acl'] },
    { title: '3 · Chunking por sección', body: 'Se parte por encabezados conservando título y número de sección para citar con precisión.', flows: ['sync>chunk'] },
    { title: '4 · Contexto + embeddings', body: 'A cada fragmento se le antepone un breve contexto generado y se calcula su embedding.', flows: ['chunk>contexto', 'chunk>embed'] },
    { title: '5 · Índice híbrido', body: 'Vectores, texto y metadatos van al mismo índice. La sincronización incremental borra lo que ya no existe en origen.', flows: ['chunk>indice'] },
    { title: '6 · Consulta filtrada', body: 'El agente pide "daño en entrega"; la herramienta agrega el filtro de audiencia y país **desde la sesión**, ejecuta búsqueda híbrida y reranking, y devuelve fragmentos con su URL.', flows: ['indice>retrieve'], focus: ['retrieve', 'acl'] },
  ],
}

export const soporteReembolso: IsoSpec = {
  id: 'soporte-reembolso',
  title: 'Reembolsos con aprobación humana',
  summary:
    'Las herramientas de lectura se ejecutan libremente; las de **escritura con impacto económico** pasan por una **política determinista** fuera del modelo. Bajo el umbral se ejecuta y audita; sobre el umbral se crea una **solicitud pendiente** que un supervisor aprueba o rechaza.',
  height: 480,
  nodes: [
    { id: 'cliente', label: 'Clienta', sub: 'pide reembolso', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Ya aceptó la propuesta del agente (reembolso al medio de pago original).' },
    { id: 'agente', label: 'Agente', sub: 'solicitar_reembolso', at: [3.3, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'El modelo propone la llamada con `pedido`, `monto` y `motivo`. No decide si se ejecuta: eso lo resuelve la política.' },
    { id: 'politica', label: 'Gateway + política', sub: 'Cedar / código', at: [6.6, 0], shape: 'hex', tone: 'protocol', icon: 'scroll', info: 'Evalúa la llamada con la identidad de la sesión y los argumentos: elegibilidad del pedido, monto, reembolsos previos del cliente en 90 días.' },
    { id: 'decision', label: '¿Requiere aprobación?', sub: 'monto · riesgo', at: [10.3, 0], shape: 'diamond', tone: 'guard', icon: 'split', info: 'Regla de ejemplo: hasta USD 80 y sin reembolsos en 90 días → automático. Más de USD 80, cliente con historial o señal de fraude → aprobación humana.' },
    { id: 'api', label: 'API de reembolsos', sub: 'pagos / OMS', at: [13.8, -3.4], shape: 'box', tone: 'tool', icon: 'card', info: 'Ejecuta el reembolso con una **clave de idempotencia** (`pedido + motivo`) para que un reintento del agente no pague dos veces.' },
    { id: 'pendiente', label: 'Solicitud pendiente', sub: 'caso en mesa de ayuda', at: [10.3, 3.4], shape: 'doc', tone: 'memory', icon: 'timer', info: 'Contiene la propuesta del agente, la evidencia (fotos, tracking), la política citada y el historial. El agente informa a la clienta un plazo realista.' },
    { id: 'supervisor', label: 'Supervisor', sub: 'aprueba / rechaza', at: [13.8, 3.4], shape: 'person', tone: 'user', icon: 'hand', info: 'Decide con un clic desde la mesa de ayuda. Su decisión, y no la del modelo, dispara el reembolso.' },
    { id: 'auditoria', label: 'Auditoría', sub: 'quién, qué, por qué', at: [6.6, -3.4], shape: 'box', tone: 'infra', icon: 'eye', info: 'Registro inmutable de cada decisión: política aplicada, aprobador, monto y traza de la conversación.' },
  ],
  edges: [
    { from: 'cliente', to: 'agente' },
    { from: 'agente', to: 'politica', label: 'tools/call' },
    { from: 'politica', to: 'decision' },
    { from: 'decision', to: 'api', route: 'z', label: 'auto' },
    { from: 'decision', to: 'pendiente', route: 'z', label: 'aprobación' },
    { from: 'pendiente', to: 'supervisor' },
    { from: 'supervisor', to: 'api', route: 'z' },
    { from: 'politica', to: 'auditoria', route: 'z', dashed: true },
  ],
  steps: [
    { title: '1 · Solicitud', body: 'La clienta acepta el reembolso. El agente ya verificó con herramientas de lectura que el pedido es suyo y está dentro del plazo de la política.', flows: ['cliente>agente'] },
    { title: '2 · Llamada de escritura', body: 'El agente invoca `solicitar_reembolso(pedido="88123", monto=124.90, motivo="daño en entrega")`. La llamada llega al gateway, no directo a pagos.', flows: ['agente>politica'] },
    { title: '3 · Política determinista', body: 'La política evalúa identidad de la sesión, monto e historial. Ningún texto del usuario ni de un documento recuperado puede cambiar esta decisión.', flows: ['politica>decision', 'politica>auditoria'] },
    { title: '4a · Camino automático', body: 'Montos bajos sin señales de riesgo: se ejecuta con clave de idempotencia y se informa a la clienta con el número de operación.', flows: ['decision>api'] },
    { title: '4b · Camino con aprobación', body: 'USD 124,90 supera el umbral: se crea una solicitud pendiente con evidencia y la política citada. El agente explica el plazo y cierra el turno sin prometer el resultado.', flows: ['decision>pendiente'] },
    { title: '5 · Decisión humana', body: 'El supervisor revisa y aprueba. Su aprobación dispara el reembolso y notifica a la clienta por el mismo canal.', flows: ['pendiente>supervisor', 'supervisor>api'] },
    { title: '6 · Trazabilidad', body: 'Cada paso —propuesta del agente, decisión de política, aprobador y ejecución— queda auditado y alimenta las evaluaciones del agente.', focus: ['auditoria', 'politica', 'supervisor'] },
  ],
}
