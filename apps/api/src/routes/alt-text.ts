/**
 * Alt Text Engine Routes
 *
 * Endpoints:
 *   POST   /alt-text/:projectId/generate/:assetId  — Generate alt text for an asset
 *   POST   /alt-text/:projectId/preview             — Preview alt text from raw input (no DB)
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import {
  projectRepository,
  assetRepository,
  metadataResultRepository,
  visionResultRepository,
} from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { createAltTextGenerator } from '@contextembed/providers';
import type { AltTextInput, AltTextMode, VisionAnalysis } from '@contextembed/core';

export const altTextRouter: IRouter = Router();

// ============================================================================
// Schemas
// ============================================================================

const GenerateSchema = z.object({
  mode: z.enum(['seo', 'accessibility', 'editorial', 'social']).default('seo'),
  focusKeyphrase: z.string().max(60).optional(),
});

const PreviewSchema = z.object({
  headline: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string()).min(1),
  sceneType: z.string().optional(),
  subjects: z.array(z.string()).optional(),
  mood: z.string().optional(),
  brandName: z.string().optional(),
  industry: z.string().optional(),
  userComment: z.string().optional(),
  focusKeyphrase: z.string().max(60).optional(),
  mode: z.enum(['seo', 'accessibility', 'editorial', 'social']).default('seo'),
});

// ============================================================================
// Helpers
// ============================================================================

async function verifyProjectOwnership(userId: string, projectId: string) {
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  return project;
}

// ============================================================================
// POST /alt-text/:projectId/generate/:assetId
// ============================================================================

altTextRouter.post('/:projectId/generate/:assetId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId, assetId } = req.params;

  await verifyProjectOwnership(userId, projectId);

  const input = GenerateSchema.parse(req.body);

  // Load asset + metadata
  const asset = await assetRepository.findById(assetId);
  if (!asset || asset.projectId !== projectId) {
    throw createApiError('Asset not found', 404);
  }

  const metadataResult = await metadataResultRepository.findLatestByAsset(assetId);
  if (!metadataResult) {
    throw createApiError('No metadata found. Process the asset first.', 400);
  }

  const meta = metadataResult.result as Record<string, any>;

  // Optionally grab vision result for richer input
  const visionResult = await visionResultRepository.findLatestByAsset(assetId);
  const vision = visionResult?.result as unknown as VisionAnalysis | undefined;

  // Build alt text input
  const altInput: AltTextInput = {
    headline: meta.headline || '',
    description: meta.description || '',
    keywords: meta.keywords || [],
    sceneType: (vision?.scene as any)?.type,
    subjects: vision?.subjects?.map((s: any) => s.description),
    mood: Array.isArray((vision as any)?.mood) ? (vision as any).mood[0] : undefined,
    brandName: meta.entities?.brand?.name,
    industry: undefined,
    userComment: asset.userComment || undefined,
    focusKeyphrase: input.focusKeyphrase,
  };

  const generator = createAltTextGenerator();
  const result = await generator.generate(altInput, input.mode as AltTextMode);

  // If successful, merge into the stored metadata result
  if (result.success && result.output) {
    const enriched = {
      ...meta,
      altTextShort: result.output.alt_text_short,
      altTextLong: result.output.alt_text_accessibility,
      altText: result.output,
    };

    await metadataResultRepository.update(metadataResult.id, {
      result: enriched as any,
    });
  }

  res.json({
    success: result.success,
    output: result.output,
    mode: result.mode,
    usedFallback: result.usedFallback,
    durationMs: result.durationMs,
    tokensUsed: result.tokensUsed,
    error: result.error,
  });
}));

// ============================================================================
// POST /alt-text/:projectId/preview — stateless preview (no DB write)
// ============================================================================

altTextRouter.post('/:projectId/preview', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  await verifyProjectOwnership(userId, projectId);

  const input = PreviewSchema.parse(req.body);

  const altInput: AltTextInput = {
    headline: input.headline,
    description: input.description,
    keywords: input.keywords,
    sceneType: input.sceneType,
    subjects: input.subjects,
    mood: input.mood,
    brandName: input.brandName,
    industry: input.industry,
    userComment: input.userComment,
    focusKeyphrase: input.focusKeyphrase,
  };

  const generator = createAltTextGenerator();
  const result = await generator.generate(altInput, input.mode as AltTextMode);

  res.json({
    success: result.success,
    output: result.output,
    mode: result.mode,
    usedFallback: result.usedFallback,
    durationMs: result.durationMs,
    tokensUsed: result.tokensUsed,
    error: result.error,
  });
}));
