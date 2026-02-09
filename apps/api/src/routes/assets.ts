/**
 * Assets routes
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { 
  projectRepository, 
  assetRepository,
  jobRepository,
  visionResultRepository,
  metadataResultRepository,
  embedResultRepository,
} from '@contextembed/db';
import { 
  validateImageType,
  generateStoragePaths,
  computeHash,
} from '@contextembed/core';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { uploadThumbnail, isStorageAvailable } from '../services/storage';

export const assetsRouter: IRouter = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const validation = validateImageType(file.originalname, file.mimetype);
    if (!validation.valid) {
      cb(new Error(validation.error || 'Invalid file type'));
      return;
    }
    cb(null, true);
  },
});

// Ensure upload directory exists
const UPLOAD_DIR = process.env.STORAGE_LOCAL_PATH || './uploads';

async function ensureUploadDir(subpath: string): Promise<string> {
  const fullPath = path.join(UPLOAD_DIR, subpath);
  await fs.mkdir(fullPath, { recursive: true });
  return fullPath;
}

/**
 * List assets for a project
 */
assetsRouter.get('/project/:projectId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  const { status } = req.query;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const assets = await assetRepository.findByProject(
    projectId, 
    status as any
  );
  
  res.json({
    assets: assets.map(a => ({
      id: a.id,
      filename: a.filename,
      originalFilename: a.originalFilename,
      mimeType: a.mimeType,
      size: a.size,
      status: a.status,
      thumbnailPath: a.thumbnailPath,
      width: a.width,
      height: a.height,
      userComment: a.userComment,
      createdAt: a.createdAt,
    })),
    total: assets.length,
  });
}));

/**
 * Get single asset with results
 */
assetsRouter.get('/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const asset = await assetRepository.findByIdWithResults(id);
  
  if (!asset) {
    throw createApiError('Asset not found', 404);
  }
  
  // Verify project ownership
  const project = await projectRepository.findById(asset.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Asset not found', 404);
  }
  
  res.json({
    asset: {
      id: asset.id,
      filename: asset.filename,
      originalFilename: asset.originalFilename,
      mimeType: asset.mimeType,
      size: asset.size,
      status: asset.status,
      storagePath: asset.storagePath,
      thumbnailPath: asset.thumbnailPath,
      previewPath: asset.previewPath,
      width: asset.width,
      height: asset.height,
      userComment: asset.userComment,
      createdAt: asset.createdAt,
      visionResult: asset.visionResults[0] || null,
      metadataResult: asset.metadataResults[0] || null,
      embedResult: asset.embedResults[0] || null,
    },
  });
}));

/**
 * Upload assets
 */
