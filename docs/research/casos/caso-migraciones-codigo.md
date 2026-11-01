# Notas de investigación: agentes para migraciones de código a gran escala

Investigado el 2026-11-01. Cada dato lleva URL y fecha de publicación de la fuente. "Auto-reportado" = cifra publicada por la propia empresa o por el proveedor de la herramienta; ninguna de las cifras de esta página tiene verificación independiente salvo que se indique.

## 1. Airbnb — Enzyme → React Testing Library (RTL)

Fuente primaria: Charles Covey-Brandt, "Accelerating Large-Scale Test Migration with LLMs", Airbnb Engineering, marzo de 2025.
- URL: https://airbnb.tech/?p=366 (también en Medium: https://medium.com/airbnb-engineering/accelerating-large-scale-test-migration-with-llms-9565c208023b — Medium devolvió 403 al consultar).
- Fecha: la página no muestra fecha en el texto extraído; InfoQ lo cubrió en marzo de 2025: https://www.infoq.com/news/2025/03/airbnb-llm-test-migration/

Datos (auto-reportados por Airbnb):
- ~3.500 archivos de tests de componentes React migrados de Enzyme a RTL.
- Estimación manual original: "1.5 years of engineering time".
- Tiempo real: "6 weeks" en total.
- Primer barrido masivo: ~75 % de los archivos en 4 horas; quedaron cerca de 900 fallando.
- Tras 4 días de "sample, tune, sweep": 97 % completados; quedaron menos de 100 archivos, terminados a mano (≈ 1 semana adicional) partiendo de la salida fallida del LLM.
- Origen: hackathon a mediados de 2023; pipeline escalable construido en 2024 (InfoQ, 2025-03).
- Pipeline: máquina de estados por archivo; pasos: refactor Enzyme → arreglar Jest → arreglar lint y tsc → marcar completo. Un archivo avanza solo si pasa la validación del paso.
- Paralelismo: cientos de archivos a la vez.
- Loop de reintentos con un número configurable de intentos; cada reintento recibe los errores de validación y la última versión del archivo. La mayoría terminó en ≤ ~10 intentos; la cola larga, 50–100 intentos.
- Contexto: prompts de 40.000–100.000 tokens al final, hasta 50 archivos relacionados (componente, test, errores, tests hermanos del directorio, imports, ejemplos RTL, few-shot escritos a mano, guías de migración). Conclusión del autor: elegir los archivos relacionados correctos importó más que la redacción del prompt.
- Herramientas de soporte: comentario de estado estampado en cada archivo con resultados por paso; CLI para re-ejecutar un paso sobre rutas que coincidan con un patrón.
- El artículo no detalla un paso separado de code review ni el modelo usado (no verificado).

## 2. Google — migraciones internas con LLM (Gemini ajustado con DIDACT)

Fuentes primarias:
- Google Research Blog, Stoyan Nikolov y Siddharth Taneja, "Accelerating code migrations with AI", 2024-07-18: https://research.google/blog/accelerating-code-migrations-with-ai/ — "más del 75 % de los cambios de caracteres generados por IA llegan al monorepo" (promedio, auto-reportado).
- Nikolov et al., "How is Google using AI for internal code migrations?", arXiv:2501.06972, 2025-01-12: https://arxiv.org/abs/2501.06972 (experience report).
- Ziftci et al., "Migrating Code At Scale With LLMs At Google", arXiv:2504.09691, 2025-04-13 (FSE 2025 industry): https://arxiv.org/abs/2504.09691

Datos de 2501.06972 (auto-reportados; ahorros = estimaciones de ingenieros):
- int32 → int64 en IDs de Google Ads: base > 500 M líneas; "decenas de miles de ubicaciones en miles de archivos"; esfuerzo manual estimado "cientos de años-ingeniero". 80 % de las modificaciones en los CL aterrizados fueron totalmente escritas por IA; reducción estimada de 50 % del tiempo total (incluye revisión y aterrizaje).
- Descubrimiento: experto siembra campos protobuf; Kythe recorre referencias; filtros regex y parsing quitan falsos positivos.
- JUnit3 → JUnit4: 5.359 archivos, > 149.000 líneas en 3 meses; ~87 % del código generado por IA se commiteó sin cambios. Cuello de botella: capacidad de revisión; limitaron volumen semanal.
- Joda Time → java.time (en curso): ~89 % de ahorro estimado en clusters pequeños; agrupan archivos en clusters por grafo de dependencias de Kythe y migran un cluster por prompt (aprovecha contexto largo de Gemini). Difícil: tipos sin equivalente directo (Interval → Range&lt;Instant&gt;), dependencias Guice no vistas.
- Limpieza de flags de experimentos: sin cifras.
- Toolkit: archivos + líneas objetivo + prompt(s) + few-shot → expansión de archivos por referencias → chequeo de relevancia → generación de diffs (varias variantes en paralelo, tipo pass@k) → build + tests; si falla, se reprompta con diff y error → ranking por validación y similitud con ejemplos → revisión humana: el sistema de Large Scale Changes divide en shards y envía a code owners.
- Lecciones: prompting puro no basta (combinar AST/símbolos + heurísticas + LLM); diffs de AST para detectar cambios no deseados; planificación agéntica a menudo agrega complejidad sin beneficio; dividir en sub-pasos reutilizables (reparación de build); medir resultado de negocio; la revisión humana es el cuello de botella; modelos propios tienen costo de mantenimiento.
- Limitaciones declaradas: sin comparación formal; ahorros estimados; efecto de largo plazo en calidad desconocido.

