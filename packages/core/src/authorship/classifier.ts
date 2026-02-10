// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Authorship Classifier
 * 
 * Classifies images using a STRICT priority order (stop on first match):
 * 1. Synthetic detection → SYNTHETIC_AI
 * 2. Verified original → VERIFIED_ORIGINAL
 * 3. Missing EXIF, no conflict → prompt user (UNVERIFIED until declared)
 * 4. Conflicting authorship → UNVERIFIED
 * 
 * There are NO override paths.
 * Downgrade on uncertainty.
 * Never auto-promote.
 */

import { 
  AuthorshipStatus, 
  AuthorshipEvidence, 
  ClassificationResult, 
  ImageSignals 
} from './types';
import { ReasonCode } from './reason-codes';

/** Synthetic confidence threshold — above this, image is classified as AI */
const SYNTHETIC_THRESHOLD = 0.7;

/** Known AI metadata signatures in EXIF/XMP */
const AI_METADATA_SIGNATURES = [
  'stable diffusion',
  'midjourney',
  'dall-e',
  'dalle',
  'comfyui',
  'automatic1111',
  'invoke ai',
  'leonardo ai',
  'firefly',
  'adobe firefly',
  'ai_generated',
  'ai generated',
  'text-to-image',
  'txt2img',
  'img2img',
  'generative ai',
  'synthetically generated',
];

/** Known AI DigitalSourceType values */
const AI_DIGITAL_SOURCE_TYPES = [
  'computergeneratedimage',
  'computergenerated',
  'trainedalgographicimage',
  'trainedalgographic',
  'compositewithtrainedalgographicelements',
  'algorithmicmedia',
];

export class AuthorshipClassifier {
  
  /**
   * Classify an image's authorship based on extracted signals.
   * 
   * STRICT PRIORITY ORDER — STOP ON FIRST MATCH:
   * 1. Synthetic detection
   * 2. Verified original (EXIF + creator match)
   * 3. Missing EXIF, no conflict (needs user declaration)
   * 4. Conflicting authorship
   * 
   * @param signals - Extracted image metadata signals
   * @param userCreatorName - The CE user's creator name from their profile
   */
  classify(signals: ImageSignals, userCreatorName?: string): ClassificationResult {
    // Step 1: Synthetic detection (HIGHEST PRIORITY)
    const syntheticResult = this.checkSynthetic(signals);
    if (syntheticResult) return syntheticResult;

    // Step 2: Verified original (EXIF present + creator matches)
    const verifiedResult = this.checkVerifiedOriginal(signals, userCreatorName);
    if (verifiedResult) return verifiedResult;

    // Step 3: Missing EXIF, no conflict — needs user declaration
    const needsDeclarationResult = this.checkNeedsDeclaration(signals);
    if (needsDeclarationResult) return needsDeclarationResult;

    // Step 4: Conflicting authorship — default to UNVERIFIED
    return this.createUnverifiedResult(signals, [ReasonCode.CONFLICTING_CREATOR_FOUND]);
  }

  /**
   * Apply user declaration to update authorship status.
   * Can only upgrade from UNVERIFIED → DECLARED_BY_USER, nothing else.
   */
  applyUserDeclaration(
    currentStatus: AuthorshipStatus,
    declared: boolean,
    signals: ImageSignals
  ): ClassificationResult {
    // Can NEVER override synthetic detection
    if (currentStatus === AuthorshipStatus.SYNTHETIC_AI) {
      return {
        status: AuthorshipStatus.SYNTHETIC_AI,
        evidence: this.buildEvidence(signals, [ReasonCode.AI_DETECTED], 
          'Synthetic image — user declaration cannot override AI detection'),
        needsUserDeclaration: false,
      };
    }

    // Can NEVER upgrade to VERIFIED_ORIGINAL via declaration
    if (declared) {
      return {
        status: AuthorshipStatus.DECLARED_BY_USER,
        evidence: this.buildEvidence(signals, [ReasonCode.USER_DECLARED_TRUE],
          'User declared as original creator — not machine-verified'),
        needsUserDeclaration: false,
      };
    }

    // User declined — stays UNVERIFIED
    return {
      status: AuthorshipStatus.UNVERIFIED,
      evidence: this.buildEvidence(signals, [ReasonCode.USER_DECLARED_FALSE],
        'User declined creator declaration'),
      needsUserDeclaration: false,
    };
  }

  // ────────────────────────────────────────────
  // Private classification steps
  // ────────────────────────────────────────────