assetsRouter.post(
  '/upload/:projectId',
  upload.array('files', 10),
  asyncHandler(async (req, res) => {
    const { userId } = req as AuthenticatedRequest;
    const { projectId } = req.params;
    
    // Verify project ownership
    const project = await projectRepository.findByIdWithProfile(projectId);
    if (!project || project.userId !== userId) {
      throw createApiError('Project not found', 404);
    }
    
    // Check if onboarding is complete
    if (!project.onboardingCompleted) {
      throw createApiError(
        'Complete onboarding before uploading assets',
        400,
        'ONBOARDING_INCOMPLETE'
      );
    }
    
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      throw createApiError('No files uploaded', 400);
    }
    
    const uploaded: any[] = [];
    const failed: any[] = [];
    
    for (const file of files) {
      try {
        const assetId = nanoid();
        const paths = generateStoragePaths(projectId, assetId, file.originalname);
        
        // Compute hash
        const hash = computeHash(file.buffer);
        
        // Check for duplicate
        const existing = await assetRepository.findByHash(projectId, hash);
        if (existing) {
          failed.push({
            filename: file.originalname,
            reason: 'Duplicate file',
          });
          continue;
        }
        
        // Get image dimensions
        const metadata = await sharp(file.buffer).metadata();
        
        // Ensure directories exist
        const assetDir = await ensureUploadDir(`projects/${projectId}/assets/${assetId}`);
        
        // Save original (temporary - will be cleaned up after processing)
        const originalPath = path.join(assetDir, `original${path.extname(file.originalname)}`);
        await fs.writeFile(originalPath, file.buffer);
        
        // Generate and upload thumbnail to Supabase (persistent)
        let thumbnailUrl: string | null = null;
        let thumbnailPath = path.join(assetDir, `thumbnail.jpg`);
        
        // Generate local thumbnail first
        await sharp(file.buffer)
          .resize(400, 400, { fit: 'inside' })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
        
        // Try to upload to Supabase Storage
        if (await isStorageAvailable()) {
          try {
            const result = await uploadThumbnail(file.buffer, projectId, assetId, 'jpeg');
            thumbnailUrl = result.url;
            // We'll use Supabase URL instead of local path
            thumbnailPath = result.url;
          } catch (err) {
            console.warn('Supabase thumbnail upload failed, using local:', err);
          }
        }
        
        // Generate preview (800px) - local only
        const previewPath = path.join(assetDir, `preview.jpg`);
        await sharp(file.buffer)
          .resize(800, 800, { fit: 'inside' })
          .jpeg({ quality: 85 })
          .toFile(previewPath);
        
        // Generate analysis image (1600px for vision API) - local only
        const analysisPath = path.join(assetDir, `analysis.jpg`);
        await sharp(file.buffer)
          .resize(1600, 1600, { fit: 'inside' })
          .jpeg({ quality: 90 })
          .toFile(analysisPath);
        
        // Create asset record
        const asset = await assetRepository.create({
          projectId,
          filename: `${assetId}${path.extname(file.originalname)}`,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          hash,
          storagePath: originalPath,
          width: metadata.width,
          height: metadata.height,
        });
        
        // Update with generated paths
        await assetRepository.update(asset.id, {
          thumbnailPath,
          previewPath,
          analysisPath,
        });
        
        uploaded.push({
          id: asset.id,
          filename: asset.filename,
          originalFilename: asset.originalFilename,
          size: asset.size,
          width: metadata.width,
          height: metadata.height,
        });
        
      } catch (error) {
        failed.push({
          filename: file.originalname,
          reason: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }
    
    res.status(201).json({
      uploaded,
      failed,
      summary: {
        total: files.length,
        successful: uploaded.length,
        failed: failed.length,
      },
    });
  })
);

/**
 * Update asset (add comment, etc.)
 */
assetsRouter.patch('/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const asset = await assetRepository.findById(id);
  
  if (!asset) {
    throw createApiError('Asset not found', 404);
  }
  
  // Verify project ownership
  const project = await projectRepository.findById(asset.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Asset not found', 404);
  }
  
  const UpdateSchema = z.object({
    userComment: z.string().max(2000).optional(),
    status: z.enum(['approved']).optional(),
  });
  
  const input = UpdateSchema.parse(req.body);
  
  const updated = await assetRepository.update(id, input);
  
  res.json({ asset: updated });
}));

/**
 * Delete asset
 */
assetsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const asset = await assetRepository.findById(id);
  
  if (!asset) {
    throw createApiError('Asset not found', 404);
  }
  
  // Verify project ownership
  const project = await projectRepository.findById(asset.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Asset not found', 404);
  }
  
  // Delete files
  try {
    if (asset.storagePath) await fs.unlink(asset.storagePath).catch(() => {});
    if (asset.thumbnailPath) await fs.unlink(asset.thumbnailPath).catch(() => {});
    if (asset.previewPath) await fs.unlink(asset.previewPath).catch(() => {});
    if (asset.analysisPath) await fs.unlink(asset.analysisPath).catch(() => {});
  } catch (error) {
    // Ignore file deletion errors
  }
  
  await assetRepository.delete(id);
  
  res.status(204).send();
}));

/**
 * Process assets (create pipeline jobs)
 */
assetsRouter.post('/process', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const ProcessSchema = z.object({
    assetIds: z.array(z.string()).min(1).max(50),
    projectId: z.string(),
  });
  
  const { assetIds, projectId } = ProcessSchema.parse(req.body);
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  // Create jobs for each asset
  const jobs = await Promise.all(
    assetIds.map(assetId => 
      jobRepository.create({
        projectId,
        assetId,
        type: 'full_pipeline',
        metadata: {},
      })
    )
  );
  
  // Update asset statuses
  await Promise.all(
    assetIds.map(assetId =>
      assetRepository.update(assetId, { status: 'pending' })
    )
  );
  
  res.status(201).json({
    jobs: jobs.map(j => ({
      id: j.id,
      assetId: j.assetId,
      type: j.type,
      status: j.status,
    })),
  });
}));

/**
 * Serve asset file
 */
assetsRouter.get('/:id/file/:type', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id, type } = req.params;
  
  const asset = await assetRepository.findById(id);
  
  if (!asset) {
    throw createApiError('Asset not found', 404);
  }
  
  // Verify project ownership
  const project = await projectRepository.findById(asset.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Asset not found', 404);
  }
  
  let filePath: string | null = null;
  
  switch (type) {
    case 'original':
      filePath = asset.storagePath;
      break;
    case 'thumbnail':
      filePath = asset.thumbnailPath;
      break;
    case 'preview':
      filePath = asset.previewPath;
      break;
    case 'analysis':
      filePath = asset.analysisPath;
      break;
    default:
      throw createApiError('Invalid file type', 400);
  }
  
  if (!filePath) {
    throw createApiError('File not found', 404);
  }
  
  res.sendFile(path.resolve(filePath));
}));
