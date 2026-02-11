/**
 * WordPress REST API Client
 * 
 * Handles:
 *  1. Media upload via POST /wp-json/wp/v2/media
 *  2. Alt text / caption / description injection via POST /wp-json/wp/v2/media/{id}
 *  3. Health check via GET /wp-json/wp/v2/
 * 
 * Auth: WP Application Passwords (recommended) or Basic Auth.
 * Does NOT break the existing upload flow — it is called AFTER the CE pipeline completes.
 */

import {
  WordPressConnectionConfig,
  WordPressMediaPayload,
  WordPressMediaUploadResponse,
  WordPressInjectionResult,
  WordPressPublishResult,
  WordPressInjectionLog,
  WordPressHealthCheckResult,
  WordPressAltStrategy,
} from '@contextembed/core';

// ============================================================================
// LOGGER
// ============================================================================

const LOG_PREFIX = '[CE:WordPress]';

function log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) {
  const line = `${LOG_PREFIX} ${message}`;
  if (level === 'error') console.error(line, data ?? '');
  else if (level === 'warn') console.warn(line, data ?? '');
  else console.log(line, data ?? '');
}

// ============================================================================
// AUTH HEADER
// ============================================================================

function buildAuthHeader(config: WordPressConnectionConfig): string {
  const token = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  return `Basic ${token}`;
}

function apiBase(config: WordPressConnectionConfig): string {
  const base = config.siteUrl.replace(/\/+$/, '');
  return `${base}/wp-json/wp/v2`;
}

// ============================================================================
// MAIN CLIENT CLASS
// ============================================================================

export class WordPressClient {
  private config: WordPressConnectionConfig;