Datos de 2504.09691 (auto-reportados):
- Migraciones de IDs int32 → int64 en protobuf; una migración manual de este tipo tomaba ~2 años.
- 39 migraciones, 3 desarrolladores, 12 meses; 595 cambios, 93.574 ediciones.
- 74,45 % de los cambios generados por LLM (35,97 % solo LLM; 38,48 % LLM y luego humano); 69,46 % de las ediciones.
- 50 % de reducción estimada por desarrolladores; los autores aclaran que no hay mediciones concretas de tiempo de reloj.
- Workflow: Kythe hasta distancia 5; categorización (no migrado, irrelevante, relevante, sobrante) con regex + revisión humana; LLM recibe archivo completo + líneas sugeridas; diffs aplicados con fuzzy matching; hasta 3 intentos por archivo; validaciones en orden: éxito, whitespace, parser AST, "punt" (el LLM juzga si el cambio era necesario), build, test. Los que fallan quedan para migración manual. Revisión en Critique por desarrolladores y code owners.
- Modelo: Gemini interno ajustado con código de Google (DIDACT); sin fine-tuning específico para la tarea; temperatura 0.
- Problemas: no determinismo, límites de contexto en archivos grandes, alucinaciones (solo reformateo/comentarios), Dart mal soportado, tests rotos preexistentes y golden files, rollouts lentos en producción no automatizados.

## 3. Amazon — upgrades de Java con Amazon Q Developer → AWS Transform custom

Fuentes:
- Andy Jassy, post en LinkedIn, 2024-08-22/24: https://www.linkedin.com/posts/andy-jassy-8b1615_one-of-the-most-tedious-but-critical-tasks-activity-7232374162185461760-AdSz/ (citado por Simon Willison, 2024-08-24: https://simonwillison.net/2024/Aug/24/andy-jassy-amazon-ceo/).
  - Upgrade a Java 17: de "50 developer-days" típicos a "a few hours".
  - Ahorro equivalente a "4,500 developer-years of work" (estimación de Amazon).
  - "more than 50% of our production Java systems" actualizados en menos de seis meses.
  - "79% of the auto-generated code reviews" se publicaron sin cambios adicionales.
  - ~US$260 M de eficiencia anualizada (mejoras de rendimiento) — también en blog AWS.
- AWS DevOps Blog, Aytul Arisoy Cholkar, "Amazon Q Developer just reached a $260 million dollar milestone", 2024-08-01: https://aws.amazon.com/blogs/devops/amazon-q-developer-just-reached-a-260-million-dollar-milestone/
  - "tens of thousands of production applications" de Java 8/11 a 17; "over 4,500 years of development work for over a thousand developers"; "$260 million dollars in annual cost savings".
  - Metodología: ahorro de tiempo estimado por número de dependencias migradas (una dependencia "can take a day or more"); ahorro de costo estimado por hosts eliminados gracias a Java 17. "Both of these estimates are conservative".
  - Nota: cifras auto-reportadas; prensa (The Decoder, 2024-08) señaló que es también un mensaje comercial. Algunos medios citan "30.000 aplicaciones"; la fuente primaria de AWS dice "decenas de miles".
- Docs "How Amazon Q Developer transforms code for Java language upgrades": https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/how-CT-works.html
  - Build local → artefacto (código, dependencias, logs) → build en entorno seguro → plan de transformación → transformación por pasos en servidor; tras cada paso, build y tests en el entorno local del desarrollador (para tests con acceso a recursos privados) → "re-builds and runs existing unit tests ... to iteratively fix any encountered errors" → resumen + diff que el desarrollador acepta o no; transformaciones parcialmente exitosas se terminan a mano.
  - Upgrade JDK mínimo separado del upgrade de librerías.
