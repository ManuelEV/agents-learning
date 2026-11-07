import type { IsoSpec } from '../components/iso/types'

/* Reconstrucciones a partir de lo publicado por cada empresa
   (ver docs/research/casos/caso-migraciones-codigo.md). `migrar_unidad.py` es el
   bloque ilustrativo de la propia página; el resto del código y los payloads son
   ILUSTRATIVOS DEL PATRÓN: ninguna de estas empresas publicó ese código. */

const json = (v: unknown) => JSON.stringify(v, null, 2)

// Bloque literal de la sección "Cómo aplicarlo" de la página.
const MIGRAR_UNIDAD = `import os, subprocess, pathlib
import litellm

MAX_INTENTOS = 6
# Oráculo determinista: el orden importa (lo barato primero).
VALIDACION = [["npx", "eslint", "{f}"], ["npx", "tsc", "--noEmit", "-p", "."], ["npx", "jest", "{f}"]]

def validar(archivo: str) -> str | None:
    """Devuelve el primer error (recortado) o None si todo pasa."""
    for plantilla in VALIDACION:
        cmd = [p.replace("{f}", archivo) for p in plantilla]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        if r.returncode != 0:
            return (r.stdout + r.stderr)[-4000:]   # la cola del log suele tener el error útil
    return None

def migrar(archivo: str, instrucciones: str, contexto: str) -> str:
    ruta, error = pathlib.Path(archivo), None
    for intento in range(1, MAX_INTENTOS + 1):
        prompt = f"{instrucciones}\\n\\n## Contexto\\n{contexto}\\n\\n## Archivo\\n{ruta.read_text()}"
        if error:
            prompt += f"\\n\\n## Falló la validación (intento {intento - 1})\\n{error}"
        r = litellm.completion(
            model="litellm_proxy/claude-sonnet",            # alias definido en tu AI gateway
            api_base=os.environ["AI_GATEWAY_URL"], api_key=os.environ["AI_GATEWAY_KEY"],
            temperature=0,
            messages=[{"role": "system", "content": "Devuelve solo el archivo completo migrado."},
                      {"role": "user", "content": prompt}],
        )
        ruta.write_text(r.choices[0].message.content)
        error = validar(archivo)
        if error is None:
            return "validado"        # pasa a la cola de PRs
    return "manual"                  # la última versión queda como borrador para una persona`

/* ─────────────────────────── Airbnb ─────────────────────────── */

const AIRBNB_ESTADOS = `# maquina_estados.py (ilustrativo del patrón descrito por Airbnb; no es su código)
import pathlib, re
from concurrent.futures import ThreadPoolExecutor
from migrar_unidad import migrar

PASOS = ["refactor_enzyme", "arreglar_jest", "arreglar_lint_tsc", "completo"]
MARCA = re.compile(r"^// migracion: paso=(\\S+).*$", re.M)

def leer_estado(archivo: str) -> str:
    m = MARCA.search(pathlib.Path(archivo).read_text())
    return m.group(1) if m else PASOS[0]

def estampar(archivo: str, paso: str, detalle: str):
    """Deja el resultado del paso en el propio archivo: visible y filtrable."""
    ruta = pathlib.Path(archivo)
    texto = MARCA.sub("", ruta.read_text()).lstrip("\\n")
    ruta.write_text(f"// migracion: paso={paso} {detalle}\\n" + texto)

def avanzar(archivo: str) -> str:
    paso = leer_estado(archivo)
    while paso != "completo":
        # generar → validar → reintentar; en Airbnb cada paso tiene su propia validación
        resultado = migrar(archivo, INSTRUCCIONES[paso], contexto_para(archivo))
        if resultado != "validado":
            estampar(archivo, paso, detalle_validacion(archivo))
            return paso                              # se queda en este estado
        paso = PASOS[PASOS.index(paso) + 1]          # solo avanza si pasa la validación
        estampar(archivo, paso, "estado=pendiente")
    return "completo"

def barrer(archivos, patron="*", solo_paso=None, hilos=200):
    """Primer barrido o re-barrido ("sample, tune, sweep") de lo que coincide."""
    pendientes = [a for a in archivos
                  if pathlib.PurePath(a).match(patron)
                  and leer_estado(a) != "completo"
                  and (solo_paso is None or leer_estado(a) == solo_paso)]
    with ThreadPoolExecutor(hilos) as pool:          # cientos de archivos a la vez
        return dict(zip(pendientes, pool.map(avanzar, pendientes)))`

