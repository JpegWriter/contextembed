/**
 * Job Runner Service
 * Hybrid: Uses BullMQ when Redis is available, falls back to polling
 * 
 * Production mode (with Redis):
 * - Rate limiting against OpenAI API
 * - Retry with exponential backoff
 * - Concurrent job limits
 * - Survives restarts
 * 
 * Development mode (no Redis):
 * - Simple polling
 * - In-memory job tracking
 */

import { 
  jobRepository,
  assetRepository,
  onboardingProfileRepository,
  userProfileRepository,
  visionResultRepository,
  metadataResultRepository,
  embedResultRepository,
  projectRepository,
} from '@contextembed/db';
import { 
  createVisionAnalyzer,
  createMetadataSynthesizer,
  createEmbedder,
  VisionAnalysis,
  OnboardingProfile,
  SynthesizedMetadata,
} from '@contextembed/core';
import { 
  createVisionProvider, 
  createLLMProvider,
  getDefaultProviderConfig,
} from '@contextembed/providers';
import { createExifToolWriter } from '@contextembed/metadata';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Job } from 'bullmq';
import {
  initQueues,
  startWorkers,
  stopWorkers,
  addProcessJob,
  isRedisAvailable,
  ProcessJobData,
  ExportJobData,
  getQueueStats,
  gracefulShutdown,
} from './queue';

let isRunning = false;
let pollInterval: NodeJS.Timeout | null = null;
let useRedisQueue = false;

const POLL_INTERVAL = parseInt(process.env.JOB_POLL_INTERVAL || '1000', 10);
const CONCURRENCY = parseInt(process.env.JOB_CONCURRENCY || '3', 10);
const USE_REDIS = process.env.REDIS_URL ? true : false;

let activeJobs = 0;

/**
 * Start the job runner
 */
export async function startJobRunner(): Promise<void> {
  if (isRunning) return;
  
  isRunning = true;
  
  // Try to use Redis/BullMQ in production
  if (USE_REDIS) {
    try {
      await initQueues();
      await startWorkers(handleProcessJob, handleExportJob);
      useRedisQueue = true;
      console.log('📋 Job runner started (BullMQ mode)');
      return;
    } catch (error) {
      console.warn('⚠️ Redis unavailable, falling back to polling mode:', error);
      useRedisQueue = false;
    }
  }
  
  // Fallback to polling mode
  console.log('📋 Job runner started (polling mode)');
  pollInterval = setInterval(pollJobs, POLL_INTERVAL);
}

/**
 * Stop the job runner
 */
export async function stopJobRunner(): Promise<void> {
  isRunning = false;
  
  if (useRedisQueue) {
    await gracefulShutdown();
  }
  
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  
  console.log('📋 Job runner stopped');
}

/**
 * Queue a job (uses BullMQ if available)
 */
export async function queueJob(
  jobId: string,
  assetId: string,
  projectId: string,
  type: 'full_pipeline' | 'vision_analysis' | 'metadata_synthesis' | 'embed',
  userId?: string
): Promise<void> {
  if (useRedisQueue) {
    await addProcessJob({
      jobId,
      assetId,
      projectId,
      type,
      userId,
    });
  }
  // If not using Redis, job will be picked up by pollJobs
}

/**
 * Get queue status
 */
export async function getJobRunnerStatus(): Promise<{
  mode: 'bullmq' | 'polling';
  stats?: {
    process: { waiting: number; active: number; completed: number; failed: number };
    export: { waiting: number; active: number; completed: number; failed: number };
  };
  activeJobs?: number;
}> {
  if (useRedisQueue) {
    const stats = await getQueueStats();
    return { mode: 'bullmq', stats };
  }
  return { mode: 'polling', activeJobs };
}

/**
 * BullMQ process handler
 */
