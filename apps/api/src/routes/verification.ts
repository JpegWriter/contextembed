/**
 * Verification Routes
 * 
 * Authenticated endpoints for managing public verification tokens.
 * Public verification endpoint for forensic-grade proof checking.
 * 
 * Security Notes:
 * - Authenticated routes require project ownership
 * - Public endpoint is rate-limited and logged
 * - noindex headers prevent search engine indexing
 * - Consistent error shapes prevent existence leakage
 */

import { Router, type IRouter, Request, Response } from 'express';
import { z } from 'zod';
import { prisma, projectRepository } from '@contextembed/db';
import {
  createVerificationOperations,
  hashIP,
  sanitizeUserAgent,
  buildVerificationUrl,
  DEFAULT_RATE_LIMIT,
  PublicVerificationResponse,
  PublicVerificationErrorResponse,
} from '@contextembed/core';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

export const verificationRouter: IRouter = Router();

// Initialize verification operations with Prisma
const verificationOps = createVerificationOperations(prisma);

// ============================================
// Authenticated Routes (require auth middleware)
// ============================================

/**
 * Update project verification default setting
 * POST /api/verification/projects/:projectId/default
 */
verificationRouter.post(
  '/projects/:projectId/default',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { projectId } = req.params;
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    
    // Verify ownership
    const project = await projectRepository.findById(projectId);
    if (!project || project.userId !== userId) {
      throw createApiError('Project not found', 404);
    }
    
    const result = await verificationOps.updateProjectVerificationDefault(projectId, enabled);
    
    if (!result.success) {
      throw createApiError(result.error || 'Failed to update setting', 500);
    }
    
    res.json({ success: true, publicVerificationDefaultEnabled: enabled });
  })
);

/**
 * Update project embed verification link setting
 * POST /api/verification/projects/:projectId/embed-link
 */
verificationRouter.post(
  '/projects/:projectId/embed-link',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { projectId } = req.params;
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    
    // Verify ownership
    const project = await projectRepository.findById(projectId);
    if (!project || project.userId !== userId) {
      throw createApiError('Project not found', 404);
    }
    
    const result = await verificationOps.updateProjectEmbedVerificationLink(projectId, enabled);
    
    if (!result.success) {
      throw createApiError(result.error || 'Failed to update setting', 500);
    }
    
    res.json({ success: true, embedVerificationLink: enabled });
  })
);

/**
 * Enable/disable verification for a specific asset
 * POST /api/verification/assets/:assetId
 */
verificationRouter.post(
  '/assets/:assetId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { assetId } = req.params;
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    
    // Find asset and verify ownership through project
    const asset = await prisma.growthImage.findUnique({
      where: { id: assetId },
      include: { project: true },
    });
    
    if (!asset || asset.project.userId !== userId) {
      throw createApiError('Asset not found', 404);
    }
    
    let result;
    if (enabled) {
      result = await verificationOps.enableVerification(assetId);
    } else {
      result = await verificationOps.disableVerification(assetId);
    }
    
    if (!result.success) {
      throw createApiError(result.error || 'Failed to update verification', 500);
    }
    
    // Return state including verification URL if enabled
    const state = await verificationOps.getVerificationState(assetId);
    
    res.json({
      success: true,
      enabled,
      verificationUrl: enabled && state?.token ? buildVerificationUrl(state.token) : null,
      createdAt: state?.createdAt,
      revokedAt: state?.revokedAt,
    });
  })
);

/**
 * Rotate verification token for an asset
 * POST /api/verification/assets/:assetId/rotate
 */
verificationRouter.post(
  '/assets/:assetId/rotate',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { assetId } = req.params;
    
    // Find asset and verify ownership through project
    const asset = await prisma.growthImage.findUnique({
      where: { id: assetId },
      include: { project: true },
    });
    
    if (!asset || asset.project.userId !== userId) {
      throw createApiError('Asset not found', 404);
    }
    
    const result = await verificationOps.rotateVerificationToken(assetId);
    
    if (!result.success) {
      throw createApiError(result.error || 'Failed to rotate token', 500);
    }
    
    res.json({
      success: true,
      verificationUrl: result.newToken ? buildVerificationUrl(result.newToken) : null,
      createdAt: result.createdAt,
      previousTokenRevoked: !!result.oldToken,
    });
  })
);

/**
 * Get verification state for an asset (authenticated)
 * GET /api/verification/assets/:assetId
 */
