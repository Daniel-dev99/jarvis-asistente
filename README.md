# 🤖 JARVIS - Asistente de IA

Un asistente de inteligencia artificial con búsqueda web, base de conocimientos personalizada, acceso a archivos locales y memoria conversacional.

## 🚀 Características

- 🔍 **Búsqueda en Internet**: Investig cualquier tema usando Tavily
- 📚 **Base de Conocimientos**: Agrega y consulta tus propios documentos
- 📁 **Acceso a Archivos**: Lee archivos de tu sistema local
- 💬 **Memoria Conversacional**: Recuerda el contexto de tus conversaciones
- 🌐 **Interfaz Web**: Chat moderno e interactivo

## 📋 Requisitos

- Node.js 20.0.0 o superior
- npm (incluido con Node.js)

## 🛠️ Instalación

1. Clona o descarga este repositorio
2. Instala las dependencias:

```bash
npm install
```

## ▶️ Uso

Inicia el servidor:

```bash
npm start
```

Luego abre tu navegador en: **http://localhost:3000**

## 📖 Comandos

### Búsqueda Web
- "busca en internet [tema]"
- "investiga [tema]"
- "qué es [algo]"

### Base de Conocimientos
- Agrega documentos en la carpeta `knowledge/docs`
- Formato: archivos `.md` (Markdown)

### Archivos Locales
- "lee el archivo [ruta]"
- JARVIS puede leer archivos de texto, código, JSON, etc.

## 🔧 API REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/chat | Enviar mensaje |
| GET | /api/history | Obtener historial |
| DELETE | /api/history | Limpiar historial |
| POST | /api/search | Búsqueda directa |
| GET | /api/knowledge | Listar documentos |
| POST | /api/knowledge | Agregar documento |
| GET | /api/files | Listar archivos |

## ⚙️ Configuración

Edita el archivo `.env` para configurar:
- Puerto del servidor
- API Key de Tavily

## 🗂️ Estructura del Proyecto

```
jarvis/
├── server.js           # Servidor principal
├── config/            # Configuración
├── agents/             # Módulos del agente
├── memory/            # Memoria conversacional
├── knowledge/docs/    # Documentos de conocimiento
├── public/            # Interfaz web
└── .env              # Variables de entorno
```

## 📝 Ejemplos de Uso

```javascript
// Enviar mensaje via API
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: 'Busca las últimas noticias de IA' 
  })
});
```

## 🔐 Seguridad

- JARVIS solo puede acceder a archivos dentro del directorio del proyecto
- El tamaño de archivos está limitado a 1MB
- La memoria conversacional se almacena localmente

## 📄 Licencia

ISC
