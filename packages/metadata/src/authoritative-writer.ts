/**
 * Authoritative IPTC Writer
 * Uses ExifTool as final write authority
 * Enforces IPTC contract and custom XMP namespace
 * 
 * This is the ONLY module that should write metadata
 * 
 * v2.1 - Added proof-first fields for evidence-backed authority
 */

import { exiftool, Tags } from 'exiftool-vendored';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  MetadataContract,
  IPTCCoreContract,
  XMPContextEmbedContract,
  formatTitle,
  sanitizeKeywords,
  SESSION_TYPES,
  ValidationResult,
  JOB_TYPES,
  PAGE_ROLES,
  EMBED_TIERS,
  EmbedTier,
} from './iptc-contract';
import {
  validateMetadataContract,
  assertValidMetadata,
} from './metadata-validator';

// =============================================================================
// TOOLING ATTRIBUTION CONSTANTS
// =============================================================================

/**
 * ContextEmbed Tooling Attribution
 * 
 * Per IPTC standards:
 * - Creators go in By-line
 * - Rights go in Copyright
 * - Tools go in Credit
 * 
 * This attribution is appended to the Credit field and written to custom XMP.
 */
export const CONTEXTEMBED_ATTRIBUTION = {
  /** Displayed in Credit field - professional, non-promotional */
  CREDIT_LINE: 'Context embedded with ContextEmbed.com',
  
  /** Machine-readable tool identifier for provenance */
  EMBEDDED_BY: 'ContextEmbed.com',
  
  /** Processing method description */
  EMBEDDING_METHOD: 'Automated AI-powered contextual analysis and IPTC synthesis',
  
  /** Current embedding pipeline version */
  PIPELINE_VERSION: '2.1',
} as const;

// =============================================================================
// CUSTOM XMP NAMESPACE CONFIGURATION (v2.1)
// =============================================================================

/**
 * ContextEmbed XMP Namespace
 * Namespace: http://contextembed.com/2.1/
 * Prefix: contextembed
 * 
 * v2.1 adds proof-first fields for evidence-backed authority
 * v2.1.1 adds tooling provenance fields (EmbeddedBy, EmbeddingMethod)
 */
export const CONTEXTEMBED_XMP_CONFIG = `
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
    GROUPS => { 0 => 'XMP', 1 => 'XMP-contextembed', 2 => 'Image' },
    NAMESPACE => { 'contextembed' => 'http://contextembed.com/2.1/' },
    WRITABLE => 'string',
    
    # AI Classification (secondary)
    SceneType => { },
    PrimarySubjects => { },
    EmotionalTone => { },
    Intent => { },
    SafetyValidated => { Writable => 'boolean' },
    StyleFingerprintId => { },
    VisionConfidenceScore => { Writable => 'integer' },
    EnhancementTraceId => { },
    ProcessingPipeline => { },
    SourceHash => { },
    
    # Business Identity (proof-first)
    BusinessName => { },
    BusinessWebsite => { },
    CreatorRole => { },
    
    # Job Evidence (proof-first)
    JobType => { },
    ServiceCategory => { },
    ContextLine => { },
    OutcomeProof => { },
    
    # Semantic Location (proof-first)
    GeoFocus => { },
    
    # Continuity / Linkage
    AssetId => { },
    ExportId => { },
    ManifestRef => { },
    Checksum => { },
    
    # IA Structure
    TargetPage => { },
    PageRole => { },
    ClusterId => { },
    
    # Metadata Version
    MetadataVersion => { },
    
    # Tooling Provenance (NEW - attribution)
    EmbeddedBy => { },
    EmbeddingMethod => { },
    PipelineVersion => { },
    
    # Embed Tier
    EmbedTier => { },
    
    # Governance Attestation (NEW v2.2 - portable proof)
    AIGenerated => { },
    AIConfidence => { },
    GovernanceStatus => { },
    GovernancePolicy => { },
    GovernanceReason => { },
    GovernanceCheckedAt => { },
    GovernanceDecisionRef => { },
);
`;

