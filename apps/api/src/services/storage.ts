/**
 * Storage Service
 * Handles file storage operations
 * 
 * Architecture:
 * - Local storage: Temporary processing (TTL 1 hour)
 * - Supabase Storage: Thumbnails (persistent, public)
 * - User download: Embedded files returned directly
 * 
 * HD originals are NOT persisted - users keep their own files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { 
  initSupabaseStorage, 
  uploadThumbnail, 
  deleteThumbnail,
  isStorageAvailable,
  cleanupOldExports,
  uploadEmbeddedFile,
  downloadEmbeddedFile,
} from './supabase-storage';

// Temp storage for processing (Railway ephemeral is fine)
const TEMP_STORAGE_PATH = process.env.STORAGE_LOCAL_PATH || './uploads';

// How long to keep temp files (1 hour)
const TEMP_FILE_TTL_MS = 60 * 60 * 1000;

// Cleanup interval (every 15 minutes)
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Local file storage implementation
 * Used for temporary processing files only
 */
export class LocalStorage {
  private basePath: string;
  
  constructor(basePath?: string) {
    this.basePath = basePath || TEMP_STORAGE_PATH;
  }
  
  async init(): Promise<void> {
    await fs.mkdir(this.basePath, { recursive: true });
  }
  
  async get(key: string): Promise<Buffer | null> {
    const fullPath = path.join(this.basePath, key);
    
    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  async put(key: string, data: Buffer): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, data);
    
    return fullPath;
  }
  
  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.basePath, key);
    
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }
  
  async exists(key: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, key);
    
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
  
  async copy(sourceKey: string, destKey: string): Promise<void> {
    const sourcePath = path.join(this.basePath, sourceKey);
    const destPath = path.join(this.basePath, destKey);
    const destDir = path.dirname(destPath);
    
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(sourcePath, destPath);
  }
  
  async move(sourceKey: string, destKey: string): Promise<void> {
    const sourcePath = path.join(this.basePath, sourceKey);
    const destPath = path.join(this.basePath, destKey);
    const destDir = path.dirname(destPath);
    
    await fs.mkdir(destDir, { recursive: true });
    await fs.rename(sourcePath, destPath);
  }
  
  async list(prefix: string): Promise<string[]> {
    const fullPath = path.join(this.basePath, prefix);
    
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map(e => path.join(prefix, e.name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  async getSize(key: string): Promise<number | null> {
    const fullPath = path.join(this.basePath, key);
    
    try {
      const stats = await fs.stat(fullPath);
      return stats.size;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
  
  getFullPath(key: string): string {
    return path.join(this.basePath, key);
  }
  
  async streamTo(key: string, destination: string): Promise<void> {
    const sourcePath = path.join(this.basePath, key);
    const destDir = path.dirname(destination);
    
    await fs.mkdir(destDir, { recursive: true });
    
    const source = createReadStream(sourcePath);
    const dest = createWriteStream(destination);
    
    await pipeline(source, dest);
  }
  
  async cleanup(olderThanMs: number): Promise<number> {
    const now = Date.now();
    let deleted = 0;
    
    async function cleanDir(dirPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isDirectory()) {
            await cleanDir(fullPath);
          } else {
            const stats = await fs.stat(fullPath);
            if (now - stats.mtimeMs > olderThanMs) {
              await fs.unlink(fullPath);
              deleted++;
            }
          }
        }
        
        // Try to remove empty directories
        const remaining = await fs.readdir(dirPath);
        if (remaining.length === 0) {
          await fs.rmdir(dirPath);
        }
      } catch {
        // Ignore errors during cleanup
      }
    }
    
    await cleanDir(this.basePath);
    return deleted;
  }
}

// Singleton instance
let storageInstance: LocalStorage | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

export function getStorage(): LocalStorage {
  if (!storageInstance) {
    storageInstance = new LocalStorage();
  }
  return storageInstance;
}

/**
 * Initialize all storage (local + Supabase)
 */
export async function initStorage(): Promise<void> {
  const storage = getStorage();
  await storage.init();
  
  // Initialize Supabase Storage buckets
  try {
    await initSupabaseStorage();
  } catch (error) {
    console.warn('⚠️ Supabase Storage not available, using local only:', error);
  }
  
  // Start automatic cleanup of temp files
  startCleanupScheduler();
}

/**
 * Start automatic cleanup of temp files
 */
function startCleanupScheduler(): void {
  if (cleanupInterval) return;
  
  cleanupInterval = setInterval(async () => {
    try {
      const storage = getStorage();
      const localDeleted = await storage.cleanup(TEMP_FILE_TTL_MS);
      
      if (localDeleted > 0) {
        console.log(`🧹 Cleaned up ${localDeleted} temp files`);
      }
      
      // Also cleanup old Supabase exports
      if (await isStorageAvailable()) {
        const exportsDeleted = await cleanupOldExports(24); // 24 hour TTL
        if (exportsDeleted > 0) {
          console.log(`🧹 Cleaned up ${exportsDeleted} old exports from Supabase`);
        }
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, CLEANUP_INTERVAL_MS);
  
  console.log('🧹 Cleanup scheduler started (every 15 min)');
}

/**
 * Stop cleanup scheduler
 */
export function stopCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

// Re-export Supabase storage functions
export { 
  uploadThumbnail, 
  deleteThumbnail, 
  isStorageAvailable,
  getThumbnailUrl,
  uploadExport,
  deleteExport,
  uploadEmbeddedFile,
  downloadEmbeddedFile,
} from './supabase-storage';
