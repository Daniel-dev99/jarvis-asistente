// JARVIS - Cerebro de IA usando Ollama
import fetch from 'node-fetch';

export class Brain {
  constructor(options = {}) {
    this.model = options.model || 'deepseek-r1:32b';
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.temperature = options.temperature || 0.7;
    this.systemPrompt = `Eres JARVIS, un asistente de IA inteligente y útil. 
Tienes acceso a búsqueda web y una base de conocimientos.
Tu objetivo es ayudar al usuario de la manera más completa posible.
Respondes en español de manera clara y concisa.
Si no sabes algo, admítelo honestamente.`;
  }
  
  async think(prompt, context = {}) {
    try {
      // Construir el mensaje completo
      const fullPrompt = this.buildPrompt(prompt, context);
      
      // Llamar a Ollama
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          prompt: fullPrompt,
          stream: false,
          temperature: this.temperature
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error de Ollama: ${response.status}`);
      }
      
      const data = await response.json();
      return data.response;
      
    } catch (error) {
      console.error('Error en el cerebro:', error);
      return null;
    }
  }
  
  buildPrompt(userPrompt, context) {
    let prompt = this.systemPrompt + '\n\n';
    
    // Agregar contexto de la conversación
    if (context.history && context.history.length > 0) {
      prompt += 'Conversación previa:\n';
      context.history.slice(-5).forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Usuario' : 'JARVIS'}: ${msg.content}\n`;
      });
      prompt += '\n';
    }
    
    // Agregar información de búsqueda si existe
    if (context.searchResults && context.searchResults.length > 0) {
      prompt += 'Información encontrada:\n';
      context.searchResults.forEach((result, i) => {
        prompt += `${i + 1}. ${result.title}: ${result.content}\n`;
      });
      prompt += '\n';
    }
    
    // Agregar conocimiento si existe
    if (context.knowledge && context.knowledge.length > 0) {
      prompt += 'De tu base de conocimientos:\n';
      context.knowledge.forEach(kb => {
        prompt += `- ${kb.title}: ${kb.content}\n`;
      });
      prompt += '\n';
    }
    
    prompt += `Usuario: ${userPrompt}\nJARVIS:`;
    
    return prompt;
  }
  
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const data = await response.json();
      return data.models || [];
    } catch {
      return [];
    }
  }
  
  async downloadModel(modelName) {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: modelName
        })
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}
