/**
 * Export Target Interface
 * Abstracts export destinations (download, folder, cloud)
 */

export interface ExportTargetConfig {
  type: 'download' | 'folder' | 'cloud';
  basePath?: string;
  cloudProvider?: 'dropbox' | 'google-drive' | 'onedrive' | 's3';
  credentials?: Record<string, string>;
}

export interface ExportRequest {
  files: ExportFile[];
  options?: ExportOptions;
}

export interface ExportFile {
  sourcePath: string;
  filename: string;
  mimeType: string;
  size: number;
  metadata?: Record<string, unknown>;
}

export interface ExportOptions {
  format?: 'zip' | 'individual';
  zipFilename?: string;
  subfolder?: string;
  overwrite?: boolean;
  includeManifest?: boolean;
}

export interface ExportResponse {
  success: boolean;
  exported: ExportedFile[];
  failed: FailedExport[];
  totalSize: number;
  outputPath?: string;
  downloadUrl?: string;
  expiresAt?: Date;
}

export interface ExportedFile {
  filename: string;
  path: string;
  size: number;
  url?: string;
}

export interface FailedExport {
  filename: string;
  reason: string;
}

/**
 * Export Target interface
 * Implement for different export destinations
 */
export interface IExportTarget {
  readonly targetId: string;
  readonly type: 'download' | 'folder' | 'cloud';
  
  /**
   * Export files to the target
   */
  export(request: ExportRequest): Promise<ExportResponse>;
  
  /**
   * Check if the target is accessible
   */
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;
  
  /**
   * Get remaining storage capacity (if applicable)
   */
  getCapacity?(): Promise<{ used: number; available: number; total: number }>;
}

/**
 * Download Target (web - creates ZIP for download)
 */
export interface IDownloadTarget extends IExportTarget {
  readonly type: 'download';
  
  /**
   * Create a ZIP file and return download URL
   */
  createZip(files: ExportFile[]): Promise<{ path: string; url: string; expiresAt: Date }>;
}

/**
 * Folder Target (desktop - writes to local folder)
 */
export interface IFolderTarget extends IExportTarget {
  readonly type: 'folder';
  
  /**
   * Set the output folder
   */
  setFolder(path: string): void;
  
  /**
   * Get the current output folder
   */
  getFolder(): string;
}

/**
 * Cloud Target (future - writes to cloud storage)
 */
export interface ICloudTarget extends IExportTarget {
  readonly type: 'cloud';
  
  /**
   * Authenticate with the cloud provider
   */
  authenticate(): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Check authentication status
   */
  isAuthenticated(): boolean;
}

/**
 * Factory function type for creating export targets
 */
export type ExportTargetFactory = (config: ExportTargetConfig) => IExportTarget;
