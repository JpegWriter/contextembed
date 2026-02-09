/**
 * Folder Export Target
 * Exports files directly to a local folder (e.g., Lightroom watched folder)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { nanoid } from 'nanoid';
import {
  AdvancedExportOptions,
  PresetExportRequest,
  ExportResult,
  PresetExportedFile,
  ExportProgress,
  mergeExportOptions,
  EXPORT_PRESETS,
} from '@contextembed/core';
import { ExifToolWriter, createExifToolWriter } from '@contextembed/metadata';
import { processFileForExport, generateExportManifest } from './export-processor';

export interface FolderExportConfig {
  basePath: string;              // Base output folder
  createSubfolders?: boolean;    // Create date/event subfolders
  overwriteExisting?: boolean;   // Overwrite existing files
}

/**
 * Folder Export Target - writes files directly to filesystem
 */
export class FolderExportTarget {
  private config: FolderExportConfig;
  private metadataWriter: ExifToolWriter;
  private progressCallbacks: Map<string, (progress: ExportProgress) => void> = new Map();
  
  constructor(config: FolderExportConfig) {
    this.config = {
      createSubfolders: true,
      overwriteExisting: false,
      ...config,
    };
    this.metadataWriter = createExifToolWriter();
  }
  
  /**
   * Export files to folder
   */
  async export(request: PresetExportRequest): Promise<ExportResult> {
    const exportId = nanoid();
    const startTime = Date.now();
    
    // Merge preset options with any overrides
    const options: AdvancedExportOptions = request.presetId 
      ? mergeExportOptions(request.presetId, request.options)
      : { ...EXPORT_PRESETS['lightroom-ready'].options, ...request.options };
    
    // Determine output directory
    const outputDir = await this.prepareOutputDirectory(
      request.outputPath || this.config.basePath,
      request.projectId,
      options
    );
    
    const exportedFiles: PresetExportedFile[] = [];
    const totalFiles = request.files.length;
    let successCount = 0;
    let failCount = 0;
    
    // Process each file
    for (let i = 0; i < request.files.length; i++) {
      const file = request.files[i];
      
      // Report progress
      this.reportProgress(exportId, {
        exportId,
        status: 'processing',
        currentFile: i + 1,
        totalFiles,
        currentFilename: file.originalFilename,
        percentage: Math.round((i / totalFiles) * 100),
        estimatedRemainingMs: this.estimateRemainingTime(startTime, i, totalFiles),
      });
      
      try {
        const result = await processFileForExport({
          assetId: file.assetId,
          sourcePath: file.sourcePath,
          originalFilename: file.originalFilename,
          outputDir,
          metadata: file.metadata as any,
          options,
          sequence: i + 1,
        }, this.metadataWriter);
        
        if (result.success && result.file) {
          exportedFiles.push(result.file);
          successCount++;
        } else {
          exportedFiles.push({
            assetId: file.assetId,
            originalFilename: file.originalFilename,
            exportedFilename: '',
            exportedPath: '',
            format: options.format,
            sizeBytes: 0,
            success: false,
            error: result.error || 'Unknown error',
          });
          failCount++;
        }
      } catch (error) {
        exportedFiles.push({
          assetId: file.assetId,
          originalFilename: file.originalFilename,
          exportedFilename: '',
          exportedPath: '',
          format: options.format,
          sizeBytes: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failCount++;
      }
    }
    
    // Generate manifest if requested
    let manifestPath: string | undefined;
    if (options.includeManifest) {
      const manifest = generateExportManifest(
        request.projectId,
        exportedFiles,
        options,
        Date.now() - startTime
      );
      manifestPath = path.join(outputDir, 'manifest.json');
      await fs.writeFile(manifestPath, manifest, 'utf-8');
    }
    
    // Report completion
    this.reportProgress(exportId, {
      exportId,
      status: 'completed',
      currentFile: totalFiles,
      totalFiles,
      percentage: 100,
    });
    
    return {
      success: failCount === 0,
      exportId,
      totalFiles,
      successfulFiles: successCount,
      failedFiles: failCount,
      files: exportedFiles,
      outputPath: outputDir,
      manifestPath,
      durationMs: Date.now() - startTime,
    };
  }
  
  /**
   * Prepare output directory based on folder structure option
   */
  private async prepareOutputDirectory(
    basePath: string,
    projectId: string,
    options: AdvancedExportOptions
  ): Promise<string> {
    let outputDir = basePath;
    
    if (this.config.createSubfolders) {
      switch (options.folderStructure) {
        case 'by-date': {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          outputDir = path.join(basePath, String(year), month, day);
          break;
        }
        
        case 'by-project':
          outputDir = path.join(basePath, projectId);
          break;
          
        case 'by-event':
          // Use project ID as event identifier for now
          outputDir = path.join(basePath, projectId);
          break;
          
        case 'flat':
        default:
          // Use base path as-is
          break;
      }
    }
    
    // Ensure directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    return outputDir;
  }
  
  /**
   * Register progress callback
   */
  onProgress(exportId: string, callback: (progress: ExportProgress) => void): void {
    this.progressCallbacks.set(exportId, callback);
  }
  
  /**
   * Remove progress callback
   */
  offProgress(exportId: string): void {
    this.progressCallbacks.delete(exportId);
  }
  
  /**
   * Report progress to registered callback
   */
  private reportProgress(exportId: string, progress: ExportProgress): void {
    const callback = this.progressCallbacks.get(exportId);
    if (callback) {
      callback(progress);
    }
  }
  
  /**
   * Estimate remaining time based on progress
   */
  private estimateRemainingTime(
    startTime: number, 
    processedCount: number, 
    totalCount: number
  ): number | undefined {
    if (processedCount === 0) return undefined;
    
    const elapsed = Date.now() - startTime;
    const avgPerFile = elapsed / processedCount;
    const remaining = totalCount - processedCount;
    
    return Math.round(avgPerFile * remaining);
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      // Check if base path is accessible
      await fs.access(this.config.basePath);
      
      // Check metadata writer
      const writerHealth = await this.metadataWriter.healthCheck();
      if (!writerHealth.healthy) {
        return { healthy: false, error: `Metadata writer: ${writerHealth.error}` };
      }
      
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Path not accessible',
      };
    }
  }
  
  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    await this.metadataWriter.close();
    this.progressCallbacks.clear();
  }
}

/**
 * Create a folder export target
 */
export function createFolderExportTarget(config: FolderExportConfig): FolderExportTarget {
  return new FolderExportTarget(config);
}
