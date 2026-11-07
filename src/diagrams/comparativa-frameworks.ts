import type { IsoSpec } from '../components/iso/types'

/** JSON válido y compacto: objetos o arreglos cortos van en una línea, para que el payload quepa en ~50 líneas. */
const jsonc = (v: unknown, width = 78): string => {
  const one = (x: unknown) => JSON.stringify(x, null, 1).replace(/\n\s*/g, ' ')
  const go = (x: unknown, ind: string, used: number): string => {
    const flat = one(x)
    if (x === null || typeof x !== 'object' || used + flat.length <= width) return flat
    if (Array.isArray(x) && x.length === 1 && x[0] && typeof x[0] === 'object') return `[${go(x[0], ind, used + 1)}]`
    const next = ind + '  '
    const items = Array.isArray(x)
      ? x.map((e) => next + go(e, next, next.length))
      : Object.entries(x as Record<string, unknown>).map(([k, e]) => {
          const p = next + JSON.stringify(k) + ': '
          return p + go(e, next, p.length)
        })
    return Array.isArray(x) ? `[\n${items.join(',\n')}\n${ind}]` : `{\n${items.join(',\n')}\n${ind}}`
  }
  return go(v, '', 0)
}

/* ═══════════════════════════ Diagrama de decisión ═══════════════════════════ */

/** El árbol de decisión del diagrama, escrito como código. */
const SHORTLIST = `from dataclasses import dataclass

@dataclass
class Caso:
    flujo_explicito: bool   # pasos obligatorios, HITL con pausas largas, reanudar tras fallos
    usa_adk: bool           # el equipo ya usa ADK o despliega en Google Cloud
    nube: str               # "aws" | "gcp" | "azure" | "otra"
    lenguaje: str           # "python" | "ts" | "dotnet"

def lista_corta(c: Caso) -> list[str]:
    """Orienta una PoC de 2 semanas; no reemplaza los evals."""
    if c.flujo_explicito:                          # ¿grafos con checkpoints?
        if c.usa_adk:
            return ["ADK Workflow (grafos 2.0)"]
        return ["LangGraph", "Microsoft Agent Framework (si .NET)"]
    if c.nube == "aws":                            # model-driven en AWS
        return ["Strands Agents + AgentCore", "ADK + LiteLLM → Bedrock"]
    if c.nube == "gcp":
        return ["Google ADK + Agent Runtime"]
    if c.lenguaje == "dotnet" or c.nube == "azure":
        return ["Microsoft Agent Framework + Foundry"]
    if c.lenguaje == "ts":
        return ["Mastra", "Vercel AI SDK", "Cloudflare Agents"]
    return ["Pydantic AI", "OpenAI Agents SDK", "LlamaIndex (si RAG)"]

# Reembolsos que un supervisor aprueba horas después, en una empresa AWS:
caso = Caso(flujo_explicito=True, usa_adk=False, nube="aws", lenguaje="python")
print(lista_corta(caso))   # ['LangGraph', 'Microsoft Agent Framework (si .NET)']`