  private checkSynthetic(signals: ImageSignals): ClassificationResult | null {
    const reasonCodes: ReasonCode[] = [];

    // Check AI metadata signatures
    if (signals.aiSignaturesFound.length > 0) {
      reasonCodes.push(ReasonCode.AI_METADATA_SIGNATURE);
    }

    // Check DigitalSourceType
    if (signals.digitalSourceType) {
      const normalised = signals.digitalSourceType.toLowerCase().replace(/[\s_-]/g, '');
      if (AI_DIGITAL_SOURCE_TYPES.some(t => normalised.includes(t))) {
        reasonCodes.push(ReasonCode.DIGITAL_SOURCE_TYPE_AI);
      }
    }

    // Check synthetic confidence
    if (signals.syntheticConfidence !== undefined && signals.syntheticConfidence >= SYNTHETIC_THRESHOLD) {
      reasonCodes.push(ReasonCode.HIGH_SYNTHETIC_CONFIDENCE);
    }

    if (reasonCodes.length === 0) return null;

    return {
      status: AuthorshipStatus.SYNTHETIC_AI,
      evidence: this.buildEvidence(signals, reasonCodes,
        `AI-generated content detected: ${reasonCodes.map(r => r).join(', ')}`),
      needsUserDeclaration: false,
    };
  }

  private checkVerifiedOriginal(
    signals: ImageSignals, 
    userCreatorName?: string
  ): ClassificationResult | null {
    if (!signals.exifPresent) return null;
    if (!userCreatorName) return null;
    // MUST have an existing creator field to verify against
    if (!signals.existingCreator) return null;

    // Creator must match — case-insensitive, trimmed
    const normalise = (s: string) => s.trim().toLowerCase();
    
    if (signals.existingCreator) {
      const creatorMatch = normalise(signals.existingCreator) === normalise(userCreatorName);
      if (!creatorMatch) return null; // Conflict → fall through to step 4
    }

    // Check for conflicting copyright from another entity
    if (signals.existingCopyright) {
      const copyrightLower = normalise(signals.existingCopyright);
      const creatorLower = normalise(userCreatorName);
      // If copyright exists but doesn't reference the user at all → possible conflict
      // Only block if there's an explicit different entity
      if (!copyrightLower.includes(creatorLower) && signals.existingCreator && 
          normalise(signals.existingCreator) !== creatorLower) {
        return null; // Conflict → fall through
      }
    }

    return {
      status: AuthorshipStatus.VERIFIED_ORIGINAL,
      evidence: this.buildEvidence(signals, [ReasonCode.EXIF_PRESENT_MATCH],
        `EXIF data present, creator matches user profile: "${userCreatorName}"`),
      needsUserDeclaration: false,
    };
  }

  private checkNeedsDeclaration(signals: ImageSignals): ClassificationResult | null {
    // Missing EXIF, no conflicting creator
    if (!signals.exifPresent && !signals.existingCreator) {
      return {
        status: AuthorshipStatus.UNVERIFIED,
        evidence: this.buildEvidence(signals, [ReasonCode.EXIF_MISSING_NO_CONFLICT],
          'No EXIF data and no existing creator — user declaration needed'),
        needsUserDeclaration: true,
      };
    }

    // EXIF present but no creator field at all
    if (signals.exifPresent && !signals.existingCreator) {
      return {
        status: AuthorshipStatus.UNVERIFIED,
        evidence: this.buildEvidence(signals, [ReasonCode.EXIF_MISSING_NO_CONFLICT],
          'EXIF present but no creator field — user declaration needed'),
        needsUserDeclaration: true,
      };
    }

    return null; // Fall through to conflicting authorship
  }

  private createUnverifiedResult(
    signals: ImageSignals, 
    reasonCodes: ReasonCode[]
  ): ClassificationResult {
    return {
      status: AuthorshipStatus.UNVERIFIED,
      evidence: this.buildEvidence(signals, reasonCodes,
        'Conflicting or insufficient authorship evidence — classified as unverified'),
      needsUserDeclaration: false,
    };
  }

  private buildEvidence(
    signals: ImageSignals,
    reasonCodes: ReasonCode[],
    summary: string
  ): AuthorshipEvidence {
    return {
      signals: {
        exifPresent: signals.exifPresent,
        cameraMake: signals.cameraMake,
        cameraModel: signals.cameraModel,
        dateTimeOriginal: signals.dateTimeOriginal,
        existingCreator: signals.existingCreator,
        existingCopyright: signals.existingCopyright,
        digitalSourceType: signals.digitalSourceType,
        aiSignaturesFound: signals.aiSignaturesFound,
        syntheticConfidence: signals.syntheticConfidence,
      },
      reasonCodes: reasonCodes.map(r => String(r)),
      summary,
    };
  }
}
