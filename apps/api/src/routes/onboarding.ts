/**
 * Onboarding routes
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { 
  projectRepository, 
  onboardingProfileRepository,
  userProfileRepository,
  Prisma,
} from '@contextembed/db';
import { 
  ConfirmedContextSchema,
  RightsInfoSchema,
  OutputPreferencesSchema,
  calculateCompletenessScore,
  isReadyForImport,
} from '@contextembed/core';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { auditUrl } from '../services/url-auditor';

export const onboardingRouter: IRouter = Router();

/**
 * Get onboarding profile for a project
 */
onboardingRouter.get('/:projectId', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const profile = await onboardingProfileRepository.findByProjectId(projectId);
  
  if (!profile) {
    res.json({ profile: null });
    return;
  }
  
  res.json({
    profile: {
      ...profile,
      readyForImport: isReadyForImport({
        confirmedContext: profile.confirmedContext as { brandName?: string },
        rights: profile.rights as { 
          creatorName?: string; 
          copyrightTemplate?: string; 
          creditTemplate?: string 
        },
      }),
    },
  });
}));

/**
 * Initialize onboarding profile
 * Pre-populates from user's profile defaults if available
 */
onboardingRouter.post('/:projectId/init', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  // Check if profile already exists
  const existing = await onboardingProfileRepository.findByProjectId(projectId);
  if (existing) {
    res.json({ profile: existing });
    return;
  }
  
  // Get user's profile defaults
  const userProfile = await userProfileRepository.findByUserId(userId);
  
  // Create initial profile with user defaults pre-populated
  const profile = await onboardingProfileRepository.create({
    projectId,
    projectName: project.name,
    primaryGoal: project.goal,
    confirmedContext: { 
      brandName: userProfile?.businessName || '',
      tagline: userProfile?.tagline || '',
      industry: userProfile?.industry || '',
      niche: userProfile?.niche || '',
      services: userProfile?.services || [],
      targetAudience: userProfile?.targetAudience || '',
      brandVoice: userProfile?.brandVoice || '',
      // Location defaults from user profile
      location: {
        city: userProfile?.city || '',
        state: userProfile?.state || '',
        country: userProfile?.country || '',
      },
      // Authority defaults from user profile
      yearsExperience: userProfile?.yearsExperience || undefined,
      credentials: userProfile?.credentials ? [userProfile.credentials] : [],
      specializations: userProfile?.specializations || [],
      keyDifferentiator: userProfile?.keyDifferentiator || '',
      pricePoint: userProfile?.pricePoint || '',
      brandStory: userProfile?.brandStory || '',
      serviceArea: userProfile?.serviceArea || '',
      defaultEventType: userProfile?.defaultEventType || '',
      typicalDeliverables: userProfile?.typicalDeliverables || [],
    },
    rights: {
      creatorName: userProfile?.creatorName || '',
      studioName: userProfile?.businessName || '',
      copyrightTemplate: userProfile?.copyrightTemplate || '',
      creditTemplate: userProfile?.creditTemplate || '',
      usageTermsTemplate: userProfile?.usageTerms || '',
      website: userProfile?.website || '',
      email: userProfile?.contactEmail || '',
    },
    preferences: {
      primaryLanguage: userProfile?.primaryLanguage || 'en',
      keywordStyle: (userProfile?.keywordStyle as 'short' | 'long' | 'mixed') || 'mixed',
      maxKeywords: userProfile?.maxKeywords || 25,
      locationBehavior: 'strict',
      overwriteOriginals: false,
      includeReasoning: true,
      outputFormat: 'copy',
    },
  });
  
  res.status(201).json({ profile });
}));

/**
 * Run URL audit
 */
onboardingRouter.post('/:projectId/url-audit', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  console.log('URL Audit request:', { projectId, userId, body: req.body });
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    console.log('Project not found or unauthorized:', { project: !!project, projectUserId: project?.userId, userId });
    throw createApiError('Project not found', 404);
  }
  
  const UrlAuditInput = z.object({
    url: z.string().url(),
  });
  
  const { url } = UrlAuditInput.parse(req.body);
  console.log('Auditing URL:', url);
  
  // Run the audit
  const auditResult = await auditUrl(url);
  console.log('Audit result:', { success: auditResult.success, error: auditResult.error });
  
  // Upsert profile with audit result (creates if doesn't exist)
  console.log('Upserting profile for project:', projectId);
  await onboardingProfileRepository.upsertForUrlAudit(
    projectId,
    project.name,
    project.goal,
    url,
    auditResult as unknown as Prisma.InputJsonValue,
  );
  console.log('Profile upserted successfully');
  
  res.json({ auditResult });
}));

