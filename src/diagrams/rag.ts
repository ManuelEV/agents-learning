import type { ApiMessage, IsoSpec } from '../components/iso/types'

const json = (v: unknown) => JSON.stringify(v, null, 2)

/* -------------------------------------------------------------------------- */
/* Ingesta                                                                     */
/* -------------------------------------------------------------------------- */

const INGESTA = `import anthropic
from psycopg2.extras import Json
from parsers import parse_document, Chunk     # PDF/HTML → bloques con estructura
from embeddings import embed                  # mismo modelo al indexar y al consultar

client = anthropic.Anthropic()
CONTEXT_PROMPT = ("Este es el fragmento que queremos situar en el documento:\\n"
                  "<chunk>{chunk}</chunk>\\nDa un contexto breve que lo sitúe para "
                  "mejorar su recuperación. Responde solo con el contexto.")

def chunk_by_section(blocks, max_tokens=600):
    """Corta por encabezados: nunca separa un título de su contenido ni parte tablas."""
    chunk = []
    for b in blocks:
        if b.kind == "heading" and chunk:
            yield Chunk(chunk); chunk = []
        chunk.append(b)
        if sum(x.tokens for x in chunk) > max_tokens and b.kind != "table":
            yield Chunk(chunk); chunk = [chunk[0]] if chunk[0].kind == "heading" else []
    if chunk:
        yield Chunk(chunk)

def ingest(doc, cur):
    blocks = parse_document(doc.path)                   # títulos, tablas, listas, OCR
    for i, chunk in enumerate(chunk_by_section(blocks)):
        meta = {"source": doc.uri, "section": chunk.heading, "valid_from": doc.valid_from,
                "country": doc.country, "allowed_groups": doc.acl_groups}   # ACL de origen
        ctx = client.messages.create(                   # Contextual Retrieval
            model="claude-haiku-5-5", max_tokens=120,
            system=[{"type": "text", "text": f"<document>{doc.text}</document>",
                     "cache_control": {"type": "ephemeral"}}],   # el documento se cachea una vez
            messages=[{"role": "user", "content": CONTEXT_PROMPT.format(chunk=chunk.text)}],
        ).content[0].text
        text = f"{ctx}\\n\\n{chunk.text}"                  # contexto + chunk
        cur.execute(                                    # indexado dual: vector + tsvector (BM25-like)
            "INSERT INTO chunks (id, content, embedding, tsv, allowed_groups, meta) "
            "VALUES (%s, %s, %s::vector, to_tsvector('spanish', %s), %s, %s)",
            (f"{doc.id}-{i:03d}", text, str(embed(text)), text, meta["allowed_groups"], Json(meta)),
        )`

const CHUNK_TEXT =
  '4.2 Productos con embalaje abierto\nNotebooks, tablets y consolas con el sello abierto se aceptan hasta 10 días corridos desde la entrega, con todos sus accesorios y sin daños. Pasado ese plazo solo aplica la garantía legal por falla (ver §5).'