- AWS DevOps Blog, Ankit Sharma, "Amazon Q Developer end-of-support announcement", 2026-04-30: https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/
  - Nuevas altas bloqueadas desde 2026-05-15; fin de soporte de plugins IDE y suscripciones pagas 2027-04-30; transformación de código (upgrades Java, porting .NET) vía plugins deja de estar disponible ese día. Sucesores: Kiro (coding), AWS Transform custom (upgrades Java), AWS Transform para Windows (.NET).
- What's New, "AWS launches AWS Transform custom...", 2025-12 (GA 2025-12-01, us-east-1): https://aws.amazon.com/about-aws/whats-new/2025/12/transform-custom-organization-wide-modernization
- Docs AWS Transform custom: https://docs.aws.amazon.com/transform/latest/userguide/custom.html (consultado 2026-11-01)
  - CLI `atx`; definiciones de transformación en formato skill (`SKILL.md` + `references/` + `scripts/`), registro por cuenta, borrador/publicado; comando de build/validación opcional pero "very important"; "continual learning": lecciones extraídas de trayectorias, feedback y fixes, revisables con `atx custom def learnings`; flujo de 4 fases: definir, piloto, ejecución escalada (CLI no interactiva, revisión de desarrolladores), monitorear.
- AWS DevOps Blog, Vasudevan, Grilli, Kothari, "AWS Transform custom: enterprise code modernization with the learn-scale-improve flywheel", 2026-04-26: https://aws.amazon.com/blogs/devops/aws-transform-custom-enterprise-code-modernization-with-the-learn-scale-improve-flywheel/
  - Cliente anónimo ("an enterprise software company"): Control-M → Apache Airflow, estimado 12 semanas, hecho en 2,5; 100 % de workflows en alcance; validación fallida = transformación fallida; cambios en ramas Git locales y code review estándar. Cifras de AWS, sin nombre de cliente.
- Cifra de aerolínea (80 % menos tiempo/costo en miles de funciones Lambda) solo en prensa (ITPro, 2025-12), sin cliente nombrado en lo que pude verificar → NO usada.

## 4. Spotify — Honk (background coding agent sobre Fleet Management)

Fuentes primarias (Spotify Engineering):
- Max Charas y Marc Bruggmann, "1,500+ PRs Later: Spotify's Journey with Our Background Coding Agent (Honk, Part 1)", 2025-11-06: https://engineering.atspotify.com/2025/11/spotifys-background-coding-agent-part-1
  - Fleet Management: framework que aplica transformaciones en todos los repos, corre en contenedores y abre PRs; desde mediados de 2024 ~la mitad de los PRs de Spotify los automatiza este sistema (scripts y agentes, sin separar).
  - "Last February, we began an investigation into using AI agents within our Fleet Management system" (post de 2025-11 → se interpreta febrero de 2025) investigan agentes dentro de Fleet Management; reemplazan el script de transformación por un agente guiado por prompt manteniendo targeting, PR, review y merge.
  - "more than 1,500 pull requests" fusionados; "60–90%" de ahorro de tiempo vs. escribir a mano (auto-reportado).
  - El updater de dependencias Maven había crecido a "over 20,000 lines of code".
  - Tipos: Java value types → records, upgrades de Scio con breaking changes, componentes UI en Backstage, cambios de config YAML/JSON.
  - CLI interna: delega el prompt a un agente, formatea/lint vía MCP local, evalúa el diff con LLM-as-judge, sube logs a GCP, trazas en MLflow; agentes/LLM intercambiables; expuesto vía MCP para lanzar tareas desde Slack y GitHub Enterprise.
  - Desafíos: lentitud, impredecibilidad, seguridad/sandbox, costo.
- "Background Coding Agents: Context Engineering (Honk, Part 2)", 2025-11-24: https://engineering.atspotify.com/2025/11/context-engineering-background-coding-agents-part-2
  - Probaron Goose y Aider (bien en un prompt, difíciles de escalar a miles de repos), luego un loop propio (10 turnos por sesión, 3 reintentos de sesión; falla en cambios multi-archivo en cascada), luego Claude Code: "top-performing agent", usado en "about 50 migrations", origen de la mayoría de PRs fusionados.
  - Principios de prompt: describir el estado final, precondiciones (cuándo no actuar), ejemplos de código concretos, estado final verificable (idealmente tests), un cambio a la vez, pedir feedback al agente sobre el prompt.
  - Herramientas: verify (formatters, linters, tests vía MCP con logs resumidos), Git restringido (sin push ni cambiar origin), Bash con allowlist estricta (ripgrep). Sin búsqueda de código ni docs: el contexto va en el prompt.
