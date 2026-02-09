/**
 * Export routes
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { 
  projectRepository, 
  assetRepository,
  exportRepository,
  embedResultRepository,
  metadataResultRepository,
} from '@contextembed/db';
import { 
  EXPORT_PRESETS,
  mergeExportOptions,
  ExportPresetId,
  AdvancedExportOptions,
} from '@contextembed/core';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { createFolderExportTarget } from '../services/folder-export';
import { processFileForExport, generateExportManifest } from '../services/export-processor';
import { createExifToolWriter } from '@contextembed/metadata';

export const exportsRouter: IRouter = Router();

const EXPORT_DIR = process.env.STORAGE_LOCAL_PATH 
  ? path.join(process.env.STORAGE_LOCAL_PATH, 'exports')
  : './uploads/exports';

// Ensure export directory exists
fs.mkdirSync(EXPORT_DIR, { recursive: true });

// Progress tracking for SSE
interface ExportProgress {
  exportId: string;
  status: 'processing' | 'completed' | 'failed';
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  stage: 'preparing' | 'converting' | 'embedding' | 'packaging' | 'done';
  message: string;
}

const exportProgressMap = new Map<string, ExportProgress>();
const progressSubscribers = new Map<string, Set<(progress: ExportProgress) => void>>();

function emitProgress(exportId: string, progress: Partial<ExportProgress>) {
  const current = exportProgressMap.get(exportId) || {
    exportId,
    status: 'processing',
    currentFile: 0,
    totalFiles: 0,
    currentFileName: '',
    stage: 'preparing',
    message: '',
  };
  
  const updated = { ...current, ...progress };
  exportProgressMap.set(exportId, updated);
  
  const subscribers = progressSubscribers.get(exportId);
  if (subscribers) {
    subscribers.forEach(callback => callback(updated));
  }
}

/**
 * GET /exports/:id/progress - Server-Sent Events for export progress
 */
exportsRouter.get('/:id/progress', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  
  // Send initial progress
  const initialProgress = exportProgressMap.get(id) || {
    exportId: id,
    status: 'processing',
    currentFile: 0,
    totalFiles: 0,
    currentFileName: '',
    stage: 'preparing',
    message: 'Initializing export...',
  };
  
  res.write(`data: ${JSON.stringify(initialProgress)}\n\n`);
  
  // Subscribe to updates
  const callback = (progress: ExportProgress) => {
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
    
    if (progress.status === 'completed' || progress.status === 'failed') {
      // Clean up after completion
      setTimeout(() => {
        exportProgressMap.delete(id);
        progressSubscribers.delete(id);
      }, 5000);
    }
  };
  
  if (!progressSubscribers.has(id)) {
    progressSubscribers.set(id, new Set());
  }
  progressSubscribers.get(id)!.add(callback);
  
  // Cleanup on client disconnect
  req.on('close', () => {
    const subscribers = progressSubscribers.get(id);
    if (subscribers) {
      subscribers.delete(callback);
    }
  });
}));

/**
 * GET /exports/presets - List available export presets
 */
exportsRouter.get('/presets', asyncHandler(async (req, res) => {
  const presets = Object.values(EXPORT_PRESETS).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    icon: p.icon,
    tags: p.tags,
    options: p.options,
  }));
  
  res.json({ presets });
}));

/**
 * List exports for a project
 */
exportsRouter.get('/project/:projectId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const exports = await exportRepository.findByProject(projectId);
  
  res.json({
    exports: exports.map(e => ({
      id: e.id,
      destinationType: e.destinationType,
      status: e.status,
      outputPath: e.outputPath,
      error: e.error,
      createdAt: e.createdAt,
      completedAt: e.completedAt,
    })),
  });
}));

/**
 * Create export (generate ZIP of embedded files)
 */
