/**
 * ExifTool Tag Map for Perfect Metadata v1
 * 
 * Maps our metadata fields to standards-compliant IPTC/XMP/EXIF tags.
 * Includes custom ContextEmbed XMP namespace.
 */

import type { PerfectMetadata, PartialPerfectMetadata } from '@contextembed/core';

// ===========================================
// Custom XMP Namespace Definition
// ===========================================

/**
 * ContextEmbed custom XMP namespace
 * Register with: -config ~/.ExifTool_config
 */
export const CONTEXTEMBED_XMP_NAMESPACE = {
  namespace: 'http://contextembed.com/1.0/',
  prefix: 'contextembed',
  configFile: `
%Image::ExifTool::UserDefined = (
    'Image::ExifTool::XMP::Main' => {
        contextembed => {
            SubDirectory => {
                TagTable => 'Image::ExifTool::UserDefined::contextembed',
            },
        },
    },
);

%Image::ExifTool::UserDefined::contextembed = (
    GROUPS => { 0 => 'XMP', 1 => 'XMP-contextembed', 2 => 'Other' },
    NAMESPACE => { 'contextembed' => 'http://contextembed.com/1.0/' },
    WRITABLE => 'string',
    RunId => { },
    ProfileVersion => { },
    PromptVersion => { },
    VerificationHash => { },
    AltText => { },
    LocationMode => { },
    ModelReleaseStatus => { },
    PropertyReleaseStatus => { },
);
`,
};

// ===========================================
// Tag Mapping Definitions
// ===========================================

export interface TagMapping {
  field: string;
  tags: string[];
  type: 'string' | 'array' | 'number';
  section: 'descriptive' | 'attribution' | 'location' | 'workflow' | 'audit';
  required: boolean;
  maxLength?: number;
}

/**
 * Complete tag mapping from Perfect Metadata fields to ExifTool tags
 */
export const TAG_MAP: TagMapping[] = [
  // ===========================================
  // DESCRIPTIVE
  // ===========================================
  {
    field: 'descriptive.headline',
    tags: ['XMP-photoshop:Headline', 'IPTC:Headline'],
    type: 'string',
    section: 'descriptive',
    required: true,
    maxLength: 120,
  },
  {
    field: 'descriptive.description',
    tags: ['XMP-dc:Description', 'IPTC:Caption-Abstract'],
    type: 'string',
    section: 'descriptive',
    required: true,
    maxLength: 1200,
  },
  {
    field: 'descriptive.altText',
    tags: ['XMP-contextembed:AltText', 'XMP-iptcExt:AltTextAccessibility'],
    type: 'string',
    section: 'descriptive',
    required: true,
    maxLength: 160,
  },
  {
    field: 'descriptive.keywords',
    tags: ['XMP-dc:Subject', 'IPTC:Keywords'],
    type: 'array',
    section: 'descriptive',
    required: true,
  },
  {
    field: 'descriptive.category',
    tags: ['IPTC:Category'],
    type: 'string',
    section: 'descriptive',
    required: false,
    maxLength: 60,
  },
  {
    field: 'descriptive.subjectCodes',
    tags: ['IPTC:SubjectCode'],
    type: 'array',
    section: 'descriptive',
    required: false,
  },

  // ===========================================
  // ATTRIBUTION & RIGHTS
  // ===========================================
  {
    field: 'attribution.creator',
    tags: ['XMP-dc:Creator', 'IPTC:By-line'],
    type: 'string',
    section: 'attribution',
    required: true,
    maxLength: 80,
  },
  {
    field: 'attribution.creditLine',
    tags: ['IPTC:Credit', 'XMP-photoshop:Credit'],
    type: 'string',
    section: 'attribution',
    required: true,
    maxLength: 120,
  },
  {
    field: 'attribution.copyrightNotice',
    tags: ['XMP-dc:Rights', 'IPTC:CopyrightNotice'],
    type: 'string',
    section: 'attribution',
    required: true,
    maxLength: 160,
  },
  {
    field: 'attribution.rightsUsageTerms',
    tags: ['XMP-xmpRights:UsageTerms'],
    type: 'string',
    section: 'attribution',
    required: false,
    maxLength: 500,
  },
  {
    field: 'attribution.rightsUrl',
    tags: ['XMP-xmpRights:WebStatement'],
    type: 'string',
    section: 'attribution',
    required: false,
    maxLength: 300,
  },
  {
    field: 'attribution.source',
    tags: ['IPTC:Source', 'XMP-photoshop:Source'],
    type: 'string',
    section: 'attribution',
    required: false,
    maxLength: 120,
  },

  // ===========================================
  // LOCATION (only when confirmed)
  // ===========================================
  {
    field: 'location.city',
    tags: ['IPTC:City', 'XMP-photoshop:City'],
    type: 'string',
    section: 'location',
    required: false,
    maxLength: 80,
  },
  {
    field: 'location.stateProvince',
    tags: ['IPTC:Province-State', 'XMP-photoshop:State'],
    type: 'string',
    section: 'location',
    required: false,
    maxLength: 80,
  },
  {
    field: 'location.country',
    tags: ['IPTC:Country-PrimaryLocationName', 'XMP-photoshop:Country'],
    type: 'string',
    section: 'location',
    required: false,
    maxLength: 80,
  },
  {
    field: 'location.sublocation',
    tags: ['IPTC:Sub-location', 'XMP-iptcCore:Location'],
    type: 'string',
    section: 'location',
    required: false,
    maxLength: 120,
  },

  // ===========================================
  // WORKFLOW / ADMIN
  // ===========================================
  {
    field: 'workflow.jobId',
    tags: ['IPTC:JobID', 'XMP-photoshop:TransmissionReference'],
    type: 'string',
    section: 'workflow',
    required: true,
    maxLength: 80,
  },
  {
    field: 'workflow.instructions',
    tags: ['IPTC:SpecialInstructions'],
    type: 'string',
    section: 'workflow',
    required: false,
    maxLength: 400,
  },
  {
    field: 'workflow.modelReleaseStatus',
    tags: ['XMP-contextembed:ModelReleaseStatus'],
    type: 'string',
    section: 'workflow',
    required: false,
  },
  {
    field: 'workflow.propertyReleaseStatus',
    tags: ['XMP-contextembed:PropertyReleaseStatus'],
    type: 'string',
    section: 'workflow',
    required: false,
  },

  // ===========================================
  // CONTEXTEMBED AUDIT
  // ===========================================
  {
    field: 'audit.ceRunId',
    tags: ['XMP-contextembed:RunId'],
    type: 'string',
    section: 'audit',
    required: true,
    maxLength: 64,
  },
  {
    field: 'audit.ceProfileVersion',
    tags: ['XMP-contextembed:ProfileVersion'],
    type: 'string',
    section: 'audit',
    required: true,
    maxLength: 40,
  },
  {
    field: 'audit.cePromptVersion',
    tags: ['XMP-contextembed:PromptVersion'],
    type: 'string',
    section: 'audit',
    required: true,
    maxLength: 40,
  },
  {
    field: 'audit.ceVerificationHash',
    tags: ['XMP-contextembed:VerificationHash'],
    type: 'string',
    section: 'audit',
    required: true,
    maxLength: 128,
  },
];

