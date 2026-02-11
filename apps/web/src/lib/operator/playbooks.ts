/**
 * CE Support Operator — Deterministic Playbooks
 * 
 * Each playbook provides structured guidance for common issues.
 * Playbooks are matched by intent classification before freeform responses.
 */

export interface Playbook {
  id: string;
  title: string;
  symptoms: string[];
  triggerKeywords: string[];
  checks: (context: ContextBundle) => CheckResult[];
  steps: string[];
  escalationWhen: string;
}

export interface CheckResult {
  label: string;
  passed: boolean;
  value?: string | number | boolean;
}

export interface ContextBundle {
  user: {
    id: string;
    plan?: string;
    created_at?: string;
  };
  app: {
    version: string;
    environment: string;
  };
  route: {
    pathname: string;
  };
  latest: {
    project_id?: string;
    job_id?: string;
    asset_ids_count?: number;
    last_action?: string;
    last_error_code?: string;
  };
  limits: {
    max_free_exports: number;
    export_concurrency_limit: number;
    max_upload_mb: number;
  };
  events: Array<{
    eventType: string;
    details?: any;
    createdAt: string;
  }>;
  project_summary?: {
    id: string;
    name: string;
    context_scope?: string;
    assets_total: number;
    assets_pending: number;
    assets_processing: number;
    assets_completed: number;
    assets_approved: number;
  } | null;
}

