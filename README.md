# Cómo construir agentes de IA a nivel empresarial

Guía práctica (en español), pensada para cualquier equipo, sobre cómo construir **agentes de IA en entornos empresariales**: frameworks (Google ADK, Strands, LangGraph, …), RAG, MCP, A2A, AI gateways, plataformas cloud (Bedrock AgentCore, Gemini Enterprise Agent Platform, Microsoft Foundry, Cloudflare), arquitecturas de referencia, **casos reales** de empresas que operan agentes a escala y prácticas de producción (evals, observabilidad, seguridad). Incluye una ruta de aprendizaje de 7 niveles y **diagramas interactivos paso a paso**: cada paso resalta las piezas que participan, muestra el payload real que viaja (JSON-RPC, `messages`, HTTP, trazas) y las líneas de código que lo producen, con vista 3D opcional y referencias a fuentes oficiales.

Contenido verificado contra documentación oficial a **octubre de 2026**. La investigación base está en [`docs/research/`](docs/research/).

## Stack

| Pieza | Versión |
|---|---|
| React | 19.3 |
| React Router | 8 (modo data, SPA) |
| Vite | 8 (Rolldown) |
| TypeScript | 7 |
| Tailwind CSS | 4 |
| MDX | 3 (+ Shiki 4 en build-time, temas claro/oscuro) |
| three.js / React Three Fiber / drei | 0.187 / 9 / 10 |

## Desarrollo

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + build a dist/
npm run preview
```

Validadores de contenido (no requieren navegador):

```bash
node scripts/check-diagrams.mjs   # specs de diagramas: referencias, solapes, encuadre
node scripts/check-mdx.mjs        # compila todos los MDX y detecta componentes desconocidos
```

## Estructura

```
src/
  content/            <slug>.mdx (cuerpo) + <slug>.meta.ts (título, sección, referencias)
  diagrams/           specs IsoSpec por página (se registran solos por glob)
  components/flow/    recorridos 2D (flujo y secuencia) con paneles de datos y código
  components/iso/     tipos de las specs y vista 3D isométrica opcional (R3F)
  components/mdx/     Callout, Cards, CodeTabs, Steps, KeyPoints, Roadmap, CodeBlock…
  components/layout/  layout, sidebar, buscador (Ctrl K)
  pages/              Home, artículo, referencias, 404
  data/roadmap.ts     niveles de la ruta de aprendizaje
docs/
  AUTHORING.md        convenciones para escribir páginas y diagramas
  research/           informes de investigación con fuentes
```

Para agregar una página: crea `src/content/<slug>.meta.ts`, `src/content/<slug>.mdx` y (opcional) `src/diagrams/<slug>.ts`. Ver [`docs/AUTHORING.md`](docs/AUTHORING.md).

## Despliegue en Cloudflare (Workers con assets estáticos)

El sitio se publica como un **Worker de solo assets**: no hay código de servidor, solo el contenido de `dist/`. `wrangler.toml` define `[assets] directory = "./dist"` y `not_found_handling = "single-page-application"`, así que cualquier ruta desconocida (`/guia/...`, `/referencias`) devuelve `index.html`. `public/_headers` agrega caché inmutable para `/assets/*` y cabeceras de seguridad.

> El `name` de `wrangler.toml` (`agents-learning`) debe coincidir con el nombre del proyecto en el dashboard. Si le pusiste otro nombre, cámbialo en uno de los dos lados.

### Opción A — integración con Git (recomendada)

1. Sube el repo a GitHub/GitLab.
2. Cloudflare Dashboard → **Workers & Pages** → *Create* → *Import a repository*.
3. Configuración de build:
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy` (el valor por defecto)
   - Node: el archivo `.node-version` fija Node 24 (React Router 8 requiere Node ≥ 22.22).
4. Cada push a `main` despliega a producción. Si activas los *builds* para otras ramas, el comando de esas ramas es `npx wrangler versions upload` y obtienes una URL de preview.

### Opción B — Wrangler (despliegue directo)

```bash
npx wrangler login
npm run deploy       # build + wrangler deploy
```

### Dominio propio

En el Worker → **Settings** → **Domains & Routes** → *Add* → *Custom domain* → escribe p. ej. `agentes.tudominio.com`. Si el dominio ya está en Cloudflare, el registro DNS y el certificado TLS se crean solos.