// ===========================================
// ExifTool Argument Builder
// ===========================================

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Normalize string for comparison
 */
export function normalizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Normalize keywords array for comparison
 */
export function normalizeKeywords(keywords: string[]): string[] {
  return [...keywords].map(k => normalizeString(k)).sort();
}

/**
 * Build ExifTool arguments for writing metadata
 */
export function buildExifToolArgs(
  metadata: PartialPerfectMetadata,
  options: {
    preserveTechnicalExif?: boolean;
    includeGps?: boolean;
  } = {}
): string[] {
  const { preserveTechnicalExif = true, includeGps = false } = options;
  const args: string[] = [];

  // Always preserve technical EXIF by default
  if (preserveTechnicalExif) {
    args.push('-tagsfromfile', '@');
    args.push('-EXIF:all');
  }

  // Overwrite existing XMP/IPTC
  args.push('-overwrite_original');

  // Process each tag mapping
  for (const mapping of TAG_MAP) {
    const value = getNestedValue(metadata, mapping.field);
    
    if (value === undefined || value === null || value === '') {
      continue;
    }

    // Skip location fields if mode is 'none'
    if (mapping.section === 'location' && metadata.location?.locationMode === 'none') {
      continue;
    }

    // Write to all mapped tags
    for (const tag of mapping.tags) {
      if (mapping.type === 'array' && Array.isArray(value)) {
        // For arrays, add each value separately
        for (const item of value) {
          args.push(`-${tag}=${item}`);
        }
      } else {
        args.push(`-${tag}=${value}`);
      }
    }
  }

  // Handle GPS separately (only if explicitly allowed)
  if (includeGps && metadata.location?.gps) {
    const { lat, lon } = metadata.location.gps;
    const latRef = lat >= 0 ? 'N' : 'S';
    const lonRef = lon >= 0 ? 'E' : 'W';
    args.push(`-EXIF:GPSLatitude=${Math.abs(lat)}`);
    args.push(`-EXIF:GPSLatitudeRef=${latRef}`);
    args.push(`-EXIF:GPSLongitude=${Math.abs(lon)}`);
    args.push(`-EXIF:GPSLongitudeRef=${lonRef}`);
  }

  return args;
}

/**
 * Build ExifTool read arguments for verification
 */
