import type { IsoSpec } from '../components/iso/types'

export const ragIngesta: IsoSpec = {
  id: 'rag-ingesta',
  title: 'Pipeline de ingesta',
  summary:
    'La calidad de un RAG se decide **antes** de la primera pregunta. La ingesta convierte documentos heterogéneos en fragmentos (*chunks*) limpios, con metadatos y permisos, y los indexa dos veces: como vectores (similitud semántica) y como texto (BM25, coincidencia exacta).',
  height: 480,
  zones: [{ id: 'idx', label: 'Índices', from: [11.2, -3.2], to: [14.4, 3.2], tone: 'data' }],
  nodes: [
    { id: 'src', label: 'Fuentes', sub: 'S3, SharePoint, Confluence', at: [0, 0], shape: 'cloud', tone: 'neutral', icon: 'cloud', info: 'Repositorios corporativos: manuales en S3, políticas en SharePoint, wikis en Confluence, tickets resueltos. Cada fuente trae su propio modelo de permisos, que hay que preservar.' },
    { id: 'parse', label: 'Parsing', sub: 'PDF, HTML, tablas, OCR', at: [3.2, 0], shape: 'box', tone: 'tool', icon: 'file', info: 'Extrae texto y estructura: títulos, tablas, listas, imágenes con OCR. Un mal parser (tablas aplanadas, encabezados perdidos) arruina todo lo que viene después.' },
    { id: 'chunk', label: 'Chunking', sub: 'fijo · semántico · jerárq.', at: [6.4, 0], shape: 'box', tone: 'tool', icon: 'split', info: 'Divide en fragmentos de tamaño manejable (típicamente 300–800 tokens con solape). Estrategias: tamaño fijo, por estructura (secciones), semántico o jerárquico (padre/hijo).' },
    { id: 'meta', label: 'Metadatos + ACL', sub: 'área, fecha, grupos', at: [6.4, -3.3], shape: 'doc', tone: 'guard', icon: 'lock', info: 'Cada chunk lleva metadatos filtrables: fuente, fecha, área, idioma y **grupos con permiso de lectura**. Sin esto no hay forma segura de filtrar por usuario al consultar.' },
    { id: 'ctx', label: 'Contexto por chunk', sub: 'Contextual Retrieval', at: [6.4, 3.3], shape: 'sphere', tone: 'model', icon: 'sparkles', scale: 0.8, info: 'Un LLM barato (con prompt caching del documento completo) genera 50–100 tokens que sitúan el chunk: "Este fragmento es de la política de devoluciones 2026, sección electrónica…".' },
    { id: 'emb', label: 'Embeddings', sub: 'modelo de embeddings', at: [9.6, 0], shape: 'sphere', tone: 'model', icon: 'cpu', info: 'Convierte cada chunk (con su contexto) en un vector. Usa el mismo modelo para indexar y para consultar; cambiar de modelo implica reindexar todo.' },
    { id: 'vec', label: 'Índice vectorial', sub: 'HNSW · pgvector · S3 Vec.', at: [12.8, -1.6], shape: 'stack', tone: 'data', icon: 'layers', info: 'Guarda vectores + metadatos. Responde "¿qué se parece semánticamente a esta pregunta?". Ejemplos: pgvector, OpenSearch, S3 Vectors, Qdrant.' },
    { id: 'lex', label: 'Índice léxico', sub: 'BM25', at: [12.8, 1.6], shape: 'stack', tone: 'data', icon: 'search', info: 'Índice invertido clásico. Imprescindible para códigos de producto, números de póliza, siglas y nombres propios, donde los embeddings fallan.' },
  ],
  edges: [
    { from: 'src', to: 'parse' },
    { from: 'parse', to: 'chunk' },
    { from: 'meta', to: 'chunk', route: 'z' },
    { from: 'ctx', to: 'chunk', route: 'z' },
    { from: 'chunk', to: 'emb' },
    { from: 'emb', to: 'vec' },
    { from: 'chunk', to: 'lex', route: 'arc' },
  ],
  steps: [
    { title: '1 · Conectar fuentes', body: 'Un conector (o un *data source* de Bedrock Knowledge Bases / RAG Engine) lee los documentos y sus **permisos de origen**. Idealmente con sincronización incremental, no recargas completas.', flows: ['src>parse'] },
    { title: '2 · Parsing', body: 'Se extrae texto con estructura. Para PDFs con tablas o escaneos conviene un parser avanzado (o un modelo multimodal); el texto plano pierde demasiado.', focus: ['parse'] },
    { title: '3 · Chunking', body: 'Se fragmenta respetando la estructura: no cortes una tabla ni separes un título de su contenido. El chunking jerárquico indexa trozos pequeños pero devuelve el bloque padre.', flows: ['parse>chunk'] },
    { title: '4 · Metadatos y permisos', body: 'Se adjuntan metadatos filtrables y la **lista de grupos** autorizados. Esto habilita filtros por área, vigencia y, sobre todo, por permisos del usuario.', flows: ['meta>chunk'] },
    { title: '5 · Contextualizar (opcional, recomendado)', body: 'Con *Contextual Retrieval*, un LLM antepone a cada chunk una frase que lo ubica en el documento. Anthropic midió hasta **67 % menos fallos** de recuperación combinándolo con BM25 y reranking.', flows: ['ctx>chunk'] },
    { title: '6 · Indexado dual', body: 'Cada chunk se vectoriza y se guarda en el índice vectorial; el mismo texto va al índice BM25. Ambos comparten el id del chunk para poder fusionar resultados.', flows: ['chunk>emb', 'emb>vec', 'chunk>lex'] },
  ],
}

