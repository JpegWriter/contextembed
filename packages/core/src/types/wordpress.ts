/**
 * WordPress Integration Types
 * Types for WP REST API media upload + alt text injection
 */

// ============================================================================
// ALT TEXT STRATEGY
// ============================================================================

/**
 * Alt text strategy determines which generated alt text variant is injected
 * into WordPress `_wp_attachment_image_alt`.
 *
 *  - seo_optimized:        Uses altTextShort (≤160 chars, keyword-rich)
 *  - accessibility_focused: Uses altTextLong (detailed, screen-reader friendly)
 *  - hybrid:               Uses altTextShort for alt, altTextLong for description
 */
export type WordPressAltStrategy = 'seo_optimized' | 'accessibility_focused' | 'hybrid';

// ============================================================================
// CONNECTION CONFIG (stored encrypted per-project)
// ============================================================================

export interface WordPressConnectionConfig {
  /** WordPress site URL (e.g. https://example.com) */
  siteUrl: string;
  /** WP REST API authentication method */
  authMethod: 'application_password' | 'basic_auth';
  /** WordPress username */
  username: string;
  /** Application password or basic auth password (stored encrypted) */
  password: string;
  /** Whether auto-injection is enabled */
  autoInjectAltText: boolean;
  /** Which alt text variant to inject */
  altStrategy: WordPressAltStrategy;
}

// ============================================================================
// MEDIA PAYLOAD — what we send to WP
// ============================================================================

export interface WordPressMediaPayload {
  /** SEO-optimized alt text (≤160 chars) */
  alt_text_short: string;
  /** Accessibility-focused alt text (detailed) */
  alt_text_accessibility: string;
  /** Image caption for display */
  caption: string;
  /** Long-form description for WP media library */
  description: string;
  /** Headline / title for the media item */
  title?: string;
}

// ============================================================================
// API RESPONSES
// ============================================================================

/** Raw WP REST response from POST /wp-json/wp/v2/media */
export interface WordPressMediaUploadResponse {
  id: number;
  date: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string; raw?: string };
  caption: { rendered: string; raw?: string };
  description: { rendered: string; raw?: string };
  alt_text: string;
  media_type: string;
  mime_type: string;
  source_url: string;
}

/** Result of our alt text injection attempt */
export interface WordPressInjectionResult {
  success: boolean;
  mediaId: number;
  altTextLength: number;
  captionLength: number;
  descriptionLength: number;
  injectionStatus: 'injected' | 'failed' | 'skipped';
  strategy: WordPressAltStrategy;
  error?: string;
  timestamp: string;
}

/** Full result of upload + inject cycle */
export interface WordPressPublishResult {
  upload: {
    success: boolean;
    mediaId?: number;
    sourceUrl?: string;
    error?: string;
  };
  injection: WordPressInjectionResult | null;
  wpPostUrl?: string;
}

// ============================================================================
// LOGGING
// ============================================================================

export interface WordPressInjectionLog {
  mediaId: number;
  altTextLength: number;
  captionLength: number;
  descriptionLength: number;
  injectionStatus: 'injected' | 'failed' | 'skipped';
  strategy: WordPressAltStrategy;
  siteUrl: string;
  timestamp: string;
  error?: string;
  durationMs: number;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export interface WordPressHealthCheckResult {
  healthy: boolean;
  siteUrl: string;
  wpVersion?: string;
  authenticated: boolean;
  canUploadMedia: boolean;
  error?: string;
}
