export interface RoadmapLevel {
  level: number
  title: string
  tagline: string
  weeks: string
  goal: string
  topics: string[]
  project: { title: string; detail: string }
  done: string[]
  guide: { slug: string; label: string }[]
  resources: { title: string; url: string; org: string }[]
}

export const ROADMAP: RoadmapLevel[] = [
  {
    level: 0,
    title: 'Fundamentos de LLMs',
    tagline: 'Entender la materia prima antes de construir encima',
    weeks: '1–2 semanas',
    goal: 'Saber qué hace (y qué no hace) un LLM, cómo se paga y cómo pedirle salidas estructuradas y confiables.',
    topics: [
      'Tokens, ventana de contexto, temperatura y costos por millón de tokens',
      'APIs de mensajes: system prompt, roles, streaming (Messages API, Bedrock Converse)',
      'Salida estructurada con JSON Schema y validación (Pydantic / Zod)',
      'Prompting: instrucciones claras, ejemplos canónicos, XML/Markdown para estructurar',
      'Prompt caching y elección de modelo (grande vs. pequeño, latencia vs. calidad)',
    ],
    project: {
      title: 'Clasificador de tickets',
      detail: 'Una CLI que recibe tickets de soporte y devuelve JSON validado (categoría, urgencia, resumen), con un set de 20 casos de prueba y métrica de exactitud.',
    },
    done: ['Puedes estimar el costo de una llamada', 'Tu salida JSON nunca rompe el parser', 'Tienes 20 casos de prueba que corren en un comando'],
    guide: [{ slug: 'panorama', label: 'Panorama del ecosistema' }],
    resources: [
      { title: 'Building with the Claude API', url: 'https://anthropic.skilljar.com/', org: 'Anthropic Academy' },
      { title: 'Amazon Bedrock Converse API', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html', org: 'AWS Docs' },
      { title: 'Prompt caching en Bedrock', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html', org: 'AWS Docs' },
    ],
  },
  {
    level: 1,
    title: 'LLM aumentado y tool calling',
    tagline: 'El loop agéntico: razonar, llamar herramientas, observar',
    weeks: '2 semanas',
    goal: 'Construir el loop de un agente "a mano" (sin framework) para entender qué automatizan los frameworks.',
    topics: [
      'Tool / function calling: esquema de la herramienta, tool_use y tool_result',
      'El loop: modelo → herramienta → resultado → modelo, con condición de parada y límite de turnos',
      'Diseño de herramientas (ACI): nombres claros, descripciones tipo docstring, "poka-yoke"',
      'Manejo de errores de herramientas y reintentos',
      'Guardrails básicos: validación de entrada/salida, allowlist de acciones',
    ],
    project: {
      title: 'Agente con 3 herramientas',
      detail: 'Un agente que responde preguntas sobre pedidos usando: búsqueda en un catálogo, consulta de estado de pedido (API simulada) y calculadora. Con límite de 8 turnos y logs de cada paso.',
    },
    done: ['Implementaste el loop sin framework', 'Cada herramienta tiene descripción y validación', 'El agente se detiene de forma segura'],
    guide: [
      { slug: 'que-es-un-agente', label: '¿Qué es un agente?' },
      { slug: 'patrones-de-diseno', label: 'Patrones de diseño' },
    ],
    resources: [
      { title: 'Building effective agents', url: 'https://www.anthropic.com/engineering/building-effective-agents', org: 'Anthropic' },
      { title: 'Writing effective tools for agents', url: 'https://www.anthropic.com/engineering', org: 'Anthropic' },
      { title: 'Hugging Face Agents Course', url: 'https://huggingface.co/learn/agents-course/unit0/introduction', org: 'Hugging Face' },
    ],
  },
  {
    level: 2,
    title: 'RAG: conocimiento corporativo',
    tagline: 'Darle al agente acceso a documentos y datos propios',
    weeks: '2–3 semanas',
    goal: 'Construir y evaluar un pipeline de recuperación, y saber cuándo NO hace falta RAG.',
    topics: [
      'Ingesta: parsing, chunking (fijo, recursivo, semántico) y metadatos',
      'Embeddings y bases vectoriales (pgvector, OpenSearch, S3 Vectors, Pinecone…)',
      'Búsqueda híbrida (BM25 + vectores) con Reciprocal Rank Fusion y reranking',
      'Contextual Retrieval y citas a la fuente',
      'Agentic RAG: el agente decide cuándo y dónde buscar',
      'Evaluación: recall@k, faithfulness (RAGAS)',
    ],
    project: {
      title: 'Asistente de políticas internas',
      detail: 'Q&A sobre un corpus de políticas (PDF/Confluence) con citas, búsqueda híbrida y un set de 30 preguntas con métricas de recuperación y fidelidad.',
    },
    done: ['Mides recall@k y faithfulness', 'Cada respuesta cita su fuente', 'Comparaste vectorial vs. híbrido + rerank'],
    guide: [{ slug: 'rag', label: 'RAG en profundidad' }],
    resources: [
      { title: 'Contextual Retrieval', url: 'https://www.anthropic.com/news/contextual-retrieval', org: 'Anthropic' },
      { title: 'Bedrock Knowledge Bases', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html', org: 'AWS Docs' },
      { title: 'Métricas RAGAS', url: 'https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/', org: 'RAGAS' },
    ],
  },
  {
    level: 3,
    title: 'Workflows y frameworks',
    tagline: 'Patrones composables y tu primer framework en serio',
    weeks: '3 semanas',
    goal: 'Dominar los patrones de workflow (chaining, routing, paralelización, evaluator-optimizer) y elegir un framework con criterio.',
    topics: [
      'Prompt chaining con gates, routing, paralelización (sectioning/voting)',
      'Orchestrator-workers y evaluator-optimizer',
      'Context engineering: compactación, memoria, notas estructuradas',
      'Un framework a fondo: Google ADK (agentes de workflow, sesiones, callbacks) o Strands / LangGraph',
      'Estado y sesiones: corto vs. largo plazo',
    ],
    project: {
      title: 'Pipeline de contratos',
      detail: 'Extraer cláusulas → validar contra reglas → resumir, con un gate de calidad (evaluator-optimizer) y ejecución paralela de extractores. Implementado en ADK con SequentialAgent/ParallelAgent o Workflow de ADK 2.x.',
    },
    done: ['Sabes cuándo usar workflow vs. agente', 'Usas sesiones/estado del framework', 'Tienes callbacks para logging y guardrails'],
    guide: [
      { slug: 'context-engineering', label: 'Context engineering y memoria' },
      { slug: 'google-adk', label: 'Google ADK' },
      { slug: 'comparativa-frameworks', label: 'Comparativa de frameworks' },
    ],
    resources: [
      { title: 'Effective context engineering', url: 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents', org: 'Anthropic' },
      { title: 'Documentación de ADK', url: 'https://adk.dev/', org: 'Google' },
      { title: 'Agentic AI (curso)', url: 'https://www.deeplearning.ai/courses/agentic-ai', org: 'DeepLearning.AI' },
    ],
  },
  {
    level: 4,
    title: 'Protocolos: MCP, A2A y gateways',
    tagline: 'Conectar agentes con sistemas y con otros agentes de forma estándar',
    weeks: '2–3 semanas',
    goal: 'Exponer sistemas corporativos como servidores MCP seguros y centralizar el acceso a modelos con un AI gateway.',
    topics: [
      'MCP: host/cliente/servidor, tools/resources/prompts, stdio vs. Streamable HTTP',
      'MCP 2026-07-28: protocolo stateless, MRTR, extensión Tasks',
      'Autorización OAuth 2.1 + Protected Resource Metadata; sin token passthrough',
      'A2A v1: Agent Card, tareas, streaming y push',
      'LLM gateways (LiteLLM, Cloudflare AI Gateway) vs. tool gateways (AgentCore Gateway)',
      'Agent Skills y AGENTS.md',
    ],
    project: {
      title: 'Servidor MCP corporativo',
      detail: 'Un servidor MCP (Streamable HTTP + OAuth) que expone un sistema interno: solo lectura primero, luego escritura con step-up de scopes. Consumido por tu agente ADK a través de un LiteLLM Proxy con claves virtuales y presupuesto.',
    },
    done: ['Tu servidor MCP valida audiencia y scopes', 'El agente no ve credenciales del proveedor LLM', 'Tienes presupuesto y logs por equipo'],
    guide: [
      { slug: 'mcp', label: 'Model Context Protocol' },
      { slug: 'a2a', label: 'Agent2Agent (A2A)' },
      { slug: 'gateways', label: 'AI gateways' },
    ],
    resources: [
      { title: 'Especificación MCP 2026-07-28', url: 'https://modelcontextprotocol.io/specification/2026-07-28', org: 'MCP' },
      { title: 'MCP: Build Rich-Context AI Apps', url: 'https://www.deeplearning.ai/short-courses/mcp-build-rich-context-ai-apps-with-anthropic/', org: 'DeepLearning.AI' },
      { title: 'A2A: The Agent2Agent Protocol', url: 'https://learn.deeplearning.ai/courses/a2a-the-agent2agent-protocol', org: 'DeepLearning.AI' },
    ],
  },
  {
    level: 5,
    title: 'Producción: evals, observabilidad y seguridad',
    tagline: 'De demo a sistema confiable y auditable',
    weeks: '3–4 semanas',
    goal: 'Medir calidad de forma continua, observar cada paso del agente y defenderlo de inyección de prompts y abuso de privilegios.',
    topics: [
      'Evals offline y online, LLM-as-judge calibrado, evals de trayectoria, pass@k vs. pass^k',
      'Tracing con OpenTelemetry GenAI, Langfuse / LangSmith / AgentCore Observability',
      'Guardrails (Bedrock Guardrails, Model Armor) y human-in-the-loop',
      'OWASP Top 10 LLM 2025 y Top 10 Agentic 2026; mínimo privilegio, sandbox',
      'Ejecución durable (Temporal, Step Functions), control de costos',
      'Despliegue gestionado: AgentCore Runtime / Agent Runtime / Foundry',
    ],
    project: {
      title: 'Agente instrumentado y gobernado',
      detail: 'Tu agente del nivel 4 desplegado en AgentCore Runtime, con trazas OTel, suite de 30 evals en CI que bloquea regresiones, aprobación humana en acciones irreversibles y Guardrails.',
    },
    done: ['Un PR que empeora la calidad falla en CI', 'Puedes reconstruir cualquier conversación desde las trazas', 'Las acciones irreversibles piden aprobación'],
    guide: [
      { slug: 'evaluacion-observabilidad', label: 'Evaluación y observabilidad' },
      { slug: 'seguridad-gobernanza', label: 'Seguridad y gobernanza' },
      { slug: 'aws-bedrock-agentcore', label: 'AWS Bedrock y AgentCore' },
    ],
    resources: [
      { title: 'Demystifying evals for AI agents', url: 'https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents', org: 'Anthropic' },
      { title: 'OWASP Top 10 for Agentic Applications 2026', url: 'https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/', org: 'OWASP' },
      { title: 'Evaluating AI Agents', url: 'https://www.deeplearning.ai/courses/evaluating-ai-agents', org: 'DeepLearning.AI' },
    ],
  },
  {
    level: 6,
    title: 'Orquestación multiagente',
    tagline: 'Sistemas de agentes especialistas que colaboran',
    weeks: '4+ semanas',
    goal: 'Diseñar sistemas multiagente solo cuando aportan valor, con contextos aislados, protocolos estándar y gobierno.',
    topics: [
      'Orchestrator-workers, manager (agents-as-tools) vs. handoffs descentralizados',
      'Swarm y grafos (Strands, LangGraph, ADK Workflows)',
      'Sub-agentes con contexto limpio y resúmenes condensados',
      'A2A entre frameworks y nubes; Agent Registry',
      'Identidad de agentes, políticas por herramienta (Cedar), fallas en cascada',
      'Costo: multiagente ≈ 15× tokens de un chat',
    ],
    project: {
      title: 'Sistema de respuesta a incidentes',
      detail: 'Orquestador ADK que delega a especialistas (logs, métricas, runbooks) — uno de ellos un agente Strands expuesto vía A2A — con HITL antes de remediar, evals de trayectoria y tracing distribuido.',
    },
    done: ['Justificaste por qué multiagente supera a un agente único', 'Cada agente tiene identidad y permisos propios', 'Hay trazas de extremo a extremo entre agentes'],
    guide: [
      { slug: 'orquestacion-avanzada', label: 'Orquestación avanzada' },
      { slug: 'arquitectura-multiagente-a2a', label: 'Arquitectura multiagente con A2A' },
    ],
    resources: [
      { title: 'How we built our multi-agent research system', url: 'https://www.anthropic.com/engineering/multi-agent-research-system', org: 'Anthropic' },
      { title: 'AWS Prescriptive Guidance: agentic AI patterns', url: 'https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/introduction.html', org: 'AWS' },
      { title: 'AI Agents for Beginners', url: 'https://microsoft.github.io/ai-agents-for-beginners', org: 'Microsoft' },
    ],
  },
]
