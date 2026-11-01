# agents-learning

Guía práctica (en español) para construir **agentes de IA en entornos empresariales**: frameworks (Google ADK, Strands, LangGraph, …), RAG, MCP, A2A, AI gateways, plataformas cloud (Bedrock AgentCore, Gemini Enterprise Agent Platform, Microsoft Foundry, Cloudflare), arquitecturas de referencia y prácticas de producción (evals, observabilidad, seguridad). Incluye una ruta de aprendizaje de 7 niveles y **diagramas isométricos 3D interactivos** que explican cada flujo paso a paso, con referencias a fuentes oficiales.

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
  components/iso/     motor de diagramas isométricos (R3F, cámara ortográfica isométrica)
  components/mdx/     Callout, Cards, CodeTabs, Steps, KeyPoints, Roadmap, CodeBlock…
  components/layout/  layout, sidebar, buscador (Ctrl K)
  pages/              Home, artículo, referencias, 404
  data/roadmap.ts     niveles de la ruta de aprendizaje
docs/
  AUTHORING.md        convenciones para escribir páginas y diagramas
  research/           informes de investigación con fuentes
```

Para agregar una página: crea `src/content/<slug>.meta.ts`, `src/content/<slug>.mdx` y (opcional) `src/diagrams/<slug>.ts`. Ver [`docs/AUTHORING.md`](docs/AUTHORING.md).

## Despliegue en Cloudflare Pages

Es una SPA estática: Cloudflare Pages sirve `index.html` para cualquier ruta desconocida porque el build **no** incluye un `404.html` (comportamiento SPA por defecto). `public/_headers` agrega caché inmutable para `/assets/*` y cabeceras de seguridad.

### Opción A — integración con Git (recomendada)

1. Sube el repo a GitHub/GitLab.
2. Cloudflare Dashboard → **Workers & Pages** → *Create* → *Pages* → *Connect to Git*.
3. Configuración de build:
   - **Framework preset**: Vite (o "None")
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - Node: el archivo `.node-version` fija Node 24 (React Router 8 requiere Node ≥ 22.22).
4. Cada push a `main` despliega a producción; cada rama/PR obtiene una URL de preview.

### Opción B — Wrangler (despliegue directo)

```bash
npx wrangler login
npm run deploy       # build + wrangler pages deploy dist --project-name agents-learning
```

### Dominio propio

En el proyecto de Pages → **Custom domains** → *Set up a custom domain* → escribe p. ej. `agentes.tudominio.com`. Si el dominio ya está en Cloudflare, el registro DNS (CNAME) se crea automáticamente y el certificado TLS se emite solo.
