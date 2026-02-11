/**
 * Web Preview Generator
 * 
 * Generates styled thumbnail derivatives with optional caption/credit overlays
 * for WordPress-friendly publishing. NEVER modifies master embedded originals.
 * 
 * Design principles:
 * - Non-destructive: works on copies, never rewrites master files
 * - Low-memory: sequential processing, no Promise.all over images
 * - Streaming IO: write temp files to /tmp, always clean up
 * - Uses sharp (already present in codebase)
 * 
 * File paths:
 * - Input: embedded master files
 * - Output: resized web variants with optional caption bar
 * - Suffix: -web.jpg
 */

import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================
// Types
// ============================================

export interface WebVariantOptions {
  /** Max dimension for long edge (default 1200) */
  maxEdge: number;
  /** JPEG quality 1-100 (default 82) */
  quality: number;
  /** Include caption overlay (default true) */
  includeCaption: boolean;
  /** Include credit overlay (default true) */
  includeCredit: boolean;
  /** Style preset (currently only 'clean_bar_v1') */
  style: 'clean_bar_v1';
}

export interface WebVariantContext {
  /** Caption text (1-2 lines, max 120 chars) */
  caption?: string;
  /** Credit line (e.g., "John Smith — Acme Photography") */
  credit?: string;
  /** Year for copyright */
  year?: number;
}

export interface WebVariantResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  durationMs?: number;
  originalSize?: number;
  webSize?: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS: WebVariantOptions = {
  maxEdge: 1200,
  quality: 82,
  includeCaption: true,
  includeCredit: true,
  style: 'clean_bar_v1',
};

// Bar dimensions for 'clean_bar_v1' style
const BAR_HEIGHT_PERCENT = 0.14; // 14% of image height
const BAR_MIN_HEIGHT = 80;
const BAR_MAX_HEIGHT = 180;
const BAR_PADDING_X = 24;
const BAR_PADDING_Y = 16;
const FONT_SIZE_CAPTION = 18;
const FONT_SIZE_CREDIT = 14;
const CAPTION_MAX_LENGTH = 120;
const CREDIT_MAX_LENGTH = 60;

// ============================================
// Text Utilities
// ============================================

/**
 * Sanitize text for SVG rendering (escape special chars, remove emojis)
 */
function sanitizeText(text: string): string {
  return text
    // Remove emojis and other non-basic characters
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // transport & map
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // dingbats
    // Escape XML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate text to max length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
}

/**
 * Convert to sentence case (first letter uppercase, rest lowercase)
 */