/**
 * Update confirmed context
 */
onboardingRouter.patch('/:projectId/context', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  // Use partial schema with required brandName
  const ContextInputSchema = ConfirmedContextSchema.partial().extend({
    brandName: z.string().min(1).max(256),
  });
  
  const context = ContextInputSchema.parse(req.body);
  
  const profile = await onboardingProfileRepository.update(projectId, {
    confirmedContext: context as unknown as Prisma.InputJsonValue,
  });
  
  // Recalculate completeness
  const score = calculateCompletenessScore({
    projectName: profile.projectName,
    primaryGoal: profile.primaryGoal,
    confirmedContext: context,
    rights: profile.rights as { 
      creatorName?: string; 
      copyrightTemplate?: string; 
      creditTemplate?: string 
    },
    preferences: profile.preferences as { primaryLanguage?: string },
  });
  
  await onboardingProfileRepository.update(projectId, {
    completenessScore: score,
  });
  
  res.json({ profile: { ...profile, completenessScore: score } });
}));

/**
 * Update rights info
 */
onboardingRouter.patch('/:projectId/rights', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  // Helper to normalize URLs (add https:// if missing)
  const normalizeUrl = (url: string | undefined): string | undefined => {
    if (!url || url.trim() === '') return undefined;
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };
  
  // Define a permissive schema for rights update - website is just a string
  const RightsInputSchema = z.object({
    creatorName: z.string().min(1).max(256),
    studioName: z.string().max(256).optional(),
    copyrightTemplate: z.string().min(1).max(256),
    creditTemplate: z.string().min(1).max(256),
    usageTermsTemplate: z.string().max(2000).optional(),
    website: z.string().max(500).optional(),
    email: z.string().email().optional().or(z.literal('')),
  });
  
  // Normalize and clean the input
  const cleanedBody: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(req.body)) {
    if (value === undefined || value === null || value === '') continue;
    if (key === 'website') {
      cleanedBody[key] = normalizeUrl(value as string);
    } else {
      cleanedBody[key] = value;
    }
  }
  
  const rights = RightsInputSchema.parse(cleanedBody);
  
  const profile = await onboardingProfileRepository.update(projectId, {
    rights: rights as unknown as Prisma.InputJsonValue,
  });
  
  // Recalculate completeness
  const score = calculateCompletenessScore({
    projectName: profile.projectName,
    primaryGoal: profile.primaryGoal,
    confirmedContext: profile.confirmedContext as { brandName?: string },
    rights,
    preferences: profile.preferences as { primaryLanguage?: string },
  });
  
  await onboardingProfileRepository.update(projectId, {
    completenessScore: score,
  });
  
  res.json({ profile: { ...profile, completenessScore: score } });
}));

/**
 * Update preferences
 */
onboardingRouter.patch('/:projectId/preferences', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const preferences = OutputPreferencesSchema.parse(req.body);
  
  const profile = await onboardingProfileRepository.update(projectId, {
    preferences,
  });
  
  res.json({ profile });
}));

/**
 * Complete onboarding
 */
onboardingRouter.post('/:projectId/complete', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { projectId } = req.params;
  
  // Verify project ownership
  const project = await projectRepository.findById(projectId);
  if (!project || project.userId !== userId) {
    throw createApiError('Project not found', 404);
  }
  
  const profile = await onboardingProfileRepository.findByProjectId(projectId);
  
  if (!profile) {
    throw createApiError('Onboarding profile not found', 404);
  }
  
  // Check if ready
  const readiness = isReadyForImport({
    confirmedContext: profile.confirmedContext as { brandName?: string },
    rights: profile.rights as { 
      creatorName?: string; 
      copyrightTemplate?: string; 
      creditTemplate?: string 
    },
  });
  
  if (!readiness.ready) {
    throw createApiError(
      `Missing required fields: ${readiness.missing.join(', ')}`,
      400,
      'INCOMPLETE_ONBOARDING'
    );
  }
  
  // Mark as complete
  await onboardingProfileRepository.update(projectId, {
    isComplete: true,
    completenessScore: 100,
  });
  
  await projectRepository.update(projectId, {
    onboardingCompleted: true,
  });
  
  res.json({ success: true });
}));
