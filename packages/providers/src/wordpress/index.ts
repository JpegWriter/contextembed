/**
 * WordPress Provider Module
 * 
 * Automatic alt text injection into WordPress media library.
 * Uses WP REST API v2 with Application Password authentication.
 */

export { WordPressClient } from './client';
export { buildWordPressPayload, extractMediaPayloadFromMetadata, updateWpMediaText } from './payload-builder';
export type { UpdateWpMediaTextOpts } from './payload-builder';
