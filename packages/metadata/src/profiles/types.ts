/**
 * Export Profile Type System
 *
 * Defines the contracts for pluggable metadata-embed profiles.
 * Every profile receives a UserContext + optional asset-level overrides
 * and returns a flat ExifTool tag map ready for writing.
 */

// =============================================================================
// USER / ASSET CONTEXT
// =============================================================================

/**
 * Caller-supplied identity & content context.
 * Populated from the authenticated user + asset record.
 */
export interface UserContext {
  /** Display name (required – goes into Artist / By-line / dc:creator) */
  displayName: string;

  /** Business or studio name (optional – used for Credit fallback) */
  businessName?: string;

  /** Primary website URL (optional – used for Source) */
  website?: string;
}

/**
 * Per-asset content fields that a profile may consume.
 * Every field is optional – profiles must handle absent values gracefully.
 */
export interface AssetContext {
  /** Short alt-text (≤160 chars) – EXIF ImageDescription */
  shortAlt?: string;

  /** Long description / caption – IPTC Caption-Abstract, XMP dc:description */
  longDescription?: string;

  /** Structured keyword list */
  structuredKeywords?: string[];
}

/**
 * Options that control write behaviour.
 */
export interface EmbedOptions {
  /**
   * When true the profile may overwrite existing user metadata.
   * When false (default) existing values are preserved.
   */
  overwrite?: boolean;
}

// =============================================================================
// PROFILE CONTRACT
// =============================================================================

/** Union of all registered profile names (extend as new profiles land). */
export type ProfileName = 'CE_PRODUCTION_STANDARD' | 'CE_LAB_FORENSIC';

/**
 * Every profile must implement this interface.
 */
export interface EmbedProfile {
  /** Canonical profile identifier – stored in CE:ExportProfile */
  readonly name: ProfileName;

  /** Human-readable one-liner for logs / manifests */
  readonly description: string;

  /**
   * Build the flat ExifTool tag map for this profile.
   *
   * @param user     Authenticated user identity
   * @param asset    Per-image content fields
   * @param options  Write-behaviour flags
   * @returns        ExifTool-compatible tag map
   */
  buildTags(
    user: UserContext,
    asset: AssetContext,
    options: EmbedOptions,
  ): Record<string, string | string[] | number | boolean>;
}

// =============================================================================
// EMBED RESULT
// =============================================================================

export interface ProfileEmbedResult {
  success: boolean;
  profileName: ProfileName;
  outputPath: string;
  fieldsWritten: string[];
  warnings: string[];
  verification: {
    verified: boolean;
    present: string[];
    missing: string[];
  };
  durationMs: number;
  error?: string;
}