export const comparativaFlujo: IsoSpec = {
  id: 'comparativa-flujo',
  title: 'Diagrama de decisión de framework',
  summary:
    'Una forma rápida de llegar a una **lista corta** (no a una decisión final): preguntas sobre control del flujo, nube principal y stack del equipo. El resultado son uno o dos candidatos para una prueba de concepto de dos semanas. En la pestaña Código, el mismo árbol escrito como función; en Datos, cómo se ve un agente mínimo en cada candidato (extractos de las páginas de cada framework). Recuerda que el runtime (AgentCore, Agent Runtime, Foundry) es casi siempre agnóstico del framework.',
  height: 520,
  nodes: [
    { id: 'start', label: 'Tu caso de uso', sub: 'objetivo + restricciones', at: [0, 0], shape: 'person', tone: 'user', icon: 'flag', info: 'Parte del problema de negocio: qué decide el agente, qué acciones toma, qué riesgo tienen y dónde viven los datos y los modelos.' },
    { id: 'q1', label: '¿Flujo explícito?', sub: 'HITL · durabilidad', at: [3.2, 0], shape: 'diamond', tone: 'guard', icon: 'branch', info: '¿Necesitas control explícito del flujo: pasos obligatorios, aprobaciones humanas con pausas largas, reintentos por paso, reanudación tras fallos? Si sí, prioriza frameworks con grafos y checkpoints.' },
    { id: 'q2', label: '¿Ecosistema Google?', sub: 'equipo ya usa ADK', at: [6.4, -3.3], shape: 'diamond', tone: 'guard', icon: 'branch', info: 'Si tu equipo ya usa ADK o despliega en Google Cloud, los grafos `Workflow` de ADK 2.0 evitan sumar otro framework.' },
    { id: 'adkwf', label: 'ADK Workflow', sub: 'grafos 2.0', at: [6.4, -6.6], shape: 'box', tone: 'agent', icon: 'workflow', info: 'Grafo de nodos agente + funciones, rutas con `Event(route=...)`, HITL y `RetryConfig`. Python, TypeScript y Go.' },
    { id: 'lg', label: 'LangGraph', sub: 'o MS Agent Framework', at: [9.6, -3.3], shape: 'box', tone: 'agent', icon: 'workflow', info: 'El estándar para control explícito: checkpointers, interrupts y durabilidad. En .NET, los workflows de Microsoft Agent Framework cumplen el mismo rol.' },
    { id: 'q3', label: '¿Stack AWS?', sub: 'Bedrock · AgentCore', at: [6.4, 0], shape: 'diamond', tone: 'guard', icon: 'branch', info: '¿Tu plataforma principal es AWS, con modelos en Bedrock y despliegue en AgentCore?' },
    { id: 'strands', label: 'Strands Agents', sub: '+ AgentCore', at: [6.4, 3.3], shape: 'box', tone: 'agent', icon: 'bot', info: 'Camino nativo en AWS: poco código, Bedrock por defecto, despliegue documentado en AgentCore Runtime. ADK también corre en AgentCore si el equipo ya lo conoce.' },
    { id: 'q4', label: '¿Google Cloud?', sub: 'Gemini · Agent Platform', at: [9.6, 0], shape: 'diamond', tone: 'guard', icon: 'branch', info: '¿Despliegas en Google Cloud, usas Gemini o Agent Runtime, Sessions y Memory Bank?' },
    { id: 'adk', label: 'Google ADK', sub: 'multimodelo', at: [9.6, 3.3], shape: 'box', tone: 'agent', icon: 'bot', info: 'Framework nativo de Google, multilenguaje, con A2A y evaluación integrados. Usa Claude en Bedrock vía LiteLLM si lo necesitas.' },
    { id: 'q5', label: '¿.NET / Azure?', sub: 'M365 · Foundry', at: [12.8, 0], shape: 'diamond', tone: 'guard', icon: 'branch', info: '¿Tu equipo programa en .NET o tu ecosistema es Azure, Microsoft 365 y Teams?' },
    { id: 'msaf', label: 'MS Agent Framework', sub: '+ Foundry', at: [12.8, 3.3], shape: 'box', tone: 'agent', icon: 'bot', info: 'Sucesor de Semantic Kernel y AutoGen, 1.0 GA. Publicación en Teams/Copilot vía Foundry Agent Service.' },
    { id: 'ts', label: 'TypeScript / edge', sub: 'Mastra · Vercel · CF', at: [16, 0], shape: 'box', tone: 'agent', icon: 'code', info: 'Para equipos JS/TS: Mastra (framework completo), Vercel AI SDK (agente en la app web) o Cloudflare Agents (estado por entidad en el edge). En Python sin nube dominante: Pydantic AI, LlamaIndex (RAG) u OpenAI Agents SDK.' },
  ],
  edges: [
    { from: 'start', to: 'q1' },
    { from: 'q1', to: 'q2', label: 'sí', route: 'z' },
    { from: 'q2', to: 'adkwf', label: 'sí' },
    { from: 'q2', to: 'lg', label: 'no' },
    { from: 'q1', to: 'q3', label: 'no' },
    { from: 'q3', to: 'strands', label: 'sí' },
    { from: 'q3', to: 'q4', label: 'no' },
    { from: 'q4', to: 'adk', label: 'sí' },
    { from: 'q4', to: 'q5', label: 'no' },
    { from: 'q5', to: 'msaf', label: 'sí' },
    { from: 'q5', to: 'ts', label: 'no' },
  ],
  code: { tree: { title: 'lista_corta.py (ilustrativo)', lang: 'python', source: SHORTLIST } },
  steps: [
    {
      title: '1 · Empieza por el problema',
      body: 'Antes del framework, define qué decide el agente, qué acciones son irreversibles y qué requisitos de auditoría tienes. Esas respuestas son las entradas del árbol.',
      flows: ['start>q1'],
      data: {
        title: 'ficha del caso de uso (ilustrativa)',
        lang: 'yaml',
        content: `caso: consultas de estado de pedido con posible reembolso
decide_el_agente: si corresponde compensar y cuánto
acciones_irreversibles: [emitir_nota_credito]
aprobacion_humana: supervisor, puede tardar horas
reanudar_tras_reinicio: obligatorio
nube_principal: aws
equipo: Python, sin experiencia previa en frameworks de agentes
evals: 25 tareas sacadas de tickets reales`,
        hl: ['aprobacion_humana', 'reanudar_tras_reinicio'],
      },
      code: { hl: ['class Caso:', 'flujo_explicito: bool'] },
    },
    {
      title: '2 · ¿Control explícito del flujo?',
      body: 'Si hay aprobaciones humanas con pausas largas, pasos obligatorios o necesitas reanudar tras fallos, prioriza **grafos con checkpoints**. Así se ve "pausar y reanudar desde otro proceso" en LangGraph: el estado vive en el checkpointer, no en memoria.',
      flows: ['q1>q2'],
      data: {
        title: 'run.py (extracto de LangGraph)',
        lang: 'python',
        content: `config = {"configurable": {"thread_id": "ticket-4512"}}       # identifica la conversación
result = graph.invoke({"messages": [("user", "Quiero el reembolso del pedido 4512")]}, config)
print(result["__interrupt__"])                                  # payload para el supervisor

# ... minutos o días después, desde otro proceso, con el mismo thread_id:
final = graph.invoke(Command(resume=True), config)
print(final["audit_log"])`,
        hl: ['__interrupt__', 'Command(resume=True)'],
      },
      code: { hl: ['if c.flujo_explicito:'] },
    },
    {
      title: '3 · Grafos: ADK o LangGraph',
      body: 'Si ya estás en el ecosistema ADK, usa sus grafos `Workflow` 2.0: nodos agente y nodos función, con rutas devueltas como `Event(route=...)`. Si no, **LangGraph** es la referencia (o Microsoft Agent Framework en .NET).',
      flows: ['q2>adkwf', 'q2>lg'],
      data: {
        title: 'devoluciones/agent.py (extracto de Google ADK)',
        lang: 'python',
        content: `def router(node_input: str):
    """Nodo determinista: enruta según la etiqueta del clasificador."""
    return Event(route="DEVOLUCION" if "DEVOLUCION" in node_input.upper() else "RECLAMO")

root_agent = Workflow(
    name="postventa",
    edges=[
        ("START", classifier, router),                                   # secuencia
        (router, {"DEVOLUCION": returns_agent, "RECLAMO": open_ticket}), # rutas
    ],
)`,
        hl: ['Event(route=', 'Workflow('],
      },
      code: { hl: ['if c.usa_adk:', 'return ["ADK Workflow (grafos 2.0)"]', 'return ["LangGraph"'] },
    },
    {
      title: '4 · Agente model-driven en AWS',
      body: 'Si el modelo puede dirigir el flujo y tu stack es AWS, **Strands + AgentCore** es el camino con menos fricción: el agente completo cabe en una decena de líneas y se despliega envolviéndolo con `BedrockAgentCoreApp`.',
      flows: ['q1>q3', 'q3>strands'],
      data: {
        title: 'app/agent/main.py (extracto de AWS Bedrock y AgentCore)',
        lang: 'python',
        content: `agent = Agent(
    model="global.anthropic.claude-sonnet-5-5",
    system_prompt="Atiendes consultas de pedidos. No inventes datos.",
    tools=[consultar_pedido],
)
app = BedrockAgentCoreApp()

@app.entrypoint
def invoke(payload):
    return {"result": str(agent(payload.get("prompt")))}`,
        hl: ['BedrockAgentCoreApp()', 'global.anthropic.claude-sonnet-5-5'],
      },
      code: { hl: ['if c.nube == "aws":', 'return ["Strands Agents + AgentCore"'] },
    },
    {
      title: '5 · Google Cloud',
      body: 'En GCP, **ADK** con Agent Runtime, Sessions y Memory Bank: una función con docstring **es** una herramienta. ADK también es buena opción multinube (corre en AgentCore con Claude vía LiteLLM).',
      flows: ['q3>q4', 'q4>adk'],
      data: {
        title: 'adk_agent.py (extracto de ¿Qué es un agente?)',
        lang: 'python',
        content: `def get_order_status(order_id: str) -> dict:
    """Devuelve el estado logístico de un pedido."""
    return {"order_id": order_id, "status": "retrasado", "eta": "2026-11-04"}

root_agent = Agent(
    name="soporte_pedidos",
    model="gemini-flash-latest",
    instruction="Ayudas a resolver dudas sobre pedidos. Usa las herramientas; no inventes datos.",
    tools=[get_order_status],   # la firma y el docstring generan el esquema
)`,
        hl: ['tools=[get_order_status]'],
      },
      code: { hl: ['if c.nube == "gcp":', 'return ["Google ADK + Agent Runtime"]'] },
    },
    {
      title: '6 · Microsoft',
      body: 'En .NET/Azure/M365, **Microsoft Agent Framework** con Foundry Agent Service: identidad Entra sin claves en el código y publicación en Teams.',
      flows: ['q4>q5', 'q5>msaf'],
      data: {
        title: 'hello_agent.py (extracto de Otros frameworks)',
        lang: 'python',
        content: `agent = Agent(
    client=FoundryChatClient(
        project_endpoint="https://<svc>.services.ai.azure.com/api/projects/<project>",
        model="gpt-5.4-mini",
        credential=AzureCliCredential(),      # identidad Entra, sin claves en el código
    ),
    name="AsistenteRRHH",
    instructions="Respondes preguntas sobre políticas de RR. HH. citando el documento fuente.",
)`,
        hl: ['FoundryChatClient(', 'AzureCliCredential()'],
      },
      code: { hl: ['if c.lenguaje == "dotnet" or c.nube == "azure":', 'return ["Microsoft Agent Framework + Foundry"]'] },
    },
    {
      title: '7 · TypeScript y edge',
      body: 'Equipos JS/TS: **Mastra**, **Vercel AI SDK** o **Cloudflare Agents** según dónde viva el agente. Sea cual sea el resultado, valídalo con una PoC de 2 semanas: mismo modelo, mismas herramientas MCP y los mismos 20-30 evals.',
      flows: ['q5>ts'],
      data: {
        title: 'src/mastra/agents/soporte.ts (extracto de Otros frameworks)',
        lang: 'ts',
        content: `const orderStatus = createTool({
  id: "get-order-status",
  description: "Consulta el estado logístico de un pedido",
  inputSchema: z.object({ orderId: z.string() }),
  execute: async ({ context }) => ({ orderId: context.orderId, status: "retrasado" }),
});

export const soporteAgent = new Agent({
  id: "soporte-agent",
  name: "Soporte pedidos",
  instructions: "Ayudas con pedidos. Usa las herramientas; no inventes datos.",
  model: "anthropic/claude-sonnet-5-5",   // formato proveedor/modelo; verifica el ID vigente
  tools: { orderStatus },
});`,
        hl: ['createTool({', 'new Agent({'],
      },
      code: { hl: ['if c.lenguaje == "ts":', 'return ["Mastra", "Vercel AI SDK", "Cloudflare Agents"]', 'print(lista_corta(caso))'] },
    },
  ],
}