export const cmcAirbnb: IsoSpec = {
  id: 'cmc-airbnb',
  title: 'Airbnb: máquina de estados por archivo (Enzyme → RTL)',
  summary:
    '**Reconstrucción** a partir del post de Airbnb Engineering (marzo de 2025). Cada uno de los ~3.500 archivos de test recorre una **máquina de estados**: refactor → Jest → lint y `tsc` → completo. Solo avanza si pasa la validación del paso; si falla, el error vuelve al LLM como contexto y se reintenta. Los nombres de los nodos son descriptivos, no componentes publicados. `migrar_unidad.py` es el fragmento ilustrativo de esta página ("al estilo Airbnb"); `maquina_estados.py` y los payloads son **ilustrativos del patrón**, no código de Airbnb.',
  height: 520,
  nodes: [
    { id: 'inv', label: 'Inventario de tests', sub: '~3.500 archivos Enzyme', at: [0, 0], shape: 'doc', tone: 'data', icon: 'file', info: 'Todos los archivos de test de componentes React que aún usaban Enzyme. Borrarlos no era opción: dejaba huecos de cobertura.' },
    { id: 'runner', label: 'Runner de pasos', sub: 'cientos en paralelo', at: [3.3, 0], shape: 'hex', tone: 'infra', icon: 'workflow', info: 'Ejecuta cada paso por archivo, con un número configurable de intentos. Al ser por archivo, el trabajo se paraleliza a cientos de archivos a la vez.' },
    { id: 'ctx', label: 'Contexto', sub: '40k–100k tokens', at: [3.3, -3.3], shape: 'doc', tone: 'memory', icon: 'layers', info: 'Componente bajo test, el test, errores de validación, tests hermanos del directorio, imports, ejemplos de RTL y few-shot escritos a mano: hasta 50 archivos relacionados. Según Airbnb, elegir bien estos archivos importó más que pulir la redacción.' },
    { id: 'llm', label: 'LLM', sub: 'reescribe', at: [6.6, -3.3], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Recibe el paso actual y su contexto y devuelve la nueva versión del archivo. El post no detalla qué modelo se usó.' },
    { id: 'gate', label: 'Validación del paso', sub: 'Jest · ESLint · tsc', at: [6.6, 0], shape: 'diamond', tone: 'guard', icon: 'check', info: 'Oráculo determinista: el test corre en Jest, pasa el linter y compila con TypeScript. Si falla, el archivo no avanza de estado.' },
    { id: 'state', label: 'Estado por archivo', sub: 'comentario en el archivo', at: [6.6, 3.3], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Cada archivo lleva estampado un comentario con el resultado de cada paso (p. ej. cuántos tests de Jest pasan). Así se puede filtrar y re-ejecutar por patrón.' },
    { id: 'done', label: 'Archivo migrado', sub: 'RTL, listo para PR', at: [9.9, 0], shape: 'box', tone: 'tool', icon: 'check', info: 'El archivo superó todos los pasos. 75 % llegaron aquí en el primer barrido de 4 horas; 97 % tras 4 días de ajuste.' },
    { id: 'eng', label: 'Ingeniero', sub: 'sample · tune · sweep', at: [9.9, -3.3], shape: 'person', tone: 'user', icon: 'user', info: 'Toma 5–10 archivos fallidos representativos, ajusta prompts y scripts, valida en la muestra y vuelve a barrer todos los pendientes.' },
    { id: 'manual', label: 'Cola larga', sub: '< 100 archivos a mano', at: [9.9, 3.3], shape: 'person', tone: 'user', icon: 'hand', info: 'Cuando la automatización tocó techo, el equipo terminó el ~3 % restante a mano, partiendo de la salida fallida del LLM como base.' },
  ],
  edges: [
    { from: 'inv', to: 'runner' },
    { from: 'runner', to: 'llm', route: 'z' },
    { from: 'ctx', to: 'llm' },
    { from: 'llm', to: 'gate', route: 'z' },
    { from: 'gate', to: 'llm', label: 'error', route: 'arc', dashed: true },
    { from: 'gate', to: 'state', route: 'z' },
    { from: 'gate', to: 'done', label: 'pasa' },
    { from: 'eng', to: 'ctx', route: 'arc', dashed: true },
    { from: 'state', to: 'manual' },
  ],
  code: {
    estados: { title: 'maquina_estados.py (ilustrativo del patrón)', lang: 'python', source: AIRBNB_ESTADOS },
    unidad: { title: 'migrar_unidad.py (ilustrativo)', lang: 'python', source: MIGRAR_UNIDAD },
  },
  steps: [
    {
      title: '1 · Fan-out por archivo',
      body: 'El inventario se reparte en unidades independientes: **un archivo de test**. El runner procesa cientos en paralelo y cada archivo empieza en el primer estado de la máquina.',
      flows: ['inv>runner'],
      data: {
        title: 'inventario con estado por archivo (ilustrativo)',
        lang: 'json',
        content: json({
          total: 3500,
          archivos: [
            { ruta: 'app/listing/__tests__/ListingCard.test.tsx', paso: 'refactor_enzyme' },
            { ruta: 'app/search/__tests__/MapPin.test.tsx', paso: 'refactor_enzyme' },
            { ruta: 'app/host/__tests__/CalendarDay.test.tsx', paso: 'refactor_enzyme' },
          ],
        }),
        hl: ['"paso": "refactor_enzyme"'],
      },
      code: { file: 'estados', hl: ['PASOS = [', 'ThreadPoolExecutor(hilos)', 'pool.map(avanzar'] },
    },
    {
      title: '2 · Contexto amplio',
      body: 'Para cada paso se arma un prompt con el componente, tests vecinos, imports, ejemplos de RTL y few-shot: **entre 40.000 y 100.000 tokens** al final del proyecto. Elegir bien esos archivos importó más que la redacción.',
      flows: ['ctx>llm', 'runner>llm'],
      data: {
        title: 'estructura del prompt de un paso (ilustrativa)',
        lang: 'text',
        content: `[instrucciones del paso: refactor_enzyme]
Migra este test de Enzyme a React Testing Library conservando
lo que verifica. No borres casos de prueba.

## Contexto  (hasta ~50 archivos relacionados)
- ListingCard.tsx              ← componente bajo test
- PriceTag.test.tsx            ← test hermano ya migrado a RTL
- imports de ListingCard
- ejemplos RTL y few-shot escritos a mano
- guía de migración Enzyme → RTL

## Archivo
<contenido actual de ListingCard.test.tsx>`,
        hl: ['## Contexto', 'test hermano', '## Archivo'],
      },
      code: { file: 'unidad', hl: ['def migrar(', 'prompt = f"{instrucciones}'] },
    },
    {
      title: '3 · Paso y validación',
      body: 'El LLM reescribe el archivo y un **validador determinista** decide: ¿corre en Jest?, ¿pasa lint?, ¿compila con `tsc`? La cola del log, recortada, es lo que se guarda como error.',
      flows: ['runner>llm', 'llm>gate'],
      data: {
        title: 'salida de Jest que falla (ilustrativa)',
        lang: 'bash',
        content: `$ npx jest app/listing/__tests__/ListingCard.test.tsx
FAIL app/listing/__tests__/ListingCard.test.tsx
  ● ListingCard › muestra el precio por noche

    TestingLibraryElementError: Unable to find an element with the text: $120 / noche

      14 |   render(<ListingCard listing={listing} />)
    > 15 |   expect(screen.getByText('$120 / noche')).toBeInTheDocument()

Tests: 1 failed, 11 passed, 12 total`,
        hl: ['FAIL', 'Tests: 1 failed'],
      },
      code: { file: 'unidad', hl: ['litellm.completion(', 'ruta.write_text(', 'error = validar(archivo)', 'VALIDACION = ['] },
    },
    {
      title: '4 · Reintento con el error',
      body: 'Si falla, el error y la última versión del archivo vuelven al LLM. La mayoría de los archivos terminó en unos **10 intentos**; la cola larga necesitó 50–100.',
      flows: ['gate>llm'],
      data: {
        title: 'lo que se agrega al prompt en el reintento (ilustrativo)',
        lang: 'text',
        content: `## Falló la validación (intento 3)
FAIL app/listing/__tests__/ListingCard.test.tsx
  ● ListingCard › muestra el precio por noche
    Unable to find an element with the text: $120 / noche
Tests: 1 failed, 11 passed, 12 total`,
        hl: ['## Falló la validación'],
      },
      code: { file: 'unidad', hl: ['if error:', 'prompt += f"', 'for intento in range(1, MAX_INTENTOS + 1)'] },
    },
    {
      title: '5 · Estado visible',
      body: 'El resultado de cada paso queda **estampado en el propio archivo**. Con eso se puede filtrar y re-ejecutar un paso solo sobre los archivos que lo necesitan.',
      flows: ['gate>state'],
      data: {
        title: 'comentario de estado en el archivo (formato ilustrativo)',
        lang: 'ts',
        content: `// migracion: paso=arreglar_jest jest=11/12 intentos=3
import { render, screen } from '@testing-library/react'
import ListingCard from '../ListingCard'
// …`,
        hl: ['// migracion: paso=arreglar_jest'],
      },
      code: { file: 'estados', hl: ['def estampar', 'MARCA = re.compile', 'def leer_estado'] },
    },
    {
      title: '6 · Avance',
      body: 'Al pasar la validación, el archivo avanza al siguiente estado; tras los cuatro queda migrado. En el primer barrido de 4 horas llegó aquí el **75 %**.',
      flows: ['gate>done'],
      data: {
        title: 'test migrado a RTL (extracto ilustrativo)',
        lang: 'ts',
        content: `// migracion: paso=completo
import { render, screen } from '@testing-library/react'
import ListingCard from '../ListingCard'

it('muestra el precio por noche', () => {
  render(<ListingCard listing={listing} />)
  expect(screen.getByText(/\\$120/)).toBeInTheDocument()
})`,
        hl: ['paso=completo', 'screen.getByText'],
      },
      code: { file: 'estados', hl: ['paso = PASOS[PASOS.index(paso) + 1]', 'return "completo"'] },
    },
    {
      title: '7 · Sample, tune, sweep',
      body: 'Un ingeniero agrupa fallos comunes, toma **5–10 archivos de muestra**, ajusta prompts y scripts, valida en la muestra y vuelve a barrer todo lo pendiente: **97 %** en 4 días.',
      flows: ['eng>ctx'],
      data: {
        title: 're-barrido sobre un patrón (comando ilustrativo)',
        lang: 'bash',
        content: `# 1. muestra: 8 archivos que fallan en arreglar_jest por el mismo motivo
python -c "from maquina_estados import barrer; barrer(muestra, solo_paso='arreglar_jest')"
# 2. ajustar el prompt / agregar un few-shot y repetir sobre la muestra
# 3. sweep: todos los pendientes de ese paso
python -c "from maquina_estados import barrer; barrer(todos, patron='app/**/*.test.tsx', solo_paso='arreglar_jest')"`,
        hl: ["solo_paso='arreglar_jest'", 'sweep'],
      },
      code: { file: 'estados', hl: ['def barrer', 'solo_paso is None or'] },
    },
    {
      title: '8 · Humano para el último 3 %',
      body: 'La automatización tocó techo cerca del 97 %. Menos de 100 archivos se terminaron a mano, partiendo de la **última versión fallida** del LLM. Total: 6 semanas frente a 1,5 años estimados (cifras de Airbnb).',
      flows: ['state>manual'],
      data: {
        title: 'resultado de la campaña (cifras de Airbnb, marzo de 2025)',
        lang: 'json',
        content: json({
          archivos: '~3.500',
          primer_barrido: { duracion: '4 horas', completos: '75 %' },
          tras_sample_tune_sweep: { duracion: '4 días', completos: '97 %' },
          a_mano: '< 100 archivos (≈ 1 semana)',
          total: '6 semanas vs. 1,5 años estimados',
        }),
        hl: ['"a_mano"', '"total"'],
      },
      code: { file: 'unidad', hl: ['return "manual"'] },
    },
  ],
}

/* ─────────────────────────── Google ─────────────────────────── */

const GOOGLE_VALIDADORES = `# validadores.py (ilustrativo del flujo de arXiv 2504.09691; no es código de Google)
import random

MAX_INTENTOS = 3
VALIDADORES = [                                   # en orden: lo barato primero
    ("exito",      lambda c: c.diff.strip() != ""),           # hubo cambio
    ("whitespace", lambda c: not solo_espacios(c.diff)),      # no es solo formato
    ("ast",        lambda c: parsea(c.archivo_nuevo)),        # AST válido
    ("punt",       lambda c: llm_juzga_necesario(c)),         # ¿el cambio era necesario?
    ("build",      lambda c: build(c.target).ok),
    ("test",       lambda c: test(c.target).ok),
]

def migrar_archivo(archivo, lineas_sugeridas, prompt):
    exitosos = []
    for intento in range(MAX_INTENTOS):
        diff = llm(prompt, archivo=archivo.completo, lineas=lineas_sugeridas,
                   temperature=0)
        cand = aplicar_con_fuzzy_matching(archivo, diff)
        fallo = next((nombre for nombre, ok in VALIDADORES if not ok(cand)), None)
        registrar(archivo, intento, fallo)               # métrica por validador
        if fallo is None:
            exitosos.append(cand)
    if exitosos:
        return random.choice(exitosos)    # el paper elige al azar un candidato válido
    return marcar_para_migracion_manual(archivo)`

export const cmcGoogle: IsoSpec = {
  id: 'cmc-google',
  title: 'Google: descubrimiento con Kythe, LLM y validación en cadena',
  summary:
    '**Reconstrucción** del flujo descrito en los papers de Google (arXiv 2501.06972 y 2504.09691) para migrar IDs de `int32` a `int64`. El descubrimiento de sitios es **determinista** (índice de referencias); el LLM solo edita; una cadena de validadores filtra; y los humanos revisan en shards por code owner. El código, los nombres de campos y los payloads son **ilustrativos del patrón**: Google describió el flujo, no publicó su código.',
  height: 520,
  nodes: [
    { id: 'expert', label: 'Experto', sub: 'siembra campos protobuf', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Un ingeniero que conoce la migración indica los campos de partida (p. ej. el ID de una entidad de Ads) y los prompts con las reglas del cambio.' },
    { id: 'kythe', label: 'Kythe', sub: 'referencias hasta dist. 5', at: [3.3, 0], shape: 'stack', tone: 'data', icon: 'search', info: 'Índice de referencias cruzadas del monorepo. Recorre referencias directas e indirectas de forma conservadora: incluye algunos sitios irrelevantes a propósito.' },
    { id: 'cat', label: 'Categorizar', sub: 'regex + revisión', at: [6.6, 0], shape: 'diamond', tone: 'guard', icon: 'filter', info: 'Clasifica cada ubicación (no migrada, irrelevante, relevante, sobrante). Los casos claros los resuelven regex; el resto lo revisa un desarrollador.' },
    { id: 'llm', label: 'Gemini interno', sub: 'temp. 0 · ≤ 3 intentos', at: [6.6, -3.3], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Modelo ajustado con código de Google (DIDACT), usado solo con prompting para esta tarea. Recibe el archivo completo y las líneas sugeridas; devuelve diffs aplicados con fuzzy matching.' },
    { id: 'val', label: 'Validadores', sub: 'AST · punt · build · test', at: [9.9, -3.3], shape: 'diamond', tone: 'guard', icon: 'check', info: 'En orden: éxito, whitespace, parser AST, "punt" (el LLM juzga si el cambio era necesario), build y tests. Un fallo descarta el intento.' },
    { id: 'rank', label: 'Selección', sub: 'un candidato válido', at: [9.9, 0], shape: 'box', tone: 'tool', icon: 'list', info: 'En el paper de 2025 se elige al azar un resultado exitoso; el toolkit general rankea candidatos por validación y similitud con diffs de ejemplo.' },
    { id: 'manual', label: 'Migración manual', sub: 'archivos que fallan', at: [9.9, 3.3], shape: 'person', tone: 'user', icon: 'hand', info: 'Si los tres intentos fallan, el archivo queda marcado para que lo migre una persona.' },
    { id: 'lsc', label: 'Large Scale Changes', sub: 'shards por owner', at: [13.2, 0], shape: 'hex', tone: 'infra', icon: 'split', info: 'La infraestructura de cambios masivos divide el trabajo en cambios revisables y los enruta a cada code owner. En JUnit, el volumen semanal se limitó para no saturar revisores.' },
    { id: 'owners', label: 'Code owners', sub: 'revisión en Critique', at: [13.2, 3.7], shape: 'person', tone: 'user', icon: 'users', info: 'Revisan y aprueban. En las migraciones de IDs, 74,45 % de los cambios enviados tenían código generado por el LLM (35,97 % solo LLM).' },
  ],
  edges: [
    { from: 'expert', to: 'kythe' },
    { from: 'kythe', to: 'cat' },
    { from: 'cat', to: 'llm', label: 'relevantes', route: 'z' },
    { from: 'llm', to: 'val' },
    { from: 'val', to: 'llm', label: 'reintento', route: 'arc', dashed: true },
    { from: 'val', to: 'rank', route: 'z' },
    { from: 'val', to: 'manual', route: 'arc', dashed: true },
    { from: 'rank', to: 'lsc' },
    { from: 'lsc', to: 'owners', route: 'z' },
  ],
  code: { val: { title: 'validadores.py (ilustrativo del patrón)', lang: 'python', source: GOOGLE_VALIDADORES } },
  steps: [
    {
      title: '1 · Semilla experta',
      body: 'Un experto indica los campos a migrar y redacta las reglas del cambio. No hay un agente "planificador": el plan lo pone una persona (Google reporta que la planificación agéntica a menudo agregaba complejidad sin beneficio).',
      flows: ['expert>kythe'],
      data: {
        title: 'semilla de la migración (nombres ilustrativos)',
        lang: 'json',
        content: json({
          campos_semilla: ['ejemplo.ads.Entidad.entidad_id'],
          tipo: { de: 'int32', a: 'int64' },
          reglas: [
            'Cambia variables, parámetros y retornos que transportan este ID a int64/long.',
            'No cambies contadores ni índices que solo comparten el tipo int.',
          ],
        }),
        hl: ['"campos_semilla"', '"reglas"'],
      },
    },
    {
      title: '2 · Descubrimiento determinista',
      body: 'Kythe encuentra referencias directas e indirectas (hasta **distancia 5** en el paper de abril de 2025). Es conservador: prefiere incluir sitios de más que perder uno.',
      flows: ['kythe>cat'],
      data: {
        title: 'referencias encontradas (ilustrativo)',
        lang: 'json',
        content: json([
          { archivo: 'ads/servicio/EntidadDao.java', linea: 88, distancia: 1 },
          { archivo: 'ads/servicio/ReporteBuilder.java', linea: 142, distancia: 2 },
          { archivo: 'ads/util/Paginador.java', linea: 31, distancia: 4 },
        ]),
        hl: ['"distancia": 4'],
      },
    },
    {
      title: '3 · Filtrado',
      body: 'Regex y revisión humana clasifican cada ubicación (**no migrada, irrelevante, relevante, sobrante**) antes de gastar tokens. Solo lo relevante llega al modelo.',
      flows: ['cat>llm'],
      data: {
        title: 'categorización (categorías del paper; casos ilustrativos)',
        lang: 'json',
        content: json([
          { ubicacion: 'EntidadDao.java:88', categoria: 'relevante', por: 'regex' },
          { ubicacion: 'ReporteBuilder.java:142', categoria: 'relevante', por: 'revisión humana' },
          { ubicacion: 'Paginador.java:31', categoria: 'irrelevante', por: 'revisión humana', motivo: 'índice de página, no el ID' },
        ]),
        hl: ['"relevante"', '"irrelevante"'],
      },
    },
    {
      title: '4 · Edición con LLM',
      body: 'El modelo recibe el **archivo completo y las líneas sugeridas**, a temperatura 0, y devuelve un diff que se aplica con *fuzzy matching*. Hasta tres intentos por archivo.',
      flows: ['cat>llm', 'llm>val'],
      focus: ['llm'],
      data: {
        title: 'diff propuesto (ilustrativo)',
        lang: 'text',
        content: `--- a/ads/servicio/EntidadDao.java
+++ b/ads/servicio/EntidadDao.java
@@ -86,4 +86,4 @@
-  public Entidad buscar(int entidadId) {
-    int id = request.getEntidadId();
+  public Entidad buscar(long entidadId) {
+    long id = request.getEntidadId();
     return cache.get(id);`,
        hl: ['+  public Entidad buscar(long entidadId)', '+    long id'],
      },
      code: { hl: ['temperature=0', 'lineas=lineas_sugeridas', 'aplicar_con_fuzzy_matching'] },
    },
    {
      title: '5 · Cadena de validadores',
      body: 'Diff vacío, solo whitespace, AST inválido, cambio innecesario ("punt"), build roto o tests rojos: **cualquiera descarta el intento**. Los baratos van primero para no gastar minutos de CI.',
      flows: ['llm>val', 'val>llm'],
      data: {
        title: 'registro de intentos de un archivo (ilustrativo)',
        lang: 'json',
        content: json([
          { intento: 1, fallo: 'build', detalle: 'ReporteBuilder.java:142: incompatible types: possible lossy conversion from long to int' },
          { intento: 2, fallo: null },
          { intento: 3, fallo: 'punt', detalle: 'el LLM juzga innecesario el cambio en un contador' },
        ]),
        hl: ['"fallo": "build"', '"fallo": null', '"fallo": "punt"'],
      },
      code: { hl: ['VALIDADORES = [', '("punt"', 'fallo = next(', 'registrar(archivo, intento, fallo)'] },
    },
    {
      title: '6 · Selección o descarte',
      body: 'Si hay al menos un candidato válido, se elige (en el paper de 2025, al azar entre los exitosos); si los tres intentos fallan, el archivo pasa a **migración manual**.',
      flows: ['val>rank', 'val>manual'],
      data: {
        title: 'resultado por archivo (ilustrativo)',
        lang: 'json',
        content: json({
          'EntidadDao.java': { estado: 'candidato_valido', elegido: 'intento 2' },
          'LegacyExport.java': { estado: 'manual', motivo: '3 intentos fallidos (build)' },
        }),
        hl: ['"candidato_valido"', '"manual"'],
      },
      code: { hl: ['random.choice(exitosos)', 'marcar_para_migracion_manual'] },
    },
    {
      title: '7 · Revisión por shards',
      body: 'Los cambios se agrupan y van a cada **code owner** para revisión en Critique. La revisión humana resultó ser el cuello de botella: en JUnit limitaron el volumen semanal de cambios.',
      flows: ['rank>lsc', 'lsc>owners'],
      data: {
        title: 'shards hacia code owners (forma ilustrativa)',
        lang: 'json',
        content: json({
          campana: 'ids-int64-entidad',
          shards: [
            { owner: 'equipo-ads-servicio', archivos: 14, estado: 'en revisión' },
            { owner: 'equipo-ads-reportes', archivos: 9, estado: 'en cola (límite semanal)' },
          ],
        }),
        hl: ['"owner"', 'límite semanal'],
      },
    },
  ],
}

/* ─────────────────────────── Spotify ─────────────────────────── */

const SPOTIFY_VERIFY = `# verify.py (ilustrativo del patrón de Honk; Spotify no publicó este código)
import pathlib, re, subprocess
from mcp.server import MCPServer

mcp = MCPServer("verificadores")

VERIFICADORES = [                                   # se activan según el repo
    ("maven",  lambda r: (r / "pom.xml").exists(),      ["mvn", "-q", "verify"]),
    ("gradle", lambda r: (r / "build.gradle").exists(), ["./gradlew", "check"]),
    ("node",   lambda r: (r / "package.json").exists(), ["npm", "test"]),
]
ERROR = re.compile(r"^\\[ERROR\\].*$|^.*error:.*$|^FAIL .*$", re.M)   # solo lo relevante

@mcp.tool()
def verify() -> dict:
    """Formatea, compila y prueba el repo. Devuelve solo los errores relevantes."""
    repo, errores = pathlib.Path("."), []
    for nombre, aplica, cmd in VERIFICADORES:
        if not aplica(repo):
            continue
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
        if r.returncode != 0:
            lineas = ERROR.findall(r.stdout + r.stderr)[:20]
            errores += [f"[{nombre}] {l}" for l in lineas]
    return {"ok": not errores, "errores": errores}`

const SPOTIFY_SETTINGS = `{
  "permissions": {
    "allow": ["Read", "Edit", "Bash(rg:*)", "mcp__verificadores__verify"],
    "deny": ["Bash(git push:*)", "Bash(git remote:*)", "WebFetch", "WebSearch"]
  },
  "hooks": {
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "python /opt/agente/verificar_todo.py" }
        ]
      }
    ]
  }
}`

export const cmcSpotify: IsoSpec = {
  id: 'cmc-spotify',
  title: 'Spotify Honk: agente de fondo dentro de Fleet Management',
  summary:
    '**Reconstrucción** a partir de la serie *Honk* de Spotify Engineering (partes 1–4, 2025–2026). Fleet Management ya sabía elegir repos, abrir PRs y hacer merge; Honk reemplaza solo el **script de transformación** por un agente en un contenedor con herramientas mínimas, **verificadores** vía MCP y un **LLM-as-judge** antes del PR. `verify.py` y el `settings.json` de Claude Code son **ilustrativos del patrón**: Spotify describió las piezas, no publicó su código ni su configuración.',
  height: 520,
  nodes: [
    { id: 'eng', label: 'Ingeniero', sub: 'describe el cambio', at: [-0.5, 0], shape: 'person', tone: 'user', icon: 'user', info: 'Define el cambio de flota en lenguaje natural, desde la CLI o lanzándolo desde Slack o GitHub Enterprise (el agente está expuesto vía MCP).' },
    { id: 'pa', label: 'Agente de prompts', sub: 'interactivo', at: [3.3, -3.3], shape: 'tall', tone: 'agent', icon: 'message', scale: 0.9, info: 'Un agente interactivo recoge los detalles de la tarea y produce el prompt para el agente de código: estado final, precondiciones, ejemplos.' },
    { id: 'fleet', label: 'Fleet Management', sub: 'elige repos', at: [2.7, 0], shape: 'hex', tone: 'infra', icon: 'boxes', info: 'Infraestructura existente: elige repos objetivo, corre la transformación como job en contenedores y abre los PRs. Desde mediados de 2024 automatiza cerca de la mitad de los PRs de Spotify.' },
    { id: 'agent', label: 'Honk', sub: 'Claude Code', at: [6.6, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'El agente de código. Spotify probó Goose, Aider y un loop propio antes de quedarse con Claude Code (usado en ~50 migraciones). Puede leer el repo, editar archivos y llamar a los verificadores; nada más.' },
    { id: 'verify', label: 'Verificadores', sub: 'format · build · test', at: [6.6, -3.7], shape: 'box', tone: 'tool', icon: 'check', info: 'Herramienta MCP que activa verificadores según el contenido del repo (p. ej. Maven si hay `pom.xml`). Resume los errores con regex. Se ejecutan todos en el stop hook antes de abrir el PR.' },
    { id: 'judge', label: 'LLM-as-judge', sub: 'diff + prompt original', at: [9.9, 0], shape: 'diamond', tone: 'guard', icon: 'eye', info: 'Compara el diff con el prompt. Veta cerca de un cuarto de las sesiones, sobre todo cuando el agente se sale del alcance; el agente logra corregirse cerca de la mitad de las veces.' },
    { id: 'traces', label: 'Trazas y logs', sub: 'MLflow · GCP', at: [9.9, 3.3], shape: 'cylinder', tone: 'memory', icon: 'chart', info: 'Cada sesión deja trazas en MLflow y logs en GCP: base para depurar prompts y medir la tasa de PRs fusionados.' },
    { id: 'pr', label: 'Pull request', sub: 'GitHub Enterprise', at: [13.2, 0], shape: 'box', tone: 'tool', icon: 'branch', info: 'El push y la apertura del PR los hace la infraestructura, no el agente (su Git está restringido: sin push ni cambio de origin).' },
    { id: 'owner', label: 'Equipo dueño', sub: 'review y merge', at: [13.2, 3.3], shape: 'person', tone: 'user', icon: 'users', info: 'Revisa y fusiona. Más de 1.500 PRs del agente fusionados a noviembre de 2025, según Spotify.' },
  ],
  zones: [{ id: 'sandbox', label: 'Contenedor con permisos mínimos', from: [5.0, -5.3], to: [8.2, 1.6], tone: 'guard' }],
  edges: [
    { from: 'eng', to: 'pa', route: 'z' },
    { from: 'pa', to: 'fleet', route: 'z' },
    { from: 'eng', to: 'fleet' },
    { from: 'fleet', to: 'agent', label: 'por repo' },
    { from: 'agent', to: 'verify', route: 'z' },
    { from: 'agent', to: 'judge' },
    { from: 'judge', to: 'agent', label: 'veto', route: 'arc', dashed: true },
    { from: 'judge', to: 'traces', route: 'z', dashed: true },
    { from: 'judge', to: 'pr' },
    { from: 'pr', to: 'owner', route: 'z' },
  ],
  code: {
    verify: { title: 'verify.py (ilustrativo del patrón)', lang: 'python', source: SPOTIFY_VERIFY },
    settings: { title: 'settings.json de Claude Code (ilustrativo)', lang: 'json', source: SPOTIFY_SETTINGS },
  },
  steps: [
    {
      title: '1 · Del pedido al prompt',
      body: 'El ingeniero describe el cambio; un agente interactivo lo convierte en un prompt con los principios que Spotify publicó: **estado final verificable**, precondiciones (cuándo no actuar), ejemplos concretos y un solo cambio a la vez.',
      flows: ['eng>pa', 'pa>fleet'],
      data: {
        title: 'prompt para el agente de código (ilustrativo)',
        lang: 'text',
        content: `Objetivo: convertir las clases de valor inmutables (value types) a records de Java.

Estado final verificable:
- el build y los tests del repo pasan
- no queda ninguna clase de valor con getters manuales en src/main

Precondiciones (si no se cumplen, no cambies nada y explica por qué):
- el repo compila con Java 17 o superior

Ejemplo:
  antes:   final class Track { private final String name; String getName() {…} }
  después: record Track(String name) {}
  los llamadores pasan de track.getName() a track.name()

Un solo cambio: no refactorices otra cosa ni toques tests no relacionados.`,
        hl: ['Estado final verificable', 'Precondiciones', 'Un solo cambio'],
      },
    },
    {
      title: '2 · Fan-out por repo',
      body: 'Fleet Management elige los repos y lanza **una sesión del agente por repo**, en contenedores aislados. El targeting, el PR y el merge siguen siendo de la infraestructura existente.',
      flows: ['fleet>agent'],
      data: {
        title: 'jobs de la campaña (forma ilustrativa)',
        lang: 'json',
        content: json({
          campana: 'value-types-a-records',
          repos: 312,
          jobs: [
            { repo: 'playlist-service', imagen: 'honk-agent', estado: 'en curso' },
            { repo: 'track-metadata', imagen: 'honk-agent', estado: 'en cola' },
          ],
        }),
        hl: ['"repos"', '"jobs"'],
      },
      code: { file: 'settings', hl: ['"deny"', 'git push'] },
    },
    {
      title: '3 · Loop de verificación',
      body: 'El agente edita y llama a `verify`, que activa formatters, build y tests **según el contenido del repo** y devuelve solo los errores relevantes, extraídos con regex. El agente nunca ve 10.000 líneas de log.',
      flows: ['agent>verify', 'verify>agent'],
      data: {
        title: 'el agente llama a verify (ilustrativo)',
        messages: [
          { role: 'assistant', content: [{ type: 'tool_use', id: 'toolu_51', name: 'mcp__verificadores__verify', input: {} }] },
          {
            role: 'user',
            note: 'errores resumidos',
            content: [{ type: 'tool_result', tool_use_id: 'toolu_51', content: { ok: false, errores: ['[maven] [ERROR] PlaylistMapper.java:[42,17] cannot find symbol: method getName()'] } }],
          },
          { role: 'assistant', note: 'corrige el llamador', content: [{ type: 'text', text: 'Falta actualizar PlaylistMapper: getName() → name(). Lo corrijo y vuelvo a verificar.' }] },
        ],
        hl: [1],
      },
      code: { file: 'verify', hl: ['VERIFICADORES = [', '(r / "pom.xml").exists()', 'ERROR = re.compile', 'def verify()'] },
    },
    {
      title: '4 · Stop hook',
      body: 'Antes de que el agente termine, el **stop hook** ejecuta todos los verificadores. Si alguno falla, no se abre PR (Spotify distingue este fallo, molesto pero inocuo, del peor: un PR que pasa CI y es incorrecto).',
      focus: ['agent', 'verify'],
      data: {
        title: 'salida del stop hook (ilustrativa)',
        lang: 'bash',
        content: `$ python /opt/agente/verificar_todo.py
[maven] mvn -q verify ........ OK
[format] google-java-format .. OK
todos los verificadores pasan → la sesión puede terminar`,
        hl: ['todos los verificadores pasan'],
      },
      code: { file: 'settings', hl: ['"Stop"', 'verificar_todo.py'] },
    },
    {
      title: '5 · Juez de alcance',
      body: 'El LLM-as-judge compara el diff con el prompt original. Veta cerca de **un cuarto** de las sesiones, sobre todo cuando el agente se sale del alcance (refactoriza de más o desactiva un test inestable); el agente se corrige cerca de la mitad de las veces.',
      flows: ['agent>judge', 'judge>agent'],
      data: {
        title: 'veredicto del juez (forma ilustrativa)',
        lang: 'json',
        content: json({
          veto: true,
          motivo: 'El diff desactiva PlaylistCacheTest (@Disabled), fuera del alcance del prompt.',
          instruccion: 'Revierte el cambio en PlaylistCacheTest y deja solo la conversión a records.',
        }),
        hl: ['"veto": true', '"motivo"'],
      },
    },
    {
      title: '6 · PR y revisión humana',
      body: 'La infraestructura (no el agente) hace push y abre el PR; el equipo dueño revisa y fusiona. Las trazas quedan en MLflow y los logs en GCP para mejorar prompts.',
      flows: ['judge>pr', 'pr>owner', 'judge>traces'],
      data: {
        title: 'PR abierto por la infraestructura (forma ilustrativa)',
        lang: 'json',
        content: json({
          repo: 'playlist-service',
          titulo: '[fleet] Convierte value types a records',
          etiquetas: ['fleet-management', 'value-types-a-records'],
          abierto_por: 'bot de Fleet Management',
          verificadores: 'OK',
          juez: 'aprobado tras 1 corrección',
          traza: 'mlflow run 9c41…',
        }),
        hl: ['"abierto_por"', '"juez"'],
      },
    },
  ],
}

/* ─────────────────────────── Propuesta: tu versión ─────────────────────────── */

const WORKER = `# worker.py (ilustrativo: consumidor de la cola de unidades)
import json, os, boto3
from opentelemetry import trace
from migrar_unidad import migrar

sqs, tracer = boto3.client("sqs"), trace.get_tracer("migracion")
COLA = os.environ["COLA_UNIDADES"]

def bucle():
    while True:
        r = sqs.receive_message(QueueUrl=COLA, MaxNumberOfMessages=1, WaitTimeSeconds=20)
        for m in r.get("Messages", []):
            unidad = json.loads(m["Body"])
            with tracer.start_as_current_span("migrar_unidad") as span:
                span.set_attribute("migracion.campana", unidad["campana"])
                span.set_attribute("migracion.archivo", unidad["archivo"])
                estado = migrar(unidad["archivo"], unidad["instrucciones"], unidad["contexto"])
                span.set_attribute("migracion.estado", estado)
            actualizar_estado(unidad["id"], estado)        # validado | manual
            if estado == "validado":
                abrir_pr(unidad)                            # la infraestructura, no el agente
            sqs.delete_message(QueueUrl=COLA, ReceiptHandle=m["ReceiptHandle"])`

export const cmcReferencia: IsoSpec = {
  id: 'cmc-referencia',
  title: 'Tu versión: pipeline de migración con ADK, AI gateway y Bedrock',
  summary:
    '**Propuesta**, no un caso publicado: los patrones comunes de Airbnb, Google, Amazon y Spotify llevados al stack de referencia de esta guía. El descubrimiento es determinista, el agente trabaja por unidad, un **oráculo** (build + tests + diff AST) decide, y el humano revisa en el PR. `migrar_unidad.py` es el fragmento de esta página (loop fijo); con ADK, el loop sería un agente con herramientas `leer_archivo`, `escribir_archivo` y `verificar`. `worker.py` y los payloads son ilustrativos.',
  height: 520,
  nodes: [
    { id: 'inv', label: 'Inventario', sub: 'codemod / AST / grep', at: [0, 0], shape: 'doc', tone: 'data', icon: 'search', info: 'Lista de unidades a migrar (archivos, módulos o repos) generada con herramientas deterministas: OpenRewrite, ts-morph, Semgrep, índice de referencias. El LLM no decide el alcance.' },
    { id: 'queue', label: 'Cola de unidades', sub: 'SQS · Step Functions', at: [3.3, 0], shape: 'box', tone: 'infra', icon: 'list', info: 'Una unidad por mensaje, con estado (pendiente, en curso, validado, fallido, manual) y reintentos acotados. Permite re-barrer solo lo fallido.' },
    { id: 'agent', label: 'Agente migrador', sub: 'ADK · AgentCore', at: [6.6, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Un agente por unidad, con herramientas mínimas: leer archivos, escribir archivos, ejecutar la validación. Sin push ni acceso a red general.' },
    { id: 'gw', label: 'AI gateway', sub: 'LiteLLM', at: [6.6, -3.9], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Centraliza claves, límites de gasto por campaña de migración, fallback de modelo y logging de tokens por unidad.' },
    { id: 'model', label: 'Claude', sub: 'Amazon Bedrock', at: [10.2, -3.9], shape: 'sphere', tone: 'model', icon: 'brain', info: 'El modelo de código. Prueba con una muestra antes de elegir: el costo por unidad migrada importa más que el precio por token.' },
    { id: 'sandbox', label: 'Sandbox de build', sub: 'compilar · tests · lint', at: [6.6, 3.3], shape: 'box', tone: 'tool', icon: 'terminal', info: 'Contenedor efímero (CodeBuild, ECS o el runner de CI) con el toolchain del repo. Devuelve errores resumidos, no logs de 10.000 líneas.' },
    { id: 'gate', label: 'Oráculo', sub: 'build + tests + diff AST', at: [9.9, 0], shape: 'diamond', tone: 'guard', icon: 'shield', info: 'Decisión determinista: compila, los tests pasan, y el diff de AST no toca nada fuera del alcance. Opcional: LLM-as-judge para el alcance, después del oráculo.' },
    { id: 'obs', label: 'Trazas y métricas', sub: 'OTel · tasa de éxito', at: [9.9, 3.3], shape: 'cylinder', tone: 'memory', icon: 'chart', info: 'Por unidad: intentos, tokens, causa de fallo. Agrupa fallos para el ciclo sample-tune-sweep.' },
    { id: 'pr', label: 'PR por unidad', sub: 'tamaño revisable', at: [13.2, 0], shape: 'box', tone: 'tool', icon: 'branch', info: 'La infraestructura (no el agente) abre el PR, con etiqueta de campaña y resumen del cambio.' },
    { id: 'owner', label: 'Code owner', sub: 'aprueba y fusiona', at: [13.2, 3.3], shape: 'person', tone: 'user', icon: 'user', info: 'El humano sigue siendo el control final. Dosifica el volumen: la capacidad de revisión es el cuello de botella en todos los casos publicados.' },
  ],
  zones: [{ id: 'aws', label: 'Cuenta AWS', from: [1.8, -4.9], to: [11.4, 4.9], tone: 'infra' }],
  edges: [
    { from: 'inv', to: 'queue' },
    { from: 'queue', to: 'agent' },
    { from: 'agent', to: 'gw', route: 'z' },
    { from: 'gw', to: 'model' },
    { from: 'agent', to: 'sandbox', route: 'z' },
    { from: 'agent', to: 'gate' },
    { from: 'gate', to: 'agent', label: 'errores', route: 'arc', dashed: true },
    { from: 'gate', to: 'obs', route: 'z', dashed: true },
    { from: 'gate', to: 'pr', label: 'válido' },
    { from: 'pr', to: 'owner', route: 'z' },
  ],
  code: {
    unidad: { title: 'migrar_unidad.py (ilustrativo)', lang: 'python', source: MIGRAR_UNIDAD },
    worker: { title: 'worker.py (ilustrativo)', lang: 'python', source: WORKER },
  },
  steps: [
    {
      title: '1 · Alcance determinista',
      body: 'Herramientas de AST o un índice de referencias producen la lista de unidades. Así sabes cuánto falta y **nada queda a criterio del modelo**.',
      flows: ['inv>queue'],
      data: {
        title: 'generar el inventario (comando y salida ilustrativos)',
        lang: 'bash',
        content: `$ semgrep --config reglas/enzyme-imports.yaml --json src/ \\
    | jq -r '.results[].path' | sort -u > unidades.txt
$ wc -l unidades.txt
1284 unidades.txt
$ python encolar.py unidades.txt --campana enzyme-a-rtl
1284 mensajes enviados a la cola`,
        hl: ['semgrep', '--campana enzyme-a-rtl'],
      },
    },
    {
      title: '2 · Una unidad por sesión',
      body: 'Cada mensaje de la cola lanza una sesión corta. El **paralelismo lo da la cola**, no un agente "jefe": escalas sumando workers.',
      flows: ['queue>agent'],
      data: {
        title: 'mensaje de la cola (ilustrativo)',
        lang: 'json',
        content: json({
          id: 'u-0412',
          campana: 'enzyme-a-rtl',
          archivo: 'src/checkout/__tests__/CartSummary.test.tsx',
          instrucciones: 'Migra este test de Enzyme a React Testing Library conservando lo que verifica.',
          contexto: '<componente, tests hermanos ya migrados, ejemplos RTL>',
          intentos_previos: 0,
        }),
        hl: ['"campana"', '"archivo"'],
      },
      code: { file: 'worker', hl: ['sqs.receive_message(', 'json.loads(m["Body"])'] },
    },
    {
      title: '3 · Modelo vía gateway',
      body: 'Las llamadas pasan por el AI gateway con la **clave virtual de la campaña**: cuotas, costo por unidad y fallback de modelo, sin credenciales de Bedrock en el worker.',
      flows: ['agent>gw', 'gw>model'],
      data: {
        title: 'petición al AI gateway (ilustrativa)',
        lang: 'http',
        content: `POST /v1/chat/completions HTTP/1.1
Host: ai-gateway.plataforma.internal
Authorization: Bearer sk-<clave virtual de la campaña enzyme-a-rtl>
Content-Type: application/json

{"model": "claude-sonnet", "temperature": 0,
 "messages": [{"role": "system", "content": "Devuelve solo el archivo completo migrado."},
              {"role": "user", "content": "Migra este test… ## Contexto … ## Archivo …"}]}`,
        hl: ['"model": "claude-sonnet"', 'clave virtual de la campaña'],
      },
      code: { file: 'unidad', hl: ['model="litellm_proxy/claude-sonnet"', 'api_base=os.environ["AI_GATEWAY_URL"]', 'temperature=0'] },
    },
    {
      title: '4 · Compilar y probar',
      body: 'El oráculo corre en un sandbox efímero, **lo barato primero** (lint, luego `tsc`, luego Jest), y devuelve solo la cola del log: suele tener el error útil.',
      flows: ['agent>sandbox', 'sandbox>agent'],
      data: {
        title: 'salida recortada del sandbox (ilustrativa)',
        lang: 'bash',
        content: `$ npx tsc --noEmit -p .
src/checkout/__tests__/CartSummary.test.tsx(18,25): error TS2339:
  Property 'find' does not exist on type 'RenderResult'.
Found 1 error in src/checkout/__tests__/CartSummary.test.tsx:18`,
        hl: ['error TS2339'],
      },
      code: { file: 'unidad', hl: ['VALIDACION = [', 'def validar(', '[-4000:]'] },
    },
    {
      title: '5 · Oráculo y reintento',
      body: 'Si el oráculo falla, el error vuelve al modelo en el siguiente intento, **con tope**. Si se agota, la unidad pasa a manual con la última versión como borrador.',
      flows: ['agent>gate', 'gate>agent'],
      data: {
        title: 'prompt del intento 2 (extracto ilustrativo)',
        lang: 'text',
        content: `Migra este test de Enzyme a React Testing Library…

## Contexto
…
## Archivo
…
## Falló la validación (intento 1)
CartSummary.test.tsx(18,25): error TS2339:
  Property 'find' does not exist on type 'RenderResult'.`,
        hl: ['## Falló la validación (intento 1)'],
      },
      code: { file: 'unidad', hl: ['if error:', 'MAX_INTENTOS = 6', 'return "validado"', 'return "manual"'] },
    },
    {
      title: '6 · Medir',
      body: 'Cada unidad deja una traza con estado, intentos y causa de fallo. Así detectas patrones y ajustas prompts con **muestras pequeñas** antes de re-barrer.',
      flows: ['gate>obs'],
      data: {
        title: 'span por unidad (atributos ilustrativos)',
        lang: 'json',
        content: json({
          name: 'migrar_unidad',
          attributes: {
            'migracion.campana': 'enzyme-a-rtl',
            'migracion.archivo': 'src/checkout/__tests__/CartSummary.test.tsx',
            'migracion.estado': 'validado',
            'migracion.intentos': 2,
            'gen_ai.usage.input_tokens': 61200,
          },
        }),
        hl: ['"migracion.estado"', '"migracion.intentos"'],
      },
      code: { file: 'worker', hl: ['tracer.start_as_current_span("migrar_unidad")', 'span.set_attribute("migracion.estado"'] },
    },
    {
      title: '7 · PR y humano',
      body: 'Lo validado se convierte en un **PR pequeño** que abre la infraestructura y aprueba el code owner. Dosifica cuántos PRs abres por semana: la revisión es el cuello de botella.',
      flows: ['gate>pr', 'pr>owner'],
      data: {
        title: 'PR de la campaña (forma ilustrativa)',
        lang: 'json',
        content: json({
          titulo: '[enzyme-a-rtl] CartSummary.test.tsx',
          etiquetas: ['campana:enzyme-a-rtl', 'generado-por-agente'],
          resumen: 'Migración a RTL; 9/9 tests pasan; sin cambios fuera del archivo.',
          revisores: ['equipo-checkout'],
          cuota_semanal: { equipo: 'equipo-checkout', abiertos: 18, limite: 25 },
        }),
        hl: ['"etiquetas"', '"cuota_semanal"'],
      },
      code: { file: 'worker', hl: ['if estado == "validado":', 'abrir_pr(unidad)'] },
    },
  ],
}