exportsRouter.post('/', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const ExportSchema = z.object({
    projectId: z.string(),
    assetIds: z.array(z.string()).min(1).max(100),
  });
  
  const { projectId, assetIds } = ExportSchema.parse(req.body);
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  // Get assets with embed results
  const assets = await Promise.all(
    assetIds.map(id => assetRepository.findByIdWithResults(id))
  );
  
  // Filter to only completed/approved assets
  const completedAssets = assets.filter(a => 
    a && (a.status === 'completed' || a.status === 'approved')
  );
  
  if (completedAssets.length === 0) {
    throw createApiError('No completed assets to export', 400);
  }
  
  // Log which assets have embed results
  console.log(`Export: ${completedAssets.length} assets, ${completedAssets.filter(a => a!.embedResults.length > 0).length} with embed results`);
  
  // Create export record
  const exportRecord = await exportRepository.create({
    projectId,
    destinationType: 'download',
    assetIds: completedAssets.map(a => a!.id),
  });
  
  // Update status to processing
  await exportRepository.update(exportRecord.id, {
    status: 'processing',
  });
  
  try {
    // Generate ZIP file
    const zipFilename = `export_${exportRecord.id}.zip`;
    const zipPath = path.join(EXPORT_DIR, zipFilename);
    
    // Pre-fetch metadata for smart filenames
    const assetMetadata = new Map<string, { headline?: string; title?: string }>();
    for (const asset of completedAssets) {
      if (!asset) continue;
      const metadataResult = await metadataResultRepository.findLatestByAsset(asset.id);
      if (metadataResult?.result) {
        assetMetadata.set(asset.id, metadataResult.result as { headline?: string; title?: string });
      }
    }
    
    let filesAdded = 0;
    
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      
      for (const asset of completedAssets) {
        if (!asset) continue;
        
        const embedResult = asset.embedResults[0];
        console.log(`Asset ${asset.id}: embedResult=${!!embedResult}, path=${embedResult?.embeddedPath}`);
        
        // Use embedded file if available, otherwise use original
        if (embedResult && embedResult.embeddedPath && fs.existsSync(embedResult.embeddedPath)) {
          // Generate intelligent filename from metadata
          const metadata = assetMetadata.get(asset.id);
          
          let smartFilename = asset.originalFilename;
          if (metadata?.headline || metadata?.title) {
            const baseName = (metadata.headline || metadata.title || '')
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
              .slice(0, 60);
            const ext = path.extname(asset.originalFilename);
            if (baseName) {
              smartFilename = `${baseName}_embedded${ext}`;
            }
          } else {
            smartFilename = asset.originalFilename.replace(/\.[^.]+$/, '_embedded$&');
          }
          
          console.log(`Adding embedded file: ${embedResult.embeddedPath} as ${smartFilename}`);
          archive.file(embedResult.embeddedPath, { name: smartFilename });
          filesAdded++;
        } else if (asset.storagePath && fs.existsSync(asset.storagePath)) {
          // Fallback to original file (without embedded metadata)
          archive.file(asset.storagePath, { 
            name: asset.originalFilename
          });
          filesAdded++;
          console.log(`Warning: Asset ${asset.id} has no embed result or file missing, using original`);
        } else {
          console.log(`Warning: Asset ${asset.id} - no files found`);
        }
      }
      
      if (filesAdded === 0) {
        reject(new Error('No files to add to archive'));
        return;
      }
      
      archive.finalize();
    });
    
    // Update export record
    await exportRepository.update(exportRecord.id, {
      status: 'completed',
      outputPath: zipPath,
      completedAt: new Date(),
    });
    
    res.status(201).json({
      export: {
        id: exportRecord.id,
        status: 'completed',
        outputPath: zipPath,
        downloadUrl: `/exports/${exportRecord.id}/download`,
        assetCount: completedAssets.length,
      },
    });
    
  } catch (error) {
    await exportRepository.update(exportRecord.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Export failed',
      completedAt: new Date(),
    });
    
    throw createApiError('Export failed', 500);
  }
}));

/**
 * Download export ZIP
 * Supports both auth header and token query param for direct browser downloads
 */
exportsRouter.get('/:id/download', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { token } = req.query;
  
  const exportRecord = await exportRepository.findById(id);
  
  if (!exportRecord) {
    throw createApiError('Export not found', 404);
  }
  
  // Verify ownership - either via auth header or token
  const project = await projectRepository.findById(exportRecord.projectId);
  if (!project) {
    throw createApiError('Export not found', 404);
  }
  
  // Check auth: either Authorization header or token query param
  const authUserId = (req as AuthenticatedRequest).userId;
  const isOwner = authUserId && project.userId === authUserId;
  
  // Simple token validation: token = exportId (for now, in production use signed tokens)
  const isValidToken = token === id;
  
  if (!isOwner && !isValidToken) {
    throw createApiError('Unauthorized', 401);
  }
  
  if (exportRecord.status !== 'completed' || !exportRecord.outputPath) {
    throw createApiError('Export not ready', 400);
  }
  
  if (!fs.existsSync(exportRecord.outputPath)) {
    throw createApiError('Export file not found', 404);
  }
  
  res.download(exportRecord.outputPath, `contextembed_export_${id}.zip`);
}));

