# Investigación: frameworks y SDKs de agentes (verificado al 31-10-2026)

> Fuente: investigación con WebFetch/WebSearch sobre docs oficiales, PyPI/npm y GitHub. Las versiones/fechas salen de los historiales de PyPI/npm salvo indicación. "(no verificado)" = no se pudo confirmar en fuente primaria.

## Cambios de contexto 2026
- **Docs de ADK movidas**: `google.github.io/adk-docs` redirige (301) a **https://adk.dev/**.
- **Vertex AI renombrado**: en Cloud Next '26 (abril 2026) pasó a llamarse **Gemini Enterprise Agent Platform**. *Vertex AI Agent Engine* aparece como **Agent Runtime**; Sessions/Memory Bank como **Agent Platform Sessions / Memory Bank**. https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes
- **LangGraph Platform → LangSmith Deployment** (oct 2025); LangGraph Studio → LangSmith Studio. https://changelog.langchain.com/announcements/product-naming-changes-langsmith-deployment-and-langsmith-studio
- **Alerta de seguridad LiteLLM**: versiones PyPI **1.82.7 y 1.82.8** contuvieron código no autorizado (24-03-2026). Las docs de ADK piden `litellm>=1.84` y rotar credenciales si se instalaron.
- **"Harness" como categoría**: Strands Harness, Microsoft "Harness Agent", Pydantic AI v2 Harness, `HarnessAgent` en Vercel AI SDK: agentes preconfigurados con compactación de contexto, planificación, etc.

## 1. Google ADK
- Open source, model-agnostic (optimizado para Gemini). Agentes, multiagente y desde 2.0 **workflows en grafo** (nodos deterministas + agentes LLM).
- Lenguajes: Python (`pip install google-adk`), TypeScript (`npm install @google/adk`), Go (`google.golang.org/adk/v2`), Java (`com.google.adk:google-adk`), Kotlin.
- Python última **2.13.0 (23-10-2026)**; línea 1.x de mantenimiento (1.39.1). ADK 2.0 GA: Python 19-05-2026, Go 30-06-2026, TS 21-08-2026.
- Conceptos: `Agent`/`LlmAgent`; tools = funciones Python auto-envueltas como `FunctionTool`; `ToolContext` con `tool_context.state`; callbacks `before/after_agent|model|tool_callback`; Sessions (`InMemorySessionService`, `DatabaseSessionService`, `VertexAiSessionService`), Memory, Artifacts, Skills, Runner; CLI `adk web`, `adk run`, `adk api_server` (`--a2a`).
- Workflow agents (`SequentialAgent`, `ParallelAgent`, `LoopAgent`): en 2.0 Python/Go están "superseded" por graph workflows; en TS deprecated pero funcionan.
- Graph Workflows 2.0: `Workflow(name=..., edges=[("START", agent_a, fn_b, agent_c)])`, routing con `Event(route=...)`, HITL, `RetryConfig`. Breaking: `BaseAgent` hereda de `BaseNode`.
- Multimodelo: strings directos para Gemini/Claude/modelos de Agent Platform; conectores Apigee, **LiteLLM**, Ollama, vLLM, LiteRT-LM; model routing con failover (experimental).
- Bedrock vía LiteLLM: formato `bedrock/<model-id>`, `bedrock/converse/<model>`, perfiles cross-region `bedrock/us.anthropic.claude-sonnet-5`, `bedrock/global.anthropic.claude-opus-5-5`. Requiere `boto3` + `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION_NAME` o `AWS_BEARER_TOKEN_BEDROCK`. ADK no documenta Bedrock explícitamente (inferencia razonable).
- A2A: `from google.adk.a2a.utils.agent_to_a2a import to_a2a`; `a2a_app = to_a2a(root_agent, port=8001)`; consumir con `RemoteA2aAgent` (no verificado nombre). Experimental.
- Deploy: Agent Runtime (ex Agent Engine), Cloud Run, GKE, contenedor.
- URLs: https://adk.dev/ · https://adk.dev/2.0/ · https://github.com/google/adk-python · https://adk.dev/agents/models/litellm/ · https://adk.dev/a2a/quickstart-exposing/ · https://adk.dev/deploy/ · https://adk.dev/graphs/ · https://adk.dev/agents/workflow-agents/parallel-agents/ · https://adk.dev/tools-custom/function-tools/ · https://docs.litellm.ai/docs/providers/bedrock