function toSentenceCase(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Prepare caption text: sanitize, truncate, sentence case
 */
function prepareCaption(text: string | undefined): string {
  if (!text) return '';
  const sanitized = sanitizeText(text);
  const truncated = truncateText(sanitized, CAPTION_MAX_LENGTH);
  return toSentenceCase(truncated);
}

/**
 * Prepare credit text: sanitize, truncate
 */
function prepareCredit(text: string | undefined): string {
  if (!text) return '';
  const sanitized = sanitizeText(text);
  return truncateText(sanitized, CREDIT_MAX_LENGTH);
}

// ============================================
// SVG Overlay Generator
// ============================================

/**
 * Generate SVG overlay for the caption/credit bar
 */
function generateBarOverlay(
  width: number,
  barHeight: number,
  caption: string,
  credit: string,
): string {
  const hasCaption = caption.length > 0;
  const hasCredit = credit.length > 0;
  
  if (!hasCaption && !hasCredit) {
    return ''; // No overlay needed
  }
  
  // Calculate text positions
  const captionY = barHeight / 2 + (hasCredit ? -FONT_SIZE_CREDIT / 2 : 0);
  const creditY = barHeight / 2 + FONT_SIZE_CAPTION / 2 + 4;
  
  // Build SVG
  let svg = `<svg width="${width}" height="${barHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        .caption { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          font-size: ${FONT_SIZE_CAPTION}px; 
          font-weight: 500;
          fill: #ffffff; 
        }
        .credit { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          font-size: ${FONT_SIZE_CREDIT}px; 
          font-weight: 400;
          fill: rgba(255,255,255,0.75); 
        }
      </style>
    </defs>
    <!-- Semi-transparent bar background -->
    <rect x="0" y="0" width="${width}" height="${barHeight}" fill="rgba(0,0,0,0.85)" />`;
  
  if (hasCaption) {
    svg += `
    <text x="${BAR_PADDING_X}" y="${captionY}" class="caption" dominant-baseline="middle">
      ${caption}
    </text>`;
  }
  
  if (hasCredit) {
    svg += `
    <text x="${width - BAR_PADDING_X}" y="${hasCaption ? creditY : barHeight / 2}" 
          class="credit" text-anchor="end" dominant-baseline="middle">
      ${credit}
    </text>`;
  }
  
  svg += `
  </svg>`;
  
  return svg;
}

// ============================================
// Main Generator Function
// ============================================

/**
 * Generate a web-optimized variant of an image with optional caption/credit bar.
 * 
 * IMPORTANT: This function NEVER modifies the input file. It creates a new file
 * at the specified output path.
 * 
 * @param inputPath - Path to the source image (embedded master)
 * @param outputPath - Path where web variant should be written
 * @param options - Resize and style options
 * @param context - Caption and credit text
 * @returns Result with success status and file sizes
 */
export async function generateWebVariant(
  inputPath: string,
  outputPath: string,
  options: Partial<WebVariantOptions> = {},
  context: WebVariantContext = {},
): Promise<WebVariantResult> {
  const startTime = Date.now();
  const opts: WebVariantOptions = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Ensure input file exists
    try {
      await fs.access(inputPath);
    } catch {
      return { success: false, error: `Input file not found: ${inputPath}` };
    }
    
    // Get original file size
    const inputStats = await fs.stat(inputPath);
    const originalSize = inputStats.size;
    
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Step 1: Read and resize the image
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return { success: false, error: 'Could not read image dimensions' };
    }
    
    // Calculate resize dimensions (fit within maxEdge)
    const aspectRatio = metadata.width / metadata.height;
    let newWidth: number;
    let newHeight: number;
    
    if (metadata.width > metadata.height) {
      // Landscape
      newWidth = Math.min(metadata.width, opts.maxEdge);
      newHeight = Math.round(newWidth / aspectRatio);
    } else {
      // Portrait or square
      newHeight = Math.min(metadata.height, opts.maxEdge);
      newWidth = Math.round(newHeight * aspectRatio);
    }
    
    // Resize the image
    let pipeline = image.resize(newWidth, newHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
    
    // Step 2: Add caption/credit bar if needed
    const caption = opts.includeCaption ? prepareCaption(context.caption) : '';
    const credit = opts.includeCredit ? prepareCredit(context.credit) : '';
    
    if (caption || credit) {
      // Calculate bar height
      const barHeight = Math.min(
        BAR_MAX_HEIGHT,
        Math.max(BAR_MIN_HEIGHT, Math.round(newHeight * BAR_HEIGHT_PERCENT))
      );
      
      // Generate SVG overlay
      const svgOverlay = generateBarOverlay(newWidth, barHeight, caption, credit);
      
      if (svgOverlay) {
        // Extend canvas to add bar at bottom
        pipeline = pipeline.extend({
          bottom: barHeight,
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        });
        
        // Composite the SVG overlay
        pipeline = pipeline.composite([
          {
            input: Buffer.from(svgOverlay),
            gravity: 'south',
          },
        ]);
      }
    }
    
    // Step 3: Output as JPEG with specified quality
    await pipeline
      .jpeg({
        quality: opts.quality,
        progressive: true,
        mozjpeg: true, // Better compression
      })
      .toFile(outputPath);
    
    // Get output file size
    const outputStats = await fs.stat(outputPath);
    
    const durationMs = Date.now() - startTime;
    console.log(`[WebPreview] Generated: ${path.basename(outputPath)} (${durationMs}ms, ${Math.round(outputStats.size / 1024)}KB)`);
    
    return {
      success: true,
      outputPath,
      durationMs,
      originalSize,
      webSize: outputStats.size,
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WebPreview] Failed to generate variant: ${errorMessage}`);
    
    // Clean up partial output file if it exists
    try {
      await fs.unlink(outputPath);
    } catch {
      // Ignore cleanup errors
    }
    
    return {
      success: false,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================
// Batch Processing Helper
// ============================================

export interface BatchWebVariantItem {
  inputPath: string;
  outputPath: string;
  context: WebVariantContext;
}

export interface BatchWebVariantResult {
  successful: number;
  failed: number;
  totalDurationMs: number;
  results: WebVariantResult[];
}

/**
 * Process multiple images sequentially (to avoid memory spikes).
 * 
 * CRITICAL: This function processes images ONE AT A TIME to prevent
 * memory spikes on Render's constrained environment.
 */
export async function generateWebVariantsBatch(
  items: BatchWebVariantItem[],
  options: Partial<WebVariantOptions> = {},
  onProgress?: (current: number, total: number, filename: string) => void,
): Promise<BatchWebVariantResult> {
  const startTime = Date.now();
  const results: WebVariantResult[] = [];
  let successful = 0;
  let failed = 0;
  
  // Process SEQUENTIALLY - no Promise.all
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, items.length, path.basename(item.outputPath));
    }
    
    const result = await generateWebVariant(
      item.inputPath,
      item.outputPath,
      options,
      item.context,
    );
    
    results.push(result);
    
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }
  
  return {
    successful,
    failed,
    totalDurationMs: Date.now() - startTime,
    results,
  };
}

// ============================================
// Context Resolution Helpers
// ============================================

/**
 * Build caption from available metadata sources.
 * Priority: per-image caption > alt text > project context > filename
 */
export function resolveCaption(sources: {
  imageCaption?: string;
  imageTitle?: string;
  altText?: string;
  projectContext?: string;
  filename?: string;
}): string {
  // Try per-image caption first
  if (sources.imageCaption?.trim()) {
    return sources.imageCaption.trim();
  }
  
  // Try image title
  if (sources.imageTitle?.trim()) {
    return sources.imageTitle.trim();
  }
  
  // Try alt text (often more descriptive)
  if (sources.altText?.trim()) {
    return sources.altText.trim();
  }
  
  // Try project context (first sentence)
  if (sources.projectContext?.trim()) {
    const firstSentence = sources.projectContext.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 10) {
      return firstSentence;
    }
  }
  
  // Fallback to filename (without extension, humanized)
  if (sources.filename) {
    return path.basename(sources.filename, path.extname(sources.filename))
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  return '';
}

/**
 * Build credit line from user profile.
 * Priority: creditTemplate > creatorName + businessName > © year businessName
 */
export function resolveCredit(profile: {
  creditTemplate?: string;
  creatorName?: string;
  businessName?: string;
  copyrightTemplate?: string;
}, year?: number): string {
  const currentYear = year || new Date().getFullYear();
  
  // Try explicit credit template
  if (profile.creditTemplate?.trim()) {
    return profile.creditTemplate
      .replace(/\{year\}/gi, String(currentYear))
      .replace(/\{businessName\}/gi, profile.businessName || '')
      .replace(/\{creatorName\}/gi, profile.creatorName || '')
      .trim();
  }
  
  // Build from creator + business
  if (profile.creatorName && profile.businessName) {
    return `${profile.creatorName} — ${profile.businessName}`;
  }
  
  if (profile.creatorName) {
    return profile.creatorName;
  }
  
  if (profile.businessName) {
    return profile.businessName;
  }
  
  // Try copyright template
  if (profile.copyrightTemplate?.trim()) {
    return profile.copyrightTemplate
      .replace(/\{year\}/gi, String(currentYear))
      .replace(/\{businessName\}/gi, profile.businessName || '')
      .trim();
  }
  
  // Fallback
  if (profile.businessName) {
    return `© ${currentYear} ${profile.businessName}`;
  }
  
  return '';
}
