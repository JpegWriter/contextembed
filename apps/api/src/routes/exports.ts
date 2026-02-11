/**
 * Export routes
 * 
 * Endpoint: POST /exports — Basic export (ZIP of embedded files)
 * Endpoint: POST /exports/advanced — Advanced export with presets
 * Endpoint: GET /exports/:id/download — Download export ZIP
 * 
 * Memory-hardened: streaming ZIP, sequential processing, global concurrency lock.
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
  onboardingProfileRepository,
  userProfileRepository,
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
import { downloadEmbeddedFile, isStorageAvailable, uploadExport, getSignedExportUrl } from '../services/supabase-storage';
import {
  acquireExportLock,
  releaseExportLock,
  checkUserRateLimit,
  recordUserExport,
  logMemory,
  safeUnlink,
  safeRmDir,
  checkExportLimits,
} from '../services/export-lock';
import {
  generateWebVariant,
  resolveCaption,
  resolveCredit,
  type WebVariantOptions,
} from '../services/web-preview-generator';
import { assertEntitledOrThrow, recordSuccessfulAction } from '../services/entitlements';

export const exportsRouter: IRouter = Router();

const EXPORT_DIR = process.env.STORAGE_LOCAL_PATH 
  ? path.join(process.env.STORAGE_LOCAL_PATH, 'exports')
  : './uploads/exports';

// Ensure export directory exists
fs.mkdirSync(EXPORT_DIR, { recursive: true });

/**
 * Resolve the embedded file path — local first, then download from Supabase if needed
 */
async function resolveEmbeddedFilePath(
  embedResult: { embeddedPath: string; embeddedStorageUrl?: string | null },
  projectId: string,
  assetId: string,
): Promise<string | null> {
  // 1. Try local file first
  if (embedResult.embeddedPath && fs.existsSync(embedResult.embeddedPath)) {
    return embedResult.embeddedPath;
  }
  
  // 2. Try downloading from Supabase
  if (embedResult.embeddedStorageUrl) {
    try {
      // Create a local temp path for the downloaded file
      const ext = path.extname(embedResult.embeddedPath) || '.jpg';
      const localPath = path.join(EXPORT_DIR, 'cache', projectId, `${assetId}${ext}`);
      
      const downloaded = await downloadEmbeddedFile(embedResult.embeddedStorageUrl, localPath);
      if (downloaded) {
        console.log(`☁️ Downloaded embedded file from Supabase: ${assetId}`);
        return localPath;
      }
    } catch (err) {
      console.warn(`Failed to download embedded file for ${assetId}:`, err);
    }
  }
  
  return null;
}

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
 * Memory-hardened: global lock, sequential processing, streaming ZIP.
 */
