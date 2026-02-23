// Configuración del asistente JARVIS
export default {
  // Servidor
  port: process.env.PORT || 3000,
  
  // API de Tavily para búsqueda web
  tavily: {
    apiKey: process.env.TAVILY_API_KEY || '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',
    baseUrl: 'https://api.tavily.com'
  },
  
  // Rutas
  paths: {
    memory: './memory/data.json',
    knowledge: './knowledge/docs',
    files: './files'
  },
  
  // Configuración del agente
  agent: {
    maxHistoryLength: 50,
    maxSearchResults: 5,
    enableWebSearch: true,
    enableFileAccess: true,
    enableKnowledgeBase: true
  },
  
  // Configuración de la interfaz
  ui: {
    title: 'JARVIS - Asistente de IA',
    theme: 'dark'
  }
};
