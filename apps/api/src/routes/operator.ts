/**
 * Support Operator API Routes
 * 
 * Provides context bundle, chat responses, and ticket generation
 * for the in-app support agent.
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { 
  projectRepository, 
  assetRepository, 
  ceEventLogRepository,
  ceSupportTicketRepository,
  userProfileRepository,
  jobRepository,
} from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';

export const operatorRouter: IRouter = Router();

// App version and limits (could be from env/config)
const APP_CONFIG = {
  version: '2.0.0',
  environment: process.env.NODE_ENV || 'development',
  limits: {
    max_free_exports: 100,
    export_concurrency_limit: 1,
    max_upload_mb: 50,
  },
};

// ============================================
// Playbook Definitions (server-side copy)
// ============================================

interface Playbook {
  id: string;
  title: string;
  symptoms: string[];
  triggerKeywords: string[];
  steps: string[];
  escalationWhen: string;
}

const PLAYBOOKS: Record<string, Playbook> = {
  BUTTONS_GREYED_OUT: {
    id: 'BUTTONS_GREYED_OUT',
    title: 'Buttons are greyed out / disabled',
    symptoms: ['Cannot click Export button', 'Run Embed button is disabled'],
    triggerKeywords: ['grey', 'gray', 'disabled', 'cant click', "can't click", 'not working', 'button'],
    steps: [
      '1. Upload images if none exist',
      '2. Add context to images',
      '3. Run Embed to generate metadata',
      '4. Review and Confirm metadata',
      '5. Export button activates once assets are approved',
    ],
    escalationWhen: 'All steps completed but buttons still disabled',
  },
  UPLOAD_REQUIRED: {
    id: 'UPLOAD_REQUIRED',
    title: 'Upload Required',
    symptoms: ['No images in project', 'Empty project'],
    triggerKeywords: ['upload', 'no images', 'empty', 'add photos'],
    steps: [
      '1. Navigate to your project',
      '2. Click Upload or drag & drop images',
      '3. Supported: JPEG, PNG, TIFF, WebP',
    ],
    escalationWhen: 'Upload fails repeatedly',
  },
  CONTEXT_REQUIRED: {
    id: 'CONTEXT_REQUIRED',
    title: 'Context Required Before Embed',
    symptoms: ['Run Embed disabled', 'Need to add context first'],
    triggerKeywords: ['context', 'add context', 'no context'],
    steps: [
      '1. Select images in the grid',
      '2. Click "Add Context"',
      '3. Fill in project or per-image context',
    ],
    escalationWhen: 'Context applied but Embed still disabled',
  },
  EMBED_REQUIRED: {
    id: 'EMBED_REQUIRED',
    title: 'Run Embed Required',
    symptoms: ['Export disabled', 'Need to run embed'],
    triggerKeywords: ['embed', 'run embed', 'generate metadata'],
    steps: [
      '1. Select images with context',
      '2. Click "Run Embed"',
      '3. Wait for AI to generate metadata',
      '4. Confirm before exporting',
    ],
    escalationWhen: 'Embed job fails or hangs',
  },
  CONFIRM_REQUIRED: {
    id: 'CONFIRM_REQUIRED',
    title: 'Confirm Metadata Required',
    symptoms: ['Export disabled but embed complete'],
    triggerKeywords: ['confirm', 'approve', 'review'],
    steps: [
      '1. Click image to open sidebar',
      '2. Review alt text and keywords',
      '3. Click "Confirm" to approve',
    ],
    escalationWhen: 'Confirm button not responding',
  },
  EXPORT_BUSY: {
    id: 'EXPORT_BUSY',
    title: 'Export Already In Progress',
    symptoms: ['Export button shows busy'],
    triggerKeywords: ['export busy', 'already exporting'],
    steps: [
      '1. Wait for current export to complete',
      '2. Free tier: 1 concurrent export',
      '3. If stuck >10 min, may have failed',
    ],
    escalationWhen: 'Export stuck for 15+ minutes',
  },
  EXPORT_FAILED_MEMORY: {
    id: 'EXPORT_FAILED_MEMORY',
    title: 'Export Failed (Memory Limit)',
    symptoms: ['Export failed', 'Out of memory'],
    triggerKeywords: ['export failed', 'memory', 'crash', 'restart'],
    steps: [
      '1. Export in smaller batches (20-30 images)',
      '2. System restarts automatically',
      '3. Try again after 2 minutes',
    ],
    escalationWhen: 'Small batches also fail',
  },
  EMBED_FAILED: {
    id: 'EMBED_FAILED',
    title: 'Embed Job Failed',
    symptoms: ['Embed failed', 'Metadata generation error'],
    triggerKeywords: ['embed failed', 'embed error'],
    steps: [
      '1. Check context was added',
      '2. Verify images are valid JPEGs',
      '3. Try single image first',
    ],
    escalationWhen: 'Embed fails on all images',
  },
  METADATA_MISSING_AFTER_CHATGPT: {
    id: 'METADATA_MISSING_AFTER_CHATGPT',
    title: 'Metadata Missing After AI Upload',
    symptoms: ['ChatGPT stripped metadata'],
    triggerKeywords: ['chatgpt', 'ai upload', 'metadata gone', 'stripped'],
    steps: [
      '1. This is expected — AI platforms strip metadata',
      '2. Use watermarks or visible credits instead',
      '3. Check Survival Study for preservation rates',
    ],
    escalationWhen: 'N/A — expected platform behavior',
  },
  WORDPRESS_ALT_NOT_FILLED: {
    id: 'WORDPRESS_ALT_NOT_FILLED',
    title: 'WordPress Alt Text Not Appearing',
    symptoms: ['Alt text not in WP media library'],
    triggerKeywords: ['wordpress', 'wp', 'alt text', 'media library'],
    steps: [
      '1. Install ContextEmbed WordPress plugin',
      '2. Enable "Auto-fill alt text" in WP Settings',
      '3. Toggle "Overwrite existing" if needed',
    ],
    escalationWhen: 'Plugin installed but not syncing',
  },
  ENCODING_MOJIBAKE: {
    id: 'ENCODING_MOJIBAKE',
    title: 'Corrupted Characters in Metadata',
    symptoms: ['© shows as Â©', 'Unicode corruption'],
    triggerKeywords: ['mojibake', 'encoding', 'corrupted', 'garbled', '©'],
    steps: [
      '1. Re-embed affected images',
      '2. ContextEmbed uses UTF-8',
      '3. Avoid legacy software in workflow',
    ],
    escalationWhen: 'Fresh embed still corrupted',
  },
  PLATFORM_STRIPS_METADATA: {
    id: 'PLATFORM_STRIPS_METADATA',
    title: 'Social Platform Strips Metadata',
    symptoms: ['Metadata removed after posting'],
    triggerKeywords: ['instagram', 'whatsapp', 'facebook', 'social media', 'strips'],
    steps: [
      '1. Instagram/WhatsApp/Facebook strip metadata by design',
      '2. Use visible watermarks or captions',
      '3. Check Survival Study for alternatives',
    ],
    escalationWhen: 'N/A — expected platform behavior',
  },
  LARGE_BATCH_EXPORT_GUIDANCE: {
    id: 'LARGE_BATCH_EXPORT_GUIDANCE',
    title: 'Exporting Large Batches',
    symptoms: ['Many images to export'],
    triggerKeywords: ['large batch', 'many images', 'bulk export', '100 images'],
    steps: [
      '1. Export in batches of 30-50',
      '2. Use Shift+Click for range selection',
      '3. Merge downloaded ZIPs locally',
    ],
    escalationWhen: 'Moderate batches failing',
  },
  HOW_TO_RUN_SURVIVAL_STUDY_PHASE1: {
    id: 'HOW_TO_RUN_SURVIVAL_STUDY_PHASE1',
    title: 'How to Run Survival Study',
    symptoms: ['Test metadata preservation'],
    triggerKeywords: ['survival', 'study', 'phase 1', 'test platforms'],
    steps: [
      '1. Go to Survival Lab',
      '2. Seed Phase 1 platforms',
      '3. Upload CE-embedded baselines',
      '4. Create Test Run per platform',
      '5. Upload downloaded versions',
      '6. View comparison scores',
    ],
    escalationWhen: 'Survival Lab not loading',
  },
  HOW_TO_CHOOSE_CONTEXT_SCOPE: {
    id: 'HOW_TO_CHOOSE_CONTEXT_SCOPE',
    title: 'How to Choose Context Scope',
    symptoms: ['Which scope to pick'],
    triggerKeywords: ['context scope', 'which scope', 'editorial', 'commercial'],
    steps: [
      '1. Editorial: News, journalism',
      '2. Commercial: Client work',
      '3. Product: E-commerce',
      '4. Event: Conferences, ceremonies',
      '5. Documentation: Inspections',
      '6. Personal Archive: Family, memories',
    ],
    escalationWhen: 'N/A — choose by use case',
  },
};

function matchPlaybook(message: string): Playbook | null {
  const lowerMessage = message.toLowerCase();
  let bestMatch: { playbook: Playbook; score: number } | null = null;
  
  for (const playbook of Object.values(PLAYBOOKS)) {
    let score = 0;
    for (const keyword of playbook.triggerKeywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    }
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { playbook, score };
    }
  }
  
  return bestMatch?.playbook ?? null;
}

// ============================================
// GET /operator/context — Context Bundle
// ============================================

operatorRouter.get('/context', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  
  // Get user profile
  const profile = await userProfileRepository.findByUserId(userId);
  
  // Get recent events
  const events = await ceEventLogRepository.findRecentByUser(userId, { limit: 50 });
  
  // Get last error
  const lastError = await ceEventLogRepository.findLastError(userId);
  
  // Get last action
  const lastAction = await ceEventLogRepository.findLastAction(userId);
  
  // Try to get latest project context
  const projects = await projectRepository.findByUser(userId);
  const latestProject = projects[0];
  
  let projectSummary = null;
  let latestJobId = null;
  let assetCount = 0;
  
  if (latestProject) {
    const assetCounts = await assetRepository.countByStatus(latestProject.id);
    assetCount = Object.values(assetCounts).reduce((a, b) => a + b, 0);
    
    // Get most recent job
    const jobs = await jobRepository.findByProject(latestProject.id);
    latestJobId = jobs[0]?.id;
    
    projectSummary = {
      id: latestProject.id,
      name: latestProject.name,
      context_scope: (latestProject as any).onboardingProfile?.confirmedContext?.contextScope || null,
      assets_total: assetCount,
      assets_pending: assetCounts.pending || 0,
      assets_processing: (assetCounts.preprocessing || 0) + (assetCounts.analyzing || 0) + (assetCounts.synthesizing || 0),
      assets_completed: assetCounts.completed || 0,
      assets_approved: assetCounts.approved || 0,
    };
  }
  
  const contextBundle = {
    user: {
      id: userId,
      plan: profile?.businessName ? 'pro' : 'free', // Simplified plan detection
      created_at: profile?.createdAt?.toISOString(),
    },
    app: {
      version: APP_CONFIG.version,
      environment: APP_CONFIG.environment,
    },
    route: {
      pathname: req.headers['x-pathname'] as string || '/dashboard',
    },
    latest: {
      project_id: latestProject?.id,
      job_id: latestJobId,
      asset_ids_count: assetCount,
      last_action: lastAction?.eventType,
      last_error_code: lastError ? (lastError.details as any)?.code : null,
    },
    limits: APP_CONFIG.limits,
    events: events.map(e => ({
      eventType: e.eventType,
      details: e.details,
      createdAt: e.createdAt.toISOString(),
    })),
    project_summary: projectSummary,
  };
  
  res.json(contextBundle);
}));

// ============================================
// POST /operator/chat — Chat Response
// ============================================

const ChatInputSchema = z.object({
  message: z.string().min(1).max(2000),
});

operatorRouter.post('/chat', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { message } = ChatInputSchema.parse(req.body);
  
  // Get context bundle (same logic as /context)
  const events = await ceEventLogRepository.findRecentByUser(userId, { limit: 20 });
  const lastError = await ceEventLogRepository.findLastError(userId);
  const projects = await projectRepository.findByUser(userId);
  const latestProject = projects[0];
  
  let projectSummary = null;
  let latestJobId = null;
  
  if (latestProject) {
    const assetCounts = await assetRepository.countByStatus(latestProject.id);
    const jobs = await jobRepository.findByProject(latestProject.id);
    latestJobId = jobs[0]?.id;
    
    projectSummary = {
      id: latestProject.id,
      name: latestProject.name,
      assets_total: Object.values(assetCounts).reduce((a, b) => a + b, 0),
      assets_pending: assetCounts.pending || 0,
      assets_completed: assetCounts.completed || 0,
      assets_approved: assetCounts.approved || 0,
    };
  }
  
  // Try to match a playbook
  const matchedPlaybook = matchPlaybook(message);
  
  let replyMarkdown: string;
  let confidence: 'high' | 'medium' | 'low';
  
  if (matchedPlaybook) {
    // Generate deterministic response from playbook
    replyMarkdown = `## ${matchedPlaybook.title}\n\n`;
    replyMarkdown += `**What's happening:** ${matchedPlaybook.symptoms[0]}\n\n`;
    
    // Add context-aware status
    if (projectSummary) {
      replyMarkdown += `**Your current project status:**\n`;
      replyMarkdown += `- Project: ${projectSummary.name}\n`;
      replyMarkdown += `- Total assets: ${projectSummary.assets_total}\n`;
      replyMarkdown += `- Pending: ${projectSummary.assets_pending}\n`;
      replyMarkdown += `- Completed: ${projectSummary.assets_completed}\n`;
      replyMarkdown += `- Approved: ${projectSummary.assets_approved}\n\n`;
    }
    
    replyMarkdown += `**Steps to resolve:**\n`;
    for (const step of matchedPlaybook.steps) {
      replyMarkdown += `${step}\n`;
    }
    
    replyMarkdown += `\n**If still not working:** ${matchedPlaybook.escalationWhen}\n`;
    replyMarkdown += `\nClick "Create Ticket" to generate a support request with your context attached.`;
    
    confidence = 'high';
  } else {
    // Freeform response with conservative guardrails
    replyMarkdown = `I understand you're asking about: "${message}"\n\n`;
    
    if (projectSummary) {
      replyMarkdown += `**Based on your current context:**\n`;
      replyMarkdown += `- Project: ${projectSummary.name} (${projectSummary.assets_total} assets)\n`;
      replyMarkdown += `- Status: ${projectSummary.assets_approved} approved, ${projectSummary.assets_pending} pending\n\n`;
    }
    
    if (lastError) {
      replyMarkdown += `**Recent issue detected:** ${(lastError.details as any)?.message || lastError.eventType}\n\n`;
    }
    
    replyMarkdown += `I don't have a specific playbook for this question. Here's what I can do:\n\n`;
    replyMarkdown += `1. **Create a support ticket** with your full context attached\n`;
    replyMarkdown += `2. **Check the docs** at docs.contextembed.com\n`;
    replyMarkdown += `3. **Try rephrasing** — ask about buttons, exports, metadata, WordPress, etc.\n\n`;
    replyMarkdown += `Would you like me to create a support ticket?`;
    
    confidence = 'low';
  }
  
  // Log this chat interaction
  await ceEventLogRepository.create({
    userId,
    projectId: latestProject?.id,
    eventType: 'support_chat',
    details: {
      message: message.substring(0, 200),
      matched_playbook: matchedPlaybook?.id || null,
      confidence,
    },
  });
  
  res.json({
    reply_markdown: replyMarkdown,
    matched_playbook: matchedPlaybook?.id || null,
    confidence,
    context_snapshot: {
      project_id: latestProject?.id,
      job_id: latestJobId,
      last_error_code: lastError ? (lastError.details as any)?.code : null,
    },
  });
}));

// ============================================
// POST /operator/ticket — Generate Ticket Payload
// ============================================

const TicketInputSchema = z.object({
  message: z.string().min(1).max(5000),
  category: z.string().max(100).optional(),
  environment: z.object({
    browser: z.string().optional(),
    os: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
});

operatorRouter.post('/ticket', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { message, category, environment } = TicketInputSchema.parse(req.body);
  
  // Get full context
  const profile = await userProfileRepository.findByUserId(userId);
  const events = await ceEventLogRepository.findRecentByUser(userId, { limit: 30 });
  const projects = await projectRepository.findByUser(userId);
  const latestProject = projects[0];
  
  let projectData = null;
  let jobData = null;
  
  if (latestProject) {
    const assetCounts = await assetRepository.countByStatus(latestProject.id);
    const jobs = await jobRepository.findByProject(latestProject.id);
    const latestJob = jobs[0];
    
    projectData = {
      id: latestProject.id,
      name: latestProject.name,
      context_scope: (latestProject as any).onboardingProfile?.confirmedContext?.contextScope || null,
      assets_total: Object.values(assetCounts).reduce((a, b) => a + b, 0),
    };
    
    if (latestJob) {
      jobData = {
        id: latestJob.id,
        status: latestJob.status,
        started_at: latestJob.startedAt?.toISOString(),
        ended_at: latestJob.completedAt?.toISOString(),
      };
    }
  }
  
  // Extract error events
  const errorEvents = events
    .filter(e => e.eventType.includes('error') || e.eventType.includes('failed'))
    .slice(0, 5)
    .map(e => ({
      code: (e.details as any)?.code || e.eventType,
      message: (e.details as any)?.message || null,
      at: e.createdAt.toISOString(),
    }));
  
  const ticketPayload = {
    product: 'ContextEmbed',
    user_id: userId,
    plan: profile?.businessName ? 'pro' : 'free',
    created_at: new Date().toISOString(),
    route: req.headers['x-pathname'] as string || '/dashboard',
    project: projectData,
    job: jobData,
    last_errors: errorEvents,
    recent_events: events.slice(0, 10).map(e => ({
      type: e.eventType,
      at: e.createdAt.toISOString(),
    })),
    environment: environment || {},
    user_message: message,
    category: category || 'general',
  };
  
  // Store ticket in database
  const ticket = await ceSupportTicketRepository.create({
    userId,
    category,
    userMessage: message,
    contextSnapshot: ticketPayload,
    environment: environment || {},
  });
  
  // Log ticket creation
  await ceEventLogRepository.create({
    userId,
    projectId: latestProject?.id,
    eventType: 'support_ticket_created',
    details: {
      ticket_id: ticket.id,
      category,
    },
  });
  
  res.status(201).json({
    ticket_id: ticket.id,
    payload: ticketPayload,
  });
}));
