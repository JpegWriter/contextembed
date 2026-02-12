/**
 * Case Study Pack Generator
 * 
 * Generates a self-contained HTML case study page from a project's
 * assets, metadata, and business context. The output is a single HTML
 * file with inline CSS, Base64-encoded thumbnails, and structured
 * schema.org markup for SEO.
 * 
 * Output: {export}/case-study/index.html
 * 
 * CRITICAL: Images are resized to thumbnails (max 800px) and Base64
 * inlined to keep the HTML self-contained and portable. No external
 * dependencies — works offline, embeds in WordPress, or hosts anywhere.
 */

import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

// ============================================
// Types
// ============================================

export interface CaseStudyOptions {
  /** Include before/after metadata comparison table */
  includeMetadataComparison: boolean;
  /** Include image gallery with thumbnails */
  includeGallery: boolean;
  /** Include structured data (schema.org JSON-LD) */
  includeStructuredData: boolean;
  /** Include verification badges/links */
  includeVerification: boolean;
  /** Gallery thumbnail max edge (px) */
  thumbnailMaxEdge: number;
  /** JPEG quality for thumbnails */
  thumbnailQuality: number;
  /** Case study title override (defaults to project name) */
  title?: string;
  /** Optional summary/intro text */
  summary?: string;
}

export const DEFAULT_CASE_STUDY_OPTIONS: CaseStudyOptions = {
  includeMetadataComparison: true,
  includeGallery: true,
  includeStructuredData: true,
  includeVerification: true,
  thumbnailMaxEdge: 800,
  thumbnailQuality: 80,
};

export interface CaseStudyAsset {
  assetId: string;
  originalFilename: string;
  /** Path to exported file on disk */
  exportedPath: string;
  /** Synthesized metadata (from embed pipeline) */
  metadata: Record<string, any>;
  /** Verification token if public verification is enabled */
  verificationToken?: string;
  /** Verification URL */
  verificationUrl?: string;
}

export interface CaseStudyContext {
  projectName: string;
  projectCreatedAt: string;
  brand: string;
  photographerName: string;
  credit: string;
  city: string;
  country: string;
  copyrightTemplate: string;
  usageTerms: string;
  /** Governance policy applied */
  governancePolicy?: string;
  /** Total assets in project */
  totalAssets: number;
  /** Successfully exported count */
  exportedAssets: number;
}

export interface CaseStudyResult {
  success: boolean;
  outputPath?: string;
  htmlSize?: number;
  thumbnailCount?: number;
  durationMs?: number;
  error?: string;
}

// ============================================
// Text Utilities
// ============================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================
// Thumbnail Generation
// ============================================

interface ThumbnailResult {
  base64: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Generate a Base64-encoded JPEG thumbnail for inline embedding.
 */
async function generateThumbnail(
  inputPath: string,
  maxEdge: number,
  quality: number,
): Promise<ThumbnailResult | null> {
  try {
    const buffer = await sharp(inputPath)
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
      })
      .toBuffer({ resolveWithObject: true });

    return {
      base64: buffer.data.toString('base64'),
      width: buffer.info.width,
      height: buffer.info.height,
      sizeBytes: buffer.data.length,
    };
  } catch (error) {
    console.error(`[CaseStudy] Thumbnail failed for ${path.basename(inputPath)}:`, error);
    return null;
  }
}

// ============================================
// HTML Generation
// ============================================

function generateMetadataRow(label: string, value: string | undefined | null): string {
  if (!value?.trim()) return '';
  return `
    <tr>
      <td class="meta-label">${escapeHtml(label)}</td>
      <td class="meta-value">${escapeHtml(truncateText(value.trim(), 200))}</td>
    </tr>`;
}