// =============================================================================
// WRITE REQUEST/RESPONSE
// =============================================================================

export interface AuthoritativeWriteRequest {
  sourcePath: string;
  outputPath?: string;
  contract: MetadataContract;
  validateBeforeWrite?: boolean;
  verifyAfterWrite?: boolean;
}

export interface AuthoritativeWriteResponse {
  success: boolean;
  outputPath: string;
  validation: ValidationResult;
  fieldsWritten: string[];
  verification?: VerificationResult;
  error?: string;
  logs: string[];
}

export interface VerificationResult {
  verified: boolean;
  presentFields: string[];
  missingFields: string[];
}

// =============================================================================
// AUTHORITATIVE WRITER
// =============================================================================

/**
 * Write metadata using IPTC contract
 * This is the authoritative metadata writer
 */
export async function writeAuthoritativeMetadata(
  request: AuthoritativeWriteRequest
): Promise<AuthoritativeWriteResponse> {
  const logs: string[] = [];
  const fieldsWritten: string[] = [];
  
  try {
    // Step 1: Validate contract
    if (request.validateBeforeWrite !== false) {
      logs.push('Validating metadata contract...');
      const validation = validateMetadataContract(request.contract);
      
      if (!validation.valid) {
        return {
          success: false,
          outputPath: '',
          validation,
          fieldsWritten: [],
          error: `Validation failed: ${validation.errors.map(e => e.message).join('; ')}`,
          logs,
        };
      }
      logs.push('✅ Validation passed');
    }
    
    // Step 2: Determine output path
    const outputPath = request.outputPath || request.sourcePath;
    
    // Step 3: Copy file if needed
    if (request.outputPath && request.outputPath !== request.sourcePath) {
      await fs.copyFile(request.sourcePath, request.outputPath);
      logs.push(`Copied source to: ${outputPath}`);
    }
    
    // Step 4: Build ExifTool tags
    const tags = buildExifToolTags(request.contract);
    logs.push(`Built ${Object.keys(tags).length} metadata tags`);
    
    // Step 5: Write metadata
    await exiftool.write(outputPath, tags, ['-overwrite_original']);
    
    for (const key of Object.keys(tags)) {
      fieldsWritten.push(key);
    }
    logs.push(`✅ Wrote ${fieldsWritten.length} fields`);
    
    // Step 6: Verify write (optional)
    let verification: VerificationResult | undefined;
    if (request.verifyAfterWrite !== false) {
      logs.push('Verifying metadata write...');
      verification = await verifyMetadataWrite(outputPath);
      
      if (!verification.verified) {
        logs.push(`⚠️ Verification warning: Missing fields: ${verification.missingFields.join(', ')}`);
      } else {
        logs.push('✅ Verification passed');
      }
    }
    
    return {
      success: true,
      outputPath,
      validation: { valid: true, errors: [], warnings: [] },
      fieldsWritten,
      verification,
      logs,
    };
    
  } catch (error) {
    logs.push(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return {
      success: false,
      outputPath: request.outputPath || '',
      validation: { valid: false, errors: [], warnings: [] },
      fieldsWritten,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
    };
  }
}

// =============================================================================
// TAG BUILDER
// =============================================================================

// --- Governance Helper Functions ---

/**
 * Convert boolean/null to XMP-safe string
 */
function governanceBoolToString(value: boolean | null | undefined): 'true' | 'false' | 'unknown' {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return 'unknown';
}

/**
 * Clamp confidence to 0.00-1.00 string format
 */
function governanceClampConfidence(n: number | null | undefined): string | null {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  const clamped = Math.max(0, Math.min(1, n));
  return clamped.toFixed(2);
}

/**
 * Normalize timestamp to ISO format
 */
function governanceIsoTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Build ExifTool tags from metadata contract
 */
function buildExifToolTags(contract: MetadataContract): Record<string, unknown> {
  const { iptc, xmpContextEmbed } = contract;
  const tags: Record<string, unknown> = {};
  
  // =========================================================================
  // IPTC IIM (Legacy - for maximum compatibility)
  // =========================================================================
  
  // ObjectName (Title) - ≤60 chars
  tags['ObjectName'] = iptc.objectName.substring(0, 60);
  
  // Caption-Abstract (Description)
  tags['Caption-Abstract'] = iptc.captionAbstract;
  
  // By-line (Creator)
  tags['By-line'] = iptc.byLine;
  
  // Credit - includes user credit + ContextEmbed tooling attribution
  // Per IPTC standards: "Tools go in Credit"
  const userCredit = iptc.credit;
  const toolAttribution = CONTEXTEMBED_ATTRIBUTION.CREDIT_LINE;
  
  // Combine user credit with tool attribution, separated by ' | '
  // This preserves user's studio/brand credit while adding provenance
  const fullCredit = userCredit 
    ? `${userCredit} | ${toolAttribution}`
    : toolAttribution;
  
  tags['Credit'] = fullCredit;
  
  // Copyright Notice
  tags['CopyrightNotice'] = iptc.copyrightNotice;
  
  // Source
  tags['Source'] = iptc.source;
  
  // Keywords (as array)
  tags['Keywords'] = sanitizeKeywords(iptc.keywords);
  
  // City
  tags['City'] = iptc.city;
  
  // Country
  tags['Country-PrimaryLocationName'] = iptc.country;
  
  // =========================================================================
  // XMP Dublin Core (Modern standard)
  // =========================================================================
  
  tags['XMP-dc:Title'] = iptc.objectName;
  tags['XMP-dc:Description'] = iptc.captionAbstract;
  tags['XMP-dc:Creator'] = iptc.byLine;
  tags['XMP-dc:Rights'] = iptc.copyrightNotice;
  tags['XMP-dc:Subject'] = sanitizeKeywords(iptc.keywords);
  tags['XMP-dc:Source'] = iptc.source;
  
  // =========================================================================
  // XMP Photoshop
  // =========================================================================
  
  tags['XMP-photoshop:Headline'] = iptc.objectName;
  tags['XMP-photoshop:Credit'] = fullCredit; // Mirror IPTC Credit with attribution
  tags['XMP-photoshop:Source'] = iptc.source;
  tags['XMP-photoshop:City'] = iptc.city;
  tags['XMP-photoshop:Country'] = iptc.country;
  
  // =========================================================================
  // XMP Rights
  // =========================================================================
  
  tags['XMP-xmpRights:UsageTerms'] = iptc.rightsUsageTerms;
  tags['XMP-xmpRights:Marked'] = 'True'; // Copyrighted
  
  // =========================================================================
  // EXIF (for basic readers)
  // =========================================================================
  
  tags['ImageDescription'] = iptc.captionAbstract;
  tags['Artist'] = iptc.byLine;
  tags['Copyright'] = iptc.copyrightNotice;
  
  // =========================================================================
  // XMP ContextEmbed (Custom namespace) - v2.1
  // =========================================================================
  
  if (xmpContextEmbed) {
    // --- AI Classification (secondary) ---
    
    if (xmpContextEmbed.sceneType) {
      tags['XMP-contextembed:SceneType'] = xmpContextEmbed.sceneType;
    }
    
    if (xmpContextEmbed.primarySubjects) {
      tags['XMP-contextembed:PrimarySubjects'] = xmpContextEmbed.primarySubjects;
    }
    
    if (xmpContextEmbed.emotionalTone) {
      tags['XMP-contextembed:EmotionalTone'] = xmpContextEmbed.emotionalTone;
    }
    
    if (xmpContextEmbed.intent) {
      tags['XMP-contextembed:Intent'] = xmpContextEmbed.intent;
    }
    
    if (xmpContextEmbed.safetyValidated !== undefined) {
      tags['XMP-contextembed:SafetyValidated'] = xmpContextEmbed.safetyValidated ? 'True' : 'False';
    }
    
    if (xmpContextEmbed.styleFingerprintId) {
      tags['XMP-contextembed:StyleFingerprintId'] = xmpContextEmbed.styleFingerprintId;
    }
    
    if (xmpContextEmbed.visionConfidenceScore !== undefined) {
      tags['XMP-contextembed:VisionConfidenceScore'] = xmpContextEmbed.visionConfidenceScore;
    }
    
    if (xmpContextEmbed.enhancementTraceId) {
      tags['XMP-contextembed:EnhancementTraceId'] = xmpContextEmbed.enhancementTraceId;
    }
    
    // --- Business Identity (proof-first) ---
    
    // businessName is required
    tags['XMP-contextembed:BusinessName'] = xmpContextEmbed.businessName;
    
    // Note: Credit field is already handled above with tooling attribution
    // BusinessName is written to custom XMP namespace for machine-readable provenance
    
    if (xmpContextEmbed.businessWebsite) {
      tags['XMP-contextembed:BusinessWebsite'] = xmpContextEmbed.businessWebsite;
      // Also write to WebStatement for rights linking
      tags['XMP-xmpRights:WebStatement'] = xmpContextEmbed.businessWebsite;
    }
    
    if (xmpContextEmbed.creatorRole) {
      tags['XMP-contextembed:CreatorRole'] = xmpContextEmbed.creatorRole;
    }
    
    // --- Job Evidence (proof-first) ---
    
    // jobType is required
    tags['XMP-contextembed:JobType'] = xmpContextEmbed.jobType;
    
    // serviceCategory is required
    tags['XMP-contextembed:ServiceCategory'] = xmpContextEmbed.serviceCategory;
    
    if (xmpContextEmbed.contextLine) {
      tags['XMP-contextembed:ContextLine'] = xmpContextEmbed.contextLine;
      // Add to SpecialInstructions for DAM compatibility
      tags['XMP-photoshop:Instructions'] = xmpContextEmbed.contextLine;
    }
    
    if (xmpContextEmbed.outcomeProof) {
      tags['XMP-contextembed:OutcomeProof'] = xmpContextEmbed.outcomeProof;
    }
    
    // --- Semantic Location (proof-first) ---
    
    if (xmpContextEmbed.geoFocus) {
      tags['XMP-contextembed:GeoFocus'] = xmpContextEmbed.geoFocus;
    } else if (iptc.city && iptc.country) {
      // Auto-generate GeoFocus from city/country
      tags['XMP-contextembed:GeoFocus'] = `${iptc.city}, ${iptc.country}`;
    }
    
    // --- Continuity / Linkage ---
    
    // assetId is required
    tags['XMP-contextembed:AssetId'] = xmpContextEmbed.assetId;
    // Also write to DocumentID for XMP compatibility
    tags['XMP-xmpMM:DocumentID'] = `xmp.did:${xmpContextEmbed.assetId}`;
    tags['XMP-xmpMM:InstanceID'] = `xmp.iid:${xmpContextEmbed.assetId}-${Date.now()}`;
    
    if (xmpContextEmbed.exportId) {
      tags['XMP-contextembed:ExportId'] = xmpContextEmbed.exportId;
      // Use TransmissionReference for DAM linking
      tags['TransmissionReference'] = xmpContextEmbed.exportId;
      tags['XMP-photoshop:TransmissionReference'] = xmpContextEmbed.exportId;
    }
    
    if (xmpContextEmbed.manifestRef) {
      tags['XMP-contextembed:ManifestRef'] = xmpContextEmbed.manifestRef;
    }
    
    if (xmpContextEmbed.checksum) {
      tags['XMP-contextembed:Checksum'] = xmpContextEmbed.checksum;
    }
    
    // --- IA Structure ---
    
    if (xmpContextEmbed.targetPage) {
      tags['XMP-contextembed:TargetPage'] = xmpContextEmbed.targetPage;
    }
    
    if (xmpContextEmbed.pageRole) {
      tags['XMP-contextembed:PageRole'] = xmpContextEmbed.pageRole;
    }
    
    if (xmpContextEmbed.clusterId) {
      tags['XMP-contextembed:ClusterId'] = xmpContextEmbed.clusterId;
    }
    
    // --- Metadata Version ---
    tags['XMP-contextembed:MetadataVersion'] = xmpContextEmbed.metadataVersion || '2.1';
    
    // --- Tooling Provenance (ALWAYS written for attribution) ---
    // These fields are machine-readable provenance for audits and AI pipelines
    tags['XMP-contextembed:EmbeddedBy'] = CONTEXTEMBED_ATTRIBUTION.EMBEDDED_BY;
    tags['XMP-contextembed:EmbeddingMethod'] = CONTEXTEMBED_ATTRIBUTION.EMBEDDING_METHOD;
    tags['XMP-contextembed:PipelineVersion'] = CONTEXTEMBED_ATTRIBUTION.PIPELINE_VERSION;
    
    // --- Embed Tier (calculated) ---
    const embedTier = calculateEmbedTier(iptc, xmpContextEmbed);
    tags['XMP-contextembed:EmbedTier'] = embedTier;
    
    // --- Governance Attestation (NEW v2.2 - portable proof) ---
    // Makes governance decisions inspectable in the exported file
    const gov = xmpContextEmbed.governance;
    if (gov) {
      // AI detection result
      tags['XMP-contextembed:AIGenerated'] = governanceBoolToString(gov.aiGenerated);
      
      const conf = governanceClampConfidence(gov.aiConfidence);
      if (conf !== null) {
        tags['XMP-contextembed:AIConfidence'] = conf;
      }
      
      // Governance decision
      tags['XMP-contextembed:GovernanceStatus'] = gov.status;
      tags['XMP-contextembed:GovernancePolicy'] = gov.policy;
      
      if (gov.reason) {
        // Keep short to avoid bloat
        tags['XMP-contextembed:GovernanceReason'] = String(gov.reason).slice(0, 280);
      }
      
      // Audit trail
      const checkedAt = governanceIsoTimestamp(gov.checkedAt);
      if (checkedAt) {
        tags['XMP-contextembed:GovernanceCheckedAt'] = checkedAt;
      }
      
      if (gov.decisionRef) {
        tags['XMP-contextembed:GovernanceDecisionRef'] = String(gov.decisionRef).slice(0, 80);
      }
    }
  }
  
  return tags;
}

/**
 * Calculate embed tier based on field completeness
 */
function calculateEmbedTier(
  iptc: IPTCCoreContract,
  xmp: XMPContextEmbedContract
): EmbedTier {
  // Check for AUTHORITY tier (all required + evidence + IA hooks)
  const hasIAHooks = !!(xmp.targetPage && xmp.pageRole);
  const hasFullEvidence = !!(
    xmp.businessName &&
    xmp.jobType &&
    xmp.serviceCategory &&
    xmp.assetId &&
    (xmp.contextLine || xmp.outcomeProof)
  );
  
  if (hasIAHooks && hasFullEvidence) {
    return EMBED_TIERS.AUTHORITY;
  }
  
  // Check for EVIDENCE tier (all required + evidence fields)
  const hasEvidenceFields = !!(
    xmp.businessName &&
    xmp.jobType &&
    xmp.serviceCategory &&
    xmp.assetId
  );
  
  if (hasEvidenceFields) {
    return EMBED_TIERS.EVIDENCE;
  }
  
  // Check for BASIC tier (core IPTC present)
  const hasCoreIPTC = !!(
    iptc.objectName &&
    iptc.captionAbstract &&
    iptc.byLine &&
    iptc.copyrightNotice &&
    iptc.keywords?.length >= 5
  );
  
  if (hasCoreIPTC) {
    return EMBED_TIERS.BASIC;
  }
  
  return EMBED_TIERS.INCOMPLETE;
}

// =============================================================================
// VERIFICATION
// =============================================================================

/**
 * Required fields that must be present after write
 */
const REQUIRED_VERIFICATION_FIELDS = [
  'ObjectName',
  'Caption-Abstract',
  'By-line',
  'CopyrightNotice',
  'Keywords',
  'City',
  'Country-PrimaryLocationName',
];

/**
 * Verify metadata was written correctly
 */
async function verifyMetadataWrite(filePath: string): Promise<VerificationResult> {
  const tags = await exiftool.read(filePath);
  
  const presentFields: string[] = [];
  const missingFields: string[] = [];
  
  for (const field of REQUIRED_VERIFICATION_FIELDS) {
    const value = (tags as Record<string, unknown>)[field];
    
    if (value !== undefined && value !== null && value !== '') {
      presentFields.push(field);
    } else {
      // Check alternate names
      const altValue = getAlternateFieldValue(tags, field);
      if (altValue) {
        presentFields.push(field);
      } else {
        missingFields.push(field);
      }
    }
  }
  
  return {
    verified: missingFields.length === 0,
    presentFields,
    missingFields,
  };
}

/**
 * Get alternate field value (some readers use different names)
 */
function getAlternateFieldValue(tags: Tags, field: string): unknown {
  const alternates: Record<string, string[]> = {
    'ObjectName': ['Title', 'XMP-dc:Title'],
    'Caption-Abstract': ['Description', 'ImageDescription', 'XMP-dc:Description'],
    'By-line': ['Artist', 'Creator', 'XMP-dc:Creator'],
    'CopyrightNotice': ['Copyright', 'Rights', 'XMP-dc:Rights'],
    'Country-PrimaryLocationName': ['Country', 'XMP-photoshop:Country'],
  };
  
  const altNames = alternates[field] || [];
  for (const altName of altNames) {
    const value = (tags as Record<string, unknown>)[altName];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  
  return undefined;
}

// =============================================================================
// HELPER: Convert SynthesizedMetadata to Contract
// =============================================================================

export interface MetadataToContractOptions {
  brand: string;
  photographerName: string;
  credit?: string;
  city: string;
  country: string;
  copyrightTemplate?: string;
  usageTerms?: string;
  sessionType?: string;
  
  // Governance attestation (NEW v2.2)
  governance?: {
    aiGenerated?: boolean | null;
    aiConfidence?: number | null;
    status?: 'approved' | 'blocked' | 'warning' | 'pending';
    policy?: 'deny_ai_proof' | 'conditional' | 'allow';
    reason?: string | null;
    checkedAt?: string | null;
    decisionRef?: string | null;
  };
}

/**
 * Input type for toMetadataContract - accepts any object with these optional fields
 * This is compatible with @contextembed/core SynthesizedMetadata
 */
export interface SynthesizedMetadataInput {
  headline?: string;
  description?: string;
  keywords?: string[];
  title?: string | null;
  scene?: { sceneType?: string | null; } | null;
  intent?: { purpose?: string; emotionalTone?: string; } | null;
  confidence?: { overall?: number; } | null;
  city?: string | null;
  country?: string | null;
  creator?: string | null;
  copyright?: string | null;
  credit?: string | null;
  usageTerms?: string | null;
  // Allow additional properties from SynthesizedMetadata
  [key: string]: unknown;
}

/**
 * Convert synthesized metadata to IPTC contract format
 */
export function toMetadataContract(
  synthesized: SynthesizedMetadataInput,
  options: MetadataToContractOptions
): MetadataContract {
  // Determine session type from scene or default
  const sessionType = options.sessionType || 
    detectSessionType(synthesized.scene?.sceneType) || 
    'Portrait Session';
  
  // Build title in correct format
  const objectName = formatTitle(
    options.brand,
    sessionType,
    'Studio Session'
  );
  
  // Build copyright
  const year = new Date().getFullYear();
  const copyright = options.copyrightTemplate || 
    `© ${year} ${options.brand}. All Rights Reserved.`;
  
  // Build IPTC contract
  const iptc: IPTCCoreContract = {
    objectName,
    captionAbstract: synthesized.description || '',
    byLine: options.photographerName,
    credit: options.credit || options.brand,
    copyrightNotice: copyright,
    source: `${sessionType} - ${options.brand}`,
    keywords: sanitizeKeywords(synthesized.keywords || []),
    city: options.city,
    country: options.country,
    rightsUsageTerms: options.usageTerms || 
      'Personal use only. Commercial licensing available upon request.',
  };
  
  // Build XMP ContextEmbed (v2.1 - includes proof-first fields)
  const xmpContextEmbed: XMPContextEmbedContract = {
    // AI Classification (secondary)
    sceneType: synthesized.scene?.sceneType || 'portrait',
    primarySubjects: extractPrimarySubjects(synthesized.description || ''),
    emotionalTone: synthesized.intent?.emotionalTone || 'neutral',
    intent: synthesized.intent?.purpose || 'portfolio',
    safetyValidated: true, // Default to true, override if needed
    styleFingerprintId: '',
    visionConfidenceScore: synthesized.confidence?.overall ? 
      Math.round(synthesized.confidence.overall * 100) : 0,
    enhancementTraceId: '',
    
    // Business Identity (proof-first)
    businessName: options.brand,
    businessWebsite: undefined,
    creatorRole: undefined,
    
    // Job Evidence (proof-first)
    jobType: 'portfolio', // Default to portfolio, should be overridden by user
    serviceCategory: sessionType,
    contextLine: undefined,
    outcomeProof: undefined,
    
    // Semantic Location
    geoFocus: `${options.city}, ${options.country}`,
    
    // Continuity / Linkage
    assetId: crypto.randomUUID(),
    exportId: undefined,
    manifestRef: undefined,
    checksum: undefined,
    
    // IA Structure
    targetPage: undefined,
    pageRole: undefined,
    clusterId: undefined,
    
    // Metadata Version
    metadataVersion: '2.1',
    
    // Governance Attestation (NEW v2.2 - portable proof)
    governance: options.governance ? {
      aiGenerated: options.governance.aiGenerated ?? null,
      aiConfidence: options.governance.aiConfidence ?? null,
      status: options.governance.status || 'approved',
      policy: options.governance.policy || 'conditional',
      reason: options.governance.reason ?? null,
      checkedAt: options.governance.checkedAt || new Date().toISOString(),
      decisionRef: options.governance.decisionRef ?? null,
    } : undefined,
  };
  
  return { iptc, xmpContextEmbed };
}

/**
 * Detect session type from scene type
 */
function detectSessionType(sceneType?: string | null): string | undefined {
  if (!sceneType) return undefined;
  
  const lower = sceneType.toLowerCase();
  
  if (lower.includes('wedding')) return 'Wedding';
  if (lower.includes('newborn')) return 'Newborn Portrait';
  if (lower.includes('maternity')) return 'Maternity Portrait';
  if (lower.includes('family')) return 'Family Portrait';
  if (lower.includes('corporate') || lower.includes('headshot')) return 'Corporate Headshot';
  if (lower.includes('product')) return 'Product Photography';
  if (lower.includes('real estate') || lower.includes('property')) return 'Real Estate';
  if (lower.includes('event')) return 'Event Coverage';
  if (lower.includes('fashion')) return 'Fashion';
  if (lower.includes('editorial')) return 'Editorial';
  if (lower.includes('commercial')) return 'Commercial';
  
  return 'Portrait Session';
}

/**
 * Extract primary subjects from description
 */
function extractPrimarySubjects(description: string): string {
  // Simple extraction - look for "family", "couple", "baby", etc.
  const subjects: string[] = [];
  const lower = description.toLowerCase();
  
  if (lower.includes('family')) subjects.push('family');
  if (lower.includes('couple')) subjects.push('couple');
  if (lower.includes('baby') || lower.includes('newborn') || lower.includes('infant')) {
    subjects.push('newborn');
  }
  if (lower.includes('child') || lower.includes('children')) subjects.push('children');
  if (lower.includes('portrait')) subjects.push('portrait subject');
  
  return subjects.join(', ') || 'subject';
}