```python
from google.adk.agents import Agent  # alias de LlmAgent
from google.adk.tools import FunctionTool, ToolContext

def get_current_weather(location: str, unit: str = "celsius") -> str:
    """Get the current weather for a given location."""
    return f"22 grados {unit} en {location}"

def remember_city(city: str, tool_context: ToolContext) -> str:
    """Guarda la ciudad preferida del usuario en el estado de sesión."""
    tool_context.state["fav_city"] = city
    return "ok"

root_agent = Agent(
    name="weather_agent",
    model="gemini-flash-latest",
    instruction="Responde preguntas de clima usando las herramientas.",
    tools=[FunctionTool(func=get_current_weather), remember_city],
)
```

```python
# pip install google-adk "litellm>=1.84" boto3
import os
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

os.environ["AWS_REGION_NAME"] = "us-east-1"
bedrock_agent = LlmAgent(
    name="bedrock_claude_agent",
    model=LiteLlm(model="bedrock/us.anthropic.claude-sonnet-5"),
    instruction="Eres un asistente corporativo conciso.",
)
```

```python
from google.adk.agents.parallel_agent import ParallelAgent
from google.adk.agents.sequential_agent import SequentialAgent
from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import google_search

MODEL = "gemini-flash-latest"
r1 = LlmAgent(name="EnergyResearcher", model=MODEL, tools=[google_search],
              instruction="Investiga energía renovable.", output_key="renewable_energy_result")
r2 = LlmAgent(name="EVResearcher", model=MODEL, tools=[google_search],
              instruction="Investiga vehículos eléctricos.", output_key="ev_technology_result")
parallel = ParallelAgent(name="ParallelWebResearchAgent", sub_agents=[r1, r2])
merger = LlmAgent(name="Synthesizer", model=MODEL,
    instruction="Sintetiza:\n{renewable_energy_result}\n{ev_technology_result}")
root_agent = SequentialAgent(name="ResearchAndSynthesisPipeline", sub_agents=[parallel, merger])
```

## 2. AWS Strands Agents
- SDK open source (Apache 2.0), *model-driven*; proveedor por defecto Bedrock, multimodelo. **Strands Harness** (sep 2026) con truncado y compactación (~28-34% menos tokens según blog).
- Python `strands-agents` **1.63.0 (30-10-2026)**; TS `@strands-agents/sdk` 1.23.0.
- `Agent`, `@tool`, model providers, `callback_handler`. Multiagente: **Agents as Tools**, **Swarm** (`strands.multiagent.Swarm`, `max_handoffs=20`), **Graph**, **Workflow**, **A2A**. MCP: `MCPClient` se pasa directo en `tools=[...]`.
- AgentCore Runtime: `BedrockAgentCoreApp` + `@app.entrypoint`; CLI `agentcore create|dev|deploy|invoke`.
- URLs: https://strandsagents.com/ · https://github.com/strands-agents/sdk-python · https://strandsagents.com/latest/documentation/docs/user-guide/concepts/multi-agent/agents-as-tools/ · https://strandsagents.com/latest/documentation/docs/user-guide/deploy/deploy_to_bedrock_agentcore/python/

```python
from strands import Agent, tool
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

@tool
def search_docs(query: str) -> str:
    """Search the documentation."""
    return f"Resultados para {query}"

aws_docs = MCPClient(lambda: stdio_client(StdioServerParameters(
    command="uvx", args=["awslabs.aws-documentation-mcp-server@latest"])))

agent = Agent(model="global.anthropic.claude-sonnet-5", tools=[search_docs, aws_docs])
agent("Find the pricing guide")
```

```python
from strands import Agent, tool
from strands_tools import http_request

@tool
def research_assistant(query: str) -> str:
    """Investiga preguntas factuales con fuentes."""
    research_agent = Agent(system_prompt="Eres un investigador.", tools=[http_request], callback_handler=None)
    return str(research_agent(query))

orchestrator = Agent(system_prompt="Deriva cada consulta al especialista adecuado.", tools=[research_assistant])
orchestrator("Investiga y recomienda un portátil para ML")
```

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp
app = BedrockAgentCoreApp()

@app.entrypoint
def invoke(payload):
    return {"result": str(agent(payload.get("prompt")))}

if __name__ == "__main__":
    app.run()
```

## 3. LangGraph / LangChain 1.x
- `langgraph` **1.2.19 (30-10-2026)**; `langchain` **1.4.7**. `StateGraph`, `MessagesState`, `START/END`, edges condicionales; checkpointers (`InMemorySaver`, Postgres) con `thread_id`; HITL `interrupt()` + `Command(resume=...)`; stores para memoria larga. LangChain `create_agent` con middleware. Deploy gestionado: LangSmith Deployment.
- URLs: https://docs.langchain.com/oss/python/langgraph/overview · https://docs.langchain.com/oss/python/langgraph/interrupts · https://github.com/langchain-ai/langgraph

```python
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt, Command

