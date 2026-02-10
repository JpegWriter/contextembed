// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Authorship Integrity Engine — Core Types
 * 
 * AuthorshipStatus is a FINITE STATE MACHINE.
 * Exactly ONE state per image.
 * Assigned ON INGEST.
 * Immutable unless re-ingested.
 * Required before ANY downstream processing.
 * 
 * No additional states. No soft variants. No overrides.
 */

/**
 * Mandatory enum used by ALL CE pipelines.
 * Maps 1:1 to Prisma enum AuthorshipStatus.
 */
export enum AuthorshipStatus {
  /** EXIF present, creator matches CE user profile, no conflicts */
  VERIFIED_ORIGINAL = 'VERIFIED_ORIGINAL',

  /** User self-declared as creator, not machine-verified */
  DECLARED_BY_USER = 'DECLARED_BY_USER',

  /** Default state. Missing/conflicting evidence. No claims permitted. */
  UNVERIFIED = 'UNVERIFIED',

  /** AI-generated content detected by metadata, DigitalSourceType, or model confidence */
  SYNTHETIC_AI = 'SYNTHETIC_AI',
}

/**
 * Structured evidence summary stored per image.
 * NEVER store raw EXIF/IPTC dumps — only extracted key fields.
 */
export interface AuthorshipEvidence {
  /** Signals extracted during classification */
  signals: {
    /** Whether EXIF data was found on the image */
    exifPresent: boolean;
    /** Camera make from EXIF, if present */
    cameraMake?: string;
    /** Camera model from EXIF, if present */
    cameraModel?: string;
    /** EXIF date/time original */
    dateTimeOriginal?: string;
    /** Existing IPTC/XMP creator name */
    existingCreator?: string;
    /** Existing copyright notice */
    existingCopyright?: string;
    /** IPTC DigitalSourceType value */
    digitalSourceType?: string;
    /** Known AI metadata signatures found */
    aiSignaturesFound: string[];
    /** Vision model synthetic confidence (0-1) */
    syntheticConfidence?: number;
  };
  /** Reason codes explaining the classification decision */
  reasonCodes: string[];
  /** Human-readable summary of the classification decision */
  summary: string;
}

/**
 * Result of classifying an image's authorship.
 */
export interface ClassificationResult {
  status: AuthorshipStatus;
  evidence: AuthorshipEvidence;
  /** Whether user declaration is needed (EXIF missing, no conflict) */
  needsUserDeclaration: boolean;
}

/**
 * Image signals extracted from EXIF/IPTC/XMP for classification.
 */
export interface ImageSignals {
  exifPresent: boolean;
  cameraMake?: string;
  cameraModel?: string;
  dateTimeOriginal?: string;
  existingCreator?: string;
  existingCopyright?: string;
  digitalSourceType?: string;
  aiSignaturesFound: string[];
  syntheticConfidence?: number;
}