exportsRouter.post('/', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const requestId = (req as any).id || `exp-${Date.now()}`;
  
  const ExportSchema = z.object({
    projectId: z.string(),
    assetIds: z.array(z.string()).min(1).max(200),
  });
  
  const { projectId, assetIds } = ExportSchema.parse(req.body);
  
  // ── Pre-flight checks ──
  
  // Check asset count limit
  const limitCheck = checkExportLimits(assetIds.length);
  if (!limitCheck.allowed) {
    throw createApiError(limitCheck.reason!, 413);
  }
  
  // Per-user rate limit
  const rateCheck = checkUserRateLimit(userId);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', Math.ceil((rateCheck.retryAfterMs || 10000) / 1000));
    throw createApiError('Too many export requests. Please wait a moment.', 429);
  }
  
  // ── Acquire global export lock ──
  const lockResult = acquireExportLock();
  if (!lockResult.acquired) {
    res.setHeader('Retry-After', '10');
    res.status(429).json({
      error: 'EXPORT_BUSY',
      message: lockResult.reason,
      requestId,
    });
    return;
  }
  
  // Track temp files for cleanup
  const tempFiles: string[] = [];
  
  try {
    logMemory('export:start', { requestId, projectId, n: assetIds.length });
    recordUserExport(userId);
    
    // Verify project ownership
    const project = await projectRepository.findById(projectId);
    if (!project || project.userId !== userId) {
      throw createApiError('Project not found', 404);
    }
    
    // Get assets SEQUENTIALLY to avoid memory spike from parallel DB queries
    const assets: any[] = [];
    for (const id of assetIds) {
      const asset = await assetRepository.findByIdWithResults(id);
      if (asset) assets.push(asset);
    }
    
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
  
    // Generate ZIP file
    const zipFilename = `export_${exportRecord.id}.zip`;
    const zipPath = path.join(EXPORT_DIR, zipFilename);
    tempFiles.push(zipPath);
    
    // Pre-fetch metadata for smart filenames (sequential to avoid memory spike)
    const assetMetadata = new Map<string, { headline?: string; title?: string }>();
    for (const asset of completedAssets) {
      if (!asset) continue;
      const metadataResult = await metadataResultRepository.findLatestByAsset(asset.id);
      if (metadataResult?.result) {
        assetMetadata.set(asset.id, metadataResult.result as { headline?: string; title?: string });
      }
    }
    
    let filesAdded = 0;
    let processedCount = 0;
    
    await new Promise<void>(async (resolve, reject) => {
      try {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 6 } }); // level 6 = faster than 9, still good compression
        
        output.on('close', resolve);
        archive.on('error', reject);
        
        archive.pipe(output);
        
        // Process assets SEQUENTIALLY
        for (const asset of completedAssets) {
          if (!asset) continue;
          processedCount++;
          
          // Log memory every 5 assets
          if (processedCount % 5 === 0) {
            logMemory('export:progress', { requestId, processed: processedCount, total: completedAssets.length });
          }
          
          const embedResult = asset.embedResults[0];
          
          // Resolve embedded file (local or Supabase)
          let resolvedPath: string | null = null;
          if (embedResult) {
            resolvedPath = await resolveEmbeddedFilePath(embedResult, exportRecord.projectId, asset.id);
            if (resolvedPath && !resolvedPath.startsWith(EXPORT_DIR)) {
              // Track downloaded files for cleanup
              // (only if it's a temp download, not an existing local file)
            }
          }
          
          if (resolvedPath) {
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
          
          console.log(`Adding embedded file: ${resolvedPath} as ${smartFilename}`);
          archive.file(resolvedPath, { name: smartFilename });
          filesAdded++;
        } else if (asset.storagePath && fs.existsSync(asset.storagePath)) {
          // Fallback to original file (without embedded metadata)
          archive.file(asset.storagePath, { 
            name: asset.originalFilename
          });
          filesAdded++;
          console.log(`Warning: Asset ${asset.id} has no embed result or file missing, using original`);
        } else {
          console.log(`Warning: Asset ${asset.id} - no files found locally or in Supabase`);
        }
      }
      
        if (filesAdded === 0) {
          reject(new Error('No files to add to archive'));
          return;
        }
        
        archive.finalize();
      } catch (err) {
        reject(err);
      }
    });
    
    logMemory('export:zip-finalized', { requestId, filesAdded });
    
    // Upload ZIP to Supabase for persistent storage (Render has ephemeral disk)
    let supabaseStoragePath: string | null = null;
    try {
      const storageAvailable = await isStorageAvailable();
      if (storageAvailable) {
        const { url } = await uploadExport(zipPath, exportRecord.id, userId);
        supabaseStoragePath = `${userId}/${exportRecord.id}.zip`;
        console.log(`☁️ Export ZIP uploaded to Supabase: ${supabaseStoragePath}`);
        
        // Clean up local file — Supabase is the source of truth
        await safeUnlink(zipPath);
      }
    } catch (err) {
      console.warn('Failed to upload export to Supabase, keeping local copy:', err);
    }
    
    // Store Supabase path (prefixed) or local path
    const storedPath = supabaseStoragePath 
      ? `supabase:${supabaseStoragePath}` 
      : zipPath;
    
    // Update export record
    await exportRepository.update(exportRecord.id, {
      status: 'completed',
      outputPath: storedPath,
      completedAt: new Date(),
    });
    
    logMemory('export:complete', { requestId, filesAdded, storedPath: storedPath.substring(0, 20) + '...' });
    
    res.status(201).json({
      export: {
        id: exportRecord.id,
        status: 'completed',
        outputPath: storedPath,
        downloadUrl: `/exports/${exportRecord.id}/download`,
        assetCount: completedAssets.length,
      },
    });
    
  } catch (error) {
    // Clean up temp files on error
    for (const f of tempFiles) {
      await safeUnlink(f);
    }
    
    logMemory('export:error', { requestId, error: error instanceof Error ? error.message : 'Unknown' });
    
    throw createApiError('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
  } finally {
    // ALWAYS release the export lock
    releaseExportLock();
  }
}));

