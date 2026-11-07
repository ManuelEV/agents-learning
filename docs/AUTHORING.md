# Guía de autoría

Sitio: React 19 + Vite 8 + MDX 3 + React Three Fiber. Idioma del contenido: **español neutro** (Latinoamérica), tono técnico y directo, tuteo.
Audiencia: desarrolladores/arquitectos en empresas. El lector de referencia usa **Google ADK + un AI gateway + Amazon Bedrock** en AWS, pero la guía cubre todo el ecosistema.

## Archivos por página

Cada artículo son dos archivos con el mismo slug:

| Archivo | Contenido |
|---|---|
| `src/content/<slug>.meta.ts` | `export const meta: PostMeta = {...}` (título, descripción, sección, orden, minutos, nivel, tags, **references**) |
| `src/content/<slug>.mdx` | Cuerpo del artículo. **Sin** título H1 ni lista de referencias: el layout los genera desde `meta`. |
| `src/diagrams/<slug>.ts` | Specs de diagramas de la página (se registran solos por glob). Usa ids con prefijo del slug, p. ej. `mcp-arquitectura`. |

Secciones (`section`): `inicio`, `fundamentos`, `conectar`, `frameworks`, `plataformas`, `arquitecturas`, `casos`, `produccion`.

### `references`
Entre 6 y 15 por artículo, priorizando fuentes primarias (docs oficiales, especificaciones, blogs de ingeniería del proveedor). Formato:
```ts
{ title: 'Especificación MCP 2026-07-28', url: 'https://modelcontextprotocol.io/specification/2026-07-28', org: 'MCP', date: '2026-07-28' }
```
`org` debe ser consistente entre páginas: `Anthropic`, `AWS Docs`, `AWS`, `Google ADK Docs`, `Google Cloud Docs`, `Microsoft Learn`, `Cloudflare Docs`, `LangChain Docs`, `OpenAI`, `MCP`, `A2A`, `OWASP`, `LiteLLM Docs`, `GitHub`, `DeepLearning.AI`, etc.

## Componentes disponibles en MDX (no importes nada)

- `<Diagram id="..." />` o `<Diagram ids={["a","b"]} />` (pestañas). Opcional `height={620}` (alto del placeholder). Recorrido 2D paso a paso con paneles de datos y código; la vista 3D es opcional.
- `<Callout type="info|tip|warning|danger|success" title="opcional">…markdown…</Callout>`
- `<Cards cols={2|3}>` + `<Card title="" tag="opcional" href="/guia/slug | https://...">texto</Card>`
- `<CodeTabs labels={["ADK","Strands"]}>` + un bloque de código por pestaña (dejar líneas en blanco alrededor de cada bloque).
- `<Steps>` envolviendo una lista ordenada markdown (con líneas en blanco antes/después).
- `<KeyPoints title="opcional">` envolviendo una lista.
- `<Badge tone="ga|preview|deprecated">GA</Badge>`
- Tablas GFM, bloques de código con título: ```` ```python title="agent.py" ````. Resaltado: `// [!code highlight]` o `# [!code highlight]` al final de la línea.
- Enlaces internos: `[texto](/guia/slug)`. Externos: URL completa (se abren en pestaña nueva).

Reglas MDX: escapa `{` `}` y `<` en texto plano (usa `` `código` `` o `&lt;`). No uses HTML con `class=`; usa los componentes. Los encabezados `##` y `###` generan el índice lateral.

## Diagramas interactivos (`IsoSpec`)

Tipos en `src/components/iso/types.ts`. Motor 2D en `src/components/flow/` (por defecto) y vista 3D opcional (`src/components/iso/`, botón **3D**). **Ejemplos de referencia**: `agent-loop` en `src/diagrams/fundamentos-agente.ts` (flujo + `messages` + código) y `mcp-mrtr` en `src/diagrams/mcp.ts` (secuencia + JSON-RPC + código).

### La idea: diagrama ↔ dato ↔ código

Cada diagrama es un **recorrido paso a paso** con tres vistas sincronizadas:

1. **El diagrama** resalta qué piezas participan y anima el paquete que viaja (`flows`).
2. **Datos**: el payload real que viaja en ese paso (`data`): el cuerpo HTTP, la respuesta JSON-RPC, el arreglo `messages`, un span de OpenTelemetry, el YAML de configuración, el SQL generado…
3. **Código**: las líneas que producen ese paso (`code`), resaltadas sobre un archivo de 15–50 líneas (`spec.code`).

