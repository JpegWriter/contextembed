/**
 * Authorship Integrity Engine — API Routes
 * 
 * Provides endpoints for:
 * - Viewing authorship status per asset
 * - User declaration (confirming/declining creator status)
 * - Audit trail retrieval
 * - Export validation
 */

import { Router, type IRouter } from 'express';
import {
  ceImageRepository,
  ceEventLogRepository,
  ceExportRepository,
  assetRepository,
  projectRepository,
  userProfileRepository,
} from '@contextembed/db';
import {
  AuthorshipClassifier,
  AuthorshipStatus,
  ExportGuard,
  LanguageGovernor,
  CeEventType,
  MetadataEmbeddingRules,
} from '@contextembed/core';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';

export const authorshipRouter: IRouter = Router();

/**
 * GET /authorship/project/:projectId
 * Get authorship status for all images in a project
 */
authorshipRouter.get('/project/:projectId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }

  const ceImages = await ceImageRepository.findByProject(projectId);

  res.json({
    images: ceImages.map(img => ({
      id: img.id,
      assetId: img.assetId,
      authorshipStatus: img.authorshipStatus,
      authorshipEvidence: img.authorshipEvidence,
      userDeclared: img.userDeclared,
      syntheticConfidence: img.syntheticConfidence,
      classifiedAt: img.classifiedAt,
      createdAt: img.createdAt,
    })),
  });
}));

/**
 * GET /authorship/asset/:assetId
 * Get authorship status for a specific asset
 */
authorshipRouter.get('/asset/:assetId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { assetId } = req.params;

  const asset = await assetRepository.findById(assetId);
  if (!asset) throw createApiError('Asset not found', 404);

  const project = await projectRepository.findById(asset.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Asset not found', 404);
  }

  const ceImage = await ceImageRepository.findByAssetId(assetId);

  if (!ceImage) {
    res.json({ authorshipStatus: null, message: 'Not yet classified' });
    return;
  }

  res.json({
    id: ceImage.id,
    assetId: ceImage.assetId,
    authorshipStatus: ceImage.authorshipStatus,
    authorshipEvidence: ceImage.authorshipEvidence,
    userDeclared: ceImage.userDeclared,
    syntheticConfidence: ceImage.syntheticConfidence,
    classifiedAt: ceImage.classifiedAt,
    needsDeclaration: !ceImage.userDeclared && ceImage.authorshipStatus === 'UNVERIFIED',
  });
}));

/**
 * POST /authorship/declare/:assetId
 * User declares whether they are the original creator.
 * This is prompted ONCE for images with missing EXIF and no conflict.
 * 
 * Body: { declared: boolean }
 */
authorshipRouter.post('/declare/:assetId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { assetId } = req.params;
  const { declared } = req.body;

  if (typeof declared !== 'boolean') {
    throw createApiError('declared must be a boolean', 400);
  }

  const asset = await assetRepository.findById(assetId);
  if (!asset) throw createApiError('Asset not found', 404);

  const project = await projectRepository.findById(asset.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Asset not found', 404);
  }

  const ceImage = await ceImageRepository.findByAssetId(assetId);
  if (!ceImage) {
    throw createApiError('Image has not been classified yet', 400);
  }

  // Can NEVER override SYNTHETIC_AI via declaration
  if (ceImage.authorshipStatus === 'SYNTHETIC_AI') {
    throw createApiError(
      'Synthetic images cannot be declared as original. This is intentional.',
      403
    );
  }

  // Can NEVER override VERIFIED_ORIGINAL (already verified)
  if (ceImage.authorshipStatus === 'VERIFIED_ORIGINAL') {
    res.json({ message: 'Already verified as original', authorshipStatus: ceImage.authorshipStatus });
    return;
  }

  // Apply declaration via the classifier
  const classifier = new AuthorshipClassifier();
  const currentSignals = (ceImage.authorshipEvidence as any)?.signals || {
    exifPresent: false,
    aiSignaturesFound: [],
  };
  const result = classifier.applyUserDeclaration(
    ceImage.authorshipStatus as AuthorshipStatus,
    declared,
    currentSignals
  );

  // Log declaration events
  await ceEventLogRepository.create({
    userId,
    projectId: asset.projectId,
    imageId: ceImage.id,
    eventType: CeEventType.USER_DECLARATION_SET,
    details: {
      assetId,
      declared,
      previousStatus: ceImage.authorshipStatus,
      newStatus: result.status,
      reasonCodes: result.evidence.reasonCodes,
    },
  });

  // Update the image state
  await ceImageRepository.updateAuthorshipStatus(ceImage.id, {
    authorshipStatus: result.status,
    authorshipEvidence: result.evidence,
    userDeclared: declared,
    classifiedBy: 'user',
  });

  res.json({
    authorshipStatus: result.status,
    evidence: result.evidence,
    message: declared
      ? 'Declared as creator. Status: DECLARED_BY_USER (not machine-verified).'
      : 'Declaration declined. Status remains UNVERIFIED.',
  });
}));