export const ragIngesta: IsoSpec = {
  id: 'rag-ingesta',
  title: 'Pipeline de ingesta',
  summary:
    'La calidad de un RAG se decide **antes** de la primera pregunta. La ingesta convierte documentos heterogéneos en fragmentos (*chunks*) limpios, con metadatos y permisos, y los indexa dos veces: como vectores (similitud semántica) y como texto (BM25, coincidencia exacta). Seguimos un documento real del ejemplo: la *Política de devoluciones 2026* de Chile, hasta que su sección 4.2 queda como la fila `dev26-012` de la tabla `chunks` que luego consulta `hybrid_search.py`.',
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
  code: { ingest: { title: 'ingesta.py (ilustrativo)', lang: 'python', source: INGESTA } },
  steps: [
    {
      title: '1 · Conectar fuentes',
      body: 'Un conector (o un *data source* de Bedrock Knowledge Bases / RAG Engine) lee los documentos **y sus permisos de origen**. Idealmente con sincronización incremental: solo lo que cambió desde la última corrida, incluidos los borrados.',
      flows: ['src>parse'],
      data: {
        title: 'documento detectado por el conector (ilustrativo)',
        lang: 'json',
        content: json({
          id: 'dev26',
          uri: 'https://retailandino.sharepoint.com/sites/comercial/Politicas/devoluciones-2026.pdf',
          title: 'Política de devoluciones 2026 · Chile',
          modified: '2026-10-02T14:11:00Z',
          change: 'updated',
          country: 'CL',
          valid_from: '2026-10-01',
          permissions: { groups: ['ventas-cl', 'soporte-cl', 'tiendas-cl'] },
        }),
        hl: ['"change"', '"permissions"'],
      },
      code: { hl: ['def ingest(doc, cur)'] },
    },
    {
      title: '2 · Parsing',
      body: 'Se extrae texto **con estructura**: encabezados, listas y tablas como tablas. Para PDFs con tablas o escaneos conviene un parser avanzado (o un modelo multimodal); el texto plano pierde demasiado.',
      focus: ['parse'],
      data: {
        title: 'bloques extraídos (forma simplificada)',
        lang: 'json',
        content: json([
          { kind: 'heading', level: 1, text: '4. Electrónica', tokens: 4 },
          { kind: 'heading', level: 2, text: '4.2 Productos con embalaje abierto', tokens: 8 },
          { kind: 'paragraph', text: 'Notebooks, tablets y consolas con el sello abierto se aceptan hasta 10 días corridos…', tokens: 41 },
          { kind: 'table', header: ['Categoría', 'Sellado', 'Abierto'], rows: [['Notebooks', '30 días', '10 días'], ['Tablets', '30 días', '10 días']], tokens: 38 },
        ]),
        hl: ['"heading"', '"table"'],
      },
      code: { hl: ['blocks = parse_document(doc.path)'] },
    },
    {
      title: '3 · Chunking',
      body: 'Se fragmenta respetando la estructura: un encabezado abre un chunk nuevo, las tablas no se cortan y, si un chunk se pasa de tamaño, el siguiente repite el título. El chunking jerárquico va más allá: indexa trozos pequeños pero devuelve el bloque padre.',
      flows: ['parse>chunk'],
      data: {
        title: 'chunk resultante',
        lang: 'json',
        content: json({ index: 12, heading: '4. Electrónica › 4.2 Productos con embalaje abierto', tokens: 87, text: CHUNK_TEXT }),
        hl: ['"heading"', '"tokens"'],
      },
      code: { hl: ['def chunk_by_section', 'if b.kind == "heading" and chunk', 'b.kind != "table"'] },
    },
    {
      title: '4 · Metadatos y permisos',
      body: 'Se adjuntan metadatos filtrables y la **lista de grupos** autorizados, copiada de los permisos de SharePoint. Esto habilita filtros por país y vigencia y, sobre todo, el filtro `allowed_groups && %(groups)s` que usa la consulta.',
      flows: ['meta>chunk'],
      data: {
        title: 'metadatos del chunk dev26-012',
        lang: 'json',
        content: json({
          source: 'https://retailandino.sharepoint.com/sites/comercial/Politicas/devoluciones-2026.pdf',
          section: '4.2 Productos con embalaje abierto',
          valid_from: '2026-10-01',
          country: 'CL',
          allowed_groups: ['ventas-cl', 'soporte-cl', 'tiendas-cl'],
        }),
        hl: ['"allowed_groups"', '"valid_from"'],
      },
      code: { hl: ['meta = {"source": doc.uri', '"allowed_groups": doc.acl_groups'] },
    },
    {
      title: '5 · Contextualizar (opcional, recomendado)',
      body: 'Con *Contextual Retrieval*, un LLM barato que ve el documento completo antepone a cada chunk una frase que lo ubica. El documento va en el `system` con `cache_control`: se paga una vez y se reutiliza para cada chunk. Anthropic midió hasta **67 % menos fallos** de recuperación combinándolo con BM25 y reranking.',
      flows: ['ctx>chunk'],
      data: {
        title: 'POST /v1/messages (documento cacheado)',
        lang: 'json',
        content: json({
          model: 'claude-haiku-5-5',
          max_tokens: 120,
          system: [{ type: 'text', text: '<document>Política de devoluciones 2026 · Chile … (38 páginas)</document>', cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: 'Este es el fragmento que queremos situar en el documento: <chunk>4.2 Productos con embalaje abierto…</chunk> …' }],
          '→ respuesta': 'Fragmento de la Política de devoluciones 2026 de Retail Andino (Chile), capítulo 4 Electrónica: plazo para notebooks y tablets con embalaje abierto.',
        }),
        hl: ['"cache_control"', '"→ respuesta"'],
      },
      code: { hl: ['ctx = client.messages.create', '"cache_control": {"type": "ephemeral"}', 'text = f"{ctx}'] },
    },
    {
      title: '6 · Indexado dual',
      body: 'El texto contextualizado se vectoriza y se guarda junto a su `tsvector` en la misma fila: un índice HNSW responde por similitud y uno GIN por coincidencia léxica. Ambos comparten el id `dev26-012`, que es lo que RRF fusiona en la consulta.',
      flows: ['chunk>emb', 'emb>vec', 'chunk>lex'],
      data: {
        title: 'fila insertada en chunks',
        lang: 'json',
        content: json({
          id: 'dev26-012',
          content: 'Fragmento de la Política de devoluciones 2026 … embalaje abierto.\n\n4.2 Productos con embalaje abierto\nNotebooks, tablets y consolas…',
          embedding: [0.0182, -0.0441, 0.0097, '… 1024 dimensiones'],
          tsv: "'abiert':9 'notebook':12 'tablet':13 'dias':21 …",
          allowed_groups: ['ventas-cl', 'soporte-cl', 'tiendas-cl'],
        }),
        hl: ['"id"', '"embedding"', '"tsv"'],
      },
      code: { hl: ['cur.execute(', 'to_tsvector', 'str(embed(text))'] },
    },
  ],
}

