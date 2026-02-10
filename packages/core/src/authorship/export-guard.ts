// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Export Guard — FINAL GATE before ANY export.
 * 
 * Before ANY export (image, metadata, case study, AEO block, WordPress post):
 * Run validateAuthorshipClaims(exportPayload)
 * 
 * If the payload implies real-world authorship not permitted by authorshipStatus:
 * → BLOCK EXPORT.
 * 
 * This refusal is intentional and correct.
 * ContextEmbed may refuse to export content.
 * That is not a failure. That is the product.
 */

import { AuthorshipStatus } from './types';
import { ReasonCode } from './reason-codes';
import { LanguageGovernor } from './language-governor';
import { MetadataEmbeddingRules } from './metadata-rules';

export interface ExportPayload {
  /** The authorship status of the image(s) being exported */
  authorshipStatus: AuthorshipStatus;
  /** Export type for audit logging */
  exportType: 'metadata' | 'case_study' | 'wp_post' | 'aeo_block';
  /** Metadata being exported (if applicable) */
  metadata?: Record<string, unknown>;
  /** Generated text content (case studies, alt text, etc.) */
  textContent?: string[];
  /** Creator name being claimed */
  claimedCreator?: string;
  /** Whether copyright is being set */
  settingCopyright?: boolean;
}

export interface ExportValidationResult {
  /** Whether the export is allowed */
  allowed: boolean;
  /** Reason codes for blocking (empty if allowed) */
  reasonCodes: ReasonCode[];
  /** Human-readable messages for each violation */
  violations: string[];
  /** Fields that were removed from metadata (if filtering was applied) */
  filteredFields: string[];
}

export class ExportGuard {
  private languageGovernor: LanguageGovernor;
  private metadataRules: MetadataEmbeddingRules;

  constructor() {
    this.languageGovernor = new LanguageGovernor();
    this.metadataRules = new MetadataEmbeddingRules();
  }

  /**
   * Validate an export payload against authorship rules.
   * 
   * BLOCKS export if:
   * - Generated text contains forbidden authorship language
   * - Metadata contains fields not permitted by authorship status
   * - Creator/copyright claims are not permitted
   * 
   * This refusal is intentional and correct.
   */
  validateAuthorshipClaims(payload: ExportPayload): ExportValidationResult {
    const reasonCodes: ReasonCode[] = [];
    const violations: string[] = [];
    const filteredFields: string[] = [];

    const { authorshipStatus } = payload;
    const permissions = this.metadataRules.getPermissions(authorshipStatus);

    // 1. Check metadata field permissions
    if (payload.metadata) {
      if (payload.metadata.creator && !permissions.allowCreator) {
        reasonCodes.push(ReasonCode.CREATOR_FIELD_BLOCKED);
        violations.push(
          `Creator field "${payload.metadata.creator}" blocked for ${authorshipStatus} images. ` +
          `Only VERIFIED_ORIGINAL images may set IPTC:Creator.`
        );
      }

      if (payload.metadata.copyright && !permissions.allowCopyrightOverwrite) {
        reasonCodes.push(ReasonCode.COPYRIGHT_OVERWRITE_BLOCKED);
        violations.push(
          `Copyright overwrite blocked for ${authorshipStatus} images.`
        );
      }
    }

    // 2. Check explicit claims
    if (payload.claimedCreator && !permissions.allowCreator) {
      reasonCodes.push(ReasonCode.AUTHORSHIP_CLAIM_BLOCKED);
      violations.push(
        `Authorship claim "${payload.claimedCreator}" not permitted for ${authorshipStatus} images.`
      );
    }

    if (payload.settingCopyright && !permissions.allowCopyrightOverwrite) {
      reasonCodes.push(ReasonCode.COPYRIGHT_OVERWRITE_BLOCKED);
      violations.push(
        `Copyright cannot be overwritten for ${authorshipStatus} images.`
      );
    }

    // 3. Check language governance on generated text
    if (payload.textContent && payload.textContent.length > 0) {
      for (const text of payload.textContent) {
        const langResult = this.languageGovernor.validate(text, authorshipStatus);
        if (!langResult.valid) {
          reasonCodes.push(ReasonCode.LANGUAGE_VIOLATION);
          for (const v of langResult.violations) {
            violations.push(v.message);
          }
        }
      }
    }

    // Deduplicate reason codes
    const uniqueReasonCodes = [...new Set(reasonCodes)];

    return {
      allowed: uniqueReasonCodes.length === 0,
      reasonCodes: uniqueReasonCodes,
      violations,
      filteredFields,
    };
  }
}
