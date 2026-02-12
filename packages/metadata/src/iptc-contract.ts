/**
 * IPTC Metadata Contract
 * Enforces strict, authoritative IPTC + XMP metadata rules
 * 
 * This contract is LOCKED - changes require review
 * 
 * v2.1 - Added proof-first fields for evidence-backed authority
 */

// =============================================================================
// JOB TYPES (evidence classification)
// =============================================================================

export const JOB_TYPES = [
  'service-proof',    // Real work for real clients
  'case-study',       // Documented project outcome
  'portfolio',        // Creative showcase
  'testimonial',      // Client-approved highlight
  'before-after',     // Transformation documentation
] as const;

export type JobType = typeof JOB_TYPES[number];

// =============================================================================
// PAGE ROLES (IA structure hooks)
// =============================================================================

export const PAGE_ROLES = [
  'money',      // Service pages that convert
  'trust',      // Testimonials, reviews, about
  'support',    // Blog, educational content
  'authority',  // Case studies, press, awards
] as const;

export type PageRole = typeof PAGE_ROLES[number];

// =============================================================================
// GOVERNANCE ATTESTATION (NEW - v2.2 portable proof)
// =============================================================================

export const GOVERNANCE_STATUSES = [
  'approved',
  'blocked', 
  'warning',
  'pending',
] as const;

export type GovernanceStatus = typeof GOVERNANCE_STATUSES[number];

export const GOVERNANCE_POLICIES = [
  'deny_ai_proof',  // Strict: Block AI for proof roles
  'conditional',    // Default: AI proof requires review
  'allow',          // Permissive: All content allowed
] as const;

export type GovernancePolicy = typeof GOVERNANCE_POLICIES[number];

/**
 * Governance Attestation
 * 
 * Portable proof of AI detection + governance decision.
 * Written to XMP namespace and manifest for third-party verification.
 */
export interface GovernanceAttestation {
  // AI detection result
  aiGenerated: boolean | null;           // true/false/null (unknown)
  aiConfidence?: number | null;          // 0..1 confidence score
  
  // Governance decision
  status: GovernanceStatus;              // approved/blocked/warning/pending
  policy: GovernancePolicy;              // deny_ai_proof/conditional/allow
  reason?: string | null;                // Human-readable reason
  
  // Audit trail
  checkedAt: string;                     // ISO timestamp
  decisionRef?: string | null;           // Short ref/hash/id for audit lookup
}

// =============================================================================
// BUSINESS IDENTITY CONTRACT (NEW - proof-first)
// =============================================================================

export interface BusinessIdentityContract {
  // Business/Studio name (required for authority)
  businessName: string;
  
  // Business website URL (optional)
  businessWebsite?: string;
  
  // Creator's role (optional, e.g., "Founder / Photographer")
  creatorRole?: string;
}

// =============================================================================
// JOB EVIDENCE CONTRACT (NEW - proof-first)
// =============================================================================

export interface JobEvidenceContract {
  // Type of job (required)
  jobType: JobType;
  
  // Service category (required, controlled vocabulary)
  serviceCategory: string;
  
  // Short context line provided by user (optional, 1-liner)
  contextLine?: string;
  
  // Outcome proof (optional, e.g., "gallery delivered", "project completed")
  outcomeProof?: string;
}

// =============================================================================
// SEMANTIC LOCATION CONTRACT (enhanced)
// =============================================================================

export interface SemanticLocationContract {
  // City (required)
  city: string;
  
  // Region/State (optional)
  region?: string;
  
  // Country (required)
  country: string;
  
  // Country code ISO 3166 (optional)
  countryCode?: string;
  
  // GeoFocus summary (e.g., "Vienna, AT") - for quick authority
  geoFocus?: string;
}

// =============================================================================
// CONTINUITY / LINKAGE CONTRACT (NEW - manifest wiring)
// =============================================================================

export interface ContinuityContract {
  // Unique asset ID (UUID)
  assetId: string;
  
  // Export batch ID
  exportId?: string;
  
  // Reference to manifest.json
  manifestRef?: string;
  
  // SHA-256 checksum of original file
  checksum?: string;
}

// =============================================================================
// IA STRUCTURE CONTRACT (NEW - SEO/IA hooks)
// =============================================================================

export interface IAStructureContract {
  // Target page path on website
  targetPagePath?: string;
  
  // Page role classification
  pageRole?: PageRole;
  
  // Cluster ID for topical grouping
  clusterId?: string;
}

// =============================================================================
// IPTC CORE CONTRACT - MANDATORY FIELDS
// =============================================================================

