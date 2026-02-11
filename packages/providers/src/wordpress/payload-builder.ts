/**
 * WordPress Payload Builder
 *
 * Maps ContextEmbed SynthesizedMetadata → WordPressMediaPayload.
 * Prefers structured AltTextOutput when available from the Alt Text Engine,
 * otherwise falls back to the legacy altTextShort/altTextLong fields.
 */

import type {
  SynthesizedMetadata,
  WordPressMediaPayload,
  WordPressAltStrategy,
  WordPressConnectionConfig,
  AltTextOutput,
} from '@contextembed/core';

// ============================================================================
// PRIMARY BUILDER
// ============================================================================

/**
 * Build a WordPress media payload from CE structured metadata.
 *
 * Priority:
 *   1. AltTextOutput (from Alt Text Engine) — richest, length-validated
 *   2. Legacy altTextShort / altTextLong    — fallback from metadata synthesis
 *   3. headline / description              — last resort
 */
export function buildWordPressPayload(
  metadata: SynthesizedMetadata,
  strategy: WordPressAltStrategy = 'seo_optimized',
): WordPressMediaPayload {
  // Check for structured alt text from the Alt Text Engine
  const altText = (metadata as Record<string, unknown>).altText as AltTextOutput | undefined;

  if (altText?.alt_text_short && altText?.alt_text_accessibility) {
    return {
      alt_text_short: altText.alt_text_short,
      alt_text_accessibility: altText.alt_text_accessibility,
      caption: altText.caption || metadata.description || '',
      description: altText.description || metadata.description || '',
      title: metadata.headline || undefined,
    };
  }

  // Legacy fallback
  const altShort = metadata.altTextShort || metadata.headline || '';
  const altLong  = metadata.altTextLong  || metadata.description || '';

  const caption     = metadata.description || '';
  const description = strategy === 'hybrid'
    ? altLong
    : metadata.description || '';

  return {
    alt_text_short: altShort,
    alt_text_accessibility: altLong,
    caption,
    description,
    title: metadata.headline || undefined,
  };
}

// ============================================================================
// LOOSE JSON EXTRACTOR
// ============================================================================

/**
 * Extract a WordPressMediaPayload from any metadata result object.
 * Handles both the typed SynthesizedMetadata and loose JSON shapes
 * that may come from DB `result` columns.
 */
export function extractMediaPayloadFromMetadata(
  result: Record<string, unknown>,
  strategy: WordPressAltStrategy = 'seo_optimized',
): WordPressMediaPayload {
  // Check for structured AltTextOutput
  const altText = result.altText as AltTextOutput | undefined;
  if (altText?.alt_text_short && altText?.alt_text_accessibility) {
    return {
      alt_text_short: altText.alt_text_short,
      alt_text_accessibility: altText.alt_text_accessibility,
      caption: altText.caption || (result.description as string) || '',
      description: altText.description || (result.description as string) || '',
      title: (result.headline as string) || undefined,
    };
  }

  // Legacy path
  const altShort = (result.altTextShort as string) || (result.headline as string) || '';
  const altLong  = (result.altTextLong as string)  || (result.description as string) || '';
  const headline = (result.headline as string) || '';
  const desc     = (result.description as string) || '';

  const description = strategy === 'hybrid' ? altLong : desc;

  return {
    alt_text_short: altShort,
    alt_text_accessibility: altLong,
    caption: desc,
    description,
    title: headline || undefined,
  };
}

// ============================================================================
// CONVENIENCE — update alt text on an existing WP media item
// ============================================================================

export interface UpdateWpMediaTextOpts {
  /** WP media post ID */
  mediaId: number;
  /** Structured alt text output from the Alt Text Engine */
  altText: AltTextOutput;
  /** Optional override title */
  title?: string;
  /** WordPress connection config (site URL, auth, etc.) */
  connectionConfig: WordPressConnectionConfig;
}

/**
 * Convenience: inject AltTextOutput directly into a WP media item.
 *
 * Usage:
 * ```ts
 * await updateWpMediaText({
 *   mediaId: 1234,
 *   altText: generatedAltText,
 *   connectionConfig: wpConfig,
 * });
 * ```
 */
export async function updateWpMediaText(opts: UpdateWpMediaTextOpts) {
  const { WordPressClient } = await import('./client.js');
  const client = new WordPressClient(opts.connectionConfig);

  const payload: WordPressMediaPayload = {
    alt_text_short: opts.altText.alt_text_short,
    alt_text_accessibility: opts.altText.alt_text_accessibility,
    caption: opts.altText.caption,
    description: opts.altText.description,
    title: opts.title,
  };

  return client.injectMetadata(opts.mediaId, payload);
}
