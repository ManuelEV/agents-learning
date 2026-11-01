import type { IsoSpec } from '../components/iso/types'

export const contextoEnsamblaje: IsoSpec = {
  id: 'contexto-ensamblaje',
  title: 'Cómo se arma la ventana de contexto en cada turno',
  summary:
    'En cada llamada al modelo, el harness **compone** la ventana de contexto a partir de varias fuentes. Lo estable va primero (y se cachea); lo variable, al final. Lo que no cabe se recupera *just-in-time* o se compacta. Ejemplo: un agente de soporte de un retailer.',
  height: 500,
  nodes: [
    { id: 'sys', label: 'System prompt', sub: 'altitud correcta', at: [0, -3.4], shape: 'doc', tone: 'memory', icon: 'scroll', info: 'Instrucciones con secciones claras (rol, objetivos, herramientas, formato de salida). Ni reglas frágiles tipo `if/else` ni vaguedades. Es estable entre turnos: candidato ideal a caché.' },
    { id: 'tools', label: 'Definiciones de tools', sub: 'pocas y distintas', at: [3.3, -3.4], shape: 'doc', tone: 'tool', icon: 'wrench', info: 'Nombre, descripción y JSON Schema de cada herramienta. Ocupan tokens en **cada** llamada: pocas, sin solaparse y en orden determinista para no romper la caché.' },
    { id: 'skills', label: 'Skills', sub: 'solo name + description', at: [6.6, -3.4], shape: 'doc', tone: 'protocol', icon: 'book', info: 'Con *progressive disclosure* solo se cargan los metadatos de cada Agent Skill; el `SKILL.md` completo entra cuando el modelo decide activarla.' },
    { id: 'user', label: 'Mensaje del usuario', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: '"¿Puedo cambiar la talla del pedido 4512 que ya salió a despacho?"' },
    { id: 'mem', label: 'Memoria largo plazo', sub: 'hechos del usuario', at: [0, 3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Preferencias y hechos extraídos de sesiones anteriores ("cliente frecuente, prefiere retiro en tienda"). Se recupera por búsqueda, no se vuelca entera.' },
    { id: 'hist', label: 'Historial', sub: 'compactado', at: [3.3, 3.4], shape: 'doc', tone: 'memory', icon: 'layers', info: 'Turnos recientes completos y un resumen de los antiguos. Los resultados de herramientas viejos se pueden **limpiar**: ya cumplieron su función.' },
    { id: 'rag', label: 'Recuperación JIT', sub: 'tool de búsqueda', at: [6.6, 3.4], shape: 'stack', tone: 'data', icon: 'search', info: 'El agente guarda referencias (IDs, rutas, URLs) y carga el contenido solo cuando lo necesita, con una herramienta de búsqueda o lectura.' },
    { id: 'window', label: 'Ventana de contexto', sub: 'presupuesto finito', at: [6.6, 0], shape: 'doc', tone: 'agent', icon: 'layers', scale: 1.2, info: 'El resultado del ensamblaje. Objetivo: el **conjunto mínimo de tokens de alta señal** que maximiza la probabilidad del resultado deseado.' },
    { id: 'llm', label: 'LLM', sub: 'Claude en Bedrock', at: [10, 0], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Cada token compite por la atención del modelo. Más contexto no es mejor contexto: con ventanas muy llenas aparece el *context rot*.' },
    { id: 'cache', label: 'Prompt cache', sub: 'cachePoint · TTL 1 h', at: [9.8, -4.0], shape: 'hex', tone: 'gateway', icon: 'zap', info: 'El prefijo estable (tools → system) se cachea con un `cachePoint` de la Converse API. Las lecturas de caché se facturan a tarifa reducida y bajan la latencia.' },
  ],
  edges: [
    { from: 'sys', to: 'window', route: 'x' },
    { from: 'tools', to: 'window', route: 'x' },
    { from: 'skills', to: 'window', route: 'z' },
    { from: 'user', to: 'window' },
    { from: 'mem', to: 'window', route: 'x' },
    { from: 'hist', to: 'window', route: 'x' },
    { from: 'rag', to: 'window', route: 'z' },
    { from: 'window', to: 'llm' },
    { from: 'cache', to: 'llm', route: 'z', dashed: true },
  ],
  steps: [
    { title: '1 · Prefijo estable', body: 'Primero van las definiciones de herramientas y el system prompt. Como no cambian entre turnos, forman un **prefijo cacheable**. Cambiar una tool invalida la caché de todo lo que viene después.', flows: ['tools>window', 'sys>window'] },
    { title: '2 · Skills con divulgación progresiva', body: 'De cada Agent Skill solo entra el nombre y la descripción. Cien skills cuestan unos pocos cientos de tokens; el contenido completo se carga bajo demanda.', flows: ['skills>window'] },
    { title: '3 · Memoria relevante', body: 'Se buscan en la memoria de largo plazo los hechos relevantes para este usuario y esta consulta, no todos los recuerdos.', flows: ['mem>window'] },
    { title: '4 · Historial compactado', body: 'Entran los turnos recientes completos y un resumen de lo anterior. La compactación libera espacio sin perder decisiones ni detalles abiertos.', flows: ['hist>window'] },
    { title: '5 · Mensaje actual', body: 'El mensaje del usuario va al final: es la parte más variable y la que más atención necesita.', flows: ['user>window'] },
    { title: '6 · Llamada al modelo', body: 'La ventana se envía al LLM. El prefijo se lee de la caché (más barato y rápido); solo se procesa completo lo nuevo.', flows: ['window>llm', 'cache>llm'] },
    { title: '7 · Recuperación just-in-time', body: 'El modelo decide que necesita la política de cambios y llama a la herramienta de búsqueda. El resultado entra en el siguiente turno, **solo porque hizo falta**.', flows: ['llm>window', 'rag>window'] },
  ],
}

export const contextoMemoria: IsoSpec = {
  id: 'contexto-memoria',
  title: 'Memoria de corto y largo plazo',
  summary:
    'La **memoria de corto plazo** guarda los eventos y el estado de la sesión actual. Un proceso de **extracción** (normalmente asíncrono) convierte esas conversaciones en **recuerdos de largo plazo** (hechos, preferencias, resúmenes) que se recuperan por búsqueda en sesiones futuras, siempre acotados al usuario.',
  height: 470,
  nodes: [
    { id: 'user', label: 'Cliente', at: [0, 0], shape: 'person', tone: 'user', icon: 'user', info: 'El mismo cliente vuelve días después por otro canal. Espera que el agente recuerde lo importante, no toda la conversación.' },
    { id: 'agent', label: 'Agente', sub: 'ADK · Strands · LangGraph', at: [3.3, 0], shape: 'tall', tone: 'agent', icon: 'bot', info: 'Lee y escribe estado durante la sesión, y consulta la memoria de largo plazo cuando la necesita (como herramienta o precargada al inicio del turno).' },
    { id: 'model', label: 'LLM', at: [3.3, 3.4], shape: 'sphere', tone: 'model', icon: 'brain', info: 'Solo ve lo que el agente pone en el contexto: el modelo en sí no recuerda nada entre llamadas.' },
    { id: 'session', label: 'Sesión', sub: 'eventos + estado', at: [3.3, -3.4], shape: 'cylinder', tone: 'memory', icon: 'database', info: 'Corto plazo: historial de eventos y estado clave-valor de la conversación actual. Ej.: ADK `SessionService`, AgentCore Memory (eventos), checkpointer de LangGraph por `thread_id`.' },
    { id: 'extract', label: 'Extracción', sub: 'asíncrona · LLM', at: [6.8, -3.4], shape: 'box', tone: 'model', icon: 'sparkles', info: 'Un pipeline (gestionado o propio) lee la conversación y extrae hechos, preferencias y resúmenes; además **consolida**: actualiza o descarta recuerdos contradictorios.' },
    { id: 'ltm', label: 'Memoria largo plazo', sub: 'Memory Bank · AgentCore', at: [10.2, -3.4], shape: 'stack', tone: 'memory', icon: 'layers', info: 'Registros con búsqueda semántica, organizados por namespace (usuario, agente, tema). Ej.: Agent Platform Memory Bank, estrategias de AgentCore Memory, stores de LangGraph.' },
    { id: 'scope', label: 'Filtro por usuario', sub: 'namespace · políticas', at: [6.8, 0], shape: 'hex', tone: 'guard', icon: 'lock', info: 'La recuperación siempre se acota al usuario/tenant. Un recuerdo filtrado a otro cliente es un incidente de privacidad; la memoria también puede ser envenenada (OWASP ASI06).' },
  ],
  edges: [
    { from: 'user', to: 'agent' },
    { from: 'agent', to: 'model' },
    { from: 'agent', to: 'session', label: 'escribe' },
    { from: 'session', to: 'extract' },
    { from: 'extract', to: 'ltm' },
    { from: 'ltm', to: 'scope', route: 'z' },
    { from: 'scope', to: 'agent', label: 'búsqueda' },
  ],
  steps: [
    { title: '1 · Conversación', body: 'El cliente conversa con el agente. Cada turno se guarda como evento en la sesión, junto con el estado (carrito, pedido en curso).', flows: ['user>agent', 'agent>session'] },
    { title: '2 · El modelo no recuerda', body: 'El LLM es *stateless*: en cada llamada solo sabe lo que el agente puso en su contexto. La memoria es responsabilidad del harness.', flows: ['agent>model', 'model>agent'] },
    { title: '3 · Extracción asíncrona', body: 'Al cerrar la sesión (o periódicamente), un pipeline extrae lo que vale la pena recordar: "prefiere retiro en tienda", "tuvo un problema con la talla en octubre".', flows: ['session>extract', 'extract>ltm'] },
    { title: '4 · Recuperación acotada', body: 'En una sesión futura, el agente busca recuerdos relevantes **solo dentro del namespace del cliente** y los inserta en el contexto.', flows: ['ltm>scope', 'scope>agent'] },
    { title: '5 · Higiene', body: 'Define retención, borrado a pedido del usuario y validación de lo que se escribe: la memoria es contexto persistente y, por lo tanto, una superficie de ataque.', focus: ['scope', 'ltm'] },
  ],
}