export interface IPTCCoreContract {
  // IPTC:ObjectName - ≤60 chars, branded title
  objectName: string;
  
  // IPTC:Caption-Abstract - Full semantic description (200-1200 chars)
  captionAbstract: string;
  
  // IPTC:By-line - Photographer name
  byLine: string;
  
  // IPTC:Credit - Studio / Brand
  credit: string;
  
  // IPTC:CopyrightNotice - © Brand
  copyrightNotice: string;
  
  // IPTC:Source - Session type
  source: string;
  
  // IPTC:Keywords - Atomic nouns (min 5, max 15)
  keywords: string[];
  
  // IPTC:City - Required
  city: string;
  
  // IPTC:Country-PrimaryLocationName - Required
  country: string;
  
  // IPTC:RightsUsageTerms - License text
  rightsUsageTerms: string;
}

// =============================================================================
// XMP CONTEXTEMBED NAMESPACE - CUSTOM FIELDS (v2.1)
// =============================================================================

export interface XMPContextEmbedContract {
  // --- AI Classification (secondary) ---
  
  // Scene classification
  sceneType?: string;
  
  // Primary subjects identified
  primarySubjects?: string;
  
  // Emotional tone of image
  emotionalTone?: string;
  
  // Image intent/purpose
  intent?: string;
  
  // Safety validation for sensitive content (newborns, children)
  safetyValidated?: boolean;
  
  // Style fingerprint for consistency
  styleFingerprintId?: string;
  
  // AI vision confidence score (0-100)
  visionConfidenceScore?: number;
  
  // Processing trace ID for audit
  enhancementTraceId?: string;
  
  // --- Business Identity (proof-first) ---
  
  // Business/Studio name
  businessName: string;
  
  // Business website URL
  businessWebsite?: string;
  
  // Creator role (e.g., "Founder / Photographer")
  creatorRole?: string;
  
  // --- Job Evidence (proof-first) ---
  
  // Job type classification
  jobType: JobType;
  
  // Service category
  serviceCategory: string;
  
  // Short user-provided context line
  contextLine?: string;
  
  // Outcome proof statement
  outcomeProof?: string;
  
  // --- Semantic Location (proof-first) ---
  
  // GeoFocus summary (e.g., "Vienna, AT")
  geoFocus?: string;
  
  // --- Continuity / Linkage ---
  
  // Unique asset ID (UUID)
  assetId: string;
  
  // Export batch ID
  exportId?: string;
  
  // Reference to manifest.json
  manifestRef?: string;
  
  // SHA-256 checksum
  checksum?: string;
  
  // --- IA Structure ---
  
  // Target page path
  targetPage?: string;
  
  // Page role classification
  pageRole?: PageRole;
  
  // Cluster ID for topical grouping
  clusterId?: string;
  
  // --- Metadata Version ---
  metadataVersion: string;
  
  // --- Governance Attestation (NEW v2.2 - portable proof) ---
  governance?: GovernanceAttestation;
  
  // --- Public Verification (NEW v2.3 - forensic-grade verification) ---
  // Optional verification link embedding (requires project opt-in)
  verificationToken?: string;   // UUID token for verification
  verificationURL?: string;     // Full verification URL
}

// =============================================================================
// FULL METADATA CONTRACT
// =============================================================================