/* -------------------------------------------------------------------------- */
/* Consulta                                                                    */
/* -------------------------------------------------------------------------- */

/** Mismo código que el bloque `hybrid_search.py` del artículo. */
const HYBRID = `from collections import defaultdict

VEC_SQL = """SELECT id FROM chunks
  WHERE allowed_groups && %(groups)s            -- filtro ACL dentro de la búsqueda
  ORDER BY embedding <=> %(qvec)s::vector LIMIT 50"""
LEX_SQL = """SELECT id FROM chunks
  WHERE allowed_groups && %(groups)s AND tsv @@ plainto_tsquery('spanish', %(q)s)
  ORDER BY ts_rank_cd(tsv, plainto_tsquery('spanish', %(q)s)) DESC LIMIT 50"""

def rrf(rankings: list[list[str]], k: int = 60) -> list[str]:
    """Reciprocal Rank Fusion: suma 1/(k + posición) de cada lista."""
    scores: dict[str, float] = defaultdict(float)
    for ranking in rankings:
        for pos, doc_id in enumerate(ranking, start=1):
            scores[doc_id] += 1.0 / (k + pos)
    return sorted(scores, key=scores.get, reverse=True)

def hybrid_search(cur, q: str, qvec: list[float], groups: list[str], top: int = 30) -> list[str]:
    params = {"q": q, "qvec": str(qvec), "groups": groups}
    cur.execute(VEC_SQL, params); vec_ids = [r[0] for r in cur.fetchall()]
    cur.execute(LEX_SQL, params); lex_ids = [r[0] for r in cur.fetchall()]
    return rrf([vec_ids, lex_ids])[:top]       # luego: reranker → top 5–10`

