// JARVIS - Módulo de Búsqueda Web con múltiples proveedores
// Proveedores: Tavily, DuckDuckGo, Bing (simulado), Wikipedia
import fetch from 'node-fetch';
import config from '../config/config.js';

export class WebSearcher {
  constructor() {
    this.apiKey = config.tavily.apiKey;
    this.baseUrl = config.tavily.baseUrl;
    this.providers = ['tavily', 'duckduckgo', 'wikipedia', 'bing'];
  }
  
  async search(query, options = {}) {
    const { maxResults = 8 } = options; // Más resultados por defecto
    let allResults = [];
    
    // Intentar todos los proveedores y combinar resultados
    for (const provider of this.providers) {
      try {
        let results = [];
        switch (provider) {
          case 'tavily':
            results = await this.searchWithTavily(query, { maxResults: 5 });
            break;
          case 'duckduckgo':
            results = await this.searchWithDuckDuckGo(query, { maxResults: 5 });
            break;
          case 'wikipedia':
            results = await this.searchWikipedia(query, { maxResults: 3 });
            break;
          case 'bing':
            results = await this.searchBing(query, { maxResults: 3 });
            break;
        }
        
        if (results && results.length > 0) {
          allResults = [...allResults, ...results];
        }
      } catch (error) {
        console.error(`Provider ${provider} failed:`, error.message);
      }
    }
    
    // Deduplicar y ordenar por relevancia
    return this.deduplicateResults(allResults).slice(0, maxResults);
  }
  
  deduplicateResults(results) {
    const seen = new Map();
    return results.filter(result => {
      const key = result.title.toLowerCase().substring(0, 30);
      if (seen.has(key)) return false;
      seen.set(key, true);
      return true;
    }).sort((a, b) => (b.score || 0.5) - (a.score || 0.5));
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
    
    if (!this.apiKey) {
      throw new Error('No Tavily API key');
    }
    
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
      score: result.score || 0.9,
      provider: 'tavily'
    }));
  }
  
  async searchWithDuckDuckGo(query, options = {}) {
    const { maxResults = 5 } = options;
    
    try {
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
      const results = [];
      
      if (data.AbstractText) {
        results.push({
          title: data.AbstractSource || 'Resultado principal',
          content: data.AbstractText,
          url: data.AbstractURL || '',
          score: 1.0,
          provider: 'duckduckgo'
        });
      }
      
      if (data.RelatedTopics) {
        data.RelatedTopics.forEach((topic, index) => {
          if (index >= maxResults) return;
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: this.extractTitle(topic.Text),
              content: topic.Text,
              url: topic.FirstURL,
              score: 0.8 - (index * 0.1),
              provider: 'duckduckgo'
            });
          }
        });
      }
      
      return results.length > 0 ? results : this.fallbackSearch(query);
    } catch (error) {
      console.error('DuckDuckGo falló:', error);
      return [];
    }
  }
  
  async searchWikipedia(query, options = {}) {
    const { maxResults = 3 } = options;
    
    try {
      // Buscar en Wikipedia API
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${maxResults}&format=json`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      
      if (!data[1] || data[1].length === 0) {
        // Intentar en español
        const esUrl = `https://es.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${maxResults}&format=json`;
        const esResponse = await fetch(esUrl);
        if (!esResponse.ok) return [];
        const esData = await esResponse.json();
        if (!esData[1] || esData[1].length === 0) return [];
        
        return esData[1].map((title, i) => ({
          title,
          content: esData[2][i] || '',
          url: esData[3][i] || '',
          score: 0.9 - (i * 0.2),
          provider: 'wikipedia'
        }));
      }
      
      return data[1].map((title, i) => ({
        title,
        content: data[2][i] || '',
        url: data[3][i] || '',
        score: 0.9 - (i * 0.2),
        provider: 'wikipedia'
      }));
    } catch (error) {
      console.error('Wikipedia search failed:', error);
      return [];
    }
  }
  
  async searchBing(query, options = {}) {
    // Bing search simulation using HTML scraping (sin API key)
    const { maxResults = 3 } = options;
    
    try {
      const response = await fetch(
        `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${maxResults}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      );
      
      if (!response.ok) return [];
      
      const html = await response.text();
      
      // Extraer títulos y snippets del HTML
      const results = [];
      const titleRegex = /<h2[^>]*>([^<]+)<\/h2>/gi;
      const snippetRegex = /<p[^>]*>([^<]+)<\/p>/gi;
      
      let titleMatch;
      let snippetMatch;
      let i = 0;
      
      while ((titleMatch = titleRegex.exec(html)) !== null && i < maxResults) {
        const snippetMatch = snippetRegex.exec(html);
        results.push({
          title: titleMatch[1].replace(/<[^>]+>/g, '').substring(0, 80),
          content: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').substring(0, 200) : '',
          url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
          score: 0.85 - (i * 0.15),
          provider: 'bing'
        });
        i++;
      }
      
      return results;
    } catch (error) {
      console.error('Bing search failed:', error);
      return [];
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
      const results = await this.search(question, { maxResults: 5 });
      if (results && results.length > 0) {
        return {
          answer: results[0].content,
          sources: results.map(r => ({ title: r.title, url: r.url, provider: r.provider }))
        };
      }
      return null;
    } catch (error) {
      console.error('Error al obtener respuesta:', error);
      return null;
    }
  }
}