/**
 * GET /authorship/audit/:projectId
 * Get audit trail for a project (grouped by image/export)
 */
authorshipRouter.get('/audit/:projectId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  const limit = parseInt(req.query.limit as string) || 100;

  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }

  const events = await ceEventLogRepository.findByProject(projectId, limit);

  res.json({
    events: events.map(e => ({
      id: e.id,
      eventType: e.eventType,
      imageId: e.imageId,
      exportId: e.exportId,
      details: e.details,
      createdAt: e.createdAt,
    })),
  });
}));

/**
 * GET /authorship/audit/image/:imageId
 * Get audit trail for a specific CE image
 */
authorshipRouter.get('/audit/image/:imageId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { imageId } = req.params;

  const ceImage = await ceImageRepository.findById(imageId);
  if (!ceImage || ceImage.userId !== userId) {
    throw createApiError('Image not found', 404);
  }

  const events = await ceEventLogRepository.findByImage(imageId);

  res.json({
    image: {
      id: ceImage.id,
      assetId: ceImage.assetId,
      authorshipStatus: ceImage.authorshipStatus,
      authorshipEvidence: ceImage.authorshipEvidence,
      userDeclared: ceImage.userDeclared,
      classifiedAt: ceImage.classifiedAt,
    },
    events: events.map(e => ({
      id: e.id,
      eventType: e.eventType,
      details: e.details,
      createdAt: e.createdAt,
    })),
  });
}));

/**
 * POST /authorship/validate-export
 * Validate an export payload against authorship rules BEFORE exporting.
 * 
 * Body: {
 *   assetIds: string[],
 *   exportType: 'metadata' | 'case_study' | 'wp_post' | 'aeo_block',
 *   textContent?: string[]
 * }
 */
authorshipRouter.post('/validate-export', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { assetIds, exportType, textContent } = req.body;

  if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
    throw createApiError('assetIds is required and must be a non-empty array', 400);
  }

  const exportGuard = new ExportGuard();
  const results: Array<{
    assetId: string;
    authorshipStatus: string;
    allowed: boolean;
    violations: string[];
    reasonCodes: string[];
  }> = [];

  let anyBlocked = false;

  for (const assetId of assetIds) {
    const ceImage = await ceImageRepository.findByAssetId(assetId);
    const status = ceImage?.authorshipStatus as AuthorshipStatus || AuthorshipStatus.UNVERIFIED;

    const validation = exportGuard.validateAuthorshipClaims({
      authorshipStatus: status,
      exportType: exportType || 'metadata',
      textContent: textContent || [],
    });

    if (!validation.allowed) {
      anyBlocked = true;
    }

    results.push({
      assetId,
      authorshipStatus: status,
      allowed: validation.allowed,
      violations: validation.violations,
      reasonCodes: validation.reasonCodes,
    });
  }

  res.json({
    allAllowed: !anyBlocked,
    results,
    message: anyBlocked
      ? 'Export blocked for one or more assets. This refusal is intentional and correct.'
      : 'All assets passed authorship validation.',
  });
}));

/**
 * GET /authorship/permissions/:assetId
 * Get metadata permissions for a specific asset based on authorship status
 */
authorshipRouter.get('/permissions/:assetId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { assetId } = req.params;

  const asset = await assetRepository.findById(assetId);
  if (!asset) throw createApiError('Asset not found', 404);

  const project = await projectRepository.findById(asset.projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Asset not found', 404);
  }

  const ceImage = await ceImageRepository.findByAssetId(assetId);
  const status = ceImage?.authorshipStatus as AuthorshipStatus || AuthorshipStatus.UNVERIFIED;

  const rules = new MetadataEmbeddingRules();
  const permissions = rules.getPermissions(status);

  const governor = new LanguageGovernor();
  const allowedPhrases = governor.getAllowedPhrases(status);

  res.json({
    authorshipStatus: status,
    permissions,
    allowedPhrases,
    promptInstruction: governor.getPromptInstruction(status),
  });
}));