/**
 * Download export ZIP
 * Supports both auth header and token query param for direct browser downloads
 * 
 * Storage strategy:
 * - outputPath starting with "supabase:" → stored in Supabase Storage (persistent)
 * - outputPath without prefix → local file path (ephemeral on Render)
 * - Legacy exports with missing local files attempt Supabase rebuild
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
  
  // ── Strategy A: Supabase-stored export (new exports) ──────────────
  if (exportRecord.outputPath.startsWith('supabase:')) {
    const storagePath = exportRecord.outputPath.replace('supabase:', '');
    console.log(`☁️ Serving export from Supabase: ${storagePath}`);
    
    const signedUrl = await getSignedExportUrl(storagePath);
    if (signedUrl) {
      // Set download filename header, then redirect to Supabase signed URL
      res.setHeader('Content-Disposition', `attachment; filename="contextembed_export_${id}.zip"`);
      return res.redirect(signedUrl);
    }
    
    // If signed URL fails, fall through to rebuild
    console.warn('⚠️ Failed to get signed URL for Supabase export, attempting rebuild');
  }
  
  // ── Strategy B: Local file still exists ───────────────────────────
  if (!exportRecord.outputPath.startsWith('supabase:') && fs.existsSync(exportRecord.outputPath)) {
    return res.download(exportRecord.outputPath, `contextembed_export_${id}.zip`);
  }
  
  // ── Strategy C: Rebuild from Supabase embedded files (legacy) ─────
  console.log(`⚠️ Export file missing, attempting rebuild for: ${id}`);
  
  const exportAssets = (exportRecord as any).exportAssets || [];
  if (exportAssets.length === 0) {
    throw createApiError('Export file expired. Please create a new export.', 404);
  }
  
  try {
    const zipPath = path.join(EXPORT_DIR, `export_${id}_rebuild.zip`);
    fs.mkdirSync(path.dirname(zipPath), { recursive: true });
    
    let filesAdded = 0;
    
    await new Promise<void>(async (resolve, reject) => {
      try {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        
        for (const ea of exportAssets) {
          const asset = ea.asset;
          if (!asset) continue;
          
          const embedResults = await embedResultRepository.findByAsset(asset.id);
          const embedResult = embedResults[0];
          
          if (embedResult) {
            const resolvedPath = await resolveEmbeddedFilePath(
              embedResult,
              exportRecord.projectId,
              asset.id,
            );
            
            if (resolvedPath) {
              const smartFilename = asset.originalFilename.replace(/\.[^.]+$/, '_embedded$&');
              archive.file(resolvedPath, { name: smartFilename });
              filesAdded++;
            }
          }
        }
        
        if (filesAdded === 0) {
          reject(new Error('No files available to rebuild export'));
          return;
        }
        
        archive.finalize();
      } catch (err) {
        reject(err);
      }
    });
    
    console.log(`✅ Rebuilt export ZIP with ${filesAdded} files`);
    
    // Upload rebuilt ZIP to Supabase so future downloads are instant
    try {
      const storageAvailable = await isStorageAvailable();
      if (storageAvailable) {
        const userId = project.userId;
        await uploadExport(zipPath, id, userId);
        const storagePath = `${userId}/${id}.zip`;
        await exportRepository.update(id, { outputPath: `supabase:${storagePath}` });
        console.log(`☁️ Rebuilt export uploaded to Supabase: ${storagePath}`);
      }
    } catch (err) {
      console.warn('Failed to upload rebuilt export to Supabase:', err);
    }
    
    // Serve the rebuilt file
    res.download(zipPath, `contextembed_export_${id}.zip`, () => {
      // Clean up temp file after download
      try { fs.unlinkSync(zipPath); } catch {}
    });
  } catch (err) {
    console.error('Failed to rebuild export:', err);
    throw createApiError('Export file expired. Please create a new export.', 404);
  }
}));

/**
 * POST /exports/advanced - Create export with preset and options
 * World-class export with format conversion, XMP sidecars, and quality settings
 * Memory-hardened: global lock, sequential processing, streaming ZIP.
 */