- "Background Coding Agents: Predictable Results Through Strong Feedback Loops (Honk, Part 3)", 2025-12-09: https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3
  - Modos de fallo: no produce PR (molestia menor); PR falla CI; PR pasa CI pero es incorrecto (el peor).
  - Verificadores independientes activados por contenido (p. ej. Maven si hay pom.xml en la raíz), expuestos como herramienta MCP; extraen errores relevantes con regex. En Claude Code se ejecutan en el stop hook antes de abrir PR.
  - LLM-as-judge recibe diff + prompt original; veta ~1/4 de miles de sesiones; el agente se corrige ~la mitad de las veces; causa más común: salirse del alcance del prompt. Aún sin evals del juez.
  - Contenedor con permisos limitados, pocos binarios, casi sin acceso a sistemas circundantes. Verificadores solo en Linux x86.
- Devon Edwards Joseph, "Background Coding Agents: Supercharging Downstream Consumer Dataset Migrations (Honk, Part 4)", 2026-04-22: https://engineering.atspotify.com/2026/4/background-coding-agents-dataset-migrations-honk-part-4
  - ~1.800 pipelines directos aguas abajo; 240 PRs automatizados vía Fleetshift; plazo de 6 meses; BigQuery Runner, dbt, Scio (Scio descartado por variabilidad); ahorro estimado ~10 semanas-ingeniero; sin tests en build en BigQuery Runner/dbt → sin loop de verificación, tests manuales del equipo dueño; campos que requieren juicio quedaron con comentario y enlace a guía humana; tablas de mapeo explícitas tras suposiciones erróneas.
- Secundario (no usado como dato duro): prensa de 2026-02 (TechCrunch, 2026-02-12) sobre declaraciones del co-CEO de Spotify; QCon "1.000 PRs en 10 días" (InfoQ) — no verificado contra fuente primaria.

## 5. Nubank con Devin (Cognition) — partición de un monolito ETL

Fuente: caso de cliente de Cognition (vendor), "How Nubank refactors millions of lines of code to improve engineering efficiency with Devin": https://devin.ai/customers/nubank — sin fecha visible; describe un proyecto 2023–2024; consultado 2026-11-01.
- Monolito ETL de 8 años, > 6 M líneas; ~100.000 implementaciones de clases de datos; > 1.000 ingenieros involucrados; plazo esperado 18 meses; cadenas de hasta 70 niveles de dependencias.
- Fine-tuning con migraciones manuales previas (parte para entrenamiento, parte como set de evaluación): tasa de completitud ×2 y velocidad ×4 (sub-tarea de ~40 a ~10 min).
- Devin escribió sus propios scripts para pasos repetitivos (p. ej. detectar código de país br/co/mx por ruta).
- Humanos gestionan el proyecto, revisan, ajustan y fusionan PRs.
- Cifras inconsistentes en la propia página: "8x" (titular), "12x efficiency improvement in terms of engineering hours saved" (resumen), "8-12x" (resultados); "over 20x cost savings" sobre el alcance delegado, comparando costo de Devin con costo por hora de un ingeniero.
- Todas son cifras del proveedor; sin verificación independiente ni post técnico de Nubank encontrado.

## Complemento: generación de tests

- Meta, Alshahwan et al., "Automated Unit Test Improvement using Large Language Models at Meta" (TestGen-LLM), arXiv:2402.09171, 2024-02-14: https://arxiv.org/abs/2402.09171 — 75 % de tests compilan, 57 % pasan de forma fiable, 25 % aumentan cobertura (Reels/Stories); 11,5 % de las clases mejoradas en test-a-thons; 73 % de recomendaciones aceptadas por ingenieros. Patrón: filtros deterministas (compila → pasa repetidamente → sube cobertura) antes de mostrar al humano.

## Descartados o no usados

- Uber (Validator/AutoCover en LangGraph): la plataforma de agentes de Uber la cubre /guia/caso-plataformas-internas; no encontré un post de ingeniería primario con cifras de migración que justificara un caso propio.
- Shopify, Stripe, Salesforce: no encontré en esta sesión posts primarios con detalle técnico de migraciones con agentes comparable a los elegidos; no investigados en profundidad.
- Caso de aerolínea con AWS Transform (80 %): solo prensa, sin fuente primaria con cliente nombrado.
- Spotify "1.000 PRs en 10 días": solo cobertura secundaria de QCon.
