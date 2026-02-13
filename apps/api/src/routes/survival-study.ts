/**
 * Survival Lab — Study Session Routes
 *
 * Guided-mode endpoints for the Foundation Study flow.
 * Mounted at /survival/study by the main survival-lab router.
 *
 * These are ADDITIVE — they do NOT replace free-form run endpoints.
 */

import { Router, type IRouter } from 'express';
import { z } from 'zod';
import {
  survivalStudySessionRepository,
  survivalBaselineRepository,
  survivalPlatformRepository,
  survivalTestRunRepository,
  survivalTestRunAssetRepository,
} from '@contextembed/db';
import { asyncHandler, createApiError } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../middleware/auth';
import { buildEvidencePack } from '../services/survival-lab/evidence-pack';

export const survivalStudyRouter: IRouter = Router();

// ---- Constants ----

/** Ordered step sequence for the Foundation Study */
export const STUDY_STEPS = [
  'BASELINE_LOCK',
  'LOCAL_EXPORT',
  'CDN_DERIVATIVE',
  'CLOUD_STORAGE',
  'CMS',
  'SOCIAL',
  'SUMMARY',
  'EVIDENCE_PACK',
  'COMPLETE',
] as const;

export type StudyStep = typeof STUDY_STEPS[number];

/** Default 12 Phase 1 platform slugs */
const DEFAULT_PLATFORM_SLUGS = [
  'wordpress_selfhosted', 'wordpress_com', 'squarespace', 'wix',
  'webflow', 'shopify', 'instagram', 'facebook', 'linkedin',
  'dropbox', 'google_drive', 'smugmug',
];

/** Valid scenario type labels for guided mode */
export const SCENARIO_TYPES = [
  'LOCAL_EXPORT',
  'CDN_DERIVATIVE',
  'CLOUD_GOOGLE_DRIVE',
  'CLOUD_DROPBOX',
  'CMS_WP_ORIGINAL',
  'CMS_WP_THUMB',
  'CMS_SQUARESPACE',
  'CMS_WIX',
  'CMS_WEBFLOW',
  'CMS_SHOPIFY',
  'SOCIAL_INSTAGRAM',
  'SOCIAL_FACEBOOK',
  'SOCIAL_LINKEDIN',
] as const;

// ---- Helpers ----

function stepIndex(step: string): number {
  return STUDY_STEPS.indexOf(step as StudyStep);
}

function isValidStep(step: string): step is StudyStep {
  return STUDY_STEPS.includes(step as StudyStep);
}

// ---- Routes ----

/**
 * POST /survival/study/start — Create a new guided study session
 */
survivalStudyRouter.post('/start', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;

  const StartSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    baselineIds: z.array(z.string()).optional(),
    platformSlugs: z.array(z.string()).optional(),
  });

  const body = StartSchema.parse(req.body);

  // Default to the 12 seed platforms if none specified
  const platformSlugs = body.platformSlugs?.length
    ? body.platformSlugs
    : DEFAULT_PLATFORM_SLUGS;

  // Validate platform slugs exist
  for (const slug of platformSlugs) {
    const platform = await survivalPlatformRepository.findBySlug(slug);
    if (!platform) {
      throw createApiError(`Platform not found: ${slug}`, 404);
    }
  }

  // Validate baseline ownership if provided
  if (body.baselineIds?.length) {
    for (const id of body.baselineIds) {
      const baseline = await survivalBaselineRepository.findById(id);
      if (!baseline || baseline.userId !== userId) {
        throw createApiError(`Baseline not found: ${id}`, 404);
      }
    }
  }

  const session = await survivalStudySessionRepository.createSession(userId, {
    title: body.title,
    baselineIds: body.baselineIds ?? [],
    platformSlugs,
  });

  res.status(201).json({ session });
}));

/**
 * GET /survival/study — List user's study sessions
 */
survivalStudyRouter.get('/', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;

  const sessions = await survivalStudySessionRepository.findByUser(userId);
  res.json({ sessions });
}));

/**
 * GET /survival/study/:id — Get study session detail with scenario uploads
 */
survivalStudyRouter.get('/:id', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const session = await survivalStudySessionRepository.findById(userId, id);
  if (!session) {
    throw createApiError('Study session not found', 404);
  }

  // Load baselines
  const baselines = await Promise.all(
    session.baselineIds.map(async (bid: string) => {
      const b = await survivalBaselineRepository.findById(bid);
      return b ? { ...b, bytes: Number(b.bytes) } : null;
    }),
  );

  // Load scenario uploads for this session, grouped by scenarioType
  const scenarios = await survivalScenarioUploadRepository.findByStudySession(id);

  const scenariosByType: Record<string, typeof scenarios> = {};
  for (const s of scenarios) {
    const key = s.scenarioType ?? s.scenario ?? 'other';
    if (!scenariosByType[key]) scenariosByType[key] = [];
    scenariosByType[key].push({
      ...s,
      bytes: s.bytes as any, // BigInt → JSON handled by caller
    });
  }

  // Load runs for this session
  const runs = await survivalTestRunRepository.findByStudySession(id);

  res.json({
    session,
    baselines: baselines.filter(Boolean),
    scenariosByType,
    runs: runs.map(r => ({
      ...r,
      platform: r.platform,
      assetCount: r.assets?.length ?? 0,
      scenarioCount: r.uploads?.length ?? 0,
    })),
  });
}));

/**
 * POST /survival/study/:id/advance — Advance to the next study step
 */
