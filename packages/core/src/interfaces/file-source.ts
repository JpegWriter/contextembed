/**
 * File Source Interface
 * Abstracts file input (web upload, desktop folder, etc.)
 */

export interface FileInfo {
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  buffer?: Buffer;
  path?: string;
  stream?: NodeJS.ReadableStream;
}

export interface FileSourceConfig {
  type: 'web-upload' | 'desktop-folder' | 'url';
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  basePath?: string;
}

export interface ImportRequest {
  files?: FileInfo[];
  paths?: string[];
  urls?: string[];
}

export interface ImportResponse {
  success: boolean;
  imported: ImportedFile[];
  failed: FailedImport[];
  totalSize: number;
}

export interface ImportedFile {
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  tempPath: string;
  hash?: string;
}

export interface FailedImport {
  filename: string;
  reason: string;
}

export interface WatchConfig {
  folderPath: string;
  recursive?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  debounceMs?: number;
}

export interface WatchEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  filename: string;
  stats?: {
    size: number;
    mtime: Date;
  };
}

export type WatchCallback = (event: WatchEvent) => void;

/**
 * File Source interface
 * Implement for web upload (immediate) or desktop folder watching
 */
export interface IFileSource {
  readonly sourceId: string;
  readonly type: 'web-upload' | 'desktop-folder' | 'url';
  
  /**
   * Import files from the source
   */
  import(request: ImportRequest): Promise<ImportResponse>;
  
  /**
   * Validate a file before import
   */
  validate(file: FileInfo): { valid: boolean; error?: string };
  
  /**
   * Start watching a folder (desktop only)
   */
  watch?(config: WatchConfig, callback: WatchCallback): { stop: () => void };
  
  /**
   * Get list of files in watched folder (desktop only)
   */
  listFolder?(folderPath: string): Promise<FileInfo[]>;
}

/**
 * Web Upload File Source (implemented in web app)
 */
export interface IWebUploadSource extends IFileSource {
  readonly type: 'web-upload';
}

/**
 * Desktop Folder Source (implemented in Electron app)
 */
export interface IDesktopFolderSource extends IFileSource {
  readonly type: 'desktop-folder';
  watch(config: WatchConfig, callback: WatchCallback): { stop: () => void };
  listFolder(folderPath: string): Promise<FileInfo[]>;
}

/**
 * Factory function type for creating file sources
 */
export type FileSourceFactory = (config: FileSourceConfig) => IFileSource;
