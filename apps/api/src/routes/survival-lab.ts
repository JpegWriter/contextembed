/**
 * Survival Lab API Routes
 * 
 * Endpoints for the CE Metadata Survival Study.
 * Allows users to test metadata preservation across different platforms.
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import {
  survivalPlatformRepository,
  survivalBaselineRepository,
  survivalTestRunRepository,
  survivalTestRunAssetRepository,
  survivalScenarioUploadRepository,
  survivalMetadataReportRepository,
  survivalComparisonRepository,
} from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { survivalStudyRouter } from './survival-study';
import {
  extractMetadataFromFile,
  computeFileSha256,
  getFileSize,
  deleteTempFile,
} from '../services/survival-lab/metadata-extractor';
import {
  uploadRawFile,
  downloadToTempFile,
  storagePaths,
  initSurvivalLabStorage,
  isStorageAvailable,
} from '../services/survival-lab/storage';
import { compareToBaseline, generateComparisonSummary } from '../services/survival-lab/comparison';
import { updatePlatformStats, recordTrend, getAnalyticsSummary, getPlatformAnalytics } from '../services/survival-lab/analytics';

export const survivalLabRouter: IRouter = Router();

// Configure multer for raw file uploads (no transformation!)
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'image/tiff', 'image/heic', 'image/heif', 'image/avif',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

// Initialize storage on first request
let storageInitialized = false;
async function ensureStorage() {
  if (!storageInitialized) {
    await initSurvivalLabStorage();
    storageInitialized = true;
  }
}

// Mount study session sub-router
survivalLabRouter.use('/study', survivalStudyRouter);

// ============================================
// Platforms
// ============================================

/**
 * GET /survival/platforms - List all platforms
 */
survivalLabRouter.get('/platforms', asyncHandler(async (_req, res) => {
  const platforms = await survivalPlatformRepository.findAll();
  res.json({ platforms });
}));

/**
 * POST /survival/platforms/seed - Seed Phase 1 platforms
 */
survivalLabRouter.post('/platforms/seed', asyncHandler(async (_req, res) => {
  const phase1Platforms = [
    { slug: 'wordpress_selfhosted', name: 'WordPress (Self-Hosted)', category: 'CMS', freeTier: false, notes: 'Powers ~40% of the web. Test: original in Media Library, resized derivatives, with/without CDN, with CE WP plugin active.' },
    { slug: 'wordpress_com', name: 'WordPress.com (Hosted)', category: 'CMS', freeTier: true, notes: 'Managed CMS — likely more aggressive stripping than self-hosted. Test free plan vs business plan if possible.' },
    { slug: 'squarespace', name: 'Squarespace', category: 'Website Builder', freeTier: false, notes: 'Popular with photographers. Test: original upload, re-download via front-end, gallery vs single image block.' },
    { slug: 'wix', name: 'Wix', category: 'Website Builder', freeTier: true, notes: 'Heavy re-encoding pipeline. Test: upload → publish → download, thumbnail vs full-size.' },
    { slug: 'webflow', name: 'Webflow', category: 'Website Builder', freeTier: true, notes: 'Used by agencies and startups. Test: CMS upload, static asset upload, CDN behaviour.' },
    { slug: 'shopify', name: 'Shopify', category: 'Ecommerce', freeTier: false, notes: 'Product imagery critical for authenticity. Test: product image upload, re-download original, CDN derivative.' },
    { slug: 'instagram', name: 'Instagram', category: 'Social', freeTier: true, notes: 'Most assumed "portfolio" platform. Test: feed post, re-download via browser, inspect EXIF.' },
    { slug: 'facebook', name: 'Facebook', category: 'Social', freeTier: true, notes: 'Business pages still widely used. Test: page upload, direct download, image URL fetch.' },
    { slug: 'linkedin', name: 'LinkedIn', category: 'Social', freeTier: true, notes: 'Corporate proof-of-work platform. Test: post image, company page upload, re-download.' },
    { slug: 'dropbox', name: 'Dropbox', category: 'Cloud Storage', freeTier: true, notes: 'Baseline "safe storage" test. Test: upload, preview, direct download.' },
    { slug: 'google_drive', name: 'Google Drive', category: 'Cloud Storage', freeTier: true, notes: 'Common client delivery method. Test: upload, preview download, full download.' },
    { slug: 'smugmug', name: 'SmugMug', category: 'Photography', freeTier: false, notes: 'Built for photographers — interesting survival comparison. Test: gallery upload, client download, original file retention.' },
  ];
  
  for (const platform of phase1Platforms) {
    await survivalPlatformRepository.upsert(platform);
  }
  
  res.json({ success: true, count: phase1Platforms.length });
}));

