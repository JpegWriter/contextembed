// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Metadata Embedding Rules
 * 
 * Controls EXACTLY which IPTC/XMP fields may be written
 * based on AuthorshipStatus.
 * 
 * VERIFIED_ORIGINAL → Full attribution allowed
 * DECLARED_BY_USER → CE namespace only, no IPTC:Creator overwrite
 * UNVERIFIED → Preserve originals, add NO authorship claims
 * SYNTHETIC_AI → Mark as AI-generated, no photographer attribution
 */

import { AuthorshipStatus } from './types';
import { ReasonCode } from './reason-codes';

/**
 * XMP-AuthorshipIntegrity block — written by CE to all images.
 */
export interface AuthorshipXmpBlock {
  'AuthorshipIntegrity:AuthorshipStatus': string;
  'AuthorshipIntegrity:DeclaredAuthor'?: string;
  'AuthorshipIntegrity:VerificationLevel'?: string;
  'AuthorshipIntegrity:HumanRole'?: string;
  'AuthorshipIntegrity:GenerationTool'?: string;
  'AuthorshipIntegrity:ClassifiedAt'?: string;
  'AuthorshipIntegrity:EngineVersion'?: string;
}

/**
 * Describes which metadata fields are allowed/forbidden for a given status.
 */
export interface MetadataPermissions {
  /** Whether IPTC:Creator can be set to the user's name */
  allowCreator: boolean;
  /** Whether IPTC:Copyright can be overwritten */
  allowCopyrightOverwrite: boolean;
  /** Whether full provenance metadata is allowed */
  allowFullProvenance: boolean;
  /** Whether DigitalSourceType should be forced to computerGenerated */
  forceDigitalSourceTypeAI: boolean;
  /** Whether original metadata must be preserved without changes */
  preserveOriginals: boolean;
  /** Reason codes for any blocked fields */
  blockedReasons: ReasonCode[];
}

export class MetadataEmbeddingRules {
  
  /**
   * Get permissions for metadata embedding based on authorship status.
   */
  getPermissions(status: AuthorshipStatus): MetadataPermissions {
    switch (status) {
      case AuthorshipStatus.VERIFIED_ORIGINAL:
        return {
          allowCreator: true,
          allowCopyrightOverwrite: true,
          allowFullProvenance: true,
          forceDigitalSourceTypeAI: false,
          preserveOriginals: false,
          blockedReasons: [],
        };

      case AuthorshipStatus.DECLARED_BY_USER:
        return {
          allowCreator: false,
          allowCopyrightOverwrite: false,
          allowFullProvenance: false,
          forceDigitalSourceTypeAI: false,
          preserveOriginals: true,
          blockedReasons: [
            ReasonCode.CREATOR_FIELD_BLOCKED,
            ReasonCode.COPYRIGHT_OVERWRITE_BLOCKED,
          ],
        };

      case AuthorshipStatus.UNVERIFIED:
        return {
          allowCreator: false,
          allowCopyrightOverwrite: false,
          allowFullProvenance: false,
          forceDigitalSourceTypeAI: false,
          preserveOriginals: true,
          blockedReasons: [
            ReasonCode.CREATOR_FIELD_BLOCKED,
            ReasonCode.COPYRIGHT_OVERWRITE_BLOCKED,
            ReasonCode.AUTHORSHIP_CLAIM_BLOCKED,
          ],
        };

      case AuthorshipStatus.SYNTHETIC_AI:
        return {
          allowCreator: false,
          allowCopyrightOverwrite: false,
          allowFullProvenance: false,
          forceDigitalSourceTypeAI: true,
          preserveOriginals: false,
          blockedReasons: [
            ReasonCode.CREATOR_FIELD_BLOCKED,
            ReasonCode.COPYRIGHT_OVERWRITE_BLOCKED,
          ],
        };

      default:
        // Unknown status → most restrictive
        return {
          allowCreator: false,
          allowCopyrightOverwrite: false,
          allowFullProvenance: false,
          forceDigitalSourceTypeAI: false,
          preserveOriginals: true,
          blockedReasons: [ReasonCode.AUTHORSHIP_CLAIM_BLOCKED],
        };
    }
  }

  /**
   * Build the CE AuthorshipIntegrity XMP block for embedding.
   */
  buildXmpBlock(
    status: AuthorshipStatus,
    options?: {
      declaredAuthor?: string;
      humanRole?: 'prompt-author' | 'editor' | 'curator';
      generationTool?: string;
    }
  ): AuthorshipXmpBlock {
    const block: AuthorshipXmpBlock = {
      'AuthorshipIntegrity:AuthorshipStatus': status,
      'AuthorshipIntegrity:ClassifiedAt': new Date().toISOString(),
      'AuthorshipIntegrity:EngineVersion': '1.0',
    };

    switch (status) {
      case AuthorshipStatus.VERIFIED_ORIGINAL:
        block['AuthorshipIntegrity:VerificationLevel'] = 'machine-verified';
        break;

      case AuthorshipStatus.DECLARED_BY_USER:
        block['AuthorshipIntegrity:VerificationLevel'] = 'not-verified';
        if (options?.declaredAuthor) {
          block['AuthorshipIntegrity:DeclaredAuthor'] = options.declaredAuthor;
        }
        break;

      case AuthorshipStatus.UNVERIFIED:
        block['AuthorshipIntegrity:VerificationLevel'] = 'unverified';
        break;

      case AuthorshipStatus.SYNTHETIC_AI:
        block['AuthorshipIntegrity:HumanRole'] = options?.humanRole || 'prompt-author';
        if (options?.generationTool) {
          block['AuthorshipIntegrity:GenerationTool'] = options.generationTool;
        }
        break;
    }

    return block;
  }

  /**
   * Filter synthesized metadata based on authorship permissions.
   * Removes fields the status doesn't permit.
   * 
   * Returns the filtered metadata and a list of fields that were removed.
   */
  filterMetadata(
    metadata: Record<string, unknown>,
    status: AuthorshipStatus,
    userName?: string
  ): { filtered: Record<string, unknown>; removedFields: string[] } {
    const permissions = this.getPermissions(status);
    const filtered = { ...metadata };
    const removedFields: string[] = [];

    if (!permissions.allowCreator) {
      if ('creator' in filtered) {
        removedFields.push('creator');
        delete filtered.creator;
      }
    }

    if (!permissions.allowCopyrightOverwrite) {
      if ('copyright' in filtered) {
        removedFields.push('copyright');
        delete filtered.copyright;
      }
    }

    // For SYNTHETIC_AI, force the digital source type
    if (permissions.forceDigitalSourceTypeAI) {
      (filtered as any).digitalSourceType = 'computerGenerated';
    }

    // For VERIFIED_ORIGINAL, ensure creator is set if provided
    if (status === AuthorshipStatus.VERIFIED_ORIGINAL && userName) {
      filtered.creator = userName;
    }

    return { filtered, removedFields };
  }
}