/* ═════════════════════════ Framework vs. runtime ═════════════════════════ */

/** Bloque `app/agent/main.py` (Google ADK) de "AWS Bedrock y AgentCore". */
const ADK_AGENTCORE = `from bedrock_agentcore.runtime import BedrockAgentCoreApp
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

def consultar_pedido(order_id: str) -> dict:
    """Devuelve estado y fecha estimada de un pedido."""
    return {"order_id": order_id, "estado": "en ruta", "eta": "2026-11-04"}

agent = LlmAgent(
    name="soporte_retail",
    model=LiteLlm(model="bedrock/global.anthropic.claude-sonnet-5-5"),  # litellm>=1.84
    instruction="Atiendes consultas de pedidos. Usa herramientas; no inventes datos.",
    tools=[consultar_pedido],
)
sessions = InMemorySessionService()   # vive en la microVM de la sesión; usa AgentCore Memory para persistir
runner = Runner(agent=agent, app_name="soporte", session_service=sessions)
app = BedrockAgentCoreApp()

@app.entrypoint
async def invoke(payload, context):
    uid, sid = payload.get("user_id", "anon"), context.session_id
    if not await sessions.get_session(app_name="soporte", user_id=uid, session_id=sid):
        await sessions.create_session(app_name="soporte", user_id=uid, session_id=sid)
    msg = types.Content(role="user", parts=[types.Part(text=payload["prompt"])])
    respuesta = ""
    async for event in runner.run_async(user_id=uid, session_id=sid, new_message=msg):
        if event.is_final_response() and event.content and event.content.parts:
            respuesta = event.content.parts[0].text
    return {"result": respuesta}

if __name__ == "__main__":
    app.run()   # sirve POST /invocations y GET /ping en el puerto 8080`

