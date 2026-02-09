/**
 * Zod schemas for Onboarding validation
 */

import { z } from 'zod';

export const ProjectGoalSchema = z.enum(['seo_aeo', 'archive', 'delivery', 'stock', 'social']);

export const ExtractedLocationSchema = z.object({
  city: z.string().max(128).optional(),
  state: z.string().max(128).optional(),
  country: z.string().max(128).optional(),
  address: z.string().max(500).optional(),
});

export const SocialLinksSchema = z.object({
  facebook: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  youtube: z.string().url().optional().or(z.literal('')),
  tiktok: z.string().url().optional().or(z.literal('')),
  pinterest: z.string().url().optional().or(z.literal('')),
});

export const ContactInfoSchema = z.object({
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

export const UrlAuditResultSchema = z.object({
  url: z.string().url(),
  fetchedAt: z.date().or(z.string().datetime()),
  success: z.boolean(),
  error: z.string().optional(),
  title: z.string().max(500).optional(),
  metaDescription: z.string().max(1000).optional(),
  businessName: z.string().max(256).optional(),
  tagline: z.string().max(500).optional(),
  services: z.array(z.string().max(200)).max(20).optional(),
  location: ExtractedLocationSchema.optional(),
  socialLinks: SocialLinksSchema.optional(),
  contactInfo: ContactInfoSchema.optional(),
  toneHints: z.array(z.string().max(100)).max(10).optional(),
  industry: z.string().max(200).optional(),
  keywords: z.array(z.string().max(100)).max(50).optional(),
});

export const ConfirmedLocationSchema = z.object({
  city: z.string().max(128).optional(),
  state: z.string().max(128).optional(),
  country: z.string().max(128).optional(),
  countryCode: z.string().max(3).optional(),
  isStrict: z.boolean().default(true),
});

export const PricePointSchema = z.enum(['budget', 'mid-range', 'premium', 'luxury']);

export const ConfirmedContextSchema = z.object({
  brandName: z.string().min(1).max(256),
  tagline: z.string().max(500).optional(),
  industry: z.string().max(200).optional(),
  niche: z.string().max(200).optional(),
  services: z.array(z.string().max(200)).max(20).optional(),
  targetAudience: z.string().max(500).optional(),
  brandVoice: z.string().max(200).optional(),
  location: ConfirmedLocationSchema.optional(),
  additionalContext: z.string().max(2000).optional(),
  
  // Authority & Expertise fields (NEW)
  yearsExperience: z.number().int().min(0).max(100).optional(),
  credentials: z.array(z.string().max(200)).max(10).optional(),
  specializations: z.array(z.string().max(200)).max(10).optional(),
  awardsRecognition: z.array(z.string().max(300)).max(10).optional(),
  clientTypes: z.string().max(300).optional(),
  keyDifferentiator: z.string().max(300).optional(),
  pricePoint: PricePointSchema.optional(),
  brandStory: z.string().max(1000).optional(),
  serviceArea: z.array(z.string().max(100)).max(20).optional(),
  
  // Event defaults
  defaultEventType: z.string().max(100).optional(),
  typicalDeliverables: z.array(z.string().max(200)).max(10).optional(),
});

export const RightsInfoSchema = z.object({
  creatorName: z.string().min(1).max(256),
  studioName: z.string().max(256).optional(),
  copyrightTemplate: z.string().min(1).max(256),
  creditTemplate: z.string().min(1).max(256),
  usageTermsTemplate: z.string().max(2000).optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
});

export const OutputPreferencesSchema = z.object({
  primaryLanguage: z.string().min(2).max(10).default('en'),
  additionalLanguages: z.array(z.string().min(2).max(10)).max(5).optional(),
  keywordStyle: z.enum(['short', 'long', 'mixed']).default('mixed'),
  maxKeywords: z.number().int().min(5).max(50).default(25),
  locationBehavior: z.enum(['strict', 'infer', 'none']).default('strict'),
  overwriteOriginals: z.boolean().default(false),
  includeReasoning: z.boolean().default(true),
  outputFormat: z.enum(['copy', 'overwrite']).default('copy'),
});

export const OnboardingProfileSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  version: z.number().int().positive(),
  projectName: z.string().min(1).max(256),
  primaryGoal: ProjectGoalSchema,
  websiteUrl: z.string().url().optional(),
  urlAuditResult: UrlAuditResultSchema.optional(),
  confirmedContext: ConfirmedContextSchema,
  rights: RightsInfoSchema,
  preferences: OutputPreferencesSchema,
  completenessScore: z.number().min(0).max(100),
  isComplete: z.boolean(),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime()),
});

// Input schemas for API endpoints
export const CreateProjectInputSchema = z.object({
  name: z.string().min(1).max(256),
  goal: ProjectGoalSchema.optional().default('seo_aeo'),
  description: z.string().max(2000).optional(),
  eventLocation: z.string().max(256).optional(),
  eventDate: z.string().optional(),
  galleryContext: z.string().max(5000).optional(),
});

export const UrlAuditInputSchema = z.object({
  url: z.string().url(),
});

export const UpdateConfirmedContextInputSchema = ConfirmedContextSchema.partial().extend({
  brandName: z.string().min(1).max(256),
});

export const UpdateRightsInputSchema = RightsInfoSchema;

export const UpdatePreferencesInputSchema = OutputPreferencesSchema.partial();

/**
 * Calculate completeness score for an onboarding profile
 */
export function calculateCompletenessScore(profile: {
  projectName?: string;
  primaryGoal?: string;
  confirmedContext?: { brandName?: string };
  rights?: { creatorName?: string; copyrightTemplate?: string; creditTemplate?: string };
  preferences?: { primaryLanguage?: string };
}): number {
  let score = 0;
  const weights = {
    projectName: 15,
    primaryGoal: 10,
    brandName: 20,
    creatorName: 20,
    copyrightTemplate: 15,
    creditTemplate: 10,
    primaryLanguage: 10,
  };
  
  if (profile.projectName) score += weights.projectName;
  if (profile.primaryGoal) score += weights.primaryGoal;
  if (profile.confirmedContext?.brandName) score += weights.brandName;
  if (profile.rights?.creatorName) score += weights.creatorName;
  if (profile.rights?.copyrightTemplate) score += weights.copyrightTemplate;
  if (profile.rights?.creditTemplate) score += weights.creditTemplate;
  if (profile.preferences?.primaryLanguage) score += weights.primaryLanguage;
  
  return score;
}

/**
 * Check if minimum requirements are met for import
 */
export function isReadyForImport(profile: {
  confirmedContext?: { brandName?: string };
  rights?: { creatorName?: string; copyrightTemplate?: string; creditTemplate?: string };
}): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!profile.confirmedContext?.brandName) missing.push('Brand Name');
  if (!profile.rights?.creatorName) missing.push('Creator Name');
  if (!profile.rights?.copyrightTemplate) missing.push('Copyright Template');
  if (!profile.rights?.creditTemplate) missing.push('Credit Template');
  
  return {
    ready: missing.length === 0,
    missing,
  };
}
