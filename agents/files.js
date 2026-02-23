// JARVIS - Acceso a Archivos Locales
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class FileManager {
  constructor() {
    // Por defecto, permitir acceso al directorio del proyecto
    this.basePath = path.resolve(__dirname, '..');
  }
  
  async listFiles(dirPath = '', options = {}) {
    const { recursive = false, extensions = [] } = options;
    const targetPath = path.resolve(this.basePath, dirPath);
    
    if (!this.isPathAllowed(targetPath)) {
      throw new Error('Ruta no permitida');
    }
    
    const files = [];
    
    try {
      const items = fs.readdirSync(targetPath);
      
      for (const item of items) {
        const fullPath = path.join(targetPath, item);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          if (recursive) {
            const subFiles = await this.listFiles(path.join(dirPath, item), {
              recursive: true,
              extensions
            });
            files.push(...subFiles);
          }
        } else if (stats.isFile()) {
          // Filtrar por extensión si se especifica
          if (extensions.length > 0) {
            const ext = path.extname(item).toLowerCase();
            if (!extensions.includes(ext)) continue;
          }
          
          files.push({
            name: item,
            path: path.join(dirPath, item).replace(/\\/g, '/'),
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error al listar archivos:', error);
    }
    
    return files;
  }
  
  async readFile(filePath) {
    const fullPath = path.resolve(this.basePath, filePath);
    
    if (!this.isPathAllowed(fullPath)) {
      throw new Error('Ruta no permitida');
    }
    
    if (!fs.existsSync(fullPath)) {
      throw new Error('Archivo no encontrado');
    }
    
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      throw new Error('La ruta es un directorio');
    }
    
    // Limitar el tamaño del archivo (max 1MB)
    if (stats.size > 1024 * 1024) {
      throw new Error('El archivo es demasiado grande (max 1MB)');
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content;
  }
  
  async writeFile(filePath, content) {
    const fullPath = path.resolve(this.basePath, filePath);
    
    if (!this.isPathAllowed(fullPath)) {
      throw new Error('Ruta no permitida');
    }
    
    // Crear directorio si no existe
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    return { success: true, path: filePath };
  }
  
  async deleteFile(filePath) {
    const fullPath = path.resolve(this.basePath, filePath);
    
    if (!this.isPathAllowed(fullPath)) {
      throw new Error('Ruta no permitida');
    }
    
    if (!fs.existsSync(fullPath)) {
      throw new Error('Archivo no encontrado');
    }
    
    fs.unlinkSync(fullPath);
    return { success: true };
  }
  
  isPathAllowed(targetPath) {
    // Solo permitir rutas dentro del directorio base
    const resolvedBase = path.resolve(this.basePath);
    const resolvedTarget = path.resolve(targetPath);
    
    return resolvedTarget.startsWith(resolvedBase);
  }
  
  getSupportedExtensions() {
    return ['.txt', '.md', '.json', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml', '.log', '.csv'];
  }
}