const RESPONDER = `import boto3
from hybrid_search import hybrid_search
from llm import small_llm, llm, embed, load_chunks   # clientes vía AI gateway

rt = boto3.client("bedrock-agent-runtime", region_name="us-east-1")
RERANK = "arn:aws:bedrock:us-east-1::foundation-model/cohere.rerank-v3-5:0"

def responder(cur, pregunta: str, user) -> dict:
    # 1 · Reescritura: resuelve referencias del historial y agrega sinónimos
    q = small_llm(f"Reescribe como consulta de búsqueda, sin responder: {pregunta}")
    # 2 · Permisos: grupos del token OIDC validado, nunca del prompt
    groups = user.claims["groups"]
    # 3-4 · Híbrido (vectores + léxico) fusionado con RRF
    chunks = load_chunks(cur, hybrid_search(cur, q, embed(q), groups))
    # 5 · Reranking: ~30 candidatos → 6
    rr = rt.rerank(
        queries=[{"type": "TEXT", "textQuery": {"text": pregunta}}],
        sources=[{"type": "INLINE", "inlineDocumentSource": {
            "type": "TEXT", "textDocument": {"text": c.text}}} for c in chunks],
        rerankingConfiguration={"type": "BEDROCK_RERANKING_MODEL",
            "bedrockRerankingConfiguration": {"numberOfResults": 6,
                "modelConfiguration": {"modelArn": RERANK}}},
    )
    top = [chunks[r["index"]] for r in rr["results"]]
    # 6 · Generación con citas verificables
    ctx = "\\n".join(f'<fragmento id="{c.id}">{c.text}</fragmento>' for c in top)
    out = llm(system=SISTEMA, prompt=f"{ctx}\\n\\nPregunta: {pregunta}", json=True)
    if not {c["id"] for c in out["citas"]} <= {c.id for c in top}:
        raise ValueError("El modelo citó un fragmento que no recuperamos")
    return out`