function generateAssetCard(
  asset: CaseStudyAsset,
  thumbnail: ThumbnailResult | null,
  index: number,
  options: CaseStudyOptions,
): string {
  const meta = asset.metadata || {};
  const headline = meta.headline || meta.title || meta.objectName || '';
  const description = meta.description || meta.caption || '';
  const credit = meta.credit || meta.byLine || meta.creator || '';
  const copyright = meta.copyrightNotice || meta.rights || '';
  const keywords = Array.isArray(meta.keywords) ? meta.keywords.join(', ') : (meta.keywords || '');

  const thumbnailHtml = thumbnail
    ? `<img 
        src="data:image/jpeg;base64,${thumbnail.base64}" 
        alt="${escapeHtml(headline || asset.originalFilename)}"
        width="${thumbnail.width}"
        height="${thumbnail.height}"
        loading="lazy"
        class="asset-img"
      />`
    : `<div class="asset-placeholder">
        <span class="placeholder-icon">📷</span>
        <span class="placeholder-text">${escapeHtml(asset.originalFilename)}</span>
      </div>`;

  const verificationBadge = options.includeVerification && asset.verificationUrl
    ? `<a href="${escapeHtml(asset.verificationUrl)}" 
         class="verification-badge" 
         target="_blank" 
         rel="noopener noreferrer"
         title="Verify authenticity">
        🔐 Verified
      </a>`
    : '';

  const metadataTable = options.includeMetadataComparison
    ? `<table class="meta-table">
        <thead>
          <tr>
            <th colspan="2">Embedded Metadata</th>
          </tr>
        </thead>
        <tbody>
          ${generateMetadataRow('Headline', headline)}
          ${generateMetadataRow('Description', description)}
          ${generateMetadataRow('Credit', credit)}
          ${generateMetadataRow('Copyright', copyright)}
          ${generateMetadataRow('Keywords', keywords)}
          ${generateMetadataRow('City', meta.city)}
          ${generateMetadataRow('Country', meta.country)}
          ${generateMetadataRow('Date Created', meta.dateCreated)}
          ${generateMetadataRow('Job ID', meta.transmissionReference)}
        </tbody>
      </table>`
    : '';

  return `
    <article class="asset-card" id="asset-${index + 1}">
      <div class="asset-header">
        <span class="asset-number">${String(index + 1).padStart(2, '0')}</span>
        <span class="asset-filename">${escapeHtml(asset.originalFilename)}</span>
        ${verificationBadge}
      </div>
      ${thumbnailHtml}
      ${headline ? `<h3 class="asset-headline">${escapeHtml(headline)}</h3>` : ''}
      ${description ? `<p class="asset-description">${escapeHtml(truncateText(description, 300))}</p>` : ''}
      ${metadataTable}
    </article>`;
}

function generateStructuredData(
  context: CaseStudyContext,
  assets: CaseStudyAsset[],
  options: CaseStudyOptions,
): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: options.title || `${context.projectName} — Case Study`,
    author: {
      '@type': 'Person',
      name: context.photographerName || context.brand,
    },
    creator: {
      '@type': 'Organization',
      name: context.brand,
    },
    description: options.summary || `Professional case study for ${context.projectName} — ${context.exportedAssets} images with full IPTC metadata, authored by ${context.photographerName || context.brand}.`,
    dateCreated: context.projectCreatedAt,
    copyrightHolder: {
      '@type': 'Organization',
      name: context.brand,
    },
    copyrightNotice: context.copyrightTemplate,
    license: context.usageTerms,
    locationCreated: context.city && context.country
      ? { '@type': 'Place', name: `${context.city}, ${context.country}` }
      : undefined,
    numberOfItems: assets.length,
    isPartOf: {
      '@type': 'SoftwareApplication',
      name: 'ContextEmbed',
      url: 'https://contextembed.com',
    },
  };

  return `<script type="application/ld+json">${JSON.stringify(schema, null, 0)}</script>`;
}

