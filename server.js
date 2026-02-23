// JARVIS - Servidor Principal
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import config from './config/config.js';
import { Agent } from './agents/agent.js';
import { Memory } from './memory/memory.js';
import { KnowledgeBase } from './agents/knowledge.js';
import { FileManager } from './agents/files.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Inicializar componentes
const memory = new Memory();
const knowledgeBase = new KnowledgeBase();
const fileManager = new FileManager();
const agent = new Agent(memory, knowledgeBase, fileManager);

// WebSocket para chat en tiempo real
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('Cliente WebSocket conectado');
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'chat') {
        const response = await agent.processMessage(data.content, data.context);
        ws.send(JSON.stringify({
          type: 'response',
          content: response,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        content: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('Cliente WebSocket desconectado');
  });
});

// API REST Endpoints

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'El mensaje es requerido' });
    }
    
    const response = await agent.processMessage(message, context);
    
    res.json({
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener historial de conversaciones
app.get('/api/history', async (req, res) => {
  try {
    const history = await memory.getHistory();
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Limpiar historial
app.delete('/api/history', async (req, res) => {
  try {
    await memory.clearHistory();
    res.json({ success: true, message: 'Historial limpiado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Búsqueda web directa
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'La consulta de búsqueda es requerida' });
    }
    
    const results = await agent.searchWeb(query);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar documentos de conocimiento
app.get('/api/knowledge', async (req, res) => {
  try {
    const documents = await knowledgeBase.listDocuments();
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar documento a la base de conocimientos
app.post('/api/knowledge', async (req, res) => {
  try {
    const { title, content, tags } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Título y contenido son requeridos' });
    }
    
    await knowledgeBase.addDocument(title, content, tags);
    res.json({ success: true, message: 'Documento agregado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buscar en la base de conocimientos
app.post('/api/knowledge/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'La consulta es requerida' });
    }
    
    const results = await knowledgeBase.search(query);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar archivos disponibles
app.get('/api/files', async (req, res) => {
  try {
    const files = await fileManager.listFiles();
    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leer contenido de archivo
app.get('/api/files/*', async (req, res) => {
  try {
    const filePath = req.params[0];
    const content = await fileManager.readFile(filePath);
    res.json({ content, path: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener configuración
app.get('/api/config', (req, res) => {
  res.json({
    port: config.port,
    ui: config.ui,
    agent: config.agent
  });
});

// Actualizar configuración
app.post('/api/config', (req, res) => {
  // Actualizar solo ciertas configuraciones
  Object.assign(config.agent, req.body.agent || {});
  res.json({ success: true, config: config });
});

// Iniciar servidor
server.listen(config.port, () => {
  console.log(`🤖 JARVIS iniciado en http://localhost:${config.port}`);
  console.log(`📡 WebSocket disponible en ws://localhost:${config.port}/ws`);
});

export default server;
