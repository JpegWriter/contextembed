/**
 * Metadata Writer Interface
 * Abstracts metadata embedding (ExifTool, etc.)
 */

import { SynthesizedMetadata } from '../types/domain';
import { FieldMismatch } from '../types/pipeline';

export interface MetadataWriterConfig {
  exiftoolPath?: string;
  preserveOriginal?: boolean;
  outputSuffix?: string;
  timeout?: number;
}

export interface WriteRequest {
  sourcePath: string;
  outputPath?: string;
  metadata: SynthesizedMetadata;
  options?: WriteOptions;
}

export interface WriteOptions {
  overwrite?: boolean;
  preserveOriginal?: boolean;
  includeXmp?: boolean;
  includeIptc?: boolean;
  includeExif?: boolean;
}

export interface WriteResponse {
  success: boolean;
  outputPath?: string;
  fieldsWritten: string[];
  fieldsSkipped: string[];
  warnings: string[];
  logs: string;
  error?: WriteError;
  timing: {
    startedAt: Date;
    completedAt: Date;
    durationMs: number;
  };
}

export interface WriteError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ReadRequest {
  filePath: string;
  fields?: string[];
}

export interface ReadResponse {
  success: boolean;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface VerifyRequest {
  filePath: string;
  expectedMetadata: SynthesizedMetadata;
}

export interface VerifyResponse {
  success: boolean;
  verified: boolean;
  matches: FieldMatch[];
  mismatches: FieldMismatch[];
  missing: string[];
}

export interface FieldMatch {
  field: string;
  expected: string | string[];
  actual: string | string[];
}

/**
 * Metadata Writer interface
 * Implement for server-side ExifTool (web) or local ExifTool (desktop)
 */
export interface IMetadataWriter {
  readonly writerId: string;
  
  /**
   * Write metadata to an image file
   */
  write(request: WriteRequest): Promise<WriteResponse>;
  
  /**
   * Read metadata from an image file
   */
  read(request: ReadRequest): Promise<ReadResponse>;
  
  /**
   * Verify that expected metadata was written correctly
   */
  verify(request: VerifyRequest): Promise<VerifyResponse>;
  
  /**
   * Check if the writer is properly configured (ExifTool available)
   */
  healthCheck(): Promise<{ healthy: boolean; version?: string; error?: string }>;
}

/**
 * Factory function type for creating metadata writers
 */
export type MetadataWriterFactory = (config: MetadataWriterConfig) => IMetadataWriter;
