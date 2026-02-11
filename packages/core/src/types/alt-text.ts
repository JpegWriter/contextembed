/**
 * Alt Text Engine — Types
 *
 * Deterministic alt-text generation with structured output,
 * mode-driven prompting, and length-constrained validation.
 */

// ============================================================================
// ALT TEXT MODE
// ============================================================================

/**
 * Controls the style / emphasis of the generated alt text.
 *
 *  - seo:           Keyword-rich, concise, Google-optimised
 *  - accessibility:  Screen-reader friendly, descriptive, WCAG-aligned
 *  - editorial:      Story-driven, brand-voice forward
 *  - social:         Casual, engagement-optimised for social platforms
 */
export type AltTextMode = 'seo' | 'accessibility' | 'editorial' | 'social';

// ============================================================================
// ALT TEXT INPUT
// ============================================================================

/**
 * Everything the alt-text generator needs to produce output.
 * Built from the existing pipeline's SynthesizedMetadata + vision analysis.
 */
export interface AltTextInput {
  /** Current headline from metadata synthesis */
  headline: string;
  /** Current description from metadata synthesis */
  description: string;
  /** Keywords array from metadata synthesis */
  keywords: string[];
  /** Scene type / setting from vision analysis */
  sceneType?: string;
  /** Subject descriptions from vision analysis */
  subjects?: string[];
  /** Dominant mood / tone */
  mood?: string;
  /** Brand name for contextual anchoring */
  brandName?: string;
  /** Industry for relevance tuning */
  industry?: string;
  /** User-supplied context / story for this image */
  userComment?: string;
  /** Optional user-supplied focus keyphrase (≤ 4 words) */
  focusKeyphrase?: string;
}

// ============================================================================
// ALT TEXT OUTPUT
// ============================================================================

/**
 * Structured output from the alt-text generator.
 * Every field has strict length constraints enforced by Zod.
 */
export interface AltTextOutput {
  /** Short SEO alt text — 30-140 chars */
  alt_text_short: string;
  /** Accessibility-focused alt text — 60-240 chars */
  alt_text_accessibility: string;
  /** Image caption for display — 20-200 chars */
  caption: string;
  /** Long-form description — 80-900 chars */
  description: string;
  /** Focus keyphrase extracted / generated — max 4 words */
  focus_keyphrase: string;
  /** Safety notes (e.g. "contains identifiable person") */
  safety_notes?: string;
}

// ============================================================================
// ALT TEXT CONFIG
// ============================================================================

export interface AltTextGeneratorConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use (default: gpt-4o) */
  model?: string;
  /** Temperature for generation (default: 0.4) */
  temperature?: number;
  /** Max tokens for response (default: 1024) */
  maxTokens?: number;
  /** Whether to retry once on validation failure */
  retryOnFailure?: boolean;
}

// ============================================================================
// ALT TEXT RESULT (for storage / pipeline integration)
// ============================================================================

export interface AltTextResult {
  /** Whether generation succeeded */
  success: boolean;
  /** Generated output (null on failure) */
  output: AltTextOutput | null;
  /** Mode that was used */
  mode: AltTextMode;
  /** Whether fallback was used */
  usedFallback: boolean;
  /** Error message if failed */
  error?: string;
  /** Timing info */
  durationMs: number;
  /** Tokens consumed */
  tokensUsed: number;
}
