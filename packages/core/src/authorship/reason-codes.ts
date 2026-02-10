// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Reason Codes — Shared enum for all CE governance decisions.
 * Used in evidence, event logs, and export blocking.
 * Machine-readable. No long text.
 */

export enum ReasonCode {
  // Classification reasons
  AI_DETECTED = 'AI_DETECTED',
  EXIF_PRESENT_MATCH = 'EXIF_PRESENT_MATCH',
  EXIF_MISSING_NO_CONFLICT = 'EXIF_MISSING_NO_CONFLICT',
  CONFLICTING_CREATOR_FOUND = 'CONFLICTING_CREATOR_FOUND',
  USER_DECLARED_TRUE = 'USER_DECLARED_TRUE',
  USER_DECLARED_FALSE = 'USER_DECLARED_FALSE',
  DIGITAL_SOURCE_TYPE_AI = 'DIGITAL_SOURCE_TYPE_AI',
  HIGH_SYNTHETIC_CONFIDENCE = 'HIGH_SYNTHETIC_CONFIDENCE',
  AI_METADATA_SIGNATURE = 'AI_METADATA_SIGNATURE',
  
  // Export blocking reasons
  LANGUAGE_VIOLATION = 'LANGUAGE_VIOLATION',
  AUTHORSHIP_CLAIM_BLOCKED = 'AUTHORSHIP_CLAIM_BLOCKED',
  CREATOR_FIELD_BLOCKED = 'CREATOR_FIELD_BLOCKED',
  COPYRIGHT_OVERWRITE_BLOCKED = 'COPYRIGHT_OVERWRITE_BLOCKED',
  
  // Error reasons
  WP_ERROR = 'WP_ERROR',
  METADATA_WRITE_ERROR = 'METADATA_WRITE_ERROR',
  EXPORT_VALIDATION_FAILED = 'EXPORT_VALIDATION_FAILED',
}

export const REASON_CODE_LABELS: Record<ReasonCode, string> = {
  [ReasonCode.AI_DETECTED]: 'AI-generated content detected',
  [ReasonCode.EXIF_PRESENT_MATCH]: 'EXIF data present, creator matches user profile',
  [ReasonCode.EXIF_MISSING_NO_CONFLICT]: 'No EXIF data, no conflicting authorship',
  [ReasonCode.CONFLICTING_CREATOR_FOUND]: 'Existing creator does not match user',
  [ReasonCode.USER_DECLARED_TRUE]: 'User declared as original creator',
  [ReasonCode.USER_DECLARED_FALSE]: 'User declined creator declaration',
  [ReasonCode.DIGITAL_SOURCE_TYPE_AI]: 'DigitalSourceType indicates AI generation',
  [ReasonCode.HIGH_SYNTHETIC_CONFIDENCE]: 'High confidence of synthetic/AI content',
  [ReasonCode.AI_METADATA_SIGNATURE]: 'Known AI tool metadata signature found',
  [ReasonCode.LANGUAGE_VIOLATION]: 'Generated text violates authorship language rules',
  [ReasonCode.AUTHORSHIP_CLAIM_BLOCKED]: 'Authorship claim not permitted by status',
  [ReasonCode.CREATOR_FIELD_BLOCKED]: 'Creator field blocked for this authorship status',
  [ReasonCode.COPYRIGHT_OVERWRITE_BLOCKED]: 'Copyright overwrite blocked for this status',
  [ReasonCode.WP_ERROR]: 'WordPress publishing error',
  [ReasonCode.METADATA_WRITE_ERROR]: 'Metadata write error',
  [ReasonCode.EXPORT_VALIDATION_FAILED]: 'Export validation failed',
};