  constructor(config: WordPressConnectionConfig) {
    if (!config.siteUrl) throw new Error('WordPress siteUrl is required');
    if (!config.username) throw new Error('WordPress username is required');
    if (!config.password) throw new Error('WordPress password (or application password) is required');
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // Health check — validates credentials + capabilities
  // --------------------------------------------------------------------------

  async healthCheck(): Promise<WordPressHealthCheckResult> {
    const url = `${apiBase(this.config)}/media?per_page=1`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: buildAuthHeader(this.config),
        },
      });

      if (!res.ok) {
        return {
          healthy: false,
          siteUrl: this.config.siteUrl,
          authenticated: false,
          canUploadMedia: false,
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }

      // If we can list media, we're authenticated and have read access
      // Try to determine WP version from response headers
      const wpVersion = res.headers.get('x-wp-total') ? 'detected' : undefined;

      return {
        healthy: true,
        siteUrl: this.config.siteUrl,
        wpVersion,
        authenticated: true,
        canUploadMedia: true, // We'll verify on first actual upload
      };
    } catch (err: any) {
      return {
        healthy: false,
        siteUrl: this.config.siteUrl,
        authenticated: false,
        canUploadMedia: false,
        error: err.message || 'Connection failed',
      };
    }
  }

  // --------------------------------------------------------------------------
  // Upload media file
  // --------------------------------------------------------------------------

  async uploadMedia(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    title?: string,
  ): Promise<{ success: boolean; mediaId?: number; sourceUrl?: string; error?: string }> {
    const url = `${apiBase(this.config)}/media`;

    try {
      // Build multipart form with native FormData
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', blob, filename);
      if (title) {
        formData.append('title', title);
      }

      log('info', `Uploading media: ${filename} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: buildAuthHeader(this.config),
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.text();
        log('error', `Upload failed: HTTP ${res.status}`, { body });
        return { success: false, error: `HTTP ${res.status}: ${body}` };
      }

      const data = await res.json() as WordPressMediaUploadResponse;
      log('info', `Upload success: media ID ${data.id}`, { sourceUrl: data.source_url });

      return {
        success: true,
        mediaId: data.id,
        sourceUrl: data.source_url,
      };
    } catch (err: any) {
      log('error', 'Upload exception', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  // --------------------------------------------------------------------------
  // Inject alt text / caption / description into existing media item
  // --------------------------------------------------------------------------

  async injectMetadata(
    mediaId: number,
    payload: WordPressMediaPayload,
    strategy: WordPressAltStrategy = this.config.altStrategy,
  ): Promise<WordPressInjectionResult> {
    const startMs = Date.now();
    const url = `${apiBase(this.config)}/media/${mediaId}`;

    // Resolve which alt text to use based on strategy
    const altText = this.resolveAltText(payload, strategy);
    const caption = payload.caption || '';
    const description = payload.description || '';

    const body: Record<string, string> = {
      alt_text: altText,
      caption: caption,
      description: description,
    };

    // Also set title if provided
    if (payload.title) {
      body.title = payload.title;
    }

    try {
      log('info', `Injecting metadata for media ID ${mediaId}`, {
        strategy,
        altLength: altText.length,
        captionLength: caption.length,
        descriptionLength: description.length,
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: buildAuthHeader(this.config),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const durationMs = Date.now() - startMs;

      if (!res.ok) {
        const errBody = await res.text();
        log('error', `Injection failed for media ${mediaId}: HTTP ${res.status}`, { errBody });

        const result: WordPressInjectionResult = {
          success: false,
          mediaId,
          altTextLength: altText.length,
          captionLength: caption.length,
          descriptionLength: description.length,
          injectionStatus: 'failed',
          strategy,
          error: `HTTP ${res.status}: ${errBody}`,
          timestamp: new Date().toISOString(),
        };

        this.logInjection(result, durationMs);
        return result;
      }

      log('info', `Injection success for media ${mediaId} (${durationMs}ms)`);

      const result: WordPressInjectionResult = {
        success: true,
        mediaId,
        altTextLength: altText.length,
        captionLength: caption.length,
        descriptionLength: description.length,
        injectionStatus: 'injected',
        strategy,
        timestamp: new Date().toISOString(),
      };

      this.logInjection(result, durationMs);
      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      log('error', `Injection exception for media ${mediaId}`, { error: err.message });

      const result: WordPressInjectionResult = {
        success: false,
        mediaId,
        altTextLength: altText.length,
        captionLength: caption.length,
        descriptionLength: description.length,
        injectionStatus: 'failed',
        strategy,
        error: err.message,
        timestamp: new Date().toISOString(),
      };

      this.logInjection(result, durationMs);
      return result;
    }
  }

  // --------------------------------------------------------------------------
  // Full publish cycle: upload file → inject metadata
  // --------------------------------------------------------------------------

  async publishMedia(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    metadata: WordPressMediaPayload,
  ): Promise<WordPressPublishResult> {
    // Step 1: Upload the media file
    const uploadResult = await this.uploadMedia(fileBuffer, filename, mimeType, metadata.title);

    if (!uploadResult.success || !uploadResult.mediaId) {
      return {
        upload: uploadResult,
        injection: null,
      };
    }

    // Step 2: Inject alt text / caption / description
    if (!this.config.autoInjectAltText) {
      log('info', `Auto-inject disabled, skipping metadata injection for media ${uploadResult.mediaId}`);
      return {
        upload: uploadResult,
        injection: {
          success: true,
          mediaId: uploadResult.mediaId,
          altTextLength: 0,
          captionLength: 0,
          descriptionLength: 0,
          injectionStatus: 'skipped',
          strategy: this.config.altStrategy,
          timestamp: new Date().toISOString(),
        },
      };
    }

    const injection = await this.injectMetadata(uploadResult.mediaId, metadata);

    return {
      upload: uploadResult,
      injection,
      wpPostUrl: uploadResult.sourceUrl,
    };
  }

  // --------------------------------------------------------------------------
  // Inject metadata into an ALREADY uploaded media item (by ID)
  // Use case: retroactively fill alt text for existing WP media library images
  // --------------------------------------------------------------------------

  async injectIntoExisting(
    mediaId: number,
    metadata: WordPressMediaPayload,
  ): Promise<WordPressInjectionResult> {
    if (!this.config.autoInjectAltText) {
      log('info', `Auto-inject disabled, skipping for existing media ${mediaId}`);
      return {
        success: true,
        mediaId,
        altTextLength: 0,
        captionLength: 0,
        descriptionLength: 0,
        injectionStatus: 'skipped',
        strategy: this.config.altStrategy,
        timestamp: new Date().toISOString(),
      };
    }

    return this.injectMetadata(mediaId, metadata);
  }

  // --------------------------------------------------------------------------
  // Strategy resolver
  // --------------------------------------------------------------------------

  private resolveAltText(payload: WordPressMediaPayload, strategy: WordPressAltStrategy): string {
    switch (strategy) {
      case 'seo_optimized':
        // Short, keyword-rich alt text for SEO
        return payload.alt_text_short || payload.alt_text_accessibility || '';

      case 'accessibility_focused':
        // Detailed description for screen readers
        return payload.alt_text_accessibility || payload.alt_text_short || '';

      case 'hybrid':
        // Use the short version as alt_text (WP alt field);
        // the accessibility version goes into description (handled separately)
        return payload.alt_text_short || payload.alt_text_accessibility || '';

      default:
        return payload.alt_text_short || '';
    }
  }

  // --------------------------------------------------------------------------
  // Structured logging
  // --------------------------------------------------------------------------

  private logInjection(result: WordPressInjectionResult, durationMs: number): void {
    const entry: WordPressInjectionLog = {
      mediaId: result.mediaId,
      altTextLength: result.altTextLength,
      captionLength: result.captionLength,
      descriptionLength: result.descriptionLength,
      injectionStatus: result.injectionStatus,
      strategy: result.strategy,
      siteUrl: this.config.siteUrl,
      timestamp: result.timestamp,
      error: result.error,
      durationMs,
    };

    // Structured log for downstream aggregation (e.g. LogDNA, Datadog)
    log(
      result.success ? 'info' : 'error',
      `injection_log`,
      entry as unknown as Record<string, unknown>,
    );
  }
}
