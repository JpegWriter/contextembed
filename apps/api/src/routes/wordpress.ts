/**
 * WordPress Integration Routes
 * 
 * Endpoints:
 *   GET    /wordpress/:projectId/config     — Get WP config (password masked)
 *   PUT    /wordpress/:projectId/config     — Create/update WP config
 *   DELETE /wordpress/:projectId/config     — Remove WP config
 *   POST   /wordpress/:projectId/health     — Test WP connection
 *   PATCH  /wordpress/:projectId/toggle     — Toggle auto-inject on/off
 *   PATCH  /wordpress/:projectId/strategy   — Change alt text strategy
 *   POST   /wordpress/:projectId/inject/:assetId — Inject metadata into WP for a specific asset
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import {
  wordpressConfigRepository,
  projectRepository,
  assetRepository,
} from '@contextembed/db';
import { metadataResultRepository } from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { encryptPassword, decryptPassword } from '../services/crypto';
import { WordPressClient, extractMediaPayloadFromMetadata } from '@contextembed/providers';
import type { WordPressConnectionConfig, WordPressAltStrategy } from '@contextembed/core';

export const wordpressRouter: IRouter = Router();

// ============================================================================
// Schemas
// ============================================================================

const WpConfigSchema = z.object({
  siteUrl: z.string().url('Must be a valid URL (e.g. https://example.com)'),
  authMethod: z.enum(['application_password', 'basic_auth']).default('application_password'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password / Application Password is required'),
  autoInjectAltText: z.boolean().default(true),
  altStrategy: z.enum(['seo_optimized', 'accessibility_focused', 'hybrid']).default('seo_optimized'),
});

const ToggleSchema = z.object({
  autoInjectAltText: z.boolean(),
});

const StrategySchema = z.object({
  altStrategy: z.enum(['seo_optimized', 'accessibility_focused', 'hybrid']),
});

// ============================================================================
// Helpers
// ============================================================================

/** Verify the user owns the project */
async function verifyProjectOwnership(userId: string, projectId: string) {
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  return project;
}

/** Build a WordPressConnectionConfig from the DB row (decrypts password) */
function toConnectionConfig(row: {
  siteUrl: string;
  authMethod: string;
  username: string;
  encryptedPassword: string;
  autoInjectAltText: boolean;
  altStrategy: string;
}): WordPressConnectionConfig {
  return {
    siteUrl: row.siteUrl,
    authMethod: row.authMethod as 'application_password' | 'basic_auth',
    username: row.username,
    password: decryptPassword(row.encryptedPassword),
    autoInjectAltText: row.autoInjectAltText,
    altStrategy: row.altStrategy as WordPressAltStrategy,
  };
}

// ============================================================================
// GET /wordpress/:projectId/config
// ============================================================================

wordpressRouter.get('/:projectId/config', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  await verifyProjectOwnership(userId, projectId);

  const config = await wordpressConfigRepository.findByProjectId(projectId);

  if (!config) {
    res.json({ configured: false, config: null });
    return;
  }

  // Return config with masked password
  res.json({
    configured: true,
    config: {
      siteUrl: config.siteUrl,
      authMethod: config.authMethod,
      username: config.username,
      passwordSet: true,
      autoInjectAltText: config.autoInjectAltText,
      altStrategy: config.altStrategy,
      lastHealthCheck: config.lastHealthCheck,
      lastHealthStatus: config.lastHealthStatus,
      lastError: config.lastError,
    },
  });
}));

// ============================================================================
// PUT /wordpress/:projectId/config
// ============================================================================

wordpressRouter.put('/:projectId/config', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  await verifyProjectOwnership(userId, projectId);

  const input = WpConfigSchema.parse(req.body);

  const encrypted = encryptPassword(input.password);

  const config = await wordpressConfigRepository.upsert(projectId, {
    siteUrl: input.siteUrl,
    authMethod: input.authMethod,
    username: input.username,
    encryptedPassword: encrypted,
    autoInjectAltText: input.autoInjectAltText,
    altStrategy: input.altStrategy,
  });

  res.json({
    success: true,
    config: {
      siteUrl: config.siteUrl,
      authMethod: config.authMethod,
      username: config.username,
      passwordSet: true,
      autoInjectAltText: config.autoInjectAltText,
      altStrategy: config.altStrategy,
    },
  });
}));

