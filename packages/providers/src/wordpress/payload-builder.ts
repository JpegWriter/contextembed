/**
 * WordPress Payload Builder
 * 
 * Maps ContextEmbed SynthesizedMetadata → WordPressMediaPayload.
 * Ensures altTextShort/altTextLong from the CE pipeline are correctly
 * routed to the WP REST API fields.
 */

import type { SynthesizedMetadata, WordPressMediaPayload, WordPressAltStrategy } from '@contextembed/core';

/**
 * Build a WordPress media payload from CE structured metadata.
 * 
 * Field mapping:
 *   CE altTextShort   →  WP alt_text (via strategy)
 *   CE altTextLong    →  WP description (accessibility detail)
 *   CE description    →  WP caption (editorial text)
 *   CE headline       →  WP title
 */
export function buildWordPressPayload(
  metadata: SynthesizedMetadata,
  strategy: WordPressAltStrategy = 'seo_optimized',
): WordPressMediaPayload {
  const altShort = metadata.altTextShort || metadata.headline || '';
  const altLong  = metadata.altTextLong  || metadata.description || '';

  // For "hybrid" strategy: alt_text gets the short version,
  // and description gets the long accessibility version.
  // For other strategies, caption carries the editorial description.
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

/**
 * Extract a WordPressMediaPayload from any metadata result object.
 * Handles both the typed SynthesizedMetadata and loose JSON shapes
 * that may come from DB `result` columns.
 */
export function extractMediaPayloadFromMetadata(
  result: Record<string, unknown>,
  strategy: WordPressAltStrategy = 'seo_optimized',
): WordPressMediaPayload {
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