export function buildVerifyReadArgs(): string[] {
  const tags = new Set<string>();
  
  for (const mapping of TAG_MAP) {
    // Use first tag (primary) for reading
    tags.add(mapping.tags[0]);
  }

  return ['-json', ...Array.from(tags).map(t => `-${t}`)];
}

/**
 * Verify embedded metadata matches expected values
 */
export function verifyEmbedded(
  readResult: Record<string, any>,
  expected: PartialPerfectMetadata
): { 
  verified: boolean; 
  mismatches: Array<{ field: string; expected: any; actual: any }>;
} {
  const mismatches: Array<{ field: string; expected: any; actual: any }> = [];

  for (const mapping of TAG_MAP) {
    const expectedValue = getNestedValue(expected, mapping.field);
    
    if (expectedValue === undefined || expectedValue === null || expectedValue === '') {
      continue;
    }

    // Get actual value from read result (use first tag)
    const primaryTag = mapping.tags[0].replace(':', '');
    const actualValue = readResult[primaryTag];

    if (mapping.type === 'array') {
      const expectedNorm = normalizeKeywords(expectedValue as string[]);
      const actualNorm = normalizeKeywords(
        Array.isArray(actualValue) ? actualValue : [actualValue].filter(Boolean)
      );
      
      if (JSON.stringify(expectedNorm) !== JSON.stringify(actualNorm)) {
        mismatches.push({
          field: mapping.field,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    } else {
      const expectedNorm = normalizeString(String(expectedValue));
      const actualNorm = actualValue ? normalizeString(String(actualValue)) : '';
      
      if (expectedNorm !== actualNorm) {
        mismatches.push({
          field: mapping.field,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }
  }

  return {
    verified: mismatches.length === 0,
    mismatches,
  };
}

/**
 * Generate human-readable metadata summary
 */
export function generateMetadataSummary(metadata: PartialPerfectMetadata): string {
  const lines: string[] = [];
  
  lines.push('=== DESCRIPTIVE ===');
  if (metadata.descriptive?.headline) lines.push(`Headline: ${metadata.descriptive.headline}`);
  if (metadata.descriptive?.description) lines.push(`Description: ${metadata.descriptive.description}`);
  if (metadata.descriptive?.altText) lines.push(`Alt Text: ${metadata.descriptive.altText}`);
  if (metadata.descriptive?.keywords?.length) {
    lines.push(`Keywords: ${metadata.descriptive.keywords.join(', ')}`);
  }
  
  lines.push('');
  lines.push('=== ATTRIBUTION & RIGHTS ===');
  if (metadata.attribution?.creator) lines.push(`Creator: ${metadata.attribution.creator}`);
  if (metadata.attribution?.creditLine) lines.push(`Credit: ${metadata.attribution.creditLine}`);
  if (metadata.attribution?.copyrightNotice) lines.push(`Copyright: ${metadata.attribution.copyrightNotice}`);
  if (metadata.attribution?.rightsUsageTerms) lines.push(`Usage Terms: ${metadata.attribution.rightsUsageTerms}`);
  if (metadata.attribution?.source) lines.push(`Source: ${metadata.attribution.source}`);
  
  if (metadata.location?.locationMode !== 'none') {
    lines.push('');
    lines.push('=== LOCATION ===');
    if (metadata.location?.city) lines.push(`City: ${metadata.location.city}`);
    if (metadata.location?.stateProvince) lines.push(`State/Province: ${metadata.location.stateProvince}`);
    if (metadata.location?.country) lines.push(`Country: ${metadata.location.country}`);
    if (metadata.location?.sublocation) lines.push(`Sublocation: ${metadata.location.sublocation}`);
  }
  
  lines.push('');
  lines.push('=== WORKFLOW ===');
  if (metadata.workflow?.jobId) lines.push(`Job ID: ${metadata.workflow.jobId}`);
  if (metadata.workflow?.instructions) lines.push(`Instructions: ${metadata.workflow.instructions}`);
  
  lines.push('');
  lines.push('=== CONTEXTEMBED AUDIT ===');
  if (metadata.audit?.ceRunId) lines.push(`Run ID: ${metadata.audit.ceRunId}`);
  if (metadata.audit?.ceProfileVersion) lines.push(`Profile Version: ${metadata.audit.ceProfileVersion}`);
  if (metadata.audit?.cePromptVersion) lines.push(`Prompt Version: ${metadata.audit.cePromptVersion}`);
  if (metadata.audit?.ceVerificationHash) lines.push(`Verification Hash: ${metadata.audit.ceVerificationHash}`);
  
  return lines.join('\n');
}

/**
 * Get tags by section
 */
export function getTagsBySection(section: TagMapping['section']): TagMapping[] {
  return TAG_MAP.filter(t => t.section === section);
}
