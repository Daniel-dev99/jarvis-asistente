// JARVIS - Agente Principal con Cerebro de IA
import { WebSearcher } from './search.js';
import { Brain } from './brain.js';
import config from '../config/config.js';

export class Agent {
  constructor(memory, knowledgeBase, fileManager) {
    this.memory = memory;
    this.knowledgeBase = knowledgeBase;
    this.fileManager = fileManager;
    this.searcher = new WebSearcher();
    this.brain = new Brain();
  }
  
  async processMessage(message, context = {}) {
    // Obtener historial relevante de la memoria
    const relevantHistory = await this.memory.getRelevantContext(message);
    
    // Construir el contexto completo
    const fullContext = {
      ...context,
      history: relevantHistory,
      timestamp: new Date().toISOString()
    };
    
    let response = '';
    const messageLower = message.toLowerCase();
    
    // Determinar el tipo de consulta
    if (this.needsFileAccess(message)) {
      const filePath = this.extractFilePath(message);
      try {
        const fileContent = await this.fileManager.readFile(filePath);
        response = await this.brain.think(`El usuario quiere saber el contenido de un archivo. Contenido del archivo: ${fileContent}. Responde de manera útil.`, fullContext);
        if (!response) {
          response = this.formatFileResponse(fileContent, filePath);
        }
      } catch (error) {
        response = `No pude acceder al archivo: ${error.message}`;
      }
    }
    else if (this.needsKnowledgeBase(message)) {
      const kbResults = await this.knowledgeBase.search(message);
      fullContext.knowledge = kbResults;
      
      // Usar el cerebro para sintetizar
      response = await this.brain.think(`El usuario pregunta: "${message}". De la base de conocimientos: ${JSON.stringify(kbResults)}. Responde de manera útil.`, fullContext);
      
      if (!response) {
        response = this.formatKnowledgeBaseResponse(kbResults, message);
      }
    }
    else {
      // Para todo lo demás, usar el cerebro con investigación
      response = await this.thinkAndResearch(message, fullContext);
    }
    
    // Guardar la conversación en la memoria
    await this.memory.addMessage({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    await this.memory.addMessage({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    
    return response;
  }
  
  // El cerebro pensa + investiga
  async thinkAndResearch(query, context) {
    const brainAvailable = await this.brain.isAvailable();
    
    if (!brainAvailable) {
      return await this.basicSearch(query);
    }
    
    // Verificar si es una pregunta simple que no necesita búsqueda
    if (!this.requiresInvestigation(query)) {
      // Usar el cerebro sin búsqueda
      const prompt = `Usuario dice: "${query}"
${context.history && context.history.length > 0 ? `Contexto: ${context.history.slice(-2).map(m => `${m.role === 'user' ? 'Usuario' : 'JARVIS'}: ${m.content}`).join('\n')}` : ''}

Responde de manera breve y directa.`;
      
      let response = await this.brain.think(prompt, context);
      if (!response) {
        response = await this.basicSearch(query);
      }
      return response;
    }
    
    // Investigar primero
    let searchResults = [];
    try {
      searchResults = await this.searchWeb(query);
      context.searchResults = searchResults;
      
      if (searchResults.length > 0) {
        context.searchProviders = [...new Set(searchResults.map(r => r.provider))].join(', ');
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
    }
    
    // Hacer que el cerebro piense con toda la información
    const prompt = `Usuario pregunta: "${query}"

${searchResults.length > 0 ? `Resultados de busqueda:
${searchResults.map(r => `- ${r.title}: ${r.content}`).join('\n')}` : 'No hay resultados de busqueda.'}

${context.history && context.history.length > 0 ? `Contexto: ${context.history.slice(-2).map(m => `${m.role === 'user' ? 'Usuario' : 'JARVIS'}: ${m.content}`).join('\n')}` : ''}

Da la respuesta directamente usando los resultados. No digas "segun", "basado en", o muestres tu razonamiento. Simplemente responde.`;

    let response = await this.brain.think(prompt, context);
    
    // Si el cerebro falla, usar búsqueda básica
    if (!response) {
      response = await this.basicSearch(query);
    }
    
    return response;
  }
  
  // Búsqueda básica sin cerebro
  async basicSearch(query) {
    const searchResults = await this.searchWeb(query);
    
    if (!searchResults || searchResults.length === 0) {
      return `No encontré información sobre "${query}". ¿Podrías ser más específico?`;
    }
    
    const providers = [...new Set(searchResults.map(r => r.provider))].join(', ');
    
    let response = `Resultados de búsqueda (${providers}):\n\n`;
    
    searchResults.slice(0, 3).forEach((result, i) => {
      response += `${i + 1}. ${result.title}\n${result.content}\n\n`;
    });
    
    return response;
  }
  
  requiresInvestigation(message) {
    const msg = message.toLowerCase();
    
    // SIEMPRE buscar si tiene signo de interrogación
    if (msg.includes('?') || msg.includes('¿')) {
      return true;
    }
    
    // NO buscar si es solo un saludo
    const noSearchTriggers = [
      'hola', 'buenos', 'buenas', 'hey', 'hi', 'hello',
      'gracias', 'thank', 'por favor', 'please',
      'como estas', 'que tal', 'buen dia', 'buenas noches', 'buenas tardes',
      'adios', 'bye', 'nos vemos',
      'soy jarvis', 'yo soy', 'quien eres', 'que eres',
      'que puedes hacer', 'ayuda',
      'si', 'ok', 'okay', 'bien', 'entendido',
      'jaja', 'jeje', 'lol'
    ];
    
    if (noSearchTriggers.some(trigger => msg === trigger || msg.startsWith(trigger + ' ') || msg.endsWith(' ' + trigger))) {
      return false;
    }
    
    // Buscar si contiene palabras de pregunta
    const questionWords = ['que es', 'quien es', 'cuando', 'donde', 'cual', 'cuales', 'como', 'por que', 'para que', 'cuanto', 'cuantos', 'porque', 'definicion'];
    if (questionWords.some(word => msg.includes(word))) {
      return true;
    }
    
    // Buscar para temas de información
    const infoTriggers = ['noticia', 'actual', 'nuevo', 'ultimo', 'reciente', 'busca', 'investiga', 'encuentra', 'google', 'wikipedia'];
    if (infoTriggers.some(trigger => msg.includes(trigger))) {
      return true;
    }
    
    // Por defecto, buscar
    return true;
  }
  
  needsWebSearch(message) {
    const webSearchTriggers = [
      'busca en internet',
      'busca en la web',
      'investiga',
      'search',
      'google'
    ];
    
    return webSearchTriggers.some(trigger => 
      message.toLowerCase().includes(trigger)
    );
  }
  
  needsKnowledgeBase(message) {
    const kbTriggers = [
      'mi conocimiento',
      'mis notas',
      'en mi base',
      'documentación',
      'en mis documentos',
      'sabes que',
      'recuerda que'
    ];
    
    return kbTriggers.some(trigger => 
      message.toLowerCase().includes(trigger)
    );
  }
  
  needsFileAccess(message) {
    const fileTriggers = [
      'lee el archivo',
      'lee el código',
      'muestra el archivo',
      'qué hay en',
      'contenido de',
      'read file',
      'cat'
    ];
    
    return fileTriggers.some(trigger => 
      message.toLowerCase().includes(trigger)
    );
  }
  
  extractFilePath(message) {
    const patterns = [
      /archivo\s+(.+?)(?:\s|$)/i,
      /file\s+(.+?)(?:\s|$)/i,
      /(?:^|\s)([a-zA-Z]:[\\\/].+?)(?:\s|$)/,
      /(?:^|\s)(\/.+?)(?:\s|$)/
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  async searchWeb(query) {
    try {
      const cleanQuery = query
        .replace(/busca en (internet|la web)|investiga|search|google/gi, '')
        .trim();
      
      return await this.searcher.search(cleanQuery);
    } catch (error) {
      console.error('Error en búsqueda web:', error);
      return [];
    }
  }
  
  formatKnowledgeBaseResponse(results, query) {
    if (!results || results.length === 0) {
      return 'No encontré información relevante en tu base de conocimientos.';
    }
    
    let response = `Encontré información relevante en tu base de conocimientos:\n\n`;
    
    results.forEach((result, index) => {
      response += `### ${result.title}\n`;
      response += `${result.content}\n\n`;
    });
    
    return response;
  }
  
  formatFileResponse(content, path) {
    return `Contenido de **${path}**:\n\n\`\`\`\n${content}\n\`\`\``;
  }
}
