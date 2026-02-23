// JARVIS - Base de Conocimientos
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class KnowledgeBase {
  constructor() {
    this.knowledgePath = path.resolve(__dirname, '..', config.paths.knowledge);
    this.documents = [];
    this.loadDocuments();
  }
  
  loadDocuments() {
    try {
      //确保目录存在
      if (!fs.existsSync(this.knowledgePath)) {
        fs.mkdirSync(this.knowledgePath, { recursive: true });
      }
      
      // Cargar documentos existentes
      const files = fs.readdirSync(this.knowledgePath);
      
      files.forEach(file => {
        if (file.endsWith('.md') || file.endsWith('.txt')) {
          const filePath = path.join(this.knowledgePath, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const title = file.replace(/\.(md|txt)$/, '');
          
          this.documents.push({
            title,
            content,
            file,
            tags: this.extractTags(content)
          });
        }
      });
      
      console.log(`📚 Base de conocimientos: ${this.documents.length} documentos cargados`);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
    }
  }
  
  extractTags(content) {
    // Extraer etiquetas del contenido (formato: #tag1 #tag2)
    const tagRegex = /#(\w+)/g;
    const tags = [];
    let match;
    
    while ((match = tagRegex.exec(content)) !== null) {
      tags.push(match[1]);
    }
    
    return tags;
  }
  
  async addDocument(title, content, tags = []) {
    const fileName = `${title}.md`;
    const filePath = path.join(this.knowledgePath, fileName);
    
    // Agregar etiquetas al contenido
    const fullContent = tags.length > 0 
      ? `${content}\n\nTags: ${tags.map(t => `#${t}`).join(' ')}`
      : content;
    
    fs.writeFileSync(filePath, fullContent, 'utf-8');
    
    this.documents.push({
      title,
      content: fullContent,
      file: fileName,
      tags
    });
    
    return { success: true, title };
  }
  
  async search(query) {
    const queryLower = query.toLowerCase();
    const results = [];
    
    this.documents.forEach(doc => {
      const titleMatch = doc.title.toLowerCase().includes(queryLower);
      const contentMatch = doc.content.toLowerCase().includes(queryLower);
      const tagMatch = doc.tags.some(tag => tag.toLowerCase().includes(queryLower));
      
      if (titleMatch || contentMatch || tagMatch) {
        // Calcular relevancia
        let relevance = 0;
        if (titleMatch) relevance += 3;
        if (contentMatch) relevance += 1;
        if (tagMatch) relevance += 2;
        
        results.push({
          ...doc,
          relevance
        });
      }
    });
    
    // Ordenar por relevancia
    results.sort((a, b) => b.relevance - a.relevance);
    
    return results.slice(0, 10);
  }
  
  async listDocuments() {
    return this.documents.map(doc => ({
      title: doc.title,
      file: doc.file,
      tags: doc.tags,
      preview: doc.content.substring(0, 200)
    }));
  }
  
  async getDocument(title) {
    const doc = this.documents.find(d => d.title === title);
    return doc || null;
  }
  
  async deleteDocument(title) {
    const docIndex = this.documents.findIndex(d => d.title === title);
    
    if (docIndex === -1) {
      return { success: false, error: 'Documento no encontrado' };
    }
    
    const doc = this.documents[docIndex];
    const filePath = path.join(this.knowledgePath, doc.file);
    
    fs.unlinkSync(filePath);
    this.documents.splice(docIndex, 1);
    
    return { success: true };
  }
}