export const PLAYBOOKS: Record<string, Playbook> = {
  BUTTONS_GREYED_OUT: {
    id: 'BUTTONS_GREYED_OUT',
    title: 'Buttons are greyed out / disabled',
    symptoms: [
      'Cannot click Export button',
      'Run Embed button is disabled',
      'Confirm button not clickable',
    ],
    triggerKeywords: ['grey', 'gray', 'disabled', 'cant click', "can't click", 'not working', 'button'],
    checks: (ctx) => [
      { label: 'Has images uploaded', passed: (ctx.project_summary?.assets_total ?? 0) > 0, value: ctx.project_summary?.assets_total },
      { label: 'Has pending assets', passed: (ctx.project_summary?.assets_pending ?? 0) > 0, value: ctx.project_summary?.assets_pending },
      { label: 'Has completed assets', passed: (ctx.project_summary?.assets_completed ?? 0) > 0, value: ctx.project_summary?.assets_completed },
      { label: 'Has approved assets', passed: (ctx.project_summary?.assets_approved ?? 0) > 0, value: ctx.project_summary?.assets_approved },
    ],
    steps: [
      '1. Upload images if none exist (drag & drop or click Upload)',
      '2. Add context to images (select images → Add Context)',
      '3. Run Embed to generate metadata (select images → Run Embed)',
      '4. Review and Confirm generated metadata before export',
      '5. Export button activates once at least one asset is approved',
    ],
    escalationWhen: 'All steps completed but buttons still disabled',
  },

  UPLOAD_REQUIRED: {
    id: 'UPLOAD_REQUIRED',
    title: 'Upload Required',
    symptoms: ['No images in project', 'Empty project'],
    triggerKeywords: ['upload', 'no images', 'empty', 'add photos', 'add images'],
    checks: (ctx) => [
      { label: 'Project exists', passed: !!ctx.latest.project_id, value: ctx.latest.project_id },
      { label: 'Assets count', passed: (ctx.project_summary?.assets_total ?? 0) > 0, value: ctx.project_summary?.assets_total ?? 0 },
    ],
    steps: [
      '1. Navigate to your project',
      '2. Click the Upload button or drag & drop images',
      '3. Wait for upload to complete (progress bar will show)',
      '4. Supported formats: JPEG, PNG, TIFF, WebP',
    ],
    escalationWhen: 'Upload fails repeatedly or shows error',
  },

  CONTEXT_REQUIRED: {
    id: 'CONTEXT_REQUIRED',
    title: 'Context Required Before Embed',
    symptoms: ['Run Embed disabled', 'Need to add context first'],
    triggerKeywords: ['context', 'add context', 'no context', 'describe'],
    checks: (ctx) => [
      { label: 'Has images', passed: (ctx.project_summary?.assets_total ?? 0) > 0 },
      { label: 'Context scope set', passed: !!ctx.project_summary?.context_scope, value: ctx.project_summary?.context_scope },
    ],
    steps: [
      '1. Select one or more images in the grid',
      '2. Click "Add Context" button',
      '3. Fill in project-level or per-image context',
      '4. Context describes what the image shows and its purpose',
      '5. Better context = better AI-generated metadata',
    ],
    escalationWhen: 'Context applied but Embed still disabled',
  },

  EMBED_REQUIRED: {
    id: 'EMBED_REQUIRED',
    title: 'Run Embed Required',
    symptoms: ['Export disabled', 'Need to run embed first'],
    triggerKeywords: ['embed', 'run embed', 'generate metadata'],
    checks: (ctx) => [
      { label: 'Has pending assets', passed: (ctx.project_summary?.assets_pending ?? 0) > 0, value: ctx.project_summary?.assets_pending },
      { label: 'Has completed assets', passed: (ctx.project_summary?.assets_completed ?? 0) > 0, value: ctx.project_summary?.assets_completed },
    ],
    steps: [
      '1. Select images that have context added',
      '2. Click "Run Embed" button',
      '3. Wait for AI to analyze images and generate metadata',
      '4. Review generated alt text, captions, keywords',
      '5. Confirm metadata before exporting',
    ],
    escalationWhen: 'Embed job fails or hangs',
  },

  CONFIRM_REQUIRED: {
    id: 'CONFIRM_REQUIRED',
    title: 'Confirm Metadata Required',
    symptoms: ['Export disabled but embed complete', 'Need to approve metadata'],
    triggerKeywords: ['confirm', 'approve', 'review'],
    checks: (ctx) => [
      { label: 'Has completed assets', passed: (ctx.project_summary?.assets_completed ?? 0) > 0, value: ctx.project_summary?.assets_completed },
      { label: 'Has approved assets', passed: (ctx.project_summary?.assets_approved ?? 0) > 0, value: ctx.project_summary?.assets_approved },
    ],
    steps: [
      '1. Click on an image to open metadata sidebar',
      '2. Review alt text, caption, and keywords',
      '3. Edit if needed using the edit icon',
      '4. Click "Confirm" to approve the metadata',
      '5. Confirmed images become available for export',
    ],
    escalationWhen: 'Confirm button not responding',
  },

  EXPORT_BUSY: {
    id: 'EXPORT_BUSY',
    title: 'Export Already In Progress',
    symptoms: ['Export button shows busy', 'Cannot start new export'],
    triggerKeywords: ['export busy', 'already exporting', 'export running'],
    checks: (ctx) => {
      const hasRecentExport = ctx.events.some(e => 
        e.eventType.includes('export_started') && 
        new Date(e.createdAt) > new Date(Date.now() - 10 * 60 * 1000)
      );
      return [
        { label: 'Recent export in progress', passed: !hasRecentExport, value: hasRecentExport },
      ];
    },
    steps: [
      '1. Wait for the current export to complete',
      '2. Check the exports section for status',
      '3. Free tier: 1 concurrent export',
      '4. If stuck for >10 minutes, it may have failed silently',
    ],
    escalationWhen: 'Export stuck for more than 15 minutes',
  },

  EXPORT_FAILED_MEMORY: {
    id: 'EXPORT_FAILED_MEMORY',
    title: 'Export Failed (Memory Limit)',
    symptoms: ['Export failed', 'Render restart', 'Out of memory'],
    triggerKeywords: ['export failed', 'memory', 'render', 'crash', 'restart'],
    checks: (ctx) => {
      const hasMemoryError = ctx.events.some(e => 
        e.eventType.includes('error') && 
        (e.details?.message?.includes('memory') || e.details?.code === 'EXPORT_MEMORY_EXCEEDED')
      );
      return [
        { label: 'Memory error detected', passed: !hasMemoryError, value: hasMemoryError },
        { label: 'Large batch', passed: (ctx.project_summary?.assets_total ?? 0) < 50, value: ctx.project_summary?.assets_total },
      ];
    },
    steps: [
      '1. This happens with very large batches on free tier',
      '2. Try exporting in smaller batches (20-30 images)',
      '3. Select a subset of images before clicking Export',
      '4. The system restarts automatically, try again after 2 minutes',
    ],
    escalationWhen: 'Small batches also fail',
  },

  EMBED_FAILED: {
    id: 'EMBED_FAILED',
    title: 'Embed Job Failed',
    symptoms: ['Embed failed', 'Metadata generation error'],
    triggerKeywords: ['embed failed', 'embed error', 'generation failed'],
    checks: (ctx) => {
      const hasEmbedError = ctx.events.some(e => 
        e.eventType.includes('embed') && e.eventType.includes('error')
      );
      return [
        { label: 'Embed error in recent events', passed: !hasEmbedError, value: hasEmbedError },
      ];
    },
    steps: [
      '1. Check if context was added to the images',
      '2. Verify images are valid JPEGs (not corrupted)',
      '3. Try running embed on a single image first',
      '4. If persistent, the AI service may be temporarily unavailable',
    ],
    escalationWhen: 'Embed fails on all images after retry',
  },

  METADATA_MISSING_AFTER_CHATGPT: {
    id: 'METADATA_MISSING_AFTER_CHATGPT',
    title: 'Metadata Missing After ChatGPT/AI Upload',
    symptoms: ['Uploaded to ChatGPT, metadata gone', 'AI platform stripped metadata'],
    triggerKeywords: ['chatgpt', 'ai upload', 'metadata gone', 'stripped', 'disappeared'],
    checks: () => [],
    steps: [
      '1. This is expected behavior — ChatGPT and most AI platforms strip ALL metadata on ingestion',
      '2. They do this for privacy/security reasons',
      '3. Downloaded images from ChatGPT will not have your embedded metadata',
      '4. Solution: Only share via platforms that preserve metadata, or use watermarks',
      '5. See our Survival Study for which platforms preserve metadata',
    ],
    escalationWhen: 'N/A — this is expected platform behavior',
  },

  WORDPRESS_ALT_NOT_FILLED: {
    id: 'WORDPRESS_ALT_NOT_FILLED',
    title: 'WordPress Alt Text Not Appearing',
    symptoms: ['Alt text not in WordPress', 'WP media library empty alt'],
    triggerKeywords: ['wordpress', 'wp', 'alt text', 'media library'],
    checks: (ctx) => {
      const hasWpConfig = ctx.events.some(e => e.eventType === 'wordpress_connected');
      return [
        { label: 'WordPress connected', passed: hasWpConfig },
      ];
    },
    steps: [
      '1. Install the ContextEmbed WordPress plugin',
      '2. In WP Settings → ContextEmbed, enable "Auto-fill alt text from metadata"',
      '3. Toggle "Overwrite existing alt text" if you want to replace current alt',
      '4. Re-import images to trigger metadata sync',
      '5. Check that images have IPTC/XMP data embedded before upload to WP',
    ],
    escalationWhen: 'Plugin installed but alt text still not syncing',
  },

  ENCODING_MOJIBAKE: {
    id: 'ENCODING_MOJIBAKE',
    title: 'Corrupted Characters (Mojibake) in Metadata',
    symptoms: ['© shows as Â©', 'Special characters broken', 'Unicode corruption'],
    triggerKeywords: ['mojibake', 'encoding', 'corrupted', 'garbled', 'special characters', '©', 'Â'],
    checks: () => [],
    steps: [
      '1. This happens when metadata is read/written with wrong encoding',
      '2. ContextEmbed always uses UTF-8 for maximum compatibility',
      '3. Some older software may not handle UTF-8 correctly',
      '4. Re-embed the affected images to fix the encoding',
      '5. Avoid copying metadata through legacy software',
    ],
    escalationWhen: 'Fresh embed still shows corrupted characters',
  },

  PLATFORM_STRIPS_METADATA: {
    id: 'PLATFORM_STRIPS_METADATA',
    title: 'Platform Strips Metadata (Instagram, WhatsApp, etc.)',
    symptoms: ['Metadata removed after posting', 'Social media strips EXIF'],
    triggerKeywords: ['instagram', 'whatsapp', 'facebook', 'twitter', 'social media', 'strips', 'removes'],
    checks: () => [],
    steps: [
      '1. Instagram, WhatsApp, Facebook, and Twitter strip most metadata',
      '2. This is by design for user privacy and file size optimization',
      '3. Workarounds: Use visible watermarks, captions with credit, or bio links',
      '4. For Instagram: Include creator credit in the caption',
      '5. Check our Survival Study for platform-specific preservation rates',
    ],
    escalationWhen: 'N/A — this is expected platform behavior',
  },

  LARGE_BATCH_EXPORT_GUIDANCE: {
    id: 'LARGE_BATCH_EXPORT_GUIDANCE',
    title: 'Exporting Large Batches',
    symptoms: ['Many images to export', 'Batch export tips'],
    triggerKeywords: ['large batch', 'many images', 'bulk export', '100 images', 'batch size'],
    checks: (ctx) => [
      { label: 'Asset count', passed: true, value: ctx.project_summary?.assets_total ?? 0 },
    ],
    steps: [
      '1. For 100+ images, export in batches of 30-50',
      '2. Select images using Shift+Click for range selection',
      '3. Export each batch, wait for completion',
      '4. Downloaded ZIPs can be merged on your computer',
      '5. Pro tip: Export by approval status to track progress',
    ],
    escalationWhen: 'Moderate batch sizes still failing',
  },

  HOW_TO_RUN_SURVIVAL_STUDY_PHASE1: {
    id: 'HOW_TO_RUN_SURVIVAL_STUDY_PHASE1',
    title: 'How to Run Survival Study (Phase 1)',
    symptoms: ['Test metadata preservation', 'Which platforms keep metadata'],
    triggerKeywords: ['survival', 'study', 'phase 1', 'test platforms', 'preservation'],
    checks: () => [],
    steps: [
      '1. Go to Survival Lab in the sidebar',
      '2. Click "Seed Platforms" to populate Phase 1 platforms',
      '3. Upload CE-embedded baseline images (with full metadata)',
      '4. Create a Test Run for a specific platform (e.g., Instagram)',
      '5. Upload the downloaded version from that platform',
      '6. View comparison scores to see what survived',
    ],
    escalationWhen: 'Survival Lab not loading or scoring incorrectly',
  },

  HOW_TO_CHOOSE_CONTEXT_SCOPE: {
    id: 'HOW_TO_CHOOSE_CONTEXT_SCOPE',
    title: 'How to Choose Context Scope',
    symptoms: ['Which scope to pick', 'Context scope meaning'],
    triggerKeywords: ['context scope', 'which scope', 'editorial', 'commercial', 'documentation'],
    checks: () => [],
    steps: [
      '1. Editorial: News, stories, journalism — factual descriptions',
      '2. Commercial: Client work, commissions — brand-focused',
      '3. Product: E-commerce, catalogs — specs and features',
      '4. Event: Conferences, ceremonies — who/what/when',
      '5. Documentation: Inspections, before/after — precise records',
      '6. Legal/Evidence: Chain-of-custody, disputes — factual only',
      '7. Personal Archive: Family, memories — sentimental context',
    ],
    escalationWhen: 'N/A — choose based on primary use case',
  },
};

