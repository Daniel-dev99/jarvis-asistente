# Bienvenido a JARVIS

Este es un documento de ejemplo para la base de conocimientos de JARVIS.

## ¿Qué es JARVIS?

JARVIS es un asistente de inteligencia artificial diseñado para ayudarte con:
- Búsqueda en internet
- Gestión de conocimiento personalizado
- Acceso a archivos locales
- Resolución de problemas

## Cómo agregar documentos

Puedes agregar documentos a la base de conocimientos usando:
- La API REST `/api/knowledge`
- Directamente creando archivos `.md` en la carpeta `knowledge/docs`

## Etiquetas

Usa etiquetas en tus documentos para facilitar la búsqueda:
- #tutorial
- #notas
- #proyectos
- #configuración

## Ejemplo de código

```javascript
// Ejemplo de uso de la API
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hola JARVIS' })
});
```

#bienvenida #ejemplo #documentación