class State(TypedDict):
    action: str
    approved: bool

def approval_node(state: State):
    approved = interrupt(f"¿Apruebas '{state['action']}'?")
    return {"approved": approved}

builder = StateGraph(State)
builder.add_node("approval", approval_node)
builder.add_edge(START, "approval")
builder.add_edge("approval", END)
graph = builder.compile(checkpointer=InMemorySaver())

config = {"configurable": {"thread_id": "1"}}
graph.invoke({"action": "transferir $10k"}, config)
print(graph.invoke(Command(resume=True), config))
```

## 4. OpenAI Agents SDK
- `openai-agents` **0.24.0 (15-10-2026)** (pre-1.0). `Agent`, `Runner.run`, handoffs, guardrails (`@input_guardrail`, tripwires), Sessions (SQLite, Redis, SQLAlchemy, Mongo, Dapr, Encrypted…), tracing por defecto, MCP, sandbox agents, realtime. JS: https://github.com/openai/openai-agents-js
- URLs: https://openai.github.io/openai-agents-python/ · https://github.com/openai/openai-agents-python

```python
import asyncio
from agents import Agent, Runner, SQLiteSession, handoff

billing_agent = Agent(name="Billing agent", instructions="Resuelves facturación.")
refund_agent = Agent(name="Refund agent", instructions="Gestionas reembolsos.")
triage_agent = Agent(name="Triage agent", instructions="Deriva al agente correcto.",
                     handoffs=[billing_agent, handoff(refund_agent)])

async def main():
    session = SQLiteSession("conversation_123")
    result = await Runner.run(triage_agent, "Quiero un reembolso", session=session)
    print(result.final_output)

asyncio.run(main())
```

## 5. Claude Agent SDK
- "Claude Code como librería": loop agéntico, tools integradas (Read, Edit, Bash, Glob, Grep, WebSearch), gestión de contexto, permisos, hooks, sessions. Subagents (`AgentDefinition`), MCP, Skills, plugins, `max_budget_usd`. Proveedores: Anthropic API, Bedrock (`CLAUDE_CODE_USE_BEDROCK=1`), Google (`CLAUDE_CODE_USE_VERTEX=1`), Microsoft Foundry. Managed Agents = harness alojado por Anthropic.
- Python `claude-agent-sdk` 0.2.176; npm `@anthropic-ai/claude-agent-sdk`.
- URLs: https://code.claude.com/docs/en/agent-sdk/overview · https://github.com/anthropics/claude-agent-sdk-python

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async def main():
    async for message in query(
        prompt="Revisa el módulo de autenticación en busca de problemas de seguridad",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Grep", "Glob", "Agent"],
            agents={"code-reviewer": AgentDefinition(
                description="Experto en code review.", prompt="Eres un revisor de seguridad.",
                tools=["Read", "Grep", "Glob"], model="sonnet")},
        ),
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

## 6. Microsoft Agent Framework
- Sucesor de Semantic Kernel + AutoGen. **1.0 GA .NET y Python, abril 2026**; Go preview. Workflows en grafo con checkpointing/HITL; orquestaciones sequential, concurrent, handoff, group chat, Magentic-One; MCP; A2A soportado. Preview: DevUI, hosted agents Foundry, AG-UI, Skills.
- URLs: https://learn.microsoft.com/en-us/agent-framework/overview/ · https://github.com/microsoft/agent-framework · https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/

```python
import asyncio
from agent_framework import Agent
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

agent = Agent(
    client=FoundryChatClient(project_endpoint="https://<svc>.services.ai.azure.com/api/projects/<project>",
                             model="gpt-5.4-mini", credential=AzureCliCredential()),
    name="HelloAgent", instructions="You are a friendly assistant.")

async def main():
    print(await agent.run("What is the largest city in France?"))
