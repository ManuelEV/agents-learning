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

- `<Diagram id="..." />` o `<Diagram ids={["a","b"]} />` (pestañas). Opcional `height={620}` (alto del placeholder). **Máximo 4 `<Diagram>` por página** (cada uno es un contexto WebGL).
- `<Callout type="info|tip|warning|danger|success" title="opcional">…markdown…</Callout>`
- `<Cards cols={2|3}>` + `<Card title="" tag="opcional" href="/guia/slug | https://...">texto</Card>`
- `<CodeTabs labels={["ADK","Strands"]}>` + un bloque de código por pestaña (dejar líneas en blanco alrededor de cada bloque).
- `<Steps>` envolviendo una lista ordenada markdown (con líneas en blanco antes/después).
- `<KeyPoints title="opcional">` envolviendo una lista.
- `<Badge tone="ga|preview|deprecated">GA</Badge>`
- Tablas GFM, bloques de código con título: ```` ```python title="agent.py" ````. Resaltado: `// [!code highlight]` o `# [!code highlight]` al final de la línea.
- Enlaces internos: `[texto](/guia/slug)`. Externos: URL completa (se abren en pestaña nueva).

Reglas MDX: escapa `{` `}` y `<` en texto plano (usa `` `código` `` o `&lt;`). No uses HTML con `class=`; usa los componentes. Los encabezados `##` y `###` generan el índice lateral.

## Diagramas isométricos (`IsoSpec`)

Tipos en `src/components/iso/types.ts`. Ejemplos: `src/diagrams/inicio.ts`, `src/diagrams/fundamentos-agente.ts`.

**Coordenadas**: `at: [x, z]`. La cámara es isométrica real:
- `+x` avanza **abajo-derecha** en pantalla → úsalo como eje principal del flujo.
- `+z` avanza **abajo-izquierda**; `-z` va **arriba-derecha** → úsalo para ramas/carriles.
- Separación entre nodos: **3.0–3.5** en el eje del flujo, **3.2–3.5** entre carriles. Mínimo absoluto 2.2 (el validador falla).
- Un flujo de 4–5 nodos en `x` llena bien un lienzo ancho. Evita diagramas "altos": combina `x` con `-z`.
- 5–12 nodos por diagrama; 4–8 pasos.

**Formas** (`shape`): `box` (servicio, por defecto), `tall` (agente/servidor), `cylinder` (BD/memoria), `stack` (vector store/índice), `sphere` (modelo LLM), `person` (usuario), `diamond` (decisión/router/gate), `hex` (gateway/proxy), `doc` (documentos/prompt/contexto), `cloud` (servicio externo/SaaS).

**Tonos** (`tone`, color semántico): `user`, `agent`, `model`, `tool`, `data`, `gateway`, `infra`, `guard`, `protocol`, `memory`, `neutral`.

**Iconos** (`icon`): user, users, bot, brain, wrench, database, network, shield, server, cloud, file, search, layers, workflow, key, eye, branch, message, gauge, cpu, globe, lock, boxes, scroll, plug, router, sparkles, book, timer, check, code, mail, chart, list, repeat, split, merge, flag, hand, zap, terminal, card, link, filter, trophy, graduation.

**Textos**: `label` ≤ 22 caracteres; detalles en `sub` (≤ 26). `info` (obligatorio en la práctica) = 1–3 frases que se muestran al hacer clic. En `body`/`summary`/`info` se admite `` `código` ``, `**negrita**` y `*cursiva*`.

**Aristas**: `{ from, to, label?, route?: 'x'|'z'|'arc', dashed? }`. Por defecto la ruta va primero por `x` y luego por `z` (estilo "pistas" isométricas). `arc` dibuja un arco aéreo (útil para conexiones largas o de retorno).

**Zonas**: `{ id, label, from:[x0,z0], to:[x1,z1], tone }` — rectángulo en el suelo (cuenta, VPC, nube, runtime). La etiqueta va en la esquina izquierda `(x0, z1)`.

**Pasos**: `{ title, body, flows?: ['a>b', ...], focus?: ['id', ...] }`. `flows` anima partículas en el sentido indicado (si existe la arista inversa se recorre al revés; si no existe arista, se dibuja un arco temporal). Si no hay `focus`, se resaltan los extremos de los flujos.

## Validación (obligatoria antes de terminar)

```bash
node scripts/check-diagrams.mjs src/diagrams/<slug>.ts   # 0 errores; resuelve advertencias de solape/zoom cuando puedas
node scripts/check-mdx.mjs src/content/<slug>.mdx        # compila el MDX y detecta componentes desconocidos
npx tsc --noEmit                                         # tipos de meta y diagramas
```
No ejecutes `vite build` ni `vite dev` (los corre el integrador). No edites archivos compartidos (`src/components`, `src/lib`, `styles.css`, otras páginas).

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
| arquitecturas | `arquitectura-adk-gateway-bedrock`, `arquitectura-soporte-rag-mcp`, `arquitectura-multiagente-a2a` |
| casos | `casos-reales`, `caso-atencion-cliente`, `caso-migraciones-codigo`, `caso-investigacion-multiagente`, `caso-datos-analitica`, `caso-servicios-financieros`, `caso-plataformas-internas` |
| produccion | `evaluacion-observabilidad`, `seguridad-gobernanza`, `orquestacion-avanzada` |