El objetivo es que el lector **vea cómo se refleja cada concepto en el código y en los datos**, no solo en una caja. Usa formatos reales (Messages API de Anthropic: `tool_use`/`tool_result`/`stop_reason`; Bedrock Converse: `toolUse`/`toolResult`/`stopReason`; MCP: JSON-RPC 2.0 `tools/list`, `tools/call`; A2A: Agent Card, `message/send`, estados de Task; OpenTelemetry GenAI: `gen_ai.*`). Si algo está simplificado, dilo en el `title` del dato ("forma simplificada") o en el `body`. No inventes APIs: si no estás seguro de un nombre de campo, usa uno que aparezca en el propio artículo o en `docs/research/`.

### Tipo de diagrama (`layout`)

- `flow` (por defecto): cajas y flechas. Para **arquitecturas** y componentes.
- `sequence`: un carril vertical por nodo y una fila por cada flujo, en orden. Para **protocolos e intercambios** (MCP, A2A, OAuth, handoffs, request/response a través de gateways). Opcional `lanes: ['id1', 'id2', …]` para fijar el orden de los carriles (por defecto, `at[0]`). Cada paso debería tener 1–4 flujos; un paso sin flujos se dibuja como nota sobre su `focus`. Máximo ~20 filas en total.

### Coordenadas y nodos

**Coordenadas**: `at: [x, z]`. En 2D, `x` es horizontal (izquierda → derecha) y `z` vertical (arriba → abajo); la escala se calcula sola para que las cajas no se solapen. En 3D la cámara es isométrica (`+x` abajo-derecha, `-z` arriba-derecha).
- Separación: **3.0–3.5** en el eje del flujo, **3.2–3.5** entre carriles. Mínimo 2.2 (el validador falla).
- Un flujo principal en `x` con ramas en `±z` se lee bien en ambas vistas. 5–12 nodos; 4–8 pasos.

**Formas** (`shape`): `box` (servicio), `tall` (agente/servidor), `cylinder` (BD/memoria), `stack` (vector store/índice), `sphere` (modelo LLM), `person` (usuario), `diamond` (decisión/router/gate), `hex` (gateway/proxy), `doc` (documentos/prompt/contexto), `cloud` (servicio externo/SaaS).

**Tonos** (`tone`): `user`, `agent`, `model`, `tool`, `data`, `gateway`, `infra`, `guard`, `protocol`, `memory`, `neutral`.

**Iconos** (`icon`): user, users, bot, brain, wrench, database, network, shield, server, cloud, file, search, layers, workflow, key, eye, branch, message, gauge, cpu, globe, lock, boxes, scroll, plug, router, sparkles, book, timer, check, code, mail, chart, list, repeat, split, merge, flag, hand, zap, terminal, card, link, filter, trophy, graduation.

**Textos**: `label` ≤ 22 caracteres; detalles en `sub` (≤ 26). `info` = 1–3 frases al hacer clic. En `body`/`summary`/`info` se admite `` `código` ``, `**negrita**` y `*cursiva*`.

**Aristas**: `{ from, to, label?, route?: 'x'|'z'|'arc', dashed? }`. `x`: primero horizontal; `z`: primero vertical; `arc`: curva.

**Zonas**: `{ id, label, from:[x0,z0], to:[x1,z1], tone }` (cuenta, VPC, runtime). En 2D se amplían solas para contener sus nodos.

### Pasos

```ts
{
  title: '3 · El modelo decide',
  body: '1–3 frases: qué pasa y por qué importa.',
  flows: ['agent>model', 'model>agent: tool_use'],   // "a>b" o "a>b: etiqueta" (la etiqueta se ve en secuencia y en las píldoras)
  focus: ['agent'],                                  // opcional: si falta, se resaltan los extremos de flows
  data: { title: 'respuesta de la API', lang: 'json', content: json({...}), hl: ['"stop_reason"'] },
  code: { file: 'agent', hl: ['messages.append(', 'if not response.tool_calls'] },
}
```

