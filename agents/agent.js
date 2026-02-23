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
      // Ahora siempre investigará en la web primero
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
    // Siempre investigar para dar mejores respuestas
    const brainAvailable = await this.brain.isAvailable();
    
    if (!brainAvailable) {
      return await this.basicSearch(query);
    }
    
    // Verificar si es una pregunta simple que no necesita búsqueda
    if (!this.requiresInvestigation(query)) {
      // Usar el cerebro sin búsqueda
      const prompt = `Eres JARVIS, un asistente de IA útil y amigable.
Usuario dice: "${query}"
${context.history && context.history.length > 0 ? `\nContexto:\n${context.history.slice(-2).map(m => `${m.role === 'user' ? 'Usuario' : 'Tú'}: ${m.content}`).join('\n')}` : ''}
Responde de manera breve y concisa.`;
      
      let response = await this.brain.think(prompt, context);
      if (!response) {
        response = await this.basicSearch(query);
      }
      return response;
    }
    
    // Investigar primero - siempre buscar en la web
    // (ya no dependemos de requiresInvestigation)
    let searchResults = [];
    try {
      searchResults = await this.searchWeb(query);
      context.searchResults = searchResults;
      
      // Agregar info de proveedores al contexto
      if (searchResults.length > 0) {
        context.searchProviders = [...new Set(searchResults.map(r => r.provider))].join(', ');
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
    }
    
    // Hacer que el cerebro piense con toda la información
    const prompt = `Eres JARVIS, un asistente de IA avanzado con acceso a búsqueda web en tiempo real.
Usuario pregunta: "${query}"
${searchResults.length > 0 ? `\nInformación encontrada en la web (${context.searchProviders}):\n${searchResults.map(r => `[${r.provider.toUpperCase()}] ${r.title}: ${r.content}`).join('\n')}` : '\nNo se encontró información en la web.'}
${context.history && context.history.length > 0 ? `\nContexto de la conversación:\n${context.history.slice(-3).map(m => `${m.role === 'user' ? 'Usuario' : 'Tú'}: ${m.content}`).join('\n')}` : ''}

Instrucciones:
1. Si encontraste información relevante, sintetízala y preséntala de manera clara
2. Cita las fuentes cuando sea apropiado
3. Si la información no es suficiente, indica qué más podrías buscar
4. Responde de manera completa y útil en español`;
    
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
    
    // Agrupar por proveedor
    const providers = [...new Set(searchResults.map(r => r.provider))].join(', ');
    
    let response = `🔍 **Resultados de búsqueda** (fuentes: ${providers}):\n\n`;
    
    searchResults.slice(0, 5).forEach((result, i) => {
      response += `**${i + 1}. ${result.title}** [${result.provider}]\n`;
      response += `${result.content}\n`;
      if (result.url) {
        response += `[Ver fuente](${result.url})\n`;
      }
      response += '\n';
    });
    
    return response;
  }
  
  requiresInvestigation(message) {
    // Preguntas que NO requieren investigación (respuestas rápidas)
    const noSearchTriggers = [
      'hola', 'buenos', 'buenas', 'hey', 'hi', 'hello',
      'gracias', 'thank', 'por favor', 'please',
      'cómo estás', 'como estas', 'qué tal', 'que tal',
      'adiós', 'adios', 'bye', 'nos vemos',
      'soy jarvis', 'yo soy', 'quién eres', 'quien eres',
      'qué puedes hacer', 'que puedes hacer', 'ayuda',
      'sí', 'si', 'ok', 'okay', 'bien', 'entendido',
      'jaja', 'jeje', 'lol', '😂'
    ];
    
    const msg = message.toLowerCase();
    
    // Si es una pregunta simple, no buscar
    if (noSearchTriggers.some(trigger => msg.includes(trigger))) {
      return false;
    }
    
    // Búsqueda más agresiva - casi todo requiere investigación
    const alwaysSearchTriggers = [
      'qué es', 'quién es', 'cuándo', 'dónde', 'cuál', 'cuáles',
      'cómo', 'por qué', 'para qué', 'cuánto', 'cuántos',
      'noticia', 'actual', 'nuevo', 'último', 'reciente',
      'busca', 'investiga', 'encuentra'
    ];
    
    const investigationTriggers = [
      '¿por qué', 'por qué', 'cómo funciona', 'cómo se hace',
      'explica', 'dime sobre',
      'qué sabes sobre', 'háblame de', 'necesito saber',
      'ayúdame a entender', 'puedo usar', 'diferencia entre',
      'pros y contras', 'ventajas', 'desventajas',
      'qué necesito', 'cómo empezar', 'cuál es mejor',
      'todo sobre', 'completo', 'guía', 'tutorial',
      'problema', 'error', 'solucionar',
      'información', 'dónde puedo', 'cómo obtener',
      'mejor', 'peor', 'top', 'ranking', 'comparación',
      'defin', 'concepto', 'significado', 'traducción',
      'enlace', 'link', 'página', 'sitio', 'web'
    ];
    
    // Siempre buscar para preguntas de información
    if (alwaysSearchTriggers.some(trigger => msg.includes(trigger))) {
      return true;
    }
    
    return investigationTriggers.some(trigger => msg.includes(trigger));
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
