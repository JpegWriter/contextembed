/**
 * Perfect Metadata v1 Schema
 * 
 * Comprehensive Zod schema for standards-compliant image metadata
 * with no-hallucination validation rules.
 */

import { z } from 'zod';

// ===========================================
// Utility Validators
// ===========================================

const trimmedString = (min: number, max: number) =>
  z.string()
    .transform(s => s.trim().replace(/\s+/g, ' '))
    .pipe(z.string().min(min).max(max));

const urlString = z.string().url().max(300).optional();

// PII detection regex (basic - catches obvious emails/phones)
const containsPII = (str: string): boolean => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,9}/;
  return emailRegex.test(str) || phoneRegex.test(str);
};

// ===========================================
// Enums
// ===========================================

export const LocationMode = z.enum(['none', 'fromProfile', 'fromExifOnly']);
export type LocationMode = z.infer<typeof LocationMode>;

export const ReleaseStatus = z.enum(['unknown', 'present', 'not_present']);
export type ReleaseStatus = z.infer<typeof ReleaseStatus>;

export const ProvenanceSource = z.enum(['user', 'exif', 'ai_inferred']);
export type ProvenanceSource = z.infer<typeof ProvenanceSource>;

// ===========================================
// Sub-Schemas
// ===========================================

/**
 * GPS coordinates (only when explicitly provided)
 */
export const GPSCoordinates = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
}).optional();

/**
 * Provenance tracking for fields
 */
export const FieldProvenance = z.object({
  city: ProvenanceSource.optional(),
  stateProvince: ProvenanceSource.optional(),
  country: ProvenanceSource.optional(),
  sublocation: ProvenanceSource.optional(),
  gps: ProvenanceSource.optional(),
}).optional();

// ===========================================
// Section Schemas
// ===========================================

/**
 * DESCRIPTIVE - Unique per image, AI-generated
 */
export const DescriptiveMetadata = z.object({
  headline: trimmedString(5, 120)
    .refine(s => !containsPII(s), { message: 'Headline must not contain email or phone' }),
  
  description: trimmedString(20, 1200)
    .refine(s => !containsPII(s), { message: 'Description must not contain email or phone' }),
  
  altText: trimmedString(10, 160)
    .refine(s => !containsPII(s), { message: 'Alt text must not contain email or phone' }),
  
  keywords: z.array(trimmedString(2, 40))
    .min(8, 'At least 8 keywords required')
    .max(35, 'Maximum 35 keywords allowed')
    .refine(
      arr => new Set(arr.map(k => k.toLowerCase())).size === arr.length,
      { message: 'Keywords must be unique (case-insensitive)' }
    ),
  
  category: trimmedString(2, 60).optional(),
  
  subjectCodes: z.array(z.string().max(20)).optional(),
});

export type DescriptiveMetadata = z.infer<typeof DescriptiveMetadata>;

/**
 * ATTRIBUTION & RIGHTS - From onboarding, embedded per file
 */
export const AttributionMetadata = z.object({
  creator: trimmedString(2, 80),
  creditLine: trimmedString(2, 120),
  copyrightNotice: trimmedString(2, 160),
  rightsUsageTerms: trimmedString(2, 500).optional(),
  rightsUrl: urlString,
  source: trimmedString(2, 120).optional(),
});

export type AttributionMetadata = z.infer<typeof AttributionMetadata>;

/**
 * LOCATION - Only if confirmed, never hallucinated
 */