exportsRouter.post('/advanced', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const requestId = (req as any).id || `adv-${Date.now()}`;
  
  const AdvancedExportSchema = z.object({
    projectId: z.string(),
    assetIds: z.array(z.string()).min(1).max(200),
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
    // Web Preview Pack options (v1)
    webPack: z.object({
      enabled: z.boolean().default(false),
      includeCaption: z.boolean().default(true),
      includeCredit: z.boolean().default(true),
      maxEdge: z.number().min(400).max(2400).default(1200),
      quality: z.number().min(50).max(100).default(82),
      style: z.enum(['clean_bar_v1']).default('clean_bar_v1'),
    }).optional(),
  });
  
  const body = AdvancedExportSchema.parse(req.body);
  const { projectId, assetIds, preset, options: optionOverrides } = body;
  
  // ─── Pre-flight checks ───
  const limitCheck = checkExportLimits(assetIds.length);
  if (!limitCheck.allowed) {
    throw createApiError(limitCheck.reason!, 400);
  }
  
  const rateCheck = checkUserRateLimit(userId);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', Math.ceil((rateCheck.retryAfterMs || 10000) / 1000));
    throw createApiError('Too many export requests. Please wait a moment.', 429);
  }
  
  // Global concurrency lock
  const lockResult = acquireExportLock();
  if (!lockResult.acquired) {
    console.warn(`[${requestId}] Export lock busy, returning 429`);
    res.setHeader('Retry-After', '30');
    res.status(429).json({
      success: false,
      error: 'EXPORT_BUSY',
      message: lockResult.reason || 'Another export is in progress. Please wait a moment and try again.',
      retryAfter: 30,
    });
    return;
  }
  
  recordUserExport(userId);
  logMemory(`adv-export-start[${requestId}]`, { assetCount: assetIds.length });
  
  let exportFolder: string | null = null;
  let zipPath: string | null = null;
  let exportRecord: Awaited<ReturnType<typeof exportRepository.create>> | null = null;
  let metadataWriter: ReturnType<typeof createExifToolWriter> | null = null;
  
  try {
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  // ─── Entitlement Gating ───
  // Check if user is entitled to export
  // This is the "value moment" where we increment usage on success
  const gating = await assertEntitledOrThrow({
    userId,
    workspaceId: project.workspaceId || undefined,
    projectId,
    action: 'export',
    ipAddress: req.ip,
    deviceId: req.headers['x-device-id'] as string | undefined,
  });
  
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
  
  // Get assets with results - SEQUENTIAL to limit memory
  const assets: (NonNullable<Awaited<ReturnType<typeof assetRepository.findByIdWithResults>>> | null)[] = [];
  for (let i = 0; i < assetIds.length; i++) {
    const asset = await assetRepository.findByIdWithResults(assetIds[i]);
    assets.push(asset);
    if ((i + 1) % 5 === 0) {
      logMemory(`adv-fetch-progress[${requestId}]`, { fetched: i + 1, total: assetIds.length });
    }
  }
  
  const completedAssets = assets.filter(a => 
    a && (a.status === 'completed' || a.status === 'approved')
  );
  
  if (completedAssets.length === 0) {
    throw createApiError('No completed assets to export', 400);
  }
  
  // Fetch onboarding profile / user profile for business context in IPTC validation
  const onboardingProfile = await onboardingProfileRepository.findByProjectId(projectId);
  const userProfile = await userProfileRepository.findByUserId(userId);
  
  // Derive governance attestation from project policy
  // Assets that reach export with completed/approved status have passed governance
  const governancePolicy = project.visualAuthenticityPolicy || 'conditional';
  const governanceAttestation = {
    aiGenerated: false,  // Default: standard assets are non-AI unless explicitly flagged
    aiConfidence: undefined as number | undefined,
    status: 'approved' as const,  // Only approved assets reach export
    policy: governancePolicy,
    reason: `Export approved under ${governancePolicy} policy`,
    checkedAt: new Date().toISOString(),
    decisionRef: `export-${requestId}`,  // Use requestId as decision reference
  };
  
  const businessContext = {
    brand: (onboardingProfile?.confirmedContext as any)?.brandName
      || userProfile?.businessName || project.name,
    photographerName: (onboardingProfile?.rights as any)?.creatorName
      || userProfile?.creatorName || userProfile?.businessName || '',
    credit: (onboardingProfile?.rights as any)?.creditTemplate
      || userProfile?.creditTemplate || '',
    city: (onboardingProfile?.confirmedContext as any)?.location?.city
      || userProfile?.city || '',
    country: (onboardingProfile?.confirmedContext as any)?.location?.country
      || userProfile?.country || '',
    copyrightTemplate: (onboardingProfile?.rights as any)?.copyrightTemplate
      || userProfile?.copyrightTemplate || '',
    usageTerms: (onboardingProfile?.rights as any)?.usageTermsTemplate
      || userProfile?.usageTerms || 'All Rights Reserved. Contact for licensing.',
    sessionType: project.name,
    governance: governanceAttestation,
  };

  // Create export record
  exportRecord = await exportRepository.create({
    projectId,
    destinationType: 'download',
    assetIds: completedAssets.map(a => a!.id),
  });
  
  await exportRepository.update(exportRecord.id, { status: 'processing' });
  
  const startTime = Date.now();
  metadataWriter = createExifToolWriter();
  
  // Initialize progress tracking
  emitProgress(exportRecord.id, {
    status: 'processing',
    totalFiles: completedAssets.length,
    stage: 'preparing',
    message: `Preparing export of ${completedAssets.length} files...`,
  });
  
    // Create temp export folder
    exportFolder = path.join(EXPORT_DIR, exportRecord.id);
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
      let sourcePath: string | null = null;
      
      // Try embedded file (local → Supabase)
      if (embedResult) {
        sourcePath = await resolveEmbeddedFilePath(embedResult, projectId, asset.id);
      }
      
      // Fallback to original local file
      if (!sourcePath && asset.storagePath && fs.existsSync(asset.storagePath)) {
        sourcePath = asset.storagePath;
      }
      
      if (!sourcePath) {
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
          businessContext,
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
    
    // ─────────────────────────────────────────────────────────────────────────
    // Web Preview Pack v1: Generate styled thumbnails for web publishing
    // ─────────────────────────────────────────────────────────────────────────
    const webPackOptions = body.webPack;
    if (webPackOptions?.enabled) {
      emitProgress(exportRecord.id, {
        stage: 'converting',
        message: 'Generating Web Preview Pack...',
      });
      
      const webFolder = path.join(exportFolder!, 'web');
      await fs.promises.mkdir(webFolder, { recursive: true });
      
      // Prepare credit line from business context
      const creditLine = resolveCredit({
        creditTemplate: businessContext.credit,
        businessName: businessContext.brand,
        creatorName: businessContext.photographerName,
      }, new Date().getFullYear());
      
      // Process each successfully exported file
      const successfulFiles = exportedFiles.filter(f => f.success && f.outputPath);
      
      for (let i = 0; i < successfulFiles.length; i++) {
        const file = successfulFiles[i]!;
        const baseName = path.basename(file.outputPath, path.extname(file.outputPath));
        const webOutputPath = path.join(webFolder, `${baseName}-web.jpg`);
        
        emitProgress(exportRecord.id, {
          stage: 'converting',
          message: `Web preview ${i + 1}/${successfulFiles.length}: ${file.originalFilename}`,
        });
        
        try {
          // Resolve caption from asset metadata
          const asset = completedAssets.find(a => a?.id === file.assetId);
          const metadataResult = await metadataResultRepository.findLatestByAsset(file.assetId);
          const metadata = metadataResult?.result || {};
          
          const caption = webPackOptions.includeCaption
            ? resolveCaption({
                imageCaption: (metadata as any).headline || (metadata as any).description,
                imageTitle: (metadata as any).title,
                altText: (metadata as any).alt,
                filename: asset?.originalFilename,
              })
            : undefined;
          
          await generateWebVariant(
            file.outputPath,
            webOutputPath,
            {
              maxEdge: webPackOptions.maxEdge ?? 1200,
              quality: webPackOptions.quality ?? 82,
              style: webPackOptions.style ?? 'clean_bar_v1',
              includeCaption: webPackOptions.includeCaption ?? true,
              includeCredit: webPackOptions.includeCredit ?? true,
            },
            {
              caption,
              credit: webPackOptions.includeCredit ? creditLine : undefined,
            }
          );
          
          // Track web variant
          file.webVariantPath = webOutputPath;
        } catch (err) {
          // Log but don't fail export for web variant issues
          console.error(`Web variant failed for ${file.originalFilename}:`, err);
        }
      }
      
      logMemory(`web-pack-done[${requestId}]`, { count: successfulFiles.length });
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
      
      zipPath = path.join(EXPORT_DIR, `${exportRecord.id}.zip`);
      logMemory(`adv-zip-start[${requestId}]`, { files: successCount });
      
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(zipPath!);
        const archive = archiver('zip', { zlib: { level: 6 } }); // lower level for speed
        
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(exportFolder!, false);
        archive.finalize();
      });
      
      logMemory(`adv-zip-done[${requestId}]`);
      
      // Clean up folder after zipping
      await safeRmDir(exportFolder!);
      exportFolder = null; // mark as cleaned
      outputPath = zipPath;
      
      // Upload ZIP to Supabase for persistent storage
      try {
        const storageAvailable = await isStorageAvailable();
        if (storageAvailable) {
          await uploadExport(zipPath!, exportRecord.id, userId);
          const storagePath = `${userId}/${exportRecord.id}.zip`;
          outputPath = `supabase:${storagePath}`;
          console.log(`☁️ Advanced export ZIP uploaded to Supabase: ${storagePath}`);
          
          // Clean up local file
          await safeUnlink(zipPath!);
          zipPath = null; // mark as cleaned
        }
      } catch (err) {
        console.warn('Failed to upload advanced export to Supabase:', err);
        // Keep local path as fallback
      }
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
    
    // ─── Record successful action for usage tracking ───
    // This increments domain usage for free tier
    if (gating.usageEventId) {
      await recordSuccessfulAction(
        gating.workspaceId,
        gating.domain,
        gating.usageEventId,
        {
          ipAddress: req.ip || undefined,
          deviceId: req.headers['x-device-id'] as string | undefined,
          imagesCount: successCount,
        }
      );
    }
    
    logMemory(`adv-export-done[${requestId}]`, { 
      successCount, 
      failCount, 
      durationMs: Date.now() - startTime 
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
    if (metadataWriter) await metadataWriter.close();
    
    // Emit failure progress
    if (exportRecord) {
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
    }
    
    logMemory(`adv-export-error[${requestId}]`, { 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    
    // Cleanup on error
    if (exportFolder) await safeRmDir(exportFolder);
    if (zipPath) await safeUnlink(zipPath);
    
    throw createApiError('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'), 500);
  } finally {
    releaseExportLock();
  }
}));