asyncio.run(main())
```

## 7. Otros
- **CrewAI** 1.15.33: Agents (role/goal/backstory), Tasks, Crews (sequential/hierarchical), Flows (`@start`/`@listen`). https://docs.crewai.com/en/concepts/crews · https://github.com/crewAIInc/crewAI
- **LlamaIndex** core 0.14.x: agentes sobre Workflows (`FunctionAgent`, `ReActAgent`, `AgentWorkflow`). https://developers.llamaindex.ai/python/framework/understanding/agent/
- **Pydantic AI** v2 (GA 23-06-2026): outputs tipados, DI (`RunContext`), Pydantic Graph, MCP, AG-UI, OTel/Logfire, ejecución durable (Temporal, DBOS, Prefect, Restate). https://pydantic.dev/docs/ai/overview/ · https://github.com/pydantic/pydantic-ai
- **Mastra** (TS) `@mastra/core` 1.x: Agents, Workflows, memoria, RAG, evals, OTel. https://mastra.ai/docs/agents/overview
- **Vercel AI SDK** `ai` v7: `ToolLoopAgent` (`stopWhen`, `prepareStep`), `HarnessAgent`. https://ai-sdk.dev/docs/agents/overview
- **Cloudflare Agents SDK** `agents` 0.x: cada agente es un Durable Object (estado, WebSockets, scheduler, cliente MCP). https://developers.cloudflare.com/agents/ · https://github.com/cloudflare/agents

```python
from crewai import Agent, Task, Crew, Process
analyst = Agent(role="Data Analyst", goal="Analizar ventas", backstory="Experto en BI")
writer = Agent(role="Writer", goal="Redactar informes claros", backstory="Redactor técnico")
t1 = Task(description="Analiza las ventas Q3", expected_output="Hallazgos clave", agent=analyst)
t2 = Task(description="Escribe un resumen ejecutivo", expected_output="1 página", agent=writer)
crew = Crew(agents=[analyst, writer], tasks=[t1, t2], process=Process.sequential)
print(crew.kickoff(inputs={}))
```

```ts
import { ToolLoopAgent, tool } from "ai";
import { z } from "zod";
const weatherAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-5.5",
  tools: { weather: tool({ description: "Get the weather", inputSchema: z.object({ location: z.string() }),
    execute: async ({ location }) => ({ location, temperature: 22 }) }) },
});
const result = await weatherAgent.generate({ prompt: "¿Clima en Santiago?" });
```

```ts
import { Agent, routeAgentRequest } from "agents";
type State = { count: number };
export class MyAgent extends Agent<Env, State> {
  initialState = { count: 0 };
  async onRequest(request: Request) {
    this.setState({ count: this.state.count + 1 });
    return Response.json(this.state);
  }
}
export default {
  async fetch(request, env) {
    return (await routeAgentRequest(request, env)) || new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
```

## Tabla comparativa

| Framework | Lenguajes | Multiagente | Estado / durabilidad | MCP | A2A | Lock-in | Madurez |
|---|---|---|---|---|---|---|---|
| Google ADK | Py, TS, Go, Java, Kotlin | sub_agents, Seq/Par/Loop, Graph Workflows 2.0, agent-as-tool | Sessions, Memory, Artifacts, HITL | Sí | Sí (exp.) | Bajo-medio | Alta (2.13) |
| AWS Strands | Py, TS | Agents-as-tools, Swarm, Graph, Workflow | Session managers, AgentCore Memory | Sí | Sí | Bajo-medio | Alta (1.63) |
| LangGraph | Py, JS | Grafos, supervisor, subgrafos | Checkpointers, durable | Sí | (no verif.) | Bajo | Muy alta |
| OpenAI Agents SDK | Py, JS | Handoffs, agents-as-tools | Sessions | Sí | (no verif.) | Medio | Media (0.24) |
| Claude Agent SDK | Py, TS | Subagents | Sessions resume/fork | Sí | (no verif.) | Alto (Claude) | Media-alta |
| MS Agent Framework | .NET, Py, Go | Workflows, handoff, group chat, Magentic | Checkpointing, HITL | Sí | Sí | Medio | Alta (1.0) |
| CrewAI | Py | Crews, Flows | Estado de Flow | Sí | (no verif.) | Bajo | Alta |
| LlamaIndex | Py, TS | AgentWorkflow | Contexto workflow | Sí | (no verif.) | Bajo | Alta |
| Pydantic AI | Py | Delegación, Graph | Durable (Temporal…) | Sí | (no verif.) | Bajo | Alta (v2) |
| Mastra | TS | Agents + Workflows | Memoria/storage | (no verif.) | (no verif.) | Bajo | Media-alta |
| Vercel AI SDK | TS | ToolLoopAgent | App | Sí | (no verif.) | Bajo | Alta (v7) |
| Cloudflare Agents | TS | Durable Objects | Nativo (DO) | Sí | (no verif.) | Alto | Media (0.x) |