export const ragConsulta: IsoSpec = {
  id: 'rag-consulta',
  title: 'Pipeline de consulta (advanced RAG)',
  summary:
    'En la consulta se combinan varias técnicas baratas que, juntas, multiplican la precisión: **reescribir** la pregunta, **filtrar por permisos**, buscar en paralelo por vectores y BM25, **fusionar con RRF**, **reordenar** con un reranker y generar con **citas**.',
  height: 480,
  nodes: [
    { id: 'user', label: 'Usuario', sub: 'grupo: ventas-cl', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pregunta: "¿Puedo aceptar la devolución de un notebook abierto hace 20 días?". Su identidad (y grupos) viaja con la consulta.' },
    { id: 'rw', label: 'Reescritura', sub: 'query rewriting', at: [3, 0], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Un LLM pequeño reformula la pregunta, la expande con sinónimos o la descompone en subpreguntas. Variantes: multi-query, HyDE (generar una respuesta hipotética y buscar con ella).' },
    { id: 'acl', label: 'Filtro ACL', sub: 'grupos del usuario', at: [3, -3.4], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Se construye un filtro de metadatos con los grupos del usuario **antes** de buscar. Filtrar después de generar es tarde: el modelo ya vio el contenido.' },
    { id: 'vec', label: 'Búsqueda vectorial', sub: 'top-50 semántico', at: [6.2, -1.7], shape: 'stack', tone: 'data', icon: 'layers', info: 'Encuentra fragmentos semánticamente parecidos aunque no compartan palabras ("producto abierto" ≈ "embalaje dañado").' },
    { id: 'lex', label: 'Búsqueda BM25', sub: 'top-50 léxico', at: [6.2, 1.7], shape: 'stack', tone: 'data', icon: 'search', info: 'Encuentra coincidencias exactas: SKU, número de política, siglas. Complementa a los vectores.' },
    { id: 'rrf', label: 'Fusión RRF', sub: 'Reciprocal Rank Fusion', at: [9.2, 0], shape: 'diamond', tone: 'neutral', icon: 'merge', info: 'Combina rankings sin normalizar puntajes: cada documento suma `1 / (k + posición)` en cada lista (k≈60). Simple y robusto.' },
    { id: 'rr', label: 'Reranker', sub: 'cross-encoder', at: [12.2, 0], shape: 'box', tone: 'model', icon: 'filter', info: 'Un modelo cross-encoder (p. ej. Cohere Rerank 3.5 o Amazon Rerank en Bedrock) puntúa cada par pregunta-fragmento y se queda con los 5–10 mejores.' },
    { id: 'llm', label: 'LLM + citas', sub: 'respuesta fundamentada', at: [12.2, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Genera la respuesta usando solo los fragmentos recuperados y cita cada afirmación (documento, sección, URL). Si no hay evidencia, debe decir que no sabe.' },
  ],
  edges: [
    { from: 'user', to: 'rw' },
    { from: 'acl', to: 'rw', route: 'z' },
    { from: 'rw', to: 'vec', route: 'z' },
    { from: 'rw', to: 'lex', route: 'z' },
    { from: 'vec', to: 'rrf' },
    { from: 'lex', to: 'rrf' },
    { from: 'rrf', to: 'rr' },
    { from: 'rr', to: 'llm', route: 'z' },
    { from: 'llm', to: 'user', route: 'arc', dashed: true },
  ],
  steps: [
    { title: '1 · Pregunta e identidad', body: 'La consulta llega con la identidad del usuario. Un modelo pequeño la **reescribe** (resuelve "eso" con el historial, agrega sinónimos, separa subpreguntas).', flows: ['user>rw'] },
    { title: '2 · Filtro de permisos', body: 'Con los grupos del usuario (del token OIDC, no de lo que diga el prompt) se arma un **filtro de metadatos** que se aplica dentro de la búsqueda.', flows: ['acl>rw'] },
    { title: '3 · Búsqueda híbrida', body: 'Se lanzan en paralelo una búsqueda vectorial y una BM25, ambas con el filtro ACL. Cada una devuelve, por ejemplo, 50 candidatos.', flows: ['rw>vec', 'rw>lex'] },
    { title: '4 · Fusión con RRF', body: '*Reciprocal Rank Fusion* combina ambas listas por posición, no por puntaje, así que no hay que calibrar escalas distintas.', flows: ['vec>rrf', 'lex>rrf'] },
    { title: '5 · Reranking', body: 'El reranker relee los ~50 candidatos fusionados junto con la pregunta y deja los 5–10 más relevantes. Es el paso con mejor relación costo/beneficio.', flows: ['rrf>rr'] },
    { title: '6 · Generación con citas', body: 'El LLM responde fundamentado en los fragmentos y **cita** sus fuentes. La respuesta vuelve al usuario con enlaces verificables.', flows: ['rr>llm', 'llm>user'] },
  ],
}

export const ragAgentico: IsoSpec = {
  id: 'rag-agentico',
  title: 'Agentic RAG: el agente decide cómo buscar',
  summary:
    'En **agentic RAG** la recuperación es una herramienta más. El agente decide **si** buscar, **dónde** (base de conocimiento, SQL, tickets), **cómo** reformular, y evalúa si la evidencia alcanza antes de responder. Más preciso en preguntas complejas, pero más caro y lento.',
  height: 480,
  nodes: [
    { id: 'user', label: 'Analista de soporte', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pregunta compuesta: "¿Por qué subieron las devoluciones de notebooks en septiembre y qué dice la política al respecto?".' },
    { id: 'agent', label: 'Agente', sub: 'ADK + LiteLLM', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Mantiene un plan, llama herramientas de recuperación y acumula evidencia. Tiene un límite de búsquedas por turno para acotar costo.' },
    { id: 'llm', label: 'LLM', sub: 'planifica y juzga', at: [3.4, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Descompone la pregunta, elige herramientas y decide cuándo la evidencia es suficiente.' },
    { id: 'judge', label: 'Autoevaluación', sub: '¿evidencia suficiente?', at: [3.4, 3.4], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Antes de responder, el agente verifica que cada afirmación tenga respaldo. Si falta, reformula y vuelve a buscar (patrón *corrective RAG*).' },
    { id: 'kb', label: 'search_policies', sub: 'Knowledge Base', at: [7.2, -3.4], shape: 'stack', tone: 'data', icon: 'book', info: 'Búsqueda híbrida + reranking sobre políticas comerciales. Devuelve fragmentos con URI de origen para citar.' },
    { id: 'sql', label: 'query_returns', sub: 'SQL de solo lectura', at: [7.2, 0], shape: 'cylinder', tone: 'data', icon: 'database', info: 'Consulta agregada sobre el data warehouse: devoluciones por categoría y mes. Cifras exactas que un RAG de texto no puede dar.' },
    { id: 'tix', label: 'search_tickets', sub: 'vía MCP', at: [7.2, 3.4], shape: 'box', tone: 'tool', icon: 'plug', info: 'Servidor MCP del sistema de tickets: motivos de devolución reportados por clientes en el período.' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'agent', to: 'llm' },
    { from: 'agent', to: 'judge' },
    { from: 'agent', to: 'kb', route: 'z' },
    { from: 'agent', to: 'sql' },
    { from: 'agent', to: 'tix', route: 'z' },
  ],
  steps: [
    { title: '1 · Planificar', body: 'El agente pide al modelo un plan: necesita **cifras** (SQL), **causas** (tickets) y **norma** (políticas). Una sola búsqueda vectorial no cubriría las tres.', flows: ['user>agent', 'agent>llm', 'llm>agent'] },
    { title: '2 · Datos estructurados', body: 'Llama `query_returns` para obtener el alza real por mes. Los números salen de SQL, no del LLM.', flows: ['agent>sql', 'sql>agent'] },
    { title: '3 · Evidencia no estructurada', body: 'Busca en tickets los motivos más frecuentes ("pantalla con píxeles muertos", lote X).', flows: ['agent>tix', 'tix>agent'] },
    { title: '4 · Consultar la norma', body: 'Con el contexto anterior, reformula y busca en la KB de políticas la cláusula de devoluciones por defecto de fábrica.', flows: ['agent>kb', 'kb>agent'] },
    { title: '5 · ¿Alcanza la evidencia?', body: 'El agente verifica que cada afirmación tenga una fuente. Si falta algo, vuelve a buscar con otra formulación; si no encuentra, lo dice.', flows: ['agent>judge', 'judge>agent'] },
    { title: '6 · Responder con citas', body: 'Entrega un análisis con cifras, causas y la cláusula aplicable, cada una con su cita. Todo el recorrido queda trazado para evaluar.', flows: ['agent>user'] },
  ],
}
