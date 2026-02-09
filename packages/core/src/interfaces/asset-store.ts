/**
 * Asset Store Interface
 * Abstracts file storage (local, S3, Supabase Storage)
 */

export interface AssetStoreConfig {
  provider: 'local' | 'supabase' | 's3';
  basePath?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKey?: string;
  secretKey?: string;
}

export interface StoreRequest {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder?: string;
  metadata?: Record<string, string>;
}

export interface StoreResponse {
  success: boolean;
  path?: string;
  url?: string;
  size?: number;
  error?: string;
}

export interface RetrieveRequest {
  path: string;
}

export interface RetrieveResponse {
  success: boolean;
  buffer?: Buffer;
  mimeType?: string;
  size?: number;
  error?: string;
}

export interface DeleteRequest {
  path: string;
}

export interface DeleteResponse {
  success: boolean;
  error?: string;
}

export interface ListRequest {
  folder: string;
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface ListResponse {
  success: boolean;
  files?: StoredFileInfo[];
  cursor?: string;
  hasMore?: boolean;
  error?: string;
}

export interface StoredFileInfo {
  path: string;
  filename: string;
  size: number;
  mimeType?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CopyRequest {
  sourcePath: string;
  destinationPath: string;
}

export interface CopyResponse {
  success: boolean;
  path?: string;
  error?: string;
}

export interface GetUrlRequest {
  path: string;
  expiresIn?: number; // seconds
}

export interface GetUrlResponse {
  success: boolean;
  url?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Asset Store interface
 * Implement for different storage backends
 */
export interface IAssetStore {
  readonly storeId: string;
  readonly provider: string;
  
  /**
   * Store a file
   */
  store(request: StoreRequest): Promise<StoreResponse>;
  
  /**
   * Retrieve a file
   */
  retrieve(request: RetrieveRequest): Promise<RetrieveResponse>;
  
  /**
   * Delete a file
   */
  delete(request: DeleteRequest): Promise<DeleteResponse>;
  
  /**
   * List files in a folder
   */
  list(request: ListRequest): Promise<ListResponse>;
  
  /**
   * Copy a file
   */
  copy(request: CopyRequest): Promise<CopyResponse>;
  
  /**
   * Get a URL for a file (public or signed)
   */
  getUrl(request: GetUrlRequest): Promise<GetUrlResponse>;
  
  /**
   * Check if the store is accessible
   */
  healthCheck(): Promise<{ healthy: boolean; error?: string }>;
}

/**
 * Factory function type for creating asset stores
 */
export type AssetStoreFactory = (config: AssetStoreConfig) => IAssetStore;
