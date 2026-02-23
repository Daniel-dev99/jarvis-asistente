// JARVIS - Memoria Conversacional
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Memory {
  constructor() {
    this.memoryPath = path.resolve(__dirname, '..', config.paths.memory);
    this.messages = [];
    this.loadMemory();
  }
  
  loadMemory() {
    try {
      //确保目录 existe
      const dir = path.dirname(this.memoryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Cargar memoria existente
      if (fs.existsSync(this.memoryPath)) {
        const data = fs.readFileSync(this.memoryPath, 'utf-8');
        this.messages = JSON.parse(data);
        console.log(`💾 Memoria: ${this.messages.length} mensajes cargados`);
      }
    } catch (error) {
      console.error('Error al cargar memoria:', error);
      this.messages = [];
    }
  }
  
  saveMemory() {
    try {
      const dir = path.dirname(this.memoryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.memoryPath, JSON.stringify(this.messages, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error al guardar memoria:', error);
    }
  }
  
  async addMessage(message) {
    this.messages.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    });
    
    // Limitar el tamaño de la memoria
    if (this.messages.length > config.agent.maxHistoryLength * 2) {
      this.messages = this.messages.slice(-config.agent.maxHistoryLength);
    }
    
    this.saveMemory();
    return this.messages.length;
  }
  
  async getHistory(limit = 50) {
    return this.messages.slice(-limit);
  }
  
  async getRelevantContext(query, limit = 10) {
    const queryLower = query.toLowerCase();
    const relevantMessages = [];
    
    // Buscar mensajes relevantes basándose en palabras clave
    this.messages.forEach(msg => {
      if (msg.content && typeof msg.content === 'string') {
        const contentLower = msg.content.toLowerCase();
        // Contar palabras en común
        const queryWords = queryLower.split(/\s+/);
        let relevance = 0;
        
        queryWords.forEach(word => {
          if (word.length > 2 && contentLower.includes(word)) {
            relevance++;
          }
        });
        
        if (relevance > 0) {
          relevantMessages.push({
            ...msg,
            relevance
          });
        }
      }
    });
    
    // Ordenar por relevancia y devolver los más relevantes
    relevantMessages.sort((a, b) => b.relevance - a.relevance);
    
    return relevantMessages.slice(0, limit).map(({ relevance, ...msg }) => msg);
  }
  
  async clearHistory() {
    this.messages = [];
    this.saveMemory();
    return true;
  }
  
  async getConversationCount() {
    return Math.floor(this.messages.length / 2);
  }
  
  async searchInHistory(query) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    this.messages.forEach(msg => {
      if (msg.content && msg.content.toLowerCase().includes(queryLower)) {
        results.push(msg);
      }
    });
    
    return results;
  }
  
  async getSummary() {
    const userMessages = this.messages.filter(m => m.role === 'user').length;
    const assistantMessages = this.messages.filter(m => m.role === 'assistant').length;
    
    return {
      totalMessages: this.messages.length,
      userMessages,
      assistantMessages,
      conversationCount: Math.floor(this.messages.length / 2)
    };
  }
}