export const ragConsulta: IsoSpec = {
  id: 'rag-consulta',
  title: 'Pipeline de consulta (advanced RAG)',
  summary:
    'En la consulta se combinan varias técnicas baratas que, juntas, multiplican la precisión: **reescribir** la pregunta, **filtrar por permisos**, buscar en paralelo por vectores y BM25, **fusionar con RRF**, **reordenar** con un reranker y generar con **citas**. Seguimos una pregunta real de una vendedora de Chile; el código es `hybrid_search.py` del artículo más un `responder.py` que orquesta el resto.',
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
  code: {
    resp: { title: 'responder.py (ilustrativo)', lang: 'python', source: RESPONDER },
    hybrid: { title: 'hybrid_search.py', lang: 'python', source: HYBRID },
  },
  steps: [
    {
      title: '1 · Pregunta e identidad',
      body: 'La consulta llega con la identidad del usuario. Un modelo pequeño la **reescribe** para búsqueda: quita el ruido conversacional, agrega sinónimos ("abierto" → "embalaje abierto", "sello") y la deja lista para ambos índices.',
      flows: ['user>rw'],
      data: {
        title: 'entrada y consulta reescrita',
        lang: 'json',
        content: json({
          pregunta: '¿Puedo aceptar la devolución de un notebook abierto hace 20 días?',
          usuario: { sub: 'u-3381', groups: ['ventas-cl'] },
          q_reescrita: 'plazo devolución notebook embalaje abierto sello roto días electrónica Chile',
        }),
        hl: ['"q_reescrita"'],
      },
      code: { file: 'resp', hl: ['def responder', 'q = small_llm('] },
    },
    {
      title: '2 · Filtro de permisos',
      body: 'Con los grupos del usuario (del **token OIDC validado**, no de lo que diga el prompt) se arma el parámetro `groups`. Va **dentro** de ambas consultas SQL (`allowed_groups && %(groups)s`): lo que no puede ver, ni siquiera es candidato.',
      flows: ['acl>rw'],
      data: {
        title: 'claims del token → parámetros de búsqueda',
        lang: 'json',
        content: json({
          token_claims: { iss: 'https://login.retailandino.com', sub: 'u-3381', groups: ['ventas-cl'] },
          params: { q: 'plazo devolución notebook embalaje abierto…', qvec: '[0.0213, -0.0377, …]', groups: ['ventas-cl'] },
        }),
        hl: ['"groups": ['],
      },
      code: { file: 'hybrid', hl: ['WHERE allowed_groups && %(groups)s', 'params = {"q": q'] },
    },
    {
      title: '3 · Búsqueda híbrida',
      body: 'Se lanzan una búsqueda vectorial y una léxica, ambas con el filtro ACL. Los vectores traen la sección 4.2 aunque diga "sello abierto"; el léxico prioriza el fragmento de garantías que contiene literalmente "notebook" y "días".',
      flows: ['rw>vec', 'rw>lex'],
      data: {
        title: 'ids devueltos por cada índice (top 4 de 50)',
        lang: 'json',
        content: json({
          vec_ids: ['dev26-012', 'dev26-013', 'gar26-004', 'dev26-031'],
          lex_ids: ['gar26-004', 'dev26-012', 'faq-088'],
        }),
        hl: ['"vec_ids"', '"lex_ids"'],
      },
      code: { file: 'hybrid', hl: ['ORDER BY embedding <=> %(qvec)s::vector', 'plainto_tsquery', 'vec_ids = [r[0]', 'lex_ids = [r[0]'] },
    },
    {
      title: '4 · Fusión con RRF',
      body: '*Reciprocal Rank Fusion* suma `1/(60 + posición)` por lista. `dev26-012` (1.º en vectores, 2.º en léxico) gana a `gar26-004` (3.º y 1.º). No hay que calibrar escalas distintas: solo cuentan las posiciones.',
      flows: ['vec>rrf', 'lex>rrf'],
      data: {
        title: 'puntajes RRF (k = 60)',
        lang: 'json',
        content: json({
          'dev26-012': '1/61 + 1/62 = 0.03252',
          'gar26-004': '1/63 + 1/61 = 0.03227',
          'dev26-013': '1/62 = 0.01613',
          'faq-088': '1/63 = 0.01587',
          'dev26-031': '1/64 = 0.01563',
        }),
        hl: ['"dev26-012"', '"gar26-004"'],
      },
      code: { file: 'hybrid', hl: ['def rrf(', 'scores[doc_id] += 1.0 / (k + pos)', 'return rrf([vec_ids, lex_ids])[:top]'] },
    },
    {
      title: '5 · Reranking',
      body: 'El reranker lee pregunta y fragmento **juntos** y puntúa cada par; de ~30 candidatos deja 6. Es el paso con mejor relación costo/beneficio. Aquí usamos la API `Rerank` de Bedrock con Cohere Rerank 3.5.',
      flows: ['rrf>rr'],
      data: {
        title: 'respuesta de bedrock-agent-runtime.rerank (resumida)',
        lang: 'json',
        content: json({
          results: [
            { index: 0, relevanceScore: 0.94 },
            { index: 1, relevanceScore: 0.81 },
            { index: 3, relevanceScore: 0.42 },
          ],
          '// index → id': { '0': 'dev26-012', '1': 'gar26-004', '3': 'faq-088' },
        }),
        hl: ['"relevanceScore": 0.94'],
      },
      code: { file: 'resp', hl: ['rr = rt.rerank(', '"numberOfResults": 6', 'top = [chunks[r["index"]]'] },
    },
    {
      title: '6 · Generación con citas',
      body: 'El LLM responde **solo** con los fragmentos etiquetados por id y cita cada afirmación. El código verifica que cada cita exista en lo recuperado antes de devolver la respuesta con enlaces.',
      flows: ['rr>llm', 'llm>user'],
      data: {
        title: 'salida estructurada del modelo',
        lang: 'json',
        content: json({
          respuesta:
            'No como devolución normal: para notebooks con embalaje abierto el plazo es de 10 días desde la entrega [dev26-012]. Si el equipo presenta una falla, corresponde evaluarlo por garantía legal [gar26-004].',
          citas: [
            { id: 'dev26-012', seccion: 'Devoluciones 2026 §4.2' },
            { id: 'gar26-004', seccion: 'Garantías 2026 §2.1' },
          ],
        }),
        hl: ['"citas"'],
      },
      code: { file: 'resp', hl: ['<fragmento id=', 'out = llm(', 'raise ValueError'] },
    },
  ],
}

/* -------------------------------------------------------------------------- */
/* Agentic RAG                                                                 */
/* -------------------------------------------------------------------------- */

