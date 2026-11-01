import type { IsoSpec } from '../components/iso/types'

export const comparativaFlujo: IsoSpec = {
  id: 'comparativa-flujo',
  title: 'Diagrama de decisión de framework',
  summary:
    'Una forma rápida de llegar a una **lista corta** (no a una decisión final): cuatro preguntas sobre control del flujo, nube principal y stack del equipo. El resultado son uno o dos candidatos para una prueba de concepto de dos semanas. Recuerda que el runtime (AgentCore, Agent Runtime, Foundry) es casi siempre agnóstico del framework.',
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
  steps: [
    { title: '1 · Empieza por el problema', body: 'Antes del framework, define qué decide el agente, qué acciones son irreversibles y qué requisitos de auditoría tienes. Eso responde la primera pregunta.', flows: ['start>q1'] },
    { title: '2 · ¿Control explícito del flujo?', body: 'Si hay aprobaciones humanas con pausas largas, pasos obligatorios o necesitas reanudar tras fallos, prioriza **grafos con checkpoints**.', flows: ['q1>q2'] },
    { title: '3 · Grafos: ADK o LangGraph', body: 'Si ya estás en el ecosistema ADK, usa sus grafos `Workflow` 2.0. Si no, **LangGraph** es la referencia (o Microsoft Agent Framework en .NET).', flows: ['q2>adkwf', 'q2>lg'] },
    { title: '4 · Agente model-driven en AWS', body: 'Si el modelo puede dirigir el flujo y tu stack es AWS, **Strands + AgentCore** es el camino con menos fricción.', flows: ['q1>q3', 'q3>strands'] },
    { title: '5 · Google Cloud', body: 'En GCP, **ADK** con Agent Runtime, Sessions y Memory Bank. ADK también es buena opción multinube (corre en AgentCore).', flows: ['q3>q4', 'q4>adk'] },
    { title: '6 · Microsoft', body: 'En .NET/Azure/M365, **Microsoft Agent Framework** con Foundry Agent Service y publicación en Teams.', flows: ['q4>q5', 'q5>msaf'] },
    { title: '7 · TypeScript y edge', body: 'Equipos JS/TS: **Mastra**, **Vercel AI SDK** o **Cloudflare Agents** según dónde viva el agente. Sea cual sea el resultado, valídalo con una PoC de 2 semanas y evals.', flows: ['q5>ts'] },
  ],
}

export const comparativaRuntimes: IsoSpec = {
  id: 'comparativa-runtimes',
  title: 'Framework y runtime: decisiones separadas',
  summary:
    'El framework define **cómo piensa** el agente; el runtime, **dónde corre** y con qué servicios (aislamiento, identidad, memoria, observabilidad). Los runtimes gestionados de 2026 son agnósticos de framework, y los estándares (MCP, A2A, OpenTelemetry) mantienen las integraciones portables.',
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
  steps: [
    { title: '1 · Elige el framework por el equipo y el flujo', body: 'Lenguaje, necesidad de control explícito y familiaridad del equipo. Esa es la decisión que afecta el código del agente.', focus: ['adk', 'strands', 'lg', 'msaf'] },
    { title: '2 · Integra con estándares', body: 'Herramientas por MCP, agentes remotos por A2A, trazas con OpenTelemetry. Así el framework no queda acoplado a tus sistemas.', flows: ['adk>std', 'strands>std', 'lg>std', 'msaf>std'] },
    { title: '3 · Elige el runtime por la nube y la operación', body: 'Dónde están tus datos, identidad y modelos. Los runtimes gestionados aceptan casi cualquier framework.', flows: ['std>agentcore', 'std>agrt', 'std>foundry', 'std>own'] },
    { title: '4 · Ejemplo: ADK en AWS', body: 'Un equipo con ADK y Claude en Bedrock despliega en **AgentCore Runtime**: el framework viene de Google, el runtime de AWS, y funciona.', flows: ['adk>std', 'std>agentcore'] },
  ],
}
