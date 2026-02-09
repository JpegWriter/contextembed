/**
 * User Profile Routes
 * Manages user-level business defaults (not project-specific)
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { userProfileRepository } from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { auditUrl } from '../services/url-auditor';

export const userProfileRouter: IRouter = Router();

// Validation schemas
const updateProfileSchema = z.object({
  // Business Identity
  businessName: z.string().optional(),
  tagline: z.string().optional(),
  industry: z.string().optional(),
  niche: z.string().optional(),
  services: z.string().optional(),
  targetAudience: z.string().optional(),
  brandVoice: z.string().optional(),
  
  // Location
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  serviceArea: z.string().optional(),
  
  // Authority
  yearsExperience: z.string().optional(),
  credentials: z.string().optional(),
  specializations: z.string().optional(),
  awardsRecognition: z.string().optional(),
  clientTypes: z.string().optional(),
  keyDifferentiator: z.string().optional(),
  pricePoint: z.string().optional(),
  brandStory: z.string().optional(),
  
  // Rights Defaults
  creatorName: z.string().optional(),
  copyrightTemplate: z.string().optional(),
  creditTemplate: z.string().optional(),
  usageTerms: z.string().optional(),
  website: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  
  // Preferences
  primaryLanguage: z.string().optional(),
  keywordStyle: z.enum(['short', 'long', 'mixed']).optional(),
  maxKeywords: z.number().min(5).max(30).optional(),
  defaultEventType: z.string().optional(),
  typicalDeliverables: z.string().optional(),
});

/**
 * GET /user-profile
 * Get current user's profile (creates if doesn't exist)
 */
userProfileRouter.get('/', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  let profile = await userProfileRepository.findByUserId(userId);
  
  // Auto-create profile if it doesn't exist
  if (!profile) {
    profile = await userProfileRepository.create(userId);
  }
  
  res.json({ profile });
}));

/**
 * GET /user-profile/onboarding-status
 * Check if user has completed onboarding
 */
userProfileRouter.get('/onboarding-status', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const completed = await userProfileRepository.isOnboardingComplete(userId);
  
  res.json({ 
    onboardingCompleted: completed,
    redirectTo: completed ? null : '/dashboard/onboarding',
  });
}));

/**
 * PATCH /user-profile
 * Update user profile (partial update)
 */
userProfileRouter.patch('/', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  const data = updateProfileSchema.parse(req.body);
  
  const profile = await userProfileRepository.upsert(userId, data);
  
  res.json({ profile });
}));

/**
 * POST /user-profile/complete-onboarding
 * Mark onboarding as complete
 */
userProfileRouter.post('/complete-onboarding', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  // Validate that required fields are filled
  const profile = await userProfileRepository.findByUserId(userId);
  
  if (!profile) {
    throw createApiError('Profile not found', 404);
  }
  
  // Check minimum required fields
  if (!profile.businessName || !profile.creatorName) {
    throw createApiError(
      'Please complete required fields: Business Name and Creator Name',
      400,
      'INCOMPLETE_PROFILE'
    );
  }
  
  const updatedProfile = await userProfileRepository.completeOnboarding(userId);
  
  res.json({ 
    profile: updatedProfile,
    message: 'Onboarding complete! Your business defaults will be used for all new projects.',
  });
}));

/**
 * POST /user-profile/url-audit
 * Analyze a website URL to extract business context
 */
userProfileRouter.post('/url-audit', asyncHandler(async (req, res) => {
  const { url } = req.body;
  
  if (!url || typeof url !== 'string') {
    throw createApiError('URL is required', 400);
  }
  
  // Clean the URL
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  
  // Validate URL format
  try {
    new URL(cleanUrl);
  } catch {
    throw createApiError('Invalid URL format', 400);
  }
  
  const result = await auditUrl(cleanUrl);
  
  if (!result.success) {
    throw createApiError(result.error || 'Failed to analyze URL', 400);
  }
  
  res.json({ audit: result });
}));