// ============================================
// Baselines
// ============================================

/**
 * GET /survival/baselines - List user's baseline images
 */
survivalLabRouter.get('/baselines', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const baselines = await survivalBaselineRepository.findByUser(userId);
  
  // Get metadata reports for each baseline
  const baselinesWithReports = await Promise.all(
    baselines.map(async (b) => {
      const withReports = await survivalBaselineRepository.findByIdWithReports(b.id);
      return {
        ...b,
        bytes: Number(b.bytes), // Convert BigInt to number for JSON
        metadataReport: withReports?.metadataReports[0] || null,
      };
    })
  );
  
  res.json({ baselines: baselinesWithReports });
}));

/**
 * POST /survival/baselines/upload - Upload a CE-embedded baseline image
 * 
 * CRITICAL: No image transformation. Store raw binary as-is.
 */
survivalLabRouter.post('/baselines/upload', upload.single('file'), asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const file = req.file;
  
  if (!file) {
    throw createApiError('No file uploaded', 400);
  }
  
  // Parse label from body
  const LabelSchema = z.object({
    label: z.string().min(1).max(100),
  });
  const { label } = LabelSchema.parse(req.body);
  
  const tempPath = file.path;
  
  try {
    await ensureStorage();
    
    // Compute SHA256 and file size from the raw uploaded file
    const sha256 = await computeFileSha256(tempPath);
    const bytes = await getFileSize(tempPath);
    
    // Extract metadata (reads from temp file, no modification)
    let metadata;
    try {
      metadata = await extractMetadataFromFile(tempPath);
    } catch (metaErr: any) {
      console.error('[SurvivalLab] Metadata extraction failed:', metaErr);
      // Provide fallback so upload can still proceed
      metadata = {
        exifPresent: false, xmpPresent: false, iptcPresent: false,
        creatorValue: null, rightsValue: null, creditValue: null, descriptionValue: null,
        encodingOk: true, notes: `Metadata extraction failed: ${metaErr?.message || 'unknown'}`,
        rawJson: {}, width: 0, height: 0,
      };
    }
    
    // Generate baseline ID and storage path
    const baselineId = `bl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = storagePaths.baseline(userId, baselineId, file.originalname);
    
    // Upload raw file to storage (no transformation!)
    let uploadedPath: string | null = null;
    try {
      uploadedPath = await uploadRawFile(tempPath, storagePath);
    } catch (uploadErr: any) {
      console.error('[SurvivalLab] Upload to storage failed:', uploadErr);
      throw createApiError(`Failed to upload file to storage: ${uploadErr.message}`, 500);
    }
    
    if (!uploadedPath && isStorageAvailable()) {
      throw createApiError('Failed to upload file to storage', 500);
    }
    
    // Create baseline record
    const baseline = await survivalBaselineRepository.create({
      userId,
      label,
      originalFilename: file.originalname,
      storagePath: uploadedPath || tempPath,
      sha256,
      bytes,
      width: metadata.width,
      height: metadata.height,
    });
    
    // Create metadata report
    await survivalMetadataReportRepository.create({
      fileKind: 'baseline',
      baselineImageId: baseline.id,
      exifPresent: metadata.exifPresent,
      xmpPresent: metadata.xmpPresent,
      iptcPresent: metadata.iptcPresent,
      creatorValue: metadata.creatorValue ?? undefined,
      rightsValue: metadata.rightsValue ?? undefined,
      creditValue: metadata.creditValue ?? undefined,
      descriptionValue: metadata.descriptionValue ?? undefined,
      encodingOk: metadata.encodingOk,
      notes: metadata.notes ?? undefined,
      rawJson: metadata.rawJson,
    });
    
    res.status(201).json({
      baseline: {
        id: baseline.id,
        label: baseline.label,
        originalFilename: baseline.originalFilename,
        sha256: baseline.sha256,
        bytes: Number(baseline.bytes),
        width: baseline.width,
        height: baseline.height,
        metadata: {
          exifPresent: metadata.exifPresent,
          xmpPresent: metadata.xmpPresent,
          iptcPresent: metadata.iptcPresent,
          creatorValue: metadata.creatorValue,
          rightsValue: metadata.rightsValue,
        },
      },
    });
  } finally {
    // Clean up temp file
    await deleteTempFile(tempPath);
  }
}));

/**
 * POST /survival/baselines/:id/verify - Verify integrity (recompute SHA256)
 */
survivalLabRouter.post('/baselines/:id/verify', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const baseline = await survivalBaselineRepository.findById(id);
  if (!baseline || baseline.userId !== userId) {
    throw createApiError('Baseline not found', 404);
  }
  
  // Download from storage to temp file
  const tempPath = await downloadToTempFile(baseline.storagePath, baseline.originalFilename);
  if (!tempPath) {
    throw createApiError('Failed to download file from storage', 500);
  }
  
  try {
    // Recompute SHA256
    const currentSha256 = await computeFileSha256(tempPath);
    const integrityOk = currentSha256 === baseline.sha256;
    
    res.json({
      integrityOk,
      originalSha256: baseline.sha256,
      currentSha256,
      message: integrityOk
        ? 'File integrity verified - SHA256 matches'
        : 'INTEGRITY FAILURE - File has been modified!',
    });
  } finally {
    await deleteTempFile(tempPath);
  }
}));

// ============================================
// Test Runs
// ============================================

/**
 * GET /survival/runs - List user's test runs
 */
survivalLabRouter.get('/runs', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const runs = await survivalTestRunRepository.findByUser(userId);
  res.json({
    runs: runs.map(r => ({
      ...r,
      assetCount: r.assets.length,
    })),
  });
}));

/**
 * POST /survival/runs/create - Create a new test run
 */
survivalLabRouter.post('/runs/create', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const CreateRunSchema = z.object({
    platformSlug: z.string(),
    title: z.string().min(1).max(200),
    accountType: z.string().optional(),
  });
  
  const { platformSlug, title, accountType } = CreateRunSchema.parse(req.body);
  
  // Find platform
  const platform = await survivalPlatformRepository.findBySlug(platformSlug);
  if (!platform) {
    throw createApiError(`Platform not found: ${platformSlug}`, 404);
  }
  
  const run = await survivalTestRunRepository.create({
    userId,
    platformId: platform.id,
    title,
    accountType,
    status: 'draft',
  });
  
  res.status(201).json({
    run: {
      ...run,
      platform,
    },
  });
}));

/**
 * GET /survival/runs/:id - Get test run details
 */
survivalLabRouter.get('/runs/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const run = await survivalTestRunRepository.findById(id);
  if (!run || run.userId !== userId) {
    throw createApiError('Test run not found', 404);
  }
  
  res.json({
    run: {
      ...run,
      assets: run.assets.map(a => ({
        ...a,
        baselineImage: {
          ...a.baselineImage,
          bytes: Number(a.baselineImage.bytes),
        },
      })),
    },
  });
}));

/**
 * POST /survival/runs/:id/attach-baselines - Attach baseline images to run
 */
survivalLabRouter.post('/runs/:id/attach-baselines', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const run = await survivalTestRunRepository.findById(id);
  if (!run || run.userId !== userId) {
    throw createApiError('Test run not found', 404);
  }
  
  const AttachSchema = z.object({
    baselineIds: z.array(z.string()).min(1),
  });
  
  const { baselineIds } = AttachSchema.parse(req.body);
  
  // Verify all baselines belong to user
  for (const baselineId of baselineIds) {
    const baseline = await survivalBaselineRepository.findById(baselineId);
    if (!baseline || baseline.userId !== userId) {
      throw createApiError(`Baseline not found: ${baselineId}`, 404);
    }
  }
  
  // Attach baselines
  await survivalTestRunAssetRepository.attach(id, baselineIds);
  
  // Update run status
  await survivalTestRunRepository.updateStatus(id, 'running');
  
  res.json({ success: true, attached: baselineIds.length });
}));

/**
 * POST /survival/runs/:id/upload-scenario - Upload a scenario file for comparison
 */
survivalLabRouter.post('/runs/:id/upload-scenario', upload.single('file'), asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  const file = req.file;
  
  if (!file) {
    throw createApiError('No file uploaded', 400);
  }
  
  const run = await survivalTestRunRepository.findById(id);
  if (!run || run.userId !== userId) {
    throw createApiError('Test run not found', 404);
  }
  
  const ScenarioSchema = z.object({
    baselineImageId: z.string(),
    scenario: z.enum([
      'upload_original',
      'download_original',
      'download_preview',
      'share_link_download',
      'right_click_save',
      'platform_export',
      'other',
    ]),
    scenarioType: z.string().optional(),
    studySessionId: z.string().optional(),
  });
  
  const { baselineImageId, scenario, scenarioType, studySessionId } = ScenarioSchema.parse(req.body);
  
  // Verify baseline is attached to this run
  const isAttached = run.assets.some(a => a.baselineImageId === baselineImageId);
  if (!isAttached) {
    throw createApiError('Baseline not attached to this run', 400);
  }
  
  // Get baseline with metadata report
  const baseline = await survivalBaselineRepository.findByIdWithReports(baselineImageId);
  if (!baseline) {
    throw createApiError('Baseline not found', 404);
  }
  
  const baselineReport = baseline.metadataReports[0];
  if (!baselineReport) {
    throw createApiError('Baseline metadata report not found', 500);
  }
  
  const tempPath = file.path;
  
  try {
    await ensureStorage();
    
    // Compute SHA256 and size
    const sha256 = await computeFileSha256(tempPath);
    const bytes = await getFileSize(tempPath);
    
    // Extract metadata
    let metadata;
    try {
      metadata = await extractMetadataFromFile(tempPath);
    } catch (metaErr: any) {
      console.error('[SurvivalLab] Scenario metadata extraction failed:', metaErr);
      metadata = {
        exifPresent: false, xmpPresent: false, iptcPresent: false,
        creatorValue: null, rightsValue: null, creditValue: null, descriptionValue: null,
        encodingOk: true, notes: `Metadata extraction failed: ${metaErr?.message || 'unknown'}`,
        rawJson: {}, width: 0, height: 0,
      };
    }
    
    // Upload to storage
    const storagePath = storagePaths.scenario(userId, id, scenario, baselineImageId, file.originalname);
    let uploadedPath: string | null = null;
    try {
      uploadedPath = await uploadRawFile(tempPath, storagePath);
    } catch (uploadErr: any) {
      console.error('[SurvivalLab] Scenario upload failed:', uploadErr);
      // Continue with local path as fallback
      uploadedPath = null;
    }
    
    // Create scenario upload record
    const scenarioUpload = await survivalScenarioUploadRepository.create({
      testRunId: id,
      baselineImageId,
      scenario,
      originalFilename: file.originalname,
      storagePath: uploadedPath || tempPath,
      sha256,
      bytes,
      width: metadata.width,
      height: metadata.height,
      scenarioType: scenarioType ?? undefined,
      studySessionId: studySessionId ?? undefined,
    });
    
    // Create metadata report
    await survivalMetadataReportRepository.create({
      fileKind: 'scenario',
      baselineImageId,
      scenarioUploadId: scenarioUpload.id,
      exifPresent: metadata.exifPresent,
      xmpPresent: metadata.xmpPresent,
      iptcPresent: metadata.iptcPresent,
      creatorValue: metadata.creatorValue ?? undefined,
      rightsValue: metadata.rightsValue ?? undefined,
      creditValue: metadata.creditValue ?? undefined,
      descriptionValue: metadata.descriptionValue ?? undefined,
      encodingOk: metadata.encodingOk,
      notes: metadata.notes ?? undefined,
      rawJson: metadata.rawJson,
    });
    
    // Compare to baseline
    const comparison = compareToBaseline({
      baseline: {
        creatorValue: baselineReport.creatorValue,
        rightsValue: baselineReport.rightsValue,
        creditValue: baselineReport.creditValue,
        descriptionValue: baselineReport.descriptionValue,
        width: baseline.width,
        height: baseline.height,
        originalFilename: baseline.originalFilename,
        exifPresent: baselineReport.exifPresent,
        xmpPresent: baselineReport.xmpPresent,
        iptcPresent: baselineReport.iptcPresent,
        rawJson: baselineReport.rawJson as Record<string, unknown> ?? undefined,
      },
      scenario: {
        creatorValue: metadata.creatorValue,
        rightsValue: metadata.rightsValue,
        creditValue: metadata.creditValue,
        descriptionValue: metadata.descriptionValue,
        width: metadata.width,
        height: metadata.height,
        originalFilename: file.originalname,
        exifPresent: metadata.exifPresent,
        xmpPresent: metadata.xmpPresent,
        iptcPresent: metadata.iptcPresent,
        rawJson: metadata.rawJson,
      },
    });
    
    // Store comparison
    await survivalComparisonRepository.create({
      baselineImageId,
      scenarioUploadId: scenarioUpload.id,
      survivalScore: comparison.survivalScore,
      creatorOk: comparison.creatorOk,
      rightsOk: comparison.rightsOk,
      creditOk: comparison.creditOk,
      descriptionOk: comparison.descriptionOk,
      dimsChanged: comparison.dimsChanged,
      filenameChanged: comparison.filenameChanged,
      fieldsMissing: comparison.fieldsMissing,
      scoreV2: comparison.scoreV2,
      survivalClass: comparison.survivalClass,
      diffReport: comparison.diffReport ? JSON.parse(JSON.stringify(comparison.diffReport)) : undefined,
    });
    
    // Update platform analytics (non-blocking)
    const platformId = run.platformId;
    updatePlatformStats(platformId).catch(() => {});
    recordTrend(
      platformId,
      scenarioUpload.id,
      comparison.survivalScore,
      comparison.scoreV2,
      comparison.survivalClass,
      scenarioType ?? scenario,
    ).catch(() => {});
    
    res.status(201).json({
      scenarioUpload: {
        id: scenarioUpload.id,
        scenario,
        originalFilename: file.originalname,
        sha256,
        bytes: Number(bytes),
        width: metadata.width,
        height: metadata.height,
      },
      comparison: {
        ...comparison,
        summary: generateComparisonSummary(comparison),
      },
    });
  } finally {
    await deleteTempFile(tempPath);
  }
}));

/**
 * GET /survival/runs/:id/results - Get full results for a test run
 */
survivalLabRouter.get('/runs/:id/results', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const run = await survivalTestRunRepository.findByIdWithResults(id);
  if (!run || run.userId !== userId) {
    throw createApiError('Test run not found', 404);
  }
  
  // Transform BigInt to number for JSON serialization
  const results = {
    run: {
      id: run.id,
      title: run.title,
      status: run.status,
      accountType: run.accountType,
      createdAt: run.createdAt,
      platform: run.platform,
    },
    baselines: run.assets.map(a => ({
      id: a.baselineImage.id,
      label: a.baselineImage.label,
      originalFilename: a.baselineImage.originalFilename,
      sha256: a.baselineImage.sha256,
      bytes: Number(a.baselineImage.bytes),
      width: a.baselineImage.width,
      height: a.baselineImage.height,
      metadata: a.baselineImage.metadataReports[0] || null,
    })),
    scenarios: run.uploads.map(u => ({
      id: u.id,
      baselineImageId: u.baselineImageId,
      baselineLabel: u.baselineImage.label,
      scenario: u.scenario,
      originalFilename: u.originalFilename,
      sha256: u.sha256,
      bytes: Number(u.bytes),
      width: u.width,
      height: u.height,
      metadata: u.metadataReports[0] || null,
      comparison: u.comparisons[0] || null,
    })),
  };
  
  res.json(results);
}));

/**
 * GET /survival/runs/:id/export.csv - Export results as CSV
 */
survivalLabRouter.get('/runs/:id/export.csv', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;
  
  const run = await survivalTestRunRepository.findByIdWithResults(id);
  if (!run || run.userId !== userId) {
    throw createApiError('Test run not found', 404);
  }
  
  // Build CSV
  const headers = [
    'platform',
    'run_title',
    'scenario',
    'baseline_label',
    'baseline_sha256',
    'scenario_sha256',
    'bytes',
    'width',
    'height',
    'exif_present',
    'xmp_present',
    'iptc_present',
    'creator_ok',
    'rights_ok',
    'credit_ok',
    'description_ok',
    'survival_score',
    'notes',
  ];
  
  const rows: string[][] = [];
  
  for (const upload of run.uploads) {
    const baseline = run.assets.find(a => a.baselineImageId === upload.baselineImageId);
    const baselineImage = baseline?.baselineImage;
    const metadata = upload.metadataReports[0];
    const comparison = upload.comparisons[0];
    
    rows.push([
      run.platform.name,
      run.title,
      upload.scenario,
      baselineImage?.label || '',
      baselineImage?.sha256 || '',
      upload.sha256,
      String(upload.bytes),
      String(upload.width),
      String(upload.height),
      metadata?.exifPresent ? 'true' : 'false',
      metadata?.xmpPresent ? 'true' : 'false',
      metadata?.iptcPresent ? 'true' : 'false',
      comparison?.creatorOk ? 'true' : 'false',
      comparison?.rightsOk ? 'true' : 'false',
      comparison?.creditOk ? 'true' : 'false',
      comparison?.descriptionOk ? 'true' : 'false',
      comparison?.survivalScore?.toString() || '0',
      metadata?.notes || '',
    ]);
  }
  
  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  // Mark run as complete
  await survivalTestRunRepository.updateStatus(id, 'complete');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="survival_lab_${run.platform.slug}_${id}.csv"`);
  res.send(csvContent);
}));

// ============================================
// Analytics
// ============================================

/**
 * GET /survival/analytics/summary - Cross-platform analytics dashboard
 */
survivalLabRouter.get('/analytics/summary', asyncHandler(async (_req, res) => {
  const data = await getAnalyticsSummary();
  res.json(data);
}));

/**
 * GET /survival/analytics/platform/:slug - Per-platform analytics with trend data
 */
survivalLabRouter.get('/analytics/platform/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const data = await getPlatformAnalytics(slug);
  
  if (!data.summary) {
    res.json({ summary: null, trends: [], message: 'No data for this platform yet' });
    return;
  }
  
  res.json(data);
}));

export default survivalLabRouter;