/** Mismo código que el bloque `kb_tool.py` del artículo. */
const KB_TOOL = `import boto3
from google.adk.agents import Agent
from google.adk.models.lite_llm import LiteLlm
from google.adk.tools import ToolContext

kb = boto3.client("bedrock-agent-runtime", region_name="us-east-1")
KB_ID = "KBPOLITICAS01"   # id de tu Knowledge Base
RERANK = "arn:aws:bedrock:us-east-1::foundation-model/cohere.rerank-v3-5:0"

def search_policies(query: str, tool_context: ToolContext) -> dict:
    """Busca en las políticas comerciales vigentes. Devuelve fragmentos con su fuente para citar.

    Args:
        query: Pregunta o términos de búsqueda en lenguaje natural.
    """
    groups = tool_context.state.get("user:groups", [])  # vienen del token OIDC, no del prompt
    if not groups:
        return {"results": [], "note": "Usuario sin permisos de lectura."}
    acl = [{"listContains": {"key": "allowed_groups", "value": g}} for g in groups]
    resp = kb.retrieve(
        knowledgeBaseId=KB_ID,
        retrievalQuery={"text": query},
        retrievalConfiguration={"vectorSearchConfiguration": {
            "numberOfResults": 40,
            "overrideSearchType": "HYBRID",            # vectores + texto (según el vector store)
            "filter": acl[0] if len(acl) == 1 else {"orAll": acl},
            "rerankingConfiguration": {"type": "BEDROCK_RERANKING_MODEL",
                "bedrockRerankingConfiguration": {
                    "modelConfiguration": {"modelArn": RERANK},
                    "numberOfRerankedResults": 6}},
        }},
    )
    return {"results": [{"text": r["content"]["text"], "source": r["location"],
                         "score": r.get("score")} for r in resp["retrievalResults"]]}

root_agent = Agent(
    name="asistente_politicas",
    model=LiteLlm(model="litellm_proxy/claude-sonnet"),   # vía AI gateway corporativo
    instruction=("Respondes dudas sobre políticas comerciales. Usa search_policies; "
                 "cita la fuente de cada afirmación y si no hay evidencia, dilo."),
    tools=[search_policies],
)`

const OTRAS_TOOLS = `import os
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from dwh import run_readonly          # usuario de base de datos de solo lectura

def query_returns(category: str, months: list[str]) -> dict:
    """Devoluciones y unidades vendidas por categoría y mes (data warehouse).

    Args:
        category: Categoría de producto, p. ej. "notebooks".
        months: Meses en formato YYYY-MM.
    """
    rows = run_readonly(
        "SELECT month, returns, units_sold FROM returns_by_category "
        "WHERE category = %s AND month = ANY(%s) ORDER BY month", (category, months))
    return {"rows": rows}             # cifras exactas: el LLM no las calcula

tickets = McpToolset(                 # search_tickets vive en el servidor MCP de tickets
    connection_params=StreamableHTTPConnectionParams(
        url="https://mcp-tickets.interno/mcp",
        headers={"Authorization": f"Bearer {os.environ['MCP_TOKEN']}"}),
    tool_filter=["search_tickets"],
)

MAX_SEARCHES = 6                      # tope de llamadas por turno: acota costo y loops

def limit_searches(tool, args, tool_context):
    """before_tool_callback: si devuelve un dict, ADK no ejecuta la herramienta."""
    n = tool_context.state.get("temp:searches", 0) + 1
    tool_context.state["temp:searches"] = n
    if n > MAX_SEARCHES:
        return {"error": "Límite de búsquedas: responde con la evidencia que tienes."}

# root_agent.tools = [search_policies, query_returns, tickets]
# root_agent.before_tool_callback = limit_searches`

