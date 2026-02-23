// JARVIS - Módulo de Búsqueda Web (Tavily + DuckDuckGo)
import fetch from 'node-fetch';
import config from '../config/config.js';

export class WebSearcher {
  constructor() {
    this.apiKey = config.tavily.apiKey;
    this.baseUrl = config.tavily.baseUrl;
  }
  
  async search(query, options = {}) {
    try {
      // Intentar con Tavily primero
      const results = await this.searchWithTavily(query, options);
      if (results && results.length > 0) {
        return results;
      }
    } catch (error) {
      console.error('Tavily falló, usando alternativa:', error.message);
    }
    
    // Usar DuckDuckGo si Tavily falla
    return await this.searchWithDuckDuckGo(query, options);
  }
  
  async searchWithTavily(query, options = {}) {
    const { maxResults = 5 } = options;
    
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false,
        include_images: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error de Tavily: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.results.map(result => ({
      title: result.title,
      content: result.content || result.snippet,
      url: result.url,
      score: result.score
    }));
  }
  
  async searchWithDuckDuckGo(query, options = {}) {
    const { maxResults = 5 } = options;
    
    try {
      // Usar la API de DuckDuckGo
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error de DuckDuckGo: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transformar resultados
      const results = [];
      
      // Agregar resultado principal si existe
      if (data.AbstractText) {
        results.push({
          title: data.AbstractSource || 'Resultado principal',
          content: data.AbstractText,
          url: data.AbstractURL || '',
          score: 1.0
        });
      }
      
      // Agregar resultados relacionados
      if (data.RelatedTopics) {
        data.RelatedTopics.forEach((topic, index) => {
          if (index >= maxResults) return;
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: this.extractTitle(topic.Text),
              content: topic.Text,
              url: topic.FirstURL,
              score: 0.9 - (index * 0.1)
            });
          }
        });
      }
      
      return results.length > 0 ? results : this.fallbackSearch(query);
    } catch (error) {
      console.error('DuckDuckGo falló:', error);
      return this.fallbackSearch(query);
    }
  }
  
  extractTitle(text) {
    // Extraer título del texto
    const parts = text.split(' - ');
    return parts[0].substring(0, 60);
  }
  
  async fallbackSearch(query) {
    return [{
      title: `Búsqueda: ${query}`,
      content: `No se pudieron obtener resultados para "${query}". Intenta con una pregunta diferente.`,
      url: '',
      score: 1.0
    }];
  }
  
  async getAnswer(question) {
    try {
      const results = await this.search(question, { maxResults: 3 });
      if (results && results.length > 0) {
        return results[0].content;
      }
      return null;
    } catch (error) {
      console.error('Error al obtener respuesta:', error);
      return null;
    }
  }
}