verificationRouter.get(
  '/assets/:assetId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req as AuthenticatedRequest;
    const { assetId } = req.params;
    
    // Find asset and verify ownership through project
    const asset = await prisma.growthImage.findUnique({
      where: { id: assetId },
      include: { project: true },
    });
    
    if (!asset || asset.project.userId !== userId) {
      throw createApiError('Asset not found', 404);
    }
    
    const state = await verificationOps.getVerificationState(assetId);
    
    res.json({
      enabled: state?.enabled ?? false,
      verificationUrl: state?.token && !state.revokedAt ? buildVerificationUrl(state.token) : null,
      createdAt: state?.createdAt,
      revokedAt: state?.revokedAt,
      lastCheckedAt: state?.lastCheckedAt,
    });
  })
);

// ============================================
// Public Verification Endpoint (NO AUTH)
// ============================================

/**
 * Verify an asset by token
 * GET /verify/:token
 * 
 * Optional query params:
 * - sha256: Hex-encoded SHA-256 checksum for integrity confirmation
 * 
 * Security:
 * - Rate limited by IP hash and token
 * - All attempts logged
 * - noindex headers prevent indexing
 * - Consistent error shapes prevent existence leakage
 */
verificationRouter.get(
  '/public/:token',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    const sha256Query = req.query.sha256 as string | undefined;
    
    // Set security headers immediately
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Validate token format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      // Return consistent not_found to prevent format-based enumeration
      const errorResponse: PublicVerificationErrorResponse = {
        status: 'not_found',
        message: 'Verification record not found',
      };
      res.status(404).json(errorResponse);
      return;
    }
    
    // Hash IP for rate limiting and logging
    const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
      || req.socket.remoteAddress 
      || 'unknown';
    const ipHash = hashIP(clientIP);
    const userAgent = sanitizeUserAgent(req.headers['user-agent']);
    
    // Check rate limits
    const { byIP, byToken } = await verificationOps.checkRateLimit(
      ipHash, 
      token, 
      DEFAULT_RATE_LIMIT.windowMs
    );
    
    if (byIP >= DEFAULT_RATE_LIMIT.maxPerIP || byToken >= DEFAULT_RATE_LIMIT.maxPerToken) {
      // Log rate limit hit
      await verificationOps.logVerificationAttempt({
        verificationToken: token,
        assetId: 'rate_limited',
        ipHash,
        userAgent: userAgent || undefined,
        result: 'rate_limited',
      });
      
      const errorResponse: PublicVerificationErrorResponse = {
        status: 'rate_limited',
        message: 'Too many verification requests. Please try again later.',
      };
      res.status(429).json(errorResponse);
      return;
    }
    
    // Find asset by token
    const asset = await verificationOps.findByVerificationToken(token);
    
    // Not found - log and return consistent error
    if (!asset) {
      await verificationOps.logVerificationAttempt({
        verificationToken: token,
        assetId: 'not_found',
        ipHash,
        userAgent: userAgent || undefined,
        result: 'not_found',
      });
      
      const errorResponse: PublicVerificationErrorResponse = {
        status: 'not_found',
        message: 'Verification record not found',
      };
      res.status(404).json(errorResponse);
      return;
    }
    
    // Check if revoked
    if (asset.verificationRevokedAt) {
      await verificationOps.logVerificationAttempt({
        verificationToken: token,
        assetId: asset.id,
        projectId: asset.projectId,
        ipHash,
        userAgent: userAgent || undefined,
        result: 'revoked',
      });
      
      const errorResponse: PublicVerificationErrorResponse = {
        status: 'revoked',
        message: 'This verification link has been revoked',
      };
      res.status(410).json(errorResponse);
      return;
    }
    
    // Determine integrity status
    let integrity: 'checksum_match_confirmed' | 'record_confirmed' = 'record_confirmed';
    let checksumMatched: boolean | undefined;
    
    if (sha256Query) {
      // TODO: Compare with stored checksum if available
      // For now, we just record that checksum was provided
      // Full implementation would compare against export manifest checksums
      checksumMatched = undefined; // Would be true/false after comparison
      // If checksumMatched === true, set integrity = 'checksum_match_confirmed'
    }
    
    // Log successful verification
    await verificationOps.logVerificationAttempt({
      verificationToken: token,
      assetId: asset.id,
      projectId: asset.projectId,
      ipHash,
      userAgent: userAgent || undefined,
      result: 'verified',
      checksumProvided: !!sha256Query,
      checksumMatched,
    });
    
    // Update last checked timestamp
    await verificationOps.updateLastChecked(asset.id);
    
    // Build minimal response
    const response: PublicVerificationResponse = {
      status: 'verified',
      assetId: asset.id,
      aiGenerated: asset.aiGenerated,
      governanceStatus: asset.governanceStatus,
      embeddedOn: asset.createdAt.toISOString().split('T')[0], // Date only
      integrity,
    };
    
    // Include business name only if user profile exists and has businessName
    const businessName = asset.project?.user?.profile?.businessName;
    if (businessName) {
      response.embeddedBy = businessName;
    }
    
    res.json(response);
  })
);