/**
 * POST /exports/advanced - Create export with preset and options
 * World-class export with format conversion, XMP sidecars, and quality settings
 */
exportsRouter.post('/advanced', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const AdvancedExportSchema = z.object({
    projectId: z.string(),
    assetIds: z.array(z.string()).min(1).max(500),
    preset: z.enum([
      'lightroom-ready', 
      'web-optimized', 
      'archive-quality', 
      'social-media', 
      'client-delivery', 
      'custom'
    ]).default('lightroom-ready'),
    options: z.object({
      format: z.enum(['original', 'jpeg', 'tiff', 'png']).optional(),
      colorProfile: z.enum(['sRGB', 'AdobeRGB', 'ProPhotoRGB', 'original']).optional(),
      jpegQuality: z.number().min(1).max(100).optional(),
      preserveResolution: z.boolean().optional(),
      maxDimension: z.number().min(100).max(10000).optional(),
      metadataMethod: z.enum(['embed', 'sidecar', 'both']).optional(),
      includeXmpSidecars: z.boolean().optional(),
      outputNaming: z.enum(['original', 'headline', 'title', 'date-title', 'sequence', 'custom']).optional(),
      folderStructure: z.enum(['flat', 'by-date', 'by-event', 'by-project', 'custom']).optional(),
      includeManifest: z.boolean().optional(),
      zipOutput: z.boolean().optional(),
    }).optional(),
  });
  
  const body = AdvancedExportSchema.parse(req.body);
  const { projectId, assetIds, preset, options: optionOverrides } = body;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  // Get preset and merge with overrides
  const exportOptions = mergeExportOptions(
    preset as ExportPresetId,
    optionOverrides ? {
      format: optionOverrides.format,
      colorProfile: optionOverrides.colorProfile,
      jpegOptions: optionOverrides.jpegQuality ? {
        quality: optionOverrides.jpegQuality,
        progressive: true,
        chromaSubsampling: optionOverrides.jpegQuality >= 95 ? '4:4:4' : '4:2:2',
      } : undefined,
      preserveResolution: optionOverrides.preserveResolution,
      maxDimension: optionOverrides.maxDimension,
      metadataMethod: optionOverrides.metadataMethod,
      includeXmpSidecars: optionOverrides.includeXmpSidecars,
      outputNaming: optionOverrides.outputNaming,
      folderStructure: optionOverrides.folderStructure,
      includeManifest: optionOverrides.includeManifest,
      zipOutput: optionOverrides.zipOutput,
    } : undefined
  );
  
  // Get assets with results
  const assets = await Promise.all(
    assetIds.map(id => assetRepository.findByIdWithResults(id))
  );
  
  const completedAssets = assets.filter(a => 
    a && (a.status === 'completed' || a.status === 'approved')
  );
  
  if (completedAssets.length === 0) {
    throw createApiError('No completed assets to export', 400);
  }
  
  // Create export record
  const exportRecord = await exportRepository.create({
    projectId,
    destinationType: 'download',
    assetIds: completedAssets.map(a => a!.id),
  });
  
  await exportRepository.update(exportRecord.id, { status: 'processing' });
  
  const startTime = Date.now();
  const metadataWriter = createExifToolWriter();
  
  // Initialize progress tracking
  emitProgress(exportRecord.id, {
    status: 'processing',
    totalFiles: completedAssets.length,
    stage: 'preparing',
    message: `Preparing export of ${completedAssets.length} files...`,
  });
  
  try {
    // Create temp export folder
    const exportFolder = path.join(EXPORT_DIR, exportRecord.id);
    await fs.promises.mkdir(exportFolder, { recursive: true });
    
    const exportedFiles: any[] = [];
    let successCount = 0;
    let failCount = 0;
    
    // Process each asset
    for (let i = 0; i < completedAssets.length; i++) {
      const asset = completedAssets[i]!;
      
      // Emit progress
      emitProgress(exportRecord.id, {
        currentFile: i + 1,
        currentFileName: asset.originalFilename,
        stage: 'converting',
        message: `Processing ${asset.originalFilename} (${i + 1}/${completedAssets.length})`,
      });
      
      // Get latest metadata
      const metadataResult = await metadataResultRepository.findLatestByAsset(asset.id);
      const metadata = metadataResult?.result || {};
      
      // Determine source file (embedded if available, otherwise original)
      const embedResult = asset.embedResults[0];
      const sourcePath = embedResult?.embeddedPath && fs.existsSync(embedResult.embeddedPath)
        ? embedResult.embeddedPath
        : asset.storagePath;
      
      if (!sourcePath || !fs.existsSync(sourcePath)) {
        exportedFiles.push({
          assetId: asset.id,
          originalFilename: asset.originalFilename,
          success: false,
          error: 'Source file not found',
        });
        failCount++;
        continue;
      }
      
      try {
        // Update progress for embedding stage
        emitProgress(exportRecord.id, {
          stage: 'embedding',
          message: `Embedding metadata in ${asset.originalFilename}`,
        });
        
        const result = await processFileForExport({
          assetId: asset.id,
          sourcePath,
          originalFilename: asset.originalFilename,
          outputDir: exportFolder,
          metadata: metadata as any,
          options: exportOptions,
          sequence: i + 1,
        }, metadataWriter);
        
        if (result.success && result.file) {
          exportedFiles.push(result.file);
          successCount++;
        } else {
          exportedFiles.push({
            assetId: asset.id,
            originalFilename: asset.originalFilename,
            success: false,
            error: result.error,
          });
          failCount++;
        }
      } catch (error) {
        exportedFiles.push({
          assetId: asset.id,
          originalFilename: asset.originalFilename,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failCount++;
      }
    }
    
    // Generate manifest if requested
    if (exportOptions.includeManifest) {
      emitProgress(exportRecord.id, {
        stage: 'packaging',
        message: 'Generating export manifest...',
      });
      
      const manifest = generateExportManifest(
        projectId,
        exportedFiles,
        exportOptions,
        Date.now() - startTime
      );
      await fs.promises.writeFile(
        path.join(exportFolder, 'manifest.json'),
        manifest,
        'utf-8'
      );
    }
    
    // Create ZIP if requested
    let outputPath = exportFolder;
    if (exportOptions.zipOutput) {
      emitProgress(exportRecord.id, {
        stage: 'packaging',
        message: 'Creating ZIP archive...',
      });
      
      const zipPath = path.join(EXPORT_DIR, `${exportRecord.id}.zip`);
      
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(exportFolder, false);
        archive.finalize();
      });
      
      // Clean up folder after zipping
      await fs.promises.rm(exportFolder, { recursive: true, force: true });
      outputPath = zipPath;
    }
    
    await metadataWriter.close();
    
    // Emit completion
    emitProgress(exportRecord.id, {
      status: 'completed',
      stage: 'done',
      message: `Export complete! ${successCount} files exported successfully.`,
    });
    
    // Update export record
    await exportRepository.update(exportRecord.id, {
      status: 'completed',
      outputPath,
      completedAt: new Date(),
    });
    
    res.status(201).json({
      export: {
        id: exportRecord.id,
        status: 'completed',
        preset,
        format: exportOptions.format,
        outputPath,
        downloadUrl: exportOptions.zipOutput 
          ? `/exports/${exportRecord.id}/download`
          : null,
        totalFiles: completedAssets.length,
        successfulFiles: successCount,
        failedFiles: failCount,
        durationMs: Date.now() - startTime,
        files: exportedFiles,
      },
    });
    
  } catch (error) {
    await metadataWriter.close();
    
    // Emit failure progress
    emitProgress(exportRecord.id, {
      status: 'failed',
      stage: 'done',
      message: error instanceof Error ? error.message : 'Export failed',
    });
    
    await exportRepository.update(exportRecord.id, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Export failed',
      completedAt: new Date(),
    });
    
    throw createApiError('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
  }
}));
