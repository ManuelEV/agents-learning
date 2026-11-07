import type { IsoSpec } from '../components/iso/types'

export const caminos: IsoSpec = {
  id: 'panorama-caminos',
  title: 'Cinco niveles de abstracción para construir un agente',
  summary:
    'Cuanto más subes en la escalera, **menos código** escribes y **más rápido** llegas a producción, a cambio de **menos control** y más dependencia del proveedor. No es una elección única: muchas empresas combinan niveles (p. ej. un framework OSS desplegado en una plataforma gestionada).',
  height: 480,
  nodes: [
    { id: 'api', label: 'API del modelo', sub: 'Converse · Messages', at: [0, 0], shape: 'box', tone: 'model', icon: 'code', info: 'Llamadas directas al modelo con tool calling. Control total; todo lo demás lo construyes tú (loop, memoria, reintentos, trazas). Ideal para aprender y para casos muy acotados.' },
    { id: 'fw', label: 'Framework OSS', sub: 'ADK · Strands · LangGraph', at: [3, -3], elevation: 0.6, shape: 'tall', tone: 'agent', icon: 'boxes', info: 'Bibliotecas que implementan el loop, multiagente, sesiones, callbacks y conectores (MCP, A2A). Portables entre nubes. El punto de equilibrio más común en empresas.' },
    { id: 'harness', label: 'Harness listo', sub: 'Claude Agent SDK', at: [6, -6], elevation: 1.2, shape: 'tall', tone: 'agent', icon: 'terminal', info: 'Agentes de propósito general ya afinados (gestión de contexto, compactación, herramientas de archivos/terminal, subagentes). Configuras herramientas y permisos en lugar de escribir el loop.' },
    { id: 'platform', label: 'Plataforma gestionada', sub: 'AgentCore · Foundry', at: [9, -9], elevation: 1.8, shape: 'cloud', tone: 'infra', icon: 'cloud', info: 'Runtime, memoria, identidad, gateway de herramientas, evaluación y observabilidad como servicio (Bedrock AgentCore, Gemini Enterprise Agent Platform, Microsoft Foundry). Suelen aceptar cualquier framework.' },
    { id: 'saas', label: 'Agentes SaaS', sub: 'Gemini Ent. · Copilot', at: [12, -12], elevation: 2.4, shape: 'person', tone: 'user', icon: 'users', info: 'Productos para usuarios finales donde se configuran agentes con conectores y prompts. Máxima velocidad, mínimo control; útiles para productividad interna, no para lógica de negocio crítica.' },
  ],
  edges: [
    { from: 'api', to: 'fw', route: 'arc' },
    { from: 'fw', to: 'harness', route: 'arc' },
    { from: 'harness', to: 'platform', route: 'arc' },
    { from: 'platform', to: 'saas', route: 'arc' },
  ],
  steps: [
    { title: 'Nivel 1 · API directa', body: 'Implementas el loop agéntico sobre la API del modelo (p. ej. Bedrock **Converse** con `toolConfig`). Es el mejor ejercicio para entender qué hacen los frameworks, pero en producción tendrás que construir memoria, reintentos, trazas y seguridad.', focus: ['api'] },
    { title: 'Nivel 2 · Framework open source', body: 'ADK, Strands, LangGraph, OpenAI Agents SDK o Microsoft Agent Framework te dan el loop, multiagente, sesiones y conectores **MCP/A2A**. Sigue siendo código tuyo, versionado y testeable, desplegable donde quieras.', flows: ['api>fw'] },
    { title: 'Nivel 3 · Harness de propósito general', body: 'En vez de escribir el loop, configuras un agente ya afinado: el **Claude Agent SDK** (el motor de Claude Code), **Strands Harness** o **AgentCore Harness**. Muy productivo para agentes que operan sobre archivos, código o terminal.', flows: ['fw>harness'] },
    { title: 'Nivel 4 · Plataforma gestionada', body: '**Bedrock AgentCore**, **Gemini Enterprise Agent Platform** o **Microsoft Foundry** resuelven la operación: aislamiento por sesión, identidad, memoria, gateway de herramientas, políticas y evaluación. Normalmente ejecutan tu framework del nivel 2.', flows: ['harness>platform'] },
    { title: 'Nivel 5 · Agentes SaaS', body: 'Productos como **Gemini Enterprise** o Microsoft Copilot permiten que equipos de negocio armen agentes con conectores. Rápido, pero con poco control sobre el razonamiento, la evaluación y la integración.', flows: ['platform>saas'] },
    { title: 'La combinación típica en empresa', body: 'Framework OSS (nivel 2) **desplegado** en una plataforma gestionada (nivel 4), con modelos detrás de un **AI gateway** y herramientas expuestas por **MCP**. Es el patrón de la arquitectura de referencia de esta guía.', focus: ['fw', 'platform'] },
  ],
}