export const LocationMetadata = z.object({
  locationMode: LocationMode,
  city: trimmedString(1, 80).optional(),
  stateProvince: trimmedString(1, 80).optional(),
  country: trimmedString(1, 80).optional(),
  sublocation: trimmedString(1, 120).optional(),
  gps: GPSCoordinates,
  provenance: FieldProvenance,
}).superRefine((data, ctx) => {
  // NO-HALLUCINATION RULE: If mode is 'none', all location fields must be empty
  if (data.locationMode === 'none') {
    if (data.city || data.stateProvince || data.country || data.sublocation || data.gps) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Location fields must be empty when locationMode is "none"',
        path: ['locationMode'],
      });
    }
  }
  
  // If mode is 'fromExifOnly', location must have exif provenance
  if (data.locationMode === 'fromExifOnly' && data.provenance) {
    const locationFields = ['city', 'stateProvince', 'country', 'sublocation'] as const;
    for (const field of locationFields) {
      if (data[field] && data.provenance[field] !== 'exif') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} must have EXIF provenance when locationMode is "fromExifOnly"`,
          path: [field],
        });
      }
    }
  }
});

export type LocationMetadata = z.infer<typeof LocationMetadata>;

/**
 * WORKFLOW / ADMIN
 */
export const WorkflowMetadata = z.object({
  jobId: trimmedString(2, 80),
  instructions: trimmedString(2, 400).optional(),
  modelReleaseStatus: ReleaseStatus.default('unknown'),
  propertyReleaseStatus: ReleaseStatus.default('unknown'),
});

export type WorkflowMetadata = z.infer<typeof WorkflowMetadata>;

/**
 * CONTEXTEMBED AUDIT - Always present, auto-generated
 */
export const ContextEmbedAudit = z.object({
  ceRunId: z.string().min(8).max(64),
  ceProfileVersion: z.string().min(1).max(40),
  cePromptVersion: z.string().min(1).max(40),
  ceVerificationHash: z.string().min(16).max(128),
});

export type ContextEmbedAudit = z.infer<typeof ContextEmbedAudit>;

// ===========================================
// Complete Perfect Metadata Schema
// ===========================================

export const PerfectMetadataSchema = z.object({
  descriptive: DescriptiveMetadata,
  attribution: AttributionMetadata,
  location: LocationMetadata,
  workflow: WorkflowMetadata,
  audit: ContextEmbedAudit,
});

export type PerfectMetadata = z.infer<typeof PerfectMetadataSchema>;

// ===========================================
// Validation Helpers
// ===========================================

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
  }>;
  warnings: Array<{
    path: string;
    message: string;
  }>;
  stats: {
    requiredComplete: number;
    requiredTotal: number;
    keywordCount: number;
    locationSafe: boolean;
  };
}

/**
 * Validate metadata and return detailed results
 */
export function validatePerfectMetadata(data: unknown): ValidationResult {
  const result = PerfectMetadataSchema.safeParse(data);
  
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];
  
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join('.'),
        message: issue.message,
      });
    }
  }
  
  // Calculate stats even for partial data
  const partialData = data as Partial<PerfectMetadata>;
  const keywordCount = partialData?.descriptive?.keywords?.length ?? 0;
  
  // Check required fields
  const requiredFields = [
    'descriptive.headline',
    'descriptive.description', 
    'descriptive.altText',
    'descriptive.keywords',
    'attribution.creator',
    'attribution.creditLine',
    'attribution.copyrightNotice',
    'workflow.jobId',
    'audit.ceRunId',
    'audit.ceProfileVersion',
    'audit.cePromptVersion',
    'audit.ceVerificationHash',
  ];
  
  let requiredComplete = 0;
  for (const field of requiredFields) {
    const [section, key] = field.split('.');
    const value = (partialData as any)?.[section]?.[key];
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value) ? value.length > 0 : true) {
        requiredComplete++;
      }
    }
  }
  
  // Location safety check
  const locationMode = partialData?.location?.locationMode;
  const hasLocationData = !!(
    partialData?.location?.city ||
    partialData?.location?.country ||
    partialData?.location?.stateProvince
  );
  const locationSafe = locationMode === 'none' ? !hasLocationData : true;
  
  // Warnings
  if (keywordCount < 8) {
    warnings.push({ path: 'descriptive.keywords', message: `Only ${keywordCount} keywords (8 required)` });
  }
  if (keywordCount > 35) {
    warnings.push({ path: 'descriptive.keywords', message: `${keywordCount} keywords exceeds maximum of 35` });
  }
  if (!locationSafe) {
    warnings.push({ path: 'location', message: 'Location data present but mode is "none"' });
  }
  
  return {
    valid: result.success,
    errors,
    warnings,
    stats: {
      requiredComplete,
      requiredTotal: requiredFields.length,
      keywordCount,
      locationSafe,
    },
  };
}

/**
 * Partial schema for work-in-progress metadata
 */
export const PartialPerfectMetadataSchema = PerfectMetadataSchema.deepPartial();
export type PartialPerfectMetadata = z.infer<typeof PartialPerfectMetadataSchema>;

/**
 * Create empty metadata template
 */
export function createEmptyMetadata(): PartialPerfectMetadata {
  return {
    descriptive: {
      headline: '',
      description: '',
      altText: '',
      keywords: [],
      category: undefined,
      subjectCodes: undefined,
    },
    attribution: {
      creator: '',
      creditLine: '',
      copyrightNotice: '',
      rightsUsageTerms: undefined,
      rightsUrl: undefined,
      source: undefined,
    },
    location: {
      locationMode: 'none',
      city: undefined,
      stateProvince: undefined,
      country: undefined,
      sublocation: undefined,
      gps: undefined,
      provenance: undefined,
    },
    workflow: {
      jobId: '',
      instructions: undefined,
      modelReleaseStatus: 'unknown',
      propertyReleaseStatus: 'unknown',
    },
    audit: {
      ceRunId: '',
      ceProfileVersion: '',
      cePromptVersion: '',
      ceVerificationHash: '',
    },
  };
}
