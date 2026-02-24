// JARVIS - Cerebro de IA usando Ollama
import fetch from 'node-fetch';
import personality from '../config/personality.js';

export class Brain {
  constructor(options = {}) {
    this.model = options.model || 'deepseek-r1:32b';
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.temperature = options.temperature || 0.7;
    this.systemPrompt = this.buildSystemPrompt();
  }
  
  buildSystemPrompt() {
    const p = personality;
    const rules = p.rules.response.join('\n- ');
    const expertise = p.expertise.join(', ');
    
    return `Eres ${p.name} (${p.realName}).

IMPORTANTE: Tienes acceso a búsqueda en tiempo real y puedes obtener información actualizada de internet.
Cuando el usuario pregunta algo, la información de búsqueda ya está disponible - USALA para responder.

PERSONALIDAD:
- Traits: ${p.personality.traits.join(', ')}

REGLAS OBLIGATORIAS:
- ${rules}

Si tienes datos de búsqueda, USALOS. No digas que no tienes acceso a información en tiempo real.`;
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
