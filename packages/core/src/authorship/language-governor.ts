// ContextEmbed is a governance system.
// When authorship is uncertain, downgrade.
// Never guess. Never upgrade.

/**
 * Language Governor — MANDATORY for ALL CE text generators.
 * 
 * All CE writers (case studies, AEO, captions, alt text, summaries)
 * MUST receive authorshipStatus.
 * 
 * If generated output violates these constraints → HARD FAIL.
 * No silent rewrites. No auto-downgrades. Fail visibly.
 */

import { AuthorshipStatus } from './types';
import { ReasonCode } from './reason-codes';

/**
 * Allowed phrasing by authorship state.
 * These are the ONLY phrases that may be used to describe the image origin.
 */
const ALLOWED_PHRASES: Record<AuthorshipStatus, string[]> = {
  [AuthorshipStatus.VERIFIED_ORIGINAL]: [
    'captured by',
    'photographed by',
    'shot by',
    'created by',
    'taken by',
    'photography by',
    'photo by',
    'image by',
  ],
  [AuthorshipStatus.DECLARED_BY_USER]: [
    'supplied by',
    'processed by',
    'provided by',
    'submitted by',
    'curated by',
  ],
  [AuthorshipStatus.UNVERIFIED]: [
    'image used',
    'example image',
    'image shown',
    'image provided',
    'image courtesy',
  ],
  [AuthorshipStatus.SYNTHETIC_AI]: [
    'ai-generated illustration',
    'ai-generated image',
    'ai-created illustration',
    'generated illustration',
    'synthetic illustration',
    'ai illustration',
  ],
};

/**
 * Forbidden phrases by authorship state.
 * These patterns MUST NOT appear in generated text for the given state.
 */
const FORBIDDEN_PATTERNS: Record<AuthorshipStatus, RegExp[]> = {
  [AuthorshipStatus.VERIFIED_ORIGINAL]: [
    // No restrictions for verified originals
  ],
  [AuthorshipStatus.DECLARED_BY_USER]: [
    /\b(captured|photographed|shot|taken)\s+by\b/i,
    /\bphotography\s+by\b/i,
    /\bphoto\s+by\b/i,
  ],
  [AuthorshipStatus.UNVERIFIED]: [
    /\b(captured|photographed|shot|taken|created)\s+by\b/i,
    /\bphotography\s+by\b/i,
    /\bphoto\s+by\b/i,
    /\b(supplied|processed|provided)\s+by\b/i,
  ],
  [AuthorshipStatus.SYNTHETIC_AI]: [
    /\b(captured|photographed|shot|taken|created)\s+by\b/i,
    /\bphotography\s+by\b/i,
    /\bphoto\s+by\b/i,
    /\b(supplied|processed|provided)\s+by\b/i,
    /\bphotographer\b/i,
    /\boriginal\s+(photo|image|photograph)\b/i,
  ],
};

export interface LanguageValidationResult {
  valid: boolean;
  violations: LanguageViolation[];
}

export interface LanguageViolation {
  pattern: string;
  matchedText: string;
  position: number;
  reasonCode: ReasonCode;
  message: string;
}

export class LanguageGovernor {
  /**
   * Validate generated text against authorship language rules.
   * 
   * @param text - The generated text (caption, alt text, case study, etc.)
   * @param authorshipStatus - The image's authorship status
   * @returns Validation result with violations if any
   * 
   * If violations are found → HARD FAIL. Do not silently fix.
   */
  validate(text: string, authorshipStatus: AuthorshipStatus): LanguageValidationResult {
    const violations: LanguageViolation[] = [];
    const forbidden = FORBIDDEN_PATTERNS[authorshipStatus];

    for (const pattern of forbidden) {
      const match = pattern.exec(text);
      if (match) {
        violations.push({
          pattern: pattern.source,
          matchedText: match[0],
          position: match.index,
          reasonCode: ReasonCode.LANGUAGE_VIOLATION,
          message: `Forbidden phrase "${match[0]}" found in text for ${authorshipStatus} image. ` +
            `Allowed phrases: ${ALLOWED_PHRASES[authorshipStatus].join(', ')}`,
        });
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Get allowed phrases for a given authorship status.
   * Useful for prompt construction.
   */
  getAllowedPhrases(authorshipStatus: AuthorshipStatus): string[] {
    return [...ALLOWED_PHRASES[authorshipStatus]];
  }

  /**
   * Get a description instruction for LLM prompts.
   * Include this in the system prompt for any text generator.
   */
  getPromptInstruction(authorshipStatus: AuthorshipStatus): string {
    const allowed = ALLOWED_PHRASES[authorshipStatus];
    const status = authorshipStatus;

    switch (status) {
      case AuthorshipStatus.VERIFIED_ORIGINAL:
        return `This is a verified original photograph. You may use: ${allowed.join(', ')}.`;

      case AuthorshipStatus.DECLARED_BY_USER:
        return `This image was declared by the user as their own, but is not machine-verified. ` +
          `Use ONLY: ${allowed.join(', ')}. Do NOT use "photographed by", "captured by", or similar.`;

      case AuthorshipStatus.UNVERIFIED:
        return `This image has unverified authorship. Use ONLY: ${allowed.join(', ')}. ` +
          `Do NOT attribute to any specific photographer or creator.`;

      case AuthorshipStatus.SYNTHETIC_AI:
        return `This is an AI-generated image. Refer to it ONLY as: ${allowed.join(', ')}. ` +
          `Do NOT use "photographed by", "captured by", or any real-world photography terms.`;

      default:
        return `Use generic phrasing. Do not attribute authorship.`;
    }
  }
}