const Q_AG = '¿Por qué subieron las devoluciones de notebooks en septiembre y qué dice la política al respecto?'
const A0: ApiMessage = { role: 'user', content: Q_AG }
const A1: ApiMessage = {
  role: 'assistant',
  note: 'plan + 1.ª herramienta',
  content: [
    { type: 'text', text: 'Necesito tres cosas: cifras (SQL), causas (tickets) y la norma (políticas). Empiezo por las cifras.' },
    { type: 'tool_use', id: 'toolu_01', name: 'query_returns', input: { category: 'notebooks', months: ['2026-08', '2026-09'] } },
  ],
}
const A2: ApiMessage = {
  role: 'user',
  note: 'resultado SQL',
  content: [{ type: 'tool_result', tool_use_id: 'toolu_01', content: { rows: [{ month: '2026-08', returns: 190, units_sold: 4120 }, { month: '2026-09', returns: 312, units_sold: 4380 }] } }],
}
const A3: ApiMessage = {
  role: 'assistant',
  content: [
    { type: 'text', text: 'Subieron 64 % (190 → 312). Busco los motivos en los tickets de septiembre.' },
    { type: 'tool_use', id: 'toolu_02', name: 'search_tickets', input: { query: 'devolución notebook motivo', from: '2026-09-01', to: '2026-09-30' } },
  ],
}
const A4: ApiMessage = {
  role: 'user',
  note: 'resultado MCP',
  content: [{ type: 'tool_result', tool_use_id: 'toolu_02', content: { total: 287, top_reasons: [{ reason: 'píxeles muertos en pantalla', count: 141, lot: 'NB15-L2309' }, { reason: 'no cumple expectativas', count: 52 }] } }],
}
const A5: ApiMessage = {
  role: 'assistant',
  content: [{ type: 'tool_use', id: 'toolu_03', name: 'search_policies', input: { query: 'devolución notebook falla de fábrica pantalla píxeles' } }],
}
const A6: ApiMessage = {
  role: 'user',
  note: 'Retrieve + rerank',
  content: [
    {
      type: 'tool_result',
      tool_use_id: 'toolu_03',
      content: { results: [{ text: '§3.1 Productos con falla de fábrica: se cambian o reembolsan dentro del plazo de garantía, con diagnóstico del servicio técnico…', source: { type: 'S3', s3Location: { uri: 's3://kb-politicas/devoluciones-2026.pdf' } }, score: 0.87 }] },
    },
  ],
}
const A7: ApiMessage = {
  role: 'assistant',
  note: 'autoevaluación',
  content: [
    { type: 'text', text: 'Cifra ✓ (SQL), causa ✓ (tickets), cláusula ✓ (§3.1). Falta saber si hay un aviso del proveedor sobre el lote NB15-L2309.' },
    { type: 'tool_use', id: 'toolu_04', name: 'search_policies', input: { query: 'lote NB15-L2309 aviso proveedor retiro' } },
  ],
}
const A8: ApiMessage = { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_04', content: { results: [] } }] }
const A9: ApiMessage = {
  role: 'assistant',
  note: 'end_turn',
  content: [
    {
      type: 'text',
      text: 'Las devoluciones de notebooks subieron 64 % en septiembre (190 → 312) [query_returns]. El motivo principal son píxeles muertos: 141 de 287 tickets, concentrados en el lote NB15-L2309 [search_tickets]. La política §3.1 permite cambio o reembolso por falla de fábrica con diagnóstico técnico [devoluciones-2026.pdf]. No encontré un aviso del proveedor sobre ese lote.',
    },
  ],
}

export const ragAgentico: IsoSpec = {
  id: 'rag-agentico',
  title: 'Agentic RAG: el agente decide cómo buscar',
  summary:
    'En **agentic RAG** la recuperación es una herramienta más. El agente decide **si** buscar, **dónde** (base de conocimiento, SQL, tickets), **cómo** reformular, y evalúa si la evidencia alcanza antes de responder. Más preciso en preguntas complejas, pero más caro y lento. En la pestaña Datos ves crecer el arreglo `messages` (forma Messages API); en Código, `kb_tool.py` del artículo y las otras dos herramientas.',
  height: 480,
  nodes: [
    { id: 'user', label: 'Analista de soporte', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Pregunta compuesta: "¿Por qué subieron las devoluciones de notebooks en septiembre y qué dice la política al respecto?".' },
    { id: 'agent', label: 'Agente', sub: 'ADK + LiteLLM', at: [3.4, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Mantiene un plan, llama herramientas de recuperación y acumula evidencia. Un `before_tool_callback` limita las búsquedas por turno para acotar costo.' },
    { id: 'llm', label: 'LLM', sub: 'planifica y juzga', at: [3.4, -3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Descompone la pregunta, elige herramientas y decide cuándo la evidencia es suficiente. Llega a Claude vía el alias `litellm_proxy/claude-sonnet` del AI gateway.' },
    { id: 'judge', label: 'Autoevaluación', sub: '¿evidencia suficiente?', at: [3.4, 3.4], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Antes de responder, el agente verifica que cada afirmación tenga respaldo. Si falta, reformula y vuelve a buscar (patrón *corrective RAG*); si no encuentra, lo dice.' },
    { id: 'kb', label: 'search_policies', sub: 'Knowledge Base', at: [7.2, -3.4], shape: 'stack', tone: 'data', icon: 'book', info: 'Bedrock Knowledge Base consultada con `Retrieve` (no `RetrieveAndGenerate`): búsqueda híbrida + reranking, filtrada por los grupos del usuario. Devuelve fragmentos con su ubicación para citar.' },
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
  code: {
    kb: { title: 'kb_tool.py', lang: 'python', source: KB_TOOL },
    tools: { title: 'otras_herramientas.py (ilustrativo)', lang: 'python', source: OTRAS_TOOLS },
  },
  steps: [
    {
      title: '1 · Planificar',
      body: 'El agente pasa la pregunta y las tres herramientas al modelo. El LLM planifica: necesita **cifras** (SQL), **causas** (tickets) y **norma** (políticas). Una sola búsqueda vectorial no cubriría las tres.',
      flows: ['user>agent', 'agent>llm', 'llm>agent'],
      data: { title: 'messages', messages: [A0, A1], newFrom: 0, hl: [1] },
      code: { file: 'kb', hl: ['root_agent = Agent(', 'instruction=', 'tools=[search_policies]'] },
    },
    {
      title: '2 · Datos estructurados',
      body: 'Llama `query_returns` y obtiene el alza real por mes. Los números salen de SQL con un usuario de solo lectura, no del LLM.',
      flows: ['agent>sql', 'sql>agent'],
      data: { title: 'messages', messages: [A0, A1, A2], newFrom: 2, hl: [2] },
      code: { file: 'tools', hl: ['def query_returns', 'rows = run_readonly(', 'return {"rows": rows}'] },
    },
    {
      title: '3 · Evidencia no estructurada',
      body: 'Busca en tickets los motivos más frecuentes vía MCP: aparece "píxeles muertos" concentrado en un lote.',
      flows: ['agent>tix', 'tix>agent'],
      data: { title: 'messages', messages: [A0, A1, A2, A3, A4], newFrom: 3, hl: [3, 4] },
      code: { file: 'tools', hl: ['tickets = McpToolset(', 'tool_filter=["search_tickets"]'] },
    },
    {
      title: '4 · Consultar la norma',
      body: 'Con el contexto anterior **reformula** (ya no busca "devoluciones", sino "falla de fábrica pantalla") y consulta la KB. `search_policies` arma el filtro ACL con los grupos de la sesión y pide 40 candidatos que el reranker reduce a 6.',
      flows: ['agent>kb', 'kb>agent'],
      data: { title: 'messages', messages: [A0, A1, A2, A3, A4, A5, A6], newFrom: 5, hl: [5, 6] },
      code: { file: 'kb', hl: ['groups = tool_context.state.get("user:groups"', 'resp = kb.retrieve(', '"overrideSearchType": "HYBRID"', '"numberOfRerankedResults": 6'] },
    },
    {
      title: '5 · ¿Alcanza la evidencia?',
      body: 'El agente revisa cada afirmación contra sus fuentes. Le falta una (¿hay aviso del proveedor?), reformula y busca otra vez: no hay resultados, así que lo dirá en vez de inventarlo. El callback corta si se excede el tope de búsquedas.',
      flows: ['agent>judge', 'judge>agent'],
      data: { title: 'messages', messages: [A0, A1, A2, A3, A4, A5, A6, A7, A8], newFrom: 7, hl: [7, 8] },
      code: { file: 'tools', hl: ['MAX_SEARCHES = 6', 'def limit_searches', 'if n > MAX_SEARCHES'] },
    },
    {
      title: '6 · Responder con citas',
      body: 'Entrega un análisis con cifras, causas y la cláusula aplicable, cada una con su fuente, y declara lo que no encontró. Fueron 4 llamadas a herramientas y 5 al modelo: todo el recorrido queda trazado para evaluar.',
      flows: ['agent>user'],
      data: { title: 'messages (final)', messages: [A0, A1, A2, A3, A4, A5, A6, A7, A8, A9], newFrom: 9, hl: [9] },
      code: { file: 'kb', hl: ['cita la fuente de cada afirmación'] },
    },
  ],
}
