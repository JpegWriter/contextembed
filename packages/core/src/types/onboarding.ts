/**
 * Onboarding profile types
 */

import { ProjectGoal } from './domain';

export interface OnboardingProfile {
  id: string;
  projectId: string;
  version: number;
  
  // Stage 1: Project basics
  projectName: string;
  primaryGoal: ProjectGoal;
  
  // Stage 2: URL Audit results
  websiteUrl?: string;
  urlAuditResult?: UrlAuditResult;
  confirmedContext: ConfirmedContext;
  
  // Stage 3: Rights & Attribution
  rights: RightsInfo;
  
  // Stage 4: Output preferences
  preferences: OutputPreferences;
  
  // Completeness tracking
  completenessScore: number;
  isComplete: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UrlAuditResult {
  url: string;
  fetchedAt: Date;
  success: boolean;
  error?: string;
  
  // Extracted data
  title?: string;
  metaDescription?: string;
  businessName?: string;
  tagline?: string;
  services?: string[];
  location?: ExtractedLocation;
  socialLinks?: SocialLinks;
  contactInfo?: ContactInfo;
  toneHints?: string[];
  industry?: string;
  keywords?: string[];
  awards?: string[];
  credentials?: string[];
  
  // Intelligent field suggestions derived from crawl
  fieldSuggestions?: FieldSuggestions;
}

export interface FieldSuggestions {
  industry?: string;
  niche?: string;
  nicheOptions?: string[];
  services?: string;
  serviceOptions?: string[];
  specializations?: string;
  specializationOptions?: string[];
  targetAudience?: string;
  targetAudienceOptions?: string[];
  brandVoice?: string;
  brandVoiceOptions?: string[];
  keyDifferentiator?: string;
  keyDifferentiatorOptions?: string[];
  awards?: string;
  awardsOptions?: string[];
  credentials?: string;
  credentialsOptions?: string[];
  defaultEventType?: string;
  defaultEventTypeOptions?: string[];
}

export interface ExtractedLocation {
  city?: string;
  state?: string;
  country?: string;
  address?: string;
}

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  pinterest?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
}

export interface ConfirmedContext {
  brandName: string;
  tagline?: string;
  industry?: string;
  niche?: string;
  services?: string[];
  targetAudience?: string;
  brandVoice?: string;
  location?: ConfirmedLocation;
  additionalContext?: string;
  
  // Authority & Expertise fields (NEW)
  yearsExperience?: number;
  credentials?: string[];
  specializations?: string[];
  awardsRecognition?: string[];
  clientTypes?: string;
  keyDifferentiator?: string;
  pricePoint?: 'budget' | 'mid-range' | 'premium' | 'luxury';
  brandStory?: string;
  serviceArea?: string[];
  
  // Event defaults
  defaultEventType?: string;
  typicalDeliverables?: string[];
}

export interface ConfirmedLocation {
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  isStrict: boolean; // Only use this location, never infer
}

export interface RightsInfo {
  creatorName: string;
  studioName?: string;
  copyrightTemplate: string;
  creditTemplate: string;
  usageTermsTemplate?: string;
  website?: string;
  email?: string;
}

export interface OutputPreferences {
  primaryLanguage: string;
  additionalLanguages?: string[];
  keywordStyle: 'short' | 'long' | 'mixed';
  maxKeywords: number;
  locationBehavior: 'strict' | 'infer' | 'none';
  overwriteOriginals: boolean;
  includeReasoning: boolean;
  outputFormat: 'copy' | 'overwrite';
}

// Onboarding wizard state
export interface OnboardingState {
  currentStage: OnboardingStage;
  stages: {
    project: ProjectStageData;
    urlAudit: UrlAuditStageData;
    rights: RightsStageData;
    preferences: PreferencesStageData;
    review: ReviewStageData;
  };
}

export type OnboardingStage = 'project' | 'urlAudit' | 'rights' | 'preferences' | 'review';

export interface ProjectStageData {
  completed: boolean;
  data: {
    projectName: string;
    primaryGoal: ProjectGoal | null;
  };
}

export interface UrlAuditStageData {
  completed: boolean;
  data: {
    websiteUrl: string;
    auditResult: UrlAuditResult | null;
    confirmedContext: Partial<ConfirmedContext>;
  };
}

export interface RightsStageData {
  completed: boolean;
  data: Partial<RightsInfo>;
}

export interface PreferencesStageData {
  completed: boolean;
  data: Partial<OutputPreferences>;
}

export interface ReviewStageData {
  completed: boolean;
  acknowledged: boolean;
}

// Validation
export interface OnboardingValidation {
  isValid: boolean;
  errors: OnboardingError[];
  warnings: OnboardingWarning[];
  completenessScore: number;
}

export interface OnboardingError {
  stage: OnboardingStage;
  field: string;
  message: string;
}

export interface OnboardingWarning {
  stage: OnboardingStage;
  field: string;
  message: string;
  suggestion?: string;
}