- `data` (pestaña Datos): un payload `{ title, lang, content, hl? }` con `lang` ∈ `json | http | yaml | python | ts | bash | text`, o el arreglo de mensajes `{ title, messages: ApiMessage[], hl?: number[], newFrom?: number }` (bloques `text`, `tool_use`, `tool_result`). `hl` del payload = textos cuyas líneas se resaltan (deben existir). Construye el JSON con un helper `const json = (v: unknown) => JSON.stringify(v, null, 2)` para que sea válido. ≤ 50 líneas. Para HTTP, incluye método, ruta, headers relevantes y cuerpo.
- `code` (pestaña Código): `hl` = textos (o números de línea) del archivo `spec.code[file]`; sin `file` se usa el primero. Cada texto debe aparecer en el archivo (el validador falla si no).
- `spec.code`: `{ clave: { title: 'archivo.py', lang: 'python', source: \`...\` } }`. 15–50 líneas. **Si la página ya tiene un bloque de código para ese flujo, reutilízalo literalmente** (mismo título) para que diagrama y artículo cuenten lo mismo. Si no lo hay, escribe un fragmento ilustrativo realista y márcalo en el título: `'pipeline.py (ilustrativo)'`. Puedes declarar 2–3 archivos (p. ej. `agent.py` y `config.yaml`); el lector los alterna.
- No todos los pasos necesitan `data` o `code`, pero apunta a que **la mayoría** tenga al menos uno. Un diagrama de casos/empresa puede usar datos ilustrativos (petición, traza, política, resultado de eval) marcados como tales.
- En template strings de `source` escapa `` ` `` y `${`.

## Validación (obligatoria antes de terminar)

```bash
node scripts/check-diagrams.mjs src/diagrams/<slug>.ts   # 0 errores (incluye que cada code.hl / data.hl exista)
node scripts/check-mdx.mjs src/content/<slug>.mdx        # compila el MDX y detecta componentes desconocidos
npx tsc --noEmit                                         # tipos de meta y diagramas
```
Las advertencias marcadas `[3D]` solo afectan a la vista 3D opcional. Ejecutado sin argumentos, el validador regenera `src/diagrams/manifest.ts` (id → archivo), que permite cargar en cada página solo los diagramas que usa: córrelo así antes de hacer commit si agregaste o renombraste specs. No ejecutes `vite build` ni `vite dev` (los corre el integrador). No edites archivos compartidos (`src/components`, `src/lib`, `styles.css`, otras páginas).

## Estilo de contenido

- 1.800–3.500 palabras por artículo. Empieza directo con el concepto (sin "En este artículo veremos…").
- Estructura típica: qué es / por qué importa → cómo funciona (diagrama paso a paso) → ejemplo de código realista → decisiones y trade-offs (tabla) → buenas prácticas / errores comunes (callouts) → `<KeyPoints>` → siguientes pasos (`<Cards>` con enlaces internos).
- Código: realista, corto (10–40 líneas), comentado en español, con nombres de modelos/IDs vigentes (p. ej. Bedrock `global.anthropic.claude-sonnet-5-5`, `litellm>=1.84`). No inventes APIs: usa lo que está en `docs/research/*.md` o verifícalo en la doc oficial. Si algo no está verificado, dilo en el texto.
- Fechas y estados (GA/preview) explícitos y anclados a "octubre de 2026".
- Ejemplos de negocio concretos (retail, soporte, finanzas, operaciones) en vez de "foo/bar".

## Slugs de la guía (enlaces internos válidos)

| Sección | Slugs (orden) |
|---|---|
| inicio | `panorama`, `ruta-de-aprendizaje` |
| fundamentos | `que-es-un-agente`, `patrones-de-diseno`, `context-engineering` |
| conectar | `rag`, `mcp`, `a2a`, `gateways` |
| frameworks | `google-adk`, `strands-agents`, `langgraph`, `otros-frameworks`, `comparativa-frameworks` |
| plataformas | `aws-bedrock-agentcore`, `google-agent-platform`, `microsoft-foundry-cloudflare` |
| arquitecturas | `arquitectura-de-referencia`, `arquitectura-soporte-rag-mcp`, `arquitectura-multiagente-a2a` |
| casos | `casos-reales`, `caso-atencion-cliente`, `caso-migraciones-codigo`, `caso-investigacion-multiagente`, `caso-datos-analitica`, `caso-servicios-financieros`, `caso-plataformas-internas` |
| produccion | `evaluacion-observabilidad`, `seguridad-gobernanza`, `orquestacion-avanzada` |