export const rutaProyecto: IsoSpec = {
  id: 'ruta-proyecto-integrador',
  title: 'El proyecto integrador crece nivel a nivel',
  summary:
    'Cada nivel de la ruta agrega una pieza al mismo sistema: un **asistente de operaciones** para una empresa de retail. Recorre los pasos para ver qué construyes en cada nivel y cómo se conecta con lo anterior.',
  height: 500,
  zones: [{ id: 'prod', label: 'Producción (nivel 5)', from: [1.6, -5.2], to: [11.6, 5.0], tone: 'infra' }],
  nodes: [
    { id: 'user', label: 'Operaciones', sub: 'usuarios internos', at: [-1.6, 0], shape: 'person', tone: 'user', icon: 'users', info: 'Usuarios internos que preguntan por pedidos, stock e incidentes.' },
    { id: 'llm', label: 'LLM + salida JSON', sub: 'Nivel 0', at: [3.2, -3.5], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Nivel 0: llamadas al modelo con salida estructurada validada (clasificación de tickets).' },
    { id: 'agent', label: 'Agente con tools', sub: 'Nivel 1 → 3', at: [3.2, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Nivel 1: loop con 3 herramientas. Nivel 3: reescrito en ADK con workflows, sesiones y callbacks.' },
    { id: 'kb', label: 'RAG de políticas', sub: 'Nivel 2', at: [3.2, 3.5], shape: 'stack', tone: 'data', icon: 'book', info: 'Nivel 2: base de conocimiento con búsqueda híbrida, reranking y citas, evaluada con RAGAS.' },
    { id: 'gw', label: 'AI Gateway', sub: 'Nivel 4', at: [6.7, -3.5], shape: 'hex', tone: 'gateway', icon: 'router', info: 'Nivel 4: LiteLLM Proxy con claves virtuales, presupuesto y fallback de región hacia Bedrock.' },
    { id: 'mcp', label: 'Servidor MCP', sub: 'Nivel 4', at: [6.7, 0], shape: 'hex', tone: 'protocol', icon: 'plug', info: 'Nivel 4: el sistema de pedidos expuesto como servidor MCP con OAuth y scopes.' },
    { id: 'evals', label: 'Evals + trazas', sub: 'Nivel 5', at: [6.7, 3.5], shape: 'box', tone: 'infra', icon: 'chart', info: 'Nivel 5: suite de evals en CI, trazas OTel, guardrails y aprobación humana en acciones irreversibles.' },
    { id: 'peer', label: 'Especialista', sub: 'Nivel 6 · A2A', at: [10.2, 0], shape: 'tall', tone: 'agent', icon: 'network', scale: 0.9, info: 'Nivel 6: un agente de remediación (en Strands) al que el orquestador delega vía A2A.' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'agent', to: 'llm', route: 'z' },
    { from: 'agent', to: 'kb', route: 'z' },
    { from: 'agent', to: 'mcp' },
    { from: 'llm', to: 'gw', dashed: true },
    { from: 'agent', to: 'evals', dashed: true },
    { from: 'mcp', to: 'peer' },
  ],
  steps: [
    { title: 'Nivel 0 · El modelo como función', body: 'Empiezas con llamadas al modelo que devuelven **JSON validado**: clasificar tickets por categoría y urgencia. Aprendes tokens, costos y salida estructurada.', focus: ['llm'] },
    { title: 'Nivel 1 · Primer agente', body: 'Construyes el **loop** a mano con 3 herramientas (catálogo, estado de pedido, calculadora) y un límite de turnos.', flows: ['user>agent', 'agent>llm'] },
    { title: 'Nivel 2 · Conocimiento con RAG', body: 'Agregas una **base de conocimiento** de políticas con búsqueda híbrida y citas, y mides recall y fidelidad.', flows: ['agent>kb', 'kb>agent'] },
    { title: 'Nivel 3 · Framework y workflows', body: 'Migras a **ADK**: workflows para los procesos repetibles, sesiones con estado y callbacks para logging y guardrails.', focus: ['agent'] },
    { title: 'Nivel 4 · Protocolos y gateway', body: 'El sistema de pedidos pasa a ser un **servidor MCP** con OAuth, y todas las llamadas al modelo pasan por un **AI gateway** con presupuesto por equipo.', flows: ['agent>mcp', 'llm>gw'] },
    { title: 'Nivel 5 · Producción', body: 'Despliegas en un runtime gestionado con **evals en CI**, trazas, guardrails y aprobación humana para acciones irreversibles.', flows: ['agent>evals'] },
    { title: 'Nivel 6 · Multiagente', body: 'Cuando el dominio crece, el agente pasa a **orquestador** y delega remediaciones a un especialista vía **A2A**, con identidad y permisos propios.', flows: ['agent>mcp', 'mcp>peer'] },
  ],
}
