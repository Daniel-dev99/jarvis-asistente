// JARVIS - Cerebro de IA usando Ollama
import fetch from 'node-fetch';

export class Brain {
  constructor(options = {}) {
    this.model = options.model || 'deepseek-r1:32b';
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.temperature = options.temperature || 0.7;
    this.systemPrompt = `Eres JARVIS, un asistente de IA util y conversacional.
Eres amigable, servicial y respondes de manera directa.

REGLAS IMPORTANTES:
1. NUNCA muestres tu proceso de razonamiento interno
2. NUNCA digas "segun la informacion" o "basandome en..."
3. NUNCA menciones que eres un modelo de IA
4. Simplemente da la respuesta de manera natural
5. Responde en espanol de forma clara y directa
6. Si no sabes algo, responde honestamente`;
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
      prompt += 'Conversacion previa:\n';
      context.history.slice(-5).forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Usuario' : 'JARVIS'}: ${msg.content}\n`;
      });
      prompt += '\n';
    }
    
    // Agregar información de búsqueda si existe
    if (context.searchResults && context.searchResults.length > 0) {
      prompt += 'Informacion encontrada:\n';
      context.searchResults.forEach((result, i) => {
        prompt += `- ${result.title}: ${result.content}\n`;
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
    
    // Instrucciones finales
    prompt += `Usuario: ${userPrompt}\n\n`;
    prompt += `Da una respuesta DIRECTA y conversacional. No menciones las fuentes o "segun". Simplemente responde naturalmente.\n\n`;
    prompt += `JARVIS: `;
    
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