/**
 * Match user message to a playbook using keyword matching
 */
export function matchPlaybook(message: string): Playbook | null {
  const lowerMessage = message.toLowerCase();
  
  // Score each playbook by keyword matches
  let bestMatch: { playbook: Playbook; score: number } | null = null;
  
  for (const playbook of Object.values(PLAYBOOKS)) {
    let score = 0;
    for (const keyword of playbook.triggerKeywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        score += keyword.length; // Longer matches score higher
      }
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { playbook, score };
    }
  }
  
  return bestMatch?.playbook ?? null;
}

/**
 * Match playbook by error code from events
 */
export function matchPlaybookByCode(code: string): Playbook | null {
  const codeMap: Record<string, string> = {
    'UPLOAD_REQUIRED': 'UPLOAD_REQUIRED',
    'CONTEXT_REQUIRED': 'CONTEXT_REQUIRED',
    'EMBED_REQUIRED': 'EMBED_REQUIRED',
    'CONFIRM_REQUIRED': 'CONFIRM_REQUIRED',
    'EXPORT_BUSY': 'EXPORT_BUSY',
    'EXPORT_FAILED': 'EXPORT_FAILED_MEMORY',
    'EXPORT_MEMORY_EXCEEDED': 'EXPORT_FAILED_MEMORY',
    'EMBED_FAILED': 'EMBED_FAILED',
  };
  
  const playbookId = codeMap[code];
  return playbookId ? PLAYBOOKS[playbookId] : null;
}

/**
 * Generate structured response from a playbook
 */
export function generatePlaybookResponse(
  playbook: Playbook,
  context: ContextBundle
): string {
  const checks = playbook.checks(context);
  
  let response = `## ${playbook.title}\n\n`;
  
  // What's happening
  response += `**What's happening:** ${playbook.symptoms[0]}\n\n`;
  
  // Context checks
  if (checks.length > 0) {
    response += `**Current status:**\n`;
    for (const check of checks) {
      const icon = check.passed ? '✅' : '❌';
      const valueStr = check.value !== undefined ? ` (${check.value})` : '';
      response += `${icon} ${check.label}${valueStr}\n`;
    }
    response += '\n';
  }
  
  // Fix steps
  response += `**Steps to resolve:**\n`;
  for (const step of playbook.steps) {
    response += `${step}\n`;
  }
  
  // Escalation
  response += `\n**If still not working:** ${playbook.escalationWhen}\n`;
  response += `\nClick "Create Ticket" to generate a support request with your context attached.`;
  
  return response;
}