export const comparativaRuntimes: IsoSpec = {
  id: 'comparativa-runtimes',
  title: 'Framework y runtime: decisiones separadas',
  summary:
    'El framework define **cómo piensa** el agente; el runtime, **dónde corre** y con qué servicios (aislamiento, identidad, memoria, observabilidad). Los runtimes gestionados de 2026 son agnósticos de framework, y los estándares (MCP, A2A, OpenTelemetry) mantienen las integraciones portables. El código de referencia es un agente **Google ADK** desplegado en **AgentCore Runtime** de AWS.',
  height: 490,
  zones: [
    { id: 'fw', label: 'Frameworks', from: [-1.4, -5.0], to: [1.4, 5.0], tone: 'agent' },
    { id: 'rt', label: 'Runtimes', from: [5.2, -5.0], to: [8.0, 5.0], tone: 'infra' },
  ],
  nodes: [
    { id: 'adk', label: 'Google ADK', at: [0, -3.6], shape: 'tall', tone: 'agent', icon: 'bot', scale: 0.85, info: 'Corre en Agent Runtime, Cloud Run, GKE o AgentCore Runtime (sample oficial de AWS).' },
    { id: 'strands', label: 'Strands', at: [0, -1.2], shape: 'tall', tone: 'agent', icon: 'bot', scale: 0.85, info: 'Camino nativo a AgentCore Runtime; también Lambda, Fargate o EKS.' },
    { id: 'lg', label: 'LangGraph', at: [0, 1.2], shape: 'tall', tone: 'agent', icon: 'workflow', scale: 0.85, info: 'LangSmith Deployment, AgentCore, Agent Runtime, Foundry hosted agents o contenedor propio con Postgres.' },
    { id: 'msaf', label: 'MS Agent Framework', at: [0, 3.6], shape: 'tall', tone: 'agent', icon: 'workflow', scale: 0.85, info: 'Natural en Foundry hosted agents; también contenedores en Azure Container Apps o AKS.' },
    { id: 'std', label: 'Estándares', sub: 'MCP · A2A · OTel', at: [3.3, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'MCP para herramientas, A2A entre agentes y OpenTelemetry GenAI para trazas: lo que permite cambiar framework o runtime sin reescribir integraciones.' },
    { id: 'agentcore', label: 'AgentCore Runtime', sub: 'AWS', at: [6.6, -3.6], shape: 'cloud', tone: 'infra', icon: 'server', info: 'Serverless con aislamiento por sesión en microVM; HTTP, MCP, A2A y AG-UI. Más Memory, Gateway, Identity, Policy y Evaluations.' },
    { id: 'agrt', label: 'Agent Runtime', sub: 'Google Agent Platform', at: [6.6, -1.2], shape: 'cloud', tone: 'infra', icon: 'cloud', info: 'Ex Agent Engine. ADK, LangGraph, LlamaIndex, CrewAI o contenedor; Sessions y Memory Bank gestionados.' },
    { id: 'foundry', label: 'Foundry hosted', sub: 'Microsoft', at: [6.6, 1.2], shape: 'cloud', tone: 'infra', icon: 'cloud', info: 'Hosted agents en microVM: Agent Framework, LangGraph, OpenAI Agents SDK, Claude Agent SDK o código propio. Identidad Entra por agente.' },
    { id: 'own', label: 'Contenedor propio', sub: 'ECS · GKE · AKS', at: [6.6, 3.6], shape: 'box', tone: 'infra', icon: 'boxes', info: 'Máximo control y portabilidad; tú resuelves aislamiento, escalado, sesiones y observabilidad.' },
  ],
  edges: [
    { from: 'adk', to: 'std' },
    { from: 'strands', to: 'std' },
    { from: 'lg', to: 'std' },
    { from: 'msaf', to: 'std' },
    { from: 'std', to: 'agentcore' },
    { from: 'std', to: 'agrt' },
    { from: 'std', to: 'foundry' },
    { from: 'std', to: 'own' },
  ],
  code: { main: { title: 'app/agent/main.py', lang: 'python', source: ADK_AGENTCORE } },
  steps: [
    {
      title: '1 · Elige el framework por el equipo y el flujo',
      body: 'Lenguaje, necesidad de control explícito y familiaridad del equipo. Esa es la decisión que afecta **el código del agente**: aquí, un `LlmAgent` de ADK con una herramienta y Claude en Bedrock vía LiteLLM.',
      focus: ['adk', 'strands', 'lg', 'msaf'],
      data: {
        title: 'decisión 1: framework (ilustrativa)',
        lang: 'yaml',
        content: `equipo: Python, ya usa Google ADK en otro producto
flujo: model-driven, una aprobación humana corta
modelo: Claude en Bedrock (estándar de la empresa)
candidatos: [Google ADK, Strands Agents]
elegido: Google ADK          # afecta el código del agente, no dónde corre`,
        hl: ['elegido:'],
      },
      code: { hl: ['agent = LlmAgent(', 'model=LiteLlm(model="bedrock/global.anthropic.claude-sonnet-5-5")', 'tools=[consultar_pedido]'] },
    },
    {
      title: '2 · Integra con estándares',
      body: 'Herramientas por **MCP**, agentes remotos por **A2A**, trazas con **OpenTelemetry**. En una llamada MCP real se ven dos estándares a la vez: el JSON-RPC de la herramienta y el contexto de traza W3C en `_meta`, que el servidor usa para colgar sus spans de la misma traza.',
      flows: ['adk>std', 'strands>std', 'lg>std', 'msaf>std'],
      data: {
        title: 'tools/call con traceparent en _meta (MCP 2026-07-28)',
        lang: 'json',
        content: jsonc({
          jsonrpc: '2.0',
          id: 21,
          method: 'tools/call',
          params: {
            name: 'consultar_pedido',
            arguments: { order_id: '4512' },
            _meta: { protocolVersion: '2026-07-28', traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' },
          },
        }),
        hl: ['"tools/call"', '"traceparent"'],
      },
    },
    {
      title: '3 · Elige el runtime por la nube y la operación',
      body: 'Dónde están tus datos, identidad y modelos. Los runtimes gestionados aceptan casi cualquier framework porque el contrato es simple: en AgentCore, tu proceso sirve `POST /invocations` y `GET /ping` en el puerto 8080; el runtime pone aislamiento por sesión, escalado e identidad.',
      flows: ['std>agentcore', 'std>agrt', 'std>foundry', 'std>own'],
      data: {
        title: 'contrato HTTP que sirve app.run() (forma simplificada)',
        lang: 'http',
        content: `POST /invocations HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{"prompt": "¿Dónde está mi pedido 4512?", "user_id": "cliente-881"}

HTTP/1.1 200 OK
Content-Type: application/json

{"result": "Tu pedido 4512 está en ruta y llega el 4 de noviembre."}`,
        hl: ['POST /invocations', '"result"'],
      },
      code: { hl: ['app = BedrockAgentCoreApp()', '@app.entrypoint', 'app.run()'] },
    },
    {
      title: '4 · Ejemplo: ADK en AWS',
      body: 'Un equipo con ADK y Claude en Bedrock despliega en **AgentCore Runtime**: el framework viene de Google, el runtime de AWS, y funciona. El `Runner` de ADK corre dentro del entrypoint, y el `session_id` lo entrega el runtime en `context`.',
      flows: ['adk>std', 'std>agentcore'],
      data: {
        title: 'terminal · AgentCore CLI',
        lang: 'bash',
        content: `agentcore add runtime          # registra tu código ADK (app/agent/main.py)
agentcore deploy               # aprovisiona Runtime, endpoints y CloudWatch
agentcore invoke --runtime agent --payload '{"prompt":"¿Dónde está mi pedido 4512?"}'
agentcore traces runtime list  # trazas de la invocación`,
        hl: ['agentcore add runtime', 'agentcore deploy'],
      },
      code: { hl: ['context.session_id', 'runner.run_async(', 'return {"result": respuesta}'] },
    },
  ],
}