async function handleProcessJob(job: Job<ProcessJobData>): Promise<void> {
  const { jobId, type } = job.data;
  
  const dbJob = await jobRepository.findById(jobId);
  if (!dbJob || dbJob.status !== 'pending') {
    return;
  }
  
  console.log(`🔄 Processing job ${jobId} (${type}) via BullMQ`);
  
  try {
    await jobRepository.markStarted(jobId);
    
    switch (type) {
      case 'full_pipeline':
        await processFullPipeline(dbJob);
        break;
      case 'vision_analysis':
        await processVisionAnalysis(dbJob);
        break;
      case 'metadata_synthesis':
        await processMetadataSynthesis(dbJob);
        break;
      case 'embed':
        await processEmbed(dbJob);
        break;
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
    
    await jobRepository.markCompleted(jobId);
    console.log(`✅ Job ${jobId} completed`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await jobRepository.markFailed(jobId, errorMessage);
    console.error(`❌ Job ${jobId} failed:`, errorMessage);
    
    if (dbJob.assetId) {
      await assetRepository.update(dbJob.assetId, { status: 'failed' });
    }
    
    throw error; // Re-throw for BullMQ retry
  }
}

/**
 * BullMQ export handler
 */
async function handleExportJob(job: Job<ExportJobData>): Promise<void> {
  // Export processing - to be implemented
  console.log(`📦 Processing export ${job.data.exportId}`);
}

/**
 * Poll for pending jobs
 */
async function pollJobs(): Promise<void> {
  if (!isRunning || activeJobs >= CONCURRENCY) {
    return;
  }
  
  try {
    const availableSlots = CONCURRENCY - activeJobs;
    const jobs = await jobRepository.findPending(availableSlots);
    
    for (const job of jobs) {
      if (activeJobs >= CONCURRENCY) break;
      
      activeJobs++;
      processJob(job.id).finally(() => {
        activeJobs--;
      });
    }
  } catch (error) {
    console.error('Error polling jobs:', error);
  }
}

/**
 * Process a single job
 */
async function processJob(jobId: string): Promise<void> {
  const job = await jobRepository.findById(jobId);
  
  if (!job || job.status !== 'pending') {
    return;
  }
  
  console.log(`🔄 Processing job ${jobId} (${job.type})`);
  
  try {
    await jobRepository.markStarted(jobId);
    
    switch (job.type) {
      case 'full_pipeline':
        await processFullPipeline(job);
        break;
        
      case 'vision_analysis':
        await processVisionAnalysis(job);
        break;
        
      case 'metadata_synthesis':
        await processMetadataSynthesis(job);
        break;
        
      case 'embed':
        await processEmbed(job);
        break;
        
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
    
    await jobRepository.markCompleted(jobId);
    console.log(`✅ Job ${jobId} completed`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await jobRepository.markFailed(jobId, errorMessage);
    console.error(`❌ Job ${jobId} failed:`, errorMessage);
    
    // Update asset status if applicable
    if (job.assetId) {
      await assetRepository.update(job.assetId, { status: 'failed' });
    }
  }
}

/**
 * Resolve onboarding profile: try project-level, fall back to user profile
 */
async function resolveProfile(projectId: string): Promise<any> {
  // Try project-level onboarding profile first
  const profile = await onboardingProfileRepository.findByProjectId(projectId);
  if (profile) return profile;

  // Fall back to user profile defaults
  const project = await projectRepository.findById(projectId);
  if (!project) throw new Error('Project not found');

  const userProfile = await userProfileRepository.findByUserId(project.userId);
  if (!userProfile) {
    throw new Error('No onboarding profile or user profile found. Complete onboarding first.');
  }

  // Build a synthetic OnboardingProfile-compatible object from user profile
  return {
    id: userProfile.id,
    projectId,
    version: 1,
    projectName: project.name,
    primaryGoal: project.goal,
    websiteUrl: userProfile.website || undefined,
    confirmedContext: {
      brandName: userProfile.businessName || '',
      tagline: userProfile.tagline || undefined,
      industry: userProfile.industry || undefined,
      niche: userProfile.niche || undefined,
      services: userProfile.services ? userProfile.services.split(',').map((s: string) => s.trim()) : undefined,
      targetAudience: userProfile.targetAudience || undefined,
      brandVoice: userProfile.brandVoice || undefined,
      location: (userProfile.city || userProfile.state || userProfile.country) ? {
        city: userProfile.city || undefined,
        state: userProfile.state || undefined,
        country: userProfile.country || undefined,
        isStrict: false,
      } : undefined,
      yearsExperience: userProfile.yearsExperience ? parseInt(userProfile.yearsExperience) || undefined : undefined,
      credentials: userProfile.credentials ? userProfile.credentials.split(',').map((s: string) => s.trim()) : undefined,
      specializations: userProfile.specializations ? userProfile.specializations.split(',').map((s: string) => s.trim()) : undefined,
      awardsRecognition: userProfile.awardsRecognition ? userProfile.awardsRecognition.split(',').map((s: string) => s.trim()) : undefined,
      clientTypes: userProfile.clientTypes || undefined,
      keyDifferentiator: userProfile.keyDifferentiator || undefined,
      pricePoint: userProfile.pricePoint || undefined,
      brandStory: userProfile.brandStory || undefined,
      serviceArea: userProfile.serviceArea ? userProfile.serviceArea.split(',').map((s: string) => s.trim()) : undefined,
      defaultEventType: userProfile.defaultEventType || undefined,
      typicalDeliverables: userProfile.typicalDeliverables ? userProfile.typicalDeliverables.split(',').map((s: string) => s.trim()) : undefined,
    },
    rights: {
      creatorName: userProfile.creatorName || '',
      copyrightTemplate: userProfile.copyrightTemplate || `© ${new Date().getFullYear()} ${userProfile.businessName || ''}. All rights reserved.`,
      creditTemplate: userProfile.creditTemplate || userProfile.creatorName || '',
      usageTermsTemplate: userProfile.usageTerms || undefined,
      website: userProfile.website || undefined,
      email: userProfile.contactEmail || undefined,
    },
    preferences: {
      primaryLanguage: userProfile.primaryLanguage || 'en',
      keywordStyle: userProfile.keywordStyle || 'mixed',
      maxKeywords: userProfile.maxKeywords || 15,
      locationBehavior: 'infer' as const,
      overwriteOriginals: false,
      includeReasoning: true,
      outputFormat: 'copy' as const,
    },
    completenessScore: 100,
    isComplete: true,
    createdAt: userProfile.createdAt,
    updatedAt: userProfile.updatedAt,
  };
}

/**
 * Process full pipeline job
 */
async function processFullPipeline(job: any): Promise<void> {
  if (!job.assetId) {
    throw new Error('Asset ID required for pipeline job');
  }
  
  const asset = await assetRepository.findById(job.assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }
  
  const profile = await resolveProfile(job.projectId);
  
  // Initialize providers
  const config = getDefaultProviderConfig();
  const visionProvider = createVisionProvider(config);
  const llmProvider = createLLMProvider(config);
  const metadataWriter = createExifToolWriter();
  
  const visionAnalyzer = createVisionAnalyzer(visionProvider);
  const metadataSynthesizer = createMetadataSynthesizer(llmProvider);
  const embedder = createEmbedder(metadataWriter);
  
  // Update progress: analyzing
  await assetRepository.update(asset.id, { status: 'analyzing' });
  await jobRepository.update(job.id, { progress: 10 });
  
  // Step 1: Vision Analysis
  const analysisImagePath = asset.analysisPath || asset.storagePath;
  const imageBuffer = await fs.readFile(analysisImagePath);
  const imageBase64 = imageBuffer.toString('base64');
  
  const visionOutput = await visionAnalyzer.analyze(
    { base64: imageBase64 },
    asset.id,
    asset.hash
  );
  
  if (!visionOutput.success || !visionOutput.analysis) {
    throw new Error(visionOutput.error || 'Vision analysis failed');
  }
  
  // Save vision result
  await visionResultRepository.create({
    assetId: asset.id,
    modelId: visionOutput.modelId,
    promptVersion: visionOutput.promptVersion,
    inputHash: asset.hash,
    result: visionOutput.analysis as any,
    tokensUsed: visionOutput.tokensUsed,
    processingTimeMs: visionOutput.processingTimeMs,
  });
  
  await jobRepository.update(job.id, { progress: 40 });
  
  // Step 2: Metadata Synthesis
  await assetRepository.update(asset.id, { status: 'synthesizing' });
  
  // Build event context from project (makes this enterprise-grade)
  // Project becomes the event - all images in project are linked
  const project = await projectRepository.findById(job.projectId);
  const eventContext = {
    eventId: job.projectId,
    eventName: project?.name,
    eventDate: project?.createdAt?.toISOString()?.split('T')[0], // YYYY-MM-DD
    // storySequence could be derived from asset order in project
    // galleryId could be added later for sub-galleries
  };
  
  const synthesisOutput = await metadataSynthesizer.synthesize(
    visionOutput.analysis,
    profile as unknown as OnboardingProfile,
    asset.userComment || undefined,
    eventContext
  );
  
  if (!synthesisOutput.success || !synthesisOutput.metadata) {
    throw new Error(synthesisOutput.error || 'Metadata synthesis failed');
  }
  
  // Get latest vision result for linking
  const latestVisionResult = await visionResultRepository.findLatestByAsset(asset.id);
  
  // Save metadata result
  await metadataResultRepository.create({
    assetId: asset.id,
    visionResultId: latestVisionResult!.id,
    onboardingProfileId: profile.id,
    modelId: synthesisOutput.modelId,
    promptVersion: synthesisOutput.promptVersion,
    inputHash: asset.hash,
    result: synthesisOutput.metadata as any,
    tokensUsed: synthesisOutput.tokensUsed,
    processingTimeMs: synthesisOutput.processingTimeMs,
  });
  
  await jobRepository.update(job.id, { progress: 70 });
  
  // Step 3: Embed
  await assetRepository.update(asset.id, { status: 'embedding' });
  
  const outputPath = embedder.generateOutputPath(asset.storagePath);
  
  // Enrich metadata with userContext (preserved verbatim from user input)
  const enrichedMetadata = {
    ...synthesisOutput.metadata,
    userContext: asset.userComment || undefined,
  };
  
  // Pass the source hash for audit trail
  const { embedResult: embedOutput, verifyResult } = await embedder.embedAndVerify(
    asset.storagePath,
    outputPath,
    enrichedMetadata,
    asset.hash  // Source file hash for audit
  );
  
  if (!embedOutput.success) {
    throw new Error(embedOutput.error || 'Embedding failed');
  }
  
  // Get latest metadata result for linking
  const latestMetadataResult = await metadataResultRepository.findLatestByAsset(asset.id);
  
  // Save embed result
  await embedResultRepository.create({
    assetId: asset.id,
    metadataResultId: latestMetadataResult!.id,
    embeddedPath: embedOutput.outputPath!,
    fieldsWritten: embedOutput.fieldsWritten,
    exiftoolLogs: embedOutput.logs,
    verified: verifyResult?.verified || false,
    verificationDetails: verifyResult as any,
  });
  
  await jobRepository.update(job.id, { progress: 90 });
  
  // Step 4: Complete
  await assetRepository.update(asset.id, { status: 'completed' });
  await jobRepository.update(job.id, { progress: 100 });
}

/**
 * Process vision analysis only
 */
async function processVisionAnalysis(job: any): Promise<void> {
  if (!job.assetId) {
    throw new Error('Asset ID required');
  }
  
  const asset = await assetRepository.findById(job.assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }
  
  await assetRepository.update(asset.id, { status: 'analyzing' });
  
  const config = getDefaultProviderConfig();
  const visionProvider = createVisionProvider(config);
  const visionAnalyzer = createVisionAnalyzer(visionProvider);
  
  const analysisImagePath = asset.analysisPath || asset.storagePath;
  const imageBuffer = await fs.readFile(analysisImagePath);
  const imageBase64 = imageBuffer.toString('base64');
  
  const visionOutput = await visionAnalyzer.analyze(
    { base64: imageBase64 },
    asset.id,
    asset.hash
  );
  
  if (!visionOutput.success || !visionOutput.analysis) {
    throw new Error(visionOutput.error || 'Vision analysis failed');
  }
  
  await visionResultRepository.create({
    assetId: asset.id,
    modelId: visionOutput.modelId,
    promptVersion: visionOutput.promptVersion,
    inputHash: asset.hash,
    result: visionOutput.analysis as any,
    tokensUsed: visionOutput.tokensUsed,
    processingTimeMs: visionOutput.processingTimeMs,
  });
}

/**
 * Process metadata synthesis only
 */
async function processMetadataSynthesis(job: any): Promise<void> {
  if (!job.assetId) {
    throw new Error('Asset ID required');
  }
  
  const asset = await assetRepository.findById(job.assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }
  
  const profile = await resolveProfile(job.projectId);
  
  const latestVisionResult = await visionResultRepository.findLatestByAsset(asset.id);
  if (!latestVisionResult) {
    throw new Error('Vision result not found - run vision analysis first');
  }
  
  await assetRepository.update(asset.id, { status: 'synthesizing' });
  
  const config = getDefaultProviderConfig();
  const llmProvider = createLLMProvider(config);
  const metadataSynthesizer = createMetadataSynthesizer(llmProvider);
  
  // Build event context from project
  const project = await projectRepository.findById(job.projectId);
  const eventContext = {
    eventId: job.projectId,
    eventName: project?.name,
    eventDate: project?.createdAt?.toISOString()?.split('T')[0],
  };
  
  const synthesisOutput = await metadataSynthesizer.synthesize(
    latestVisionResult.result as unknown as VisionAnalysis,
    profile as unknown as OnboardingProfile,
    asset.userComment || undefined,
    eventContext
  );
  
  if (!synthesisOutput.success || !synthesisOutput.metadata) {
    throw new Error(synthesisOutput.error || 'Metadata synthesis failed');
  }
  
  await metadataResultRepository.create({
    assetId: asset.id,
    visionResultId: latestVisionResult.id,
    onboardingProfileId: profile.id,
    modelId: synthesisOutput.modelId,
    promptVersion: synthesisOutput.promptVersion,
    inputHash: asset.hash,
    result: synthesisOutput.metadata as any,
    tokensUsed: synthesisOutput.tokensUsed,
    processingTimeMs: synthesisOutput.processingTimeMs,
  });
}

/**
 * Process embedding only
 */
async function processEmbed(job: any): Promise<void> {
  if (!job.assetId) {
    throw new Error('Asset ID required');
  }
  
  const asset = await assetRepository.findById(job.assetId);
  if (!asset) {
    throw new Error('Asset not found');
  }
  
  const latestMetadataResult = await metadataResultRepository.findLatestByAsset(asset.id);
  if (!latestMetadataResult) {
    throw new Error('Metadata result not found - run synthesis first');
  }
  
  await assetRepository.update(asset.id, { status: 'embedding' });
  
  const metadataWriter = createExifToolWriter();
  const embedder = createEmbedder(metadataWriter);
  
  const outputPath = embedder.generateOutputPath(asset.storagePath);
  
  const { embedResult: embedOutput, verifyResult } = await embedder.embedAndVerify(
    asset.storagePath,
    outputPath,
    latestMetadataResult.result as unknown as SynthesizedMetadata
  );
  
  if (!embedOutput.success) {
    throw new Error(embedOutput.error || 'Embedding failed');
  }
  
  await embedResultRepository.create({
    assetId: asset.id,
    metadataResultId: latestMetadataResult.id,
    embeddedPath: embedOutput.outputPath!,
    fieldsWritten: embedOutput.fieldsWritten,
    exiftoolLogs: embedOutput.logs,
    verified: verifyResult?.verified || false,
    verificationDetails: verifyResult as any,
  });
  
  await assetRepository.update(asset.id, { status: 'completed' });
}
