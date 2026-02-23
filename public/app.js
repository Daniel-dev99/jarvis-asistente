// JARVIS - Cliente JavaScript
class JarvisClient {
  constructor() {
    this.messagesContainer = document.getElementById('messages');
    this.chatForm = document.getElementById('chatForm');
    this.messageInput = document.getElementById('messageInput');
    this.typingIndicator = document.getElementById('typingIndicator');
    this.welcomeMessage = document.getElementById('welcomeMessage');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.chatContainer = document.getElementById('chatContainer');
    
    // WebSocket connection
    this.ws = null;
    this.connectWebSocket();
    
    // Initialize event listeners
    this.initEventListeners();
    
    // Load previous history
    this.loadHistory();
  }
  
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket conectado');
        this.setStatus(true);
      };
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'response') {
          this.hideTyping();
          this.addMessage(data.content, 'assistant');
        } else if (data.type === 'error') {
          this.hideTyping();
          this.addMessage(`Error: ${data.content}`, 'assistant');
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket desconectado');
        this.setStatus(false);
        // Intentar reconectar después de 5 segundos
        setTimeout(() => this.connectWebSocket(), 5000);
      };
      
      this.ws.onerror = (error) => {
        console.error('Error de WebSocket:', error);
        this.setStatus(false);
      };
    } catch (error) {
      console.error('Error al conectar WebSocket:', error);
    }
  }
  
  setStatus(online) {
    if (online) {
      this.statusIndicator.classList.add('online');
    } else {
      this.statusIndicator.classList.remove('online');
    }
  }
  
  initEventListeners() {
    // Form submission
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });
    
    // Quick action buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const query = btn.dataset.query;
        this.messageInput.value = query;
        this.sendMessage();
      });
    });
    
    // Clear history button
    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
      if (confirm('¿Estás seguro de que quieres borrar el historial?')) {
        this.clearHistory();
      }
    });
    
    // Settings modal
    document.getElementById('settingsBtn').addEventListener('click', () => {
      document.getElementById('settingsModal').style.display = 'flex';
    });
    
    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
      document.getElementById('settingsModal').style.display = 'none';
    });
    
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      this.saveSettings();
    });
    
    // Close modal on outside click
    document.getElementById('settingsModal').addEventListener('click', (e) => {
      if (e.target.id === 'settingsModal') {
        e.target.style.display = 'none';
      }
    });
    
    // Enter key to send
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }
  
  async sendMessage() {
    const message = this.messageInput.value.trim();
    
    if (!message) return;
    
    // Hide welcome message on first message
    if (this.welcomeMessage) {
      this.welcomeMessage.style.display = 'none';
    }
    
    // Add user message to chat
    this.addMessage(message, 'user');
    this.messageInput.value = '';
    
    // Show typing indicator
    this.showTyping();
    
    // Enviar via REST API (fallback if WebSocket fails)
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      
      const data = await response.json();
      this.hideTyping();
      
      if (data.response) {
        this.addMessage(data.response, 'assistant');
      } else if (data.error) {
        this.addMessage(`Error: ${data.error}`, 'assistant');
      }
    } catch (error) {
      this.hideTyping();
      this.addMessage(`Error de conexión: ${error.message}`, 'assistant');
    }
  }
  
  addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // Parse markdown-like formatting
    const formattedContent = this.formatContent(content);
    
    messageDiv.innerHTML = `
      ${formattedContent}
      <div class="timestamp">${new Date().toLocaleTimeString()}</div>
    `;
    
    this.messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }
  
  formatContent(content) {
    // Convert **bold** to <strong>
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert [text](url) to <a>
    content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Convert ```code``` to <pre><code>
    content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Convert `code` to <code>
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert newlines to <br>
    content = content.replace(/\n/g, '<br>');
    
    return content;
  }
  
  showTyping() {
    this.typingIndicator.style.display = 'flex';
    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
  }
  
  hideTyping() {
    this.typingIndicator.style.display = 'none';
  }
  
  async loadHistory() {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      
      if (data.history && data.history.length > 0) {
        // Hide welcome message
        if (this.welcomeMessage) {
          this.welcomeMessage.style.display = 'none';
        }
        
        // Add all messages to chat
        data.history.forEach(msg => {
          this.addMessage(msg.content, msg.role);
        });
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
    }
  }
  
  async clearHistory() {
    try {
      await fetch('/api/history', { method: 'DELETE' });
      
      // Clear chat
      this.messagesContainer.innerHTML = '';
      
      // Show welcome message
      if (this.welcomeMessage) {
        this.welcomeMessage.style.display = 'block';
      }
      
      this.addMessage('Historial borrado. ¿En qué puedo ayudarte?', 'assistant');
    } catch (error) {
      console.error('Error al borrar historial:', error);
    }
  }
  
  async saveSettings() {
    const tavilyApiKey = document.getElementById('tavilyApiKey').value;
    
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tavily: { apiKey: tavilyApiKey }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Configuración guardada');
        document.getElementById('settingsModal').style.display = 'none';
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      alert('Error al guardar configuración');
    }
  }
}

// Initialize client when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.jarvis = new JarvisClient();
});