function generateFullHtml(
  context: CaseStudyContext,
  assetCards: string[],
  options: CaseStudyOptions,
): string {
  const title = escapeHtml(options.title || `${context.projectName} — Case Study`);
  const summary = options.summary
    ? `<p class="summary">${escapeHtml(options.summary)}</p>`
    : '';
  const year = new Date().getFullYear();

  const structuredData = options.includeStructuredData
    ? generateStructuredData(context, [], options)
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="generator" content="ContextEmbed Case Study Pack" />
  <meta name="author" content="${escapeHtml(context.photographerName || context.brand)}" />
  <meta name="description" content="Professional case study: ${escapeHtml(context.projectName)} — ${context.exportedAssets} images with verified IPTC metadata." />
  ${structuredData}
  <style>
    /* ContextEmbed Case Study — Self-Contained CSS */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    :root {
      --ce-brand: #6366f1;
      --ce-brand-dark: #4f46e5;
      --ce-bg: #0a0a0f;
      --ce-surface: #111118;
      --ce-surface-2: #1a1a24;
      --ce-border: #2a2a3a;
      --ce-text: #e4e4e7;
      --ce-text-muted: #71717a;
      --ce-text-dim: #52525b;
      --ce-success: #22c55e;
      --ce-radius: 0px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--ce-bg);
      color: var(--ce-text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    /* Header */
    .cs-header {
      border-bottom: 1px solid var(--ce-border);
      padding-bottom: 2rem;
      margin-bottom: 2rem;
    }

    .cs-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ce-brand);
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      padding: 0.25rem 0.75rem;
      margin-bottom: 1rem;
    }

    .cs-title {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.5rem;
      line-height: 1.2;
    }

    .cs-subtitle {
      font-size: 0.9375rem;
      color: var(--ce-text-muted);
    }

    .summary {
      font-size: 1rem;
      color: var(--ce-text-muted);
      margin-top: 1rem;
      max-width: 680px;
      line-height: 1.7;
    }

    /* Stats Bar */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1px;
      background: var(--ce-border);
      border: 1px solid var(--ce-border);
      margin-bottom: 2.5rem;
    }

    .stat-item {
      background: var(--ce-surface);
      padding: 1rem 1.25rem;
    }

    .stat-label {
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ce-text-dim);
      margin-bottom: 0.25rem;
    }

    .stat-value {
      font-size: 1.125rem;
      font-weight: 600;
      color: #fff;
    }

    /* Asset Cards */
    .gallery {
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .asset-card {
      background: var(--ce-surface);
      border: 1px solid var(--ce-border);
      overflow: hidden;
    }

    .asset-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--ce-border);
      background: var(--ce-surface-2);
    }

    .asset-number {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--ce-brand);
      font-variant-numeric: tabular-nums;
    }

    .asset-filename {
      font-size: 0.75rem;
      color: var(--ce-text-dim);
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .verification-badge {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--ce-success);
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
      padding: 0.125rem 0.5rem;
      text-decoration: none;
      white-space: nowrap;
    }

    .verification-badge:hover {
      background: rgba(34, 197, 94, 0.2);
    }

    .asset-img {
      width: 100%;
      height: auto;
      display: block;
    }

    .asset-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      background: var(--ce-surface-2);
      color: var(--ce-text-dim);
    }

    .placeholder-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .placeholder-text {
      font-size: 0.75rem;
    }

    .asset-headline {
      font-size: 1.125rem;
      font-weight: 600;
      color: #fff;
      padding: 1rem 1rem 0;
    }

    .asset-description {
      font-size: 0.875rem;
      color: var(--ce-text-muted);
      padding: 0.5rem 1rem 0;
      line-height: 1.6;
    }

    /* Metadata Table */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0.75rem;
    }

    .meta-table thead th {
      text-align: left;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ce-text-dim);
      padding: 0.5rem 1rem;
      border-top: 1px solid var(--ce-border);
      border-bottom: 1px solid var(--ce-border);
      background: var(--ce-surface-2);
    }

    .meta-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--ce-text-dim);
      padding: 0.375rem 1rem;
      width: 120px;
      vertical-align: top;
      border-bottom: 1px solid rgba(42, 42, 58, 0.5);
    }

    .meta-value {
      font-size: 0.8125rem;
      color: var(--ce-text);
      padding: 0.375rem 1rem;
      word-break: break-word;
      border-bottom: 1px solid rgba(42, 42, 58, 0.5);
    }

    /* Footer */
    .cs-footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--ce-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .cs-footer-brand {
      font-size: 0.75rem;
      color: var(--ce-text-dim);
    }

    .cs-footer-brand a {
      color: var(--ce-brand);
      text-decoration: none;
    }

    .cs-footer-brand a:hover {
      text-decoration: underline;
    }

    .cs-footer-meta {
      font-size: 0.6875rem;
      color: var(--ce-text-dim);
    }

    /* Responsive */
    @media (max-width: 640px) {
      .container { padding: 1rem; }
      .cs-title { font-size: 1.5rem; }
      .stats-bar { grid-template-columns: repeat(2, 1fr); }
      .meta-label { width: 90px; }
    }

    /* Print */
    @media print {
      body { background: #fff; color: #000; }
      .cs-header, .asset-card, .stats-bar, .stat-item { 
        border-color: #ddd; 
        background: #fff; 
      }
      .cs-title, .asset-headline, .stat-value { color: #000; }
      .meta-label, .cs-subtitle, .stat-label { color: #666; }
      .meta-value, .asset-description { color: #333; }
      .verification-badge { color: #16a34a; border-color: #16a34a; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="cs-header">
      <div class="cs-badge">📋 Case Study</div>
      <h1 class="cs-title">${title}</h1>
      <p class="cs-subtitle">
        ${escapeHtml(context.photographerName ? `${context.photographerName} — ` : '')}${escapeHtml(context.brand)}${context.city ? ` · ${escapeHtml(context.city)}${context.country ? `, ${escapeHtml(context.country)}` : ''}` : ''}
      </p>
      ${summary}
    </header>

    <!-- Stats -->
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-label">Images</div>
        <div class="stat-value">${context.exportedAssets}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Project</div>
        <div class="stat-value">${escapeHtml(truncateText(context.projectName, 24))}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Created</div>
        <div class="stat-value">${formatDate(context.projectCreatedAt)}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Governance</div>
        <div class="stat-value">${escapeHtml(context.governancePolicy || 'Standard')}</div>
      </div>
    </div>

    <!-- Gallery -->
    <section class="gallery">
      ${assetCards.join('\n')}
    </section>

    <!-- Footer -->
    <footer class="cs-footer">
      <div class="cs-footer-brand">
        Generated by <a href="https://contextembed.com" target="_blank" rel="noopener">ContextEmbed</a> · 
        ${escapeHtml(context.copyrightTemplate || `© ${year} ${context.brand}`)}
      </div>
      <div class="cs-footer-meta">
        ${context.usageTerms ? escapeHtml(truncateText(context.usageTerms, 80)) : ''}
      </div>
    </footer>
  </div>
</body>
</html>`;
}

// ============================================
// Main Entry Point
// ============================================

/**
 * Generate a self-contained HTML case study from exported assets.
 * 
 * CRITICAL: Processes images ONE AT A TIME to prevent memory spikes.
 * Thumbnails are Base64-inlined so the HTML works offline.
 * 
 * @param outputDir - Directory to write case-study/index.html
 * @param assets - Array of exported assets with metadata
 * @param context - Business/project context
 * @param options - Generation options
 */
export async function generateCaseStudy(
  outputDir: string,
  assets: CaseStudyAsset[],
  context: CaseStudyContext,
  options: Partial<CaseStudyOptions> = {},
): Promise<CaseStudyResult> {
  const startTime = Date.now();
  const opts: CaseStudyOptions = { ...DEFAULT_CASE_STUDY_OPTIONS, ...options };

  try {
    // Create output directory
    const caseStudyDir = path.join(outputDir, 'case-study');
    await fs.mkdir(caseStudyDir, { recursive: true });

    // Generate asset cards SEQUENTIALLY to control memory
    const assetCards: string[] = [];
    let thumbnailCount = 0;

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i]!;

      // Generate thumbnail if gallery enabled
      let thumbnail: ThumbnailResult | null = null;
      if (opts.includeGallery) {
        thumbnail = await generateThumbnail(
          asset.exportedPath,
          opts.thumbnailMaxEdge,
          opts.thumbnailQuality,
        );
        if (thumbnail) thumbnailCount++;
      }

      const card = generateAssetCard(asset, thumbnail, i, opts);
      assetCards.push(card);
    }

    // Generate full HTML
    const html = generateFullHtml(context, assetCards, opts);

    // Write output
    const outputPath = path.join(caseStudyDir, 'index.html');
    await fs.writeFile(outputPath, html, 'utf-8');

    const stats = await fs.stat(outputPath);
    const durationMs = Date.now() - startTime;

    console.log(
      `[CaseStudy] Generated: ${assets.length} assets, ${thumbnailCount} thumbnails, ` +
      `${formatFileSize(stats.size)}, ${durationMs}ms`
    );

    return {
      success: true,
      outputPath,
      htmlSize: stats.size,
      thumbnailCount,
      durationMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[CaseStudy] Generation failed: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    };
  }
}