// ============================================================================
// DELETE /wordpress/:projectId/config
// ============================================================================

wordpressRouter.delete('/:projectId/config', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  await verifyProjectOwnership(userId, projectId);

  try {
    await wordpressConfigRepository.delete(projectId);
  } catch {
    // Already deleted or doesn't exist
  }

  res.json({ success: true });
}));

// ============================================================================
// POST /wordpress/:projectId/health — test connection
// ============================================================================

wordpressRouter.post('/:projectId/health', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  await verifyProjectOwnership(userId, projectId);

  const config = await wordpressConfigRepository.findByProjectId(projectId);
  if (!config) {
    throw createApiError('WordPress not configured for this project', 400);
  }

  const client = new WordPressClient(toConnectionConfig(config));
  const result = await client.healthCheck();

  // Persist health status
  await wordpressConfigRepository.updateHealthStatus(
    projectId,
    result.healthy,
    result.error,
  );

  res.json(result);
}));

// ============================================================================
// PATCH /wordpress/:projectId/toggle
// ============================================================================

wordpressRouter.patch('/:projectId/toggle', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  await verifyProjectOwnership(userId, projectId);

  const input = ToggleSchema.parse(req.body);
  const config = await wordpressConfigRepository.updateToggle(projectId, input.autoInjectAltText);

  res.json({
    success: true,
    autoInjectAltText: config.autoInjectAltText,
  });
}));

// ============================================================================
// PATCH /wordpress/:projectId/strategy
// ============================================================================

wordpressRouter.patch('/:projectId/strategy', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;

  await verifyProjectOwnership(userId, projectId);

  const input = StrategySchema.parse(req.body);
  const config = await wordpressConfigRepository.updateStrategy(projectId, input.altStrategy);

  res.json({
    success: true,
    altStrategy: config.altStrategy,
  });
}));

// ============================================================================
// POST /wordpress/:projectId/inject/:assetId
// Inject metadata into WordPress for a specific asset.
// If the asset is already in WP (by prior upload), updates in-place.
// If not, uploads the embedded file then injects metadata.
// ============================================================================

wordpressRouter.post('/:projectId/inject/:assetId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId, assetId } = req.params;

  await verifyProjectOwnership(userId, projectId);

  // 1. Load WP config
  const wpConfig = await wordpressConfigRepository.findByProjectId(projectId);
  if (!wpConfig) {
    throw createApiError('WordPress not configured for this project', 400);
  }

  if (!wpConfig.autoInjectAltText) {
    throw createApiError('WordPress auto-inject is disabled. Enable it in settings.', 400);
  }

  // 2. Load asset + metadata
  const asset = await assetRepository.findById(assetId);
  if (!asset || asset.projectId !== projectId) {
    throw createApiError('Asset not found', 404);
  }

  if (asset.status !== 'completed' && asset.status !== 'approved') {
    throw createApiError('Asset must be processed before WordPress injection', 400);
  }

  const metadataResult = await metadataResultRepository.findLatestByAsset(assetId);
  if (!metadataResult) {
    throw createApiError('No metadata found for this asset. Process it first.', 400);
  }

  // 3. Build WP client + payload
  const connectionConfig = toConnectionConfig(wpConfig);
  const client = new WordPressClient(connectionConfig);
  const strategy = connectionConfig.altStrategy;

  const metaJson = metadataResult.result as Record<string, unknown>;
  const payload = extractMediaPayloadFromMetadata(metaJson, strategy);

  // 4. Check if we already have a WP media ID for this asset
  const existingWpMediaId = req.body?.wpMediaId as number | undefined;

  if (existingWpMediaId) {
    // Inject into existing WP media item
    const injection = await client.injectIntoExisting(existingWpMediaId, payload);
    res.json({ success: injection.success, injection });
    return;
  }

  // 5. No existing WP media — we just inject metadata.
  //    The actual file upload to WP is handled separately by the user or a future upload route.
  //    For now, this route requires a wpMediaId.
  throw createApiError(
    'wpMediaId is required. Upload the image to WordPress first, then pass the media ID to inject metadata.',
    400,
  );
}));