survivalStudyRouter.post('/:id/advance', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const AdvanceSchema = z.object({
    nextStep: z.string(),
  });

  const { nextStep } = AdvanceSchema.parse(req.body);

  if (!isValidStep(nextStep)) {
    throw createApiError(`Invalid step: ${nextStep}. Valid steps: ${STUDY_STEPS.join(', ')}`, 400);
  }

  const session = await survivalStudySessionRepository.findById(userId, id);
  if (!session) {
    throw createApiError('Study session not found', 404);
  }

  if (session.status !== 'IN_PROGRESS') {
    throw createApiError(`Session is ${session.status}, cannot advance`, 400);
  }

  const currentIdx = stepIndex(session.currentStep);
  const nextIdx = stepIndex(nextStep);

  if (nextIdx <= currentIdx) {
    throw createApiError(
      `Cannot go backward: current step is ${session.currentStep} (index ${currentIdx}), ` +
      `requested ${nextStep} (index ${nextIdx})`,
      400,
    );
  }

  // If advancing to COMPLETE, also set session status
  const updatedStatus = nextStep === 'COMPLETE' ? 'COMPLETE' : session.status;

  await survivalStudySessionRepository.updateStep(userId, id, nextStep);
  if (updatedStatus !== session.status) {
    await survivalStudySessionRepository.updateStatus(userId, id, updatedStatus);
  }

  const updated = await survivalStudySessionRepository.findById(userId, id);
  res.json({ session: updated });
}));

/**
 * POST /survival/study/:id/attach-baselines — Set baseline images for the session
 */
survivalStudyRouter.post('/:id/attach-baselines', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const Schema = z.object({
    baselineIds: z.array(z.string()).min(1).max(10),
  });

  const { baselineIds } = Schema.parse(req.body);

  const session = await survivalStudySessionRepository.findById(userId, id);
  if (!session) {
    throw createApiError('Study session not found', 404);
  }

  // Validate ownership
  for (const bid of baselineIds) {
    const baseline = await survivalBaselineRepository.findById(bid);
    if (!baseline || baseline.userId !== userId) {
      throw createApiError(`Baseline not found: ${bid}`, 404);
    }
  }

  const updated = await survivalStudySessionRepository.setBaselines(userId, id, baselineIds);
  res.json({ session: updated });
}));

/**
 * POST /survival/study/:id/attach-platforms — Set platforms for the session
 */
survivalStudyRouter.post('/:id/attach-platforms', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const Schema = z.object({
    platformSlugs: z.array(z.string()).min(1),
  });

  const { platformSlugs } = Schema.parse(req.body);

  const session = await survivalStudySessionRepository.findById(userId, id);
  if (!session) {
    throw createApiError('Study session not found', 404);
  }

  // Validate slugs exist
  for (const slug of platformSlugs) {
    const platform = await survivalPlatformRepository.findBySlug(slug);
    if (!platform) {
      throw createApiError(`Platform not found: ${slug}`, 404);
    }
  }

  const updated = await survivalStudySessionRepository.setPlatforms(userId, id, platformSlugs);
  res.json({ session: updated });
}));

/**
 * POST /survival/study/:id/evidence-pack — Generate evidence pack ZIP
 */
survivalStudyRouter.post('/:id/evidence-pack', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const session = await survivalStudySessionRepository.findById(userId, id);
  if (!session) {
    throw createApiError('Study session not found', 404);
  }

  const result = await buildEvidencePack(id, userId);

  res.json({
    success: true,
    signedUrl: result.signedUrl,
    storagePath: result.storagePath,
    sizeBytes: result.sizeBytes,
  });
}));

/**
 * POST /survival/study/:id/ensure-run — Auto-create or find existing run for a platform
 *
 * Used by guided mode to transparently manage runs.
 */
survivalStudyRouter.post('/:id/ensure-run', asyncHandler(async (req, res) => {
  const { userId } = req as AuthenticatedRequest;
  const { id } = req.params;

  const Schema = z.object({
    platformSlug: z.string(),
  });

  const { platformSlug } = Schema.parse(req.body);

  const session = await survivalStudySessionRepository.findById(userId, id);
  if (!session) {
    throw createApiError('Study session not found', 404);
  }

  // Find platform
  const platform = await survivalPlatformRepository.findBySlug(platformSlug);
  if (!platform) {
    throw createApiError(`Platform not found: ${platformSlug}`, 404);
  }

  // Check if a run already exists for this platform + session
  const existingRuns = await survivalTestRunRepository.findByStudySession(id);
  const existingRun = existingRuns.find(r => r.platformId === platform.id);

  if (existingRun) {
    res.json({ run: { ...existingRun, platform }, created: false });
    return;
  }

  // Create a new run
  const title = `Foundation Study – ${platform.name} – ${id.slice(0, 8)}`;
  const run = await survivalTestRunRepository.create({
    userId,
    platformId: platform.id,
    title,
    status: 'running',
    studySessionId: id,
  });

  // Attach baselines automatically
  if (session.baselineIds.length > 0) {
    await survivalTestRunAssetRepository.attach(run.id, session.baselineIds);
  }

  const fullRun = await survivalTestRunRepository.findById(run.id);
  res.status(201).json({ run: { ...fullRun, platform }, created: true });
}));

export default survivalStudyRouter;

// Re-export needed by survival-lab router for import convenience
import { survivalScenarioUploadRepository } from '@contextembed/db';