export interface MetadataContract {
  iptc: IPTCCoreContract;
  xmpContextEmbed: XMPContextEmbedContract;
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// Field length constraints (v2.1 - tightened for proof-first)
export const IPTC_CONSTRAINTS = {
  // Core IPTC fields
  objectName: { maxLength: 60, required: true },
  captionAbstract: { minLength: 200, maxLength: 1200, required: true }, // Reduced max
  byLine: { maxLength: 80, required: true },
  credit: { maxLength: 120, required: true },
  copyrightNotice: { maxLength: 160, required: true },
  source: { maxLength: 120, required: true },
  keywords: { minCount: 5, maxCount: 15, itemMaxLength: 24, required: true }, // Reduced max, per-item limit
  city: { maxLength: 80, required: true },
  country: { maxLength: 80, required: true },
  rightsUsageTerms: { maxLength: 500, required: true },
  
  // NEW: Proof-first fields
  businessName: { maxLength: 120, required: true },
  businessWebsite: { maxLength: 255, required: false },
  creatorRole: { maxLength: 80, required: false },
  jobType: { required: true }, // enum validated separately
  serviceCategory: { maxLength: 60, required: true },
  contextLine: { maxLength: 200, required: false },
  outcomeProof: { maxLength: 200, required: false },
  geoFocus: { maxLength: 60, required: false },
  assetId: { required: true }, // UUID
  exportId: { required: false },
  manifestRef: { maxLength: 255, required: false },
  checksum: { required: false },
  targetPage: { maxLength: 255, required: false },
  pageRole: { required: false }, // enum validated separately
  clusterId: { maxLength: 60, required: false },
} as const;

// =============================================================================
// SPAM KEYWORD BLOCKLIST
// =============================================================================

export const SPAM_KEYWORDS = [
  'best', 'top', 'cheap', 'affordable', 'amazing', 'awesome', 'incredible',
  'professional', 'expert', 'quality', 'guaranteed', 'free', '#1', 'number one',
  'leading', 'premier', 'elite', 'ultimate', 'perfect', 'excellent', 'luxury',
  'exclusive', 'premium', 'world-class', 'unbeatable', 'superb', 'stunning',
] as const;

// =============================================================================
// EMBED HEALTH TIERS
// =============================================================================

export const EMBED_TIERS = {
  AUTHORITY: 'AUTHORITY',   // All required + evidence + IA hooks
  EVIDENCE: 'EVIDENCE',     // All required + evidence fields
  BASIC: 'BASIC',           // Core IPTC only
  INCOMPLETE: 'INCOMPLETE', // Missing required fields
} as const;

export type EmbedTier = typeof EMBED_TIERS[keyof typeof EMBED_TIERS];

// =============================================================================
// TITLE FORMAT RULE
// =============================================================================

/**
 * Title Format (STRICT):
 * [Brand] – [Session Type] – [Primary Subject]
 * 
 * ❌ DO NOT include:
 * - Family names
 * - Emotions  
 * - Time references
 * - "Captured by..."
 * 
 * ✅ Examples:
 * "New Age Fotografie – Family Portrait – Studio Session"
 * "Matt Pantling Photography – Wedding – Ceremony"
 */
export function formatTitle(
  brand: string,
  sessionType: string,
  primarySubject: string
): string {
  const title = `${brand} – ${sessionType} – ${primarySubject}`;
  
  if (title.length > 60) {
    // Truncate primarySubject to fit
    const maxSubjectLength = 60 - brand.length - sessionType.length - 6; // 6 for " – " x2
    const truncatedSubject = primarySubject.substring(0, Math.max(10, maxSubjectLength));
    return `${brand} – ${sessionType} – ${truncatedSubject}`;
  }
  
  return title;
}

// =============================================================================
// KEYWORD RULES (v2.1 - enhanced with spam detection + normalization)
// =============================================================================

/**
 * Keywords must be:
 * - Atomic (single concepts)
 * - Nouns only
 * - No verbs, punctuation, or sentences
 * - Max 24 characters each
 * - 5-15 total keywords
 * - No spam/generic marketing terms
 * 
 * ❌ Bad: "family having fun", "beautiful sunset captured", "best photographer"
 * ✅ Good: "family portrait", "sunset", "studio photography"
 */
export function sanitizeKeywords(keywords: string[]): string[] {
  const maxKeywords = IPTC_CONSTRAINTS.keywords.maxCount;
  const maxItemLength = IPTC_CONSTRAINTS.keywords.itemMaxLength;
  
  return keywords
    .map(k => k.trim())
    .filter(k => {
      // Remove if too long
      if (k.length > maxItemLength) return false;
      // Remove if contains sentence indicators
      if (k.includes('.') || k.includes('!') || k.includes('?')) return false;
      // Remove if too many words (likely a sentence)
      if (k.split(' ').length > 3) return false;
      // Remove spam keywords
      const lower = k.toLowerCase();
      if (SPAM_KEYWORDS.some(spam => lower === spam || lower.includes(spam))) {
        return false;
      }
      // Keep if non-empty
      return k.length > 0;
    })
    .map(k => {
      // Normalize: remove articles, clean whitespace
      return k
        .replace(/^(a|an|the)\s+/i, '')
        .replace(/\s+(is|are|was|were|being|been)\s+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    })
    // Deduplicate (case-insensitive comparison, preserve original case)
    .filter((k, i, arr) => {
      const lowerK = k.toLowerCase();
      return arr.findIndex(item => item.toLowerCase() === lowerK) === i;
    })
    // Limit to max count
    .slice(0, maxKeywords);
}

/**
 * Check if a keyword is on the spam blocklist
 */
export function isSpamKeyword(keyword: string): boolean {
  const lower = keyword.toLowerCase().trim();
  return SPAM_KEYWORDS.some(spam => lower === spam || lower.includes(spam));
}

/**
 * Validate keywords against constraints
 */
export function validateKeywords(keywords: string[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check count
  if (keywords.length < IPTC_CONSTRAINTS.keywords.minCount) {
    errors.push(`At least ${IPTC_CONSTRAINTS.keywords.minCount} keywords required (got ${keywords.length})`);
  }
  if (keywords.length > IPTC_CONSTRAINTS.keywords.maxCount) {
    warnings.push(`Too many keywords: ${keywords.length} (max ${IPTC_CONSTRAINTS.keywords.maxCount}) - will be truncated`);
  }
  
  // Check individual keywords
  for (const kw of keywords) {
    if (kw.length > IPTC_CONSTRAINTS.keywords.itemMaxLength) {
      warnings.push(`Keyword too long: "${kw}" (${kw.length} chars, max ${IPTC_CONSTRAINTS.keywords.itemMaxLength})`);
    }
    if (isSpamKeyword(kw)) {
      warnings.push(`Spam keyword detected: "${kw}" - will be removed`);
    }
  }
  
  // Check for duplicates
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  const duplicates = lowerKeywords.filter((k, i) => lowerKeywords.indexOf(k) !== i);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate keywords found: ${[...new Set(duplicates)].join(', ')}`);
  }
  
  const sanitized = sanitizeKeywords(keywords);
  
  return {
    valid: errors.length === 0 && sanitized.length >= IPTC_CONSTRAINTS.keywords.minCount,
    errors,
    warnings,
    sanitized
  };
}

// =============================================================================
// CAPTION STRUCTURE
// =============================================================================

/**
 * Caption Structure (REQUIRED):
 * 1. Who is present
 * 2. What is happening
 * 3. Emotional tone
 * 4. Environment (studio/location)
 * 5. Optional single brand mention
 * 
 * Length: 200-2000 characters (2-5 sentences)
 * No hashtags. No keyword stuffing.
 */
export interface CaptionElements {
  subjects: string;           // Who is present
  action: string;             // What is happening
  emotionalTone: string;      // Emotional tone
  environment: string;        // Studio/location context
  brandMention?: string;      // Optional brand reference
}

export function formatCaption(elements: CaptionElements): string {
  const parts = [
    elements.subjects,
    elements.action,
    `The atmosphere is ${elements.emotionalTone.toLowerCase()}.`,
    elements.environment,
  ];
  
  if (elements.brandMention) {
    parts.push(elements.brandMention);
  }
  
  return parts.filter(p => p && p.trim()).join(' ');
}

// =============================================================================
// SESSION TYPES (for Title formatting)
// =============================================================================

export const SESSION_TYPES = [
  'Family Portrait',
  'Wedding',
  'Newborn Portrait',
  'Maternity Portrait',
  'Corporate Headshot',
  'Product Photography',
  'Real Estate',
  'Event Coverage',
  'Lifestyle',
  'Fashion',
  'Portrait Session',
  'Studio Session',
  'Location Session',
  'Editorial',
  'Commercial',
] as const;

export type SessionType = typeof SESSION_TYPES[number];

// =============================================================================
// SAFETY VALIDATION (for newborns/children)
// =============================================================================

export function requiresSafetyValidation(sceneType: string, subjects: string[]): boolean {
  const sensitiveKeywords = ['newborn', 'infant', 'baby', 'child', 'children', 'minor'];
  
  const hasSensitiveSubjects = subjects.some(s => 
    sensitiveKeywords.some(k => s.toLowerCase().includes(k))
  );
  
  const hasSensitiveScene = sensitiveKeywords.some(k => 
    sceneType.toLowerCase().includes(k)
  );
  
  return hasSensitiveSubjects || hasSensitiveScene;
}

// =============================================================================
// EXPORT FAILURE CONDITIONS
// =============================================================================

export const EXPORT_FAILURE_CONDITIONS = {
  TITLE_TOO_LONG: 'Title exceeds 60 characters',
  CAPTION_TOO_SHORT: 'Caption must be at least 200 characters',
  KEYWORDS_TOO_FEW: 'At least 5 keywords are required',
  CREATOR_MISSING: 'Creator/Photographer name is required',
  COPYRIGHT_MISSING: 'Copyright notice is required',
  CITY_MISSING: 'City is required for proper attribution',
  COUNTRY_MISSING: 'Country is required for proper attribution',
  SAFETY_NOT_VALIDATED: 'Safety validation required for images containing minors',
  CREDIT_MISSING: 'Credit/Brand is required',
  RIGHTS_MISSING: 'Usage rights terms are required',
} as const;

export type ExportFailureReason = keyof typeof EXPORT_FAILURE_CONDITIONS;
